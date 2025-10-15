import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cartItems } = await req.json();

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

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Build line items from cart
    const lineItems = [];
    let totalCents = 0;

    for (const item of cartItems) {
      // Get product with Stripe price
      const { data: product } = await supabaseClient
        .from("products")
        .select("*")
        .eq("id", item.product_id)
        .single();

      if (!product) continue;

      const priceCents = product.price_cents * item.quantity;
      totalCents += priceCents;

      // Use existing Stripe price if available, otherwise use price_data
      if (product.stripe_price_id) {
        lineItems.push({
          price: product.stripe_price_id,
          quantity: item.quantity,
        });
      } else {
        lineItems.push({
          price_data: {
            currency: "usd",
            product_data: {
              name: product.title,
              description: product.subtitle || undefined,
            },
            unit_amount: product.price_cents,
          },
          quantity: item.quantity,
        });
      }
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: lineItems,
      mode: "payment",
      success_url: `${req.headers.get("origin")}/orders?success=true`,
      cancel_url: `${req.headers.get("origin")}/cart`,
      metadata: {
        user_id: user.id,
      },
    });

    // Create pending order in database
    const { data: order } = await supabaseClient
      .from("orders")
      .insert({
        user_id: user.id,
        total_cents: totalCents,
        status: "pending",
        stripe_payment_intent_id: session.payment_intent as string,
      })
      .select()
      .single();

    // Create order items
    if (order) {
      const orderItems = cartItems.map((item: any) => ({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price_cents: item.price_cents,
      }));

      await supabaseClient.from("order_items").insert(orderItems);

      // Clear cart
      await supabaseClient.from("cart_items").delete().eq("user_id", user.id);
    }

    return new Response(
      JSON.stringify({ url: session.url, orderId: order?.id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error creating checkout:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});