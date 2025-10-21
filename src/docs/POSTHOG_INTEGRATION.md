# PostHog Analytics Integration

## Overview
PostHog is integrated for privacy-compliant analytics tracking across the Vibe Check application. This integration tracks key user actions and behaviors while respecting user privacy by only collecting non-PII data.

## Configuration

### Environment Variables

**Frontend (.env):**
```bash
VITE_POSTHOG_KEY=your_posthog_key
VITE_POSTHOG_HOST=https://app.posthog.com  # or your self-hosted instance
VITE_APP_VERSION=1.0.0
```

**Backend (Supabase Secrets):**
```bash
POSTHOG_KEY=your_posthog_key
POSTHOG_HOST=https://app.posthog.com
```

### Getting Your PostHog Key

1. Sign in to [posthog.com](https://posthog.com) (or your self-hosted instance)
2. Go to **Project Settings**
3. Copy your **Project API Key**
4. Use `https://app.posthog.com` as the host (or your custom host)

## Privacy Compliance

PostHog is configured for maximum privacy:

- **`person_profiles: 'identified_only'`**: Only tracks users who explicitly log in
- **`autocapture: false`**: No automatic event capture
- **`disable_session_recording: true`**: No session recordings
- **Manual event tracking only**: We control exactly what data is sent
- **Non-PII properties only**: We never send email, name, or other identifying information

### User Properties (Non-PII)

The following non-PII properties are tracked:

- **`plan`**: Subscription status (e.g., "free", "active", "trialing")
- **`locale`**: User's language preference (e.g., "en", "es")
- **`age_group`**: Broad age category (e.g., "child", "teen", "adult", "elder")
- **`release`**: App version
- **`environment`**: production/staging/development

## Tracked Events

### Core Events

#### 1. Onboarding Completed
Tracks when a user finishes the onboarding flow.

```typescript
analytics.onboardingCompleted({
  age_group: 'teen',
  focus_areas: ['anxiety', 'self-esteem'],
  duration_seconds: 120
});
```

**Properties:**
- `age_group`: User's age category
- `focus_areas`: Selected focus areas (array)
- `duration_seconds`: Time taken to complete onboarding (optional)

#### 2. Daily Check-in Submitted
Tracks mood check-ins.

```typescript
analytics.dailyCheckinSubmitted({
  mood: 'happy',
  energy_level: 4,
  has_notes: true
});
```

**Properties:**
- `mood`: Selected mood state
- `energy_level`: Energy intensity (1-5)
- `has_notes`: Whether user added reflection notes

#### 3. Journal Entry Created
Tracks journal entries.

```typescript
analytics.journalEntryCreated({
  word_count: 250,
  has_voice: true,
  prompt_used: false,
  visibility: 'private'
});
```

**Properties:**
- `word_count`: Number of words in entry
- `has_voice`: Whether voice note was added
- `prompt_used`: Whether a writing prompt was used
- `visibility`: Entry visibility setting

#### 4. Subscription Started
Tracks new subscriptions (backend).

```typescript
await trackSubscriptionStarted(userId, {
  plan: 'premium',
  billing_interval: 'month',
  amount: 9.99,
  stripe_customer_id: 'cus_123',
  stripe_subscription_id: 'sub_123'
});
```

**Properties:**
- `plan`: Plan name
- `billing_interval`: month/year
- `amount`: Subscription price
- `stripe_customer_id`: Stripe customer ID
- `stripe_subscription_id`: Stripe subscription ID

#### 5. Subscription Canceled
Tracks subscription cancellations (backend).

```typescript
await trackSubscriptionCanceled(userId, {
  plan: 'premium',
  reason: 'too_expensive',
  duration_days: 45,
  stripe_subscription_id: 'sub_123'
});
```

**Properties:**
- `plan`: Plan that was canceled
- `reason`: Cancellation reason (optional)
- `duration_days`: How long they were subscribed
- `stripe_subscription_id`: Stripe subscription ID

## Frontend Integration

### Initialization

PostHog is initialized in `src/main.tsx`:

```typescript
import { initPostHog } from "./lib/posthog";

initPostHog();
```

### User Identification

Users are automatically identified when they log in via the `AnalyticsUserTracker` component in `App.tsx`:

```typescript
const AnalyticsUserTracker = () => {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('age_group, subscription_status, language')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          identifyUser(session.user.id, {
            plan: profile.subscription_status || 'free',
            locale: profile.language || 'en',
            age_group: profile.age_group || 'unknown',
          });
        }
      } else {
        resetUser();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
};
```

### Tracking Custom Events

Use the `analytics` helper from `src/lib/posthog.ts`:

```typescript
import { analytics } from '@/lib/posthog';

// Track a predefined event
analytics.dailyCheckinSubmitted({
  mood: 'happy',
  energy_level: 4,
  has_notes: true
});

// Track a custom event
analytics.featureUsed('trivia_game', {
  score: 8,
  difficulty: 'medium'
});

// Track an error
analytics.errorOccurred('Failed to load journal', {
  error_code: 'NETWORK_ERROR',
  retry_count: 3
});
```

## Backend Integration (Edge Functions)

### Using PostHog in Edge Functions

Import the shared PostHog utility:

```typescript
import { trackEvent, trackSubscriptionStarted } from '../_shared/posthog.ts';

serve(async (req) => {
  try {
    // Your function logic
    
    // Track an event
    await trackEvent(userId, 'email_sent', {
      email_type: 'welcome',
      timestamp: new Date().toISOString()
    });
    
    return new Response(
      JSON.stringify({ success: true }),
      { headers: corsHeaders }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    );
  }
});
```

### Subscription Tracking (Stripe Webhooks)

Subscription events are automatically tracked in the `stripe-webhook` function:

- `customer.subscription.created` → `subscription_started`
- `customer.subscription.updated` → `subscription_updated` (if status changed)
- `customer.subscription.deleted` → `subscription_canceled`

## Data Retention & Privacy

### What We Track
✅ User actions (onboarding, check-ins, journal entries)
✅ Feature usage patterns
✅ Subscription lifecycle events
✅ Non-PII user properties (plan, locale, age_group)

### What We DON'T Track
❌ Email addresses
❌ Names
❌ Precise location data
❌ Journal content
❌ Personal health information
❌ Session recordings
❌ Automatic page clicks/interactions

### GDPR Compliance

PostHog is GDPR-compliant when configured correctly:

1. **Opt-in only**: Users are only tracked after authentication
2. **Data deletion**: PostHog supports user data deletion via API
3. **Export**: User data can be exported for GDPR requests
4. **Anonymization**: Personal identifiers are never sent

To delete a user's data:

```typescript
// In your edge function or admin panel
await fetch(`${POSTHOG_HOST}/api/person/${userId}`, {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${POSTHOG_KEY}`
  }
});
```

## Monitoring & Debugging

### Development Mode

In development, PostHog runs in debug mode:

```typescript
if (ENVIRONMENT === 'development') {
  posthog.debug(); // Logs all events to console
}
```

### Verifying Events in Production

1. Go to [app.posthog.com](https://app.posthog.com)
2. Navigate to **Events** in the sidebar
3. Filter by event name or user ID
4. Check event properties for correctness

### Testing Events

```typescript
// Test in browser console (development)
import { analytics } from '@/lib/posthog';

analytics.onboardingCompleted({
  age_group: 'teen',
  focus_areas: ['anxiety']
});

// Check console for "PostHog Debug" logs
```

## Best Practices

### When to Track Events

**DO track:**
- Major user milestones (onboarding, first check-in, first journal)
- Feature adoption (first use of trivia, store purchases)
- Subscription lifecycle events
- Errors that impact user experience

**DON'T track:**
- Every button click
- Form field changes
- Hover events
- Scroll depth
- Any PII data

### Event Naming

Use snake_case and be descriptive:
- ✅ `journal_entry_created`
- ✅ `subscription_started`
- ❌ `journalEntryCreated`
- ❌ `sub_start`

### Property Naming

Use descriptive property names:
- ✅ `word_count`, `has_voice`, `mood`
- ❌ `wc`, `v`, `m`

## Troubleshooting

### Events Not Appearing

1. **Check PostHog key**: Verify `VITE_POSTHOG_KEY` is set correctly
2. **Check environment**: Events are logged in development but still sent
3. **Check browser console**: Look for PostHog debug logs
4. **Check network tab**: Look for requests to `app.posthog.com/capture/`

### User Not Identified

1. **Check authentication**: User must be logged in
2. **Check profile data**: Ensure profile has required fields
3. **Check browser console**: Look for `identifyUser` calls

### Backend Events Not Tracking

1. **Check edge function logs**: Use `supabase functions logs`
2. **Verify POSTHOG_KEY secret**: Ensure it's set in Supabase
3. **Check network**: Edge functions need internet access to PostHog

## Resources

- [PostHog Documentation](https://posthog.com/docs)
- [PostHog React SDK](https://posthog.com/docs/libraries/react)
- [PostHog API Reference](https://posthog.com/docs/api)
- [PostHog Privacy Controls](https://posthog.com/docs/privacy)
