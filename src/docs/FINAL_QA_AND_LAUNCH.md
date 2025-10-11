# Final QA and Launch Guide

## Overview
This document outlines the complete QA, launch, and day-1 monitoring process for Vibe Check.

## Phase A: Final QA (Multilingual)

### Access QA Dashboard
Navigate to `/admin/publish` to access the interactive QA checklist.

### i18n Sweep
1. **Test all 4 languages** (EN/ES/FR/AR):
   - Navigate through key flows in each language
   - Check Language Picker → Onboarding → Consent → Check-in → Journal
   - Verify no English bleedthrough in non-EN locales

2. **Missing Keys Check**:
   - Monitor browser console for `missingKey` warnings
   - All warnings logged to analytics as `i18n_missing_key` events
   - Target: 0 missing keys before launch

3. **RTL Verification (Arabic)**:
   - Verify `dir="rtl"` is set on `<html>` element
   - Check UI elements mirror correctly:
     - Buttons and icons flip horizontally
     - Chevrons point in correct direction
     - Text alignment is right-to-left
   - Test on: Rooms, Store, Settings, Legal pages

### Accessibility Audit
1. **Automated Scan**:
   - Run Axe DevTools on key pages:
     - `/` (Home)
     - `/onboarding`
     - `/dashboard`
     - `/chat-rooms`
     - `/store`
     - `/help/nearby`
     - `/settings`
   - Target: 0 critical violations

2. **Manual Testing**:
   - **Keyboard Navigation**:
     - Tab through all interactive elements
     - Verify visible focus rings
     - Ensure no keyboard traps
     - Test skip-to-content link (Shift+Tab from first element)
   
   - **Text Scaling**:
     - Test at 125%, 150%, and 200% zoom
     - Verify no text overlap or cutoff
     - Ensure buttons remain clickable
   
   - **Hit Targets**:
     - Measure button/link sizes (dev tools)
     - Target: ≥44px height
     - Focus on: Room actions, Help buttons, Store CTAs
   
   - **ARIA Labels**:
     - Screen reader test (NVDA/VoiceOver)
     - Verify all icon-only buttons have labels
     - Check: Report, Mute, Call, Website, Directions buttons

### SEO & Links
1. **Link Checker**:
   - Test all internal links navigate correctly
   - Test external links open in new tabs
   - Focus areas: Footer, Legal pages, Help resources

2. **Open Graph Validation**:
   - Use validator: https://www.opengraph.xyz/
   - Test URLs:
     - `/` (Home)
     - `/store/product/:id` (any PDP)
     - `/chat-rooms` (generic)
     - `/legal/terms`
   - Verify: Image loads, title/description correct

3. **Sitemap & Robots**:
   - Check `/sitemap.xml` returns valid XML
   - Check `/robots.txt` has correct disallow rules
   - Verify sitemap includes all public routes

### Crisis & Local Help
1. **Crisis Banner Logic**:
   - **US locales** (EN/ES):
     - Banner shows: "Need urgent help? Call or text 988 (US)"
     - Test on `/crisis` and `/help/nearby`
   
   - **Non-US locales** (AR/FR):
     - Banner shows: "Find crisis support in your country"
     - "Find Helpline" button links to findahelpline.com

2. **24/7 Help Lines**:
   - Verify crisis lines always show "Open now • 24/7"
   - Check `open_now` override in `HelpLocationCard.tsx`

3. **Contact Actions**:
   - Test Call, Website, Directions buttons
   - Verify analytics events fire:
     - `help_call_clicked`
     - `help_website_clicked`
     - `help_directions_clicked`

### Core Flows (Per Language)
Test complete user journey in each language:

1. **New Signup Flow**:
   - Start at `/welcome/language`
   - Select language → navigate to `/onboarding`
   - Complete all steps → consent modal
   - First check-in → auto-redirect to `/journal?first_entry=true`
   - Verify confetti animation on journal save
   - **Verify events**:
     - `onboarding_completed`
     - `legal_consent_accepted`
     - `checkin_submitted`
     - `journal_saved`

2. **Rooms Safety**:
   - Navigate to any room
   - Send test message
   - Click Rules chip → verify Guidelines open
   - Test Report message → verify incident created
   - Test Mute user → verify messages hidden
   - **Verify events**:
     - `room_report`
     - `room_mute`

3. **Store Purchase**:
   - Navigate to PDP for digital product
   - Click Preview → verify modal/preview works
   - Add to cart → navigate to `/cart`
   - Complete checkout (test mode)
   - Verify entitlement granted
   - Check Library for access
   - **Verify events**:
     - `pdp_view`
     - `add_to_cart`
     - `purchase_succeeded`
     - `entitlement_granted`

4. **Parent Verification Flow**:
   - Create teen account (age 13-17)
   - Attempt to access `/chat-rooms` → blocked by gate
   - Navigate to `/settings` → start verification
   - Enter parent email → verify code sent
   - Complete verification → verify access granted
   - **Verify events**:
     - `guardian_code_sent`
     - `guardian_verified`

5. **Local Help**:
   - Navigate to `/help/nearby`
   - Enter ZIP code (if prompted)
   - Test Call, Website, Directions for any location
   - Verify analytics events fire

### Acceptance Criteria (Phase A)
- [ ] i18n_missing_key count = 0
- [ ] Axe shows no critical violations
- [ ] All core flows pass in EN/ES/FR/AR
- [ ] Crisis hotline logic correct for all locales
- [ ] All links valid, OG tags render correctly
- [ ] Sitemap and robots.txt served

---

## Phase B: Go-Live Settings & Smoke Tests

### Stripe Live Mode
1. **Configure Live Keys**:
   - Set `STRIPE_LIVE_SECRET_KEY` in secrets (already done)
   - Set `STRIPE_LIVE_WEBHOOK_SECRET` in secrets (already done)
   - Set environment variable: `STRIPE_LIVE_MODE=true`

2. **Configure Webhooks**:
   - Log into Stripe Dashboard
   - Navigate to Developers → Webhooks
   - Add endpoint: `https://yourproject.supabase.co/functions/v1/stripe-webhook`
   - Select events:
     - `checkout.session.completed`
     - `charge.refunded`
     - `charge.dispute.created`
   - Copy webhook signing secret
   - Update `STRIPE_LIVE_WEBHOOK_SECRET` with new value

3. **$1 Live Test**:
   - Create test product (price: $1.00)
   - Complete full purchase in live mode
   - Verify:
     - Payment succeeds
     - Order status updates to "paid"
     - Entitlement granted
     - Analytics event: `purchase_succeeded`
     - Audit log entry created
   
   - Process refund:
     - Use Stripe Dashboard to refund payment
     - Verify:
       - Order status updates to "refunded"
       - Entitlement revoked
       - Analytics event: `entitlement_revoked`
       - Audit log entry created

### Feature Flags Configuration
Navigate to `/admin/flags` and enable:

**Production Flags (Enable)**:
- `ff.core=true`
- `ff.i18n_core=true`
- `ff.lang_en=true`
- `ff.lang_es=true`
- `ff.lang_fr=true`
- `ff.lang_ar=true`
- `ff.room_safety=true`
- `ff.local_help=true`
- `ff.store_pdp_v2=true`
- `ff.legal_gate=true`
- `ff.email_templates=true`
- `ff.seo=true`
- `ff.a11y=true`
- `ff.backups=true`

**Kill Switches (Keep OFF, ready to toggle)**:
- `ff.notifications_pause=false` (pause Arthur notifications)
- `ff.store_pause=false` (disable store on issues)
- `ff.rooms_pause=false` (disable rooms on abuse)

### Publish
1. Click **Publish** button in Lovable interface
2. Wait for deployment to complete
3. Capture live URL (e.g., `https://yourdomain.com`)
4. Test SSL certificate is valid

### Immediate Smoke Tests (Production)
Run these tests immediately after publish:

1. **New User Signup**:
   - Navigate to live URL
   - Complete signup → onboarding → check-in → journal
   - Verify no console errors
   - Verify analytics events fire

2. **Live Purchase**:
   - Buy 1 digital item (small amount)
   - Verify payment succeeds
   - Verify entitlement granted
   - Check Library for access

3. **Rooms Safety**:
   - Join a room
   - Test Report and Mute
   - Click Rules chip → verify Guidelines open

4. **Local Help**:
   - Navigate to `/help/nearby`
   - Test Call/Website/Directions buttons

### Acceptance Criteria (Phase B)
- [ ] Live charge/refund succeed
- [ ] Audit entries present for all transactions
- [ ] All smoke steps pass without console errors
- [ ] Analytics events fire correctly in production

---

## Phase C: Day-0/Day-1 Guardrails

### Monitoring Dashboard
Access: `/admin/publish` → "Phase C - Monitoring" tab

**Key Metrics**:
- Error rate (target: <1%)
- Webhook failures (target: 0)
- Purchase success rate (target: >95%)
- Incidents per 1,000 messages (monitor)
- Email open rate (monitor)

**Day-1 Summary**:
- New users today
- Purchases today
- Incidents today
- Most active room

### Daily Owner Digest
Configure email digest to send daily at 9am with:
- New user count
- Purchase count and revenue
- Incident count and severity breakdown
- Top 3 active rooms
- System health status
- Action items (if any)

### Rollback Procedures

**Scenario 1: Webhook Failures >2% for 10 min**
1. Navigate to `/admin/flags`
2. Set `ff.notifications_pause=true` (stops Arthur notifications)
3. Check Supabase edge function logs for `stripe-webhook`
4. If payment processing affected:
   - Set `ff.store_pause=true` (disables store temporarily)
5. Alert on-call team
6. Review webhook logs and fix
7. Test with small transaction
8. Re-enable flags when resolved

**Scenario 2: High Error Rate (>5%)**
1. Check browser console errors (ask users to report)
2. Review Supabase logs for backend errors
3. Identify source (frontend, backend, external)
4. Apply appropriate kill switch:
   - Rooms issues → `ff.rooms_pause=true`
   - Store issues → `ff.store_pause=true`
   - Notifications issues → `ff.notifications_pause=true`
5. Fix and test in staging
6. Deploy fix and re-enable

**Scenario 3: Abuse in Rooms**
1. Review incident reports in `/admin/help`
2. Identify user(s) and room(s)
3. Moderate via admin tools
4. If widespread:
   - Set `ff.rooms_pause=true` temporarily
   - Review and improve safety filters
   - Re-enable with enhanced moderation

### Support System
**Issue Reporting**:
- Footer "Report an Issue" button creates incident ticket
- Captures: Browser, screen size, language, user description
- Creates entry in `incidents` table
- Admin receives notification

**Response Process**:
1. Triage within 4 hours
2. Respond to user within 24 hours
3. Track resolution in incidents table
4. Close ticket when resolved

### Analytics Events Verification
Ensure all events fire with `language` and `age_group` dimensions:

**User Journey**:
- `onboarding_completed`
- `legal_consent_accepted`
- `checkin_submitted`
- `journal_saved`
- `prompt_used`

**Safety**:
- `room_report`
- `room_mute`
- `message_flagged`

**Help**:
- `help_call_clicked`
- `help_website_clicked`
- `help_directions_clicked`

**Store**:
- `pdp_view`
- `add_to_cart`
- `purchase_succeeded`
- `entitlement_granted`
- `entitlement_revoked`

**Guardian**:
- `guardian_code_sent`
- `guardian_verified`

**Data Rights**:
- `data_export_requested`
- `data_export_ready`
- `data_delete_requested`
- `data_delete_completed`

**i18n**:
- `i18n_missing_key`

### Acceptance Criteria (Phase C)
- [ ] Ops dashboard live and showing metrics
- [ ] Digest email received at 9am
- [ ] Kill switches toggle instantly
- [ ] Rollback procedures documented and accessible
- [ ] Issue form creates tickets with all context

---

## Post-Launch Monitoring (Week 1)

### Daily Checks (9am)
1. Review daily digest email
2. Check monitoring dashboard (`/admin/publish`)
3. Review error rate and webhook status
4. Check for new incidents
5. Verify backup ran successfully (`/admin/ops`)

### Weekly Review (Friday)
1. Analyze analytics events by language/age_group
2. Review all incidents and resolutions
3. Check feature flag usage
4. Plan improvements based on data
5. Update documentation as needed

### Metrics to Track
- New user signups by language
- Purchase conversion rate
- Room activity by age group
- Incident rate trend
- Email open rate
- Help resource usage
- Crisis banner clicks

---

## Emergency Contacts

- **Technical Issues**: support@vibecheck.app
- **Security Issues**: security@vibecheck.app
- **Abuse Reports**: abuse@vibecheck.app
- **On-Call**: [Phone number TBD]

---

## Copy Reference

### Crisis Banner
**US (EN/ES)**: "Need urgent help? Call or text 988 (US)."
**Non-US (AR/FR)**: "Find crisis support in your country" + "Find Helpline" button

### Rules Chip
"Be kind • No bullying • No explicit content"

### SEO Description (Home)
"Vibe Check helps families and individuals track moods, journal, and connect safely—with support from Arthur in EN/ES/FR/AR."

### Email Footer
"Vibe Check - Mental Wellness for All Ages"

### Inclusion Statement
"Everyone belongs here. Vibe Check welcomes people of all backgrounds, identities, and experiences including the LGBTQ+ community."

---

**Last Updated**: [DATE]
**Document Owner**: Admin Team
**Next Review**: Post-Launch Week 1
