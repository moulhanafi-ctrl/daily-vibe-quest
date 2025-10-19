import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createStripeClient, getStripeConfig } from "../_shared/stripe-config.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resendApiKey = Deno.env.get("RESEND_API_KEY");
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Track processed events for idempotency
const processedEvents = new Set<string>();

async function sendOrderConfirmationEmail(
  customerEmail: string,
  productName: string,
  amountTotal: number,
  currency: string
) {
  if (!resend) {
    console.warn("[WEBHOOK] Resend not configured, skipping email");
    return { success: false, reason: "resend_not_configured" };
  }

  try {
    const formattedAmount = (amountTotal / 100).toFixed(2);
    
    await resend.emails.send({
      from: "Daily Vibe Check <support@dailyvibecheck.com>",
      to: [customerEmail],
      subject: "Thank you for your purchase!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Payment Successful!</h1>
          <p>Your payment to <strong>Daily Vibe Check</strong> was successful.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #555; margin-top: 0;">Order Details</h2>
            <p><strong>Product:</strong> ${productName}</p>
            <p><strong>Amount:</strong> $${formattedAmount} ${currency.toUpperCase()}</p>
          </div>
          
          <p>You can access your product or dashboard here:</p>
          <a href="https://dailyvibecheck.com/dashboard" style="display: inline-block; background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 10px 0;">Go to Dashboard</a>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            Thank you for supporting Daily Vibe Check!<br>
            Questions? Reply to this email or visit our support page.
          </p>
        </div>
      `,
    });

    console.log(`[WEBHOOK] Order confirmation email sent to: ${customerEmail}`);
    return { success: true };
  } catch (error: any) {
    console.error("[WEBHOOK] Error sending email:", error.message);
    // Don't fail the webhook if email fails
    return { success: false, error: error.message };
  }
}

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

  // Get line items to extract product details
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
  const productName = lineItems.data[0]?.description || "Product";
  const amountTotal = session.amount_total || 0;
  const currency = session.currency || "usd";

  // Save order to database
  try {
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        session_id: session.id,
        customer_email: customerEmail,
        product_name: productName,
        amount_total: amountTotal,
        currency: currency,
        payment_status: "paid",
      })
      .select()
      .single();

    if (orderError) {
      // Check if it's a duplicate session_id error (order already exists)
      if (orderError.code === "23505") {
        console.log(`[WEBHOOK] Order already exists for session: ${session.id}`);
        return { success: true, duplicate: true };
      }
      console.error("[WEBHOOK] Error saving order:", orderError);
      throw orderError;
    }

    console.log(`[WEBHOOK] Order saved: ${order.id}`);

    // Send confirmation email (non-blocking - don't fail if this fails)
    const emailResult = await sendOrderConfirmationEmail(
      customerEmail,
      productName,
      amountTotal,
      currency
    );

    if (!emailResult.success) {
      console.warn("[WEBHOOK] Email send failed but continuing:", emailResult);
    }

    // Track analytics
    await supabase.from("analytics_events").insert({
      event_type: "purchase_succeeded",
      event_metadata: {
        sessionId: session.id,
        paymentIntentId: session.payment_intent,
        amountTotal: amountTotal,
        currency: currency,
        productName: productName,
        webhookEventId: eventId,
      },
      page_url: "/checkout/success",
    });

    console.log(`[WEBHOOK] Order processed successfully: ${session.id}`);
    return { success: true, order_id: order.id, email_sent: emailResult.success };
  } catch (error: any) {
    console.error("[WEBHOOK] Error in processCheckoutCompleted:", error);
    return { error: error.message };
  }
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
    .select("*")
    .eq("stripe_payment_id", charge.payment_intent)
    .single();

  if (!order) {
    console.error("[WEBHOOK] Order not found for refund");
    return { error: "Order not found" };
  }

  // Update order status
  await supabase
    .from("orders")
    .update({ payment_status: "refunded" })
    .eq("id", order.id);

  console.log(`[WEBHOOK] Order refunded: ${order.id}`);
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

      default:
        console.log(`[WEBHOOK] Unhandled event type: ${event.type}`);
        result = { success: true, unhandled: true };
    }

    // Always return 200 OK to Stripe, even if there were errors
    // This prevents Stripe from retrying on non-retriable errors
    if (result.error) {
      console.error(`[WEBHOOK] Error processing ${event.type}:`, result.error);
      // Still mark as processed and return 200 to prevent retries
      processedEvents.add(event.id);
    } else {
      // Mark as successfully processed
      processedEvents.add(event.id);
    }
    
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
    // Still return 200 to prevent Stripe retries on signature/parsing errors
    return new Response(JSON.stringify({ error: error.message, received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
});
