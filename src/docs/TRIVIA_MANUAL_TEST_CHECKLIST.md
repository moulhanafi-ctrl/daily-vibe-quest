# Saturday Trivia - Manual Testing Checklist

**Pre-Flight Date**: ________________  
**Tester Name**: ________________  
**Environment**: Production  

---

## 🎯 Test 1: Family Mode Live Sync

**Objective**: Verify real-time synchronization across 2+ devices

### Setup
1. Device A (Desktop): Open `/trivia` in Chrome
2. Device B (Mobile): Open `/trivia` in Safari/Chrome
3. Create family room on Device A → Copy 6-digit code

### Test Steps
| Step | Action | Expected Result | ✅ Pass |
|------|--------|----------------|---------|
| 1 | Device A creates room | 6-digit code displayed | ☐ |
| 2 | Device B joins with code | "Joined room" toast appears | ☐ |
| 3 | Both devices start Session 1 | Questions sync within 500ms | ☐ |
| 4 | Device A answers Q1 | Device B sees score update instantly | ☐ |
| 5 | Complete Session 1 | Both see wellness break simultaneously | ☐ |
| 6 | Video plays to completion | "Next Session" unlocks for both | ☐ |
| 7 | Check leaderboard | Both devices show same family scores | ☐ |

**Result**: ☐ PASS  ☐ FAIL  
**Notes**: ________________________________________________

---

## 🎯 Test 2: Wellness Break Experience

**Objective**: Verify YouTube integration, captions, attribution, and unlock logic

### Test Steps
| Step | Action | Expected Result | ✅ Pass |
|------|--------|----------------|---------|
| 1 | Complete Session 1 (10 questions) | Wellness break screen loads | ☐ |
| 2 | YouTube video starts playing | 30-60s clip, no errors | ☐ |
| 3 | Check captions button | CC icon visible, captions ON | ☐ |
| 4 | Verify attribution text | "Title \| Channel \| Watch on YouTube" visible | ☐ |
| 5 | Verify disclaimer | "For educational purposes..." visible | ☐ |
| 6 | Wait for video to complete | Timer shows 0:00 | ☐ |
| 7 | Check unlock | "Continue to Session 2" button enabled | ☐ |
| 8 | Click before video ends | Button disabled / grayed out | ☐ |

**Result**: ☐ PASS  ☐ FAIL  
**Fallback Video ID**: ________________  
**Notes**: ________________________________________________

---

## 🎯 Test 3: UX & Accessibility

**Objective**: Verify animations, feedback, and reduced-motion support

### Test Steps
| Step | Action | Expected Result | ✅ Pass |
|------|--------|----------------|---------|
| 1 | Answer correctly | Green confetti animation | ☐ |
| 2 | Answer incorrectly | Red pulse on incorrect option | ☐ |
| 3 | Enable reduced motion (OS settings) | Animations respect `prefers-reduced-motion` | ☐ |
| 4 | Check keyboard navigation | Tab → Space/Enter work for all buttons | ☐ |
| 5 | Test screen reader (optional) | ARIA labels read correctly | ☐ |
| 6 | Complete Session 3 | "Trivia Complete!" screen with final score | ☐ |
| 7 | Click "Share Results" | Share dialog opens (social/clipboard) | ☐ |

**Result**: ☐ PASS  ☐ FAIL  
**Notes**: ________________________________________________

---

## 🎯 Test 4: Mobile Notifications

**Objective**: Verify push and email delivery, deep links

**Prerequisites**:
- Physical mobile device (iOS/Android)
- App installed via PWA or Capacitor
- Notifications enabled in system settings
- Test user has `push_enabled = true` in DB

### Test Steps
| Step | Action | Expected Result | ✅ Pass |
|------|--------|----------------|---------|
| 1 | Trigger reminder notification (SQL) | Push received: "Trivia kicks off in 10 minutes!" | ☐ |
| 2 | Tap notification | App opens to `/trivia?week=YYYY-MM-DD` | ☐ |
| 3 | Trigger start notification (SQL) | Push received: "Round 1 is LIVE!" | ☐ |
| 4 | Tap notification | App opens to trivia page with session ready | ☐ |
| 5 | Enable quiet hours (10 PM - 8 AM) | Settings saved successfully | ☐ |
| 6 | Trigger notification at 11 PM | Push skipped, email sent instead | ☐ |
| 7 | Check email inbox | Email received with "Start Playing" button | ☐ |
| 8 | Click email link | Opens app/web to correct week | ☐ |

**Device**: ________________  
**OS Version**: ________________  
**Result**: ☐ PASS  ☐ FAIL  
**Notes**: ________________________________________________

---

## 🎯 Test 5: Network & Console (Desktop)

**Objective**: Ensure no errors in browser console or network tab

### Test Steps
| Step | Action | Expected Result | ✅ Pass |
|------|--------|----------------|---------|
| 1 | Open DevTools (F12) → Console | No red errors on page load | ☐ |
| 2 | Navigate to `/trivia` | No 404 or 500 errors | ☐ |
| 3 | Start Session 1 | No errors during question load | ☐ |
| 4 | Complete Session 1 → Wellness break | YouTube iframe loads without errors | ☐ |
| 5 | Check Network tab → Filter XHR | All Supabase calls return 200/201 | ☐ |
| 6 | Check Network tab → Filter Media | YouTube video loads (206 Partial Content OK) | ☐ |
| 7 | Complete all 3 sessions | No memory leaks (DevTools → Performance) | ☐ |

**Browser**: ________________  
**Result**: ☐ PASS  ☐ FAIL  
**Screenshot Errors (if any)**: ________________  
**Notes**: ________________________________________________

---

## 🎯 Test 6: Data Persistence

**Objective**: Verify progress saves across sessions

### Test Steps
| Step | Action | Expected Result | ✅ Pass |
|------|--------|----------------|---------|
| 1 | Start Session 1, answer 5 questions | Progress bar shows 50% | ☐ |
| 2 | Close browser tab | - | ☐ |
| 3 | Reopen `/trivia` | "Continue Session 1" button visible | ☐ |
| 4 | Resume | Questions 6-10 load correctly | ☐ |
| 5 | Complete Session 1 → Break | Wellness video plays | ☐ |
| 6 | Refresh page during video | Video restarts from beginning | ☐ |
| 7 | Complete all 3 sessions | "You've Completed This Week!" card shown | ☐ |
| 8 | Try to replay same week | "Start Playing" button disabled | ☐ |

**Result**: ☐ PASS  ☐ FAIL  
**Notes**: ________________________________________________

---

## 🎯 Test 7: Edge Cases & Failures

**Objective**: Test error handling and fallbacks

### Test Steps
| Step | Action | Expected Result | ✅ Pass |
|------|--------|----------------|---------|
| 1 | Disconnect internet mid-session | "Connection lost" message appears | ☐ |
| 2 | Reconnect internet | Auto-resume from last question | ☐ |
| 3 | Simulate YouTube API failure (block domain) | Fallback video loads automatically | ☐ |
| 4 | Test with invalid week key: `/trivia?week=2099-01-01` | "No trivia available" message | ☐ |
| 5 | Test with expired session (8+ days old) | Redirects to current week or "Coming soon" | ☐ |
| 6 | Spam click "Next Question" rapidly | Rate limiting prevents double-submit | ☐ |
| 7 | Timer reaches 0:00 without answer | Auto-advances to next question | ☐ |

**Result**: ☐ PASS  ☐ FAIL  
**Notes**: ________________________________________________

---

## 🎯 Test 8: Resend Email Verification

**Objective**: Ensure email notifications deliver and render correctly

### Prerequisites
- Resend domain verified: ________________
- Sender email: `trivia@updates.vibecheck.app`
- Test recipient: ________________

### Test Steps
| Step | Action | Expected Result | ✅ Pass |
|------|--------|----------------|---------|
| 1 | Trigger reminder email (SQL) | Email arrives in inbox < 30s | ☐ |
| 2 | Check spam folder | Email NOT in spam | ☐ |
| 3 | Verify sender name | Shows "Vibe Check" (not noreply@...) | ☐ |
| 4 | Verify subject line | "🎯 Trivia kicks off in 10 minutes!" | ☐ |
| 5 | Check email body formatting | HTML renders correctly (no broken styles) | ☐ |
| 6 | Click "Play Now" button | Opens `/trivia?week=YYYY-MM-DD` | ☐ |
| 7 | Click "Manage preferences" link | Opens `/settings` (notification settings) | ☐ |
| 8 | Test start email | Same checks as above, different subject | ☐ |

**Email Client**: ________________  
**Result**: ☐ PASS  ☐ FAIL  
**Screenshot**: ________________  
**Notes**: ________________________________________________

---

## 🎯 Test 9: Performance (Lighthouse)

**Objective**: Verify page load speed and Core Web Vitals

### Test Steps
| Step | Action | Target | Actual | ✅ Pass |
|------|--------|--------|--------|---------|
| 1 | Open DevTools → Lighthouse | - | - | - |
| 2 | Run audit on `/trivia` | - | - | - |
| 3 | Performance score | ≥ 90 | _____ | ☐ |
| 4 | Accessibility score | ≥ 95 | _____ | ☐ |
| 5 | Best Practices score | ≥ 95 | _____ | ☐ |
| 6 | SEO score | ≥ 90 | _____ | ☐ |
| 7 | LCP (Largest Contentful Paint) | < 2.5s | _____ | ☐ |
| 8 | FID (First Input Delay) | < 100ms | _____ | ☐ |
| 9 | CLS (Cumulative Layout Shift) | < 0.1 | _____ | ☐ |

**Result**: ☐ PASS  ☐ FAIL  
**Screenshot**: ________________  
**Notes**: ________________________________________________

---

## 📊 Final Checklist Summary

| Test | Result | Blocker? | Notes |
|------|--------|----------|-------|
| 1. Family Mode Live Sync | ☐ PASS ☐ FAIL | ☐ Yes ☐ No | |
| 2. Wellness Break Experience | ☐ PASS ☐ FAIL | ☐ Yes ☐ No | |
| 3. UX & Accessibility | ☐ PASS ☐ FAIL | ☐ Yes ☐ No | |
| 4. Mobile Notifications | ☐ PASS ☐ FAIL | ☐ Yes ☐ No | |
| 5. Network & Console | ☐ PASS ☐ FAIL | ☐ Yes ☐ No | |
| 6. Data Persistence | ☐ PASS ☐ FAIL | ☐ Yes ☐ No | |
| 7. Edge Cases & Failures | ☐ PASS ☐ FAIL | ☐ Yes ☐ No | |
| 8. Resend Email Verification | ☐ PASS ☐ FAIL | ☐ Yes ☐ No | |
| 9. Performance (Lighthouse) | ☐ PASS ☐ FAIL | ☐ Yes ☐ No | |

---

## ✅ PRODUCTION APPROVAL

**Overall Status**: ☐ **READY FOR GO-LIVE**  ☐ **NEEDS FIXES**

**Blockers** (if any):
1. ________________________________________________
2. ________________________________________________
3. ________________________________________________

**Warnings** (non-blocking):
1. ________________________________________________
2. ________________________________________________

**Recommendations**:
1. ________________________________________________
2. ________________________________________________
3. ________________________________________________

---

**Tested By**: ________________  
**Date**: ________________  
**Approved By**: ________________  
**Go-Live Date**: Saturday, ________________ at 7:00 PM EDT

---

**Post-Launch Monitoring Plan**:
- [ ] Monitor first Saturday run (7:00 PM - 8:00 PM)
- [ ] Check logs after each automated job
- [ ] Review notification delivery rates
- [ ] Verify family mode usage
- [ ] Track fallback video usage rate
- [ ] Set up admin alerts for failures

**Emergency Contacts**:
- Tech Lead: ________________
- Database Admin: ________________
- On-Call Dev: ________________
