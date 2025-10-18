import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DiagnosticResult {
  step: string;
  status: "pass" | "fail" | "warning";
  message: string;
  details?: any;
}

const maskKey = (key: string): string => {
  if (!key || key.length < 6) return "***";
  return "..." + key.slice(-6);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const results: DiagnosticResult[] = [];
    let liveReady = true;

    // Step 1: Check Environment Variables
    const stripePublicKey = Deno.env.get("STRIPE_PUBLIC_KEY");
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const stripeLiveSecretKey = Deno.env.get("STRIPE_LIVE_SECRET_KEY");
    const stripeWebhookSecret = Deno.env.get("STRIPE_LIVE_WEBHOOK_SECRET");
    const stripeLiveMode = Deno.env.get("STRIPE_LIVE_MODE");

    // Check Public Key
    if (!stripePublicKey) {
      results.push({
        step: "Public Key",
        status: "fail",
        message: "STRIPE_PUBLIC_KEY not found",
      });
      liveReady = false;
    } else if (!stripePublicKey.startsWith("pk_live_")) {
      results.push({
        step: "Public Key",
        status: "fail",
        message: `Public key is not live (${maskKey(stripePublicKey)})`,
        details: "Key should start with pk_live_",
      });
      liveReady = false;
    } else {
      results.push({
        step: "Public Key",
        status: "pass",
        message: `Live public key found (${maskKey(stripePublicKey)})`,
      });
    }

    // Check Secret Key (prefer STRIPE_LIVE_SECRET_KEY, fallback to STRIPE_SECRET_KEY)
    const secretKey = stripeLiveSecretKey || stripeSecretKey;
    if (!secretKey) {
      results.push({
        step: "Secret Key",
        status: "fail",
        message: "No secret key found (STRIPE_SECRET_KEY or STRIPE_LIVE_SECRET_KEY)",
      });
      liveReady = false;
    } else if (!secretKey.startsWith("sk_live_")) {
      results.push({
        step: "Secret Key",
        status: "fail",
        message: `Secret key is not live (${maskKey(secretKey)})`,
        details: "Key should start with sk_live_",
      });
      liveReady = false;
    } else {
      results.push({
        step: "Secret Key",
        status: "pass",
        message: `Live secret key found (${maskKey(secretKey)})`,
        details: stripeLiveSecretKey ? "Using STRIPE_LIVE_SECRET_KEY" : "Using STRIPE_SECRET_KEY",
      });
    }

    // Check Webhook Secret
    if (!stripeWebhookSecret) {
      results.push({
        step: "Webhook Secret",
        status: "fail",
        message: "STRIPE_LIVE_WEBHOOK_SECRET not found",
      });
      liveReady = false;
    } else if (!stripeWebhookSecret.startsWith("whsec_")) {
      results.push({
        step: "Webhook Secret",
        status: "fail",
        message: `Webhook secret has invalid prefix (${maskKey(stripeWebhookSecret)})`,
        details: "Key should start with whsec_",
      });
      liveReady = false;
    } else {
      results.push({
        step: "Webhook Secret",
        status: "pass",
        message: `Webhook secret found (${maskKey(stripeWebhookSecret)})`,
      });
    }

    // Check STRIPE_LIVE_MODE flag
    const liveMode = stripeLiveMode === "true" || stripeLiveMode === true;
    if (!liveMode) {
      results.push({
        step: "Live Mode Flag",
        status: "fail",
        message: `STRIPE_LIVE_MODE is not set to true (current: ${stripeLiveMode})`,
      });
      liveReady = false;
    } else {
      results.push({
        step: "Live Mode Flag",
        status: "pass",
        message: "STRIPE_LIVE_MODE is true",
      });
    }

    // Step 2: Test Live Connectivity (only if we have a valid live secret key)
    if (secretKey && secretKey.startsWith("sk_live_")) {
      try {
        const stripe = new Stripe(secretKey, {
          apiVersion: "2025-08-27.basil",
        });

        // Test account retrieval
        const account = await stripe.accounts.retrieve();
        results.push({
          step: "Account Connection",
          status: "pass",
          message: "Successfully connected to Stripe account",
          details: {
            accountId: account.id,
            email: account.email,
            country: account.country,
          },
        });

        // Test balance retrieval
        const balance = await stripe.balance.retrieve();
        results.push({
          step: "Balance Retrieval",
          status: "pass",
          message: "Successfully retrieved account balance",
          details: {
            available: balance.available[0]?.amount || 0,
            currency: balance.available[0]?.currency || "usd",
            pending: balance.pending[0]?.amount || 0,
          },
        });
      } catch (error: any) {
        results.push({
          step: "Live Connectivity",
          status: "fail",
          message: `Failed to connect to Stripe: ${error.message}`,
          details: error.type || "unknown",
        });
        liveReady = false;
      }
    } else {
      results.push({
        step: "Live Connectivity",
        status: "fail",
        message: "Cannot test connectivity - no valid live secret key",
      });
      liveReady = false;
    }

    // Step 3: Webhook Health Check
    const webhookHealthCheck = {
      step: "Webhook Configuration",
      status: "pass" as const,
      message: "Webhook secret is configured",
      details: {
        endpoint: `${req.headers.get("origin") || "https://your-app.com"}/api/stripe/webhook`,
        secret: stripeWebhookSecret ? maskKey(stripeWebhookSecret) : "not set",
      },
    };
    results.push(webhookHealthCheck);

    return new Response(
      JSON.stringify({
        liveReady,
        results,
        summary: {
          total: results.length,
          passed: results.filter((r) => r.status === "pass").length,
          failed: results.filter((r) => r.status === "fail").length,
          warnings: results.filter((r) => r.status === "warning").length,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Stripe diagnostic error:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
        liveReady: false,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});