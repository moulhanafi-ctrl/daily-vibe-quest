# System Health Check & Monitoring

## Overview
Automated health monitoring system that runs comprehensive tests every 15 minutes and provides a live dashboard at `/admin/health`.

## Components

### 1. Health Dashboard (`/admin/health`)
- **Access**: Admin-only route
- **Features**:
  - Live status tiles (green/amber/red)
  - Test categories: Core, Storage, Messaging, Stories, Help, Admin
  - Run history (last 50 runs)
  - Manual trigger: "Run All Now" button
  - Real-time updates via Supabase Realtime

### 2. Health Check Edge Function
- **Endpoint**: `run-health-checks`
- **Trigger**: Manual or cron (every 15 minutes)
- **Tests Performed**:
  - **Core Platform**:
    - API uptime (<500ms response)
    - Auth session validation
    - RLS protection verification
  - **Storage**:
    - Bucket existence and access
    - Signed URL generation
  - **Messaging**:
    - Test Contact functionality
    - Push notification pipeline
  - **Family Stories**:
    - Upload flow validation
    - Duration guard (45s limit)
    - Expiry mechanism
  - **Help System**:
    - ZIP resolver (normalization, cache hit/miss)
    - Help search (nearby results)
    - ZIP admin tools
  - **Security**:
    - Storage RLS policies
    - Story privacy enforcement

### 3. Database Tables

#### `system_health_runs`
Tracks each health check execution:
```sql
- id (uuid)
- started_at (timestamptz)
- finished_at (timestamptz)
- status (pass/fail/partial/running)
- total (int) - number of tests
- passed (int)
- failed (int)
- duration_ms (int)
- triggered_by (cron/manual)
```

#### `system_health_results`
Individual test results:
```sql
- id (uuid)
- run_id (uuid) - FK to system_health_runs
- test_key (text) - unique test identifier
- category (text) - grouping (core, storage, etc.)
- status (pass/fail/skip)
- duration_ms (int)
- error_text (text) - failure details
- created_at (timestamptz)
```

### 4. Automated Monitoring

#### Cron Setup
Runs every 15 minutes via `pg_cron`:
```sql
SELECT cron.schedule(
  'run-health-checks-every-15min',
  '*/15 * * * *',
  $$ SELECT net.http_post(...) $$
);
```

See `src/docs/HEALTH_CHECK_CRON_SETUP.sql` for full setup.

#### Alerting
- Automatic alerts on failures
- Failed tests logged with error details
- Can be extended to send:
  - Slack notifications
  - Email alerts
  - PagerDuty incidents

## Configuration

### Environment Variables
```env
HEALTH_CRON="*/15 * * * *"
HEALTH_TEST_TIMEOUT_MS=20000
SIGNED_URL_TTL_SECONDS=600
STORY_MAX_SECONDS=45
```

### Test Coverage

| Category | Tests | Purpose |
|----------|-------|---------|
| Core | API uptime, Auth, RLS | Platform availability |
| Storage | Bucket access, Signed URLs | File operations |
| Messaging | Test Contact, Push | Notification pipeline |
| Stories | Upload, Duration, Expiry | 45s video stories |
| Help | ZIP resolver, Search | Local help resources |
| Admin | ZIP tools, Import/Export | Admin functionality |

## Usage

### Manual Health Check
1. Navigate to `/admin/health`
2. Click "Run All Now"
3. Wait for results (typically 5-10 seconds)
4. Review status tiles and failed tests

### Monitoring History
- View last 50 runs in table
- Click run for detailed results
- Filter by status or category
- Export results for analysis

### Troubleshooting Failed Tests

#### API Uptime Failure
- Check Supabase project status
- Verify network connectivity
- Review rate limits

#### Auth/RLS Failures
- Verify RLS policies are active
- Check user permissions
- Review security definer functions

#### Storage Failures
- Confirm buckets exist
- Verify RLS policies on storage.objects
- Check signed URL generation

#### ZIP Resolver Failures
- Check Zippopotam.us API availability
- Verify geocode-zip edge function
- Review zip_centroids cache

#### Stories Failures
- Verify family-stories bucket
- Check story expiry cron job
- Review cleanup edge function

### Alert Integration

#### Slack Webhook (Optional)
Add to health check function:
```typescript
if (failed > 0) {
  await fetch(SLACK_WEBHOOK_URL, {
    method: 'POST',
    body: JSON.stringify({
      text: `🚨 Health Check Failed: ${failed}/${total} tests`,
      blocks: failedTests.map(t => ({
        type: 'section',
        text: { type: 'mrkdwn', text: `*${t.test_key}*: ${t.error_text}` }
      }))
    })
  });
}
```

#### Email Alerts (Optional)
Use existing Resend integration:
```typescript
if (failed > 0) {
  await supabase.functions.invoke('send-alert-email', {
    body: {
      to: 'ops@example.com',
      subject: `Health Check Failures: ${failed} tests failed`,
      html: generateAlertHTML(failedTests)
    }
  });
}
```

## RLS Security

All health tables use admin-only RLS:
```sql
-- Only admins can view health data
CREATE POLICY "Admins can view health runs"
  ON system_health_runs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- System can write (service role)
CREATE POLICY "System can insert health runs"
  ON system_health_runs FOR INSERT
  WITH CHECK (true);
```

## Performance

### Typical Execution Times
- API uptime: <500ms
- Auth validation: 100-300ms
- RLS checks: 50-200ms
- Storage tests: 200-500ms
- ZIP resolver: 200ms (cache hit), 500ms (cache miss)
- Full suite: 5-10 seconds (parallel execution)

### Optimization Tips
1. **Parallel execution**: All tests run simultaneously
2. **Timeouts**: Each test has 20s timeout
3. **Caching**: ZIP resolver uses local cache
4. **Indexed queries**: All health tables have proper indexes

## Maintenance

### Adding New Tests
1. Create test function in `run-health-checks/index.ts`:
```typescript
async function testNewFeature(): Promise<TestResult> {
  const start = Date.now();
  try {
    // Test logic here
    return {
      test_key: 'new_feature',
      category: 'core',
      status: 'pass',
      duration_ms: Date.now() - start
    };
  } catch (error: any) {
    return {
      test_key: 'new_feature',
      category: 'core',
      status: 'fail',
      duration_ms: Date.now() - start,
      error_text: error.message
    };
  }
}
```

2. Add to test array:
```typescript
const testPromises = [
  // ... existing tests
  testNewFeature(),
];
```

3. Deploy edge function
4. Run manual test to verify

### Removing Tests
1. Remove from test array
2. (Optional) Remove test function
3. Deploy updated edge function

### Adjusting Schedule
Update cron expression in `HEALTH_CHECK_CRON_SETUP.sql`:
```sql
-- Every 5 minutes:
'*/5 * * * *'

-- Every hour:
'0 * * * *'

-- Daily at 2 AM:
'0 2 * * *'
```

## Known Limitations

1. **No actual push notifications**: Test Contact verifies pipeline but doesn't send real pushes yet
2. **Story upload simulation**: Uses metadata validation, not actual video upload
3. **Cache timing**: ZIP cache hit/miss depends on prior usage
4. **RLS validation**: Tests protection but not all policy permutations

## Troubleshooting

### Dashboard Not Loading
- Verify admin role assigned
- Check RLS policies on health tables
- Review browser console for errors

### Tests Always Failing
- Check edge function logs
- Verify service role key in cron job
- Test edge function manually from dashboard

### Cron Not Running
- Verify pg_cron extension enabled
- Check `cron.job` table for scheduled job
- Review `cron.job_run_details` for execution history

### Alert Not Triggering
- Verify webhook URL configured
- Check edge function logs for alert code
- Test alert endpoint separately

## References

- [Supabase pg_cron docs](https://supabase.com/docs/guides/database/extensions/pg_cron)
- [Edge Functions](https://supabase.com/docs/guides/functions)
- [RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)
- PRE_STORE_QA_CHECKLIST.md for full QA flow
- SHIP_NOTE_QA.md for release testing
