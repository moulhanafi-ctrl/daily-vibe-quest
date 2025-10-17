# Admin Dashboard - Subscriber KPI Card

## Overview
The `/admin` dashboard now features a "Subscribers" KPI card showing total push subscribers and weekly growth, with a direct link to detailed analytics.

## Route
`/admin`

## Security
- **Admin-only access**: Both UI (AdminGuard) and API (server-side role check) enforce admin access
- **Server-side validation**: Edge function validates JWT and checks user_roles table
- **403 Forbidden**: Non-admin users receive 403 error at API level

## Features

### Subscribers KPI Card
Located on the main admin dashboard (`/admin`), the card displays:

1. **Total Push Subscribers**
   - Count of unique users with active push subscriptions
   - Large, bold display for quick visibility
   - Real-time data (cached 5 minutes)

2. **Weekly Change Indicator**
   - **Positive (▲)**: Green text, e.g., "▲ +42 this week"
   - **Negative (▼)**: Orange/warning text, e.g., "▼ -5 down this week"  
   - **No Change (−)**: Muted text, "No change this week"

3. **"View details" Button**
   - Links to `/admin/analytics/subscribers`
   - Logs click event to `analytics_events` table

### Loading & Error States
- **Loading**: Skeleton placeholder for number and weekly change
- **Error**: Toast notification if API call fails
- **No Data**: Shows 0 with appropriate "No change" message

## API Endpoint

### admin-subscriber-kpi
**Location:** `supabase/functions/admin-subscriber-kpi/index.ts`

**Request:**
- Method: POST (via `supabase.functions.invoke`)
- Auth: Bearer token in Authorization header
- No request body needed

**Response:**
```json
{
  "total_push": 1234,
  "weekly_delta": 42,
  "as_of": "2025-10-17T12:00:00Z"
}
```

**Cache:**
- Client-side: 5 minutes (`staleTime: 5 * 60 * 1000`)
- Server-side: 5 minutes (`Cache-Control: max-age=300`)

**SQL Query:**
```sql
WITH totals AS (
  SELECT count(DISTINCT user_id) as total_push
  FROM public.push_subscriptions
),
weekly AS (
  SELECT
    count(DISTINCT user_id) as new_push_7d
  FROM public.push_subscriptions
  WHERE created_at >= now() - interval '7 days'
)
SELECT
  totals.total_push,
  weekly.new_push_7d as weekly_delta,
  now() as as_of
FROM totals, weekly;
```

**RPC Function:**
Created as `public.get_subscriber_kpi()` with SECURITY DEFINER for efficient execution.

## Telemetry

### Events Logged

1. **admin_dashboard_view**
   - Logged when admin visits `/admin`
   - Metadata: `{ timestamp }`

2. **admin_subscribers_card_click**
   - Logged when admin clicks "View details" button
   - Metadata: `{ timestamp }`

**Table:** `analytics_events`
```sql
{
  user_id: uuid,
  event_type: 'admin_dashboard_view' | 'admin_subscribers_card_click',
  event_metadata: jsonb,
  created_at: timestamptz
}
```

## Navigation Flow

```
/admin (Dashboard)
  └─> Click "View details" on Subscribers card
      └─> /admin/analytics/subscribers (Detailed Analytics)
```

## Acceptance Tests

### 1. Non-Admin Access
**Test:** Non-admin user attempts to access `/admin`

**Steps:**
1. Log in as regular user (no admin role)
2. Navigate to `/admin`

**Expected:**
- AdminGuard blocks access at UI level
- Attempting direct API call returns 403 Forbidden
- User redirected or shown error message

**Verify:**
```bash
curl -X POST \
  'https://hssrytzedacchvkrxgnq.supabase.co/functions/v1/admin-subscriber-kpi' \
  -H 'Authorization: Bearer <non-admin-token>'

# Expected: {"error":"Forbidden: Admin access required"}
```

### 2. KPI Card Rendering
**Test:** Admin views dashboard with correct data

**Steps:**
1. Log in as admin user
2. Navigate to `/admin`
3. Observe Subscribers card

**Expected:**
- Card displays total push subscriber count
- Weekly change shows correct ▲/▼/− indicator
- Correct color coding:
  - Green for positive growth
  - Orange for decline
  - Muted for no change
- "View details" button is visible
- No console errors

**Verify:**
```sql
-- Check actual data matches display
SELECT count(DISTINCT user_id) as total_push
FROM push_subscriptions;

SELECT count(DISTINCT user_id) as weekly_delta
FROM push_subscriptions
WHERE created_at >= now() - interval '7 days';
```

### 3. Link Navigation
**Test:** "View details" button navigates correctly

**Steps:**
1. On `/admin`, click "View details" on Subscribers card
2. Verify navigation and event logging

**Expected:**
- Navigates to `/admin/analytics/subscribers`
- Analytics event logged:
```sql
SELECT * FROM analytics_events 
WHERE event_type = 'admin_subscribers_card_click'
ORDER BY created_at DESC LIMIT 1;
```

### 4. Data Refresh & Cache
**Test:** Cache updates correctly

**Steps:**
1. Load `/admin`, note subscriber count
2. Add a test push subscription:
```sql
INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
VALUES ('<test-user-id>', 'test-endpoint', 'test-p256dh', 'test-auth');
```
3. Refresh page within 5 minutes
4. Wait 6 minutes, refresh again

**Expected:**
- Initial refresh: Shows cached data (old count)
- After 6 minutes: Shows fresh data (new count)
- Weekly delta updates if subscription is within last 7 days

### 5. Weekly Change States
**Test:** All three states display correctly

**Steps:**
1. Set up test data for each state:
```sql
-- State 1: Positive growth (add subscriptions in last 7 days)
INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, created_at)
VALUES ('<user-1>', 'endpoint-1', 'p256dh-1', 'auth-1', now() - interval '3 days');

-- State 2: No change (no new subscriptions in last 7 days)
-- Just delete all recent subscriptions

-- State 3: Negative growth (not possible with current logic, but test 0 case)
DELETE FROM push_subscriptions WHERE created_at >= now() - interval '7 days';
```

2. Refresh dashboard between each state

**Expected:**
- Positive: "▲ +N this week" in green
- Zero: "No change this week" in muted gray
- Displays appropriate icon for each state

### 6. Error Handling
**Test:** Graceful error handling

**Steps:**
1. Temporarily revoke admin role
2. Attempt to load dashboard
3. Restore admin role

**Expected:**
- API returns 403 error
- Toast notification appears (if implemented)
- No app crash
- User can navigate away

### 7. Performance
**Test:** Page loads quickly

**Steps:**
1. Clear browser cache
2. Load `/admin`
3. Measure time to first paint

**Expected:**
- Page loads in < 2 seconds
- KPI card skeleton visible immediately
- Data populates within 500ms (cached)
- Data populates within 2 seconds (fresh)

## Troubleshooting

### Card Shows 0 Subscribers
**Symptom:** Total push count is 0

**Fix:**
1. Check if push_subscriptions table has data:
```sql
SELECT * FROM push_subscriptions LIMIT 10;
```

2. Verify RLS policies allow reading:
```sql
SELECT * FROM push_subscriptions WHERE user_id = auth.uid() LIMIT 1;
```

3. Test RPC function directly:
```sql
SELECT * FROM get_subscriber_kpi();
```

### Weekly Delta Always 0
**Symptom:** No weekly change ever displayed

**Fix:**
1. Check if recent subscriptions exist:
```sql
SELECT count(DISTINCT user_id)
FROM push_subscriptions
WHERE created_at >= now() - interval '7 days';
```

2. Verify created_at timestamps are set correctly

### 403 Forbidden for Admin
**Symptom:** Admin user gets 403 error

**Fix:**
1. Verify user has admin role:
```sql
SELECT * FROM user_roles WHERE user_id = '<user-id>';
```

2. If missing, grant admin role:
```sql
INSERT INTO user_roles (user_id, role) VALUES ('<user-id>', 'admin');
```

### Edge Function Not Found
**Symptom:** Function invocation fails

**Fix:**
1. Verify edge function deployed:
   - Check Backend > Edge Functions in Lovable
   - Look for `admin-subscriber-kpi`

2. Test function manually:
```bash
curl -X POST \
  'https://hssrytzedacchvkrxgnq.supabase.co/functions/v1/admin-subscriber-kpi' \
  -H 'Authorization: Bearer <admin-token>'
```

### Telemetry Not Logging
**Symptom:** No events in analytics_events

**Fix:**
1. Check table exists and is accessible:
```sql
SELECT * FROM analytics_events LIMIT 1;
```

2. Verify RLS policy allows inserts:
```sql
-- Test insert
INSERT INTO analytics_events (user_id, event_type, event_metadata)
VALUES (auth.uid(), 'test_event', '{"test": true}');
```

3. Check browser console for client-side errors

## Future Enhancements

### Additional KPI Cards
- Active chat rooms count
- Store order volume (weekly)
- Support ticket status
- System health score

### Real-Time Updates
- WebSocket connection for live KPI updates
- Auto-refresh every 30 seconds
- "Last updated" timestamp display

### Drill-Down Capabilities
- Click subscriber count to see list of users
- Filter by date range
- Export subscriber list to CSV

### Comparison Metrics
- Month-over-month growth
- Year-over-year comparison
- Benchmark against goals

---

**Document Version:** 1.0  
**Last Updated:** 2025-10-17  
**Maintained By:** Development Team
