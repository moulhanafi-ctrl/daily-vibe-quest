-- Extend products table with additional fields
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS preview_url TEXT,
ADD COLUMN IF NOT EXISTS file_urls TEXT[] DEFAULT '{}';

-- Update existing products to use images array (migrate image_url to images)
UPDATE public.products 
SET images = ARRAY[image_url] 
WHERE image_url IS NOT NULL AND (images IS NULL OR array_length(images, 1) IS NULL);

-- Create entitlements table for digital product access
CREATE TABLE public.entitlements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, product_id)
);

ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;

-- Users can view their own entitlements
CREATE POLICY "Users can view their own entitlements"
ON public.entitlements
FOR SELECT
USING (auth.uid() = user_id);

-- System can insert entitlements
CREATE POLICY "System can insert entitlements"
ON public.entitlements
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create reviews table
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  text TEXT,
  user_public_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, product_id)
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can view reviews
CREATE POLICY "Anyone can view reviews"
ON public.reviews
FOR SELECT
USING (true);

-- Users can insert their own reviews
CREATE POLICY "Users can insert their own reviews"
ON public.reviews
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own reviews
CREATE POLICY "Users can update their own reviews"
ON public.reviews
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own reviews
CREATE POLICY "Users can delete their own reviews"
ON public.reviews
FOR DELETE
USING (auth.uid() = user_id);

-- Create purchase_requests table for parent approval
CREATE TABLE public.purchase_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.purchase_requests ENABLE ROW LEVEL SECURITY;

-- Children can view their own requests
CREATE POLICY "Children can view their own requests"
ON public.purchase_requests
FOR SELECT
USING (auth.uid() = child_id);

-- Parents can view requests for their children
CREATE POLICY "Parents can view requests for their children"
ON public.purchase_requests
FOR SELECT
USING (auth.uid() = parent_id);

-- Children can create requests
CREATE POLICY "Children can create requests"
ON public.purchase_requests
FOR INSERT
WITH CHECK (auth.uid() = child_id);

-- Parents can update request status
CREATE POLICY "Parents can update request status"
ON public.purchase_requests
FOR UPDATE
USING (auth.uid() = parent_id);

-- Create trigger for updated_at
CREATE TRIGGER update_purchase_requests_updated_at
BEFORE UPDATE ON public.purchase_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Create indexes for better performance
CREATE INDEX idx_entitlements_user_id ON public.entitlements(user_id);
CREATE INDEX idx_entitlements_product_id ON public.entitlements(product_id);
CREATE INDEX idx_reviews_product_id ON public.reviews(product_id);
CREATE INDEX idx_purchase_requests_parent_id ON public.purchase_requests(parent_id);
CREATE INDEX idx_purchase_requests_status ON public.purchase_requests(status);