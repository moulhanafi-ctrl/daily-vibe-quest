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
    const { productId, title, description, price_cents, category, existingStripeProductId, existingStripePriceId } = await req.json();

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    let stripeProductId = existingStripeProductId;

    // Create or update Stripe Product
    if (!stripeProductId) {
      const product = await stripe.products.create({
        name: title,
        description: description || undefined,
        metadata: {
          product_id: productId,
          category: category,
        },
      });
      stripeProductId = product.id;
      console.log("Created Stripe product:", stripeProductId);
    } else {
      await stripe.products.update(stripeProductId, {
        name: title,
        description: description || undefined,
      });
      console.log("Updated Stripe product:", stripeProductId);
    }

    // Create a new price if price changed or doesn't exist
    let stripePriceId = existingStripePriceId;
    
    // Check if we need a new price
    let needNewPrice = !stripePriceId;
    
    if (stripePriceId) {
      // Check if price amount changed
      const existingPrice = await stripe.prices.retrieve(stripePriceId);
      if (existingPrice.unit_amount !== price_cents) {
        needNewPrice = true;
        // Archive the old price
        await stripe.prices.update(stripePriceId, { active: false });
        console.log("Archived old price:", stripePriceId);
      }
    }

    if (needNewPrice) {
      const price = await stripe.prices.create({
        product: stripeProductId,
        unit_amount: price_cents,
        currency: "usd",
      });
      stripePriceId = price.id;
      console.log("Created new Stripe price:", stripePriceId);
    }

    return new Response(
      JSON.stringify({
        productId: stripeProductId,
        priceId: stripePriceId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error creating/updating Stripe product:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});