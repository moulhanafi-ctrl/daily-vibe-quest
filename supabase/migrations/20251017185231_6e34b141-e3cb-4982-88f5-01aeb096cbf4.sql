-- Add age_group column to store_products table
ALTER TABLE public.store_products 
ADD COLUMN age_group age_group NOT NULL DEFAULT 'adult';

-- Create an index for better query performance on age_group
CREATE INDEX idx_store_products_age_group ON public.store_products(age_group);

-- Add comment
COMMENT ON COLUMN public.store_products.age_group IS 'Age group this product is designed for (child, teen, adult, elder)';