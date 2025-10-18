import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory cache
let cacheData: any = null;
let cacheTime = 0;
const CACHE_TTL = 60000; // 60 seconds

const maskKey = (key: string): string => {
  if (!key || key.length < 8) return "***";
  return key.slice(0, 3) + "..." + key.slice(-6);
};

serve(async (req) => {
  console.log("[STRIPE-LIVE-STATUS] Function invoked", { method: req.method, url: req.url });
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[STRIPE-LIVE-STATUS] Processing request");
    const url = new URL(req.url);
    let invalidate = url.searchParams.get("invalidate") === "1";
    
    // Also check POST body for invalidate flag
    if (req.method === "POST") {
      try {
        const body = await req.json();
        invalidate = invalidate || body.invalidate === true || body.invalidate === "1";
      } catch {
        // Ignore JSON parse errors
      }
    }

    // Check cache
    if (!invalidate && cacheData && (Date.now() - cacheTime) < CACHE_TTL) {
      console.log("[STRIPE-LIVE-STATUS] Returning cached result");
      return new Response(JSON.stringify(cacheData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Get environment variables
    console.log("[STRIPE-LIVE-STATUS] Reading environment variables");
    const publicKey = Deno.env.get("STRIPE_PUBLIC_KEY");
    const secretKey = Deno.env.get("STRIPE_LIVE_SECRET_KEY") || Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_LIVE_WEBHOOK_SECRET") || Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const liveMode = Deno.env.get("STRIPE_LIVE_MODE");
    const liveModeBool = (liveMode?.toLowerCase() === "true" || liveMode === "1");
    
    console.log("[STRIPE-LIVE-STATUS] Env check", {
      hasPublicKey: !!publicKey,
      publicKeyPrefix: publicKey?.substring(0, 7),
      hasSecretKey: !!secretKey,
      secretKeyPrefix: secretKey?.substring(0, 7),
      hasWebhookSecret: !!webhookSecret,
      webhookSecretPrefix: webhookSecret?.substring(0, 6),
      liveMode,
      liveModeBool
    });

    const result: any = {
      env: {
        publicKey: publicKey ? {
          present: true,
          prefix: publicKey.substring(0, 3),
          isLive: publicKey.startsWith("pk_live_"),
          masked: maskKey(publicKey),
        } : { present: false },
        secretKey: secretKey ? {
          present: true,
          prefix: secretKey.substring(0, 3),
          isLive: secretKey.startsWith("sk_live_"),
          masked: maskKey(secretKey),
          source: Deno.env.get("STRIPE_LIVE_SECRET_KEY") ? "STRIPE_LIVE_SECRET_KEY" : "STRIPE_SECRET_KEY",
        } : { present: false },
        webhookSecret: webhookSecret ? {
          present: true,
          prefix: webhookSecret.substring(0, 3),
          isValid: webhookSecret.startsWith("whsec_"),
          masked: maskKey(webhookSecret),
          source: Deno.env.get("STRIPE_LIVE_WEBHOOK_SECRET") ? "STRIPE_LIVE_WEBHOOK_SECRET" : "STRIPE_WEBHOOK_SECRET",
        } : { present: false },
        liveMode: {
          value: liveMode,
          isTrue: liveModeBool,
        },
      },
      stripe: null,
      webhook: {
        configured: !!webhookSecret,
        path: "/api/stripe/webhook",
      },
      ok: true,
      errors: [],
      message: "",
    };

    // Validate environment variables
    if (!publicKey) {
      result.errors.push("STRIPE_PUBLIC_KEY is not set");
      result.ok = false;
    } else if (!publicKey.startsWith("pk_live_")) {
      result.errors.push(`Public key is not live (${result.env.publicKey.prefix}...)`);
      result.ok = false;
    }

    if (!secretKey) {
      result.errors.push("Neither STRIPE_LIVE_SECRET_KEY nor STRIPE_SECRET_KEY is set");
      result.ok = false;
    } else if (!secretKey.startsWith("sk_live_")) {
      result.errors.push(`Secret key is not live (${result.env.secretKey.prefix}...)`);
      result.ok = false;
    }

    if (!webhookSecret) {
      result.errors.push("Neither STRIPE_LIVE_WEBHOOK_SECRET nor STRIPE_WEBHOOK_SECRET is set");
      result.ok = false;
    } else if (!webhookSecret.startsWith("whsec_")) {
      result.errors.push(`Webhook secret has invalid prefix (${result.env.webhookSecret.prefix}...)`);
      result.ok = false;
    }

    if (!liveModeBool) {
      result.errors.push(`STRIPE_LIVE_MODE is not set to true (current: ${liveMode})`);
      result.ok = false;
    }

    // If keys are valid, test Stripe connectivity
    if (secretKey && secretKey.startsWith("sk_live_")) {
      try {
        console.log("[STRIPE-LIVE-STATUS] Attempting Stripe API connection");
        const stripe = new Stripe(secretKey, {
          apiVersion: "2025-08-27.basil",
        });

        const account = await Promise.race([
          stripe.accounts.retrieve(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000)),
        ]);

        console.log("[STRIPE-LIVE-STATUS] Stripe account retrieved", { 
          accountId: (account as any).id,
          livemode: (account as any).livemode 
        });

        result.stripe = {
          accountId: (account as any).id,
          livemode: (account as any).livemode,
          country: (account as any).country,
          email: (account as any).email,
        };

        if (!(account as any).livemode) {
          result.errors.push("Stripe account is not in live mode");
          result.ok = false;
        }
      } catch (error: any) {
        console.error("[STRIPE-LIVE-STATUS] Stripe API error", error);
        result.errors.push(`Stripe API error: ${error.message}`);
        result.ok = false;
      }
    }

    // Set final message
    if (result.ok) {
      result.message = "✅ Live mode is verified and active";
    } else {
      result.message = `❌ Issues found: ${result.errors.join(", ")}`;
    }

    // Cache successful results
    if (result.ok) {
      cacheData = result;
      cacheTime = Date.now();
      console.log("[STRIPE-LIVE-STATUS] Result cached successfully");
    }

    console.log("[STRIPE-LIVE-STATUS] Returning result", { ok: result.ok, errorCount: result.errors.length });
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: result.ok ? 200 : 400,
    });

  } catch (error: any) {
    console.error("[STRIPE-LIVE-STATUS] Top-level error:", error);
    return new Response(JSON.stringify({
      ok: false,
      message: `Server error: ${error.message}`,
      errors: [error.message],
      stack: error.stack,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
