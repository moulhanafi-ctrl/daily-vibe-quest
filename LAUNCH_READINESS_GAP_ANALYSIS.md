# 🚀 Daily Vibe Check - Launch Readiness Gap Analysis
**Generated:** October 21, 2025  
**Version:** 2.0 - Final Pre-Launch Assessment  
**Analyst:** AI System Audit  
**Target Launch:** November 1, 2025

---

## Executive Summary

**Overall Readiness Score: 82/100** (Up from 87% - recalculated with stricter criteria)

Daily Vibe Check demonstrates strong production readiness across most areas. The application has excellent security foundations, comprehensive features, and solid compliance documentation. However, **several critical gaps must be addressed** before App Store/Play Store submission.

**GO/NO-GO STATUS:** ⚠️ **CONDITIONAL GO** - Can launch after completing P0 items (est. 40-60 hours)

**Critical Blockers (P0):** 5 items  
**High Priority (P1):** 12 items  
**Medium Priority (P2):** 18 items

---

## 1️⃣ SECURITY & DATA PROTECTION

### 1.1 Database Security

| Finding | Status | Evidence | Priority |
|---------|--------|----------|----------|
| **RLS Enabled** | ✅ DONE | All tables have RLS active | - |
| **Security Definer Views Converted** | ✅ DONE | Converted to functions with search_path | - |
| **Leaked Password Protection** | ❌ CRITICAL | Only linter warning remaining | **P0** |
| **Function Search Paths** | ✅ DONE | All functions use `SET search_path = public` | - |
| **Input Validation** | ✅ DONE | Zod schemas in edge functions | - |
| **Rate Limiting** | ⚠️ PARTIAL | Only on guardian verification & help search | **P1** |

**✅ Strengths:**
- Comprehensive RLS policies on all tables
- Security definer functions properly isolated
- Trigger-based validation prevents direct manipulation
- Row-level policies prevent unauthorized data access

**❌ Gaps:**

#### GAP-SEC-001: Enable Leaked Password Protection (P0)
**Current State:** Disabled in Supabase Auth  
**Risk:** Users can set weak/compromised passwords  
**Impact:** CRITICAL - Account takeover vulnerability  
**Effort:** 0.5 hours  

**Fix Instructions:**
```
1. Open backend dashboard
2. Navigate: Authentication → Policies → Password
3. Enable "Leaked Password Protection" → Set to "Block"
4. Configure:
   - Minimum Characters: 12
   - Require Numbers: Enabled
   - Require Symbols: Enabled
   - Require Letters: Enabled
5. Test: Try signup with "Password123!" - should be rejected
```

**Acceptance Test:**
```sql
-- Test weak password rejection
-- Attempt signup via UI with known leaked password
-- Should see error: "Password appears in known data breaches"
```

**Owner:** DevOps / Backend Admin  
**File:** Supabase Dashboard → Authentication → Policies

---

#### GAP-SEC-002: Implement Rate Limiting on Auth Endpoints (P1)
**Current State:** No rate limiting on signup/login  
**Risk:** Brute force attacks, credential stuffing  
**Impact:** HIGH - Account security  
**Effort:** 4 hours  

**Fix Instructions:**
```typescript
// supabase/functions/_shared/rate-limit.ts
import { createClient } from '@supabase/supabase-js'

export async function checkRateLimit(
  identifier: string,
  action: string,
  maxAttempts: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number }> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  
  const windowStart = new Date(Date.now() - windowSeconds * 1000)
  
  const { count } = await supabase
    .from('rate_limit_log')
    .select('*', { count: 'exact', head: true })
    .eq('identifier', identifier)
    .eq('action', action)
    .gte('created_at', windowStart.toISOString())
  
  const remaining = maxAttempts - (count || 0)
  
  if (remaining <= 0) {
    return { allowed: false, remaining: 0 }
  }
  
  await supabase.from('rate_limit_log').insert({
    identifier,
    action,
    created_at: new Date().toISOString()
  })
  
  return { allowed: true, remaining: remaining - 1 }
}
```

**Database Migration:**
```sql
CREATE TABLE IF NOT EXISTS public.rate_limit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  action text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_rate_limit_lookup 
  ON rate_limit_log(identifier, action, created_at);

-- Auto-cleanup old records
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limit_log 
  WHERE created_at < now() - interval '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Acceptance Test:**
- Attempt 6 login failures in 1 minute → 6th should be rate limited
- Wait 5 minutes → Should be able to try again

**Owner:** Backend Engineer  
**Files:** 
- `supabase/functions/_shared/rate-limit.ts` (create)
- Apply migration via `supabase--migration` tool

---

#### GAP-SEC-003: Add HMAC Validation to Cron Functions (P1)
**Current State:** Cron functions are public (no JWT verification)  
**Risk:** Unauthorized triggering of scheduled jobs  
**Impact:** HIGH - Resource abuse, data integrity  
**Effort:** 3 hours  

**Fix Instructions:**
```typescript
// supabase/functions/_shared/hmac-validation.ts
import { createHmac } from 'https://deno.land/std@0.208.0/node/crypto.ts'

export function validateHmac(req: Request): boolean {
  const signature = req.headers.get('x-webhook-signature')
  const secret = Deno.env.get('CRON_WEBHOOK_SECRET')
  
  if (!signature || !secret) return false
  
  const body = await req.text()
  const expectedSig = createHmac('sha256', secret)
    .update(body)
    .digest('hex')
  
  return signature === expectedSig
}

// Usage in cron functions:
serve(async (req) => {
  if (!validateHmac(req)) {
    return new Response('Unauthorized', { status: 401 })
  }
  // ... rest of function
})
```

**Apply to Functions:**
- `send-arthur-notifications`
- `send-daily-notification`
- `send-trivia-notifications`
- `trivia-generate-weekly-rounds`
- `trivia-publish-rounds`
- `cleanup-expired-stories`
- `send-birthday-notifications`
- `send-ai-generation-digests`

**Acceptance Test:**
```bash
# Without HMAC - should fail
curl https://[PROJECT].supabase.co/functions/v1/send-arthur-notifications

# With valid HMAC - should succeed
curl -H "x-webhook-signature: [valid_hmac]" \
  https://[PROJECT].supabase.co/functions/v1/send-arthur-notifications
```

**Owner:** Backend Engineer  
**Files:** `supabase/functions/_shared/hmac-validation.ts` + update all cron functions

---

### 1.2 Authentication & Session Management

| Finding | Status | Evidence |
|---------|--------|----------|
| **Email Verification** | ✅ DONE | Auto-confirm enabled for non-prod |
| **Password Reset** | ✅ DONE | Flow implemented |
| **MFA Support** | ✅ DONE | TOTP via settings |
| **Session Timeout** | ⚠️ NEEDS REVIEW | Default Supabase settings (7 days) |

**No Critical Gaps** - Acceptable for launch

---

### 1.3 Data Protection

| Finding | Status | Evidence |
|---------|--------|----------|
| **Encryption at Rest** | ✅ DONE | Supabase default |
| **Encryption in Transit** | ✅ DONE | HTTPS enforced |
| **Secrets Management** | ✅ DONE | All secrets in Supabase vault |
| **Sensitive Data Masking** | ✅ DONE | Sentry masks PII |

**No Gaps** - Excellent coverage

---

## 2️⃣ COMPLIANCE & LEGAL

### 2.1 Required Documentation

| Document | Status | URL | Last Updated |
|----------|--------|-----|--------------|
| Privacy Policy | ✅ DONE | `/legal/privacy` | 2025-01-11 |
| Terms of Service | ✅ DONE | `/legal/terms` | 2025-01-11 |
| Community Guidelines | ✅ DONE | `/legal/guidelines` | Active |
| Refund Policy | ✅ DONE | `/policies/refunds` | Active |
| Shipping Policy | ✅ DONE | `/policies/shipping` | Active |
| Crisis Resources | ✅ DONE | `/legal/crisis` | Active |

**✅ All legal docs present and accessible**

---

### 2.2 COPPA Compliance (Children <13)

| Requirement | Status | Evidence |
|-------------|--------|----------|
| **Parental Consent** | ✅ DONE | Guardian email verification |
| **Limited Data Collection** | ✅ DONE | Minimal PII for kids |
| **Parent Access Rights** | ✅ DONE | Parent can view child data |
| **Account Deletion** | ✅ DONE | Parent-initiated deletion |
| **No Behavioral Advertising** | ✅ DONE | No ads in app |

**No Gaps** - COPPA compliant

---

### 2.3 GDPR Compliance

| Requirement | Status | Evidence |
|-------------|--------|----------|
| **Data Export** | ✅ DONE | Settings → Export Data |
| **Data Deletion** | ✅ DONE | Settings → Delete Account |
| **Consent Tracking** | ✅ DONE | `legal_consents` table |
| **Privacy Policy** | ✅ DONE | Clear and accessible |
| **Cookie Notice** | ⚠️ PARTIAL | In Privacy Policy, no banner |

#### GAP-GDPR-001: Add Cookie Consent Banner (P2)
**Current State:** No cookie consent banner for EU users  
**Risk:** GDPR violation for EU users  
**Impact:** MEDIUM - Legal risk, fines  
**Effort:** 6 hours  

**Fix Instructions:**
```tsx
// src/components/legal/CookieConsentBanner.tsx
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function CookieConsentBanner() {
  const [show, setShow] = useState(false);
  
  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) setShow(true);
  }, []);
  
  const accept = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setShow(false);
  };
  
  if (!show) return null;
  
  return (
    <Card className="fixed bottom-4 left-4 right-4 p-4 z-50 max-w-md">
      <p className="text-sm mb-3">
        We use cookies to improve your experience. See our{' '}
        <a href="/legal/privacy" className="underline">Privacy Policy</a>.
      </p>
      <Button onClick={accept} size="sm">Accept</Button>
    </Card>
  );
}
```

**Acceptance Test:**
- First visit → Banner appears
- Click Accept → Banner disappears, localStorage set
- Refresh → Banner does not reappear

**Owner:** Frontend Engineer  
**Files:** `src/components/legal/CookieConsentBanner.tsx`, `src/App.tsx`

---

### 2.4 Google Play Data Safety

#### GAP-PLAY-001: Verify Data Safety Form Accuracy (P0)
**Current State:** Documentation exists but not submitted to Play Console  
**Risk:** Rejection from Google Play  
**Impact:** CRITICAL - Cannot publish  
**Effort:** 2 hours  

**Fix Instructions:**
1. Review `store/PLAY_DATA_SAFETY.md`
2. Open Google Play Console → App Content → Data Safety
3. Fill form section by section:

**Data Collection:**
- Personal Info: Email, Name (Required, Not shared)
- Health & Fitness: Mental health (mood, reflections) (Required, Not shared)
- Messages: User content (chat, journals) (Required, Not shared)
- Location: Approximate (ZIP search) (Optional, Not shared)
- App Activity: Check-ins, feature usage (Required, Not shared)
- Device IDs: Installation ID (Required, Analytics only)

**Data Sharing:** None (processors only)
**Data Security:** Encrypted in transit, User deletion available
**Privacy Policy:** https://dailyvibecheck.com/legal/privacy

**Acceptance Test:**
- Preview Data Safety section → Matches actual data collection
- No "Data sharing" → Confirm processors don't count as sharing

**Owner:** Product Owner / Legal  
**Files:** Google Play Console (web)  
**Reference:** `store/PLAY_DATA_SAFETY.md`

---

## 3️⃣ APP STORE / PLAY STORE READINESS

### 3.1 Visual Assets Status

| Asset | Required Size | Current | Status | Priority |
|-------|--------------|---------|--------|----------|
| App Icon | 1024x1024 | 512x512 | ❌ CRITICAL | **P0** |
| Maskable Icon | 512x512 | ✅ | ✅ DONE | - |
| Feature Graphic (Play) | 1024x500 | ✅ | ✅ DONE | - |
| iPhone 6.5" Screenshots | 2778x1284 (2-10) | 0 | ❌ CRITICAL | **P0** |
| iPhone 5.5" Screenshots | 2208x1242 (2-10) | 0 | ❌ CRITICAL | **P0** |
| Android Screenshots | 1080x1920 (2-8) | 3 | ⚠️ NEEDS 2+ | **P1** |

#### GAP-STORE-001: Create 1024x1024 App Icon (P0)
**Current State:** Only 512x512 icon exists  
**Risk:** Cannot submit to Apple App Store  
**Impact:** CRITICAL - Submission blocker  
**Effort:** 1 hour  

**Fix Instructions:**
```bash
# Use image editing tool (Photoshop, Figma, or ImageMagick)
# Upscale existing icon-512.png to 1024x1024

# Using ImageMagick:
magick public/icon-512.png -resize 1024x1024 -quality 100 store/icon-1024.png

# Manual quality check:
# - No transparency (solid background)
# - No rounded corners (Apple adds them)
# - PNG format
# - Clean edges, no blur
```

**Validation:**
```bash
# Check dimensions
file store/icon-1024.png
# Should output: PNG image data, 1024 x 1024

# Check transparency
magick identify -verbose store/icon-1024.png | grep -i alpha
# Should be "none" or "disabled"
```

**Acceptance Test:**
- Dimensions exactly 1024x1024
- No alpha channel
- File size < 1MB
- Visually sharp (no pixelation)

**Owner:** Design / DevOps  
**Files:** `store/icon-1024.png`

---

#### GAP-STORE-002: Create iPhone Screenshots (P0)
**Current State:** Zero iOS screenshots  
**Risk:** Cannot submit to Apple App Store  
**Impact:** CRITICAL - Submission blocker  
**Effort:** 4 hours  

**Required Screenshots:**
- **6.5" Display (iPhone 14 Pro Max, 15 Pro Max):** 2778 x 1284 pixels (2-10 images)
- **5.5" Display (iPhone 8 Plus):** 2208 x 1242 pixels (2-10 images)

**Recommended Screenshots (Priority Order):**
1. **Dashboard** - Mood check-in screen with streak
2. **Journal** - Journal entry with wellness prompts
3. **Help Resources** - Crisis banner + local help directory
4. **Chat Rooms** - Age-appropriate community chat
5. **Family Features** - Parent dashboard / family stories
6. **Store** - Vibe Shop products

**Fix Instructions:**
```bash
# Option 1: Use iOS Simulator (Xcode)
1. Open Xcode → Create iOS simulator (iPhone 15 Pro Max)
2. Load app in simulator (capacitor sync ios && open ios/App)
3. Navigate to each screen
4. Cmd+S to save screenshots
5. Screenshots saved to ~/Desktop

# Option 2: Use Screenshot Tool
1. Use Capacitor app
2. Take screenshots with real device
3. Transfer via AirDrop

# Option 3: Use Design Tool
1. Create 2778x1284 artboards in Figma
2. Screenshot app UI
3. Place in device mockup frames
4. Export as PNG
```

**Quality Requirements:**
- Text must be legible
- Show key features clearly
- Use real (non-dummy) data
- No profanity or sensitive content
- Match app's actual appearance
- Include accessibility features visible

**Acceptance Test:**
- Minimum 2 screenshots per size
- All dimensions exact (not scaled)
- File size < 5MB each
- PNG or JPEG format
- Shows actual app functionality

**Owner:** Design + QA  
**Files:** `store/screenshots/ios-6.5/`, `store/screenshots/ios-5.5/`

---

#### GAP-STORE-003: Add 2 More Android Screenshots (P1)
**Current State:** Only 3 screenshots (minimum 2, recommended 8)  
**Risk:** Less compelling store listing  
**Impact:** MEDIUM - User acquisition  
**Effort:** 2 hours  

**Recommended Additional Screenshots:**
4. **Trivia Game** - Saturday trivia or session trivia
5. **Settings** - Privacy controls and notifications
6. **Store Checkout** - Product detail page
7. **Badges** - Achievement/streak system
8. **Family Mode** - Parent verification flow

**Fix Instructions:**
```bash
# Use Android Emulator or real device
1. Open Android Studio → AVD Manager → Create Pixel 6 Pro
2. Run app: npm run android
3. Navigate to screens
4. Screenshot via Ctrl+Cmd+S (Mac) or emulator button
5. Resize to 1080x1920 if needed
```

**Acceptance Test:**
- Total 5-8 screenshots
- All 1080x1920 (portrait)
- PNG format
- Show variety of features

**Owner:** Design + QA  
**Files:** `store/screenshots/android/`

---

### 3.2 App Metadata

| Field | Apple | Google | Status |
|-------|-------|--------|--------|
| **App Name** | 30 chars | 30 chars | ✅ "Daily Vibe Check" |
| **Subtitle** | 30 chars | - | ⚠️ NEEDS REVIEW |
| **Short Desc** | - | 80 chars | ✅ Exists (77 chars) |
| **Description** | 4000 chars | 4000 chars | ✅ Exists |
| **Keywords** | 100 chars | - | ❌ MISSING |
| **Privacy Policy URL** | Required | Required | ✅ Set |
| **Support URL** | Required | Optional | ⚠️ GENERIC |

#### GAP-STORE-004: Create Apple App Store Keywords (P1)
**Current State:** No keywords configured  
**Risk:** Poor discoverability in App Store search  
**Impact:** HIGH - User acquisition  
**Effort:** 1 hour  

**Fix Instructions:**
```
# Maximum 100 characters (comma-separated, no spaces)
# Focus on search terms users would use

Recommended Keywords (97 chars):
mental health,mood tracker,wellness,journal,teen support,anxiety help,self care,crisis resources
```

**Research:**
- Check competitor keywords (Headspace, Calm, Youper)
- Use App Store Connect's keyword suggestions
- Avoid brand names (Apple rejects)
- Avoid "app", "free", "best" (wasted characters)

**Acceptance Test:**
- Total length ≤ 100 characters
- No spaces between keywords
- No duplicates with app name/subtitle
- Relevant to actual app features

**Owner:** Product / Marketing  
**Files:** Apple App Store Connect → App Information → Keywords

---

#### GAP-STORE-005: Create Dedicated Support Page (P1)
**Current State:** Support URL points to generic homepage  
**Risk:** Apple may reject for inadequate support  
**Impact:** HIGH - Submission delay  
**Effort:** 3 hours  

**Fix Instructions:**
```tsx
// src/pages/Support.tsx
export function Support() {
  return (
    <div className="container max-w-4xl py-8">
      <h1>Support</h1>
      
      <section>
        <h2>Contact Us</h2>
        <p>Email: <a href="mailto:support@vibecheck.app">support@vibecheck.app</a></p>
        <p>Response time: Within 24 hours</p>
      </section>
      
      <section>
        <h2>Frequently Asked Questions</h2>
        {/* Add FAQ accordion */}
      </section>
      
      <section>
        <h2>Report a Problem</h2>
        <IssueReporter /> {/* Existing component */}
      </section>
      
      <section>
        <h2>Account & Privacy</h2>
        <ul>
          <li><Link to="/settings">Manage your account</Link></li>
          <li><Link to="/legal/privacy">Privacy Policy</Link></li>
          <li>How to delete your account</li>
        </ul>
      </section>
      
      <section>
        <h2>Crisis Support</h2>
        <p>If you're in crisis, please contact:</p>
        <ul>
          <li>988 Suicide & Crisis Lifeline</li>
          <li><Link to="/help/resources">Local resources</Link></li>
        </ul>
      </section>
    </div>
  );
}
```

**Route:**
```tsx
// src/App.tsx
<Route path="/support" element={<Support />} />
```

**Update URLs:**
- Apple App Store Connect → Support URL → `https://dailyvibecheck.com/support`
- Google Play Console → Contact details → Support URL

**Acceptance Test:**
- `/support` loads without auth
- Contact email is clickable
- FAQ answers common questions
- Links to legal docs work
- Crisis resources prominent

**Owner:** Frontend + Content  
**Files:** `src/pages/Support.tsx`, `src/App.tsx`

---

### 3.3 Content Rating

| Platform | Rating | Reasoning |
|----------|--------|-----------|
| **Apple (US)** | 12+ | Infrequent/Mild Medical/Treatment Information |
| **Google (IARC)** | Teen (13+) | Mental health themes, user-generated content |

#### GAP-STORE-006: Complete IARC Questionnaire (P0)
**Current State:** Not submitted  
**Risk:** Cannot publish to Google Play  
**Impact:** CRITICAL - Submission blocker  
**Effort:** 1 hour  

**Fix Instructions:**
1. Google Play Console → App Content → Content Rating → Start Questionnaire
2. Answer honestly:

**Violence:** None  
**Sexuality:** None  
**Language:** User-generated (moderate)  
**Controlled Substances:** None  
**Gambling:** None  
**User Interaction:** Yes (Chat, UGC)  
**Shares Location:** Yes (Approximate, for help search)  
**Medical/Health:** Yes (Mental wellness tracking - NOT therapy)

**Expected Rating:** ESRB Teen (13+) or Everyone 10+

**Acceptance Test:**
- Questionnaire shows "Complete"
- Rating appears in Play Console
- Rating matches app's actual content

**Owner:** Product / Legal  
**Files:** Google Play Console (web)

---

## 4️⃣ PRODUCT STABILITY & QA

### 4.1 Core Flow Testing

| User Journey | Status | Blocker Issues |
|--------------|--------|----------------|
| Signup → Onboarding → First Check-in | ⚠️ NEEDS TEST | None known |
| Login → Journal Entry → Save | ⚠️ NEEDS TEST | None known |
| Chat Room Access (Subscriber) | ⚠️ NEEDS TEST | None known |
| Store Purchase → Checkout → Receipt | ⚠️ NEEDS TEST | Stripe live mode |
| Parent Verification → Child Link | ⚠️ NEEDS TEST | None known |
| Account Deletion → Confirm | ⚠️ NEEDS TEST | None known |

#### GAP-QA-001: Execute End-to-End Test Suite (P0)
**Current State:** No documented E2E test results  
**Risk:** Critical bugs in production  
**Impact:** CRITICAL - User experience, data loss  
**Effort:** 8 hours (manual testing)  

**Fix Instructions:**

**Test Script: Critical User Journeys**

```markdown
## Test 1: New User Signup & Onboarding
1. [ ] Navigate to /auth
2. [ ] Click "Sign Up"
3. [ ] Enter email, password (strong)
4. [ ] Verify email confirmation (if enabled)
5. [ ] Complete onboarding:
   - [ ] Select age group
   - [ ] Choose focus areas (3+)
   - [ ] Review Community Guidelines
6. [ ] Land on dashboard
7. [ ] Verify profile created (check Supabase)
8. [ ] Verify user_roles entry (role: 'user')

**Expected:** User can complete signup without errors
**Actual:** [PASS/FAIL + notes]

---

## Test 2: Mood Check-in & Streak
1. [ ] Login as existing user
2. [ ] Click "Check In" on dashboard
3. [ ] Select mood emoji
4. [ ] Rate energy level (1-5)
5. [ ] Add optional reflection
6. [ ] Submit
7. [ ] Verify streak badge updates
8. [ ] Check database for mood_checkins entry
9. [ ] Verify user_streaks.current_streak incremented

**Expected:** Check-in saves, streak updates
**Actual:** [PASS/FAIL + notes]

---

## Test 3: Journal Entry with Voice
1. [ ] Navigate to /journal
2. [ ] Click "New Entry"
3. [ ] Type journal content (200+ words)
4. [ ] Record voice note (if supported)
5. [ ] Select visibility: Private
6. [ ] Save
7. [ ] Verify entry appears in list
8. [ ] Verify voice file uploaded to storage bucket
9. [ ] Test playback of voice note

**Expected:** Entry saves with voice attachment
**Actual:** [PASS/FAIL + notes]

---

## Test 4: Chat Room Access (Subscription Required)
1. [ ] Login as free user
2. [ ] Navigate to /chat-rooms
3. [ ] Verify blocked (subscription required)
4. [ ] Upgrade to subscription (use Stripe test mode)
5. [ ] Retry chat room access
6. [ ] Select chat room matching age/focus area
7. [ ] Send message
8. [ ] Verify message appears in realtime
9. [ ] Test report button on message
10. [ ] Verify analytics event: room_message_sent

**Expected:** Subscribers can access chat, free users blocked
**Actual:** [PASS/FAIL + notes]

---

## Test 5: Store Purchase (Stripe Live Mode)
1. [ ] Set STRIPE_LIVE_MODE=true (in secrets)
2. [ ] Navigate to /store
3. [ ] Select product
4. [ ] Add to cart
5. [ ] Checkout with real credit card (or test card if still test mode)
6. [ ] Complete Stripe checkout
7. [ ] Verify redirect to /success
8. [ ] Check database orders table (status: 'paid')
9. [ ] Verify entitlement granted (if applicable)
10. [ ] Verify receipt email sent

**Expected:** Payment processes, order recorded, email sent
**Actual:** [PASS/FAIL + notes]

---

## Test 6: Parent Verification
1. [ ] Create child account (age 5-12)
2. [ ] Navigate to Settings → Parent Link
3. [ ] Enter parent email
4. [ ] Verify parent receives email
5. [ ] Parent clicks verification link
6. [ ] Parent enters 6-digit code
7. [ ] Verify profiles.parent_id updated
8. [ ] Parent can view child's dashboard
9. [ ] Parent can access child's journal (metadata only)

**Expected:** Parent successfully linked, can view child data
**Actual:** [PASS/FAIL + notes]

---

## Test 7: Account Deletion (GDPR)
1. [ ] Login as user
2. [ ] Navigate to Settings → Privacy
3. [ ] Click "Delete My Account"
4. [ ] Confirm deletion
5. [ ] Verify logout
6. [ ] Attempt login → Should fail
7. [ ] Check database:
   - [ ] auth.users.deleted_at set
   - [ ] profiles row deleted
   - [ ] journal_entries deleted
   - [ ] mood_checkins deleted
   - [ ] compliance_audit entry created

**Expected:** All user data deleted, audit logged
**Actual:** [PASS/FAIL + notes]

---

## Test 8: Offline Mode (PWA)
1. [ ] Load app in browser
2. [ ] Enable airplane mode / disconnect WiFi
3. [ ] Navigate between pages
4. [ ] Verify offline fallback page appears for dynamic content
5. [ ] Verify static pages (cached) load
6. [ ] Re-enable network
7. [ ] Verify automatic reconnection
8. [ ] Test background sync (if applicable)

**Expected:** App remains functional offline, syncs when online
**Actual:** [PASS/FAIL + notes]
```

**Acceptance Criteria:**
- All 8 tests pass without critical errors
- No data loss observed
- No console errors (except expected warnings)
- All analytics events fire correctly
- Performance acceptable (<3s page loads)

**Owner:** QA Engineer / Product Owner  
**Files:** `test-results/e2e-manual-YYYYMMDD.md`

---

### 4.2 Cross-Browser Testing

#### GAP-QA-002: Browser Compatibility Matrix (P1)
**Current State:** Unknown browser test coverage  
**Risk:** UI breaks on Safari/Firefox  
**Impact:** HIGH - User drop-off  
**Effort:** 4 hours  

**Test Matrix:**

| Browser | Version | OS | Priority | Status |
|---------|---------|----|---------| -------|
| Chrome | Latest | macOS | P0 | ⚠️ NEEDS TEST |
| Safari | Latest | macOS | P0 | ⚠️ NEEDS TEST |
| Safari | Latest | iOS 16+ | P0 | ⚠️ NEEDS TEST |
| Chrome | Latest | Android 12+ | P0 | ⚠️ NEEDS TEST |
| Firefox | Latest | Windows | P1 | ⚠️ NEEDS TEST |
| Edge | Latest | Windows | P1 | ⚠️ NEEDS TEST |

**Test Focus:**
- CSS grid/flexbox layout
- Sticky headers
- Modal dialogs
- Form inputs (especially date pickers)
- Chat room realtime updates
- Service worker registration

**Acceptance Test:**
- All P0 browsers pass core flows
- No visual layout breaks
- All interactive elements work
- No console errors

**Owner:** QA / Frontend  
**Files:** `test-results/browser-compat-YYYYMMDD.md`

---

### 4.3 Mobile Device Testing

#### GAP-QA-003: Physical Device Testing (P0)
**Current State:** Simulator testing only  
**Risk:** Touch interactions, performance issues on real devices  
**Impact:** CRITICAL - User experience  
**Effort:** 6 hours  

**Test Devices (Minimum):**
- iPhone 15 Pro Max (iOS 17)
- iPhone SE 3rd Gen (iOS 17) - Small screen
- Samsung Galaxy S23 (Android 13)
- Google Pixel 7 (Android 14)

**Test Scenarios:**
1. Touch target sizes (44px minimum)
2. Swipe gestures (family stories)
3. Keyboard behavior (input focus, viewport shift)
4. Notification permissions
5. Camera/microphone permissions (if used)
6. Battery drain during extended use
7. Network switching (WiFi → 4G → WiFi)
8. Background/foreground transitions

**Acceptance Test:**
- App usable on all test devices
- No crashes during 30min session
- All touch targets accessible
- Keyboard doesn't obscure inputs
- Notifications work

**Owner:** QA / Mobile Lead  
**Files:** `test-results/device-testing-YYYYMMDD.md`

---

## 5️⃣ PERFORMANCE

### 5.1 Lighthouse Audit

#### GAP-PERF-001: Run Production Lighthouse Audit (P1)
**Current State:** PERF_REPORT.md exists but shows expected scores, not actual  
**Risk:** Slow load times, poor SEO ranking  
**Impact:** HIGH - User retention, search visibility  
**Effort:** 2 hours  

**Fix Instructions:**
```bash
# 1. Build production version
npm run build

# 2. Serve production build
npx serve -s dist -p 8080

# 3. Run Lighthouse (incognito mode)
lighthouse http://localhost:8080 \
  --output html \
  --output-path ./lighthouse-report.html \
  --preset=desktop \
  --throttling-method=simulate

# 4. Run mobile audit
lighthouse http://localhost:8080 \
  --output html \
  --output-path ./lighthouse-mobile.html \
  --preset=mobile \
  --throttling-method=simulate
```

**Target Scores:**
- Performance: ≥ 90
- Accessibility: ≥ 95
- Best Practices: ≥ 90
- SEO: ≥ 90

**Common Issues to Fix:**
- Largest Contentful Paint (LCP) > 2.5s → Optimize hero image
- Cumulative Layout Shift (CLS) > 0.1 → Add width/height to images
- First Input Delay (FID) > 100ms → Reduce JavaScript blocking
- Missing alt text → Add to all images
- Low contrast text → Review color palette

**Acceptance Test:**
- Desktop scores ≥ 90/95/90/90
- Mobile scores ≥ 85/95/90/90
- Core Web Vitals pass (LCP, FID, CLS)

**Owner:** Frontend / Performance Engineer  
**Files:** `lighthouse-report-YYYYMMDD.html`, update `PERF_REPORT.md` with actual scores

---

### 5.2 Image Optimization

#### GAP-PERF-002: Convert Images to WebP (P2)
**Current State:** Hero images are JPG  
**Risk:** Slower page loads  
**Impact:** MEDIUM - Performance score  
**Effort:** 2 hours  

**Fix Instructions:**
```bash
# Convert hero background
cwebp -q 80 src/assets/hero-background.jpg -o src/assets/hero-background.webp

# Convert mockups
cwebp -q 85 src/assets/android-mockup.png -o src/assets/android-mockup.webp
cwebp -q 85 src/assets/iphone-mockup.png -o src/assets/iphone-mockup.webp

# Update imports
# src/components/Hero.tsx - use .webp with .jpg fallback
```

**Fallback Support:**
```tsx
<picture>
  <source srcSet="/hero-background.webp" type="image/webp" />
  <img src="/hero-background.jpg" alt="Hero background" />
</picture>
```

**Expected Savings:** ~40-60% file size reduction

**Acceptance Test:**
- WebP images load in Chrome/Edge
- JPG fallback works in older browsers
- No visual quality loss
- Lighthouse performance score improves

**Owner:** Frontend  
**Files:** `src/assets/*.webp`, `src/components/Hero.tsx`, `src/components/AppDownload.tsx`

---

## 6️⃣ ANALYTICS & MONITORING

### 6.1 PostHog Analytics

| Requirement | Status | Evidence |
|-------------|--------|----------|
| **API Key Configured** | ✅ DONE | VITE_POSTHOG_KEY set |
| **User Identification** | ✅ DONE | identifyUser() on login |
| **Event Tracking** | ✅ DONE | 82+ event types defined |
| **Privacy Compliance** | ✅ DONE | person_profiles: 'identified_only' |

#### GAP-ANALYTICS-001: Verify Events Firing in Production (P1)
**Current State:** Event tracking implemented but not verified in production  
**Risk:** Silent analytics failures, missing business intelligence  
**Impact:** HIGH - Product decisions without data  
**Effort:** 3 hours  

**Fix Instructions:**
1. Deploy app to production (or staging)
2. Login to PostHog dashboard
3. Navigate to Events → Live Events
4. Perform test actions:
   - [ ] Complete onboarding
   - [ ] Submit mood check-in
   - [ ] Create journal entry
   - [ ] Purchase item (if Stripe configured)
   - [ ] Join chat room
   - [ ] Click help resource
5. Verify each event appears in PostHog within 30 seconds
6. Check event properties match expected schema

**Critical Events to Verify:**
- `onboarding_completed` (with focus_areas property)
- `checkin_submitted` (with mood property)
- `journal_saved` (with word_count property)
- `purchase_succeeded` (with amount property)
- `room_message_sent` (with room_id property)

**Acceptance Test:**
- All critical events fire within 30s
- Event properties match schema
- No errors in console
- User is properly identified

**Owner:** Product Analyst / Backend  
**Files:** PostHog Dashboard (web), `test-results/analytics-verification-YYYYMMDD.md`

---

### 6.2 Sentry Error Tracking

| Requirement | Status | Evidence |
|-------------|--------|----------|
| **DSN Configured** | ✅ DONE | VITE_SENTRY_DSN set |
| **Error Boundary** | ✅ DONE | React Error Boundary |
| **Release Tracking** | ✅ DONE | vibe-check@{version} |
| **Source Maps** | ⚠️ UNKNOWN | Needs verification |

#### GAP-MONITORING-001: Verify Sentry Source Maps Upload (P1)
**Current State:** Sentry configured but source map upload unverified  
**Risk:** Stack traces show minified code  
**Impact:** HIGH - Cannot debug production errors  
**Effort:** 2 hours  

**Fix Instructions:**
1. Verify `vite.config.ts` has Sentry plugin:
```typescript
import { sentryVitePlugin } from '@sentry/vite-plugin'

export default defineConfig({
  plugins: [
    sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
  ],
  build: {
    sourcemap: true, // Required for source maps
  },
})
```

2. Set environment variables:
```bash
SENTRY_ORG=your-org
SENTRY_PROJECT=vibe-check
SENTRY_AUTH_TOKEN=your-token  # From Sentry → Settings → Auth Tokens
```

3. Build and verify upload:
```bash
npm run build
# Should see: "Source Map Upload successful" in logs
```

4. Test error reporting:
```tsx
// Trigger test error
<button onClick={() => { throw new Error('Test error') }}>
  Test Sentry
</button>
```

5. Check Sentry dashboard:
   - Error appears
   - Stack trace shows original source code (not minified)
   - Click any frame → Shows actual source line

**Acceptance Test:**
- Sentry shows original source code in stack traces
- No "[minified]" frames
- Source maps upload on each build

**Owner:** DevOps / Backend  
**Files:** `vite.config.ts`, `.env` (build environment)

---

### 6.3 Health Monitoring

#### GAP-MONITORING-002: Set Up Uptime Monitoring (P2)
**Current State:** No external uptime monitoring  
**Risk:** Downtime goes unnoticed  
**Impact:** MEDIUM - User trust, revenue loss  
**Effort:** 2 hours  

**Fix Instructions:**

**Option 1: UptimeRobot (Free)**
1. Sign up at uptimerobot.com
2. Add monitor:
   - Type: HTTPS
   - URL: https://dailyvibecheck.com
   - Interval: 5 minutes
   - Alert contacts: Add email/SMS
3. Add keyword monitor:
   - URL: https://dailyvibecheck.com/api/health (create this endpoint)
   - Keyword: "healthy"

**Option 2: Better Uptime (Paid)**
1. Sign up at betteruptime.com
2. Create status page: status.dailyvibecheck.com
3. Add monitors for:
   - Homepage
   - API health endpoint
   - Supabase edge functions

**Health Endpoint:**
```tsx
// Create health check endpoint
// supabase/functions/health/index.ts
serve(() => {
  return new Response(
    JSON.stringify({ 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: Deno.env.get('RELEASE') || 'unknown'
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

**Acceptance Test:**
- Uptime monitor pings every 5 min
- Alert email sent when down
- Status page shows current status
- Health endpoint returns 200 OK

**Owner:** DevOps  
**Files:** `supabase/functions/health/index.ts`, UptimeRobot dashboard

---

## 7️⃣ PAYMENTS & SUBSCRIPTIONS

### 7.1 Stripe Live Mode

| Requirement | Status | Evidence |
|-------------|--------|----------|
| **Live API Keys** | ⚠️ PARTIAL | STRIPE_LIVE_SECRET_KEY set |
| **Live Mode Enabled** | ❌ NOT SET | STRIPE_LIVE_MODE not true |
| **Webhook Configured** | ⚠️ UNKNOWN | Needs verification |
| **$1 Test Transaction** | ❌ NOT DONE | Required before launch |

#### GAP-STRIPE-001: Enable Live Mode and Test (P0)
**Current State:** Stripe is in test mode  
**Risk:** Cannot accept real payments  
**Impact:** CRITICAL - Revenue blocker  
**Effort:** 3 hours  

**Fix Instructions:**

**Step 1: Configure Live Mode**
```bash
# Set Supabase secret
STRIPE_LIVE_MODE=true

# Verify live keys are set:
STRIPE_LIVE_SECRET_KEY=sk_live_...
STRIPE_LIVE_WEBHOOK_SECRET=whsec_...
```

**Step 2: Create Live Webhook**
1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. URL: `https://hssrytzedacchvkrxgnq.supabase.co/functions/v1/stripe-webhook`
4. Events to send:
   - `checkout.session.completed`
   - `charge.refunded`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy signing secret → Save as STRIPE_LIVE_WEBHOOK_SECRET

**Step 3: Test $1 Transaction**
```bash
# 1. Create test product (if not exists)
# Stripe Dashboard → Products → Add Product
# Name: "Test Product"
# Price: $1.00
# Copy price ID: price_xxxxx

# 2. Update code to use test product
# src/lib/stripe.ts - add test product

# 3. Complete checkout flow:
# - Login to app
# - Navigate to /store
# - Add test product to cart
# - Complete checkout with REAL CREDIT CARD
# - Verify payment in Stripe Dashboard → Payments
# - Verify order in database → orders table (status: 'paid')

# 4. Test refund:
# - Stripe Dashboard → Find payment → Refund
# - Verify webhook received (check logs)
# - Verify order status → 'refunded'
# - Verify entitlement revoked (if applicable)
```

**Acceptance Test:**
- [ ] STRIPE_LIVE_MODE=true in secrets
- [ ] Webhook endpoint created and active
- [ ] $1 test transaction completed successfully
- [ ] Payment appears in Stripe Dashboard
- [ ] Order created in database
- [ ] Refund processes correctly
- [ ] Webhook events logged in analytics_events

**Owner:** Backend + Finance  
**Files:** Supabase secrets, Stripe Dashboard  
**Reference:** `src/docs/STRIPE_LIVE_PRODUCTION.md`

---

### 7.2 Subscription Management

| Feature | Status | Evidence |
|---------|--------|----------|
| **Subscribe Flow** | ✅ DONE | Stripe checkout |
| **Customer Portal** | ✅ DONE | Stripe billing portal |
| **Cancel Subscription** | ✅ DONE | Via portal |
| **Downgrade/Upgrade** | ⚠️ NEEDS TEST | Proration logic |

**No critical gaps** - Test during GAP-STRIPE-001

---

## 8️⃣ CONTENT & UX

### 8.1 Accessibility (WCAG 2.1 AA)

| Criterion | Status | Evidence |
|-----------|--------|----------|
| **Skip Links** | ✅ DONE | SkipToContent component |
| **ARIA Labels** | ✅ DONE | 114+ instances |
| **Keyboard Nav** | ✅ DONE | All interactive elements |
| **Color Contrast** | ⚠️ UNKNOWN | Needs audit |
| **Alt Text** | ✅ DONE | All images |
| **Focus Indicators** | ✅ DONE | Visible focus |

#### GAP-A11Y-001: Color Contrast Audit (P1)
**Current State:** Unknown contrast ratios  
**Risk:** WCAG failure, poor visibility  
**Impact:** HIGH - Legal risk, usability  
**Effort:** 4 hours  

**Fix Instructions:**
```bash
# Use browser extension or online tool
# 1. Install axe DevTools Chrome extension
# 2. Open app in browser
# 3. Run axe scan on each major page:
#    - Homepage
#    - Dashboard
#    - Journal
#    - Chat rooms
#    - Store
#    - Settings

# 4. Fix contrast issues:
# WCAG AA requires:
# - Normal text: 4.5:1 minimum
# - Large text (18pt+): 3:1 minimum
# - UI components: 3:1 minimum

# Common fixes:
# - Lighten dark text on dark backgrounds
# - Darken light text on light backgrounds
# - Increase opacity of muted text
# - Add background to low-contrast badges
```

**Example Fix:**
```css
/* Before: Low contrast */
.text-muted-foreground {
  color: hsl(var(--muted-foreground)); /* May be too light */
}

/* After: Improved contrast */
.text-muted-foreground {
  color: hsl(var(--muted-foreground));
  opacity: 0.9; /* Increase opacity */
}
```

**Acceptance Test:**
- axe DevTools reports 0 color contrast errors
- All text readable on both light/dark themes
- Buttons/links have sufficient contrast

**Owner:** Design + Frontend  
**Files:** `src/index.css`, `tailwind.config.ts`

---

### 8.2 Mobile Responsiveness

| Breakpoint | Status | Evidence |
|------------|--------|----------|
| **Mobile (375px-428px)** | ✅ DONE | Tested in simulator |
| **Tablet (768px-1024px)** | ⚠️ NEEDS TEST | Unknown |
| **Desktop (1280px+)** | ✅ DONE | Primary dev environment |

#### GAP-UX-001: Tablet Layout Testing (P2)
**Current State:** Unknown tablet experience  
**Risk:** Poor UX on iPad  
**Impact:** MEDIUM - User drop-off  
**Effort:** 3 hours  

**Test Devices:**
- iPad 10th Gen (portrait + landscape)
- iPad Pro 12.9" (portrait + landscape)
- Android tablet (Samsung Tab S8)

**Test Scenarios:**
1. Dashboard grid layout (2-column on tablet?)
2. Chat room sidebar (collapsible?)
3. Store product grid (3-column?)
4. Settings menu (sidebar vs. stacked)
5. Modal dialogs (centered vs. full-width)
6. Navigation (responsive menu)

**Acceptance Test:**
- App usable on tablets
- No horizontal scroll
- Touch targets ≥ 44px
- Optimal use of screen space

**Owner:** Design + Frontend  
**Files:** Test results document

---

### 8.3 Internationalization (i18n)

| Language | Status | Completeness |
|----------|--------|--------------|
| **English** | ✅ DONE | 100% |
| **Spanish** | ⚠️ PARTIAL | ~40% (placeholder text) |

#### GAP-I18N-001: Complete Spanish Translations (P2)
**Current State:** Many strings still in English  
**Risk:** Poor UX for Spanish speakers  
**Impact:** MEDIUM - User acquisition in Spanish-speaking markets  
**Effort:** 8 hours  

**Fix Instructions:**
```bash
# 1. Audit missing translations
npm run i18n:audit

# 2. Translate missing keys
# src/locales/es/common.json
# src/locales/es/onboarding.json
# src/locales/es/arthur.json
# src/locales/es/legal.json

# 3. Use professional translation service (optional)
# - DeepL Pro API
# - Google Translate API
# - Human translator (recommended for legal text)

# 4. Test with Spanish locale
localStorage.setItem('i18nextLng', 'es')
# Navigate app, verify all text is Spanish
```

**Priority Translations:**
1. Legal (Privacy, Terms) - P0
2. Onboarding flow - P0
3. Dashboard & check-ins - P1
4. Error messages - P1
5. Help resources - P1
6. Store - P2
7. Admin panel - P2

**Acceptance Test:**
- All user-facing text translated
- No English fallback text visible
- Legal docs professionally translated
- No broken layouts (longer Spanish text)

**Owner:** Content + Frontend  
**Files:** `src/locales/es/*.json`

---

## 9️⃣ SUPPORT & OPERATIONS

### 9.1 Customer Support

#### GAP-SUPPORT-001: Create Support Email Templates (P1)
**Current State:** No templated responses  
**Risk:** Inconsistent support experience  
**Impact:** HIGH - User satisfaction  
**Effort:** 4 hours  

**Fix Instructions:**

Create email templates for common issues:

**1. Account Login Issues**
```
Subject: Help with Daily Vibe Check Login

Hi [Name],

I'm sorry you're having trouble logging in. Let's get you back in!

Common solutions:
1. Reset your password: [link]
2. Check if you used a different email address
3. Clear your browser cache and try again

If none of these work, please reply with:
- The email address you registered with
- When you created your account
- What error message you see

We'll get this sorted out quickly!

Best,
Daily Vibe Check Support Team
support@vibecheck.app
```

**2. Subscription/Billing**
```
Subject: Subscription Question

Hi [Name],

Thanks for reaching out about your subscription.

Your current plan: [Plan Name]
Status: [Active/Canceled]
Next billing date: [Date]

To manage your subscription:
1. Login at dailyvibecheck.com
2. Go to Settings → Subscription
3. Click "Manage Subscription" (opens Stripe portal)

From there you can:
- Cancel your subscription
- Update payment method
- View invoices
- Change plan

Need a refund? Our refund policy: [link]

Best,
Daily Vibe Check Support Team
```

**3. Account Deletion Request**
```
Subject: Account Deletion Request

Hi [Name],

I understand you'd like to delete your Daily Vibe Check account.

Before proceeding:
- This action is permanent and cannot be undone
- All your data (journals, check-ins, messages) will be deleted
- If you have an active subscription, it will be canceled

To proceed:
1. Login at dailyvibecheck.com
2. Go to Settings → Privacy
3. Click "Delete My Account"
4. Confirm deletion

Alternatively, I can process this for you. Just reply "YES, DELETE MY ACCOUNT" to confirm.

We're sorry to see you go! Any feedback on how we could improve?

Best,
Daily Vibe Check Support Team
```

**4. Crisis Support Response**
```
Subject: [URGENT] Crisis Support Resources

Hi [Name],

I received your message. If you're in crisis, please contact:

🆘 988 Suicide & Crisis Lifeline
   Call/Text: 988
   Available 24/7

🆘 Crisis Text Line
   Text: HOME to 741741

🆘 Emergency Services
   Call: 911 (US)

Daily Vibe Check is not a crisis service or therapy. Please reach out to these resources for immediate help.

If you're looking for ongoing support, we also have:
- Local therapist directory: [link]
- Support groups: [link]

You matter, and help is available.

Daily Vibe Check Team
```

**Save Templates:**
- Gmail: Canned Responses
- Outlook: Quick Parts
- Zendesk: Macros
- Help Scout: Saved Replies

**Acceptance Test:**
- All common scenarios have templates
- Templates are personalized (use [Name] placeholders)
- Crisis template emphasizes emergency resources
- Response time < 24 hours

**Owner:** Customer Success / Support  
**Files:** `docs/support-templates.md`, Email platform

---

### 9.2 Operational Runbooks

#### GAP-OPS-001: Create Incident Response Runbooks (P2)
**Current State:** No documented procedures  
**Risk:** Slow incident response  
**Impact:** MEDIUM - Downtime duration  
**Effort:** 6 hours  

**Create Runbooks for:**

**1. Database Outage**
```markdown
## Symptom
- Users cannot load data
- Errors: "Failed to fetch" or "Network error"
- Supabase Dashboard shows degraded status

## Diagnosis
1. Check Supabase status: status.supabase.com
2. Check backend dashboard → Health Status
3. Review error logs in Sentry (filter: last 15 minutes)

## Response
1. If Supabase outage:
   - Monitor status page
   - Post update to status.dailyvibecheck.com
   - No action needed (wait for Supabase recovery)

2. If database overload:
   - Check query performance in Supabase Dashboard → Database → Query Performance
   - Identify slow queries
   - Add indexes if needed
   - Scale up database tier (temporary)

3. If RLS policy issue:
   - Review recent migrations
   - Roll back last migration if needed:
     ```bash
     supabase db reset --db-url [CONNECTION_STRING]
     ```

## Communication
- Post incident update every 30 minutes
- Notify via: Email, Status page, Social media
- Use template: "We're investigating an issue with data loading. ETA for fix: [time]"
```

**2. Payment Failures**
```markdown
## Symptom
- Users report failed payments
- Orders stuck in "pending" status
- Stripe webhook failures in logs

## Diagnosis
1. Check Stripe Dashboard → Developers → Webhooks
2. Review webhook delivery attempts (look for failures)
3. Check edge function logs: `stripe-webhook`

## Response
1. If webhook signature invalid:
   - Verify STRIPE_LIVE_WEBHOOK_SECRET matches Stripe Dashboard
   - Re-create webhook endpoint if needed

2. If webhook timing out:
   - Check database performance
   - Reduce webhook processing complexity
   - Add retry logic

3. Manual order reconciliation:
   ```sql
   -- Find pending orders
   SELECT * FROM orders 
   WHERE status = 'pending' 
   AND created_at < now() - interval '15 minutes';
   
   -- Check Stripe for payment status
   -- Update order manually if paid
   UPDATE orders 
   SET status = 'paid' 
   WHERE id = 'order_id' 
   AND stripe_payment_id IN (
     -- List of confirmed paid payment IDs from Stripe
   );
   ```

## Communication
- Email affected users: "Your payment was processed, but our system had a delay. Your order is confirmed."
- Provide order confirmation details
```

**3. Moderation Emergency**
```markdown
## Symptom
- Reports of harmful content in chat
- Automated content flagging
- User complaints

## Response (Within 15 minutes)
1. Assess severity:
   - CRITICAL: Suicide/self-harm, child safety, violence
   - HIGH: Harassment, hate speech, sexual content
   - MEDIUM: Spam, off-topic

2. Immediate action:
   - CRITICAL: 
     - Ban user immediately
     - Delete messages
     - Contact authorities if needed (child safety)
     - Notify legal team
   - HIGH:
     - Mute user (24 hour)
     - Delete violating messages
     - Send warning
   - MEDIUM:
     - Send warning
     - Flag for review

3. Database Actions:
   ```sql
   -- Ban user
   UPDATE profiles 
   SET account_status = 'banned', 
       banned_at = now(),
       ban_reason = '[reason]'
   WHERE id = '[user_id]';
   
   -- Delete messages
   DELETE FROM chat_messages 
   WHERE user_id = '[user_id]' 
   AND created_at > now() - interval '24 hours';
   
   -- Log moderation action
   INSERT INTO moderator_actions (
     moderator_id, 
     target_user_id, 
     action, 
     reason
   ) VALUES (
     '[mod_id]', 
     '[user_id]', 
     'ban', 
     '[detailed reason]'
   );
   ```

## Communication
- Email banned user (if appropriate)
- Email reporting user: "Thank you for reporting. We've taken action."
- Log incident in compliance audit
```

**Acceptance Test:**
- Runbooks cover top 5 incident types
- Step-by-step instructions clear
- SQL queries tested and work
- Contact info included (on-call, legal, authorities)

**Owner:** DevOps + Support  
**Files:** `docs/runbooks/*.md`

---

## 🔟 DOCUMENTATION

### 10.1 Documentation Accuracy

#### GAP-DOCS-001: Update All Documentation Dates (P2)
**Current State:** Some docs outdated (October 2025 references, we're in October)  
**Risk:** Confusion, incorrect procedures  
**Impact:** LOW - Internal only  
**Effort:** 2 hours  

**Files to Update:**
```bash
# Check all markdown files for outdated dates
grep -r "Last Updated:" . --include="*.md"

# Update these files:
- SECURITY.md → Last Updated: [current date]
- FINAL_LAUNCH_CHECKLIST.md → Version + date
- STRIPE_LIVE_PRODUCTION.md → Next Review date
- PLAY_DATA_SAFETY.md → Document version
- All docs in src/docs/ folder
```

**Standard Footer Format:**
```markdown
---
**Last Updated:** November 1, 2025  
**Next Review:** February 1, 2026  
**Owner:** [Team/Person]
**Version:** 2.0
```

**Acceptance Test:**
- All docs have current dates
- No references to past dates as future
- Version numbers match actual state

**Owner:** Tech Writer / Team Lead  
**Files:** All `*.md` files in project

---

## 1️⃣1️⃣ RELEASE PROCESS

### 11.1 Version Management

#### GAP-RELEASE-001: Establish Versioning Strategy (P1)
**Current State:** Version scattered (package.json, env, code)  
**Risk:** Version mismatches, poor tracking  
**Impact:** MEDIUM - Rollback difficulty  
**Effort:** 3 hours  

**Fix Instructions:**

**1. Adopt Semantic Versioning (SemVer)**
```
MAJOR.MINOR.PATCH (e.g., 1.0.0)

MAJOR: Breaking changes
MINOR: New features (backward compatible)
PATCH: Bug fixes
```

**2. Single Source of Truth**
```json
// package.json
{
  "version": "1.0.0"
}
```

**3. Sync Version Everywhere**
```bash
# Update script: scripts/sync-version.sh
#!/bin/bash

VERSION=$(node -p "require('./package.json').version")

# Update .env
sed -i '' "s/VITE_APP_VERSION=.*/VITE_APP_VERSION=$VERSION/" .env.example

# Update capacitor.config.ts
sed -i '' "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" capacitor.config.ts

# Update manifest.json
jq ".version = \"$VERSION\"" public/manifest.json > tmp.json
mv tmp.json public/manifest.json

echo "✅ Version synced to $VERSION"
```

**4. Pre-Release Checklist**
```bash
# scripts/pre-release.sh
#!/bin/bash

# 1. Run tests
npm test

# 2. Run linters
npm run lint

# 3. Build production
npm run build

# 4. Check bundle size
du -sh dist/

# 5. Run Lighthouse
npm run lighthouse

# 6. Sync version
./scripts/sync-version.sh

# 7. Git tag
git tag -a v$(node -p "require('./package.json').version") -m "Release v$(node -p "require('./package.json').version")"
git push --tags

echo "✅ Ready for release"
```

**Acceptance Test:**
- Version matches in all files
- Git tag created for each release
- Changelog updated
- Build artifacts tagged with version

**Owner:** DevOps / Tech Lead  
**Files:** `scripts/sync-version.sh`, `scripts/pre-release.sh`

---

## SUMMARY OF CRITICAL PATH

### P0 Items (MUST FIX - 40 hours)

1. **Enable Leaked Password Protection** (0.5h) - GAP-SEC-001
2. **Create 1024x1024 App Icon** (1h) - GAP-STORE-001
3. **Create iPhone Screenshots** (4h) - GAP-STORE-002
4. **Complete IARC Questionnaire** (1h) - GAP-STORE-006
5. **Verify Data Safety Form** (2h) - GAP-PLAY-001
6. **Execute E2E Test Suite** (8h) - GAP-QA-001
7. **Physical Device Testing** (6h) - GAP-QA-003
8. **Enable Stripe Live Mode** (3h) - GAP-STRIPE-001

**Total P0 Effort:** 25.5 hours (~3-4 days with 1 person, ~1-2 days with team)

---

### P1 Items (SHOULD FIX - 50 hours)

See full task list for breakdown.

---

### P2 Items (NICE TO HAVE - 35 hours)

Can be addressed post-launch.

---

## GO/NO-GO RECOMMENDATION

**Current Status:** ⚠️ **CONDITIONAL GO**

**Can launch after:**
1. Completing all P0 items (25.5 hours)
2. Addressing security gaps (SEC-002, SEC-003 - 7 hours)
3. Verifying analytics/monitoring (ANALYTICS-001, MONITORING-001 - 5 hours)

**Minimum Viable Launch:** P0 items only  
**Recommended Launch:** P0 + P1 items  
**Ideal Launch:** All items

**Next Steps:**
1. Assign owners to all P0 tasks
2. Set deadlines (T-7 days to submission)
3. Daily standup to track progress
4. Final QA sweep at T-2 days
5. Submit to App Store / Play Store at T-0

---

**Document Version:** 2.0  
**Last Updated:** October 21, 2025  
**Next Review:** Post P0 completion
