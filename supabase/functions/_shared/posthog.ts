// PostHog backend integration for Supabase Edge Functions
// Tracks server-side events for analytics

const POSTHOG_KEY = Deno.env.get('POSTHOG_KEY');
const POSTHOG_HOST = Deno.env.get('POSTHOG_HOST') || 'https://app.posthog.com';

export async function trackEvent(
  distinctId: string,
  eventName: string,
  properties?: Record<string, any>
): Promise<void> {
  if (!POSTHOG_KEY) {
    console.warn('PostHog key not configured, event not sent:', eventName);
    return;
  }

  try {
    const response = await fetch(`${POSTHOG_HOST}/capture/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: POSTHOG_KEY,
        event: eventName,
        properties: {
          distinct_id: distinctId,
          ...properties,
          $lib: 'edge-functions',
          timestamp: new Date().toISOString(),
        },
      }),
    });

    if (!response.ok) {
      console.error('Failed to send event to PostHog:', await response.text());
    }
  } catch (err) {
    console.error('Error sending to PostHog:', err);
  }
}

// Subscription-specific event tracking
export async function trackSubscriptionStarted(
  userId: string,
  properties: {
    plan: string;
    billing_interval?: string;
    amount?: number;
    stripe_customer_id?: string;
    stripe_subscription_id?: string;
  }
): Promise<void> {
  await trackEvent(userId, 'subscription_started', properties);
}

export async function trackSubscriptionCanceled(
  userId: string,
  properties: {
    plan: string;
    reason?: string;
    duration_days?: number;
    stripe_subscription_id?: string;
  }
): Promise<void> {
  await trackEvent(userId, 'subscription_canceled', properties);
}

export async function trackSubscriptionUpdated(
  userId: string,
  properties: {
    old_plan?: string;
    new_plan: string;
    stripe_subscription_id?: string;
  }
): Promise<void> {
  await trackEvent(userId, 'subscription_updated', properties);
}
