-- Migration: Complete Business Verticals System
-- Description: 250+ business verticals with modules, terminology, and custom configurations

-- ============================================
-- 1. VERTICAL CATEGORIES (Industry Groups)
-- ============================================
CREATE TABLE IF NOT EXISTS vertical_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  display_name_en TEXT,
  description TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. SYSTEM MODULES (Master List)
-- ============================================
CREATE TABLE IF NOT EXISTS system_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  description_en TEXT,
  icon TEXT,
  category TEXT DEFAULT 'core', -- core, sales, operations, marketing, ai, integrations
  is_premium BOOLEAN DEFAULT false,
  is_ai_feature BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. EXTEND VERTICALS TABLE
-- ============================================
DO $$
BEGIN
  -- Add category_id if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'verticals' AND column_name = 'category_id') THEN
    ALTER TABLE verticals ADD COLUMN category_id UUID REFERENCES vertical_categories(id);
  END IF;
  
  -- Add slug for URL-friendly names
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'verticals' AND column_name = 'slug') THEN
    ALTER TABLE verticals ADD COLUMN slug TEXT;
  END IF;
  
  -- Add English name
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'verticals' AND column_name = 'display_name_en') THEN
    ALTER TABLE verticals ADD COLUMN display_name_en TEXT;
  END IF;
  
  -- Add description in English
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'verticals' AND column_name = 'description_en') THEN
    ALTER TABLE verticals ADD COLUMN description_en TEXT;
  END IF;
  
  -- Add suggested system name
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'verticals' AND column_name = 'suggested_system_name') THEN
    ALTER TABLE verticals ADD COLUMN suggested_system_name TEXT;
  END IF;
  
  -- Add suggested domain prefix
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'verticals' AND column_name = 'suggested_domain_prefix') THEN
    ALTER TABLE verticals ADD COLUMN suggested_domain_prefix TEXT;
  END IF;
  
  -- Add sort order
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'verticals' AND column_name = 'sort_order') THEN
    ALTER TABLE verticals ADD COLUMN sort_order INTEGER DEFAULT 0;
  END IF;
  
  -- Add popularity score
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'verticals' AND column_name = 'popularity_score') THEN
    ALTER TABLE verticals ADD COLUMN popularity_score INTEGER DEFAULT 0;
  END IF;
END $$;

-- Create unique index on slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_verticals_slug ON verticals(slug) WHERE slug IS NOT NULL;

-- ============================================
-- 4. VERTICAL TERMINOLOGY (Custom Labels)
-- ============================================
CREATE TABLE IF NOT EXISTS vertical_terminology (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical_id UUID NOT NULL REFERENCES verticals(id) ON DELETE CASCADE,
  
  -- Entity labels (singular/plural in Spanish and English)
  customer_singular TEXT DEFAULT 'Cliente',
  customer_plural TEXT DEFAULT 'Clientes',
  customer_singular_en TEXT DEFAULT 'Customer',
  customer_plural_en TEXT DEFAULT 'Customers',
  
  product_singular TEXT DEFAULT 'Producto',
  product_plural TEXT DEFAULT 'Productos',
  product_singular_en TEXT DEFAULT 'Product',
  product_plural_en TEXT DEFAULT 'Products',
  
  order_singular TEXT DEFAULT 'Orden',
  order_plural TEXT DEFAULT 'Órdenes',
  order_singular_en TEXT DEFAULT 'Order',
  order_plural_en TEXT DEFAULT 'Orders',
  
  sale_singular TEXT DEFAULT 'Venta',
  sale_plural TEXT DEFAULT 'Ventas',
  sale_singular_en TEXT DEFAULT 'Sale',
  sale_plural_en TEXT DEFAULT 'Sales',
  
  inventory_label TEXT DEFAULT 'Inventario',
  inventory_label_en TEXT DEFAULT 'Inventory',
  
  category_singular TEXT DEFAULT 'Categoría',
  category_plural TEXT DEFAULT 'Categorías',
  category_singular_en TEXT DEFAULT 'Category',
  category_plural_en TEXT DEFAULT 'Categories',
  
  staff_singular TEXT DEFAULT 'Empleado',
  staff_plural TEXT DEFAULT 'Empleados',
  staff_singular_en TEXT DEFAULT 'Employee',
  staff_plural_en TEXT DEFAULT 'Employees',
  
  appointment_singular TEXT DEFAULT 'Cita',
  appointment_plural TEXT DEFAULT 'Citas',
  appointment_singular_en TEXT DEFAULT 'Appointment',
  appointment_plural_en TEXT DEFAULT 'Appointments',
  
  table_singular TEXT DEFAULT 'Mesa',
  table_plural TEXT DEFAULT 'Mesas',
  table_singular_en TEXT DEFAULT 'Table',
  table_plural_en TEXT DEFAULT 'Tables',
  
  ticket_singular TEXT DEFAULT 'Ticket',
  ticket_plural TEXT DEFAULT 'Tickets',
  ticket_singular_en TEXT DEFAULT 'Ticket',
  ticket_plural_en TEXT DEFAULT 'Tickets',
  
  -- Additional custom terms as JSONB
  custom_terms JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(vertical_id)
);

-- ============================================
-- 5. VERTICAL MODULE CONFIGURATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS vertical_module_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical_id UUID NOT NULL REFERENCES verticals(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES system_modules(id) ON DELETE CASCADE,
  
  enabled_by_default BOOLEAN DEFAULT false,
  is_required BOOLEAN DEFAULT false, -- Cannot be disabled
  is_recommended BOOLEAN DEFAULT false,
  
  -- Module-specific default configuration
  default_config JSONB DEFAULT '{}'::jsonb,
  
  -- Display customization for this vertical
  custom_name TEXT,
  custom_description TEXT,
  
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(vertical_id, module_id)
);

-- ============================================
-- 6. VERTICAL FEATURES (Special Capabilities)
-- ============================================
CREATE TABLE IF NOT EXISTS vertical_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical_id UUID NOT NULL REFERENCES verticals(id) ON DELETE CASCADE,
  
  feature_key TEXT NOT NULL,
  feature_name TEXT NOT NULL,
  feature_name_en TEXT,
  description TEXT,
  description_en TEXT,
  
  enabled_by_default BOOLEAN DEFAULT true,
  is_premium BOOLEAN DEFAULT false,
  
  config JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(vertical_id, feature_key)
);

-- ============================================
-- 7. INSERT SYSTEM MODULES
-- ============================================
INSERT INTO system_modules (key, name, name_en, description, description_en, icon, category, is_premium, is_ai_feature, sort_order) VALUES
-- Core Modules
('pos', 'Punto de Venta', 'Point of Sale', 'Terminal de ventas con cobro de efectivo, tarjeta y múltiples métodos de pago', 'Sales terminal with cash, card and multiple payment methods', 'CreditCard', 'core', false, false, 1),
('inventory', 'Inventario', 'Inventory', 'Control de existencias, alertas de stock bajo y movimientos', 'Stock control, low stock alerts and movements', 'Package', 'core', false, false, 2),
('customers', 'Clientes', 'Customers', 'Base de datos de clientes con historial de compras', 'Customer database with purchase history', 'Users', 'core', false, false, 3),
('reports', 'Reportes', 'Reports', 'Reportes de ventas, productos más vendidos y estadísticas', 'Sales reports, best sellers and statistics', 'BarChart3', 'core', false, false, 4),
('categories', 'Categorías', 'Categories', 'Organización de productos en categorías y subcategorías', 'Product organization in categories and subcategories', 'FolderTree', 'core', false, false, 5),

-- Sales Modules
('digital_menu', 'Menú Digital', 'Digital Menu', 'Menú digital con QR para clientes', 'Digital menu with QR for customers', 'QrCode', 'sales', false, false, 10),
('online_ordering', 'Pedidos en Línea', 'Online Ordering', 'Sistema de pedidos en línea para delivery o pickup', 'Online ordering system for delivery or pickup', 'ShoppingCart', 'sales', true, false, 11),
('delivery', 'Entregas', 'Delivery', 'Gestión de entregas a domicilio', 'Home delivery management', 'Truck', 'sales', true, false, 12),
('reservations', 'Reservaciones', 'Reservations', 'Sistema de reservaciones con calendario', 'Reservation system with calendar', 'Calendar', 'sales', false, false, 13),
('quotes', 'Cotizaciones', 'Quotes', 'Generación de cotizaciones para clientes', 'Quote generation for customers', 'FileText', 'sales', false, false, 14),

-- Operations Modules
('ingredients', 'Ingredientes', 'Ingredients', 'Control de ingredientes y recetas con costeo', 'Ingredient and recipe control with costing', 'Utensils', 'operations', true, false, 20),
('returns', 'Devoluciones', 'Returns', 'Gestión de devoluciones y cambios', 'Returns and exchanges management', 'RotateCcw', 'operations', false, false, 21),
('suppliers', 'Proveedores', 'Suppliers', 'Gestión de proveedores y órdenes de compra', 'Supplier and purchase order management', 'Factory', 'operations', true, false, 22),
('appointments', 'Citas', 'Appointments', 'Sistema de citas y agenda', 'Appointment and schedule system', 'CalendarCheck', 'operations', false, false, 23),
('staff_management', 'Personal', 'Staff', 'Gestión de empleados y horarios', 'Employee and schedule management', 'UserCog', 'operations', true, false, 24),
('table_management', 'Mesas', 'Tables', 'Gestión de mesas y zonas del establecimiento', 'Table and zone management', 'Grid3x3', 'operations', false, false, 25),
('kitchen_display', 'Pantalla Cocina', 'Kitchen Display', 'Sistema de display para cocina (KDS)', 'Kitchen Display System (KDS)', 'MonitorPlay', 'operations', true, false, 26),
('queue_management', 'Fila Virtual', 'Virtual Queue', 'Sistema de fila virtual y turnos', 'Virtual queue and turn system', 'ListOrdered', 'operations', false, false, 27),
('tab_management', 'Comandas', 'Tabs', 'Gestión de comandas y cuentas abiertas', 'Tab and open check management', 'ClipboardList', 'operations', false, false, 28),

-- Marketing Modules
('loyalty_program', 'Programa Lealtad', 'Loyalty Program', 'Puntos y recompensas para clientes frecuentes', 'Points and rewards for frequent customers', 'Gift', 'marketing', true, false, 30),
('promotions', 'Promociones', 'Promotions', 'Cupones, descuentos y ofertas especiales', 'Coupons, discounts and special offers', 'Percent', 'marketing', false, false, 31),
('email_marketing', 'Email Marketing', 'Email Marketing', 'Campañas de email a clientes', 'Email campaigns to customers', 'Mail', 'marketing', true, false, 32),
('whatsapp_integration', 'WhatsApp', 'WhatsApp', 'Notificaciones y pedidos por WhatsApp', 'Notifications and orders via WhatsApp', 'MessageCircle', 'integrations', true, false, 33),

-- AI Modules
('voice_ordering', 'Órdenes por Voz', 'Voice Ordering', 'Toma de pedidos por voz con IA', 'Voice order taking with AI', 'Mic', 'ai', true, true, 40),
('ai_menu_digitalization', 'Digitalización IA', 'AI Digitalization', 'Digitalizar menú con fotos usando IA', 'Digitize menu from photos using AI', 'Sparkles', 'ai', true, true, 41),
('ai_image_generation', 'Imágenes IA', 'AI Images', 'Generar imágenes de productos con IA', 'Generate product images with AI', 'ImagePlus', 'ai', true, true, 42),
('ai_analytics', 'Análisis IA', 'AI Analytics', 'Predicciones y recomendaciones con IA', 'Predictions and recommendations with AI', 'Brain', 'ai', true, true, 43),

-- Compliance & Special
('age_verification', 'Verificación Edad', 'Age Verification', 'Verificación de mayoría de edad para ventas restringidas', 'Age verification for restricted sales', 'ShieldCheck', 'compliance', false, false, 50),
('barcode_scanning', 'Escaneo Códigos', 'Barcode Scanning', 'Escaneo de códigos de barras y QR', 'Barcode and QR scanning', 'ScanLine', 'operations', false, false, 51),
('product_variants', 'Variantes', 'Variants', 'Variantes de productos (tallas, colores, etc.)', 'Product variants (sizes, colors, etc.)', 'Layers', 'core', false, false, 52),
('serial_numbers', 'Números de Serie', 'Serial Numbers', 'Tracking de productos por número de serie', 'Product tracking by serial number', 'Hash', 'operations', false, false, 53),
('expiry_tracking', 'Control Caducidad', 'Expiry Tracking', 'Control de fechas de caducidad', 'Expiry date control', 'CalendarX', 'operations', false, false, 54),
('batch_tracking', 'Lotes', 'Batch Tracking', 'Tracking de productos por lote', 'Product tracking by batch', 'Boxes', 'operations', false, false, 55),

-- Integrations
('payment_terminals', 'Terminales Pago', 'Payment Terminals', 'Integración con terminales de pago (Clip, MercadoPago)', 'Integration with payment terminals (Clip, MercadoPago)', 'Nfc', 'integrations', false, false, 60),
('fiscal_printer', 'Impresora Fiscal', 'Fiscal Printer', 'Integración con impresoras fiscales', 'Fiscal printer integration', 'Printer', 'integrations', true, false, 61),
('accounting_sync', 'Contabilidad', 'Accounting', 'Sincronización con sistemas contables', 'Accounting system sync', 'Calculator', 'integrations', true, false, 62),
('ecommerce_sync', 'E-commerce', 'E-commerce', 'Sincronización con tiendas en línea', 'Online store sync', 'Globe', 'integrations', true, false, 63)

ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  name_en = EXCLUDED.name_en,
  description = EXCLUDED.description,
  description_en = EXCLUDED.description_en,
  icon = EXCLUDED.icon,
  category = EXCLUDED.category,
  is_premium = EXCLUDED.is_premium,
  is_ai_feature = EXCLUDED.is_ai_feature,
  sort_order = EXCLUDED.sort_order;

-- ============================================
-- 8. INSERT VERTICAL CATEGORIES
-- ============================================
INSERT INTO vertical_categories (name, display_name, display_name_en, description, icon, sort_order) VALUES
('grocery', 'Abarrotes y Alimentos', 'Grocery & Food', 'Tiendas de abarrotes, supermercados, alimentos frescos', 'ShoppingBasket', 1),
('beverages', 'Bebidas, Vinos y Tabaco', 'Beverages, Wine & Tobacco', 'Licorería, vinatería, cerveza artesanal, tabaco', 'Wine', 2),
('restaurants', 'Restaurantes y Comida', 'Restaurants & Food', 'Restaurantes, cafeterías, comida rápida, food trucks', 'UtensilsCrossed', 3),
('fashion', 'Moda y Accesorios', 'Fashion & Accessories', 'Ropa, zapatos, bolsos, accesorios de moda', 'Shirt', 4),
('technology', 'Tecnología y Electrónica', 'Technology & Electronics', 'Celulares, computadoras, electrónica, gaming', 'Smartphone', 5),
('home', 'Hogar y Decoración', 'Home & Decor', 'Muebles, decoración, blancos, cocina', 'Home', 6),
('hardware', 'Ferretería y Construcción', 'Hardware & Construction', 'Ferretería, materiales, herramientas, pinturas', 'Hammer', 7),
('pets', 'Mascotas', 'Pets', 'Tiendas de mascotas, alimentos, accesorios', 'PawPrint', 8),
('automotive', 'Automotriz', 'Automotive', 'Refacciones, autopartes, llantas, accesorios', 'Car', 9),
('office', 'Papelería y Oficina', 'Office & Stationery', 'Papelería, libros, útiles escolares, arte', 'Pencil', 10),
('beauty', 'Belleza y Estética', 'Beauty & Grooming', 'Cosméticos, perfumería, salón, barbería', 'Sparkle', 11),
('sports', 'Deportes y Aire Libre', 'Sports & Outdoors', 'Artículos deportivos, camping, ciclismo', 'Dumbbell', 12),
('kids', 'Niños y Bebés', 'Kids & Baby', 'Juguetería, ropa infantil, artículos para bebé', 'Baby', 13),
('specialty', 'Tiendas Especializadas', 'Specialty Stores', 'Florerías, regalos, artículos religiosos, otros', 'Store', 14),
('services', 'Servicios', 'Services', 'Servicios profesionales, reparaciones, salud', 'Briefcase', 15),
('health', 'Salud y Bienestar', 'Health & Wellness', 'Farmacias, clínicas, consultorios, spa', 'Heart', 16)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  display_name_en = EXCLUDED.display_name_en,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order;

-- ============================================
-- 9. INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_vertical_categories_sort ON vertical_categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_system_modules_category ON system_modules(category);
CREATE INDEX IF NOT EXISTS idx_system_modules_key ON system_modules(key);
CREATE INDEX IF NOT EXISTS idx_vertical_terminology_vertical ON vertical_terminology(vertical_id);
CREATE INDEX IF NOT EXISTS idx_vertical_module_configs_vertical ON vertical_module_configs(vertical_id);
CREATE INDEX IF NOT EXISTS idx_vertical_module_configs_module ON vertical_module_configs(module_id);
CREATE INDEX IF NOT EXISTS idx_vertical_features_vertical ON vertical_features(vertical_id);
CREATE INDEX IF NOT EXISTS idx_verticals_category ON verticals(category_id);
CREATE INDEX IF NOT EXISTS idx_verticals_popularity ON verticals(popularity_score DESC);

-- ============================================
-- 10. RLS POLICIES
-- ============================================
ALTER TABLE vertical_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE vertical_terminology ENABLE ROW LEVEL SECURITY;
ALTER TABLE vertical_module_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE vertical_features ENABLE ROW LEVEL SECURITY;

-- Public read access for categories and modules (needed for onboarding)
CREATE POLICY "Anyone can view categories" ON vertical_categories FOR SELECT USING (active = true);
CREATE POLICY "Anyone can view modules" ON system_modules FOR SELECT USING (active = true);
CREATE POLICY "Anyone can view terminology" ON vertical_terminology FOR SELECT USING (true);
CREATE POLICY "Anyone can view module configs" ON vertical_module_configs FOR SELECT USING (true);
CREATE POLICY "Anyone can view features" ON vertical_features FOR SELECT USING (true);

-- ============================================
-- 11. GRANTS
-- ============================================
GRANT SELECT ON vertical_categories TO anon, authenticated;
GRANT SELECT ON system_modules TO anon, authenticated;
GRANT SELECT ON vertical_terminology TO anon, authenticated;
GRANT SELECT ON vertical_module_configs TO anon, authenticated;
GRANT SELECT ON vertical_features TO anon, authenticated;

GRANT ALL ON vertical_categories TO authenticated;
GRANT ALL ON system_modules TO authenticated;
GRANT ALL ON vertical_terminology TO authenticated;
GRANT ALL ON vertical_module_configs TO authenticated;
GRANT ALL ON vertical_features TO authenticated;

-- ============================================
-- 12. HELPER FUNCTIONS
-- ============================================

-- Function to get vertical with all configurations
CREATE OR REPLACE FUNCTION get_vertical_config(p_vertical_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_vertical RECORD;
  v_terminology RECORD;
  v_modules JSONB;
  v_features JSONB;
BEGIN
  -- Get vertical
  SELECT * INTO v_vertical FROM verticals WHERE id = p_vertical_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Get terminology
  SELECT * INTO v_terminology FROM vertical_terminology WHERE vertical_id = p_vertical_id;
  
  -- Get enabled modules
  SELECT jsonb_agg(jsonb_build_object(
    'module_key', sm.key,
    'module_name', sm.name,
    'enabled_by_default', vmc.enabled_by_default,
    'is_required', vmc.is_required,
    'is_recommended', vmc.is_recommended,
    'custom_name', vmc.custom_name,
    'default_config', vmc.default_config
  )) INTO v_modules
  FROM vertical_module_configs vmc
  JOIN system_modules sm ON sm.id = vmc.module_id
  WHERE vmc.vertical_id = p_vertical_id;
  
  -- Get features
  SELECT jsonb_agg(jsonb_build_object(
    'feature_key', feature_key,
    'feature_name', feature_name,
    'enabled_by_default', enabled_by_default,
    'config', config
  )) INTO v_features
  FROM vertical_features
  WHERE vertical_id = p_vertical_id;
  
  RETURN jsonb_build_object(
    'vertical', row_to_json(v_vertical),
    'terminology', row_to_json(v_terminology),
    'modules', COALESCE(v_modules, '[]'::jsonb),
    'features', COALESCE(v_features, '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get verticals by category
CREATE OR REPLACE FUNCTION get_verticals_by_category(p_category_name TEXT)
RETURNS SETOF verticals AS $$
BEGIN
  RETURN QUERY
  SELECT v.*
  FROM verticals v
  JOIN vertical_categories vc ON vc.id = v.category_id
  WHERE vc.name = p_category_name AND v.active = true
  ORDER BY v.sort_order, v.popularity_score DESC;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_vertical_config TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_verticals_by_category TO anon, authenticated;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'Business Verticals Complete System created successfully!';
  RAISE NOTICE 'Tables: vertical_categories, system_modules, vertical_terminology, vertical_module_configs, vertical_features';
END $$;
