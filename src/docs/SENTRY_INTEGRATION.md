# Sentry Error Tracking Integration

## Overview
Sentry is integrated across both frontend and backend for real-time error tracking, performance monitoring, and session replay.

## Configuration

### Environment Variables

The following environment variables are required:

```bash
# Frontend (.env)
VITE_SENTRY_DSN=your_sentry_dsn_here
VITE_APP_VERSION=1.0.0  # Release version for tracking

# Build-time (for sourcemaps upload)
SENTRY_ORG=your_organization
SENTRY_PROJECT=your_project
SENTRY_AUTH_TOKEN=your_auth_token

# Backend (Supabase Secrets)
SENTRY_DSN=your_sentry_dsn_here
ENVIRONMENT=production  # or staging
RELEASE=1.0.0
```

### Getting Your Sentry DSN

1. Sign in to [sentry.io](https://sentry.io)
2. Create or select your project
3. Go to **Settings → Projects → [Your Project] → Client Keys (DSN)**
4. Copy the DSN URL

## Frontend Integration

### Features Enabled

- **Error Tracking**: Automatic capture of unhandled errors and exceptions
- **Performance Monitoring**: Tracks page loads, API calls, and user interactions (10% sample rate in production)
- **Session Replay**: Records user sessions for debugging (10% of sessions, 100% of error sessions)
- **User Context**: Automatically tracks authenticated user information
- **Environment Tags**: Distinguishes between development/staging/production
- **Release Tracking**: Links errors to specific app versions

### Error Boundary

The app is wrapped in a React Error Boundary that:
- Catches React rendering errors
- Displays a user-friendly error page
- Automatically reports errors to Sentry
- Provides recovery options (reload/return home)

### Manual Error Reporting

```typescript
import { captureException, captureMessage, setContext } from '@/lib/sentry';

// Capture an exception
try {
  // Some code that might throw
} catch (error) {
  captureException(error);
}

// Capture a message
captureMessage('Something unusual happened', {
  level: 'warning',
  tags: { feature: 'checkout' },
  extra: { orderId: '12345' }
});

// Add context
setContext('payment', {
  processor: 'stripe',
  amount: 99.99,
  currency: 'USD'
});
```

## Backend Integration (Edge Functions)

### Using Sentry in Edge Functions

Import the shared Sentry utility:

```typescript
import { captureException, captureMessage } from '../_shared/sentry.ts';

serve(async (req) => {
  try {
    // Your function logic
  } catch (error) {
    await captureException(error, {
      tags: { function: 'my-function' },
      extra: { requestId: req.headers.get('x-request-id') },
      level: 'error'
    });
    
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    );
  }
});
```

### Logging Informational Events

```typescript
await captureMessage('Payment processed successfully', {
  level: 'info',
  tags: { 
    function: 'process-payment',
    environment: 'production' 
  },
  extra: { 
    amount: 99.99,
    customerId: 'cus_123' 
  }
});
```

## Best Practices

### When to Use Sentry

**DO capture:**
- Unhandled exceptions
- Failed API calls
- Payment processing errors
- Data validation failures
- Authentication issues
- Critical business logic errors

**DON'T capture:**
- Expected user errors (invalid form input)
- Intentional redirects
- Normal flow control exceptions
- 4xx HTTP errors that are user-caused

### Error Context

Always add relevant context:

```typescript
captureException(error, {
  tags: {
    feature: 'journal',
    action: 'save-entry'
  },
  extra: {
    userId: user.id,
    entryId: entry.id,
    wordCount: entry.content.length
  }
});
```

### Sensitive Data

Sentry is configured to mask:
- All text content in session replays
- All media in session replays
- Console logs in production builds

Always avoid logging:
- Passwords
- API keys
- Credit card information
- Personal health information
- Authentication tokens

## Source Maps

Source maps are automatically uploaded in production builds via the Sentry Vite plugin. This allows Sentry to show original source code in error stack traces.

### Setup Source Maps Upload

1. Create a Sentry auth token:
   - Go to **Settings → Account → Auth Tokens**
   - Create token with `project:releases` and `org:read` scopes

2. Add to your build environment:
   ```bash
   SENTRY_ORG=your_org
   SENTRY_PROJECT=your_project
   SENTRY_AUTH_TOKEN=your_token
   ```

## Monitoring and Alerts

### Recommended Alerts

Set up alerts in Sentry for:
- Error rate exceeds threshold
- New error types appear
- Performance degradation
- High memory usage
- Specific critical errors (payment failures, data loss)

### Release Tracking

Each deployment is tagged with:
- Frontend: `vibe-check@{version}`
- Backend: `vibe-check-functions@{version}`

This allows tracking which releases introduced issues.

## Development Mode

In development:
- Errors are logged to console but NOT sent to Sentry
- Performance monitoring runs at 100% sample rate locally
- Session replay is active for easier debugging

## Troubleshooting

### Errors Not Appearing in Sentry

1. Check SENTRY_DSN is set correctly
2. Verify environment is not 'development' (errors aren't sent in dev)
3. Check browser console for Sentry initialization messages
4. Ensure error occurred after Sentry.init() was called

### Source Maps Not Working

1. Verify SENTRY_AUTH_TOKEN has correct permissions
2. Check build logs for sourcemap upload success
3. Ensure release version matches between frontend and Sentry

### Too Many Errors

Adjust sample rates in `src/lib/sentry.ts`:
```typescript
tracesSampleRate: 0.1,  // Lower to reduce performance monitoring
replaysSessionSampleRate: 0.05,  // Lower to reduce replay usage
```

## Resources

- [Sentry JavaScript SDK Docs](https://docs.sentry.io/platforms/javascript/)
- [Sentry React Docs](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Sentry Error Handling Best Practices](https://docs.sentry.io/platforms/javascript/best-practices/)
