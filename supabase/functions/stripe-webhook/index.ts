import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { createStripeClient, getStripeConfig } from "../_shared/stripe-config.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Track processed events for idempotency
const processedEvents = new Set<string>();

async function processCheckoutCompleted(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
  supabase: any,
  eventId: string
) {
  console.log(`[WEBHOOK] Processing checkout.session.completed: ${session.id}`);

  const customerEmail = session.customer_email || session.customer_details?.email;
  if (!customerEmail) {
    console.error("[WEBHOOK] No customer email found");
    return { error: "No customer email" };
  }

  // Find user by email
  const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
  const user = users?.find((u: any) => u.email === customerEmail);
  
  if (!user) {
    console.error(`[WEBHOOK] User not found for email: ${customerEmail}`);
    return { error: "User not found" };
  }

  // Update order status
  const { error: orderError } = await supabase
    .from("orders")
    .update({
      status: "paid",
      stripe_payment_id: session.payment_intent as string,
    })
    .eq("stripe_session_id", session.id);

  if (orderError) {
    console.error("[WEBHOOK] Error updating order:", orderError);
    return { error: orderError.message };
  }

  // Track purchase success
  await supabase.from("analytics_events").insert({
    user_id: user.id,
    event_type: "purchase_succeeded",
    event_metadata: {
      sessionId: session.id,
      paymentIntentId: session.payment_intent,
      amountTotal: session.amount_total,
      currency: session.currency,
      webhookEventId: eventId,
    },
    page_url: "/checkout/success",
  });

  // Get order details
  const { data: order } = await supabase
    .from("orders")
    .select(`
      id,
      order_items (
        product_id,
        products (
          product_type
        )
      )
    `)
    .eq("stripe_session_id", session.id)
    .single();

  if (!order) {
    console.error("[WEBHOOK] Order not found");
    return { error: "Order not found" };
  }

  // Create entitlements for digital products
  const digitalProducts = order.order_items
    .filter((item: any) => item.products?.product_type === "digital")
    .map((item: any) => ({
      user_id: user.id,
      product_id: item.product_id,
      order_id: order.id,
      status: "active",
    }));

  if (digitalProducts.length > 0) {
    const { error: entitlementError } = await supabase
      .from("entitlements")
      .upsert(digitalProducts, { onConflict: "user_id,product_id" });

    if (entitlementError) {
      console.error("[WEBHOOK] Error creating entitlements:", entitlementError);
    } else {
      console.log(`[WEBHOOK] Created ${digitalProducts.length} entitlements`);
      
      // Track entitlement grants
      for (const product of digitalProducts) {
        await supabase.from("analytics_events").insert({
          user_id: user.id,
          event_type: "entitlement_granted",
          event_metadata: {
            productId: product.product_id,
            orderId: product.order_id,
            webhookEventId: eventId,
          },
          page_url: "/library",
        });
      }
    }
  }

  console.log(`[WEBHOOK] Order completed successfully for user: ${user.id}`);
  return { success: true };
}

async function processRefund(
  stripe: Stripe,
  charge: Stripe.Charge,
  supabase: any,
  eventId: string
) {
  console.log(`[WEBHOOK] Processing refund for charge: ${charge.id}`);

  // Find the order by payment intent
  const { data: order } = await supabase
    .from("orders")
    .select("*, order_items(product_id)")
    .eq("stripe_payment_id", charge.payment_intent)
    .single();

  if (!order) {
    console.error("[WEBHOOK] Order not found for refund");
    return { error: "Order not found" };
  }

  // Update order status
  await supabase
    .from("orders")
    .update({ status: "refunded" })
    .eq("id", order.id);

  // Revoke entitlements for digital products
  const productIds = order.order_items.map((item: any) => item.product_id);
  
  const { error: revokeError } = await supabase
    .from("entitlements")
    .update({ status: "revoked" })
    .eq("order_id", order.id)
    .in("product_id", productIds);

  if (revokeError) {
    console.error("[WEBHOOK] Error revoking entitlements:", revokeError);
  } else {
    console.log(`[WEBHOOK] Revoked entitlements for order: ${order.id}`);
    
    // Track entitlement revocation
    for (const productId of productIds) {
      await supabase.from("analytics_events").insert({
        user_id: order.user_id,
        event_type: "entitlement_revoked",
        event_metadata: {
          productId,
          orderId: order.id,
          reason: "refund",
          webhookEventId: eventId,
        },
      });
    }
  }

  return { success: true };
}

async function processDisputeCreated(
  stripe: Stripe,
  dispute: Stripe.Dispute,
  supabase: any,
  eventId: string
) {
  console.log(`[WEBHOOK] Processing dispute for charge: ${dispute.charge}`);

  // Find order by charge ID
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("stripe_payment_id", dispute.charge)
    .single();

  if (!order) {
    console.error("[WEBHOOK] Order not found for dispute");
    return { error: "Order not found" };
  }

  // Update order status
  await supabase
    .from("orders")
    .update({ status: "disputed" })
    .eq("id", order.id);

  // Revoke entitlements immediately on dispute
  const { error: revokeError } = await supabase
    .from("entitlements")
    .update({ status: "revoked" })
    .eq("order_id", order.id);

  if (revokeError) {
    console.error("[WEBHOOK] Error revoking entitlements on dispute:", revokeError);
  } else {
    console.log(`[WEBHOOK] Revoked entitlements due to dispute for order: ${order.id}`);
    
    await supabase.from("analytics_events").insert({
      user_id: order.user_id,
      event_type: "entitlement_revoked",
      event_metadata: {
        orderId: order.id,
        reason: "dispute",
        disputeId: dispute.id,
        webhookEventId: eventId,
      },
    });
  }

  return { success: true };
}

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  
  if (!signature) {
    console.error("[WEBHOOK] No signature header");
    return new Response("No signature", { status: 400 });
  }

  try {
    const body = await req.text();
    const config = getStripeConfig();
    const stripe = createStripeClient();
    
    // Verify webhook signature if secret is configured
    const event = config.webhookSecret
      ? stripe.webhooks.constructEvent(body, signature, config.webhookSecret)
      : JSON.parse(body);

    console.log(`[WEBHOOK] Event received: ${event.type} (${event.id})`);

    // Idempotency check
    if (processedEvents.has(event.id)) {
      console.log(`[WEBHOOK] Event ${event.id} already processed, skipping`);
      return new Response(JSON.stringify({ received: true, cached: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    let result;

    switch (event.type) {
      case "checkout.session.completed":
        result = await processCheckoutCompleted(
          stripe,
          event.data.object as Stripe.Checkout.Session,
          supabase,
          event.id
        );
        break;

      case "charge.refunded":
        result = await processRefund(
          stripe,
          event.data.object as Stripe.Charge,
          supabase,
          event.id
        );
        break;

      case "charge.dispute.created":
        result = await processDisputeCreated(
          stripe,
          event.data.object as Stripe.Dispute,
          supabase,
          event.id
        );
        break;

      default:
        console.log(`[WEBHOOK] Unhandled event type: ${event.type}`);
        result = { success: true, unhandled: true };
    }

    if (result.error) {
      // Don't mark as processed if there was an error - allow retry
      console.error(`[WEBHOOK] Error processing ${event.type}:`, result.error);
      return new Response(JSON.stringify({ error: result.error }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Mark as successfully processed
    processedEvents.add(event.id);
    
    // Clean up old processed events (keep last 1000)
    if (processedEvents.size > 1000) {
      const oldestEvents = Array.from(processedEvents).slice(0, processedEvents.size - 1000);
      oldestEvents.forEach(id => processedEvents.delete(id));
    }

    return new Response(JSON.stringify({ received: true, ...result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[WEBHOOK] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
});
