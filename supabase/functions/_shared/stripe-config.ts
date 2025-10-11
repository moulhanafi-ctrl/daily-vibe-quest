import Stripe from "https://esm.sh/stripe@18.5.0";

export interface StripeConfig {
  secretKey: string;
  webhookSecret: string | undefined;
  isLiveMode: boolean;
}

/**
 * Get Stripe configuration based on environment
 * Set STRIPE_LIVE_MODE=true in production to use live keys
 */
export function getStripeConfig(): StripeConfig {
  const isLiveMode = Deno.env.get("STRIPE_LIVE_MODE") === "true";
  
  const secretKey = isLiveMode
    ? Deno.env.get("STRIPE_LIVE_SECRET_KEY")
    : Deno.env.get("STRIPE_SECRET_KEY");

  const webhookSecret = isLiveMode
    ? Deno.env.get("STRIPE_LIVE_WEBHOOK_SECRET")
    : Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!secretKey) {
    throw new Error(`Missing ${isLiveMode ? "STRIPE_LIVE_SECRET_KEY" : "STRIPE_SECRET_KEY"}`);
  }

  console.log(`[STRIPE] Using ${isLiveMode ? "LIVE" : "TEST"} mode`);

  return {
    secretKey,
    webhookSecret,
    isLiveMode,
  };
}

/**
 * Create a Stripe client with the appropriate configuration
 */
export function createStripeClient(): Stripe {
  const config = getStripeConfig();
  return new Stripe(config.secretKey, {
    apiVersion: "2025-08-27.basil",
  });
}
