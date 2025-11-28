-- Migration: Add SUPER_ADMIN role to user_role enum (PART 1 - Enum Only)
-- Description: Add SUPER_ADMIN value to user_role enum
-- IMPORTANT: This migration only adds the enum value. Policies are in migration 018.

-- ============================================
-- STEP 1: Add SUPER_ADMIN to enum
-- ============================================
DO $$
BEGIN
  -- Check if the enum type exists
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    -- Add SUPER_ADMIN to the enum if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum
      WHERE enumtypid = 'user_role'::regtype
      AND enumlabel = 'SUPER_ADMIN'
    ) THEN
      ALTER TYPE user_role ADD VALUE 'SUPER_ADMIN';
      RAISE NOTICE 'Added SUPER_ADMIN to user_role enum';
    ELSE
      RAISE NOTICE 'SUPER_ADMIN already exists in user_role enum';
    END IF;
  ELSE
    -- If enum doesn't exist, create it with all values
    CREATE TYPE user_role AS ENUM ('ADMIN', 'USER', 'CUSTOMER', 'SUPER_ADMIN');
    RAISE NOTICE 'Created user_role enum with SUPER_ADMIN';
  END IF;
END $$;

-- ============================================
-- STEP 2: Ensure users table has role column
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'role'
  ) THEN
    ALTER TABLE users ADD COLUMN role user_role DEFAULT 'USER';
    RAISE NOTICE 'Added role column to users table';
  ELSE
    RAISE NOTICE 'Role column already exists in users table';
  END IF;
END $$;

-- ============================================
-- STEP 3: Create index on role for faster queries
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ============================================
-- STEP 4: Add comment
-- ============================================
COMMENT ON TYPE user_role IS 'User roles: ADMIN (restaurant admin), USER (staff), CUSTOMER (end customer), SUPER_ADMIN (platform admin)';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ SUPER_ADMIN role added to enum successfully!';
  RAISE NOTICE '⚠️  IMPORTANT: Run migration 018 next to update RLS policies.';
  RAISE NOTICE 'The enum value has been added and committed.';
END $$;
