# Admin User Reporting Setup

## Overview
The Admin Users page provides comprehensive user management, reporting, and export capabilities.

## Access
**URL:** `/admin/users`

**Security:**
- Protected by `AdminGuard` component
- Requires `admin` role in `user_roles` table
- Uses RLS policies for data access

## Features

### 1. User List Table
Displays all users with:
- Join date
- Full name
- Email address
- Birth date
- Timezone
- Marketing opt-in status
- Last login timestamp

### 2. Search & Filters
- **Text Search:** Filter by name or email
- **Birthday This Month:** Show only users with upcoming birthdays
- **Marketing Opt-in:** Filter to users who opted in for notifications

### 3. Export Capabilities

#### CSV Export
Exports visible columns to CSV file:
- Filename: `users-YYYY-MM-DD.csv`
- Includes all filtered/searched results
- Headers: Joined, Name, Email, Birth Date, Timezone, Opt-in, Last Login

#### Copy Emails
Copies all visible user email addresses to clipboard:
- Format: `email1, email2, email3`
- Useful for bulk communications
- Respects current filters

## Usage

### Access the page
1. Log in as admin
2. Navigate to `/admin/users`
3. Or use the admin menu

### Filter users
```typescript
// By birthday this month
☑ Birthday this month

// By opt-in status
☑ Marketing opt-in only

// By search term
Search: "john@example.com"
```

### Export data
1. Apply desired filters
2. Click "Export CSV" to download
3. Or "Copy Emails" for quick access

## Database Requirements

### Required Tables
- `profiles` - User profile data
- `user_roles` - Admin access control

### Required Policies
```sql
-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));
```

## Performance

### Indexes
The following indexes optimize queries:
```sql
-- Birthday queries
CREATE INDEX idx_profiles_birth_date 
ON profiles(birth_date) 
WHERE marketing_opt_in = true;

-- User search
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_full_name ON profiles(full_name);
```

### Query Optimization
- Server-side filtering using Supabase
- Pagination ready (can be added if needed)
- Efficient date/timezone handling

## Reports & Analytics

### Birthday Report
```sql
-- Users with birthdays this month
select 
  count(*) as birthday_users,
  count(*) filter (where marketing_opt_in = true) as will_receive_email
from profiles
where extract(month from birth_date) = extract(month from current_date)
  and birth_date is not null;
```

### Sign-up Trends
```sql
-- New users by day (last 30 days)
select 
  date(created_at) as signup_date,
  count(*) as new_users
from profiles
where created_at > now() - interval '30 days'
group by date(created_at)
order by signup_date desc;
```

### Opt-in Rates
```sql
-- Marketing opt-in statistics
select 
  count(*) as total_users,
  count(*) filter (where marketing_opt_in = true) as opted_in,
  round(100.0 * count(*) filter (where marketing_opt_in = true) / count(*), 2) as opt_in_rate
from profiles;
```

## Customization

### Add new columns
Edit `src/pages/admin/UsersAdmin.tsx`:
```typescript
// Add to query
.select("..., new_column")

// Add to table
<TableHead>New Column</TableHead>
<TableCell>{user.new_column}</TableCell>

// Add to CSV export
const headers = [..., "New Column"];
const rows = users.map(user => [..., user.new_column]);
```

### Add new filters
```typescript
const [customFilter, setCustomFilter] = useState(false);

// In query
if (customFilter) {
  query = query.eq("field", value);
}

// In UI
<label>
  <input type="checkbox" checked={customFilter} onChange={...} />
  Custom Filter
</label>
```

## Security Considerations

1. **Access Control**
   - Only admins can access this page
   - Uses server-side RLS policies
   - No client-side credential checking

2. **Data Privacy**
   - Export respects filters (no accidental bulk export)
   - No passwords or sensitive auth data exposed
   - Logs exports in browser console for audit

3. **Rate Limiting**
   - Consider adding rate limits for exports
   - Monitor for abuse in Supabase logs

## Troubleshooting

### Can't access page
- Verify user has `admin` role in `user_roles` table
- Check `AdminGuard` component is working
- Review RLS policies on profiles table

### Filters not working
- Check console for errors
- Verify query syntax in React Query
- Test queries directly in Supabase SQL editor

### Export issues
- Verify browser allows downloads
- Check for JavaScript errors
- Ensure data exists for export

## Future Enhancements
- [ ] Add pagination for large user lists
- [ ] Weekly email digest of new sign-ups
- [ ] User activity tracking
- [ ] Bulk user actions
- [ ] Advanced analytics dashboard