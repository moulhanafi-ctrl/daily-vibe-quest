
-- ============================================
-- VIBE SHOP PRODUCT MANAGEMENT SCHEMA
-- Complete e-commerce setup with products, images, orders, and digital downloads
-- ============================================

-- Create product_images table for managing multiple product images
CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  alt_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create digital_assets table for downloadable products
CREATE TABLE IF NOT EXISTS public.digital_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_size_bytes BIGINT,
  file_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create digital_downloads table to track download access
CREATE TABLE IF NOT EXISTS public.digital_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  digital_asset_id UUID NOT NULL REFERENCES public.digital_assets(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  download_count INTEGER NOT NULL DEFAULT 0,
  max_downloads INTEGER NOT NULL DEFAULT 3,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '48 hours'),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON public.product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_display_order ON public.product_images(product_id, display_order);
CREATE INDEX IF NOT EXISTS idx_digital_assets_product_id ON public.digital_assets(product_id);
CREATE INDEX IF NOT EXISTS idx_digital_downloads_user_id ON public.digital_downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_digital_downloads_asset_id ON public.digital_downloads(digital_asset_id);

-- Enable RLS on all tables
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_downloads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_images
CREATE POLICY "Anyone can view product images"
ON public.product_images FOR SELECT
USING (true);

CREATE POLICY "Admins can manage product images"
ON public.product_images FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS Policies for digital_assets
CREATE POLICY "Admins can view all digital assets"
ON public.digital_assets FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage digital assets"
ON public.digital_assets FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS Policies for digital_downloads
CREATE POLICY "Users can view their own downloads"
ON public.digital_downloads FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can create download records"
ON public.digital_downloads FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their download count"
ON public.digital_downloads FOR UPDATE
USING (auth.uid() = user_id);

-- Create storage buckets for product images and digital assets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('store-images', 'store-images', true),
  ('store-digital', 'store-digital', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for store-images (public bucket)
CREATE POLICY "Anyone can view store images"
ON storage.objects FOR SELECT
USING (bucket_id = 'store-images');

CREATE POLICY "Admins can upload store images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'store-images' AND
  has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can update store images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'store-images' AND
  has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete store images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'store-images' AND
  has_role(auth.uid(), 'admin')
);

-- Storage policies for store-digital (private bucket with purchase verification)
CREATE POLICY "Users can download purchased digital assets"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'store-digital' AND (
    has_role(auth.uid(), 'admin') OR EXISTS (
      SELECT 1
      FROM public.digital_downloads dd
      JOIN public.digital_assets da ON da.id = dd.digital_asset_id
      JOIN public.order_items oi ON oi.id = dd.order_item_id
      JOIN public.orders o ON o.id = oi.order_id
      WHERE da.file_path = storage.objects.name
        AND o.user_id = auth.uid()
        AND dd.expires_at > now()
        AND dd.download_count < dd.max_downloads
    )
  )
);

CREATE POLICY "Admins can manage digital assets in storage"
ON storage.objects FOR ALL
USING (
  bucket_id = 'store-digital' AND
  has_role(auth.uid(), 'admin')
)
WITH CHECK (
  bucket_id = 'store-digital' AND
  has_role(auth.uid(), 'admin')
);

-- Add trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_product_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER product_images_updated_at
BEFORE UPDATE ON public.product_images
FOR EACH ROW
EXECUTE FUNCTION update_product_images_updated_at();
