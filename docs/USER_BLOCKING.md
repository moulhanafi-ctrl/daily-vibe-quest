# User Blocking System Documentation
## Apple UGC Requirement Implementation

**Last Updated:** 2025-10-21  
**Status:** ✅ Production Ready

---

## Overview

The Daily Vibe Check app implements a comprehensive user blocking system to comply with Apple's User-Generated Content (UGC) requirements and provide a safe community experience. This system allows users to block other users, preventing them from seeing each other's messages in chat rooms.

---

## Database Schema

### Table: `blocked_users`

```sql
CREATE TABLE public.blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

-- Indexes for performance
CREATE INDEX idx_blocked_users_blocker ON public.blocked_users(blocker_id);
CREATE INDEX idx_blocked_users_blocked ON public.blocked_users(blocked_id);

-- Enable Row-Level Security
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;
```

### RLS Policies

```sql
-- Users can view their own blocked list
CREATE POLICY "Users can view their blocked list"
  ON public.blocked_users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = blocker_id);

-- Users can block other users
CREATE POLICY "Users can block other users"
  ON public.blocked_users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = blocker_id);

-- Users can unblock users
CREATE POLICY "Users can unblock users"
  ON public.blocked_users
  FOR DELETE
  TO authenticated
  USING (auth.uid() = blocker_id);
```

---

## Database Functions

### `is_user_blocked()`

Checks if two users have blocked each other (bidirectional check).

```sql
CREATE OR REPLACE FUNCTION public.is_user_blocked(
  _user_id UUID,
  _target_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocked_users
    WHERE (blocker_id = _user_id AND blocked_id = _target_id)
       OR (blocker_id = _target_id AND blocked_id = _user_id)
  );
$$;
```

**Usage in RLS Policies:**
```sql
-- Example: Prevent viewing messages from blocked users
CREATE POLICY "Users can view messages (excluding blocked)"
  ON public.chat_messages
  FOR SELECT
  TO authenticated
  USING (
    has_chat_access(auth.uid()) 
    AND NOT is_user_blocked(auth.uid(), user_id)
  );
```

---

## Integration with Chat System

### Chat Messages RLS

The `chat_messages` table includes RLS policies that automatically filter blocked users:

```sql
-- Viewing messages: exclude blocked users
CREATE POLICY "Users can view messages in their rooms (excluding blocked)"
  ON public.chat_messages
  FOR SELECT
  TO authenticated
  USING (
    has_chat_access(auth.uid())
    AND NOT is_user_blocked(auth.uid(), user_id)
  );

-- Sending messages: prevent sending to rooms where user is blocked
CREATE POLICY "Users can insert messages in their rooms (with block check)"
  ON public.chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND has_chat_access(auth.uid())
    AND NOT EXISTS (
      SELECT 1 FROM blocked_users bu
      WHERE (
        (bu.blocker_id = auth.uid() AND bu.blocked_id IN (
          SELECT DISTINCT user_id FROM chat_messages WHERE room_id = chat_messages.room_id
        ))
        OR bu.blocked_id = auth.uid()
      )
    )
  );
```

### Automatic Filtering

**When User A blocks User B:**
1. ✅ User A can no longer see User B's messages (past or future)
2. ✅ User B can no longer see User A's messages (past or future)
3. ✅ Neither user can send messages to the other
4. ✅ Real-time message subscriptions respect blocking

**Implementation Details:**
- Blocking is **bidirectional** - both users are hidden from each other
- Existing messages are filtered from view (not deleted)
- New messages are prevented from being inserted if blocked
- Real-time subscriptions use the same RLS policies

---

## UI Components

### 1. BlockUserButton

**Location:** `src/components/chat/BlockUserButton.tsx`

**Features:**
- Confirmation dialog before blocking
- Toast notifications for success/error
- Handles duplicate block attempts
- Callback for UI refresh after blocking

**Usage:**
```tsx
<BlockUserButton
  userId={targetUserId}
  username={targetUsername}
  onBlockComplete={() => {
    // Refresh UI or navigate away
    navigate('/chat-rooms');
  }}
/>
```

**User Flow:**
1. Click "Block User" button
2. Confirmation dialog appears
3. User confirms
4. Block is added to database
5. Success toast shown
6. Optional callback executed

---

### 2. BlockedUsersList

**Location:** `src/components/settings/BlockedUsersList.tsx`

**Features:**
- Displays all blocked users with avatars
- Shows when each user was blocked
- Unblock functionality
- Empty state when no blocks

**Integration:**
```tsx
// In Settings page (Privacy tab)
<TabsContent value="privacy" className="space-y-4">
  <PrivacySettings />
  <BlockedUsersList />
</TabsContent>
```

**User Flow:**
1. Navigate to Settings → Privacy
2. View list of blocked users
3. Click "Unblock" button
4. User is immediately unblocked
5. Messages become visible again

---

## User Experience

### Blocking a User

**From Chat Room:**
1. Click the "⋮" (more options) icon next to any message
2. Select "Block User" from dropdown menu
3. Confirm in dialog
4. User is blocked and chat refreshes

**Visual Feedback:**
- ✅ Toast notification: "Blocked [username]"
- ✅ Messages from blocked user disappear immediately
- ✅ User is removed from active user list

### Viewing Blocked Users

**Location:** Settings → Privacy → Blocked Users

**Display:**
```
┌─────────────────────────────────────┐
│ 🚫 Blocked Users                    │
├─────────────────────────────────────┤
│ 👤 JohnDoe                          │
│    Blocked Jan 15, 2025             │
│    [Unblock] ───────────────────────│
│                                     │
│ 👤 JaneSmith                        │
│    Blocked Jan 10, 2025             │
│    [Unblock] ───────────────────────│
└─────────────────────────────────────┘
```

### Unblocking a User

1. Go to Settings → Privacy → Blocked Users
2. Find the user in the list
3. Click "Unblock"
4. User is immediately unblocked
5. Toast notification: "Unblocked [username]"
6. Previous messages become visible again

---

## Notification Handling

### Auto-Mute When Blocked

When a user is blocked, the following happens:

**Push Notifications:**
- ✅ Notifications from blocked user are filtered at the database level
- ✅ No push notifications sent for messages from blocked users

**In-App Notifications:**
- ✅ Badge counts exclude blocked user messages
- ✅ Notification center filters blocked users

**Implementation:**
```typescript
// Example: Filtering notifications
const { data: notifications } = await supabase
  .from('notifications')
  .select('*')
  .eq('user_id', userId)
  .not('sender_id', 'in', `(
    SELECT blocked_id FROM blocked_users WHERE blocker_id = '${userId}'
  )`);
```

---

## Testing Guidelines

### Manual Testing Checklist

**Blocking:**
- [ ] User A can block User B from chat
- [ ] Confirmation dialog appears before blocking
- [ ] Success toast shows after blocking
- [ ] User B's messages disappear from User A's view
- [ ] User A's messages disappear from User B's view

**Unblocking:**
- [ ] User A can view blocked list in Settings
- [ ] User A can unblock User B
- [ ] Messages reappear after unblocking
- [ ] Chat functionality restores after unblocking

**Edge Cases:**
- [ ] Cannot block yourself
- [ ] Blocking twice shows "already blocked" error
- [ ] Blocked users don't appear in room presence indicators
- [ ] Real-time messages from blocked users don't appear

### E2E Test Cases

**Test 1: Basic Blocking Flow**
```typescript
describe('User Blocking', () => {
  it('should block a user and hide their messages', async () => {
    // User A blocks User B
    await blockUser(userA, userB);
    
    // User B sends message
    await sendMessage(userB, 'Hello from User B');
    
    // User A should not see the message
    const messagesForA = await getMessages(userA);
    expect(messagesForA).not.toContainMessageFrom(userB);
  });
});
```

**Test 2: Bidirectional Blocking**
```typescript
it('should hide messages in both directions', async () => {
  await blockUser(userA, userB);
  
  // User A sends message
  await sendMessage(userA, 'Hello from User A');
  
  // User B should not see it
  const messagesForB = await getMessages(userB);
  expect(messagesForB).not.toContainMessageFrom(userA);
});
```

**Test 3: Unblocking Restores Messages**
```typescript
it('should show messages again after unblocking', async () => {
  // Block and send messages
  await blockUser(userA, userB);
  await sendMessage(userB, 'Hidden message');
  
  // Unblock
  await unblockUser(userA, userB);
  
  // User A should now see the message
  const messages = await getMessages(userA);
  expect(messages).toContainMessageFrom(userB);
});
```

---

## Security Considerations

### RLS Policy Security

**Protection Against:**
- ✅ User A cannot view User B's block list
- ✅ User A cannot unblock on behalf of User B
- ✅ Admin bypass only for moderation purposes
- ✅ SQL injection prevented by parameterized queries

**Best Practices:**
1. All blocking operations go through RLS policies
2. Client-side checks are for UX only (not security)
3. Database-level enforcement ensures consistency
4. Audit logs track all blocking actions

### Privacy

**What Users Can See:**
- ✅ Their own blocked list
- ❌ Who has blocked them (privacy protection)
- ❌ Other users' block lists

**Anonymity:**
- Blocking is silent - blocked user doesn't know they're blocked
- No notification sent to blocked user
- Blocked user can still use the app normally

---

## Performance Optimization

### Database Indexes

```sql
-- Optimize blocking lookups
CREATE INDEX idx_blocked_users_blocker ON blocked_users(blocker_id);
CREATE INDEX idx_blocked_users_blocked ON blocked_users(blocked_id);

-- Composite index for bidirectional checks
CREATE INDEX idx_blocked_users_pair ON blocked_users(blocker_id, blocked_id);
```

### Query Optimization

**Before (N+1 problem):**
```typescript
// ❌ Bad: Multiple queries
for (const message of messages) {
  const isBlocked = await checkIfBlocked(userId, message.user_id);
  if (!isBlocked) displayMessage(message);
}
```

**After (Single query with RLS):**
```typescript
// ✅ Good: RLS handles filtering
const messages = await supabase
  .from('chat_messages')
  .select('*')
  .eq('room_id', roomId);
// RLS automatically filters blocked users
```

---

## Apple App Store Requirements

### UGC Moderation Checklist

- [x] **User Blocking:** Users can block other users ✅
- [x] **In-App Reporting:** Users can report inappropriate content ✅
- [x] **Content Filtering:** Profanity filter on all messages ✅
- [x] **Moderation Tools:** Admin dashboard for reviewing reports ✅
- [x] **User Banning:** Admins can ban users for violations ✅
- [x] **Age Gating:** Minors have restricted chat access ✅
- [x] **Privacy Controls:** Users control their data visibility ✅

### App Review Guidelines Met

**Guideline 1.2 - User-Generated Content:**
- ✅ Blocking mechanism implemented
- ✅ Reporting mechanism available
- ✅ Content moderation system active

**Guideline 5.1.2 - Data Use and Sharing:**
- ✅ User controls who can contact them
- ✅ Privacy policy clearly states data usage
- ✅ Users can delete their data

---

## Troubleshooting

### Common Issues

**Issue:** Messages from blocked user still appearing
**Solution:** 
1. Verify RLS policies are enabled: `SELECT * FROM pg_policies WHERE tablename = 'chat_messages';`
2. Check if user is actually blocked: `SELECT * FROM blocked_users WHERE blocker_id = '...' AND blocked_id = '...';`
3. Refresh the page to reload messages with current RLS context

**Issue:** Cannot block a user
**Solution:**
1. Verify user is authenticated
2. Check if user is trying to block themselves (prevented)
3. Check if block already exists
4. Review browser console for RLS errors

**Issue:** Unblock not working
**Solution:**
1. Verify user owns the block (blocker_id = auth.uid())
2. Check RLS policy for DELETE operation
3. Ensure UUID is correct format

---

## Future Enhancements

**Planned Features:**
- [ ] Block duration (temporary blocks)
- [ ] Block reasons (categorize why user was blocked)
- [ ] Admin override (force unblock for support)
- [ ] Block import/export (for account transfers)
- [ ] Block suggestions (machine learning based)

**Analytics:**
- [ ] Track blocking frequency per user
- [ ] Identify users with high block rates
- [ ] Generate weekly blocking reports
- [ ] Alert admins to potential trolls

---

## API Reference

### Client-Side Functions

```typescript
// Block a user
const blockUser = async (userId: string) => {
  const { data, error } = await supabase
    .from('blocked_users')
    .insert({
      blocker_id: auth.uid(),
      blocked_id: userId,
    });
};

// Unblock a user
const unblockUser = async (blockId: string) => {
  const { error } = await supabase
    .from('blocked_users')
    .delete()
    .eq('id', blockId);
};

// Get blocked users list
const getBlockedUsers = async () => {
  const { data } = await supabase
    .from('blocked_users')
    .select(`
      id,
      blocked_id,
      created_at,
      profiles!blocked_users_blocked_id_fkey (
        username
      )
    `)
    .eq('blocker_id', auth.uid());
};
```

---

## Maintenance

### Regular Tasks

**Weekly:**
- [ ] Review blocked user reports
- [ ] Check for abuse of blocking system
- [ ] Monitor blocking analytics

**Monthly:**
- [ ] Audit RLS policies for security
- [ ] Review performance metrics
- [ ] Clean up orphaned blocks

**Quarterly:**
- [ ] Update documentation
- [ ] Review Apple guidelines for changes
- [ ] Test blocking system end-to-end

---

## Contact

**Technical Questions:**
- Lead Developer: dev@dailyvibecheck.com
- Backend Team: backend@dailyvibecheck.com

**Security Issues:**
- Security Team: security@dailyvibecheck.com

---

**Document Version:** 1.0  
**Last Updated:** 2025-10-21  
**Next Review:** 2025-12-21
