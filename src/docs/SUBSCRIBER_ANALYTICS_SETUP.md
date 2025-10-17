# Subscriber Analytics Setup

## Overview
Secure admin-only dashboard for monitoring subscriber growth, opt-ins, and deliverability metrics with privacy-first design.

## Route
`/admin/analytics/subscribers`

## Security
- **Admin-only access**: Server-side role validation in edge function
- **RLS enforcement**: All database queries protected by RLS policies
- **PII protection**: Default view shows aggregates only
- **Audit logging**: All sensitive actions logged to `admin_audit_logs` table

## Features

### 1. KPI Cards (Top Row)
- **Total Users**: Count of all registered accounts
- **Push Subscribers**: Active push notification subscriptions
- **Daily Opt-In**: Users with marketing consent enabled
- **Birthday Opt-In**: Users with birthday set + marketing consent

### 2. 60-Day Trends Chart
- Line chart showing daily growth metrics:
  - New users
  - New push subscriptions
  - New opt-ins
- Data from `subscriber_daily_rollups` view
- Automatically aggregates last 60 days

### 3. Deliverability Widget (Last 7 Days)
**Push Notifications:**
- Sent count
- Opened count
- Failed count
- Open rate percentage

**Email:**
- Sent count
- Failed count
- Delivery rate percentage

### 4. Privacy Controls
**Default View:**
- Shows only aggregated statistics
- No personally identifiable information (PII)

**"Reveal Emails" Feature:**
- Requires explicit admin confirmation via modal
- Modal explains data use and compliance requirements
- Action is logged to `admin_audit_logs` with admin_id and timestamp
- Can be toggled on/off

**Future Enhancement (Placeholder):**
- Paginated email list with date filters
- Export capabilities for authorized admins

### 5. Export & Telemetry
- **Export CSV**: Downloads KPI summary (no PII)
- **Audit Logging**: All page views, exports, and email reveals logged
- **Cache**: API responses cached for 5 minutes

## Database Schema

### admin_audit_logs
```sql
CREATE TABLE public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event text NOT NULL,
  created_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'
);
```

**RLS Policy:**
- Admins can read/write audit logs

**Logged Events:**
- `view_subscribers_analytics`: Page view
- `export_subscriber_analytics`: CSV export
- `reveal_subscriber_emails`: Email data access

### subscriber_daily_rollups (View)
```sql
CREATE OR REPLACE VIEW public.subscriber_daily_rollups AS
SELECT
  date_trunc('day', u.created_at) as day,
  count(*) as users_total,
  count(distinct ps.user_id) FILTER (WHERE ps.created_at::date = u.created_at::date) as push_new,
  count(*) FILTER (WHERE p.marketing_opt_in = true AND p.created_at::date = u.created_at::date) as daily_optin_new
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.push_subscriptions ps ON ps.user_id = u.id
WHERE u.created_at >= CURRENT_DATE - INTERVAL '60 days'
GROUP BY 1
ORDER BY 1 DESC;
```

**Performance Indexes:**
- `idx_profiles_marketing_optin` on `(marketing_opt_in, created_at)`
- `idx_push_subscriptions_created` on `created_at`
- `idx_notification_logs_sent` on `sent_at`
- `idx_email_logs_sent` on `sent_at`

## Edge Function

### get-subscriber-analytics
**Location:** `supabase/functions/get-subscriber-analytics/index.ts`

**Authentication:**
1. Validates JWT token from Authorization header
2. Checks admin role in `user_roles` table
3. Returns 403 Forbidden if not admin

**Request Types:**
```typescript
{ type: "kpis" }           // Returns KPI counts
{ type: "trends" }         // Returns 60-day rollup data
{ type: "deliverability" } // Returns 7-day delivery stats
{ type: "reveal_emails" }  // Returns paginated email list (future)
```

**Response Caching:**
- All responses cached for 5 minutes (`Cache-Control: max-age=300`)

**Audit Trail:**
- Every request type logged to `admin_audit_logs`

## Navigation
1. Navigate to `/admin/analytics`
2. Click "Subscriber Analytics" card
3. Or directly access `/admin/analytics/subscribers`

## Acceptance Criteria

✅ **Security:**
- Non-admin blocked with 403 at server level
- All data queries protected by RLS
- Audit trail for all sensitive actions

✅ **UI/UX:**
- Four KPI cards display current counts
- Line chart renders 60-day trends
- Deliverability widget shows 7-day metrics
- Loading skeletons during data fetch
- No console errors

✅ **Privacy:**
- Default view is PII-free (aggregates only)
- "Reveal Emails" requires explicit confirmation
- Modal explains data use and compliance
- Email access is logged and auditable

✅ **Performance:**
- API responses cached for 5 minutes
- Database queries optimized with indexes
- Page loads in < 2 seconds

✅ **Telemetry:**
- Page views logged
- Export actions logged
- Email reveal actions logged

## Testing Checklist

### Non-Admin Access
```bash
# Attempt to access as non-admin user
curl -X POST \
  'https://hssrytzedacchvkrxgnq.supabase.co/functions/v1/get-subscriber-analytics' \
  -H 'Authorization: Bearer <non-admin-token>' \
  -d '{"type": "kpis"}'

# Expected: 403 Forbidden
```

### KPIs
1. Navigate to `/admin/analytics/subscribers`
2. Verify all four KPI cards display numbers
3. Check browser console - no errors

### Trends Chart
1. Scroll to "60-Day Trends" chart
2. Verify line chart renders with data
3. Hover over data points - tooltip appears

### Deliverability Widget
1. Locate "Deliverability (Last 7 Days)" card
2. Verify push and email metrics display
3. Check percentages are calculated correctly

### Export CSV
1. Click "Export CSV" button
2. Verify file downloads with current date
3. Check database:
```sql
SELECT * FROM admin_audit_logs 
WHERE event = 'export_subscriber_analytics' 
ORDER BY created_at DESC LIMIT 5;
```

### Reveal Emails
1. Click "Reveal Emails" button
2. Modal appears with data use explanation
3. Click "Cancel" - modal closes, no log entry
4. Click "Reveal Emails" again
5. Click "I Understand - Reveal Emails"
6. Alert appears: "Email access is logged"
7. Check database:
```sql
SELECT * FROM admin_audit_logs 
WHERE event = 'reveal_subscriber_emails' 
ORDER BY created_at DESC LIMIT 5;
```

### Refresh & Cache
1. Load page, note KPI values
2. Refresh page within 5 minutes
3. Verify data loads instantly (from cache)
4. Wait 6 minutes, refresh again
5. Verify fresh data is fetched

## Troubleshooting

### Edge Function Not Authorized
**Symptom:** 403 Forbidden error

**Fix:**
1. Check user has admin role:
```sql
SELECT * FROM user_roles WHERE user_id = '<user-id>' AND role = 'admin';
```
2. If missing, grant admin role:
```sql
INSERT INTO user_roles (user_id, role) VALUES ('<user-id>', 'admin');
```

### KPIs Show 0
**Symptom:** All KPI cards display 0

**Fix:**
1. Check if tables have data:
```sql
SELECT COUNT(*) FROM profiles;
SELECT COUNT(*) FROM push_subscriptions;
```
2. Verify RLS policies allow reads:
```sql
SELECT * FROM profiles LIMIT 1;
```

### Chart Not Rendering
**Symptom:** Blank chart area

**Fix:**
1. Check browser console for errors
2. Verify view has data:
```sql
SELECT * FROM subscriber_daily_rollups LIMIT 10;
```
3. Check if view was created successfully:
```sql
SELECT * FROM pg_views WHERE viewname = 'subscriber_daily_rollups';
```

### Audit Logs Not Recording
**Symptom:** No entries in admin_audit_logs

**Fix:**
1. Check table exists:
```sql
SELECT * FROM admin_audit_logs LIMIT 1;
```
2. Verify RLS policy:
```sql
SELECT * FROM pg_policies WHERE tablename = 'admin_audit_logs';
```
3. Test manual insert:
```sql
INSERT INTO admin_audit_logs (admin_id, event, metadata)
VALUES (auth.uid(), 'test_event', '{"test": true}');
```

## Future Enhancements

### Paginated Email List
- Server-side pagination (50 per page)
- Date range filters (start/end date)
- Export emails to CSV
- Search by email/name

### Advanced Metrics
- Cohort analysis (retention over time)
- Segmentation by age group
- Geographic distribution
- Engagement scores

### Real-Time Updates
- Live KPI counters
- Push notification status tracking
- Email delivery webhooks

### Compliance Features
- GDPR data export format
- CCPA deletion tracking
- Consent history timeline

## Security Considerations

### Data Minimization
- Only fetch data needed for current view
- Paginate large result sets
- Exclude PII unless explicitly requested

### Access Control
- Server-side admin role verification
- No client-side role checks
- RLS policies as defense-in-depth

### Audit Trail
- Log all PII access attempts
- Include timestamp and admin_id
- Retain logs for compliance period

### Encryption
- All data encrypted at rest
- HTTPS for data in transit
- Sensitive fields use PostgreSQL encryption

---

**Document Version:** 1.0  
**Last Updated:** 2025-10-17  
**Maintained By:** Development Team
