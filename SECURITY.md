# Security Documentation

## Overview
This document outlines the security measures, configurations, and best practices implemented in the Vibe Check application.

## Authentication & Authorization

### User Roles
- **Role Storage**: Roles are stored in a separate `user_roles` table, never in the profiles table
- **Security Definer Functions**: All role checks use security definer functions to prevent RLS recursion
- **Available Roles**: `admin`, `moderator`, `user`

### Parent-Child Verification
- **Process**: Multi-step email verification with 6-digit codes
- **Rate Limiting**: Maximum 5 attempts per day per guardian-child pair
- **Code Expiration**: Verification codes expire after 15 minutes
- **Timing-Safe Comparison**: Uses constant-time comparison to prevent timing attacks
- **Parent Linking**: Properly links children to verified parent user accounts via `parent_id`

## Subscription Security

### Active Subscription Validation
- **View-Based Access**: Uses `active_subscriptions_v1` view for real-time validation
- **Expiration Enforcement**: All subscription statuses (active, trialing) check expiration timestamps
- **RLS Policies**: Chat rooms and premium features require active, non-expired subscriptions
- **Edge Function Guards**: Shared helper function `requireActiveSubscription()` validates access

### Critical Rules
- Expired subscriptions immediately lose access to premium features
- Subscription checks occur at both database (RLS) and application (edge function) layers
- No subscription bypass mechanisms exist in the codebase

## Data Access Controls

### Row-Level Security (RLS)
All tables have RLS enabled with the following patterns:

#### User Data
- Users can only access their own data via `auth.uid() = user_id` checks
- Parents can access limited child data via `is_parent(child_id)` security definer function
- No direct anonymous access to user tables

#### Help Locations Directory
- **Authentication Required**: Must be signed in to query provider directory
- **Rate Limiting**: 30 requests/minute for authenticated users, 10 for anonymous (via edge function only)
- **Prevented Scraping**: Direct table queries blocked for anonymous users
- **Admin Management**: Full CRUD access only for admin role

#### Chat & Messaging
- Access requires active subscription + matching age_group + selected focus_areas
- Messages scoped to rooms user has access to
- Admins can view all for moderation purposes

## Input Validation

### Edge Functions
All user-facing edge functions use **zod** for schema validation:

```typescript
// Example: guardian-start
const RequestSchema = z.object({
  guardianEmail: z.string()
    .email("Invalid email format")
    .max(255, "Email too long")
    .trim()
    .toLowerCase(),
  childName: z.string()
    .max(100, "Name too long")
    .trim()
    .optional(),
});
```

### Validated Functions
- `guardian-start`: Email and name validation
- `guardian-verify`: Email and 6-digit code validation
- `local-help`: ZIP code format validation
- `admin-ai-chat`: Message content validation (implemented)

### Validation Rules
- Maximum length enforcement on all text inputs
- Email format validation
- Whitespace trimming and normalization
- Type checking beyond regex patterns
- Structured error responses with 400 status codes

## Error Handling

### Production Error Sanitization
- **Generic Client Messages**: Users see friendly error messages
- **Detailed Server Logs**: Full error details logged server-side only
- **No Stack Traces**: Stack traces never sent to clients in production
- **Validation Errors**: Clear, actionable validation error messages

### Example Pattern
```typescript
catch (error: any) {
  console.error("Detailed error:", error); // Server logs only
  
  if (error instanceof z.ZodError) {
    return new Response(JSON.stringify({ 
      error: "Invalid input format" 
    }), { status: 400 });
  }
  
  return new Response(JSON.stringify({ 
    error: "An error occurred. Please try again." // Generic message
  }), { status: 500 });
}
```

## Rate Limiting

### Implementation
- **Guardian Verification**: Max 5 requests per day per guardian-child pair
- **Throttling**: Minimum 60 seconds between resend attempts
- **Help Location Search**: 
  - Authenticated: 30 requests/minute
  - Anonymous: 10 requests/minute (via edge function only)

## Secrets Management

### Environment Variables
All sensitive keys stored as Supabase secrets:
- `RESEND_API_KEY`: Email service
- `STRIPE_SECRET_KEY`: Payment processing (test)
- `STRIPE_LIVE_SECRET_KEY`: Payment processing (production)
- `LOVABLE_API_KEY`: AI services
- `SUPABASE_SERVICE_ROLE_KEY`: Database admin access
- `GEOCODER_API_KEY`: Location services

### Security Rules
- ✅ Never commit secrets to repository
- ✅ Never expose secrets in client-side code
- ✅ Always use environment variables via `Deno.env.get()`
- ✅ Rotate keys regularly

## Password Security

### Leaked Password Protection
**Status**: ✅ ENABLED

Supabase auth is configured to check user passwords against known leaked password databases (HaveIBeenPwned API). Users attempting to use compromised passwords are required to choose a different password.

**How to verify**: 
1. Open your backend dashboard
2. Navigate to Authentication → Settings
3. Confirm "Leaked password protection" toggle is ON

## Database Security

### Security Definer Functions
Used to prevent RLS recursion issues:

```sql
-- Example: Role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
```

### Critical Functions
- `has_role(user_id, role)`: Role verification
- `is_parent(child_id)`: Parent-child relationship verification
- `can_view_profile(viewer_id, profile_id)`: Profile access control

### Views
- `active_subscriptions_v1`: Real-time subscription validation
- `guardian_verification_status_view`: Masked guardian verification status

## API Security

### Edge Function Authentication
- **JWT Verification**: Most functions require valid JWT (`verify_jwt = true`)
- **Service Role**: Only edge functions use service role key
- **CORS Configuration**: Proper CORS headers on all endpoints

### Public Endpoints
The following edge functions are intentionally public (no JWT required):
- `send-arthur-notifications`: Triggered by cron scheduler
- `trivia-*` functions: Triggered by cron scheduler

**Security Note**: Public cron functions should ideally validate an HMAC signature from the scheduler to prevent unauthorized triggering.

## Testing & Verification

### Security Tests
Key test scenarios:
1. ✅ Expired subscription cannot access chat
2. ✅ Parent verification creates proper user link
3. ✅ Anonymous users cannot scrape help_locations
4. ✅ Invalid input returns 400 with sanitized errors
5. ✅ Rate limits enforce correctly

### Manual QA Checklist
- [ ] Test subscription expiration blocks access
- [ ] Test parent verification end-to-end
- [ ] Test help location search rate limiting
- [ ] Test input validation error messages
- [ ] Verify no sensitive data in error responses

## Incident Response

### Rollback Procedure
If security issues are discovered:

1. **Immediate Actions**:
   - Assess scope of impact
   - Check logs for exploitation attempts
   - Notify team

2. **Database Rollback**:
   ```bash
   # Revert last migration
   supabase db reset
   ```

3. **Code Rollback**:
   - Revert to last known good commit
   - Deploy immediately

4. **Post-Incident**:
   - Document what happened
   - Update security measures
   - Conduct security audit

## Compliance & Best Practices

### Data Protection
- ✅ PII restricted to authenticated users only
- ✅ Child data protected by parent verification
- ✅ Email addresses validated and normalized
- ✅ User deletion flows implemented (GDPR)

### Audit Trail
- All critical actions logged to `analytics_events`
- Guardian verification logged to `ai_audit`
- Moderator actions tracked in `moderator_actions`

## Security Contacts

For security concerns or to report vulnerabilities:
- **Security Email**: security@vibecheck.example.com
- **Response Time**: Within 24 hours for critical issues

## Changelog

### 2025-10-11: Security Hardening
- ✅ Fixed subscription expiration bypass
- ✅ Fixed parent verification to link real parent accounts
- ✅ Protected help_locations from scraping
- ✅ Added zod validation to all user-facing edge functions
- ✅ Implemented error sanitization
- ✅ Added rate limiting to help location search
- ✅ Documented leaked password protection

### Previous Changes
- Implemented role-based access control
- Added parent-child verification flow
- Created security definer helper functions

---

**Last Updated**: October 11, 2025  
**Next Review**: January 11, 2026
