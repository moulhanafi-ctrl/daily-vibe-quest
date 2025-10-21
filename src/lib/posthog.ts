import posthog from 'posthog-js';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com';
const ENVIRONMENT = import.meta.env.MODE; // 'development' or 'production'
const RELEASE = import.meta.env.VITE_APP_VERSION || '2025-10-15-chat-fix';

export const initPostHog = () => {
  if (!POSTHOG_KEY) {
    console.warn('PostHog key not configured');
    return;
  }

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: 'identified_only', // Privacy-compliant: only track identified users
    loaded: (posthog) => {
      if (ENVIRONMENT === 'development') {
        posthog.debug(); // Enable debug mode in development
      }
    },
    capture_pageview: false, // We'll manually capture pageviews with context
    capture_pageleave: true,
    autocapture: false, // Disable autocapture for privacy compliance
    disable_session_recording: true, // No session recording for privacy
    opt_out_capturing_by_default: false,
    bootstrap: {
      distinctID: undefined, // Will be set when user logs in
    },
  });

  // Set release and environment as super properties
  posthog.register({
    release: `vibe-check@${RELEASE}`,
    environment: ENVIRONMENT,
  });
};

// Identify user with non-PII properties
export const identifyUser = (
  userId: string,
  properties: {
    plan?: string;
    locale?: string;
    age_group?: string;
    [key: string]: any;
  }
) => {
  if (!POSTHOG_KEY) return;

  posthog.identify(userId, {
    plan: properties.plan,
    locale: properties.locale,
    age_group: properties.age_group,
    // Add other non-PII properties as needed
  });
};

// Reset user on logout
export const resetUser = () => {
  if (!POSTHOG_KEY) return;
  posthog.reset();
};

// Track custom events
export const trackEvent = (
  eventName: string,
  properties?: Record<string, any>
) => {
  if (!POSTHOG_KEY) return;

  posthog.capture(eventName, {
    ...properties,
    timestamp: new Date().toISOString(),
  });
};

// Predefined event tracking functions for type safety
export const analytics = {
  // Onboarding
  onboardingCompleted: (properties?: {
    age_group?: string;
    focus_areas?: string[];
    duration_seconds?: number;
  }) => {
    trackEvent('onboarding_completed', properties);
  },

  // Daily Check-ins
  dailyCheckinSubmitted: (properties: {
    mood: string;
    energy_level?: number;
    has_notes?: boolean;
  }) => {
    trackEvent('daily_checkin_submitted', properties);
  },

  // Journal
  journalEntryCreated: (properties: {
    word_count?: number;
    has_voice?: boolean;
    prompt_used?: boolean;
    visibility?: string;
  }) => {
    trackEvent('journal_entry_created', properties);
  },

  // Subscriptions
  subscriptionStarted: (properties: {
    plan: string;
    billing_interval?: string;
    amount?: number;
  }) => {
    trackEvent('subscription_started', properties);
  },

  subscriptionCanceled: (properties: {
    plan: string;
    reason?: string;
    duration_days?: number;
  }) => {
    trackEvent('subscription_canceled', properties);
  },

  // Additional useful events
  pageView: (path: string, properties?: Record<string, any>) => {
    trackEvent('$pageview', {
      $current_url: window.location.href,
      path,
      ...properties,
    });
  },

  featureUsed: (feature: string, properties?: Record<string, any>) => {
    trackEvent('feature_used', {
      feature,
      ...properties,
    });
  },

  errorOccurred: (error: string, properties?: Record<string, any>) => {
    trackEvent('error_occurred', {
      error,
      ...properties,
    });
  },
};

export default posthog;
