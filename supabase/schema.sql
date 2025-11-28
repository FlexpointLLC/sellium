-- Sellium Database Schema
-- Run this in your Supabase SQL Editor
-- This schema is safe to run multiple times (idempotent)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ADD MISSING COLUMNS TO EXISTING TABLES
-- (Run these first to update existing tables)
-- ============================================

-- Add missing columns to profiles
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email') THEN
    ALTER TABLE public.profiles ADD COLUMN email TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone') THEN
    ALTER TABLE public.profiles ADD COLUMN phone TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'bio') THEN
    ALTER TABLE public.profiles ADD COLUMN bio TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
    ALTER TABLE public.profiles ADD COLUMN role TEXT DEFAULT 'owner' CHECK (role IN ('admin', 'owner', 'agent', 'rider'));
  END IF;
END $$;

-- Add upgrade_requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.upgrade_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  current_plan TEXT NOT NULL CHECK (current_plan IN ('free', 'paid', 'pro')),
  requested_plan TEXT NOT NULL CHECK (requested_plan IN ('paid', 'pro')),
  transaction_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'canceled')),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add current_plan column to existing upgrade_requests table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'upgrade_requests' AND column_name = 'current_plan') THEN
    ALTER TABLE public.upgrade_requests ADD COLUMN current_plan TEXT CHECK (current_plan IN ('free', 'paid', 'pro'));
    -- Update existing records to have a default current_plan (assuming 'free' for existing records)
    UPDATE public.upgrade_requests SET current_plan = 'free' WHERE current_plan IS NULL;
    -- Make it NOT NULL after updating existing records
    ALTER TABLE public.upgrade_requests ALTER COLUMN current_plan SET NOT NULL;
  END IF;
END $$;

-- Add billing_period column to existing upgrade_requests table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'upgrade_requests' AND column_name = 'billing_period') THEN
    ALTER TABLE public.upgrade_requests ADD COLUMN billing_period TEXT DEFAULT 'monthly' CHECK (billing_period IN ('monthly', 'yearly'));
    -- Update existing records to have a default billing_period
    UPDATE public.upgrade_requests SET billing_period = 'monthly' WHERE billing_period IS NULL;
  END IF;
END $$;

-- Update status constraint to include 'canceled'
DO $$ 
BEGIN
  -- Drop the old constraint if it exists
  ALTER TABLE public.upgrade_requests DROP CONSTRAINT IF EXISTS upgrade_requests_status_check;
  -- Add the new constraint with 'canceled' status
  ALTER TABLE public.upgrade_requests ADD CONSTRAINT upgrade_requests_status_check 
    CHECK (status IN ('pending', 'approved', 'rejected', 'canceled'));
END $$;

-- Add missing columns to stores
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'currency') THEN
    ALTER TABLE public.stores ADD COLUMN currency TEXT DEFAULT 'USD';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'timezone') THEN
    ALTER TABLE public.stores ADD COLUMN timezone TEXT DEFAULT 'UTC';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'address') THEN
    ALTER TABLE public.stores ADD COLUMN address JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'social_links') THEN
    ALTER TABLE public.stores ADD COLUMN social_links JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'banner_images') THEN
    ALTER TABLE public.stores ADD COLUMN banner_images TEXT[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'payment_settings') THEN
    ALTER TABLE public.stores ADD COLUMN payment_settings JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'traffic_limit') THEN
    ALTER TABLE public.stores ADD COLUMN traffic_limit INTEGER DEFAULT 2000;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'product_limit') THEN
    ALTER TABLE public.stores ADD COLUMN product_limit INTEGER DEFAULT 100;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'subscription_expires_at') THEN
    ALTER TABLE public.stores ADD COLUMN subscription_expires_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Migrate existing plans to free/paid/pro
-- Convert 'starter' to 'paid', keep 'pro', convert 'enterprise' to 'pro'
UPDATE public.stores 
SET plan = 'paid' 
WHERE plan = 'starter';

UPDATE public.stores 
SET plan = 'pro' 
WHERE plan = 'enterprise';

-- Update plan constraint to only allow 'free', 'paid', or 'pro'
ALTER TABLE public.stores DROP CONSTRAINT IF EXISTS stores_plan_check;
ALTER TABLE public.stores ADD CONSTRAINT stores_plan_check CHECK (plan IN ('free', 'paid', 'pro'));

-- Add missing columns to categories
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'sort_order') THEN
    ALTER TABLE public.categories ADD COLUMN sort_order INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'status') THEN
    ALTER TABLE public.categories ADD COLUMN status TEXT DEFAULT 'active';
  END IF;
END $$;

-- Add missing columns to products
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'slug') THEN
    ALTER TABLE public.products ADD COLUMN slug TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'short_description') THEN
    ALTER TABLE public.products ADD COLUMN short_description TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'cost_price') THEN
    ALTER TABLE public.products ADD COLUMN cost_price DECIMAL(10, 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'barcode') THEN
    ALTER TABLE public.products ADD COLUMN barcode TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'low_stock_threshold') THEN
    ALTER TABLE public.products ADD COLUMN low_stock_threshold INTEGER DEFAULT 5;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'track_inventory') THEN
    ALTER TABLE public.products ADD COLUMN track_inventory BOOLEAN DEFAULT TRUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'weight') THEN
    ALTER TABLE public.products ADD COLUMN weight DECIMAL(10, 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'weight_unit') THEN
    ALTER TABLE public.products ADD COLUMN weight_unit TEXT DEFAULT 'kg';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'dimensions') THEN
    ALTER TABLE public.products ADD COLUMN dimensions JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'visibility') THEN
    ALTER TABLE public.products ADD COLUMN visibility TEXT DEFAULT 'visible';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'featured') THEN
    ALTER TABLE public.products ADD COLUMN featured BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'seo_title') THEN
    ALTER TABLE public.products ADD COLUMN seo_title TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'seo_description') THEN
    ALTER TABLE public.products ADD COLUMN seo_description TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'tags') THEN
    ALTER TABLE public.products ADD COLUMN tags TEXT[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'has_variants') THEN
    ALTER TABLE public.products ADD COLUMN has_variants BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'variant_count') THEN
    ALTER TABLE public.products ADD COLUMN variant_count INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'category_id') THEN
    ALTER TABLE public.products ADD COLUMN category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'image_url') THEN
    ALTER TABLE public.products ADD COLUMN image_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'sort_order') THEN
    ALTER TABLE public.products ADD COLUMN sort_order INTEGER DEFAULT 0;
  END IF;
END $$;

-- Add customer_email to support_tickets
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'customer_email') THEN
    ALTER TABLE public.support_tickets ADD COLUMN customer_email TEXT;
  END IF;
END $$;

-- Add missing columns to customers
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'first_name') THEN
    ALTER TABLE public.customers ADD COLUMN first_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'last_name') THEN
    ALTER TABLE public.customers ADD COLUMN last_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'avatar_url') THEN
    ALTER TABLE public.customers ADD COLUMN avatar_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'notes') THEN
    ALTER TABLE public.customers ADD COLUMN notes TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'tags') THEN
    ALTER TABLE public.customers ADD COLUMN tags TEXT[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'accepts_marketing') THEN
    ALTER TABLE public.customers ADD COLUMN accepts_marketing BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'last_order_at') THEN
    ALTER TABLE public.customers ADD COLUMN last_order_at TIMESTAMP WITH TIME ZONE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'status') THEN
    ALTER TABLE public.customers ADD COLUMN status TEXT DEFAULT 'active';
  END IF;
END $$;

-- Add missing columns to orders
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'customer_id') THEN
    ALTER TABLE public.orders ADD COLUMN customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'customer_phone') THEN
    ALTER TABLE public.orders ADD COLUMN customer_phone TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'payment_status') THEN
    ALTER TABLE public.orders ADD COLUMN payment_status TEXT DEFAULT 'pending';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'payment_method') THEN
    ALTER TABLE public.orders ADD COLUMN payment_method TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'transaction_id') THEN
    ALTER TABLE public.orders ADD COLUMN transaction_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'fulfillment_status') THEN
    ALTER TABLE public.orders ADD COLUMN fulfillment_status TEXT DEFAULT 'unfulfilled';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'discount_amount') THEN
    ALTER TABLE public.orders ADD COLUMN discount_amount DECIMAL(10, 2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'discount_code') THEN
    ALTER TABLE public.orders ADD COLUMN discount_code TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'currency') THEN
    ALTER TABLE public.orders ADD COLUMN currency TEXT DEFAULT 'USD';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'shipping_method') THEN
    ALTER TABLE public.orders ADD COLUMN shipping_method TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'tracking_number') THEN
    ALTER TABLE public.orders ADD COLUMN tracking_number TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'tracking_url') THEN
    ALTER TABLE public.orders ADD COLUMN tracking_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'internal_notes') THEN
    ALTER TABLE public.orders ADD COLUMN internal_notes TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'ip_address') THEN
    ALTER TABLE public.orders ADD COLUMN ip_address TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'user_agent') THEN
    ALTER TABLE public.orders ADD COLUMN user_agent TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'source') THEN
    ALTER TABLE public.orders ADD COLUMN source TEXT DEFAULT 'web';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'shipped_at') THEN
    ALTER TABLE public.orders ADD COLUMN shipped_at TIMESTAMP WITH TIME ZONE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'delivered_at') THEN
    ALTER TABLE public.orders ADD COLUMN delivered_at TIMESTAMP WITH TIME ZONE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'cancelled_at') THEN
    ALTER TABLE public.orders ADD COLUMN cancelled_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Add missing columns to order_items
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'product_variant_id') THEN
    ALTER TABLE public.order_items ADD COLUMN product_variant_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'variant_name') THEN
    ALTER TABLE public.order_items ADD COLUMN variant_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'sku') THEN
    ALTER TABLE public.order_items ADD COLUMN sku TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'discount_amount') THEN
    ALTER TABLE public.order_items ADD COLUMN discount_amount DECIMAL(10, 2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'tax_amount') THEN
    ALTER TABLE public.order_items ADD COLUMN tax_amount DECIMAL(10, 2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'image_url') THEN
    ALTER TABLE public.order_items ADD COLUMN image_url TEXT;
  END IF;
END $$;

-- ============================================
-- PROFILES TABLE (extends Supabase auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  username TEXT UNIQUE,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  bio TEXT,
  role TEXT DEFAULT 'owner' CHECK (role IN ('admin', 'owner', 'agent', 'rider')),
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STORES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.stores (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  business_type TEXT NOT NULL,
  logo_url TEXT,
  favicon_url TEXT,
  banner_url TEXT,
  banner_images TEXT[] DEFAULT '{}',
  meta_title TEXT,
  meta_description TEXT,
  theme_color TEXT DEFAULT '#22c55e',
  currency TEXT DEFAULT 'USD',
  timezone TEXT DEFAULT 'UTC',
  address JSONB,
  social_links JSONB,
  linquo_org_id TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'paid', 'pro')),
  traffic_limit INTEGER DEFAULT 2000,
  product_limit INTEGER DEFAULT 100,
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  available_time TEXT,
  social_media_text TEXT,
  copyright_text TEXT,
  show_powered_by BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STORE_MEMBERS TABLE (Team members for each store)
-- ============================================
CREATE TABLE IF NOT EXISTS public.store_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'agent' CHECK (role IN ('owner', 'agent', 'rider')),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(store_id, user_id)
);

-- ============================================
-- CATEGORIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(store_id, slug)
);

-- ============================================
-- VARIANTS TABLE (Size, Color, Material, etc.)
-- ============================================
CREATE TABLE IF NOT EXISTS public.variants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  display_name TEXT,
  options TEXT[] DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(store_id, name)
);

-- ============================================
-- PRODUCTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT,
  description TEXT,
  short_description TEXT,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  compare_at_price DECIMAL(10, 2),
  cost_price DECIMAL(10, 2),
  sku TEXT,
  barcode TEXT,
  stock INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 5,
  track_inventory BOOLEAN DEFAULT TRUE,
  weight DECIMAL(10, 2),
  weight_unit TEXT DEFAULT 'kg',
  dimensions JSONB,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  visibility TEXT DEFAULT 'visible' CHECK (visibility IN ('visible', 'hidden')),
  featured BOOLEAN DEFAULT FALSE,
  has_variants BOOLEAN DEFAULT FALSE,
  variant_count INTEGER DEFAULT 0,
  images TEXT[] DEFAULT '{}',
  image_url TEXT,
  seo_title TEXT,
  seo_description TEXT,
  tags TEXT[] DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(store_id, slug)
);

-- ============================================
-- PRODUCT_VARIANTS TABLE (Links products to variant options)
-- ============================================
CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '{}',
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  compare_at_price DECIMAL(10, 2),
  sku TEXT,
  stock INTEGER DEFAULT 0,
  image_url TEXT,
  enabled BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CUSTOMERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  accepts_marketing BOOLEAN DEFAULT FALSE,
  total_orders INTEGER DEFAULT 0,
  total_spent DECIMAL(10, 2) DEFAULT 0,
  last_order_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(store_id, email)
);

-- ============================================
-- CUSTOMER_ADDRESSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.customer_addresses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  type TEXT DEFAULT 'shipping' CHECK (type IN ('shipping', 'billing')),
  is_default BOOLEAN DEFAULT FALSE,
  first_name TEXT,
  last_name TEXT,
  company TEXT,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT,
  postal_code TEXT,
  country TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ORDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  order_number TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'partially_refunded')),
  payment_method TEXT,
  transaction_id TEXT,
  fulfillment_status TEXT DEFAULT 'unfulfilled' CHECK (fulfillment_status IN ('unfulfilled', 'partially_fulfilled', 'fulfilled')),
  subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  discount_code TEXT,
  tax DECIMAL(10, 2) DEFAULT 0,
  shipping DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  shipping_address JSONB,
  billing_address JSONB,
  shipping_method TEXT,
  tracking_number TEXT,
  tracking_url TEXT,
  notes TEXT,
  internal_notes TEXT,
  ip_address TEXT,
  user_agent TEXT,
  source TEXT DEFAULT 'web',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  shipped_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- ORDER_ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  variant_name TEXT,
  sku TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  price DECIMAL(10, 2) NOT NULL,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  tax_amount DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TRANSACTIONS TABLE (for earnings tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('sale', 'refund', 'payout', 'fee', 'adjustment')),
  amount DECIMAL(10, 2) NOT NULL,
  fee DECIMAL(10, 2) DEFAULT 0,
  net_amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  description TEXT,
  reference_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- PAYOUTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.payouts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  fee DECIMAL(10, 2) DEFAULT 0,
  net_amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  payout_method TEXT,
  payout_details JSONB,
  reference_id TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- COUPONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount', 'free_shipping')),
  discount_value DECIMAL(10, 2) NOT NULL,
  minimum_order_amount DECIMAL(10, 2),
  maximum_discount_amount DECIMAL(10, 2),
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  usage_limit_per_customer INTEGER DEFAULT 1,
  starts_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(store_id, code)
);

-- ============================================
-- REVIEWS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  content TEXT,
  images TEXT[] DEFAULT '{}',
  is_verified BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reply TEXT,
  replied_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  data JSONB,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- SUPPORT_TICKETS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  ticket_number TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  category TEXT,
  customer_email TEXT,
  attachments TEXT[] DEFAULT '{}',
  admin_response TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(store_id, ticket_number)
);

-- ============================================
-- CUSTOM_DOMAINS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.custom_domains (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  domain TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verifying', 'verified', 'failed', 'removed')),
  ssl_status TEXT DEFAULT 'pending' CHECK (ssl_status IN ('pending', 'provisioning', 'active', 'failed')),
  verification_token TEXT,
  dns_configured BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP WITH TIME ZONE,
  last_checked_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(store_id),
  UNIQUE(domain)
);

-- ============================================
-- STORE_SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.store_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- General settings
  contact_email TEXT,
  support_email TEXT,
  
  -- Notification settings
  notify_new_order BOOLEAN DEFAULT TRUE,
  notify_low_stock BOOLEAN DEFAULT TRUE,
  notify_new_review BOOLEAN DEFAULT TRUE,
  
  -- Checkout settings
  require_shipping_address BOOLEAN DEFAULT TRUE,
  require_billing_address BOOLEAN DEFAULT FALSE,
  allow_guest_checkout BOOLEAN DEFAULT TRUE,
  
  -- Tax settings
  tax_inclusive BOOLEAN DEFAULT FALSE,
  tax_rate DECIMAL(5, 2) DEFAULT 0,
  
  -- Shipping settings
  free_shipping_threshold DECIMAL(10, 2),
  default_shipping_rate DECIMAL(10, 2) DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- UPGRADE_REQUESTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.upgrade_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  current_plan TEXT NOT NULL CHECK (current_plan IN ('free', 'paid', 'pro')),
  requested_plan TEXT NOT NULL CHECK (requested_plan IN ('paid', 'pro')),
  transaction_id TEXT NOT NULL,
  billing_period TEXT DEFAULT 'monthly' CHECK (billing_period IN ('monthly', 'yearly')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'canceled')),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- NOTICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.notices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  color TEXT DEFAULT 'grey' CHECK (color IN ('red', 'green', 'blue', 'yellow', 'grey')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  closeable BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STORE PAGES TABLE (Footer Pages)
-- ============================================
CREATE TABLE IF NOT EXISTS public.store_pages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  slug TEXT NOT NULL CHECK (slug IN ('about', 'privacy', 'shipping', 'returns')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(store_id, slug)
);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upgrade_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

-- Enable RLS for store_pages
ALTER TABLE public.store_pages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own stores" ON public.stores;
DROP POLICY IF EXISTS "Users can create their own stores" ON public.stores;
DROP POLICY IF EXISTS "Users can update their own stores" ON public.stores;
DROP POLICY IF EXISTS "Users can delete their own stores" ON public.stores;
DROP POLICY IF EXISTS "Public can view active stores" ON public.stores;
DROP POLICY IF EXISTS "Store owners can manage categories" ON public.categories;
DROP POLICY IF EXISTS "Public can view categories" ON public.categories;
DROP POLICY IF EXISTS "Store owners can manage variants" ON public.variants;
DROP POLICY IF EXISTS "Store owners can manage products" ON public.products;
DROP POLICY IF EXISTS "Public can view active products" ON public.products;
DROP POLICY IF EXISTS "Store owners can manage product variants" ON public.product_variants;
DROP POLICY IF EXISTS "Public can view product variants" ON public.product_variants;
DROP POLICY IF EXISTS "Store owners can manage customers" ON public.customers;
DROP POLICY IF EXISTS "Store owners can manage customer addresses" ON public.customer_addresses;
DROP POLICY IF EXISTS "Store owners can manage orders" ON public.orders;
DROP POLICY IF EXISTS "Store owners can manage order items" ON public.order_items;
DROP POLICY IF EXISTS "Store owners can view transactions" ON public.transactions;
DROP POLICY IF EXISTS "Store owners can view payouts" ON public.payouts;
DROP POLICY IF EXISTS "Store owners can manage coupons" ON public.coupons;
DROP POLICY IF EXISTS "Store owners can manage reviews" ON public.reviews;
DROP POLICY IF EXISTS "Public can view approved reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Store owners can manage store settings" ON public.store_settings;
DROP POLICY IF EXISTS "Store owners can manage custom domains" ON public.custom_domains;
DROP POLICY IF EXISTS "Store owners can manage upgrade requests" ON public.upgrade_requests;
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin can view all stores" ON public.stores;
DROP POLICY IF EXISTS "Admin can update all stores" ON public.stores;
DROP POLICY IF EXISTS "Admin can manage all upgrade requests" ON public.upgrade_requests;
DROP POLICY IF EXISTS "Admin can manage all notices" ON public.notices;
DROP POLICY IF EXISTS "Public can view active notices" ON public.notices;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Admin can view and manage all profiles
CREATE POLICY "Admin can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin can update all profiles" ON public.profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Stores policies
CREATE POLICY "Users can view their own stores" ON public.stores
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own stores" ON public.stores
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stores" ON public.stores
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stores" ON public.stores
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Public can view active stores" ON public.stores
  FOR SELECT USING (status = 'active');

-- Admin can view and update all stores
CREATE POLICY "Admin can view all stores" ON public.stores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin can update all stores" ON public.stores
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Categories policies
CREATE POLICY "Store owners can manage categories" ON public.categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = categories.store_id
      AND stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Public can view categories" ON public.categories
  FOR SELECT USING (true);

-- Variants policies
CREATE POLICY "Store owners can manage variants" ON public.variants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = variants.store_id
      AND stores.user_id = auth.uid()
    )
  );

-- Products policies
CREATE POLICY "Store owners can manage products" ON public.products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = products.store_id
      AND stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Public can view active products" ON public.products
  FOR SELECT USING (status = 'active' AND visibility = 'visible');

-- Product variants policies
CREATE POLICY "Store owners can manage product variants" ON public.product_variants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.products
      JOIN public.stores ON stores.id = products.store_id
      WHERE products.id = product_variants.product_id
      AND stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Public can view product variants" ON public.product_variants
  FOR SELECT USING (true);

-- Customers policies
CREATE POLICY "Store owners can manage customers" ON public.customers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = customers.store_id
      AND stores.user_id = auth.uid()
    )
  );

-- Customer addresses policies
CREATE POLICY "Store owners can manage customer addresses" ON public.customer_addresses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.customers
      JOIN public.stores ON stores.id = customers.store_id
      WHERE customers.id = customer_addresses.customer_id
      AND stores.user_id = auth.uid()
    )
  );

-- Allow public to create and view customers (for storefront checkout)
DROP POLICY IF EXISTS "Public can create customers" ON public.customers;
CREATE POLICY "Public can create customers" ON public.customers
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view customers" ON public.customers;
CREATE POLICY "Public can view customers" ON public.customers
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can update customers" ON public.customers;
CREATE POLICY "Public can update customers" ON public.customers
  FOR UPDATE USING (true);

-- Orders policies
CREATE POLICY "Store owners can manage orders" ON public.orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = orders.store_id
      AND stores.user_id = auth.uid()
    )
  );

-- Allow public to create orders (for storefront checkout)
DROP POLICY IF EXISTS "Public can create orders" ON public.orders;
CREATE POLICY "Public can create orders" ON public.orders
  FOR INSERT WITH CHECK (true);

-- Allow public to view their own orders by order_number
DROP POLICY IF EXISTS "Public can view orders by order number" ON public.orders;
CREATE POLICY "Public can view orders by order number" ON public.orders
  FOR SELECT USING (true);

-- Allow public to update order payment status (for payment callbacks)
DROP POLICY IF EXISTS "Public can update order payment status" ON public.orders;
CREATE POLICY "Public can update order payment status" ON public.orders
  FOR UPDATE USING (true);

-- Order items policies
CREATE POLICY "Store owners can manage order items" ON public.order_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.orders
      JOIN public.stores ON stores.id = orders.store_id
      WHERE orders.id = order_items.order_id
      AND stores.user_id = auth.uid()
    )
  );

-- Allow public to create order items (for storefront checkout)
DROP POLICY IF EXISTS "Public can create order items" ON public.order_items;
CREATE POLICY "Public can create order items" ON public.order_items
  FOR INSERT WITH CHECK (true);

-- Transactions policies
CREATE POLICY "Store owners can view transactions" ON public.transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = transactions.store_id
      AND stores.user_id = auth.uid()
    )
  );

-- Payouts policies
CREATE POLICY "Store owners can view payouts" ON public.payouts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = payouts.store_id
      AND stores.user_id = auth.uid()
    )
  );

-- Coupons policies
CREATE POLICY "Store owners can manage coupons" ON public.coupons
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = coupons.store_id
      AND stores.user_id = auth.uid()
    )
  );

-- Reviews policies
CREATE POLICY "Store owners can manage reviews" ON public.reviews
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = reviews.store_id
      AND stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Public can view approved reviews" ON public.reviews
  FOR SELECT USING (status = 'approved');

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Support tickets policies
CREATE POLICY "Store owners can manage their support tickets" ON public.support_tickets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = support_tickets.store_id
      AND stores.user_id = auth.uid()
    )
  );

-- Store settings policies
CREATE POLICY "Store owners can manage store settings" ON public.store_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = store_settings.store_id
      AND stores.user_id = auth.uid()
    )
  );

-- Custom domains policies
CREATE POLICY "Store owners can manage custom domains" ON public.custom_domains
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = custom_domains.store_id
      AND stores.user_id = auth.uid()
    )
  );

-- Upgrade requests policies
CREATE POLICY "Store owners can manage upgrade requests" ON public.upgrade_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = upgrade_requests.store_id
      AND stores.user_id = auth.uid()
    )
  );

-- Admin can view and manage all upgrade requests
CREATE POLICY "Admin can manage all upgrade requests" ON public.upgrade_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Notices policies
CREATE POLICY "Admin can manage all notices" ON public.notices
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Public can view active notices" ON public.notices
  FOR SELECT USING (status = 'active');

-- Store pages policies
DROP POLICY IF EXISTS "Store owners can manage their pages" ON public.store_pages;
DROP POLICY IF EXISTS "Public can view published pages" ON public.store_pages;

CREATE POLICY "Store owners can manage their pages" ON public.store_pages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = store_pages.store_id
      AND stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Public can view published pages" ON public.store_pages
  FOR SELECT USING (is_published = true);

-- Store members policies
DROP POLICY IF EXISTS "Store owners can manage team members" ON public.store_members;
DROP POLICY IF EXISTS "Team members can view their store" ON public.store_members;

CREATE POLICY "Store owners can manage team members" ON public.store_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = store_members.store_id
      AND stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can view their store" ON public.store_members
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = store_members.store_id
      AND stores.user_id = auth.uid()
    )
  );

-- Store members policies
DROP POLICY IF EXISTS "Store owners can manage team members" ON public.store_members;
DROP POLICY IF EXISTS "Team members can view their store" ON public.store_members;

CREATE POLICY "Store owners can manage team members" ON public.store_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = store_members.store_id
      AND stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can view their store" ON public.store_members
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = store_members.store_id
      AND stores.user_id = auth.uid()
    )
  );

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, avatar_url, role, onboarding_completed)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'role', 'owner'),
    FALSE
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to generate order number
CREATE OR REPLACE FUNCTION public.generate_order_number(store_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  order_count INTEGER;
  prefix TEXT;
BEGIN
  SELECT COUNT(*) + 1 INTO order_count FROM public.orders WHERE store_id = store_uuid;
  prefix := 'ORD';
  RETURN prefix || '-' || LPAD(order_count::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to update customer stats after order
CREATE OR REPLACE FUNCTION public.update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.customers
    SET 
      total_orders = (SELECT COUNT(*) FROM public.orders WHERE customer_id = NEW.customer_id AND status != 'cancelled'),
      total_spent = (SELECT COALESCE(SUM(total), 0) FROM public.orders WHERE customer_id = NEW.customer_id AND status != 'cancelled'),
      last_order_at = NOW()
    WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Drop existing triggers first to avoid conflicts
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_stores_updated_at ON public.stores;
DROP TRIGGER IF EXISTS update_categories_updated_at ON public.categories;
DROP TRIGGER IF EXISTS update_variants_updated_at ON public.variants;
DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
DROP TRIGGER IF EXISTS update_product_variants_updated_at ON public.product_variants;
DROP TRIGGER IF EXISTS update_customers_updated_at ON public.customers;
DROP TRIGGER IF EXISTS update_customer_addresses_updated_at ON public.customer_addresses;
DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
DROP TRIGGER IF EXISTS update_coupons_updated_at ON public.coupons;
DROP TRIGGER IF EXISTS update_reviews_updated_at ON public.reviews;
DROP TRIGGER IF EXISTS update_store_settings_updated_at ON public.store_settings;
DROP TRIGGER IF EXISTS update_store_pages_updated_at ON public.store_pages;
DROP TRIGGER IF EXISTS update_customer_stats_on_order ON public.orders;

-- Add updated_at triggers to all tables
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_stores_updated_at
  BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_variants_updated_at
  BEFORE UPDATE ON public.variants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_variants_updated_at
  BEFORE UPDATE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customer_addresses_updated_at
  BEFORE UPDATE ON public.customer_addresses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_coupons_updated_at
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_store_settings_updated_at
  BEFORE UPDATE ON public.store_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_store_pages_updated_at
  BEFORE UPDATE ON public.store_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to update customer stats after order changes
CREATE TRIGGER update_customer_stats_on_order
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  WHEN (NEW.customer_id IS NOT NULL)
  EXECUTE FUNCTION public.update_customer_stats();

-- ============================================
-- INDEXES
-- ============================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Stores indexes
CREATE INDEX IF NOT EXISTS idx_stores_user_id ON public.stores(user_id);
CREATE INDEX IF NOT EXISTS idx_stores_username ON public.stores(username);
CREATE INDEX IF NOT EXISTS idx_stores_status ON public.stores(status);

-- Custom domains indexes
CREATE INDEX IF NOT EXISTS idx_custom_domains_store_id ON public.custom_domains(store_id);
CREATE INDEX IF NOT EXISTS idx_custom_domains_domain ON public.custom_domains(domain);
CREATE INDEX IF NOT EXISTS idx_custom_domains_status ON public.custom_domains(status);

-- Categories indexes
CREATE INDEX IF NOT EXISTS idx_categories_store_id ON public.categories(store_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_status ON public.categories(status);

-- Variants indexes
CREATE INDEX IF NOT EXISTS idx_variants_store_id ON public.variants(store_id);

-- Products indexes
CREATE INDEX IF NOT EXISTS idx_products_store_id ON public.products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products(featured);

-- Product variants indexes
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_variant_id ON public.product_variants(variant_id);

-- Customers indexes
CREATE INDEX IF NOT EXISTS idx_customers_store_id ON public.customers(store_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_status ON public.customers(status);

-- Customer addresses indexes
CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer_id ON public.customer_addresses(customer_id);

-- Orders indexes
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON public.orders(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);

-- Order items indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);

-- Transactions indexes
CREATE INDEX IF NOT EXISTS idx_transactions_store_id ON public.transactions(store_id);
CREATE INDEX IF NOT EXISTS idx_transactions_order_id ON public.transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at);

-- Payouts indexes
CREATE INDEX IF NOT EXISTS idx_payouts_store_id ON public.payouts(store_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON public.payouts(status);

-- Coupons indexes
CREATE INDEX IF NOT EXISTS idx_coupons_store_id ON public.coupons(store_id);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_status ON public.coupons(status);

-- Reviews indexes
CREATE INDEX IF NOT EXISTS idx_reviews_store_id ON public.reviews(store_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON public.reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_customer_id ON public.reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON public.reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON public.reviews(rating);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_store_id ON public.notifications(store_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON public.notifications(read_at);

-- Support tickets indexes
CREATE INDEX IF NOT EXISTS idx_support_tickets_store_id ON public.support_tickets(store_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_ticket_number ON public.support_tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON public.support_tickets(created_at);

-- Store pages indexes
CREATE INDEX IF NOT EXISTS idx_store_pages_store_id ON public.store_pages(store_id);
CREATE INDEX IF NOT EXISTS idx_store_pages_slug ON public.store_pages(slug);
CREATE INDEX IF NOT EXISTS idx_store_pages_published ON public.store_pages(is_published);
