-- Add missing columns to store_products
ALTER TABLE public.store_products 
  ADD COLUMN IF NOT EXISTS sku text UNIQUE,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS compare_at_price numeric(10,2);