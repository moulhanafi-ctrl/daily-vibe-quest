-- Add new columns to existing orders table if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'session_id') THEN
    ALTER TABLE public.orders ADD COLUMN session_id TEXT;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_session_id_unique ON public.orders (session_id) WHERE session_id IS NOT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'customer_email') THEN
    ALTER TABLE public.orders ADD COLUMN customer_email TEXT;
    CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON public.orders (customer_email) WHERE customer_email IS NOT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'product_name') THEN
    ALTER TABLE public.orders ADD COLUMN product_name TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'amount_total') THEN
    ALTER TABLE public.orders ADD COLUMN amount_total INTEGER;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'currency') THEN
    ALTER TABLE public.orders ADD COLUMN currency TEXT DEFAULT 'usd';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'payment_status') THEN
    ALTER TABLE public.orders ADD COLUMN payment_status TEXT DEFAULT 'paid';
  END IF;
END $$;