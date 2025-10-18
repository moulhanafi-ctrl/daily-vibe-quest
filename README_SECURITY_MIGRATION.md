# 🔒 Security Migration Guide - RPC Refactor Complete

## Overview
All security definer views have been converted to secure RPC functions. This guide helps you adapt any custom code.

---

## Migration Reference

### 1. Active Subscriptions

**Before (Old View):**
```typescript
const { data } = await supabase
  .from('active_subscriptions_v1')
  .select('*')
  .eq('user_id', userId);
```

**After (RPC Function):**
```typescript
import { getActiveSubscriptions } from '@/lib/api/subscriptions';

// Get all active subscriptions
const subscriptions = await getActiveSubscriptions();

// Get subscriptions for specific user
const userSubscriptions = await getActiveSubscriptions(userId);

// Get current user's subscription
const mySubscription = await getCurrentUserSubscription();

// Boolean check
const hasActive = await hasActiveSubscription();
```

---

### 2. Family Members

**Before (Old View):**
```typescript
const { data } = await supabase
  .from('family_members_view')
  .select('*')
  .eq('family_id', familyId);
```

**After (RPC Function):**
```typescript
import { getFamilyMembers, getActiveFamilyMembers } from '@/lib/api/family';

// Get all family members
const members = await getFamilyMembers(familyId);

// Get only active members
const activeMembers = await getActiveFamilyMembers(familyId);

// Get pending invites
const pending = await getPendingFamilyInvites(familyId);

// Get current user's family
const myFamily = await getCurrentUserFamilyMembers();
```

---

### 3. Guardian Verification

**Before (Old View):**
```typescript
const { data } = await supabase
  .from('guardian_verification_status_view')
  .select('*')
  .eq('child_id', childId)
  .single();
```

**After (RPC Function):**
```typescript
import { getGuardianVerificationStatus, hasVerifiedGuardian } from '@/lib/api/guardians';

// Get verification status
const status = await getGuardianVerificationStatus(childId);

// Boolean check for current user
const isVerified = await hasVerifiedGuardian();

// Check pending status
const isPending = await hasVerificationPending(childId);
```

---

## Type Safety Benefits

All RPC wrappers include full TypeScript types from database schema:

```typescript
// Automatic type inference
const subscriptions: ActiveSubscription[] = await getActiveSubscriptions();
// ✅ TypeScript knows: user_id, status, current_period_end

const members: FamilyMember[] = await getFamilyMembers();
// ✅ TypeScript knows: id, family_id, user_id, role, age_group, status, etc.

const verification: GuardianVerificationStatus | null = await getGuardianVerificationStatus(id);
// ✅ TypeScript knows: child_id, status, verified_at, created_at, updated_at
```

---

## Error Handling

All API wrappers include built-in error handling:

```typescript
try {
  const subscriptions = await getActiveSubscriptions();
  // Use subscriptions...
} catch (error) {
  // Error already logged by wrapper
  console.error("Failed to fetch subscriptions:", error);
}
```

---

## CI/CD Protection

`.github/workflows/security-check.yml` automatically fails builds if deprecated view queries are found:

```yaml
# ❌ This will FAIL CI:
const { data } = await supabase.from('active_subscriptions_v1').select('*')

# ✅ This will PASS CI:
import { getActiveSubscriptions } from '@/lib/api/subscriptions'
const data = await getActiveSubscriptions()
```

---

## Testing Checklist

After migrating custom code:

- [ ] Run `npm run build` to check for TypeScript errors
- [ ] Test subscription status displays correctly
- [ ] Test family member list loads
- [ ] Test guardian verification flow
- [ ] Verify no console errors related to RPC calls
- [ ] Confirm CI security checks pass

---

## Rollback (Emergency Only)

If critical issues arise, you can temporarily recreate views:

```sql
-- Recreate active_subscriptions_v1 as regular view (NOT security definer)
CREATE VIEW public.active_subscriptions_v1 AS
SELECT 
  id as user_id,
  subscription_status as status,
  subscription_expires_at as current_period_end
FROM public.profiles
WHERE subscription_status IN ('active', 'trialing')
  AND (subscription_expires_at IS NULL OR subscription_expires_at > now());
```

**Note:** This is NOT recommended. Use RPC functions for production.

---

## Support

Questions or issues with migration?
- Review: `SECURITY_HARDENING_CHANGELOG.md`
- Contact: moulhanafi@gmail.com
- CI Logs: Check GitHub Actions for specific errors

---

*Migration guide version: 1.0*  
*Last updated: 2025-10-18*
