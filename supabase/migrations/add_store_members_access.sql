-- Migration: Add store members access to RLS policies
-- This allows users who are members of a store (via store_members table) to access that store's data

-- ============================================
-- HELPER FUNCTION: Check if user is store member or owner
-- ============================================
CREATE OR REPLACE FUNCTION public.is_store_member_or_owner(store_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    -- User is the owner
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = store_uuid
      AND stores.user_id = auth.uid()
    )
    OR
    -- User is a member
    EXISTS (
      SELECT 1 FROM public.store_members
      WHERE store_members.store_id = store_uuid
      AND store_members.user_id = auth.uid()
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- UPDATE STORES POLICIES
-- ============================================
DROP POLICY IF EXISTS "Store members can view their stores" ON public.stores;
CREATE POLICY "Store members can view their stores" ON public.stores
  FOR SELECT USING (
    public.is_store_member_or_owner(stores.id)
  );

-- ============================================
-- UPDATE CATEGORIES POLICIES
-- ============================================
DROP POLICY IF EXISTS "Store members can manage categories" ON public.categories;
CREATE POLICY "Store members can manage categories" ON public.categories
  FOR ALL USING (
    public.is_store_member_or_owner(categories.store_id)
  );

-- ============================================
-- UPDATE VARIANTS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Store members can manage variants" ON public.variants;
CREATE POLICY "Store members can manage variants" ON public.variants
  FOR ALL USING (
    public.is_store_member_or_owner(variants.store_id)
  );

-- ============================================
-- UPDATE PRODUCTS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Store members can manage products" ON public.products;
CREATE POLICY "Store members can manage products" ON public.products
  FOR ALL USING (
    public.is_store_member_or_owner(products.store_id)
  );

-- ============================================
-- UPDATE PRODUCT_VARIANTS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Store members can manage product variants" ON public.product_variants;
CREATE POLICY "Store members can manage product variants" ON public.product_variants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = product_variants.product_id
      AND public.is_store_member_or_owner(products.store_id)
    )
  );

-- ============================================
-- UPDATE CUSTOMERS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Store members can manage customers" ON public.customers;
CREATE POLICY "Store members can manage customers" ON public.customers
  FOR ALL USING (
    public.is_store_member_or_owner(customers.store_id)
  );

-- ============================================
-- UPDATE CUSTOMER_ADDRESSES POLICIES
-- ============================================
DROP POLICY IF EXISTS "Store members can manage customer addresses" ON public.customer_addresses;
CREATE POLICY "Store members can manage customer addresses" ON public.customer_addresses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.customers
      WHERE customers.id = customer_addresses.customer_id
      AND public.is_store_member_or_owner(customers.store_id)
    )
  );

-- ============================================
-- UPDATE ORDERS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Store members can manage orders" ON public.orders;
CREATE POLICY "Store members can manage orders" ON public.orders
  FOR ALL USING (
    public.is_store_member_or_owner(orders.store_id)
  );

-- ============================================
-- UPDATE ORDER_ITEMS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Store members can manage order items" ON public.order_items;
CREATE POLICY "Store members can manage order items" ON public.order_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
      AND public.is_store_member_or_owner(orders.store_id)
    )
  );

-- ============================================
-- UPDATE TRANSACTIONS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Store members can view transactions" ON public.transactions;
CREATE POLICY "Store members can view transactions" ON public.transactions
  FOR SELECT USING (
    public.is_store_member_or_owner(transactions.store_id)
  );

-- ============================================
-- UPDATE PAYOUTS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Store members can view payouts" ON public.payouts;
CREATE POLICY "Store members can view payouts" ON public.payouts
  FOR SELECT USING (
    public.is_store_member_or_owner(payouts.store_id)
  );

-- ============================================
-- UPDATE COUPONS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Store members can manage coupons" ON public.coupons;
CREATE POLICY "Store members can manage coupons" ON public.coupons
  FOR ALL USING (
    public.is_store_member_or_owner(coupons.store_id)
  );

-- ============================================
-- UPDATE REVIEWS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Store members can manage reviews" ON public.reviews;
CREATE POLICY "Store members can manage reviews" ON public.reviews
  FOR ALL USING (
    public.is_store_member_or_owner(reviews.store_id)
  );

-- ============================================
-- UPDATE SUPPORT_TICKETS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Store members can manage their support tickets" ON public.support_tickets;
CREATE POLICY "Store members can manage their support tickets" ON public.support_tickets
  FOR ALL USING (
    public.is_store_member_or_owner(support_tickets.store_id)
  );

-- ============================================
-- UPDATE STORE_SETTINGS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Store members can manage store settings" ON public.store_settings;
CREATE POLICY "Store members can manage store settings" ON public.store_settings
  FOR ALL USING (
    public.is_store_member_or_owner(store_settings.store_id)
  );

-- ============================================
-- UPDATE CUSTOM_DOMAINS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Store members can manage custom domains" ON public.custom_domains;
CREATE POLICY "Store members can manage custom domains" ON public.custom_domains
  FOR ALL USING (
    public.is_store_member_or_owner(custom_domains.store_id)
  );

-- ============================================
-- UPDATE UPGRADE_REQUESTS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Store members can manage upgrade requests" ON public.upgrade_requests;
CREATE POLICY "Store members can manage upgrade requests" ON public.upgrade_requests
  FOR ALL USING (
    public.is_store_member_or_owner(upgrade_requests.store_id)
  );

-- ============================================
-- UPDATE STORE_PAGES POLICIES
-- ============================================
DROP POLICY IF EXISTS "Store members can manage their pages" ON public.store_pages;
CREATE POLICY "Store members can manage their pages" ON public.store_pages
  FOR ALL USING (
    public.is_store_member_or_owner(store_pages.store_id)
  );

-- ============================================
-- ADD INDEXES FOR STORE_MEMBERS
-- ============================================
CREATE INDEX IF NOT EXISTS idx_store_members_user_id ON public.store_members(user_id);
CREATE INDEX IF NOT EXISTS idx_store_members_store_id ON public.store_members(store_id);
CREATE INDEX IF NOT EXISTS idx_store_members_role ON public.store_members(role);

