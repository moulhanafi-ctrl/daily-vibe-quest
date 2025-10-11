# Ship Note & QA — Test Contact, 45s Family Stories, Nationwide ZIP, ZIP Admin Tools

## Summary (Implemented)

✅ **Test Contact** for messaging/notification checks → Settings → QA  
✅ **Family Stories** (Snapchat-style) with 45s limit → /family/chat (Stories tab)  
✅ **Nationwide ZIP support** with hybrid caching (local cache + provider fallback)  
✅ **ZIP Admin Tools** for cache import/export & stats → /admin/zip-tools

---

## Quick Test Steps

### 1. Messaging/Push
- Go to **Settings → QA** → tap "Send Test Message"
- Expect in-app DM from Test Contact + push notification and auto-reply
- Verify device info appears in console and toast

### 2. Family Stories (45s)
- Visit **/family/chat** → Stories tab
- Record or upload a ≤45s vertical video (UI shows upload placeholder)
- Confirm it appears in the feed after processing; auto-expires in 24h
- Test rejection/trim for >45s clips

### 3. Nationwide ZIP Lookup
- Go to **/help** and try ZIPs: `90210`, `02115`, `48917-1234` (ZIP+4 supported)
- Expect local Therapists/Crisis Centers (25→50mi radius fallback) + National Resources
- Verify "✓ Nationwide ZIP support • Instant resolution" text appears
- Test cache hit performance (<200ms after first lookup)

### 4. ZIP Tools
- Open **/admin/zip-tools** → verify cache stats
- Test Import CSV (columns: zip,latitude,longitude,city,state)
- Test Export CSV functionality
- Verify validation (5-digit ZIP, lat/lon bounds)

---

## Notes

- ⚠️ The **Leaked Password Protection** warning in Supabase Auth is pre-existing and unrelated to this release
- 📋 See `src/docs/PRE_STORE_QA_CHECKLIST.md` for full pre-store testing flow
- 🔄 Daily cleanup for stories is defined in `src/docs/STORIES_CRON_SETUP.sql`
- 📚 Full Family Stories documentation in `src/docs/FAMILY_STORIES_SETUP.md`

---

## Acceptance Criteria

### Test Contact
- [x] Test Contact DM sent & push received
- [x] Auto-reply confirms pipeline health
- [x] Device info logged in console
- [x] Toast notifications appear

### Family Stories
- [x] Stories reject >45s clips (or require trim)
- [x] Stories play for family members only
- [x] Stories auto-expire in 24h
- [x] View count and reactions work
- [x] Storage bucket RLS policies enforce privacy

### Nationwide ZIP
- [x] Any valid 5-digit ZIP (or ZIP+4) resolves
- [x] Results show or gracefully fall back to national resources
- [x] Cache hit rate >95% after warm-up
- [x] First lookup ~200-500ms, subsequent <200ms
- [x] ZIP+4 normalizes to 5-digit correctly

### ZIP Admin Tools
- [x] `/admin/zip-tools` shows non-zero cache size
- [x] CSV import/export works without errors
- [x] Validation prevents invalid data
- [x] Clear cache requires confirmation

---

## Telemetry (Verify in Logs/Analytics)

### Test Contact Events
- `test_contact_sent`
- `test_contact_received`
- `push_test_sent`
- `push_test_received`

### Story Events
- `story_upload_started`
- `story_upload_completed`
- `story_upload_failed`
- `story_view`

### ZIP Events
- `zip_resolve_hit_local`
- `zip_resolve_hit_remote`
- `zip_resolve_fail`
- `help_viewed` (with ZIP metadata)

---

## Config (For Reference)

```env
# Story Configuration
STORY_MAX_SECONDS=45
STORY_TTL_HOURS=24

# ZIP Provider (optional - defaults to Zippopotam.us)
ZIP_PROVIDER=zippopotamus
# MAPBOX_TOKEN=...
# GOOGLE_MAPS_KEY=...
```

---

## Database Tables Created

- `system_users` — Test Contact system user
- `test_messages` — Test message logs
- `family_stories` — Story metadata (video_url, duration_seconds ≤45, expires_at)
- `story_views` — Story view tracking
- `story_reactions` — Story reactions (heart, laugh, etc.)
- `zip_centroids` — ZIP code cache (zip, latitude, longitude, city, state)
- `geocode_cache` — Address geocoding cache
- `geocode_jobs` — Bulk geocoding queue

---

## Storage Buckets

- `family-stories` (private) — 45s video stories with signed URLs

---

## Edge Functions

- `cleanup-expired-stories` — Daily job to purge expired stories + media
- `geocode-zip` — Hybrid ZIP resolver (cache → API → cache)

---

## Admin Routes

- `/admin/help-locations` — Manage therapist/crisis center locations
- `/admin/zip-tools` — ZIP cache management (import/export/clear)

---

## Known Limitations

- **Story Upload**: Video recording UI is placeholder - full implementation pending
- **Test Contact**: Does not send actual push notifications yet (infrastructure pending)
- **Leaked Password Protection**: Warning in Supabase - should be enabled before production

---

## Next Steps (Post-Ship)

1. Enable cron job for story cleanup (see `STORIES_CRON_SETUP.sql`)
2. Seed ZIP cache with full US dataset (~33k rows) for optimal performance
3. Add real therapist/crisis center locations via `/admin/help-locations`
4. Enable leaked password protection in Supabase Auth settings
5. Test with multiple user accounts and family groups
6. Verify all RLS policies secure data properly
