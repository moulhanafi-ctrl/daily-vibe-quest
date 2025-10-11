import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2025-08-27.basil",
});

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  
  if (!signature) {
    return new Response("No signature", { status: 400 });
  }

  try {
    const body = await req.text();
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    const event = webhookSecret
      ? stripe.webhooks.constructEvent(body, signature, webhookSecret)
      : JSON.parse(body);

    console.log(`Processing webhook event: ${event.type}`);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      console.log("Checkout session completed:", session.id);

      // Create Supabase client with service role key
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Get customer email
      const customerEmail = session.customer_email || session.customer_details?.email;
      if (!customerEmail) {
        console.error("No customer email found");
        return new Response("No customer email", { status: 400 });
      }

      // Find user by email
      const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
      const user = users?.find(u => u.email === customerEmail);
      
      if (!user) {
        console.error("User not found for email:", customerEmail);
        return new Response("User not found", { status: 404 });
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
        console.error("Error updating order:", orderError);
        return new Response(JSON.stringify({ error: orderError.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Track purchase success event
      await supabase.from("analytics_events").insert({
        user_id: user.id,
        event_type: "purchase_succeeded",
        event_metadata: {
          sessionId: session.id,
          paymentIntentId: session.payment_intent,
          amountTotal: session.amount_total,
          currency: session.currency
        },
        page_url: "/checkout/success"
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
        console.error("Order not found");
        return new Response("Order not found", { status: 404 });
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
          .upsert(digitalProducts, {
            onConflict: "user_id,product_id",
          });

        if (entitlementError) {
          console.error("Error creating entitlements:", entitlementError);
        } else {
          console.log(`Created ${digitalProducts.length} entitlements`);
          
          // Track entitlement grant events
          for (const product of digitalProducts) {
            await supabase.from("analytics_events").insert({
              user_id: user.id,
              event_type: "entitlement_granted",
              event_metadata: {
                productId: product.product_id,
                orderId: product.order_id
              },
              page_url: "/library"
            });
          }
        }
      }

      // TODO: Send confirmation email with digital access
      console.log("Order completed successfully for user:", user.id);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Webhook error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
});