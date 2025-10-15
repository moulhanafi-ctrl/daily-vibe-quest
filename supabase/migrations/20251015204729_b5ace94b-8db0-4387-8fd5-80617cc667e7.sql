-- Add age_restriction column to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS age_restriction text DEFAULT 'all' CHECK (age_restriction IN ('all', 'teen', 'adult', 'elder'));

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_products_age_restriction ON public.products(age_restriction);

-- Add comment explaining the restriction levels
COMMENT ON COLUMN public.products.age_restriction IS 'Age restriction: all (no restriction), teen (13+), adult (18+), elder (60+)';
