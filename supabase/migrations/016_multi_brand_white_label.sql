-- Migration: Multi-Brand, White Label & Verticals System
-- Description: Transform SalvadoreX into a B2B multi-tenant platform with white-label capabilities

-- ============================================
-- 1. VERTICALS TABLE (Business Type Templates)
-- ============================================
CREATE TABLE IF NOT EXISTS verticals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE, -- restaurant, cafe, barbershop, retail, etc.
  display_name TEXT NOT NULL, -- "Restaurante", "Cafetería", etc.
  description TEXT,
  icon TEXT, -- lucide icon name

  -- Default modules enabled for this vertical
  default_modules JSONB DEFAULT '[]'::jsonb,
  -- {
  --   "pos": true,
  --   "inventory": true,
  --   "customers": true,
  --   "reports": true,
  --   "digital_menu": true,
  --   "ingredients": true,
  --   "returns": false,
  --   "voice_ordering": false
  -- }

  -- Default settings for this vertical
  default_settings JSONB DEFAULT '{}'::jsonb,
  -- {
  --   "tax_rate": 0.16,
  --   "currency": "MXN",
  --   "language": "es",
  --   "time_zone": "America/Mexico_City",
  --   "features": {
  --     "table_management": true,
  --     "online_ordering": false
  --   }
  -- }

  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. BRANDS TABLE (White Label Accounts)
-- ============================================
CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Brand Identity
  name TEXT NOT NULL, -- "Mi POS", "RestaurantPro", etc.
  slug TEXT UNIQUE NOT NULL, -- URL-friendly: "mi-pos", "restaurant-pro"
  description TEXT,

  -- White Label Branding
  branding JSONB DEFAULT '{}'::jsonb,
  -- {
  --   "logo_url": "https://...",
  --   "logo_dark_url": "https://...",
  --   "favicon_url": "https://...",
  --   "primary_color": "#6366f1",
  --   "secondary_color": "#8b5cf6",
  --   "accent_color": "#ec4899",
  --   "custom_css": "",
  --   "custom_domain": "pos.miempresa.com",
  --   "custom_domain_verified": false
  -- }

  -- Contact & Admin
  owner_email TEXT NOT NULL,
  owner_name TEXT,
  support_email TEXT,
  support_phone TEXT,

  -- Vertical Assignment
  vertical_id UUID REFERENCES verticals(id),

  -- Plan & Billing
  plan TEXT DEFAULT 'free', -- free, starter, pro, enterprise, custom
  max_restaurants INTEGER DEFAULT 1, -- How many sub-accounts (restaurants) allowed
  max_users_per_restaurant INTEGER DEFAULT 5,
  subscription_status TEXT DEFAULT 'active', -- active, suspended, cancelled
  trial_ends_at TIMESTAMPTZ,

  -- Enabled Modules (override vertical defaults)
  enabled_modules JSONB DEFAULT '{}'::jsonb,
  -- {
  --   "pos": true,
  --   "inventory": true,
  --   "customers": true,
  --   "reports": true,
  --   "digital_menu": true,
  --   "ingredients": true,
  --   "returns": false,
  --   "voice_ordering": false,
  --   "ai_features": true
  -- }

  -- Brand Settings
  settings JSONB DEFAULT '{}'::jsonb,
  -- {
  --   "currency": "MXN",
  --   "language": "es",
  --   "time_zone": "America/Mexico_City",
  --   "features": {},
  --   "integrations": {
  --     "stripe": false,
  --     "mercadopago": false,
  --     "whatsapp": false
  --   }
  -- }

  -- Analytics & Metrics
  total_restaurants INTEGER DEFAULT 0,
  total_sales NUMERIC(15,2) DEFAULT 0,
  total_transactions INTEGER DEFAULT 0,

  -- Status
  active BOOLEAN DEFAULT true,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_plan CHECK (plan IN ('free', 'starter', 'pro', 'enterprise', 'custom')),
  CONSTRAINT valid_subscription_status CHECK (
    subscription_status IN ('active', 'trialing', 'suspended', 'cancelled')
  )
);

-- ============================================
-- 3. UPDATE EXISTING TABLES
-- ============================================

-- Add brand_id to users (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'brand_id'
  ) THEN
    ALTER TABLE users ADD COLUMN brand_id UUID REFERENCES brands(id);
  END IF;
END $$;

-- Create restaurants table if it doesn't exist (for multi-restaurant support)
CREATE TABLE IF NOT EXISTS restaurants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,

  -- Restaurant Info
  name TEXT NOT NULL,
  slug TEXT NOT NULL, -- URL-friendly: "sucursal-centro"
  description TEXT,

  -- Contact
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'MX',
  postal_code TEXT,

  -- Location
  latitude NUMERIC(10, 8),
  longitude NUMERIC(11, 8),

  -- Settings (can override brand settings)
  settings JSONB DEFAULT '{}'::jsonb,

  -- Status
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique slug per brand
  UNIQUE(brand_id, slug)
);

-- Update products to link to restaurants (if column doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'restaurant_id_fk'
  ) THEN
    ALTER TABLE products ADD COLUMN restaurant_id_fk UUID REFERENCES restaurants(id);
  END IF;
END $$;

-- ============================================
-- 4. BRAND MODULES (Granular Control)
-- ============================================
CREATE TABLE IF NOT EXISTS brand_modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,

  module_key TEXT NOT NULL, -- pos, inventory, customers, etc.
  enabled BOOLEAN DEFAULT true,

  -- Module-specific configuration
  config JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(brand_id, module_key)
);

-- ============================================
-- 5. BRAND ONBOARDING PROGRESS
-- ============================================
CREATE TABLE IF NOT EXISTS brand_onboarding (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE UNIQUE,

  steps_completed JSONB DEFAULT '[]'::jsonb,
  -- ["brand_info", "branding", "first_restaurant", "first_product", "first_sale"]

  current_step TEXT DEFAULT 'brand_info',
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. FUNCTIONS
-- ============================================

-- Function to get brand with all settings (merged with vertical defaults)
CREATE OR REPLACE FUNCTION get_brand_config(p_brand_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_brand RECORD;
  v_vertical RECORD;
  v_merged_modules JSONB;
  v_merged_settings JSONB;
BEGIN
  -- Get brand
  SELECT * INTO v_brand FROM brands WHERE id = p_brand_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Brand not found';
  END IF;

  -- Get vertical defaults if assigned
  IF v_brand.vertical_id IS NOT NULL THEN
    SELECT * INTO v_vertical FROM verticals WHERE id = v_brand.vertical_id;

    -- Merge vertical defaults with brand overrides
    v_merged_modules := COALESCE(v_vertical.default_modules, '{}'::jsonb) || COALESCE(v_brand.enabled_modules, '{}'::jsonb);
    v_merged_settings := COALESCE(v_vertical.default_settings, '{}'::jsonb) || COALESCE(v_brand.settings, '{}'::jsonb);
  ELSE
    v_merged_modules := COALESCE(v_brand.enabled_modules, '{}'::jsonb);
    v_merged_settings := COALESCE(v_brand.settings, '{}'::jsonb);
  END IF;

  RETURN jsonb_build_object(
    'brand', row_to_json(v_brand),
    'vertical', row_to_json(v_vertical),
    'modules', v_merged_modules,
    'settings', v_merged_settings
  );
END;
$$ LANGUAGE plpgsql;

-- Function to check if module is enabled for brand
CREATE OR REPLACE FUNCTION is_module_enabled(p_brand_id UUID, p_module_key TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_config JSONB;
BEGIN
  v_config := get_brand_config(p_brand_id);
  RETURN COALESCE((v_config->'modules'->>p_module_key)::boolean, false);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. SEED DEFAULT VERTICALS
-- ============================================
INSERT INTO verticals (name, display_name, description, icon, default_modules, default_settings) VALUES
(
  'restaurant',
  'Restaurante',
  'Sistema completo para restaurantes con menú digital, ingredientes y órdenes por voz',
  'UtensilsCrossed',
  '{"pos": true, "inventory": true, "customers": true, "reports": true, "digital_menu": true, "ingredients": true, "returns": true, "voice_ordering": true}'::jsonb,
  '{"tax_rate": 0.16, "currency": "MXN", "language": "es", "features": {"table_management": true, "online_ordering": true, "delivery": true}}'::jsonb
),
(
  'cafe',
  'Cafetería',
  'Ideal para cafeterías y coffee shops con programa de lealtad',
  'Coffee',
  '{"pos": true, "inventory": true, "customers": true, "reports": true, "digital_menu": true, "ingredients": false, "returns": false, "voice_ordering": false}'::jsonb,
  '{"tax_rate": 0.16, "currency": "MXN", "language": "es", "features": {"loyalty_program": true, "online_ordering": true}}'::jsonb
),
(
  'retail',
  'Retail / Tienda',
  'Sistema para tiendas minoristas y boutiques',
  'ShoppingBag',
  '{"pos": true, "inventory": true, "customers": true, "reports": true, "digital_menu": false, "ingredients": false, "returns": true, "voice_ordering": false}'::jsonb,
  '{"tax_rate": 0.16, "currency": "MXN", "language": "es", "features": {"barcode_scanning": true, "product_variants": true}}'::jsonb
),
(
  'barbershop',
  'Barbería / Salón',
  'Sistema para barberías y salones de belleza con citas',
  'Scissors',
  '{"pos": true, "inventory": true, "customers": true, "reports": true, "digital_menu": false, "ingredients": false, "returns": false, "voice_ordering": false}'::jsonb,
  '{"tax_rate": 0.16, "currency": "MXN", "language": "es", "features": {"appointments": true, "staff_management": true}}'::jsonb
),
(
  'food_truck',
  'Food Truck',
  'Sistema móvil para food trucks y negocios ambulantes',
  'Truck',
  '{"pos": true, "inventory": true, "customers": false, "reports": true, "digital_menu": true, "ingredients": true, "returns": false, "voice_ordering": false}'::jsonb,
  '{"tax_rate": 0.16, "currency": "MXN", "language": "es", "features": {"mobile_optimized": true, "offline_mode": true}}'::jsonb
),
(
  'bar',
  'Bar / Cantina',
  'Sistema para bares y cantinas con control de inventario de bebidas',
  'Beer',
  '{"pos": true, "inventory": true, "customers": true, "reports": true, "digital_menu": true, "ingredients": true, "returns": false, "voice_ordering": false}'::jsonb,
  '{"tax_rate": 0.16, "currency": "MXN", "language": "es", "features": {"age_verification": true, "tab_management": true}}'::jsonb
)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 8. INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_brands_slug ON brands(slug);
CREATE INDEX IF NOT EXISTS idx_brands_owner_email ON brands(owner_email);
CREATE INDEX IF NOT EXISTS idx_brands_vertical_id ON brands(vertical_id);
CREATE INDEX IF NOT EXISTS idx_brands_active ON brands(active);

CREATE INDEX IF NOT EXISTS idx_restaurants_brand_id ON restaurants(brand_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON restaurants(slug);
CREATE INDEX IF NOT EXISTS idx_restaurants_active ON restaurants(active);

CREATE INDEX IF NOT EXISTS idx_brand_modules_brand_id ON brand_modules(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_modules_module_key ON brand_modules(module_key);

CREATE INDEX IF NOT EXISTS idx_verticals_name ON verticals(name);
CREATE INDEX IF NOT EXISTS idx_verticals_active ON verticals(active);

-- ============================================
-- 9. ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE verticals ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_onboarding ENABLE ROW LEVEL SECURITY;

-- Brands: Users can only see their own brand
CREATE POLICY "Users can view their brand"
  ON brands FOR SELECT
  USING (
    id IN (SELECT brand_id FROM users WHERE id = auth.uid())
    OR owner_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Note: SUPER_ADMIN role policy will be added in migration 017_add_super_admin_role.sql
-- after the enum is updated

-- Restaurants: Users can see restaurants from their brand
CREATE POLICY "Users can view their brand's restaurants"
  ON restaurants FOR SELECT
  USING (
    brand_id IN (SELECT brand_id FROM users WHERE id = auth.uid())
  );

-- Brand modules: Users can see their brand's modules
CREATE POLICY "Users can view their brand's modules"
  ON brand_modules FOR SELECT
  USING (
    brand_id IN (SELECT brand_id FROM users WHERE id = auth.uid())
  );

-- Verticals: Anyone can view active verticals (for onboarding)
CREATE POLICY "Anyone can view active verticals"
  ON verticals FOR SELECT
  USING (active = true);

-- Brand onboarding: Users can view their brand's onboarding
CREATE POLICY "Users can view their brand's onboarding"
  ON brand_onboarding FOR SELECT
  USING (
    brand_id IN (SELECT brand_id FROM users WHERE id = auth.uid())
  );

-- ============================================
-- 10. TRIGGERS
-- ============================================

-- Trigger for updated_at on brands
DROP TRIGGER IF EXISTS trigger_update_brands_updated_at ON brands;
CREATE TRIGGER trigger_update_brands_updated_at
  BEFORE UPDATE ON brands
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for updated_at on restaurants
DROP TRIGGER IF EXISTS trigger_update_restaurants_updated_at ON restaurants;
CREATE TRIGGER trigger_update_restaurants_updated_at
  BEFORE UPDATE ON restaurants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for updated_at on verticals
DROP TRIGGER IF EXISTS trigger_update_verticals_updated_at ON verticals;
CREATE TRIGGER trigger_update_verticals_updated_at
  BEFORE UPDATE ON verticals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 11. GRANTS
-- ============================================
GRANT ALL ON brands TO authenticated;
GRANT ALL ON restaurants TO authenticated;
GRANT ALL ON brand_modules TO authenticated;
GRANT ALL ON verticals TO authenticated;
GRANT ALL ON brand_onboarding TO authenticated;

GRANT EXECUTE ON FUNCTION get_brand_config TO authenticated;
GRANT EXECUTE ON FUNCTION is_module_enabled TO authenticated;

-- ============================================
-- 12. COMMENTS
-- ============================================
COMMENT ON TABLE brands IS 'White label brands - master accounts for B2B customers';
COMMENT ON TABLE restaurants IS 'Sub-accounts (locations/branches) under a brand';
COMMENT ON TABLE verticals IS 'Business type templates with default modules and settings';
COMMENT ON TABLE brand_modules IS 'Granular control of enabled modules per brand';
COMMENT ON TABLE brand_onboarding IS 'Track onboarding progress for new brands';

COMMENT ON FUNCTION get_brand_config IS 'Get complete brand configuration with vertical defaults merged';
COMMENT ON FUNCTION is_module_enabled IS 'Check if a specific module is enabled for a brand';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Multi-Brand & White Label system created successfully!';
  RAISE NOTICE 'Features: White Label Branding, Verticals, Module Control, Multi-Restaurant';
END $$;
