-- Migration: Add customer_email column to support_tickets table
-- Run this in your Supabase SQL Editor

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'customer_email') THEN
    ALTER TABLE public.support_tickets ADD COLUMN customer_email TEXT;
    RAISE NOTICE 'Added customer_email column to support_tickets table';
  ELSE
    RAISE NOTICE 'customer_email column already exists in support_tickets table';
  END IF;
END $$;

