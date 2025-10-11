# Pre-Store Upload QA Checklist

## ✅ Test Contact Feature

### Location
- [ ] Navigate to **Settings → QA tab**
- [ ] "Test Contact" card visible with QA Tool badge

### Functionality
- [ ] Click "Send Test Message" button
- [ ] Verify toast appears: "Test Message Sent"
- [ ] Check console for device info logged
- [ ] Verify second toast with device platform and language
- [ ] Check `test_messages` table for new record

### Expected Behavior
```
✅ Toast 1: "Test Message Sent - ✅ Received. Your messaging pipeline is healthy."
✅ Toast 2: "Device Info - Platform: [platform] | Language: [language]"
✅ Console: Full device info object logged
```

## ✅ Family Stories (45 Seconds)

### Access
- [ ] Navigate to **Family → Stories** tab from Dashboard
- [ ] Or use direct link: `/family/chat` → Stories tab

### Story Upload
- [ ] Click "Your Story" (+ button)
- [ ] System shows "Video recording feature coming soon. Max 45 seconds" toast
- [ ] (Feature placeholder - full video upload to be implemented)

### Story Viewing
- [ ] Stories appear as avatar rail at top
- [ ] Each story shows: poster name, time ago (e.g., "2h ago")
- [ ] Click story avatar → full-screen viewer opens
- [ ] Video plays automatically
- [ ] Header shows: avatar, name, time ago, close button
- [ ] Bottom shows: reaction buttons (heart, laugh) + view count

### Story Interactions
- [ ] Click reaction button → "Reaction added" toast appears
- [ ] Check `story_reactions` table for record
- [ ] Verify view recorded in `story_views` table
- [ ] Close viewer with X button

### Expiration
- [ ] Verify `expires_at` is 24 hours from `created_at`
- [ ] Stories with `expires_at < NOW()` don't appear
- [ ] Run cleanup function manually to test deletion

## ✅ Help & Resources (Nationwide ZIP)

### ZIP Resolution
- [ ] Navigate to `/help`
- [ ] Enter any valid U.S. ZIP code:
  - [ ] Test 5-digit: `48917`
  - [ ] Test ZIP+4: `48917-1234` (normalizes to `48917`)
  - [ ] Test other regions: `02115` (Boston), `90210` (LA), `00601` (Puerto Rico)

### Search Results
- [ ] Verify "✓ Nationwide ZIP support • Instant resolution" text visible
- [ ] Submit ZIP → see location resolved (city, state)
- [ ] Results show within 200ms after warm cache
- [ ] Verify 3 sections:
  1. **Therapists Near Me** (up to 3 cards, sorted by score)
  2. **Crisis Centers Near Me** (up to 3 cards)
  3. **National Help & Resources** (always visible)

### Location Cards
- [ ] Each card shows: name, distance, address, tags
- [ ] "Call" button works (opens dialer)
- [ ] "Website" button opens in new tab
- [ ] Directions button opens Google Maps
- [ ] Verified badge appears when applicable

### Fallbacks
- [ ] Enter ZIP with no nearby results (rare) → National section still shows
- [ ] If <3 results → "Expand to 50 miles" option appears (if radius was 25)
- [ ] Invalid ZIP → inline error: "Enter a valid 5-digit ZIP"

### Cache Performance
- [ ] First lookup: ~200-500ms (external API call)
- [ ] Second lookup same ZIP: <200ms (cache hit)
- [ ] Check `zip_centroids` table for cached entries
- [ ] Verify edge function logs show "Cache HIT" or "Cache MISS"

## ✅ Admin Tools

### Help Locations (/admin/help-locations)
- [ ] View all help locations in table
- [ ] Search by name, city, or state
- [ ] Filter by type (therapy, crisis, all)
- [ ] Stats cards show: Total, Missing Coords, Active
- [ ] "Geocode Missing" button processes locations without coords
- [ ] "Add Location" opens dialog with form
- [ ] Can toggle is_active status
- [ ] "Export CSV" downloads all locations

### ZIP Tools (/admin/zip-tools)
- [ ] Stats show: Total Cached ZIPs, Recently Added (24h), Cache Hit Rate
- [ ] Import CSV with columns: `zip,latitude,longitude,city,state`
- [ ] Validates 5-digit ZIP, lat/lon bounds (24-50°N, -125 to -65°W)
- [ ] Shows import progress and results
- [ ] Export CSV downloads all cached centroids
- [ ] "Clear Cache" button prompts confirmation and clears table

### Coverage Target
- [ ] After seed: ≥30,000 ZIPs in `zip_centroids`
- [ ] Cache hit rate >95% after warm-up

## ✅ System Health Dashboard

### Access
- [ ] Navigate to `/admin/health` (admin-only)
- [ ] Dashboard loads without errors
- [ ] Real-time updates work (run a manual check)

### Manual Health Check
- [ ] Click "Run All Now" button
- [ ] Tests complete within 10 seconds
- [ ] Status tiles update with results
- [ ] All tiles show green (pass) or identify specific failures

### Status Tiles
- [ ] **Status**: Shows overall health (pass/fail/partial)
- [ ] **Tests Passed**: Shows X/Y format
- [ ] **Tests Failed**: Shows count of failures
- [ ] **Duration**: Shows execution time in seconds

### Test Categories
Verify all test categories are present and passing:

#### Core Platform
- [ ] API uptime test (<500ms response)
- [ ] Auth session validation
- [ ] RLS protection verification

#### Storage
- [ ] Bucket access test (family-stories)
- [ ] Signed URL generation

#### Messaging
- [ ] Test Contact functionality
- [ ] Message pipeline validation

#### Family Stories
- [ ] Upload flow validation
- [ ] Duration guard (45s limit)
- [ ] Storage integration

#### Help System
- [ ] ZIP resolver test (90210, 02115, 48917)
- [ ] Help search functionality
- [ ] Admin tools access

### Run History
- [ ] Table shows last 50 runs
- [ ] Columns: Started, Status, Passed, Failed, Duration, Triggered By
- [ ] Status badges display correctly (pass/fail/partial)
- [ ] Timestamps show relative time ("2 minutes ago")

### Failed Test Details
If any tests fail:
- [ ] Error text displays in test result
- [ ] Can identify specific issue
- [ ] Duration shows for failed tests
- [ ] Category grouping helps locate problem area

### Automated Monitoring (Post-Setup)
- [ ] Cron job scheduled (see `HEALTH_CHECK_CRON_SETUP.sql`)
- [ ] Tests run every 15 minutes
- [ ] Results logged to `system_health_runs` table
- [ ] Failures trigger alerts (if configured)

## ✅ Navigation & Routes

### Dashboard Header
- [ ] Help button navigates to `/help`
- [ ] Family button navigates to `/family/chat`
- [ ] All existing buttons still work (Journal, Library, Store, Chat Rooms, Trivia)

### Settings
- [ ] 5 tabs visible: Language, Privacy, Notifications, Arthur, QA
- [ ] QA tab contains Test Contact card
- [ ] All tabs load without errors

### Admin
- [ ] `/admin/ops` shows links to Health Dashboard, Help Locations, and ZIP Tools
- [ ] `/admin/health` accessible and functional
- [ ] Links to new docs: FAMILY_STORIES_SETUP.md, HEALTH_CHECK_SYSTEM.md

## ✅ Database Integrity

### Tables Created
- [ ] `zip_centroids` (zip, latitude, longitude, city, state)
- [ ] `system_users` (with TEST_CONTACT row)
- [ ] `family_stories` (video_url, duration_seconds ≤45, expires_at)
- [ ] `story_views` (story_id, viewer_id)
- [ ] `story_reactions` (story_id, user_id, reaction)
- [ ] `test_messages` (user_id, message, device_info)
- [ ] `system_health_runs` (health check execution tracking)
- [ ] `system_health_results` (individual test results)

### RLS Policies
- [ ] Anyone can view `zip_centroids`
- [ ] Anyone can view `system_users`
- [ ] Users can create their own stories
- [ ] Family members can view family stories (not expired)
- [ ] Users can delete their own stories
- [ ] Proper storage policies on `family-stories` bucket

### Storage Buckets
- [ ] `family-stories` bucket exists (private)

## ✅ Edge Functions

- [ ] `geocode-zip`: Normalizes ZIP, checks cache, fetches from API, caches result
- [ ] `cleanup-expired-stories`: Deletes expired stories + files (setup cron)
- [ ] `run-health-checks`: Automated system health monitoring

### Edge Function Logs
- [ ] Check logs for `geocode-zip`: Cache HIT/MISS messages
- [ ] No errors in function execution
- [ ] Proper CORS headers

## ✅ Telemetry & Analytics

### Events to Track
- [ ] `help_viewed` (when viewing help page with ZIP)
- [ ] `help_call_clicked` (call button on location card)
- [ ] `help_website_clicked` (website button)
- [ ] `help_directions_clicked` (directions button)
- [ ] `help_local_ranked` (when search completes)

### Verify
- [ ] Events appear in `analytics_events` table
- [ ] User ID, timestamp, and metadata captured

## ✅ Security & Privacy

### Authentication
- [ ] All protected routes require login
- [ ] RLS policies prevent cross-user data access
- [ ] Storage bucket is private with proper policies

### Data Protection
- [ ] Stories expire after 24 hours
- [ ] Only family members see stories
- [ ] Test messages only visible to sender
- [ ] No PII leaked in public endpoints

## ✅ Performance

### Load Times
- [ ] Dashboard loads in <2s
- [ ] Help page ZIP search responds in <500ms
- [ ] Story rail loads in <1s
- [ ] Admin pages load in <2s

### Database Queries
- [ ] No N+1 queries
- [ ] Proper indexes on frequently queried columns
- [ ] RLS policies don't cause performance issues

## ✅ Mobile Responsiveness

- [ ] All pages work on mobile (≤640px)
- [ ] Story viewer is full-screen on mobile
- [ ] Buttons and inputs are touch-friendly
- [ ] Navigation menus are accessible

## Pre-Launch Actions

1. **Seed ZIP Cache** (optional but recommended):
   - [ ] Download U.S. ZIP centroid CSV (~33k rows)
   - [ ] Import via `/admin/zip-tools`
   - [ ] Verify cache hit rate >95%

2. **Setup Cron Jobs**:
   - [ ] Enable `pg_cron` and `pg_net` in Supabase
   - [ ] Run SQL from `src/docs/STORIES_CRON_SETUP.sql`
   - [ ] Run SQL from `src/docs/HEALTH_CHECK_CRON_SETUP.sql`
   - [ ] Replace `YOUR_SERVICE_ROLE_KEY` with actual key in both
   - [ ] Test manual runs of both functions

3. **Populate Help Locations**:
   - [ ] Add real therapy/crisis centers to `help_locations`
   - [ ] Run "Geocode Missing" to populate coordinates
   - [ ] Verify locations appear in search results
   - [ ] Test with various ZIP codes

4. **Security Review**:
   - [ ] Enable leaked password protection in Supabase Auth settings
   - [ ] Review all RLS policies
   - [ ] Test with non-admin user account
   - [ ] Verify no unauthorized data access

5. **Final Testing**:
   - [ ] Run through all QA steps above
   - [ ] **Run system health check from `/admin/health`**
   - [ ] **Verify all health tests pass**
   - [ ] Test with multiple user accounts
   - [ ] Test family story sharing between accounts
   - [ ] Verify all edge functions work in production

## Known Issues / Limitations

- **Story Upload**: Video recording UI is placeholder - full implementation pending
- **Test Contact**: Does not send actual push notifications yet (infrastructure pending)
- **Leaked Password Protection**: Warning in Supabase - should be enabled before production

## Success Criteria

✅ Any valid U.S. ZIP (5-digit or ZIP+4) resolves in ≤200ms after cache warmup
✅ Help search returns local results or graceful fallback with national resources
✅ Test Contact sends message and displays device info
✅ Family Stories structure ready for video upload (45s limit enforced)
✅ **System health dashboard shows all tests passing**
✅ **Automated health checks run every 15 minutes**
✅ All navigation works from Dashboard
✅ Admin tools functional for managing locations and ZIP cache
✅ Zero TypeScript or build errors
✅ All RLS policies secure and tested
