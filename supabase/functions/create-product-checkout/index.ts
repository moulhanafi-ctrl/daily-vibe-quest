import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createStripeClient, getStripeConfig } from "../_shared/stripe-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[CHECKOUT] Starting checkout process");
    const { cartItems } = await req.json();

    if (!cartItems || cartItems.length === 0) {
      throw new Error("Cart is empty");
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user?.email) {
      throw new Error("User not authenticated");
    }

    console.log(`[CHECKOUT] User: ${user.email}, Items: ${cartItems.length}`);

    // Initialize Stripe with proper config
    const config = getStripeConfig();
    const stripe = createStripeClient();
    console.log(`[CHECKOUT] Using ${config.isLiveMode ? "LIVE" : "TEST"} mode`);

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log(`[CHECKOUT] Found existing customer: ${customerId}`);
    }

    // Build line items from cart
    const lineItems = [];
    let totalCents = 0;

    for (const item of cartItems) {
      // Access the correct nested structure: item.products not item.product_id
      const product = item.products;
      
      if (!product) {
        console.warn(`[CHECKOUT] Skipping item ${item.id} - no product data`);
        continue;
      }

      const priceInCents = Math.round(product.price * 100);
      const itemTotal = priceInCents * item.quantity;
      totalCents += itemTotal;

      console.log(`[CHECKOUT] Adding ${item.quantity}x ${product.name} @ $${product.price}`);

      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: product.name,
            description: product.description || undefined,
          },
          unit_amount: priceInCents,
        },
        quantity: item.quantity,
      });
    }

    if (lineItems.length === 0) {
      throw new Error("No valid products in cart");
    }

    console.log(`[CHECKOUT] Creating session with ${lineItems.length} items, total: $${totalCents / 100}`);

    // Create Stripe checkout session
    const origin = req.headers.get("origin") || "https://www.vibecheckapps.com";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/orders?success=true`,
      cancel_url: `${origin}/cart`,
      metadata: {
        user_id: user.id,
      },
    });

    console.log(`[CHECKOUT] Session created: ${session.id}`);

    // Create pending order in database
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .insert({
        user_id: user.id,
        total_amount: totalCents / 100,
        status: "pending",
        stripe_payment_id: session.payment_intent as string,
        stripe_session_id: session.id,
      })
      .select()
      .single();

    if (orderError) {
      console.error(`[CHECKOUT] Order creation failed:`, orderError);
      throw orderError;
    }

    console.log(`[CHECKOUT] Order created: ${order.id}`);

    // Create order items
    if (order) {
      const orderItemsData = cartItems.map((item: any) => ({
        order_id: order.id,
        product_id: item.products.id,
        quantity: item.quantity,
        price_at_purchase: item.products.price,
      }));

      await supabaseClient.from("order_items").insert(orderItemsData);
      console.log(`[CHECKOUT] Created ${orderItemsData.length} order items`);

      // Clear cart
      await supabaseClient.from("cart_items").delete().eq("user_id", user.id);
      console.log(`[CHECKOUT] Cart cleared`);
    }

    return new Response(
      JSON.stringify({ 
        url: session.url, 
        orderId: order?.id,
        liveMode: config.isLiveMode 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("[CHECKOUT] Error:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Checkout failed" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
