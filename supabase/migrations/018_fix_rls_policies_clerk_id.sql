-- Migration: Fix RLS Policies - Use correct clerk_id column
-- Description: Fix policies that incorrectly referenced clerk_user_id instead of clerk_id

-- ============================================
-- FIX BRANDS POLICIES
-- ============================================

-- Drop incorrect policies
DROP POLICY IF EXISTS "Super admins can view all brands" ON brands;
DROP POLICY IF EXISTS "Super admins can manage all brands" ON brands;

-- Create correct policies using clerk_id
CREATE POLICY "Super admins can view all brands"
  ON brands FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.clerk_id = (SELECT raw_user_meta_data->>'clerk_id' FROM auth.users WHERE id = auth.uid())
      AND users.role = 'SUPER_ADMIN'
    )
  );

CREATE POLICY "Super admins can manage all brands"
  ON brands FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.clerk_id = (SELECT raw_user_meta_data->>'clerk_id' FROM auth.users WHERE id = auth.uid())
      AND users.role = 'SUPER_ADMIN'
    )
  );

-- ============================================
-- FIX RESTAURANTS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Super admins can view all restaurants" ON restaurants;

CREATE POLICY "Super admins can view all restaurants"
  ON restaurants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.clerk_id = (SELECT raw_user_meta_data->>'clerk_id' FROM auth.users WHERE id = auth.uid())
      AND users.role = 'SUPER_ADMIN'
    )
  );

-- ============================================
-- FIX VERTICALS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Super admins can manage verticals" ON verticals;

CREATE POLICY "Super admins can manage verticals"
  ON verticals FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.clerk_id = (SELECT raw_user_meta_data->>'clerk_id' FROM auth.users WHERE id = auth.uid())
      AND users.role = 'SUPER_ADMIN'
    )
  );

-- ============================================
-- ALTERNATIVE: Simplified policies using email matching
-- If the above doesn't work, we can use email-based authentication
-- ============================================

-- For brands - match owner_email with current user email
DROP POLICY IF EXISTS "Users can view their brand" ON brands;
CREATE POLICY "Users can view their brand"
  ON brands FOR SELECT
  USING (
    owner_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.clerk_id = (SELECT raw_user_meta_data->>'clerk_id' FROM auth.users WHERE id = auth.uid())
      AND users.role = 'SUPER_ADMIN'
    )
  );

-- For brand updates - only owner or super admin
CREATE POLICY "Users can update their brand"
  ON brands FOR UPDATE
  USING (
    owner_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.clerk_id = (SELECT raw_user_meta_data->>'clerk_id' FROM auth.users WHERE id = auth.uid())
      AND users.role = 'SUPER_ADMIN'
    )
  );

-- For brand inserts - authenticated users can create brands
CREATE POLICY "Authenticated users can create brands"
  ON brands FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON POLICY "Super admins can view all brands" ON brands IS
  'Super admins can view all brands across the platform';

COMMENT ON POLICY "Users can view their brand" ON brands IS
  'Brand owners can view their own brand';

COMMENT ON POLICY "Users can update their brand" ON brands IS
  'Brand owners and super admins can update brands';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ RLS Policies fixed! Using correct clerk_id column.';
  RAISE NOTICE 'Users can now access brands based on owner_email or SUPER_ADMIN role.';
END $$;
