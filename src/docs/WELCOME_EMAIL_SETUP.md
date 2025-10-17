# Welcome Email Setup Guide

## Overview
Automatically sends welcome emails to new users upon sign-up using Resend and Supabase Edge Functions.

## Architecture
1. User signs up via Supabase Auth
2. `handle_new_user()` trigger creates profile record
3. Trigger calls `send-welcome-email` Edge Function
4. Email sent via Resend
5. Delivery logged to `email_logs` table

## Prerequisites
- ✅ RESEND_API_KEY secret configured
- ✅ Verified sender domain in Resend
- ✅ `email_logs` table created
- ✅ `profiles` table with email, full_name fields

## Edge Function
Located at: `supabase/functions/send-welcome-email/index.ts`

**Key Features:**
- Sends branded welcome email with links to dashboard and settings
- Logs all attempts (queued, sent, failed) to `email_logs`
- Uses WELCOME_FROM_EMAIL env var (defaults to welcome@daily-vibe-quest.lovable.app)
- Includes user's full name if available

## Database Trigger
The trigger is automatically created in the migration. It:
1. Creates a profile record for new users
2. Calls the welcome email Edge Function
3. Handles errors gracefully without blocking sign-up

## Configuration

### Resend Setup
1. Go to https://resend.com/domains
2. Add and verify your sending domain
3. Create an API key at https://resend.com/api-keys
4. Add it to Supabase secrets as `RESEND_API_KEY`

### Optional: Custom From Email
Set `WELCOME_FROM_EMAIL` secret to customize the sender address.
Format: `welcome@yourdomain.com`

## Testing

### 1. Sign up a new user
```typescript
// In your app
await supabase.auth.signUp({
  email: 'test@example.com',
  password: 'securepassword123',
  options: {
    data: {
      full_name: 'Test User'
    }
  }
})
```

### 2. Check email_logs
```sql
select 
  type,
  status,
  sent_at,
  metadata->>'email' as recipient,
  metadata->>'resend_id' as resend_id,
  error
from email_logs
where type = 'welcome'
order by sent_at desc
limit 10;
```

### 3. Test manually
Call the Edge Function directly:
```bash
curl -X POST \
  https://hssrytzedacchvkrxgnq.supabase.co/functions/v1/send-welcome-email \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-uuid-here",
    "email": "test@example.com",
    "full_name": "Test User"
  }'
```

## Monitoring

### View Recent Welcome Emails
```sql
select 
  sent_at,
  status,
  metadata->>'email' as recipient,
  metadata->>'full_name' as name,
  error
from email_logs
where type = 'welcome'
order by sent_at desc
limit 50;
```

### Success Rate
```sql
select 
  count(*) as total,
  count(*) filter (where status = 'sent') as successful,
  count(*) filter (where status = 'failed') as failed,
  round(100.0 * count(*) filter (where status = 'sent') / count(*), 2) as success_rate
from email_logs
where type = 'welcome'
  and sent_at > now() - interval '30 days';
```

## Troubleshooting

### Email not sent
1. Check `email_logs` for error messages
2. Verify RESEND_API_KEY is set correctly
3. Confirm sender domain is verified in Resend
4. Check Edge Function logs in Supabase dashboard

### Common Errors

**"Invalid API key"**
- Verify RESEND_API_KEY secret is set
- Ensure key hasn't expired

**"Domain not verified"**
- Go to https://resend.com/domains
- Complete DNS verification

**"Recipient rejected"**
- Check email format is valid
- Verify recipient email exists

## Email Template Customization
Edit the HTML in `supabase/functions/send-welcome-email/index.ts` to customize:
- Subject line
- Brand colors and logo
- Welcome message
- Call-to-action links

## Security Notes
- Email logs don't store sensitive data
- API keys are stored as Supabase secrets
- Edge Function uses service role for database access
- CORS is configured for security

## Support
For issues, check:
1. Edge Function logs in Supabase dashboard
2. `email_logs` table for delivery status
3. Resend dashboard for delivery metrics