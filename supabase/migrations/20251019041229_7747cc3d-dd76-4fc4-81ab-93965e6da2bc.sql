-- Ensure orders table has complete schema for production
-- Add missing columns if they don't exist
DO $$ 
BEGIN
  -- Add emailed column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'emailed'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN emailed boolean DEFAULT false;
  END IF;

  -- Add updated_at column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Create or replace trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger to ensure it's current
DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_orders_updated_at();

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON public.orders (customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_session_id ON public.orders (session_id);