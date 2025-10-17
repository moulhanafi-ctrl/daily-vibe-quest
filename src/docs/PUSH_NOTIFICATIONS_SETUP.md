# Push Notifications Setup Guide

## Overview
This guide covers the complete setup for web push notifications, including VAPID keys, service worker, and edge functions.

## 1. Generate VAPID Keys

VAPID (Voluntary Application Server Identification) keys are required for push notifications. Generate them using:

### Option A: Using web-push library (Node.js)
```bash
npx web-push generate-vapid-keys
```

### Option B: Using online generator
Visit: https://vapidkeys.com/

You'll get two keys:
- **Public Key**: Add to client environment as `VITE_VAPID_PUBLIC_KEY`
- **Private Key**: Add to Supabase secrets as `VAPID_PRIVATE_KEY`

## 2. Set Environment Variables

### Client (.env file - already configured)
```env
VITE_VAPID_PUBLIC_KEY=your_public_key_here
```

### Server (Supabase Secrets)
Add these secrets via Lovable Cloud dashboard:
- `VAPID_PRIVATE_KEY` - Your VAPID private key
- `VAPID_PUBLIC_KEY` - Your VAPID public key (same as client)

## 3. Service Worker

The service worker at `/public/sw.js` handles:
- Push notification events
- Notification click handling
- Deep linking back to the app
- Offline caching

**Important**: The service worker MUST be at the root path (`/sw.js`) with scope `/` to work properly.

## 4. Edge Functions

Three edge functions handle push operations:

### subscribe-push
Stores push subscription in database with user context.

### unsubscribe-push  
Removes push subscription from database.

### send-test-push
Sends a test notification to verify the setup.

### send-push-notification (existing)
Sends push notifications to users via Web Push protocol.

## 5. Database

Table: `push_subscriptions`
- Stores push subscription data per user/device
- RLS policies ensure users can only access their own subscriptions
- Unique constraint on (user_id, endpoint)

## 6. Email Setup (for push delivery)

Push notifications are delivered via Resend. Ensure:
- `RESEND_API_KEY` is set in Supabase secrets
- Sender domain is verified in Resend dashboard
- From address matches verified domain

## 7. Testing Checklist

- [ ] VAPID keys generated and set in environment
- [ ] Service worker registers successfully (check DevTools > Application > Service Workers)
- [ ] Permission prompt appears when toggling "Enable Push Notifications"
- [ ] Subscription stored in `push_subscriptions` table after enabling
- [ ] "Send Test Notification" button works and shows notification
- [ ] Clicking notification opens app at correct URL
- [ ] Works on desktop Chrome, Firefox, Edge
- [ ] Works on mobile Chrome/Android
- [ ] Works on iOS Safari (after "Add to Home Screen")

## 8. Browser Support

| Browser | Desktop | Mobile |
|---------|---------|--------|
| Chrome | ✅ | ✅ |
| Firefox | ✅ | ✅ |
| Edge | ✅ | ✅ |
| Safari | ✅ | ✅ (PWA only) |
| Opera | ✅ | ✅ |

**Note**: iOS Safari requires the app to be installed as a PWA (Add to Home Screen) before push notifications work.

## 9. Common Issues

### "Failed to Enable Notifications"
- Check browser console for detailed errors
- Verify VAPID public key is set and valid
- Ensure service worker registered successfully
- Check that site is served over HTTPS

### "Permission Denied"
- User blocked notifications in browser settings
- Guide user to re-enable: Click lock icon → Notifications → Allow

### Subscription not storing
- Verify RLS policies on `push_subscriptions` table
- Check that UPDATE policy exists (required for upsert)
- Ensure user is authenticated

### Test notification not received
- Verify `send-push-notification` edge function is deployed
- Check edge function logs for errors
- Ensure subscription exists in database
- Verify VAPID private key is set in Supabase secrets

## 10. Security Considerations

- Never expose VAPID private key in client code
- Always validate user authentication in edge functions
- Use RLS policies to restrict subscription access
- Implement rate limiting for notification sends
- Validate notification payload data

## 11. Production Deployment

Before going live:
1. Generate production VAPID keys (different from dev)
2. Update environment variables in production
3. Test on multiple devices and browsers
4. Monitor edge function logs for errors
5. Set up alerting for failed notifications
6. Document opt-out process for users

## 12. Analytics & Monitoring

Track these metrics:
- Subscription success/failure rate
- Notification delivery rate
- Notification click-through rate
- Permission prompt acceptance rate
- Unsubscribe rate

Log to `analytics_events` table with event types:
- `push_permission_requested`
- `push_permission_granted`
- `push_permission_denied`
- `push_subscribed`
- `push_unsubscribed`
- `push_notification_received`
- `push_notification_clicked`
