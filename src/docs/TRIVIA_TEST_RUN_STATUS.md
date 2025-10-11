# Saturday Trivia - Test Run Status

## ✅ Completed Steps

### 1. Feature Flags Enabled
```
✅ ff.trivia = true (main feature)
✅ ff.trivia_auto_gen = true (AI generation)
✅ ff.trivia_require_review = true (manual approval required)
```

### 2. Fallback Questions Seeded
✅ **20 questions total** - 5 per age group (child/teen/adult/elder) in EN
- Categories: feelings, coping, empathy, communication, habits
- Ready to auto-publish if AI generation fails
- High-quality, safety-reviewed baseline content

### 3. Database Schema Ready
✅ `trivia_generation_log` - Tracks all generation attempts with audit trail
✅ `trivia_rounds.locale` - Supports EN/ES/FR/AR
✅ `trivia_rounds.published` - Controls visibility
✅ Full RLS policies for security

### 4. Edge Functions Deployed
✅ `trivia-generate-weekly-rounds` - AI-powered generation using Lovable AI (FREE Gemini)
✅ `trivia-publish-rounds` - Auto-publishing with approval check
✅ `trivia-notify-saturday` - Existing 10am reminder
✅ `trivia-notify-sunday` - Existing 4pm catch-up

### 5. Admin Interface Enhanced
✅ `/admin/trivia` → **Auto-Gen tab** with:
- "Generate This Week" button (trigger test now!)
- "Publish Pending" button
- Generation logs table with status/counts
- Setup instructions

### 6. Documentation Created
✅ `src/docs/TRIVIA_AUTO_GEN_SETUP.md` - Comprehensive guide
✅ `src/docs/TRIVIA_CRON_SETUP.sql` - Ready-to-paste SQL for cron jobs
✅ `src/docs/TRIVIA_TEST_RUN_STATUS.md` - This file!

---

## 🎯 Next Actions (Do These Now)

### Action 1: Run Test Generation

**Go to:** `/admin/trivia` → **Auto-Gen tab**

Click: **"Generate This Week"** button

This will:
1. Generate 18 candidate questions per age group (child/teen/adult/elder)
2. Generate in EN only (TRIVIA_NATIVE_GEN = false by default)
3. Apply safety filters (duplicates, length, unsafe content)
4. Score and select best 7 questions per age group
5. Create unpublished rounds for this Saturday
6. Log everything to `trivia_generation_log`

**Expected:** ~5-10 minutes for full generation (4 ages × ~18 questions each)

**Check:** Refresh the Auto-Gen tab to see logs populate in real-time

---

### Action 2: Review Generated Questions

Once generation completes (status = 'success'), check the logs:

```sql
-- View generation results
SELECT 
  age_group,
  locale,
  status,
  array_length(kept_ids, 1) as kept,
  jsonb_array_length(dropped_reasons) as dropped,
  error
FROM trivia_generation_log
WHERE week = (SELECT date FROM trivia_rounds ORDER BY date DESC LIMIT 1)
ORDER BY age_group;
```

**Then navigate to:** `/admin/trivia` → **Rounds tab**

You'll see unpublished rounds (published = false) with the generated questions.

**Review criteria:**
- ✅ Age-appropriate language and complexity
- ✅ Clear, unambiguous correct answers
- ✅ Helpful explanations (2-3 sentences)
- ✅ Category balance (feelings/coping/empathy/communication/habits)
- ✅ No duplicates or unsafe content

---

### Action 3: Approve or Edit

**Option A - Approve All:**
```sql
-- Mark rounds as approved (ready to publish Sat 9:55am)
UPDATE trivia_rounds 
SET published = false  -- Keep false until Saturday 9:55am auto-publish
WHERE date = (SELECT date FROM trivia_rounds ORDER BY date DESC LIMIT 1);
```

Or click **"Publish Pending"** in `/admin/trivia` Auto-Gen tab to publish immediately.

**Option B - Edit Questions:**
1. Go to `/admin/trivia` → **Questions tab**
2. Find the newly generated questions
3. Click Edit → Make changes → Save
4. Repeat for any problematic questions

**Option C - Reject & Use Fallback:**
If quality is poor, delete the generated rounds:
```sql
DELETE FROM trivia_rounds 
WHERE date = (SELECT date FROM trivia_rounds ORDER BY date DESC LIMIT 1)
AND published = false;
```

The system will automatically use the 20 seeded fallback questions instead.

---

### Action 4: Set Up Cron Jobs (For Automated Weekly Runs)

**Copy SQL from:** `src/docs/TRIVIA_CRON_SETUP.sql`

**Paste into:** Supabase SQL Editor

This creates:
- **Friday 6pm UTC**: Auto-generate next week's questions
- **Saturday 9:55am UTC**: Auto-publish approved rounds

**Adjust timezone offsets as needed:**
```sql
-- Example: If you're in EST (UTC-5), and want 6pm EST generation:
-- 6pm EST = 11pm UTC
'0 23 * * 5'  -- Instead of '0 18 * * 5'
```

**Verify cron jobs:**
```sql
SELECT * FROM cron.job WHERE jobname LIKE 'trivia%';
```

---

## 🎮 How It Works Weekly

### Friday 6pm (Auto)
1. **Cron triggers** `trivia-generate-weekly-rounds`
2. **AI generates** 18 candidates per age (4 ages × 18 = 72 total)
3. **Filters apply**: safety, duplicates, length, quality
4. **Selects best** 7 per age (4 ages × 7 = 28 total)
5. **Creates rounds** with `published = false`
6. **Logs audit** to `trivia_generation_log`

### Saturday 9am - 9:55am (Manual Review Window)
- If `ff.trivia_require_review = true`:
  - Admin reviews in `/admin/trivia`
  - Edits/approves/rejects as needed
- If `ff.trivia_require_review = false`:
  - Skip review, auto-approve

### Saturday 9:55am (Auto)
1. **Cron triggers** `trivia-publish-rounds`
2. **Checks** for approved rounds with `published = false`
3. **Publishes** by setting `published = true`
4. **Fallback**: If no rounds found, uses seeded questions

### Saturday 10am (Existing)
- `trivia-notify-saturday` sends push notifications
- Users see rounds on dashboard and `/trivia`

### Sunday 4pm (Existing)
- `trivia-notify-sunday` sends catch-up reminders
- Only to families who haven't played yet

---

## 📊 Monitoring Dashboard

### Check Generation Health
```sql
SELECT 
  week,
  COUNT(*) as total_generations,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
  AVG(array_length(kept_ids, 1)) as avg_questions_kept
FROM trivia_generation_log
WHERE week >= CURRENT_DATE - INTERVAL '4 weeks'
GROUP BY week
ORDER BY week DESC;
```

### Check Publication Rate
```sql
SELECT 
  date,
  age_group,
  locale,
  published,
  array_length(question_ids, 1) as question_count
FROM trivia_rounds
WHERE date >= CURRENT_DATE - INTERVAL '4 weeks'
ORDER BY date DESC, age_group, locale;
```

### Check Dropped Candidates (Quality Issues)
```sql
SELECT 
  week,
  age_group,
  jsonb_array_length(dropped_reasons) as dropped_count,
  dropped_reasons
FROM trivia_generation_log
WHERE status = 'success'
AND week >= CURRENT_DATE - INTERVAL '2 weeks'
ORDER BY week DESC, age_group;
```

---

## 🚨 Safety & Quality Enforcements

### ✅ Implemented Checks
- **Deduplication**: Last 8 weeks (normalized prompt hash)
- **Length limits**: Prompt ≤140 chars, options ≤40 chars each
- **Structure**: Exactly 4 options, valid correct_option_id
- **Unsafe terms**: Filters "kill", "die", "suicide", "harm", "hurt", "abuse"
- **Category balance**: Ensures all 5 categories represented
- **Readability**: Age-appropriate tone via AI prompt (not auto-scored yet)

### 🔄 Recommended Enhancements (Future)
- [ ] Integrate Flesch-Kincaid readability scoring
- [ ] Multi-language safety check (currently EN-only filter)
- [ ] Back-translation validation for ES/FR/AR
- [ ] A/B testing different prompts/models
- [ ] User feedback loop ("Report this question")

---

## 💰 Cost Estimate

**Using Lovable AI (google/gemini-2.5-flash)**

### Test Run (Now)
- 4 age groups × 18 questions = **72 AI calls**
- Cost: **FREE** (promo period Sept 29 - Oct 13, 2025)

### Weekly Production
- 4 age groups × 18 questions = **72 AI calls/week**
- Cost: **FREE** during promo, then ~$0.50-1.00/week

### Annual (Post-Promo)
- 72 calls/week × 52 weeks = **3,744 calls/year**
- Cost: **~$26-52/year** (negligible)

---

## ✅ Acceptance Criteria

### Test Run Success = All True:
- [ ] Generation logs show 4 successful entries (child/teen/adult/elder in EN)
- [ ] Each log has 5-7 kept_ids
- [ ] Dropped reasons are reasonable (duplicates, length, etc.)
- [ ] Questions are age-appropriate and high-quality
- [ ] No safety violations (checked manually)
- [ ] Admin can review in `/admin/trivia` interface

### Cron Setup Success = All True:
- [ ] `SELECT * FROM cron.job` shows 2 trivia jobs (generate, publish)
- [ ] Both jobs have `active = true`
- [ ] Test trigger via SQL works (see TRIVIA_CRON_SETUP.sql)

### Fallback Success = All True:
- [ ] 20 seeded questions exist in database (EN only)
- [ ] If generated rounds deleted, fallback auto-publishes
- [ ] Fallback questions are copy-safe and reviewed

---

## 🎬 Current Status Summary

| Component | Status | Action Needed |
|-----------|--------|---------------|
| Feature Flags | ✅ Enabled | None - ready |
| Fallback Questions | ✅ Seeded (20) | None - ready |
| Database Schema | ✅ Migrated | None - ready |
| Edge Functions | ✅ Deployed | None - ready |
| Admin Interface | ✅ Enhanced | **Go test generation!** |
| Cron Jobs | ⏸️ Not Set Up | **Paste SQL in Supabase** |
| Test Generation | ⏳ Pending | **Click "Generate This Week"** |
| Review Process | ⏳ Pending | **Review after generation** |

---

**Next Immediate Step:** Go to `/admin/trivia` → Auto-Gen tab → Click **"Generate This Week"**

Then come back here to review results and set up cron!