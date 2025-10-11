# Stripe Live Mode Setup Guide

## Phase 2: Live Mode Configuration

### Prerequisites
✅ Live Stripe keys added to secrets:
- `STRIPE_LIVE_SECRET_KEY`
- `STRIPE_LIVE_WEBHOOK_SECRET`

### Environment Configuration

To enable live mode, set the following environment variable in your production environment:

```bash
STRIPE_LIVE_MODE=true
```

**Important:** Without this variable set, the system will default to test mode even if live keys are configured.

### Webhook Setup

1. **Create Live Mode Webhook in Stripe Dashboard:**
   - Go to https://dashboard.stripe.com/webhooks
   - Click "Add endpoint"
   - URL: `https://YOUR_PROJECT.supabase.co/functions/v1/stripe-webhook`
   - Events to listen for:
     - `checkout.session.completed`
     - `charge.refunded`
     - `charge.dispute.created`

2. **Copy the webhook signing secret** and add it as `STRIPE_LIVE_WEBHOOK_SECRET`

### Webhook Features

**Idempotency:**
- Duplicate events are automatically detected and skipped
- Caches last 1000 processed event IDs in memory

**Refund Handling:**
- Automatically revokes entitlements when `charge.refunded` is received
- Updates order status to "refunded"
- Tracks analytics event `entitlement_revoked` with reason: "refund"

**Chargeback/Dispute Handling:**
- Immediately revokes entitlements on `charge.dispute.created`
- Updates order status to "disputed"
- Tracks analytics event with reason: "dispute"

**Retry Logic:**
- Failed webhook processing returns 500 status
- Stripe automatically retries failed webhooks
- Events are only marked as processed after successful completion

### $1 Live Test Protocol

**Before going live, perform this test:**

1. **Switch to Live Mode:**
   ```bash
   # In production environment
   export STRIPE_LIVE_MODE=true
   ```

2. **Create a $1 Test Product** (in Stripe dashboard):
   - Name: "Live Mode Test"
   - Price: $1.00
   - Save the price ID

3. **Purchase Test:**
   ```bash
   # In your app
   1. Add test product to cart
   2. Complete checkout with real card
   3. Verify:
      - Order status changes to "paid"
      - Analytics event "purchase_succeeded" created
      - Entitlement granted (if digital product)
      - Webhook logs show successful processing
   ```

4. **Refund Test:**
   ```bash
   # In Stripe dashboard
   1. Find the payment
   2. Issue full refund
   3. Verify:
      - Order status changes to "refunded"
      - Entitlement revoked (if digital)
      - Analytics event "entitlement_revoked" with reason "refund"
   ```

5. **Record Test Results:**
   - [ ] Purchase completed successfully
   - [ ] Webhook received checkout.session.completed
   - [ ] Order status updated to "paid"
   - [ ] Entitlement granted
   - [ ] Refund processed
   - [ ] Webhook received charge.refunded
   - [ ] Order status updated to "refunded"
   - [ ] Entitlement revoked
   - [ ] Analytics events recorded

### Monitoring

**Check webhook logs:**
```bash
# All functions log with [WEBHOOK] prefix
# Look for:
# - [WEBHOOK] Using LIVE mode
# - [WEBHOOK] Event received: checkout.session.completed
# - [WEBHOOK] Order completed successfully for user: {user_id}
```

**Verify in database:**
```sql
-- Check orders
SELECT * FROM orders WHERE stripe_session_id = 'cs_test_...';

-- Check entitlements
SELECT * FROM entitlements WHERE order_id = '...';

-- Check analytics
SELECT * FROM analytics_events 
WHERE event_type IN ('purchase_succeeded', 'entitlement_granted', 'entitlement_revoked')
ORDER BY created_at DESC;
```

### Rollback to Test Mode

If issues occur, immediately switch back to test mode:

```bash
# Remove or set to false
unset STRIPE_LIVE_MODE
# or
export STRIPE_LIVE_MODE=false
```

The system will automatically use test keys on the next request.

### Security Notes

1. **Never commit live keys** to version control
2. **Webhook secrets** must match the endpoint mode (live webhook → live secret)
3. **Always verify signatures** - webhook handler rejects unsigned requests
4. **Idempotency** prevents duplicate processing even if webhooks are replayed

### Troubleshooting

**Problem: "Missing STRIPE_LIVE_SECRET_KEY"**
- Solution: Add the secret using the Supabase secrets management

**Problem: Webhooks not being received**
- Check webhook URL in Stripe dashboard
- Verify endpoint is accessible (not localhost)
- Check webhook secret matches

**Problem: "No signature" error**
- Stripe is not sending signature header
- Verify webhook endpoint URL is correct
- Check Stripe dashboard for webhook delivery attempts

**Problem: Refunds not revoking entitlements**
- Check edge function logs for `[WEBHOOK] Processing refund`
- Verify `charge.refunded` event is configured in webhook
- Check that order has correct `stripe_payment_id`
