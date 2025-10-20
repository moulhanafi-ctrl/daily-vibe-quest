# Help Nearby Monitoring Alerts - Setup Guide

## Overview
This guide explains how to set up automated alerting for the `/help/nearby` endpoint monitoring dashboard.

## Architecture

The monitoring system consists of:
1. **Edge Function**: Structured logging in `help-nearby` function
2. **Admin Dashboard**: Real-time metrics at `/admin/help-monitoring`
3. **External Alerting**: Integration with third-party services

## Monitoring Dashboard

### Accessing the Dashboard
- **URL**: `/admin/help-monitoring`
- **Auth Required**: Admin role
- **Refresh Rate**: Auto-refreshes every 60 seconds

### Metrics Displayed
- **Error Rate %**: Percentage of failed requests
- **P95 Latency**: 95th percentile response time
- **Rate Limit Hits**: Number of rate-limited requests
- **Anomalies**: Unusual usage patterns detected
- **Cache Hit Rate**: Percentage of cached responses
- **Success Rate**: Overall request success rate

### Alert Thresholds
```typescript
const THRESHOLDS = {
  error_rate_pct: 2,        // > 2% triggers warning
  p95_latency: 2000,        // > 2000ms triggers warning
  rate_limit_hits: 200,     // > 200 hits/10min triggers warning
  anomalies: 5,             // > 5 anomalies/10min triggers warning
};
```

### Alert Severity Levels
- **Warning**: Metric exceeds threshold
- **Critical**: Metric exceeds threshold by 50% or more

## Built-in Monitoring Features

### 1. Real-Time Dashboard Alerts
The dashboard automatically:
- Checks metrics against thresholds every minute
- Displays active alerts with severity badges
- Shows "All Clear" status when no alerts
- Links directly to the monitoring runbook

### 2. Time Window Selection
Monitor metrics over:
- Last 10 minutes (default)
- Last 1 hour
- Last 24 hours

### 3. Visual Indicators
- **Red border**: Critical threshold exceeded
- **Yellow border**: Warning threshold exceeded
- **Green checkmark**: All systems operational

## Setting Up External Alerts

Since Lovable uses Supabase for the backend, you have several options for external alerting:

### Option 1: Supabase Monitoring (Recommended)

Supabase provides built-in monitoring for Edge Functions:

1. **Access Supabase Dashboard**
   - Go to your project dashboard
   - Navigate to Edge Functions → Logs

2. **View Function Logs**
   - Filter by function: `help-nearby`
   - Search for structured logs with `event` field
   - Use log search queries to find errors

3. **Set Up Log Alerts** (Pro Plan)
   - Supabase Pro plan includes log-based alerts
   - Configure alerts based on log patterns
   - Example: Alert when `event: "request_error"` appears > 10 times in 10 minutes

### Option 2: Custom Webhook Alerts

Create a monitoring edge function that queries logs and sends webhooks:

```typescript
// supabase/functions/check-help-nearby-health/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (req) => {
  // Query edge function logs
  const logs = await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/edge_logs`, {
    headers: {
      'apikey': Deno.env.get("SUPABASE_ANON_KEY"),
      'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
    }
  });
  
  // Calculate metrics
  const metrics = calculateMetrics(logs);
  
  // Check thresholds
  if (metrics.error_rate > 2) {
    // Send alert via webhook
    await fetch(Deno.env.get("SLACK_WEBHOOK_URL"), {
      method: 'POST',
      body: JSON.stringify({
        text: `🚨 Help Nearby Alert: Error rate ${metrics.error_rate}% (threshold: 2%)`
      })
    });
  }
  
  return new Response('OK');
});
```

Schedule this function to run every 5 minutes using Supabase Cron or an external cron service.

### Option 3: Third-Party Monitoring

#### Sentry
1. Install Sentry SDK in edge function
2. Configure error tracking
3. Set up alert rules in Sentry dashboard

```typescript
import * as Sentry from "@sentry/deno";

Sentry.init({
  dsn: Deno.env.get("SENTRY_DSN"),
  environment: "production"
});

// In error handling
Sentry.captureException(error, {
  tags: { service: "help-nearby" },
  contexts: { metrics: { latency, errorRate } }
});
```

#### Datadog
1. Send structured logs to Datadog
2. Create monitors for key metrics
3. Configure notification channels

```typescript
// Send metrics to Datadog
await fetch('https://http-intake.logs.datadoghq.com/v1/input', {
  method: 'POST',
  headers: {
    'DD-API-KEY': Deno.env.get("DATADOG_API_KEY"),
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    service: 'help-nearby',
    ddsource: 'edge-function',
    ddtags: 'env:production',
    message: logMetric(data)
  })
});
```

#### Grafana + Prometheus
1. Export metrics to Prometheus format
2. Scrape with Prometheus
3. Visualize in Grafana
4. Configure alert rules

## SQL Queries for Custom Alerting

If you have access to Supabase Analytics, use these queries:

### Error Rate (last 10 minutes)
```sql
SELECT 
  count(*) FILTER (WHERE metadata->>'event' = 'request_error') * 100.0 / 
  NULLIF(count(*), 0) as error_rate_pct
FROM edge_logs.function_logs
WHERE function_id = 'help-nearby'
  AND timestamp > now() - interval '10 minutes';
```

### P95 Latency (last 10 minutes)
```sql
SELECT 
  percentile_cont(0.95) WITHIN GROUP (
    ORDER BY (metadata->>'latencyMs')::int
  ) as p95_latency
FROM edge_logs.function_logs
WHERE function_id = 'help-nearby'
  AND metadata->>'latencyMs' IS NOT NULL
  AND timestamp > now() - interval '10 minutes';
```

### Rate Limit Hits (last 10 minutes)
```sql
SELECT count(*) as rate_limit_hits
FROM edge_logs.function_logs
WHERE function_id = 'help-nearby'
  AND metadata->>'event' = 'rate_limit_exceeded'
  AND timestamp > now() - interval '10 minutes';
```

### Anomalies (last 10 minutes)
```sql
SELECT count(*) as anomalies
FROM edge_logs.function_logs
WHERE function_id = 'help-nearby'
  AND metadata->>'anomalous' = 'true'
  AND timestamp > now() - interval '10 minutes';
```

## Alert Response Workflow

When an alert triggers:

1. **View Dashboard**: Go to `/admin/help-monitoring`
2. **Check Metrics**: Review current values vs thresholds
3. **View Runbook**: Click "View Runbook" button
4. **Follow Procedures**: Execute troubleshooting steps
5. **Document**: Record actions taken

## Integration with Existing Systems

### Add to Admin Navigation
```typescript
// In your admin menu component
<NavigationMenuItem>
  <Link href="/admin/help-monitoring">
    <Activity className="h-4 w-4 mr-2" />
    Help Monitoring
  </Link>
</NavigationMenuItem>
```

### Quick Access Links
The monitoring dashboard includes quick links to:
- Full monitoring runbook
- API diagnostics page (`/help/test-google`)
- Live help nearby page (`/help/nearby`)

## Maintenance

### Regular Tasks
- **Daily**: Review dashboard for anomalies
- **Weekly**: Check alert accuracy and adjust thresholds
- **Monthly**: Review runbook and update procedures

### Threshold Tuning
If alerts are too noisy or not sensitive enough:

1. Review historical data
2. Calculate appropriate percentiles
3. Update thresholds in `HelpNearbyMonitoring.tsx`
4. Document changes

## Production Checklist

Before going live:
- [ ] Verify all metrics display correctly
- [ ] Test alert triggers with simulated data
- [ ] Ensure runbook link is accessible
- [ ] Configure external alerting (if using)
- [ ] Set up on-call rotation
- [ ] Document escalation procedures
- [ ] Train team on dashboard usage

## Support

For issues or questions:
- **Dashboard URL**: `/admin/help-monitoring`
- **Runbook**: `src/docs/HELP_NEARBY_MONITORING.md`
- **Diagnostics**: `/help/test-google`

---

**Last Updated**: 2025-10-20
**Version**: 1.0
