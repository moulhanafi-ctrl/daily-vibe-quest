-- Create store_products table for merchandise management
CREATE TABLE IF NOT EXISTS public.store_products (
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

-- Enable RLS
ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;

-- Admin-only policies for store_products
CREATE POLICY "Admins can manage store products"
  ON public.store_products FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Public can view active products
CREATE POLICY "Anyone can view active products"
  ON public.store_products FOR SELECT
  USING (is_active = true);

-- Create updated_at trigger
CREATE TRIGGER update_store_products_updated_at
  BEFORE UPDATE ON public.store_products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Index for better performance
CREATE INDEX idx_store_products_active ON public.store_products(is_active);
CREATE INDEX idx_store_products_created_at ON public.store_products(created_at DESC);