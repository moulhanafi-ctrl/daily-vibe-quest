
-- ============================================
-- RESTRICT PUBLIC TABLE ACCESS
-- ============================================
-- Remove unauthenticated access from public-readable tables

-- 1. ARTHUR_TEMPLATES - Replace public access with authenticated-only
DROP POLICY IF EXISTS "Everyone can view active templates" ON public.arthur_templates;

CREATE POLICY "Authenticated users can view active templates"
ON public.arthur_templates
FOR SELECT
TO authenticated
USING (active = true);

-- 2. DAILY_MESSAGES - Replace public access with authenticated-only
DROP POLICY IF EXISTS "Anyone can view active messages" ON public.daily_messages;

CREATE POLICY "Authenticated users can view active messages"
ON public.daily_messages
FOR SELECT
TO authenticated
USING (active = true);

-- 3. FEATURE_FLAGS - Replace public access with authenticated-only
DROP POLICY IF EXISTS "Anyone can view feature flags" ON public.feature_flags;

CREATE POLICY "Authenticated users can view feature flags"
ON public.feature_flags
FOR SELECT
TO authenticated
USING (true);

-- 4. LEGAL_VERSIONS - Replace public access with authenticated-only
DROP POLICY IF EXISTS "Anyone can view active legal versions" ON public.legal_versions;

CREATE POLICY "Authenticated users can view active legal versions"
ON public.legal_versions
FOR SELECT
TO authenticated
USING (active = true);

-- 5. PRODUCTS - Replace public access with authenticated-only
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;

CREATE POLICY "Authenticated users can view active products"
ON public.products
FOR SELECT
TO authenticated
USING (active = true);

-- ============================================
-- SECURITY VALIDATION
-- ============================================
-- After this migration:
-- ✅ All tables require authentication for read access
-- ✅ No unauthenticated/anonymous users can query these tables
-- ✅ Admin policies remain unchanged for write operations
-- ✅ RLS is enabled on all tables
