# Admin Store Merchandise Management

## Overview
Complete admin dashboard and store merchandise management system with proper authentication, RLS policies, and audit logging.

## Routes

### Main Admin Dashboard
- **Route**: `/admin`
- **Access**: Admin users only (role='admin' in user_roles table)
- **Features**:
  - KPI card showing push subscriber count and weekly change
  - KPI card showing active store products count
  - Quick links to analytics, AI tools, health monitoring, and feature flags
  - Quick action buttons for common admin tasks

### Subscriber Analytics
- **Route**: `/admin/analytics/subscribers`
- **Features**:
  - Total subscribers, push subscribers, daily opt-ins, birthday opt-ins
  - 60-day trends chart showing growth patterns
  - 7-day deliverability widget (sent, delivered, failed)
  - Privacy controls with "Reveal Emails" modal that requires confirmation and logs access

### Store Merchandise Management
- **Route**: `/admin/store`
- **Features**:
  - List all products with search functionality
  - Pagination (20 items per page)
  - Add new products with modal form
  - Edit existing products
  - Delete products (with confirmation)
  - Product fields: name, description, price, stock, image URL, active status
  - Quick link to view public store

## Database Tables

### store_products
```sql
CREATE TABLE public.store_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  image_url TEXT,
  stock INTEGER DEFAULT 0 CHECK (stock >= 0),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**RLS Policies**:
- Admins can manage all products (SELECT, INSERT, UPDATE, DELETE)
- Public can view only active products (SELECT WHERE is_active = true)

### admin_audit_logs
- Logs all admin actions including: view_admin, add_product, edit_product, remove_product
- Includes admin_id, event type, timestamp, and metadata

## Security

### Server-Side Authentication
All admin routes use `AdminGuard` component which:
1. Checks if user is authenticated via Supabase auth
2. Verifies user has 'admin' role in user_roles table
3. Blocks access and shows 403 error if not authorized
4. Uses `useAdminCheck` hook for real-time admin status

### RLS Policies
All database operations are protected by Row Level Security:
- Only users with `has_role(auth.uid(), 'admin')` can manage store products
- Public can only view active products
- Audit logs require admin role for read/write

### Audit Trail
Every admin action is logged with:
- Admin user ID
- Event type (view, add, edit, delete)
- Timestamp
- Event metadata (product ID, product name, etc.)

## Analytics Events Tracked

### Homepage Funnel
- `homepage_mood_click`: When user selects a mood emoji
- `homepage_trial_cta_click`: When user clicks "Start 7-Day Free Trial"

### Admin Dashboard
- `admin_dashboard_view`: When admin views dashboard
- `admin_subscribers_card_click`: When admin clicks to view subscriber details
- `admin_store_view`: When admin views store management page

### Store Management
- `admin_add_product`: When admin creates new product
- `admin_edit_product`: When admin updates product
- `admin_remove_product`: When admin deletes product

## UI Components

### Admin Dashboard Cards
1. **Subscribers Card**
   - Shows total push subscribers
   - Weekly change indicator (green ↑, orange ↓, gray -)
   - "View details" button → /admin/analytics/subscribers

2. **Store Merchandise Card**
   - Shows active product count
   - Shows total products
   - "Manage Store" button → /admin/store

3. **Quick Links**
   - Analytics, AI Tools, System Health, Feature Flags, Legal & Compliance

4. **Quick Actions**
   - Manage Products, Manage Trivia, Help Locations, Stripe Settings

### Store Admin Page
- **Header**: Title, subtitle, "View Public Store" and "Add Product" buttons
- **Search Bar**: Filter products by name
- **Product List**: Cards with image, name, description, price, stock, active badge
- **Actions**: Edit (pencil icon), Delete (trash icon)
- **Pagination**: Previous/Next buttons for 20 items per page
- **Add/Edit Modal**: Form with all product fields and validation

## Admin Navigation

The admin dashboard is accessible:
1. Via admin-only button in hero section (top-right corner)
2. Directly via `/admin` route
3. From quick action buttons in dashboard

## Testing Checklist

### Access Control
- [ ] Non-admin users cannot access /admin routes (403 error)
- [ ] Non-admin users don't see admin button in navigation
- [ ] Admin users can access all admin routes
- [ ] RLS blocks non-admin database operations

### Store Management
- [ ] Can add new product with all fields
- [ ] Can edit existing product
- [ ] Can delete product with confirmation
- [ ] Can search products by name
- [ ] Pagination works correctly
- [ ] Active/inactive toggle works
- [ ] Product images display correctly

### Analytics
- [ ] Subscriber KPI shows correct counts
- [ ] Weekly change calculates correctly
- [ ] Store stats show active vs total products
- [ ] Charts render without errors

### Audit Logging
- [ ] All admin actions are logged
- [ ] Logs include correct metadata
- [ ] Logs are viewable by admins only

### UI/UX
- [ ] No console errors
- [ ] Loading states show properly
- [ ] Error messages are user-friendly
- [ ] Responsive design works on mobile
- [ ] All buttons and links work correctly

## Future Enhancements

Potential additions for v2:
- Product categories and tags
- Bulk import/export
- Product variants (size, color)
- Sales analytics and reports
- Inventory alerts for low stock
- Image upload to storage bucket
- Product reviews management
- Discount/promotion codes
- Order fulfillment tracking

## Support

For issues or questions:
1. Check RLS policies are correctly configured
2. Verify user has admin role in user_roles table
3. Check admin_audit_logs for action history
4. Review console logs for errors
5. Test with admin and non-admin accounts
