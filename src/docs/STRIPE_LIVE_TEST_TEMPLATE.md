# Stripe Live Mode Test Record

**Date:** _____________
**Tester:** _____________
**Environment:** Production

## Test Results

### 1. Purchase Test ($1)

- [ ] **Product Created:** Test Product, Price: $1.00, Price ID: `________________`
- [ ] **Environment Variable Set:** `STRIPE_LIVE_MODE=true`
- [ ] **Purchase Completed:** Order ID: `________________`
- [ ] **Payment Intent ID:** `________________`
- [ ] **Checkout Session ID:** `________________`

**Database Verification:**
```sql
-- Order Status
SELECT id, status, stripe_payment_id, stripe_session_id, total_amount 
FROM orders 
WHERE id = 'ORDER_ID_HERE';
-- Expected: status = 'paid'

-- Entitlement Created (if digital product)
SELECT * FROM entitlements WHERE order_id = 'ORDER_ID_HERE';
-- Expected: status = 'active'

-- Analytics Events
SELECT event_type, event_metadata 
FROM analytics_events 
WHERE event_metadata->>'orderId' = 'ORDER_ID_HERE';
-- Expected: purchase_succeeded, entitlement_granted
```

**Webhook Logs:**
```
[WEBHOOK] Using LIVE mode
[WEBHOOK] Event received: checkout.session.completed (evt_...)
[WEBHOOK] Processing checkout.session.completed: cs_...
[WEBHOOK] Order completed successfully for user: ...
```

**Result:** ✅ PASS / ❌ FAIL
**Notes:** _________________________________________________________________

---

### 2. Refund Test

- [ ] **Refund Issued:** In Stripe Dashboard
- [ ] **Refund Amount:** $1.00
- [ ] **Refund ID:** `________________`

**Database Verification:**
```sql
-- Order Status Updated
SELECT id, status FROM orders WHERE id = 'ORDER_ID_HERE';
-- Expected: status = 'refunded'

-- Entitlement Revoked
SELECT status FROM entitlements WHERE order_id = 'ORDER_ID_HERE';
-- Expected: status = 'revoked'

-- Analytics Event
SELECT event_type, event_metadata 
FROM analytics_events 
WHERE event_type = 'entitlement_revoked' 
AND event_metadata->>'orderId' = 'ORDER_ID_HERE';
-- Expected: reason = 'refund'
```

**Webhook Logs:**
```
[WEBHOOK] Event received: charge.refunded (evt_...)
[WEBHOOK] Processing refund for charge: ch_...
[WEBHOOK] Revoked entitlements for order: ...
```

**Result:** ✅ PASS / ❌ FAIL
**Notes:** _________________________________________________________________

---

### 3. Idempotency Test

- [ ] **Replayed Webhook:** Same event sent twice
- [ ] **Second Request Response:** `{"received": true, "cached": true}`
- [ ] **No Duplicate Processing:** Verified in logs

**Result:** ✅ PASS / ❌ FAIL

---

### 4. Webhook Security Test

- [ ] **Unsigned Request Rejected:** Status 400 returned
- [ ] **Invalid Signature Rejected:** Status 400 returned
- [ ] **Valid Signature Accepted:** Status 200 returned

**Result:** ✅ PASS / ❌ FAIL

---

## Summary

**Total Tests:** 4
**Passed:** _____ / 4
**Failed:** _____ / 4

**Overall Assessment:** ✅ READY FOR LIVE / ❌ NEEDS FIXES

---

## Issues Found

| Issue | Severity | Status | Notes |
|-------|----------|--------|-------|
|       |          |        |       |

---

## Sign-off

**Tester Signature:** _______________________  
**Date:** _____________

**Approver:** _______________________  
**Date:** _____________

---

## Post-Test Actions

- [ ] Update feature flag `ff.store_live_mode` if applicable
- [ ] Document webhook endpoint URL in runbook
- [ ] Add monitoring alert for webhook failures
- [ ] Schedule next test date: _____________
- [ ] Archive this test record in audit log

---

## Rollback Plan (if issues occur)

1. Set `STRIPE_LIVE_MODE=false` or remove env var
2. Notify team via [communication channel]
3. Check orders table for any affected purchases
4. Process refunds manually if needed
5. Document issue in incident log
6. Retest after fix

**Rollback Contact:** _______________________  
**Emergency Phone:** _______________________
