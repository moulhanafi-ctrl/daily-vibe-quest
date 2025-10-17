# Push Notifications Fix Summary

## Root Cause
**Missing UPDATE policy on `push_subscriptions` table** - The client code used `upsert` with `onConflict` which requires UPDATE permission, but only INSERT, SELECT, and DELETE policies existed.

## Fixes Applied

### 1. Database Migration ✅
Added missing UPDATE policy to `push_subscriptions` table:
```sql
CREATE POLICY "Users can update their own subscriptions"
  ON public.push_subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### 2. Edge Functions Created ✅

#### `subscribe-push`
- Accepts push subscription from client
- Stores in database with user context
- Returns success/error with details

#### `unsubscribe-push`
- Removes push subscription from database
- Called when user disables notifications

#### `send-test-push`
- Sends test notification to user
- Calls `send-push-notification` internally
- Returns delivery status

#### `send-push-notification` (Updated)
- Sends actual push notifications via Web Push protocol
- Supports VAPID authentication (when keys configured)
- Handles multiple subscriptions per user

### 3. Client Code Improvements ✅

#### Better Error Handling
- Returns `{ success, error }` instead of boolean
- Maps error codes to user-friendly messages:
  - `permission_denied` → Browser settings guidance
  - `VAPID` errors → Contact support
  - Network errors → Connection troubleshooting

#### Edge Function Integration
- Calls backend functions instead of direct DB access
- Proper authentication with session tokens
- Better error propagation

### 4. Service Worker ✅
- Already exists at `/public/sw.js`
- Handles push and notification click events
- Deep links back to app on click

### 5. Documentation ✅
Created comprehensive setup guide: `PUSH_NOTIFICATIONS_SETUP.md`
- VAPID key generation instructions
- Environment variable setup
- Testing checklist
- Browser compatibility table
- Common issues and solutions

## Required User Actions

### 1. Generate VAPID Keys
```bash
npx web-push generate-vapid-keys
```

### 2. Set Environment Variables

**Client (.env)**
```env
VITE_VAPID_PUBLIC_KEY=your_public_key_here
```

**Server (Lovable Cloud Secrets)**
Add via backend dashboard:
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`

### 3. Verify Email Setup
Ensure `RESEND_API_KEY` is set and sender domain is verified.

## Testing Steps

1. Go to `/settings?tab=notifications`
2. Click "Enable Push Notifications"
3. Allow permission in browser prompt
4. Verify no error toast appears
5. Check database: row should exist in `push_subscriptions`
6. Click "Send Test Notification"
7. Notification should appear within 5 seconds
8. Click notification → should open app
9. Toggle OFF → subscription removed from database

## Browser Support

✅ Chrome Desktop & Mobile
✅ Firefox Desktop & Mobile  
✅ Edge Desktop
✅ Safari Desktop
✅ iOS Safari (PWA only - after "Add to Home Screen")

## Expected Results

### Before Fix
- ❌ Toggle ON → Red error toast
- ❌ Nothing stored in database
- ❌ Generic "Failed to Enable Notifications" message

### After Fix
- ✅ Toggle ON → Green success toast
- ✅ Subscription stored in `push_subscriptions`
- ✅ Test notification works
- ✅ Specific error messages for different failure modes
- ✅ Deep linking works on notification click

## Next Steps

1. **Generate VAPID keys** and add to environment
2. **Test on multiple browsers** and devices
3. **Monitor edge function logs** for any errors
4. **Set up analytics** for permission acceptance rate
5. **Document opt-out process** for users

## Files Modified

- `supabase/migrations/[timestamp]_push_fix.sql` - Added UPDATE policy
- `supabase/functions/subscribe-push/index.ts` - New
- `supabase/functions/unsubscribe-push/index.ts` - New
- `supabase/functions/send-test-push/index.ts` - New
- `supabase/functions/send-push-notification/index.ts` - Updated
- `src/lib/pushNotifications.ts` - Better error handling
- `src/components/settings/PushNotificationSettings.tsx` - User-friendly errors
- `src/docs/PUSH_NOTIFICATIONS_SETUP.md` - Complete guide

## Security Notes

- VAPID private key secured in Supabase secrets (never exposed to client)
- RLS policies enforce user can only access own subscriptions
- Authentication required for all subscription operations
- Service worker validates notification origin

## Monitoring

Track these events in `analytics_events`:
- `push_subscribed` - User enabled notifications
- `push_unsubscribed` - User disabled notifications
- `push_permission_denied` - User blocked permission
- `push_test_sent` - Test notification triggered
- `push_notification_clicked` - User clicked notification
