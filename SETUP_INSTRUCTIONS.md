# Vibe Shop Setup Instructions

## ✅ Setup Completed

The Vibe Shop admin system and product management is now ready! Here's what's been implemented:

### Database
- ✅ Products, images, digital assets tables with RLS
- ✅ Orders, order items, digital downloads tracking
- ✅ Storage buckets: `store-images` (public) and `store-digital` (private)
- ✅ Stripe integration fields (product_id, price_id)

### Admin Features
- ✅ Product creation/editing at `/admin/products`
- ✅ Image upload (2MB limit, drag-drop, reorder)
- ✅ Digital file upload to secure bucket
- ✅ Stripe product/price creation on publish
- ✅ Admin navigation link (visible to admins only)

### Store Features
- ✅ Collection pages: `/store/kids`, `/store/teens`, `/store/adults`, `/store/elders`
- ✅ Product detail pages with image galleries
- ✅ Shopping cart and checkout flow
- ✅ Order history page

## 🚀 Next Steps

### 1. Make Yourself Admin

Run this SQL in Supabase SQL Editor (replace with your actual auth user ID):

```sql
-- First, get your user ID
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Then insert yourself as admin
INSERT INTO public.user_roles (user_id, role) 
VALUES ('<your-auth-user-id>', 'admin') 
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
```

### 2. Seed Sample Products

Run the `SEED_PRODUCTS.sql` file in Supabase SQL Editor to create 4 sample products (one per collection).

### 3. Test the Flow

1. **Admin Flow:**
   - Visit homepage → Click "Admin" button (top right)
   - Create a new product with images
   - Toggle "Active" → Stripe product/price created automatically
   - Edit product → Change price → New Stripe price created

2. **Customer Flow:**
   - Visit `/store` → Choose age group
   - Browse products → Click product
   - Add to cart → Checkout (Stripe test mode)
   - View order at `/orders`

3. **Digital Products:**
   - Upload digital file when creating product
   - After purchase, download link appears in `/orders`
   - Link expires after 48 hours
   - Max 5 downloads per purchase

### 4. Stripe Configuration

The Stripe integration is ready but requires your Stripe API key:
- Edge functions will use `STRIPE_SECRET_KEY` from Supabase secrets
- Test mode is automatically used (test API keys start with `sk_test_`)
- Products/prices are created automatically when you publish

### 5. Type Generation

Once you've run the seed data and types regenerate, the temporary `as any` assertions in `ProductForm.tsx` will resolve automatically.

## 📋 QA Checklist

- [ ] Make yourself admin and access `/admin/products`
- [ ] Create draft product with images
- [ ] Toggle Active → Product appears in correct collection
- [ ] Digital product: Upload file → Verify stored in `store-digital` bucket
- [ ] Non-admin cannot POST to products (verify 403 error)
- [ ] Checkout flow works with Stripe test cards
- [ ] Digital download links work and expire correctly
- [ ] TypeScript builds without errors

## 🔒 Security

All RLS policies are in place:
- ✅ Only admins can create/edit products
- ✅ Public can view active products only
- ✅ Users can only download purchased digital assets
- ✅ Download links expire after 48h
- ✅ Max 5 downloads enforced

## 📝 Notes

- Sample products use Unsplash placeholder images
- Stripe webhook handling ready for production
- All monetary values stored in cents
- Digital asset downloads tracked with expiry
- Cart persists per user session