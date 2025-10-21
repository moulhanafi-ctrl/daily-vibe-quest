# Stripe Live Mode Production Setup

This guide covers switching Stripe from test to live mode and verifying with a real transaction.

## Prerequisites

Before switching to live mode, ensure you have:

1. **Stripe Account Activated**: Your Stripe account must be fully activated for live payments
2. **Live API Keys**: Access to your live API keys from Stripe Dashboard
3. **Business Verification**: Completed Stripe's business verification process
4. **Webhook Endpoint**: Production webhook endpoint configured

## Step 1: Configure Live Mode Secrets

Set the following environment secrets in your Lovable Cloud backend:

### STRIPE_LIVE_MODE
- Value: `true`
- Purpose: Switches all Stripe operations to live mode

### STRIPE_LIVE_SECRET_KEY
- Value: Your live secret key from Stripe (starts with `sk_live_`)
- Location: Stripe Dashboard → Developers → API keys
- Security: Keep this secret and never commit to version control

### STRIPE_LIVE_WEBHOOK_SECRET
- Value: Your live webhook signing secret (starts with `whsec_`)
- Location: Stripe Dashboard → Developers → Webhooks (after creating endpoint)
- Purpose: Validates webhook authenticity

## Step 2: Configure Production Webhook

### Webhook URL Format
```
https://[YOUR_PROJECT_ID].supabase.co/functions/v1/stripe-webhook
```

Replace `[YOUR_PROJECT_ID]` with your actual Supabase project ID.

### Required Webhook Events
Configure these events in Stripe Dashboard → Developers → Webhooks:

- `checkout.session.completed` - Payment completion
- `charge.refunded` - Refund processing
- `customer.subscription.created` - New subscription
- `customer.subscription.updated` - Subscription changes
- `customer.subscription.deleted` - Subscription cancellation

### Setup Process
1. Go to [Stripe Dashboard Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter your webhook URL
4. Select the events listed above
5. Click "Add endpoint"
6. Copy the "Signing secret" (whsec_...) and save as STRIPE_LIVE_WEBHOOK_SECRET

## Step 3: Verify Live Mode Status

Navigate to `/admin/stripe-live-setup` and:

1. Click "Check Status" to verify live mode is active
2. You should see "Live Mode Active" badge in green
3. If not active, verify your STRIPE_LIVE_MODE secret is set to "true"

## Step 4: Test $1 Transaction

### Create Test Purchase

1. Go to `/admin/stripe-live-setup` → "Test Transaction" tab
2. Click "Create Test Checkout"
3. A new tab will open with Stripe Checkout
4. Complete purchase using a real payment method or test card

### Test Cards (Stripe Test Mode Only)
If you're still in test mode, use these cards:
- Success: `4242 4242 4242 4242`
- Requires authentication: `4000 0025 0000 3155`
- Declined: `4000 0000 0000 0002`

Use any future expiry, any 3-digit CVC, any postal code.

### Verify Purchase

1. Check Stripe Dashboard → Payments
2. Verify payment appears with correct amount
3. Check your database `orders` table for new record
4. Verify order status is "paid"

## Step 5: Test Refund Processing

### Issue Refund

1. Go to Stripe Dashboard → Payments
2. Find your test transaction
3. Click "Refund" button
4. Enter full or partial refund amount
5. Click "Refund $X.XX"

### Verify Refund

1. Check Stripe Dashboard shows refund successful
2. Verify webhook `charge.refunded` was received (check logs)
3. Check your database:
   - Order status updated to "refunded"
   - Entitlements revoked (if applicable)
   - Analytics event recorded

### Database Verification Query
```sql
-- Check order status
SELECT id, status, total_amount, stripe_payment_id
FROM orders
WHERE stripe_payment_id = 'pi_...';

-- Check webhook processing
SELECT * FROM analytics_events
WHERE event_type = 'entitlement_revoked'
AND event_metadata->>'reason' = 'refund';
```

## Step 6: Monitor & Rollback Plan

### Monitoring Checklist

- [ ] Webhook delivery rate (should be >99%)
- [ ] Payment success rate
- [ ] Refund processing time
- [ ] Error rates in logs
- [ ] Customer complaints about payments

### Rollback Procedure

If issues occur:

1. **Immediate**: Set `STRIPE_LIVE_MODE=false` (or remove variable)
2. **Verify**: Check mode switched back to test
3. **Investigate**: Review logs for errors
4. **Fix**: Address root cause
5. **Retest**: Complete full test cycle before re-enabling live mode

## Troubleshooting

### "No Stripe customer found"
**Cause**: User hasn't made a previous purchase
**Solution**: Normal for first-time customers, checkout will create customer

### "Webhook signature verification failed"
**Cause**: Incorrect webhook secret
**Solution**: Re-copy webhook secret from Stripe Dashboard

### "Payment requires authentication"
**Cause**: Bank requires 3D Secure
**Solution**: Normal behavior, Stripe handles this automatically

### "Payment declined"
**Cause**: Card issuer declined
**Solution**: Ask customer to use different payment method

### Orders stuck in "pending"
**Cause**: Webhook not being received
**Solution**: 
1. Check webhook URL is correct
2. Verify webhook secret is configured
3. Check Stripe Dashboard webhook delivery logs

## Production Best Practices

1. **Never use test keys in production**: Always verify keys start with `sk_live_`
2. **Monitor webhook health**: Set up alerts for webhook failures
3. **Log everything**: Keep detailed logs of all payment operations
4. **Test refunds regularly**: Ensure refund process works end-to-end
5. **Handle edge cases**: Test payment failures, network issues, etc.
6. **Secure secrets**: Never commit API keys to version control
7. **Rate limiting**: Monitor for unusual transaction patterns
8. **Customer support**: Have process for payment disputes

## Security Checklist

- [ ] Live API keys stored as secrets (not in code)
- [ ] Webhook signature verification enabled
- [ ] HTTPS enforced on webhook endpoint
- [ ] Payment amounts validated server-side
- [ ] User authentication required for purchases
- [ ] Audit trail for all transactions
- [ ] PCI compliance maintained (Stripe handles this)
- [ ] Regular security audits

## Going Live Checklist

- [ ] STRIPE_LIVE_MODE set to "true"
- [ ] STRIPE_LIVE_SECRET_KEY configured
- [ ] STRIPE_LIVE_WEBHOOK_SECRET configured
- [ ] Webhook endpoint created in Stripe Dashboard
- [ ] All required events selected
- [ ] Test purchase completed successfully
- [ ] Test refund processed correctly
- [ ] Database records verified
- [ ] Analytics events firing
- [ ] Monitoring alerts configured
- [ ] Rollback plan documented
- [ ] Team trained on payment support

## Support Resources

- [Stripe Dashboard](https://dashboard.stripe.com)
- [Stripe API Docs](https://stripe.com/docs/api)
- [Webhook Testing](https://dashboard.stripe.com/test/webhooks)
- [Test Cards](https://stripe.com/docs/testing)

## Success Criteria

✅ Live mode verified active
✅ Webhook endpoint configured and receiving events
✅ $1 test transaction completed successfully
✅ Refund processed and database updated
✅ No errors in logs
✅ Monitoring alerts configured
✅ Team ready for customer payments

---

**Last Updated**: 2025-01-21
**Next Review**: Before first customer transaction
