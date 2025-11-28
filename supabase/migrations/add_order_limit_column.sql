-- Migration: Add order_limit column to stores table
-- This allows stores to have custom order limits independent of their plan

-- Add order_limit column to stores table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'order_limit') THEN
    ALTER TABLE public.stores ADD COLUMN order_limit INTEGER;
  END IF;
END $$;

-- Set default order limits based on plan for existing stores
UPDATE public.stores
SET order_limit = CASE
  WHEN plan = 'free' THEN 500
  WHEN plan = 'paid' THEN 5000
  WHEN plan = 'pro' THEN NULL -- NULL means unlimited
  ELSE 500 -- Default to free plan limit
END
WHERE order_limit IS NULL;

-- Set default value for new stores (will be overridden by plan-based logic)
ALTER TABLE public.stores ALTER COLUMN order_limit SET DEFAULT 500;

