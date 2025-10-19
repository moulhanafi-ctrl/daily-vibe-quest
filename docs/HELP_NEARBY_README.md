# Find Help Near Me - Production Implementation

This system provides a production-ready "Find help near me" feature for the USA & Canada, supporting therapists, crisis centers, and national hotlines.

## 🎯 Features

- **Multi-Provider Geocoding**: Google Maps → Mapbox → OpenStreetMap fallback chain
- **Smart Place Search**: Google Places API with deduplication and quality filtering
- **National Hotlines**: Always available for US & Canada (988, Crisis Text Line, Trevor Project, etc.)
- **Caching**: 60-minute server-side cache for improved performance
- **Rate Limiting**: 30 requests per minute per IP
- **Filters**: All/Therapists/Crisis, Open Now toggle, Radius selection (10-80km)
- **Comprehensive Logging**: Structured JSON logs for monitoring
- **Health Endpoint**: Real-time service status checking

## 🔧 Environment Variables

Configure these in your Supabase project settings under Functions → Environment Variables:

### Required (at least ONE geocoding provider):
- `GOOGLE_MAPS_API_KEY` - Preferred provider (both geocoding + places search)
- `MAPBOX_TOKEN` - Fallback geocoding (if Google unavailable)

### Other Variables (Already Set):
- `FROM_EMAIL` - Email sender for notifications
- `APP_DASHBOARD_URL` - Dashboard URL for confirmation emails

### Getting API Keys:

**Google Maps API** (Recommended):
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable: Geocoding API + Places API (New)
3. Create API key under Credentials
4. Set environment variable: `GOOGLE_MAPS_API_KEY=your_key_here`

**Mapbox** (Optional Fallback):
1. Sign up at [Mapbox](https://www.mapbox.com/)
2. Get free access token from Account dashboard
3. Set environment variable: `MAPBOX_TOKEN=your_token_here`

## 📡 API Endpoints

### POST /functions/v1/help-nearby
Main search endpoint.

**Request:**
```json
{
  "code": "10001",
  "radiusKm": 40,
  "filters": {
    "type": "all",
    "openNow": false
  }
}
```

**Response:**
```json
{
  "where": {
    "lat": 40.7589,
    "lng": -73.9851,
    "city": "New York",
    "region": "NY",
    "country": "US"
  },
  "locals": [
    {
      "name": "Manhattan Mental Health Center",
      "type": "therapist",
      "distanceKm": 2.5,
      "distanceMi": 1.6,
      "phone": "+1-555-0100",
      "website": "https://example.com",
      "address": "123 Main St",
      "openNow": true
    }
  ],
  "nationals": [
    {
      "name": "988 Suicide & Crisis Lifeline",
      "phone": "988",
      "website": "https://988lifeline.org"
    }
  ],
  "meta": {
    "radiusKm": 40,
    "source": "google",
    "tookMs": 450,
    "cache": "MISS"
  }
}
```

### GET /functions/v1/help-health
Service health check.

**Response:**
```json
{
  "ok": true,
  "geocoder": "google",
  "places": "ok",
  "uptime": 3600,
  "timestamp": "2025-01-19T10:30:00Z"
}
```

## 📋 Curated Crisis Centers

Add custom entries to `data/crisis_centers.us_ca.json`:

```json
{
  "name": "Local Crisis Center",
  "country": "US",
  "region": "NY",
  "city": "New York",
  "phone": "1-555-CRISIS",
  "website": "https://example.org",
  "description": "24/7 crisis support",
  "type": "crisis",
  "lat": 40.7589,
  "lng": -73.9851,
  "tags": ["crisis", "24/7"]
}
```

These entries will be merged with API results and fill gaps when APIs lack website/phone data.

## 🧪 Testing

### Manual E2E Tests

Test these ZIP/postal codes to verify full functionality:

**United States:**
- `10001` (New York, NY) - Should return locals + 988 Lifeline
- `90210` (Beverly Hills, CA) - Should return locals + national hotlines
- `60601` (Chicago, IL) - Should return locals + national resources

**Canada:**
- `M5V 2T6` (Toronto, ON) - Should return locals + Talk Suicide Canada
- `H2Y 1C6` (Montréal, QC) - Should return locals + Kids Help Phone
- `V6B 1A1` (Vancouver, BC) - Should return locals + Hope for Wellness

**Edge Cases:**
- Invalid: `ABC12345` - Should show inline validation error
- Rural: `99501` (Anchorage, AK) - May have fewer locals, but nationals always present

### Health Check Test
```bash
curl https://YOUR_PROJECT.supabase.co/functions/v1/help-health
```

Expected: `{ "ok": true, "geocoder": "google", "places": "ok" }`

### Performance Benchmarks
- Warm (cached): p50 ≤ 800ms, p95 ≤ 1.5s
- Cold (no cache): p50 ≤ 2s, p95 ≤ 3s
- Rate limited: Returns 429 after 30 requests/minute

## 📊 Monitoring

### Structured Logs
All requests log JSON with these fields:
```json
{
  "code": "10001",
  "country": "US",
  "sourceUsed": "google",
  "locals": 5,
  "nationals": 7,
  "tookMs": 420,
  "cache": "MISS"
}
```

### Admin Diagnostics (UI)
Visible only to admins in the UI:
- Detected format (US ZIP or CA postal)
- Geocoder used (google/mapbox/osm)
- Server latency
- Total latency (includes network)
- Cache status (HIT/MISS)
- Location details

## 🔒 Security & Privacy

- **No PII Stored**: Only ZIP/postal codes logged (public information)
- **Rate Limiting**: Prevents abuse (30/min per IP)
- **CORS Enabled**: Allows web client access
- **Timeout Protection**: 4s max per external API call
- **Graceful Degradation**: Always returns national hotlines, even on total failure

## 🎨 UI Components

### Main Search Interface
- **Location**: `src/components/help/LocalHelpSearch.tsx`
- **Features**:
  - ZIP/postal code input with validation
  - Type filter tabs (All/Therapists/Crisis)
  - Radius dropdown (10/25/40/80 km)
  - "Open now" toggle
  - Responsive card layout
  - Distance in both km and miles
  - Click-to-call phone buttons
  - Direct website links
  - Empty states with helpful messaging

### National Hotlines Config
- **Location**: `src/config/hotlines.ts`
- **Exports**: `NATIONAL_HOTLINES`, `getHotlinesByCountry()`
- **Coverage**: 7 US + 5 CA hotlines (suicide prevention, LGBTQ+, veterans, domestic violence, etc.)

## 🚀 Deployment

The Edge Functions are automatically deployed with your Supabase project. No manual deployment needed.

## 📝 Maintenance

### Adding New Hotlines
Edit `src/config/hotlines.ts` and add to `NATIONAL_HOTLINES` array.

### Adding Curated Centers
Add entries to `data/crisis_centers.us_ca.json` with required fields:
- `name`, `country`, `website` (minimum)
- Optional: `phone`, `lat`, `lng`, `city`, `region`, `type`, `tags`

### Monitoring Health
Regularly check `/functions/v1/help-health` endpoint to ensure geocoding and places services are operational.

## 🐛 Troubleshooting

**No local results?**
- Check that at least one geocoding provider (Google or Mapbox) is configured
- Verify API keys are valid and have required APIs enabled
- National hotlines should always appear

**Slow responses?**
- First request is always slower (no cache)
- Subsequent requests to same location should be fast (< 1s)
- Check health endpoint to verify provider status

**Rate limited?**
- Implement client-side debouncing for search input
- Cache results on client for repeat searches
- Current limit: 30 requests/minute per IP

## 📞 Support

For issues or questions, check:
1. Edge function logs in Supabase dashboard
2. Browser console for client-side errors
3. Health endpoint for service status
4. This README for configuration guidance
