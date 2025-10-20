# Help Nearby (/help/nearby) Monitoring Runbook

## Overview
The `/help/nearby` endpoint provides public access to crisis centers, therapists, and mental health resources based on ZIP/postal codes. This runbook covers monitoring, alerting, and incident response.

## Architecture
- **Endpoint**: `POST /help/nearby`
- **Authentication**: Public (no JWT required)
- **Rate Limit**: 30 requests/min per IP
- **Cache TTL**: 10 minutes (in-memory edge cache)
- **Geocoding**: Google Maps API → Mapbox → OpenStreetMap (fallback chain)
- **Places Search**: Google Places API (New)

## Key Metrics & Structured Logging

All logs are emitted in structured JSON format with these fields:

```json
{
  "timestamp": "ISO8601",
  "service": "help-nearby",
  "event": "request_success|request_error|rate_limit_exceeded|anomalous_usage_detected|validation_error|geocode_failure",
  "zip": "90210",
  "radiusKm": 40,
  "resultCount": 15,
  "latencyMs": 1250,
  "rateLimited": false,
  "errorCode": "GEOCODE_FAILED|INVALID_CODE|INTERNAL_ERROR",
  "errorMessage": "error description",
  "ip": "1.2.3.4",
  "anomalous": false,
  "cached": true,
  "geocoder": "google|mapbox|osm"
}
```

## Alert Thresholds

### 🔴 Critical Alerts

#### 1. High Error Rate
```
Condition: error_rate > 2% over 10 minutes
Impact: Users unable to find help resources
Action: Check Google Maps API status, quota limits, and recent code changes
```

**Investigation Steps:**
1. Query logs for `event: "request_error"` in last 10 minutes
2. Group by `errorCode` to identify failure pattern:
   - `GEOCODE_FAILED`: Check Google/Mapbox API status
   - `RATE_LIMIT_EXCEEDED`: Check for abuse patterns
   - `INTERNAL_ERROR`: Review recent deployments
3. Check Google Cloud Console for API quota/billing issues
4. Review `/help/test-google` diagnostic page

**Mitigation:**
- If Google API down: Endpoint will automatically fall back to Mapbox → OSM
- If quota exceeded: Increase daily quota or implement stricter rate limits
- If code issue: Roll back recent deployment

#### 2. High Latency (P95 > 2000ms)
```
Condition: p95_latency > 2000ms over 10 minutes
Impact: Poor user experience, potential timeouts
Action: Identify slow geocoding or Places API calls
```

**Investigation Steps:**
1. Query logs for high `latencyMs` values
2. Check `geocoder` field to see which service is slow
3. Verify cache hit rate (should be >50% for repeat ZIPs)
4. Check Google Places API performance in Cloud Console

**Mitigation:**
- Cache TTL is 10 minutes - verify cache is working
- If Google slow: Wait for recovery or reduce search radius temporarily
- If persistent: Consider precomputing popular ZIP codes

#### 3. Rate Limit Abuse
```
Condition: rate_limit_hits > 200 in 10 minutes
Impact: Legitimate users may be blocked
Action: Identify abusive IPs and implement additional protections
```

**Investigation Steps:**
1. Query logs for `event: "rate_limit_exceeded"`
2. Group by `ip` to identify repeat offenders
3. Check `anomalous: true` flag (>20 unique ZIPs/min/IP)

**Mitigation:**
- Add IP to block list if clearly malicious
- Consider implementing CAPTCHA for anomalous users
- Temporarily increase rate limit if legitimate traffic spike

#### 4. Google API Quota (80% Daily Limit)
```
Condition: Google Places/Geocoding usage > 80% daily quota
Impact: Risk of service degradation when quota exhausted
Action: Review usage patterns and increase quota
```

**Investigation Steps:**
1. Check Google Cloud Console → APIs & Services → Quotas
2. Review daily usage trends
3. Identify if spike is organic or abuse

**Mitigation:**
- Increase daily quota limits
- Implement stricter rate limiting temporarily
- Use cache more aggressively (increase TTL to 60 min for popular ZIPs)

## Anomaly Detection

### Adaptive CAPTCHA Triggers
The system tracks anomalous usage patterns:
- **Threshold**: >20 unique ZIP codes per minute from single IP
- **Flag**: `anomalous: true` in logs
- **Action**: Log for review; CAPTCHA not yet implemented

**Future Implementation:**
1. Frontend: Add CAPTCHA component (Cloudflare Turnstile recommended)
2. Backend: Verify CAPTCHA token on anomalous requests
3. Allow 3 anomalous requests before requiring CAPTCHA

## Cache Strategy

### Edge Cache (10 minute TTL)
- **Cache Key**: `{zip}|{radiusKm}|{filterType}|{openNow}`
- **Hit Rate Target**: >50%
- **Bypass on Errors**: Yes (errors are not cached)

**Cache Monitoring:**
```bash
# Count cache hits vs misses
grep '"cached":true' logs.json | wc -l
grep '"cached":false' logs.json | wc -l
```

**Cache Invalidation:**
- Automatic expiry after 10 minutes
- No manual invalidation needed (results don't change frequently)

## API Dependencies

### 1. Google Maps Geocoding API
- **Endpoint**: `https://maps.googleapis.com/maps/api/geocode/json`
- **Quota**: 40,000 requests/day (check your limit)
- **Fallback**: Mapbox → OpenStreetMap
- **Status**: Check [Google Cloud Status](https://status.cloud.google.com/)

### 2. Google Places API (New)
- **Endpoint**: `https://places.googleapis.com/v1/places:searchText`
- **Quota**: 28,500 requests/month (check your limit)
- **No Fallback**: If fails, returns national hotlines only
- **Status**: Check [Google Cloud Status](https://status.cloud.google.com/)

### 3. Mapbox Geocoding API
- **Endpoint**: `https://api.mapbox.com/geocoding/v5/`
- **Optional**: Only if `MAPBOX_TOKEN` configured
- **Quota**: 100,000 requests/month on free tier

### 4. OpenStreetMap Nominatim
- **Endpoint**: `https://nominatim.openstreetmap.org/search`
- **Last Fallback**: No API key needed
- **Rate Limit**: 1 req/sec (we respect this)

## Diagnostic Tools

### 1. Test Google API Page
**URL**: `/help/test-google`

Tests all three Google APIs:
- Maps JavaScript API (frontend)
- Geocoding API (backend)
- Places API (New) (backend)

**Use for**:
- Verifying API key configuration
- Checking API restrictions
- Diagnosing REQUEST_DENIED errors

### 2. Admin Diagnostics Panel
**Location**: `/help/nearby` (visible to admins only)

Shows for each request:
- Geocoder used (google/mapbox/osm)
- Server latency
- Cache hit/miss
- Result counts
- Fallback usage

## Common Issues & Solutions

### Issue: "Invalid ZIP/postal code format"
**Cause**: User entered invalid format
**Resolution**: Auto-resolved by validation
**Action**: None required (logged as validation_error)

### Issue: "GEOCODE_FAILED"
**Causes**:
1. Google API key not set or invalid
2. API restrictions blocking requests
3. All geocoding services down (rare)

**Resolution**:
1. Check `/help/test-google` diagnostic page
2. Verify `GOOGLE_MAPS_API_KEY` secret is set
3. Check Google Cloud Console for API restrictions
4. Enable Geocoding API if disabled

### Issue: "No local providers found"
**Cause**: Legitimate - not all areas have therapists/crisis centers
**Resolution**: System automatically shows national hotlines
**Action**: None required (expected behavior)

### Issue: High cache miss rate
**Cause**: Many unique ZIP searches
**Resolution**: 
- Expected in low-traffic periods
- Increase TTL to 60 minutes if needed
- Consider precomputing popular ZIPs

## Escalation Path

1. **Check Logs**: Review structured logs for error patterns
2. **Check Diagnostics**: Run `/help/test-google` to verify APIs
3. **Check Dependencies**: Verify Google Cloud API status
4. **Review Recent Changes**: Check if error correlates with deployment
5. **Escalate**: If unresolved in 15 minutes, escalate to on-call engineer

## On-Call Contacts
- **Service Owner**: [Add contact]
- **Google Cloud Admin**: [Add contact]
- **Escalation**: [Add contact]

## Post-Incident Review
After incidents:
1. Document root cause
2. Update this runbook
3. Add preventive monitoring if needed
4. Consider adding alerts/dashboards

## Dashboard Queries (Supabase Analytics)

### Error Rate
```sql
SELECT 
  date_trunc('minute', timestamp) as minute,
  count(*) filter (where event = 'request_error') * 100.0 / count(*) as error_rate
FROM edge_logs.function_logs
WHERE function_id = 'help-nearby'
  AND timestamp > now() - interval '1 hour'
GROUP BY minute
ORDER BY minute DESC;
```

### P95 Latency
```sql
SELECT 
  date_trunc('minute', timestamp) as minute,
  percentile_cont(0.95) within group (order by (metadata->>'latencyMs')::int) as p95_latency
FROM edge_logs.function_logs
WHERE function_id = 'help-nearby'
  AND metadata->>'latencyMs' IS NOT NULL
  AND timestamp > now() - interval '1 hour'
GROUP BY minute
ORDER BY minute DESC;
```

### Rate Limit Hits
```sql
SELECT 
  count(*) as rate_limit_hits,
  metadata->>'ip' as ip
FROM edge_logs.function_logs
WHERE function_id = 'help-nearby'
  AND event = 'rate_limit_exceeded'
  AND timestamp > now() - interval '10 minutes'
GROUP BY ip
ORDER BY rate_limit_hits DESC;
```

---

**Last Updated**: 2025-10-20
**Version**: 1.0
