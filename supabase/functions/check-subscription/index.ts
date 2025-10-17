import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { createStripeClient, getStripeConfig } from "../_shared/stripe-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Health check endpoint
  if (req.method === "GET" && new URL(req.url).pathname.endsWith("/health")) {
    try {
      const stripe = createStripeClient();
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      
      // Check DB connection
      const { count } = await supabaseClient
        .from("push_subscriptions")
        .select("*", { count: "exact", head: true });
      
      const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
      const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
      
      return new Response(JSON.stringify({
        ok: true,
        stripe_connected: !!stripe,
        db_connected: true,
        push_subscriptions_count: count || 0,
        vapid_configured: !!(vapidPublic && vapidPrivate),
        timestamp: new Date().toISOString(),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } catch (error) {
      return new Response(JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const config = getStripeConfig();
    const stripe = createStripeClient();
    logStep(`Using ${config.isLiveMode ? "LIVE" : "TEST"} mode`);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    logStep("Authenticating user with token");
    
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found, updating unsubscribed state");
      
      await supabaseClient
        .from("profiles")
        .update({ 
          subscription_status: "free",
          subscription_expires_at: null 
        })
        .eq("id", user.id);

      return new Response(JSON.stringify({ 
        subscribed: false,
        subscription_status: "free"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      logStep("No subscriptions found");
      await supabaseClient
        .from("profiles")
        .update({ 
          subscription_status: "free",
          subscription_expires_at: null 
        })
        .eq("id", user.id);

      return new Response(JSON.stringify({ 
        subscribed: false,
        subscription_status: "free"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const subscription = subscriptions.data[0];
    
    // Determine the end date based on subscription status
    let subscriptionEnd = null;
    const endTimestamp = subscription.status === "trialing" 
      ? subscription.trial_end 
      : subscription.current_period_end;
    
    if (endTimestamp) {
      try {
        subscriptionEnd = new Date(endTimestamp * 1000).toISOString();
        logStep("Converted timestamp", { endTimestamp, subscriptionEnd });
      } catch (error) {
        logStep("Error converting timestamp", { 
          error: error instanceof Error ? error.message : String(error),
          timestamp: endTimestamp 
        });
      }
    }
    
    const status = subscription.status === "active" ? "active" : 
                   subscription.status === "trialing" ? "trialing" : "free";
    
    logStep("Subscription found", { 
      subscriptionId: subscription.id, 
      status: subscription.status,
      endDate: subscriptionEnd 
    });

    await supabaseClient
      .from("profiles")
      .update({ 
        subscription_status: status,
        subscription_expires_at: subscriptionEnd 
      })
      .eq("id", user.id);

    return new Response(JSON.stringify({
      subscribed: status === "active" || status === "trialing",
      subscription_status: status,
      subscription_end: subscriptionEnd
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});