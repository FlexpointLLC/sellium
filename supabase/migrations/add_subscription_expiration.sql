-- Migration: Add subscription expiration tracking and automatic conversion
-- Run this in your Supabase SQL Editor

-- Add subscription_expires_at column to stores table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'subscription_expires_at') THEN
    ALTER TABLE public.stores ADD COLUMN subscription_expires_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Create a function to check and expire subscriptions
CREATE OR REPLACE FUNCTION public.check_and_expire_subscriptions()
RETURNS TABLE(
  expired_count INTEGER,
  expired_store_ids UUID[]
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_stores UUID[];
  free_traffic_limit INTEGER := 2000;
  free_product_limit INTEGER := 100;
BEGIN
  -- Find all stores with expired subscriptions
  SELECT ARRAY_AGG(id)
  INTO expired_stores
  FROM public.stores
  WHERE plan IN ('paid', 'pro')
    AND subscription_expires_at IS NOT NULL
    AND subscription_expires_at <= NOW();

  -- If there are expired stores, update them to free plan
  IF expired_stores IS NOT NULL AND array_length(expired_stores, 1) > 0 THEN
    UPDATE public.stores
    SET 
      plan = 'free',
      traffic_limit = free_traffic_limit,
      product_limit = free_product_limit,
      subscription_expires_at = NULL,
      updated_at = NOW()
    WHERE id = ANY(expired_stores);

    -- Create cancellation records for tracking
    INSERT INTO public.upgrade_requests (
      store_id,
      current_plan,
      requested_plan,
      transaction_id,
      billing_period,
      status,
      notes
    )
    SELECT 
      id,
      plan,
      CASE WHEN plan = 'paid' THEN 'paid' ELSE 'pro' END,
      'EXPIRED',
      'monthly',
      'canceled',
      'Subscription expired automatically'
    FROM public.stores
    WHERE id = ANY(expired_stores);
  END IF;

  -- Return results
  RETURN QUERY
  SELECT 
    COALESCE(array_length(expired_stores, 1), 0)::INTEGER as expired_count,
    COALESCE(expired_stores, ARRAY[]::UUID[]) as expired_store_ids;
END;
$$;

-- Grant execute permission to authenticated users (or service role)
GRANT EXECUTE ON FUNCTION public.check_and_expire_subscriptions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_expire_subscriptions() TO service_role;

-- Optional: Set up pg_cron job (if pg_cron extension is enabled)
-- This will run the function every hour
-- Uncomment if you have pg_cron extension enabled
/*
SELECT cron.schedule(
  'check-expired-subscriptions',
  '0 * * * *', -- Every hour at minute 0
  $$SELECT public.check_and_expire_subscriptions();$$
);
*/

