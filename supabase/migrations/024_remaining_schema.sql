
-- ===== 002_storage_setup.sql =====
-- =================================================================
-- Configuración de Storage para Imágenes de Productos
-- =================================================================

-- Crear bucket para imágenes de productos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true, -- Público para que las imágenes se puedan ver sin autenticación
  5242880, -- 5MB límite por archivo
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- =================================================================
-- Políticas de Storage
-- =================================================================

-- Política para permitir subir imágenes (todos pueden subir)
CREATE POLICY "Permitir subir imágenes de productos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images'
);

-- Política para permitir ver imágenes (público)
CREATE POLICY "Permitir ver imágenes públicas"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- Política para permitir actualizar imágenes
CREATE POLICY "Permitir actualizar imágenes de productos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-images')
WITH CHECK (bucket_id = 'product-images');

-- Política para permitir eliminar imágenes
CREATE POLICY "Permitir eliminar imágenes de productos"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-images');

-- =================================================================
-- Comentarios
-- =================================================================

-- COMMENT ON SCHEMA storage IS 'Storage para archivos y imágenes'; -- removido: requiere ser dueño del schema storage

-- ===== 003_fix_rls_policies.sql =====
-- =================================================================
-- Actualizar políticas RLS para permitir operaciones sin autenticación
-- NOTA: Esto es para desarrollo. En producción deberías integrar Clerk con Supabase
-- =================================================================

-- Eliminar políticas existentes restrictivas

-- Crear políticas permisivas (permitir TODAS las operaciones sin autenticación)

-- Políticas para users
CREATE POLICY "Permitir todo en users" ON users
    FOR ALL USING (true) WITH CHECK (true);

-- Políticas para categories
CREATE POLICY "Permitir todo en categories" ON categories
    FOR ALL USING (true) WITH CHECK (true);

-- Políticas para products
CREATE POLICY "Permitir todo en products" ON products
    FOR ALL USING (true) WITH CHECK (true);

-- Políticas para customers
CREATE POLICY "Permitir todo en customers" ON customers
    FOR ALL USING (true) WITH CHECK (true);

-- Políticas para sales
CREATE POLICY "Permitir todo en sales" ON sales
    FOR ALL USING (true) WITH CHECK (true);

-- Políticas para sale_items
CREATE POLICY "Permitir todo en sale_items" ON sale_items
    FOR ALL USING (true) WITH CHECK (true);

-- =================================================================
-- COMENTARIOS IMPORTANTES
-- =================================================================

COMMENT ON POLICY "Permitir todo en users" ON users IS
'DESARROLLO: Política permisiva para desarrollo. Reemplazar con políticas seguras en producción.';

COMMENT ON POLICY "Permitir todo en categories" ON categories IS
'DESARROLLO: Política permisiva para desarrollo. Reemplazar con políticas seguras en producción.';

COMMENT ON POLICY "Permitir todo en products" ON products IS
'DESARROLLO: Política permisiva para desarrollo. Reemplazar con políticas seguras en producción.';

COMMENT ON POLICY "Permitir todo en customers" ON customers IS
'DESARROLLO: Política permisiva para desarrollo. Reemplazar con políticas seguras en producción.';

COMMENT ON POLICY "Permitir todo en sales" ON sales IS
'DESARROLLO: Política permisiva para desarrollo. Reemplazar con políticas seguras en producción.';

COMMENT ON POLICY "Permitir todo en sale_items" ON sale_items IS
'DESARROLLO: Política permisiva para desarrollo. Reemplazar con políticas seguras en producción.';

-- ===== 004_add_product_type.sql =====
-- =================================================================
-- Migración: Agregar campo product_type para diferenciar productos
-- Fecha: 2025-01-10
-- Descripción: Añade un campo para distinguir entre productos de
--              inventario y productos de menú digital
-- =================================================================

-- Agregar columna product_type a la tabla products
ALTER TABLE products
ADD COLUMN IF NOT EXISTS product_type TEXT NOT NULL DEFAULT 'inventory'
CHECK (product_type IN ('inventory', 'menu_digital'));

-- Crear índice para mejorar búsquedas por tipo de producto
CREATE INDEX IF NOT EXISTS idx_products_product_type ON products(product_type);

-- Actualizar la vista de productos con stock bajo para filtrar solo inventario
-- Primero eliminamos la vista existente
DROP VIEW IF EXISTS low_stock_products;

-- Recreamos la vista con el filtro de product_type
CREATE VIEW low_stock_products AS
SELECT
    p.*,
    c.name as category_name
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.stock <= p.min_stock
  AND p.active = true
  AND p.product_type = 'inventory'
ORDER BY p.stock ASC;

-- Comentario en la columna
COMMENT ON COLUMN products.product_type IS 'Tipo de producto: inventory (inventario/POS) o menu_digital (menú digital)';

-- ===== 005_add_currency_to_products.sql =====
-- Add currency field to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'MXN'
CHECK (currency IN ('MXN', 'USD', 'BRL', 'EUR', 'JPY'));

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_products_currency ON products(currency);

-- Update existing products to have MXN as default
UPDATE products SET currency = 'MXN' WHERE currency IS NULL;

-- Add comment to explain the field
COMMENT ON COLUMN products.currency IS 'Currency of the product price: MXN (Mexican Peso), USD (US Dollar), BRL (Brazilian Real), EUR (Euro), or JPY (Japanese Yen)';

-- ===== 006_update_currency_constraint.sql =====
-- Update currency constraint to include all supported currencies
-- First, drop the old constraint
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_currency_check;

-- Add the new constraint with all currencies
ALTER TABLE products
ADD CONSTRAINT products_currency_check
CHECK (currency IN ('MXN', 'USD', 'BRL', 'EUR', 'JPY'));

-- Update the comment
COMMENT ON COLUMN products.currency IS 'Currency of the product price: MXN (Mexican Peso), USD (US Dollar), BRL (Brazilian Real), EUR (Euro), or JPY (Japanese Yen)';

-- ===== 007_add_user_id_to_products.sql =====
-- =================================================================
-- Migración: Agregar user_id a productos y categorías
-- Fecha: 2025-01-10
-- Descripción: Implementa arquitectura multi-tenant donde cada
--              administrador tiene su propio menú digital
-- =================================================================

-- Agregar columna user_id a la tabla products
ALTER TABLE products
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Agregar columna user_id a la tabla categories
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Crear índices para mejorar búsquedas por usuario
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);

-- Índice compuesto para búsquedas comunes
CREATE INDEX IF NOT EXISTS idx_products_user_type ON products(user_id, product_type);

-- Comentarios en las columnas
COMMENT ON COLUMN products.user_id IS 'ID del usuario/restaurante dueño del producto';
COMMENT ON COLUMN categories.user_id IS 'ID del usuario/restaurante dueño de la categoría';

-- Actualizar políticas RLS para products

-- Permitir a service role hacer todo
CREATE POLICY "Service role can do anything on products"
ON products FOR ALL
USING (true);

-- Los usuarios pueden ver productos de cualquier usuario (para clientes)
CREATE POLICY "Users can view products"
ON products FOR SELECT
USING (true);

-- Los usuarios solo pueden insertar/actualizar/eliminar sus propios productos
CREATE POLICY "Users can manage their own products"
ON products FOR ALL
USING (user_id = auth.uid());

-- Actualizar políticas RLS para categories

-- Permitir a service role hacer todo
CREATE POLICY "Service role can do anything on categories"
ON categories FOR ALL
USING (true);

-- Los usuarios pueden ver categorías de cualquier usuario
CREATE POLICY "Users can view categories"
ON categories FOR SELECT
USING (true);

-- Los usuarios solo pueden insertar/actualizar/eliminar sus propias categorías
CREATE POLICY "Users can manage their own categories"
ON categories FOR ALL
USING (user_id = auth.uid());

-- Habilitar RLS si no estaba habilitado
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- ===== 008_add_restaurant_id_to_users.sql =====
-- =================================================================
-- Migración: Agregar restaurant_id a usuarios
-- Fecha: 2025-01-10
-- Descripción: Vincula clientes (CUSTOMER) con su restaurante/administrador
-- =================================================================

-- Agregar columna restaurant_id a la tabla users
-- Los usuarios con rol CUSTOMER tendrán el ID del ADMIN al que pertenecen
-- Los usuarios con rol ADMIN tienen restaurant_id = NULL (son el restaurante)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Crear índice para mejorar búsquedas
CREATE INDEX IF NOT EXISTS idx_users_restaurant_id ON users(restaurant_id);

-- Comentario en la columna
COMMENT ON COLUMN users.restaurant_id IS 'ID del restaurante/admin al que pertenece este usuario. NULL para ADMINs.';

-- Actualizar políticas RLS si es necesario
-- Los usuarios pueden ver información básica de su restaurante

-- ===== 009_unify_product_channels.sql =====
-- =================================================================
-- Migración: Sistema Unificado de Productos Multi-Canal
-- Fecha: 2025-01-12
-- Descripción: Reemplaza product_type con campos de visibilidad para
--              permitir que los mismos productos estén disponibles en
--              múltiples canales (POS, menú digital, venta en línea)
-- =================================================================

-- Agregar nuevas columnas de visibilidad
ALTER TABLE products
ADD COLUMN IF NOT EXISTS available_in_pos BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS available_in_digital_menu BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS track_inventory BOOLEAN DEFAULT true;

-- Migrar datos existentes basados en product_type
UPDATE products
SET
  available_in_pos = (product_type = 'inventory'),
  available_in_digital_menu = (product_type = 'menu_digital'),
  track_inventory = (product_type = 'inventory')
WHERE product_type IS NOT NULL;

-- Crear índices para mejorar búsquedas por canal
CREATE INDEX IF NOT EXISTS idx_products_pos ON products(available_in_pos) WHERE available_in_pos = true;
CREATE INDEX IF NOT EXISTS idx_products_digital_menu ON products(available_in_digital_menu) WHERE available_in_digital_menu = true;
CREATE INDEX IF NOT EXISTS idx_products_user_pos ON products(user_id, available_in_pos) WHERE available_in_pos = true;
CREATE INDEX IF NOT EXISTS idx_products_user_digital ON products(user_id, available_in_digital_menu) WHERE available_in_digital_menu = true;

-- Agregar comentarios descriptivos
COMMENT ON COLUMN products.available_in_pos IS 'Si el producto está disponible en el punto de venta mostrador';
COMMENT ON COLUMN products.available_in_digital_menu IS 'Si el producto está disponible en el menú digital/venta en línea';
COMMENT ON COLUMN products.track_inventory IS 'Si el producto debe controlar inventario real (false para servicios o productos digitales)';

-- Actualizar vista de productos con stock bajo
DROP VIEW IF EXISTS low_stock_products;

CREATE VIEW low_stock_products AS
SELECT
    p.*,
    c.name as category_name
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.stock <= p.min_stock
  AND p.active = true
  AND p.track_inventory = true
  AND p.available_in_pos = true
ORDER BY p.stock ASC;

-- Crear vista para productos del menú digital
CREATE VIEW digital_menu_products AS
SELECT
    p.*,
    c.name as category_name
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.active = true
  AND p.available_in_digital_menu = true
ORDER BY c.name, p.name;

-- Comentarios en las vistas
COMMENT ON VIEW low_stock_products IS 'Productos con stock bajo disponibles en POS que requieren reabastecimiento';
COMMENT ON VIEW digital_menu_products IS 'Productos activos disponibles en el menú digital/venta en línea';

-- Nota: Mantenemos product_type por compatibilidad pero no es necesario usarlo más
-- Se puede eliminar en una migración futura después de verificar que todo funciona
COMMENT ON COLUMN products.product_type IS 'OBSOLETO: Usar available_in_pos y available_in_digital_menu en su lugar. Mantenido por compatibilidad.';

-- ===== 010_add_category_visibility.sql =====
-- =================================================================
-- Migración: Agregar campos de visibilidad a categorías
-- Fecha: 2025-01-12
-- Descripción: Permite controlar qué categorías aparecen en POS
--              y menú digital, heredando la configuración a productos
-- =================================================================

-- Agregar campos de visibilidad a categorías
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS available_in_pos BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS available_in_digital_menu BOOLEAN DEFAULT false;

-- Migrar categorías existentes basándose en si tienen productos
-- Si la categoría tiene productos de inventory, marcarla para POS
-- Si tiene productos de menu_digital, marcarla para menú digital
UPDATE categories c
SET
  available_in_pos = EXISTS (
    SELECT 1 FROM products p
    WHERE p.category_id = c.id
    AND p.product_type = 'inventory'
  ),
  available_in_digital_menu = EXISTS (
    SELECT 1 FROM products p
    WHERE p.category_id = c.id
    AND p.product_type = 'menu_digital'
  );

-- Si una categoría no tiene productos, mantener valores por defecto
UPDATE categories
SET
  available_in_pos = true,
  available_in_digital_menu = false
WHERE NOT EXISTS (
  SELECT 1 FROM products p WHERE p.category_id = categories.id
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_categories_pos ON categories(available_in_pos) WHERE available_in_pos = true;
CREATE INDEX IF NOT EXISTS idx_categories_digital_menu ON categories(available_in_digital_menu) WHERE available_in_digital_menu = true;

-- Comentarios
COMMENT ON COLUMN categories.available_in_pos IS 'Si la categoría y sus productos están disponibles en POS';
COMMENT ON COLUMN categories.available_in_digital_menu IS 'Si la categoría y sus productos están disponibles en menú digital';

-- ===== 011_create_sales_tables.sql =====
-- =================================================================
-- Migración: Crear tablas de ventas (sales y sale_items)
-- Fecha: 2025-01-17
-- Descripción: Crea las tablas para el sistema de punto de venta
-- =================================================================

-- Crear enum para métodos de pago
DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('cash', 'card', 'transfer', 'credit');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Crear enum para estados de venta
DO $$ BEGIN
  CREATE TYPE sale_status AS ENUM ('pending', 'completed', 'cancelled', 'refunded');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Crear tabla de ventas (sales)
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_number TEXT UNIQUE NOT NULL DEFAULT '',
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
  discount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  tax DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  payment_method payment_method NOT NULL DEFAULT 'cash',
  status sale_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Crear tabla de items de venta (sale_items)
CREATE TABLE IF NOT EXISTS sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  discount DECIMAL(10, 2) NOT NULL DEFAULT 0
);

-- Crear función para generar número de venta
CREATE OR REPLACE FUNCTION generate_sale_number()
RETURNS TRIGGER AS $$
DECLARE
  next_number INTEGER;
  sale_year TEXT;
BEGIN
  -- Obtener el año actual
  sale_year := TO_CHAR(NOW(), 'YYYY');

  -- Obtener el siguiente número de venta del año actual
  SELECT COALESCE(MAX(CAST(SUBSTRING(sale_number FROM '\d+$') AS INTEGER)), 0) + 1
  INTO next_number
  FROM sales
  WHERE sale_number LIKE 'V-' || sale_year || '-%';

  -- Generar el número de venta con formato V-YYYY-NNNN
  NEW.sale_number := 'V-' || sale_year || '-' || LPAD(next_number::TEXT, 4, '0');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para generar número de venta automáticamente
DROP TRIGGER IF EXISTS generate_sale_number_trigger ON sales;
CREATE TRIGGER generate_sale_number_trigger
  BEFORE INSERT ON sales
  FOR EACH ROW
  WHEN (NEW.sale_number = '')
  EXECUTE FUNCTION generate_sale_number();

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_sale_number ON sales(sale_number);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);

-- Habilitar RLS
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS (permisivas para desarrollo)
CREATE POLICY "Permitir todo en sales" ON sales
    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo en sale_items" ON sale_items
    FOR ALL USING (true) WITH CHECK (true);

-- Comentarios
COMMENT ON TABLE sales IS 'Tabla de ventas del punto de venta';
COMMENT ON TABLE sale_items IS 'Tabla de items/productos de cada venta';
COMMENT ON COLUMN sales.sale_number IS 'Número único de venta con formato V-YYYY-NNNN';
COMMENT ON COLUMN sales.customer_id IS 'Cliente asociado (opcional)';
COMMENT ON COLUMN sales.user_id IS 'Usuario que realizó la venta (obligatorio)';
COMMENT ON COLUMN sales.payment_method IS 'Método de pago: cash, card, transfer, credit';
COMMENT ON COLUMN sales.status IS 'Estado de la venta: pending, completed, cancelled, refunded';
COMMENT ON POLICY "Permitir todo en sales" ON sales IS 'DESARROLLO: Política permisiva. Reemplazar en producción.';
COMMENT ON POLICY "Permitir todo en sale_items" ON sale_items IS 'DESARROLLO: Política permisiva. Reemplazar en producción.';

-- ===== 012_add_ai_image_generation_settings.sql =====
-- Migration: Add AI Image Generation Settings to Users
-- Created: 2025-01-19
-- Description: Adds configuration field to control automatic AI image generation for menu digitalization

-- Add ai_image_generation_enabled column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_image_generation_enabled BOOLEAN DEFAULT FALSE;

-- Add ai_image_generation_credits column for tracking usage (optional for monetization)
ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_image_generation_credits INTEGER DEFAULT 0;

-- Add activation_code column for demo/special access
ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_activation_code TEXT;

-- CREATE INDEX IF NOT EXISTS for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_ai_generation ON users(ai_image_generation_enabled) WHERE ai_image_generation_enabled = TRUE;

-- Add comment for documentation
COMMENT ON COLUMN users.ai_image_generation_enabled IS 'Controls whether AI image generation is enabled for this user during menu digitalization';
COMMENT ON COLUMN users.ai_image_generation_credits IS 'Number of remaining AI image generation credits (0 = unlimited if feature is enabled)';
COMMENT ON COLUMN users.ai_activation_code IS 'Special activation code for demos or promotional access';

-- Optional: Create a function to validate activation codes
CREATE OR REPLACE FUNCTION validate_ai_activation_code(user_id UUID, code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  valid_codes TEXT[] := ARRAY['DEMO2025', 'PITCH2025', 'BETA2025']; -- Add your codes here
BEGIN
  -- Check if the code is valid
  IF code = ANY(valid_codes) THEN
    -- Enable AI image generation for this user
    UPDATE users
    SET ai_image_generation_enabled = TRUE,
        ai_activation_code = code,
        ai_image_generation_credits = CASE
          WHEN code = 'DEMO2025' THEN 100  -- 100 images for demo
          WHEN code = 'PITCH2025' THEN 500 -- 500 images for pitch
          WHEN code = 'BETA2025' THEN -1   -- Unlimited for beta testers
          ELSE 10 -- Default
        END
    WHERE id = user_id;

    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- Optional: Create a function to check if user can generate images
CREATE OR REPLACE FUNCTION can_generate_ai_images(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_enabled BOOLEAN;
  credits INTEGER;
BEGIN
  SELECT ai_image_generation_enabled, ai_image_generation_credits
  INTO is_enabled, credits
  FROM users
  WHERE id = user_id;

  -- If feature is not enabled, return false
  IF NOT is_enabled THEN
    RETURN FALSE;
  END IF;

  -- If credits is -1 (unlimited), return true
  IF credits = -1 THEN
    RETURN TRUE;
  END IF;

  -- If credits is 0 (unlimited for enabled users), return true
  IF credits = 0 THEN
    RETURN TRUE;
  END IF;

  -- If has remaining credits, return true
  IF credits > 0 THEN
    RETURN TRUE;
  END IF;

  -- Otherwise, no credits left
  RETURN FALSE;
END;
$$;

-- Optional: Create a function to decrement credits after generating an image
CREATE OR REPLACE FUNCTION decrement_ai_credits(user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_credits INTEGER;
BEGIN
  SELECT ai_image_generation_credits INTO current_credits
  FROM users
  WHERE id = user_id;

  -- Only decrement if not unlimited (0 or -1)
  IF current_credits > 0 THEN
    UPDATE users
    SET ai_image_generation_credits = ai_image_generation_credits - 1
    WHERE id = user_id;
  END IF;
END;
$$;

-- ===== 013_product_variants.sql =====
-- Migration: Product Variants System
-- Description: Adds support for product variants (sizes, toppings, extras)

-- Variant Types table (e.g., "Tamaño", "Topping", "Extra")
CREATE TABLE IF NOT EXISTS variant_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, user_id)
);

-- Product Variants table
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_type_id UUID NOT NULL REFERENCES variant_types(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_modifier DECIMAL(10,2) DEFAULT 0,
  is_absolute_price BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sale Item Variants table (tracks which variants were selected in POS sales)
CREATE TABLE IF NOT EXISTS sale_item_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_item_id UUID NOT NULL REFERENCES sale_items(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  price_applied DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order Item Variants table (tracks which variants were selected in digital menu orders)
CREATE TABLE IF NOT EXISTS order_item_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  price_applied DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add has_variants column to products for quick checks
ALTER TABLE products ADD COLUMN IF NOT EXISTS has_variants BOOLEAN DEFAULT false;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_variant_types_user_id ON variant_types(user_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_variant_type_id ON product_variants(variant_type_id);
CREATE INDEX IF NOT EXISTS idx_sale_item_variants_sale_item_id ON sale_item_variants(sale_item_id);
CREATE INDEX IF NOT EXISTS idx_order_item_variants_order_item_id ON order_item_variants(order_item_id);

-- RLS Policies for variant_types
ALTER TABLE variant_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own variant types"
  ON variant_types FOR SELECT
  USING (user_id = auth.uid() OR user_id IN (
    SELECT id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert their own variant types"
  ON variant_types FOR INSERT
  WITH CHECK (user_id = auth.uid() OR user_id IN (
    SELECT id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update their own variant types"
  ON variant_types FOR UPDATE
  USING (user_id = auth.uid() OR user_id IN (
    SELECT id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete their own variant types"
  ON variant_types FOR DELETE
  USING (user_id = auth.uid() OR user_id IN (
    SELECT id FROM users WHERE id = auth.uid()
  ));

-- RLS Policies for product_variants
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view variants of their products"
  ON product_variants FOR SELECT
  USING (product_id IN (
    SELECT id FROM products WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert variants for their products"
  ON product_variants FOR INSERT
  WITH CHECK (product_id IN (
    SELECT id FROM products WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update variants of their products"
  ON product_variants FOR UPDATE
  USING (product_id IN (
    SELECT id FROM products WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete variants of their products"
  ON product_variants FOR DELETE
  USING (product_id IN (
    SELECT id FROM products WHERE user_id = auth.uid()
  ));

-- RLS Policies for sale_item_variants
ALTER TABLE sale_item_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their sale item variants"
  ON sale_item_variants FOR SELECT
  USING (sale_item_id IN (
    SELECT si.id FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    WHERE s.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert sale item variants"
  ON sale_item_variants FOR INSERT
  WITH CHECK (sale_item_id IN (
    SELECT si.id FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    WHERE s.user_id = auth.uid()
  ));

-- RLS Policies for order_item_variants
ALTER TABLE order_item_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their order item variants"
  ON order_item_variants FOR SELECT
  USING (order_item_id IN (
    SELECT oi.id FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE o.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert order item variants"
  ON order_item_variants FOR INSERT
  WITH CHECK (order_item_id IN (
    SELECT oi.id FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE o.user_id = auth.uid()
  ));

-- Function to update has_variants flag on products
CREATE OR REPLACE FUNCTION update_product_has_variants()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE products
    SET has_variants = EXISTS(
      SELECT 1 FROM product_variants
      WHERE product_id = NEW.product_id AND active = true
    )
    WHERE id = NEW.product_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE products
    SET has_variants = EXISTS(
      SELECT 1 FROM product_variants
      WHERE product_id = OLD.product_id AND active = true
    )
    WHERE id = OLD.product_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update has_variants
CREATE TRIGGER trigger_update_product_has_variants
  AFTER INSERT OR UPDATE OR DELETE ON product_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_product_has_variants();

-- Updated_at trigger for product_variants
CREATE OR REPLACE FUNCTION update_product_variants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_product_variants_updated_at
  BEFORE UPDATE ON product_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_product_variants_updated_at();

-- ===== 013_returns.sql =====
-- Migration: Returns System
-- Description: Tables for managing product returns and refunds

-- Create returns table
CREATE TABLE IF NOT EXISTS returns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  user_id TEXT NOT NULL,
  return_number TEXT UNIQUE,
  reason TEXT,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, cancelled
  restaurant_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create return_items table
CREATE TABLE IF NOT EXISTS return_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  return_id UUID NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  subtotal NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create function to generate return number
CREATE OR REPLACE FUNCTION generate_return_number()
RETURNS TRIGGER AS $$
DECLARE
  next_number INTEGER;
  new_return_number TEXT;
BEGIN
  -- Get the next return number
  SELECT COALESCE(MAX(CAST(SUBSTRING(return_number FROM 4) AS INTEGER)), 0) + 1
  INTO next_number
  FROM returns
  WHERE restaurant_id = NEW.restaurant_id;

  -- Generate return number (format: RET-000001)
  new_return_number := 'RET-' || LPAD(next_number::TEXT, 6, '0');

  NEW.return_number := new_return_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-generating return number
DROP TRIGGER IF EXISTS trigger_generate_return_number ON returns;
CREATE TRIGGER trigger_generate_return_number
  BEFORE INSERT ON returns
  FOR EACH ROW
  EXECUTE FUNCTION generate_return_number();

-- Create function to increment product stock
CREATE OR REPLACE FUNCTION increment_product_stock(
  product_id UUID,
  quantity_change INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE products
  SET stock = stock + quantity_change,
      updated_at = NOW()
  WHERE id = product_id;
END;
$$ LANGUAGE plpgsql;

-- Create updated_at trigger for returns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_returns_updated_at ON returns;
CREATE TRIGGER trigger_update_returns_updated_at
  BEFORE UPDATE ON returns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_returns_sale_id ON returns(sale_id);
CREATE INDEX IF NOT EXISTS idx_returns_customer_id ON returns(customer_id);
CREATE INDEX IF NOT EXISTS idx_returns_user_id ON returns(user_id);
CREATE INDEX IF NOT EXISTS idx_returns_restaurant_id ON returns(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_returns_created_at ON returns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_return_items_return_id ON return_items(return_id);
CREATE INDEX IF NOT EXISTS idx_return_items_product_id ON return_items(product_id);

-- Row Level Security (RLS)
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for returns
CREATE POLICY "Users can view their restaurant's returns"
  ON returns FOR SELECT
  USING (restaurant_id = current_setting('app.restaurant_id', true));

CREATE POLICY "Users can insert returns for their restaurant"
  ON returns FOR INSERT
  WITH CHECK (restaurant_id = current_setting('app.restaurant_id', true));

CREATE POLICY "Users can update their restaurant's returns"
  ON returns FOR UPDATE
  USING (restaurant_id = current_setting('app.restaurant_id', true));

-- RLS Policies for return_items
CREATE POLICY "Users can view return items"
  ON return_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM returns
    WHERE returns.id = return_items.return_id
    AND returns.restaurant_id = current_setting('app.restaurant_id', true)
  ));

CREATE POLICY "Users can insert return items"
  ON return_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM returns
    WHERE returns.id = return_items.return_id
    AND returns.restaurant_id = current_setting('app.restaurant_id', true)
  ));

-- Grant permissions
GRANT ALL ON returns TO authenticated;
GRANT ALL ON return_items TO authenticated;
GRANT EXECUTE ON FUNCTION generate_return_number() TO authenticated;
GRANT EXECUTE ON FUNCTION increment_product_stock(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION update_updated_at_column() TO authenticated;

-- Add comment
COMMENT ON TABLE returns IS 'Table for storing product returns and refunds';
COMMENT ON TABLE return_items IS 'Table for storing individual items in a return';

-- ===== 014_inventory_recipes.sql =====
-- Migration: Intelligent Inventory System with Recipes
-- Description: Tables and functions for ingredient-based inventory management with automatic deductions

-- ============================================
-- 1. INGREDIENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  sku TEXT UNIQUE NOT NULL,
  category TEXT, -- dairy, meat, vegetable, grain, spice, liquid, etc.

  -- Inventory tracking
  current_stock NUMERIC(10,3) NOT NULL DEFAULT 0,
  min_stock NUMERIC(10,3) NOT NULL DEFAULT 0,
  max_stock NUMERIC(10,3) NOT NULL DEFAULT 1000,

  -- Unit management
  unit_type TEXT NOT NULL DEFAULT 'unit', -- unit, weight, volume
  unit_name TEXT NOT NULL DEFAULT 'unidad', -- kg, g, L, ml, unidad, pieza, etc.

  -- Cost tracking
  cost_per_unit NUMERIC(10,2) NOT NULL DEFAULT 0,

  -- Metadata
  restaurant_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_unit_type CHECK (unit_type IN ('unit', 'weight', 'volume'))
);

-- ============================================
-- 2. UPDATE PRODUCTS TABLE
-- ============================================
-- Add product_type to differentiate simple vs recipe products
-- First, add the column without constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'product_type'
  ) THEN
    ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type TEXT;
  END IF;
END $$;

-- Update ALL products to 'simple' - handle NULL and any other value
UPDATE products
SET product_type = 'simple'
WHERE product_type IS NULL
   OR product_type NOT IN ('simple', 'recipe');

-- Now set default for new products
ALTER TABLE products
ALTER COLUMN product_type SET DEFAULT 'simple';

-- Make it NOT NULL
ALTER TABLE products
ALTER COLUMN product_type SET NOT NULL;

-- Add calculated cost for recipe products
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'calculated_cost'
  ) THEN
    ALTER TABLE products ADD COLUMN IF NOT EXISTS calculated_cost NUMERIC(10,2) DEFAULT 0;
  END IF;
END $$;

-- Drop existing constraint if it exists (to avoid conflicts)
ALTER TABLE products
DROP CONSTRAINT IF EXISTS valid_product_type;

-- Add the constraint fresh
ALTER TABLE products
ADD CONSTRAINT valid_product_type CHECK (product_type IN ('simple', 'recipe'));

-- ============================================
-- 3. RECIPES TABLE (Product -> Ingredients mapping)
-- ============================================
CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,

  -- Quantity needed per product unit
  quantity NUMERIC(10,3) NOT NULL,
  unit_name TEXT NOT NULL, -- Should match ingredient's unit_name

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique ingredient per product
  UNIQUE(product_id, ingredient_id)
);

-- ============================================
-- 4. INVENTORY TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,

  -- Transaction details
  transaction_type TEXT NOT NULL, -- purchase, adjustment, sale_deduction, return, waste
  quantity NUMERIC(10,3) NOT NULL, -- positive for additions, negative for deductions
  previous_stock NUMERIC(10,3) NOT NULL,
  new_stock NUMERIC(10,3) NOT NULL,

  -- Cost tracking
  cost_per_unit NUMERIC(10,2),
  total_cost NUMERIC(10,2),

  -- References
  sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  return_id UUID REFERENCES returns(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,

  -- User and metadata
  user_id TEXT NOT NULL,
  notes TEXT,
  restaurant_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_transaction_type CHECK (
    transaction_type IN ('purchase', 'adjustment', 'sale_deduction', 'return', 'waste')
  )
);

-- ============================================
-- 5. FUNCTIONS
-- ============================================

-- Function to update ingredient stock
CREATE OR REPLACE FUNCTION update_ingredient_stock(
  p_ingredient_id UUID,
  p_quantity NUMERIC,
  p_transaction_type TEXT,
  p_user_id TEXT,
  p_restaurant_id TEXT,
  p_sale_id UUID DEFAULT NULL,
  p_return_id UUID DEFAULT NULL,
  p_product_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_previous_stock NUMERIC;
  v_new_stock NUMERIC;
  v_cost_per_unit NUMERIC;
BEGIN
  -- Get current stock and cost
  SELECT current_stock, cost_per_unit
  INTO v_previous_stock, v_cost_per_unit
  FROM ingredients
  WHERE id = p_ingredient_id;

  -- Calculate new stock
  v_new_stock := v_previous_stock + p_quantity;

  -- Validate stock doesn't go negative
  IF v_new_stock < 0 THEN
    RAISE EXCEPTION 'Insufficient ingredient stock. Available: %, Required: %',
      v_previous_stock, ABS(p_quantity);
  END IF;

  -- Update ingredient stock
  UPDATE ingredients
  SET current_stock = v_new_stock,
      updated_at = NOW()
  WHERE id = p_ingredient_id;

  -- Record transaction
  INSERT INTO inventory_transactions (
    ingredient_id,
    transaction_type,
    quantity,
    previous_stock,
    new_stock,
    cost_per_unit,
    total_cost,
    sale_id,
    return_id,
    product_id,
    user_id,
    notes,
    restaurant_id
  ) VALUES (
    p_ingredient_id,
    p_transaction_type,
    p_quantity,
    v_previous_stock,
    v_new_stock,
    v_cost_per_unit,
    ABS(p_quantity) * v_cost_per_unit,
    p_sale_id,
    p_return_id,
    p_product_id,
    p_user_id,
    p_notes,
    p_restaurant_id
  );
END;
$$ LANGUAGE plpgsql;

-- Function to process recipe deductions for a sale
CREATE OR REPLACE FUNCTION process_recipe_deductions(
  p_sale_id UUID,
  p_user_id TEXT,
  p_restaurant_id TEXT
)
RETURNS VOID AS $$
DECLARE
  v_sale_item RECORD;
  v_recipe RECORD;
  v_total_quantity NUMERIC;
BEGIN
  -- Loop through each sale item
  FOR v_sale_item IN
    SELECT si.*, p.product_type
    FROM sale_items si
    JOIN products p ON si.product_id = p.id
    WHERE si.sale_id = p_sale_id
  LOOP
    -- Only process recipe products
    IF v_sale_item.product_type = 'recipe' THEN
      -- Loop through each ingredient in the recipe
      FOR v_recipe IN
        SELECT * FROM recipes WHERE product_id = v_sale_item.product_id
      LOOP
        -- Calculate total quantity needed (recipe quantity * items sold)
        v_total_quantity := v_recipe.quantity * v_sale_item.quantity;

        -- Deduct from ingredient stock (negative quantity)
        PERFORM update_ingredient_stock(
          v_recipe.ingredient_id,
          -v_total_quantity,
          'sale_deduction',
          p_user_id,
          p_restaurant_id,
          p_sale_id,
          NULL,
          v_sale_item.product_id,
          format('Sale %s: %s x %s', p_sale_id, v_sale_item.quantity, v_recipe.quantity)
        );
      END LOOP;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate product availability based on ingredients
CREATE OR REPLACE FUNCTION calculate_product_availability(p_product_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_min_available INTEGER;
  v_ingredient_availability INTEGER;
  v_recipe RECORD;
BEGIN
  -- Initialize with max integer
  v_min_available := 2147483647;

  -- Loop through recipe ingredients
  FOR v_recipe IN
    SELECT r.*, i.current_stock
    FROM recipes r
    JOIN ingredients i ON r.ingredient_id = i.id
    WHERE r.product_id = p_product_id
  LOOP
    -- Calculate how many products can be made with this ingredient
    v_ingredient_availability := FLOOR(v_recipe.current_stock / v_recipe.quantity);

    -- Keep the minimum availability
    IF v_ingredient_availability < v_min_available THEN
      v_min_available := v_ingredient_availability;
    END IF;
  END LOOP;

  -- If no recipes found, return current stock
  IF v_min_available = 2147483647 THEN
    SELECT stock INTO v_min_available FROM products WHERE id = p_product_id;
  END IF;

  RETURN COALESCE(v_min_available, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to calculate recipe cost
CREATE OR REPLACE FUNCTION calculate_recipe_cost(p_product_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_total_cost NUMERIC;
BEGIN
  SELECT COALESCE(SUM(r.quantity * i.cost_per_unit), 0)
  INTO v_total_cost
  FROM recipes r
  JOIN ingredients i ON r.ingredient_id = i.id
  WHERE r.product_id = p_product_id;

  RETURN v_total_cost;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. TRIGGERS
-- ============================================

-- Trigger to update product calculated cost when recipe changes
CREATE OR REPLACE FUNCTION update_product_cost()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET calculated_cost = calculate_recipe_cost(NEW.product_id),
      updated_at = NOW()
  WHERE id = NEW.product_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_product_cost ON recipes;
CREATE TRIGGER trigger_update_product_cost
  AFTER INSERT OR UPDATE ON recipes
  FOR EACH ROW
  EXECUTE FUNCTION update_product_cost();

-- Trigger for updated_at on ingredients
DROP TRIGGER IF EXISTS trigger_update_ingredients_updated_at ON ingredients;
CREATE TRIGGER trigger_update_ingredients_updated_at
  BEFORE UPDATE ON ingredients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for updated_at on recipes
DROP TRIGGER IF EXISTS trigger_update_recipes_updated_at ON recipes;
CREATE TRIGGER trigger_update_recipes_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_ingredients_restaurant_id ON ingredients(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_ingredients_sku ON ingredients(sku);
CREATE INDEX IF NOT EXISTS idx_ingredients_category ON ingredients(category);
CREATE INDEX IF NOT EXISTS idx_ingredients_current_stock ON ingredients(current_stock);

CREATE INDEX IF NOT EXISTS idx_recipes_product_id ON recipes(product_id);
CREATE INDEX IF NOT EXISTS idx_recipes_ingredient_id ON recipes(ingredient_id);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_ingredient_id ON inventory_transactions(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_sale_id ON inventory_transactions(sale_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_restaurant_id ON inventory_transactions(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created_at ON inventory_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type ON inventory_transactions(transaction_type);

CREATE INDEX IF NOT EXISTS idx_products_product_type ON products(product_type);

-- ============================================
-- 8. ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ingredients
CREATE POLICY "Users can view their restaurant's ingredients"
  ON ingredients FOR SELECT
  USING (restaurant_id = current_setting('app.restaurant_id', true));

CREATE POLICY "Users can insert ingredients for their restaurant"
  ON ingredients FOR INSERT
  WITH CHECK (restaurant_id = current_setting('app.restaurant_id', true));

CREATE POLICY "Users can update their restaurant's ingredients"
  ON ingredients FOR UPDATE
  USING (restaurant_id = current_setting('app.restaurant_id', true));

CREATE POLICY "Users can delete their restaurant's ingredients"
  ON ingredients FOR DELETE
  USING (restaurant_id = current_setting('app.restaurant_id', true));

-- RLS Policies for recipes
CREATE POLICY "Users can view recipes for their restaurant's products"
  ON recipes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM products
    WHERE products.id = recipes.product_id
    AND products.restaurant_id = current_setting('app.restaurant_id', true)
  ));

CREATE POLICY "Users can insert recipes for their restaurant's products"
  ON recipes FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM products
    WHERE products.id = recipes.product_id
    AND products.restaurant_id = current_setting('app.restaurant_id', true)
  ));

CREATE POLICY "Users can update recipes for their restaurant's products"
  ON recipes FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM products
    WHERE products.id = recipes.product_id
    AND products.restaurant_id = current_setting('app.restaurant_id', true)
  ));

CREATE POLICY "Users can delete recipes for their restaurant's products"
  ON recipes FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM products
    WHERE products.id = recipes.product_id
    AND products.restaurant_id = current_setting('app.restaurant_id', true)
  ));

-- RLS Policies for inventory_transactions
CREATE POLICY "Users can view their restaurant's inventory transactions"
  ON inventory_transactions FOR SELECT
  USING (restaurant_id = current_setting('app.restaurant_id', true));

CREATE POLICY "Users can insert inventory transactions for their restaurant"
  ON inventory_transactions FOR INSERT
  WITH CHECK (restaurant_id = current_setting('app.restaurant_id', true));

-- ============================================
-- 9. GRANTS
-- ============================================
GRANT ALL ON ingredients TO authenticated;
GRANT ALL ON recipes TO authenticated;
GRANT ALL ON inventory_transactions TO authenticated;
GRANT EXECUTE ON FUNCTION update_ingredient_stock TO authenticated;
GRANT EXECUTE ON FUNCTION process_recipe_deductions TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_product_availability TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_recipe_cost TO authenticated;
GRANT EXECUTE ON FUNCTION update_product_cost TO authenticated;

-- ============================================
-- 10. COMMENTS
-- ============================================
COMMENT ON TABLE ingredients IS 'Base ingredients/supplies for recipe-based inventory management';
COMMENT ON TABLE recipes IS 'Product recipes: mapping products to required ingredients with quantities';
COMMENT ON TABLE inventory_transactions IS 'Complete audit trail of all inventory movements';
COMMENT ON COLUMN products.product_type IS 'Product type: simple (regular) or recipe (composed of ingredients)';
COMMENT ON COLUMN products.calculated_cost IS 'Auto-calculated cost for recipe products based on ingredient costs';
COMMENT ON FUNCTION process_recipe_deductions IS 'Automatically deducts ingredients when a recipe product is sold';
COMMENT ON FUNCTION calculate_product_availability IS 'Calculates how many units of a recipe product can be made with current ingredient stock';

-- ===== 014_inventory_recipes_FIXED.sql =====
-- Migration: Intelligent Inventory System with Recipes (FIXED)
-- Description: Tables and functions for ingredient-based inventory management with automatic deductions

-- ============================================
-- STEP 0: CLEANUP - Remove any existing constraints on product_type
-- ============================================
DO $$
DECLARE
  constraint_name text;
BEGIN
  -- Find and drop all constraints on products.product_type
  FOR constraint_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'products'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) LIKE '%product_type%'
  LOOP
    EXECUTE 'ALTER TABLE products DROP CONSTRAINT IF EXISTS ' || quote_ident(constraint_name);
    RAISE NOTICE 'Dropped constraint: %', constraint_name;
  END LOOP;
END $$;

-- ============================================
-- 1. INGREDIENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  sku TEXT UNIQUE NOT NULL,
  category TEXT, -- dairy, meat, vegetable, grain, spice, liquid, etc.

  -- Inventory tracking
  current_stock NUMERIC(10,3) NOT NULL DEFAULT 0,
  min_stock NUMERIC(10,3) NOT NULL DEFAULT 0,
  max_stock NUMERIC(10,3) NOT NULL DEFAULT 1000,

  -- Unit management
  unit_type TEXT NOT NULL DEFAULT 'unit', -- unit, weight, volume
  unit_name TEXT NOT NULL DEFAULT 'unidad', -- kg, g, L, ml, unidad, pieza, etc.

  -- Cost tracking
  cost_per_unit NUMERIC(10,2) NOT NULL DEFAULT 0,

  -- Metadata
  restaurant_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_unit_type CHECK (unit_type IN ('unit', 'weight', 'volume'))
);

-- ============================================
-- 2. UPDATE PRODUCTS TABLE
-- ============================================
-- Add product_type column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'product_type'
  ) THEN
    ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'simple';
  END IF;
END $$;

-- Update ALL existing products to 'simple' if they have NULL or invalid values
UPDATE products
SET product_type = 'simple'
WHERE product_type IS NULL
   OR product_type = ''
   OR product_type NOT IN ('simple', 'recipe');

-- Set default for new rows
ALTER TABLE products
ALTER COLUMN product_type SET DEFAULT 'simple';

-- Make it NOT NULL
ALTER TABLE products
ALTER COLUMN product_type SET NOT NULL;

-- Add calculated cost for recipe products
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'calculated_cost'
  ) THEN
    ALTER TABLE products ADD COLUMN IF NOT EXISTS calculated_cost NUMERIC(10,2) DEFAULT 0;
  END IF;
END $$;

-- Add the fresh constraint with a clear name
ALTER TABLE products
ADD CONSTRAINT valid_product_type CHECK (product_type IN ('simple', 'recipe'));

-- ============================================
-- 3. RECIPES TABLE (Product -> Ingredients mapping)
-- ============================================
CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,

  -- Quantity needed per product unit
  quantity NUMERIC(10,3) NOT NULL,
  unit_name TEXT NOT NULL, -- Should match ingredient's unit_name

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique ingredient per product
  UNIQUE(product_id, ingredient_id)
);

-- ============================================
-- 4. INVENTORY TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,

  -- Transaction details
  transaction_type TEXT NOT NULL, -- purchase, adjustment, sale_deduction, return, waste
  quantity NUMERIC(10,3) NOT NULL, -- positive for additions, negative for deductions
  previous_stock NUMERIC(10,3) NOT NULL,
  new_stock NUMERIC(10,3) NOT NULL,

  -- Cost tracking
  cost_per_unit NUMERIC(10,2),
  total_cost NUMERIC(10,2),

  -- References
  sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  return_id UUID REFERENCES returns(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,

  -- User and metadata
  user_id TEXT NOT NULL,
  notes TEXT,
  restaurant_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_transaction_type CHECK (
    transaction_type IN ('purchase', 'adjustment', 'sale_deduction', 'return', 'waste')
  )
);

-- ============================================
-- 5. FUNCTIONS
-- ============================================

-- Function to update ingredient stock
CREATE OR REPLACE FUNCTION update_ingredient_stock(
  p_ingredient_id UUID,
  p_quantity NUMERIC,
  p_transaction_type TEXT,
  p_user_id TEXT,
  p_restaurant_id TEXT,
  p_sale_id UUID DEFAULT NULL,
  p_return_id UUID DEFAULT NULL,
  p_product_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_previous_stock NUMERIC;
  v_new_stock NUMERIC;
  v_cost_per_unit NUMERIC;
BEGIN
  -- Get current stock and cost
  SELECT current_stock, cost_per_unit
  INTO v_previous_stock, v_cost_per_unit
  FROM ingredients
  WHERE id = p_ingredient_id;

  -- Calculate new stock
  v_new_stock := v_previous_stock + p_quantity;

  -- Validate stock doesn't go negative
  IF v_new_stock < 0 THEN
    RAISE EXCEPTION 'Insufficient ingredient stock. Available: %, Required: %',
      v_previous_stock, ABS(p_quantity);
  END IF;

  -- Update ingredient stock
  UPDATE ingredients
  SET current_stock = v_new_stock,
      updated_at = NOW()
  WHERE id = p_ingredient_id;

  -- Record transaction
  INSERT INTO inventory_transactions (
    ingredient_id,
    transaction_type,
    quantity,
    previous_stock,
    new_stock,
    cost_per_unit,
    total_cost,
    sale_id,
    return_id,
    product_id,
    user_id,
    notes,
    restaurant_id
  ) VALUES (
    p_ingredient_id,
    p_transaction_type,
    p_quantity,
    v_previous_stock,
    v_new_stock,
    v_cost_per_unit,
    ABS(p_quantity) * v_cost_per_unit,
    p_sale_id,
    p_return_id,
    p_product_id,
    p_user_id,
    p_notes,
    p_restaurant_id
  );
END;
$$ LANGUAGE plpgsql;

-- Function to process recipe deductions for a sale
CREATE OR REPLACE FUNCTION process_recipe_deductions(
  p_sale_id UUID,
  p_user_id TEXT,
  p_restaurant_id TEXT
)
RETURNS VOID AS $$
DECLARE
  v_sale_item RECORD;
  v_recipe RECORD;
  v_total_quantity NUMERIC;
BEGIN
  -- Loop through each sale item
  FOR v_sale_item IN
    SELECT si.*, p.product_type
    FROM sale_items si
    JOIN products p ON si.product_id = p.id
    WHERE si.sale_id = p_sale_id
  LOOP
    -- Only process recipe products
    IF v_sale_item.product_type = 'recipe' THEN
      -- Loop through each ingredient in the recipe
      FOR v_recipe IN
        SELECT * FROM recipes WHERE product_id = v_sale_item.product_id
      LOOP
        -- Calculate total quantity needed (recipe quantity * items sold)
        v_total_quantity := v_recipe.quantity * v_sale_item.quantity;

        -- Deduct from ingredient stock (negative quantity)
        PERFORM update_ingredient_stock(
          v_recipe.ingredient_id,
          -v_total_quantity,
          'sale_deduction',
          p_user_id,
          p_restaurant_id,
          p_sale_id,
          NULL,
          v_sale_item.product_id,
          format('Sale %s: %s x %s', p_sale_id, v_sale_item.quantity, v_recipe.quantity)
        );
      END LOOP;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate product availability based on ingredients
CREATE OR REPLACE FUNCTION calculate_product_availability(p_product_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_min_available INTEGER;
  v_ingredient_availability INTEGER;
  v_recipe RECORD;
BEGIN
  -- Initialize with max integer
  v_min_available := 2147483647;

  -- Loop through recipe ingredients
  FOR v_recipe IN
    SELECT r.*, i.current_stock
    FROM recipes r
    JOIN ingredients i ON r.ingredient_id = i.id
    WHERE r.product_id = p_product_id
  LOOP
    -- Calculate how many products can be made with this ingredient
    v_ingredient_availability := FLOOR(v_recipe.current_stock / v_recipe.quantity);

    -- Keep the minimum availability
    IF v_ingredient_availability < v_min_available THEN
      v_min_available := v_ingredient_availability;
    END IF;
  END LOOP;

  -- If no recipes found, return current stock
  IF v_min_available = 2147483647 THEN
    SELECT stock INTO v_min_available FROM products WHERE id = p_product_id;
  END IF;

  RETURN COALESCE(v_min_available, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to calculate recipe cost
CREATE OR REPLACE FUNCTION calculate_recipe_cost(p_product_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_total_cost NUMERIC;
BEGIN
  SELECT COALESCE(SUM(r.quantity * i.cost_per_unit), 0)
  INTO v_total_cost
  FROM recipes r
  JOIN ingredients i ON r.ingredient_id = i.id
  WHERE r.product_id = p_product_id;

  RETURN v_total_cost;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. TRIGGERS
-- ============================================

-- Trigger to update product calculated cost when recipe changes
CREATE OR REPLACE FUNCTION update_product_cost()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET calculated_cost = calculate_recipe_cost(NEW.product_id),
      updated_at = NOW()
  WHERE id = NEW.product_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_product_cost ON recipes;
CREATE TRIGGER trigger_update_product_cost
  AFTER INSERT OR UPDATE ON recipes
  FOR EACH ROW
  EXECUTE FUNCTION update_product_cost();

-- Function for updated_at (reuse if exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at on ingredients
DROP TRIGGER IF EXISTS trigger_update_ingredients_updated_at ON ingredients;
CREATE TRIGGER trigger_update_ingredients_updated_at
  BEFORE UPDATE ON ingredients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for updated_at on recipes
DROP TRIGGER IF EXISTS trigger_update_recipes_updated_at ON recipes;
CREATE TRIGGER trigger_update_recipes_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_ingredients_restaurant_id ON ingredients(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_ingredients_sku ON ingredients(sku);
CREATE INDEX IF NOT EXISTS idx_ingredients_category ON ingredients(category);
CREATE INDEX IF NOT EXISTS idx_ingredients_current_stock ON ingredients(current_stock);

CREATE INDEX IF NOT EXISTS idx_recipes_product_id ON recipes(product_id);
CREATE INDEX IF NOT EXISTS idx_recipes_ingredient_id ON recipes(ingredient_id);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_ingredient_id ON inventory_transactions(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_sale_id ON inventory_transactions(sale_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_restaurant_id ON inventory_transactions(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created_at ON inventory_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type ON inventory_transactions(transaction_type);

CREATE INDEX IF NOT EXISTS idx_products_product_type ON products(product_type);

-- ============================================
-- 8. ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ingredients (allow all authenticated users for now)
CREATE POLICY "Users can view their restaurant's ingredients"
  ON ingredients FOR SELECT
  USING (true);
CREATE POLICY "Users can insert ingredients for their restaurant"
  ON ingredients FOR INSERT
  WITH CHECK (true);
CREATE POLICY "Users can update their restaurant's ingredients"
  ON ingredients FOR UPDATE
  USING (true);
CREATE POLICY "Users can delete their restaurant's ingredients"
  ON ingredients FOR DELETE
  USING (true);

-- RLS Policies for recipes (simplified - allow all authenticated users)
CREATE POLICY "Users can view recipes for their restaurant's products"
  ON recipes FOR SELECT
  USING (true);
CREATE POLICY "Users can insert recipes for their restaurant's products"
  ON recipes FOR INSERT
  WITH CHECK (true);
CREATE POLICY "Users can update recipes for their restaurant's products"
  ON recipes FOR UPDATE
  USING (true);
CREATE POLICY "Users can delete recipes for their restaurant's products"
  ON recipes FOR DELETE
  USING (true);

-- RLS Policies for inventory_transactions (allow all authenticated users for now)
CREATE POLICY "Users can view their restaurant's inventory transactions"
  ON inventory_transactions FOR SELECT
  USING (true);
CREATE POLICY "Users can insert inventory transactions for their restaurant"
  ON inventory_transactions FOR INSERT
  WITH CHECK (true);

-- ============================================
-- 9. GRANTS
-- ============================================
GRANT ALL ON ingredients TO authenticated;
GRANT ALL ON recipes TO authenticated;
GRANT ALL ON inventory_transactions TO authenticated;
GRANT EXECUTE ON FUNCTION update_ingredient_stock TO authenticated;
GRANT EXECUTE ON FUNCTION process_recipe_deductions TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_product_availability TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_recipe_cost TO authenticated;
GRANT EXECUTE ON FUNCTION update_product_cost TO authenticated;
GRANT EXECUTE ON FUNCTION update_updated_at_column TO authenticated;

-- ============================================
-- 10. COMMENTS
-- ============================================
COMMENT ON TABLE ingredients IS 'Base ingredients/supplies for recipe-based inventory management';
COMMENT ON TABLE recipes IS 'Product recipes: mapping products to required ingredients with quantities';
COMMENT ON TABLE inventory_transactions IS 'Complete audit trail of all inventory movements';
COMMENT ON COLUMN products.product_type IS 'Product type: simple (regular) or recipe (composed of ingredients)';
COMMENT ON COLUMN products.calculated_cost IS 'Auto-calculated cost for recipe products based on ingredient costs';
COMMENT ON FUNCTION process_recipe_deductions IS 'Automatically deducts ingredients when a recipe product is sold';
COMMENT ON FUNCTION calculate_product_availability IS 'Calculates how many units of a recipe product can be made with current ingredient stock';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Migration completed successfully!';
  RAISE NOTICE 'Ingredients system is now ready to use.';
END $$;

-- ===== 015_fix_product_visibility.sql =====
-- =================================================================
-- Migración: Corregir visibilidad de productos existentes
-- Fecha: 2025-11-25
-- Descripción: Actualiza productos existentes para que tengan los
--              campos de visibilidad configurados correctamente
-- =================================================================

-- Actualizar productos que no tienen available_in_pos configurado
-- Por defecto, todos los productos deberían estar disponibles en POS
UPDATE products
SET available_in_pos = true
WHERE available_in_pos IS NULL
  OR (product_type = 'inventory' AND available_in_pos = false);

-- Actualizar productos de menú digital
UPDATE products
SET available_in_digital_menu = true
WHERE product_type = 'menu_digital'
  AND (available_in_digital_menu IS NULL OR available_in_digital_menu = false);

-- Actualizar track_inventory basado en product_type si no está configurado
UPDATE products
SET track_inventory = true
WHERE product_type = 'inventory'
  AND (track_inventory IS NULL OR track_inventory = false);

UPDATE products
SET track_inventory = false
WHERE product_type = 'menu_digital'
  AND track_inventory = true;

-- Para productos sin product_type definido, usar valores por defecto seguros
UPDATE products
SET
  available_in_pos = COALESCE(available_in_pos, true),
  available_in_digital_menu = COALESCE(available_in_digital_menu, false),
  track_inventory = COALESCE(track_inventory, true)
WHERE product_type IS NULL;

-- Agregar columna active si no existe (por si acaso)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'active'
  ) THEN
    ALTER TABLE products ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Actualizar productos inactivos
UPDATE products
SET active = true
WHERE active IS NULL;

-- ===== 016_multi_brand_white_label.sql =====
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
    ALTER TABLE users ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id);
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
    ALTER TABLE products ADD COLUMN IF NOT EXISTS restaurant_id_fk UUID REFERENCES restaurants(id);
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

-- ===== 017_add_super_admin_role.sql =====
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
    ALTER TABLE users ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'USER';
    RAISE NOTICE 'Added role column to users table';
  ELSE
    RAISE NOTICE 'Role column already exists in users table';
  END IF;
END $$;

-- ============================================
-- STEP 3: CREATE INDEX IF NOT EXISTS on role for faster queries
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

-- ===== 018_fix_rls_policies_clerk_id.sql =====
-- Migration: Fix RLS Policies - Use correct clerk_id column
-- Description: Fix policies that incorrectly referenced clerk_user_id instead of clerk_id

-- ============================================
-- FIX BRANDS POLICIES
-- ============================================

-- Drop incorrect policies

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

-- ===== 019_fix_product_type_constraint.sql =====
-- =================================================================
-- Migration: Fix product_type constraint to allow all valid types
-- Date: 2025-01-30
-- Description: Updates the product_type constraint to allow:
--              - 'simple' (simple product)
--              - 'recipe' (product with ingredient recipe)
--              - 'menu_digital' (legacy - digitalized menu items)
--              - 'inventory' (legacy - regular inventory items)
-- =================================================================

-- Drop existing constraint
ALTER TABLE products
DROP CONSTRAINT IF EXISTS valid_product_type;

-- Add updated constraint with all valid values
ALTER TABLE products
ADD CONSTRAINT valid_product_type CHECK (
  product_type IN ('simple', 'recipe', 'menu_digital', 'inventory')
);

-- Update any products with 'menu_digital' or 'inventory' to 'simple' if needed
-- (This is optional - only if you want to migrate legacy types)
-- UPDATE products SET product_type = 'simple' WHERE product_type IN ('menu_digital', 'inventory');

-- Add comment
COMMENT ON CONSTRAINT valid_product_type ON products IS
'Valid product types: simple, recipe, menu_digital (legacy), inventory (legacy)';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Product type constraint fixed! Now accepts: simple, recipe, menu_digital, inventory';
END $$;

-- ===== 020_terminal_connections.sql =====
-- Terminal Connections table for storing OAuth tokens from payment terminals
-- Supports Mercado Pago Point, Clip, and other terminal integrations

CREATE TABLE IF NOT EXISTS terminal_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    mp_user_id TEXT,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    public_key TEXT,
    token_expires_at TIMESTAMPTZ,
    live_mode BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'connected',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one connection per provider per user
    UNIQUE(user_id, provider)
);

-- Enable RLS
ALTER TABLE terminal_connections ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own connections
CREATE POLICY "Users can view their own terminal connections"
    ON terminal_connections
    FOR SELECT
    USING (
        user_id = current_setting('request.jwt.claims', true)::json->>'sub'
        OR user_id = auth.uid()::text
    );

-- Policy: Service role can do everything (for API callbacks)
CREATE POLICY "Service role full access to terminal connections"
    ON terminal_connections
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_terminal_connections_user_provider 
    ON terminal_connections(user_id, provider);

-- Index for status queries
CREATE INDEX IF NOT EXISTS idx_terminal_connections_status 
    ON terminal_connections(status);

-- ===== 021_business_verticals_complete.sql =====
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
    ALTER TABLE verticals ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES vertical_categories(id);
  END IF;
  
  -- Add slug for URL-friendly names
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'verticals' AND column_name = 'slug') THEN
    ALTER TABLE verticals ADD COLUMN IF NOT EXISTS slug TEXT;
  END IF;
  
  -- Add English name
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'verticals' AND column_name = 'display_name_en') THEN
    ALTER TABLE verticals ADD COLUMN IF NOT EXISTS display_name_en TEXT;
  END IF;
  
  -- Add description in English
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'verticals' AND column_name = 'description_en') THEN
    ALTER TABLE verticals ADD COLUMN IF NOT EXISTS description_en TEXT;
  END IF;
  
  -- Add suggested system name
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'verticals' AND column_name = 'suggested_system_name') THEN
    ALTER TABLE verticals ADD COLUMN IF NOT EXISTS suggested_system_name TEXT;
  END IF;
  
  -- Add suggested domain prefix
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'verticals' AND column_name = 'suggested_domain_prefix') THEN
    ALTER TABLE verticals ADD COLUMN IF NOT EXISTS suggested_domain_prefix TEXT;
  END IF;
  
  -- Add sort order
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'verticals' AND column_name = 'sort_order') THEN
    ALTER TABLE verticals ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
  END IF;
  
  -- Add popularity score
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'verticals' AND column_name = 'popularity_score') THEN
    ALTER TABLE verticals ADD COLUMN IF NOT EXISTS popularity_score INTEGER DEFAULT 0;
  END IF;
END $$;

-- CREATE UNIQUE INDEX IF NOT EXISTS on slug
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
-- Drop existing policies if they exist

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

-- ===== 021_terminal_connections_device_columns.sql =====
-- Add selected device columns to terminal_connections table
-- These columns store which terminal device the user has selected

ALTER TABLE terminal_connections 
ADD COLUMN IF NOT EXISTS selected_device_id TEXT,
ADD COLUMN IF NOT EXISTS selected_device_name TEXT;

-- Add index for device lookups
CREATE INDEX IF NOT EXISTS idx_terminal_connections_device 
    ON terminal_connections(selected_device_id);

-- ===== 022_insert_all_verticals.sql =====
-- Migration: Insert All Business Verticals (250+)
-- Description: Complete catalog of business types with modules and terminology

-- ============================================
-- HELPER: Get category and module IDs
-- ============================================

-- Create temporary function to insert vertical with config
CREATE OR REPLACE FUNCTION temp_insert_vertical(
  p_category_name TEXT,
  p_name TEXT,
  p_slug TEXT,
  p_display_name TEXT,
  p_display_name_en TEXT,
  p_description TEXT,
  p_icon TEXT,
  p_suggested_system_name TEXT,
  p_suggested_domain_prefix TEXT,
  p_popularity INTEGER,
  p_sort INTEGER,
  -- Terminology
  p_customer_singular TEXT DEFAULT 'Cliente',
  p_customer_plural TEXT DEFAULT 'Clientes',
  p_product_singular TEXT DEFAULT 'Producto',
  p_product_plural TEXT DEFAULT 'Productos',
  p_order_singular TEXT DEFAULT 'Orden',
  p_order_plural TEXT DEFAULT 'Órdenes',
  -- Modules (keys)
  p_required_modules TEXT[] DEFAULT ARRAY['pos', 'inventory', 'customers', 'reports'],
  p_recommended_modules TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_optional_modules TEXT[] DEFAULT ARRAY[]::TEXT[]
)
RETURNS UUID AS $$
DECLARE
  v_category_id UUID;
  v_vertical_id UUID;
  v_module_id UUID;
  v_module_key TEXT;
BEGIN
  -- Get category ID
  SELECT id INTO v_category_id FROM vertical_categories WHERE name = p_category_name;
  
  -- Insert or update vertical
  INSERT INTO verticals (name, slug, display_name, display_name_en, description, icon, category_id, 
    suggested_system_name, suggested_domain_prefix, popularity_score, sort_order, active)
  VALUES (p_name, p_slug, p_display_name, p_display_name_en, p_description, p_icon, v_category_id,
    p_suggested_system_name, p_suggested_domain_prefix, p_popularity, p_sort, true)
  ON CONFLICT (name) DO UPDATE SET
    slug = EXCLUDED.slug,
    display_name = EXCLUDED.display_name,
    display_name_en = EXCLUDED.display_name_en,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    category_id = EXCLUDED.category_id,
    suggested_system_name = EXCLUDED.suggested_system_name,
    suggested_domain_prefix = EXCLUDED.suggested_domain_prefix,
    popularity_score = EXCLUDED.popularity_score,
    sort_order = EXCLUDED.sort_order
  RETURNING id INTO v_vertical_id;
  
  -- Insert terminology
  INSERT INTO vertical_terminology (vertical_id, customer_singular, customer_plural, 
    product_singular, product_plural, order_singular, order_plural)
  VALUES (v_vertical_id, p_customer_singular, p_customer_plural, 
    p_product_singular, p_product_plural, p_order_singular, p_order_plural)
  ON CONFLICT (vertical_id) DO UPDATE SET
    customer_singular = EXCLUDED.customer_singular,
    customer_plural = EXCLUDED.customer_plural,
    product_singular = EXCLUDED.product_singular,
    product_plural = EXCLUDED.product_plural,
    order_singular = EXCLUDED.order_singular,
    order_plural = EXCLUDED.order_plural;
  
  -- Insert required modules
  FOREACH v_module_key IN ARRAY p_required_modules
  LOOP
    SELECT id INTO v_module_id FROM system_modules WHERE key = v_module_key;
    IF v_module_id IS NOT NULL THEN
      INSERT INTO vertical_module_configs (vertical_id, module_id, enabled_by_default, is_required, is_recommended)
      VALUES (v_vertical_id, v_module_id, true, true, false)
      ON CONFLICT (vertical_id, module_id) DO UPDATE SET
        enabled_by_default = true, is_required = true;
    END IF;
  END LOOP;
  
  -- Insert recommended modules
  FOREACH v_module_key IN ARRAY p_recommended_modules
  LOOP
    SELECT id INTO v_module_id FROM system_modules WHERE key = v_module_key;
    IF v_module_id IS NOT NULL THEN
      INSERT INTO vertical_module_configs (vertical_id, module_id, enabled_by_default, is_required, is_recommended)
      VALUES (v_vertical_id, v_module_id, true, false, true)
      ON CONFLICT (vertical_id, module_id) DO UPDATE SET
        enabled_by_default = true, is_recommended = true;
    END IF;
  END LOOP;
  
  -- Insert optional modules
  FOREACH v_module_key IN ARRAY p_optional_modules
  LOOP
    SELECT id INTO v_module_id FROM system_modules WHERE key = v_module_key;
    IF v_module_id IS NOT NULL THEN
      INSERT INTO vertical_module_configs (vertical_id, module_id, enabled_by_default, is_required, is_recommended)
      VALUES (v_vertical_id, v_module_id, false, false, false)
      ON CONFLICT (vertical_id, module_id) DO UPDATE SET
        enabled_by_default = false;
    END IF;
  END LOOP;
  
  RETURN v_vertical_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 1. ABARROTES Y ALIMENTOS (37 giros)
-- ============================================
SELECT temp_insert_vertical('grocery', 'tienda_abarrotes', 'tienda-abarrotes', 'Tienda de Abarrotes', 'Grocery Store', 'Tienda de productos básicos y abarrotes', 'Store', 'AbarrotesPos', 'abarrotes', 100, 1);
SELECT temp_insert_vertical('grocery', 'mini_super', 'mini-super', 'Mini Super', 'Mini Mart', 'Pequeño supermercado de barrio', 'ShoppingCart', 'MiniSuperPos', 'minisuper', 95, 2);
SELECT temp_insert_vertical('grocery', 'supermercado', 'supermercado', 'Supermercado', 'Supermarket', 'Supermercado con múltiples departamentos', 'ShoppingBag', 'SuperPos', 'super', 90, 3, 'Cliente', 'Clientes', 'Producto', 'Productos', 'Compra', 'Compras', ARRAY['pos', 'inventory', 'customers', 'reports', 'barcode_scanning'], ARRAY['loyalty_program', 'suppliers'], ARRAY['delivery', 'online_ordering']);
SELECT temp_insert_vertical('grocery', 'hipermercado', 'hipermercado', 'Hipermercado', 'Hypermarket', 'Gran almacén con todo tipo de productos', 'Building2', 'HiperPos', 'hiper', 70, 4);
SELECT temp_insert_vertical('grocery', 'tienda_conveniencia', 'tienda-conveniencia', 'Tienda de Conveniencia', 'Convenience Store', 'Tienda 24 horas tipo OXXO', 'Clock', 'ConveniencePos', 'tienda24', 85, 5);
SELECT temp_insert_vertical('grocery', 'fruteria', 'fruteria', 'Frutería', 'Fruit Shop', 'Venta de frutas frescas', 'Apple', 'FruteriaPos', 'fruteria', 80, 6, 'Cliente', 'Clientes', 'Fruta', 'Frutas', 'Venta', 'Ventas', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['expiry_tracking'], ARRAY['delivery']);
SELECT temp_insert_vertical('grocery', 'verduleria', 'verduleria', 'Verdulería', 'Vegetable Shop', 'Venta de verduras y hortalizas', 'Carrot', 'VerduriaPos', 'verduleria', 78, 7, 'Cliente', 'Clientes', 'Verdura', 'Verduras', 'Venta', 'Ventas');
SELECT temp_insert_vertical('grocery', 'mercado_barrio', 'mercado-barrio', 'Mercado de Barrio', 'Neighborhood Market', 'Mercado tradicional de la comunidad', 'Store', 'MercadoPos', 'mercado', 75, 8);
SELECT temp_insert_vertical('grocery', 'bodega_alimentos', 'bodega-alimentos', 'Bodega de Alimentos', 'Food Warehouse', 'Venta mayorista de alimentos', 'Warehouse', 'BodegaPos', 'bodega', 60, 9);
SELECT temp_insert_vertical('grocery', 'ultramarinos', 'ultramarinos', 'Víveres y Ultramarinos', 'General Store', 'Tienda tradicional de víveres', 'Package', 'ViveresPos', 'viveres', 55, 10);
SELECT temp_insert_vertical('grocery', 'carniceria', 'carniceria', 'Carnicería', 'Butcher Shop', 'Venta de carnes frescas', 'Beef', 'CarnePos', 'carniceria', 85, 11, 'Cliente', 'Clientes', 'Corte', 'Cortes', 'Venta', 'Ventas', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['expiry_tracking', 'batch_tracking'], ARRAY['delivery']);
SELECT temp_insert_vertical('grocery', 'polleria', 'polleria', 'Pollería', 'Poultry Shop', 'Venta de pollo y aves', 'Bird', 'PolleriaPos', 'polleria', 80, 12);
SELECT temp_insert_vertical('grocery', 'pescaderia', 'pescaderia', 'Pescadería', 'Fish Market', 'Venta de pescados y mariscos frescos', 'Fish', 'PescaderiaPos', 'pescaderia', 75, 13);
SELECT temp_insert_vertical('grocery', 'cremeria', 'cremeria', 'Cremería', 'Dairy Shop', 'Venta de lácteos y quesos', 'Milk', 'CremeriaPos', 'cremeria', 70, 14);
SELECT temp_insert_vertical('grocery', 'salchichoneria', 'salchichoneria', 'Salchichonería', 'Deli', 'Embutidos y carnes frías', 'Ham', 'SalchichoneriaPos', 'salchichoneria', 65, 15);
SELECT temp_insert_vertical('grocery', 'tortilleria', 'tortilleria', 'Tortillería', 'Tortilla Shop', 'Elaboración y venta de tortillas', 'Circle', 'TortillaPos', 'tortilleria', 90, 16);
SELECT temp_insert_vertical('grocery', 'panaderia', 'panaderia', 'Panadería', 'Bakery', 'Pan y productos de panadería', 'Croissant', 'PanaderiaPos', 'panaderia', 88, 17, 'Cliente', 'Clientes', 'Pan', 'Panes', 'Venta', 'Ventas', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['ingredients', 'expiry_tracking'], ARRAY['online_ordering']);
SELECT temp_insert_vertical('grocery', 'pasteleria', 'pasteleria', 'Pastelería', 'Pastry Shop', 'Pasteles y repostería fina', 'Cake', 'PasteleriaPos', 'pasteleria', 85, 18, 'Cliente', 'Clientes', 'Pastel', 'Pasteles', 'Pedido', 'Pedidos', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['ingredients', 'reservations'], ARRAY['online_ordering', 'delivery']);
SELECT temp_insert_vertical('grocery', 'reposteria', 'reposteria', 'Repostería', 'Confectionery', 'Postres y dulces artesanales', 'Cookie', 'ReposteriaPos', 'reposteria', 80, 19);
SELECT temp_insert_vertical('grocery', 'dulceria', 'dulceria', 'Dulcería', 'Candy Store', 'Dulces, chocolates y golosinas', 'Candy', 'DulceriaPos', 'dulceria', 75, 20);
SELECT temp_insert_vertical('grocery', 'dulces_granel', 'dulces-granel', 'Dulces a Granel', 'Bulk Candy', 'Distribución de dulces por mayoreo', 'Package', 'DulcesGranelPos', 'dulcesgranel', 60, 21);
SELECT temp_insert_vertical('grocery', 'tienda_naturista', 'tienda-naturista', 'Tienda Naturista', 'Health Food Store', 'Productos naturales y suplementos', 'Leaf', 'NaturistaPos', 'naturista', 70, 22);
SELECT temp_insert_vertical('grocery', 'tienda_vegana', 'tienda-vegana', 'Tienda Vegana', 'Vegan Store', 'Productos 100% veganos', 'Vegan', 'VeganoPos', 'vegano', 65, 23);
SELECT temp_insert_vertical('grocery', 'sin_gluten', 'sin-gluten', 'Productos Sin Gluten', 'Gluten-Free Store', 'Especialidad en productos sin gluten', 'Wheat', 'SinGlutenPos', 'singluten', 55, 24);
SELECT temp_insert_vertical('grocery', 'organicos', 'organicos', 'Productos Orgánicos', 'Organic Store', 'Alimentos orgánicos certificados', 'Sprout', 'OrganicPos', 'organico', 60, 25);
SELECT temp_insert_vertical('grocery', 'semillas_granos', 'semillas-granos', 'Semillas y Granos', 'Seeds & Grains', 'Venta de semillas, granos y cereales', 'Wheat', 'SemillasPos', 'semillas', 50, 26);
SELECT temp_insert_vertical('grocery', 'especias', 'especias', 'Tienda de Especias', 'Spice Shop', 'Especias, condimentos y hierbas', 'Flame', 'EspeciasPos', 'especias', 55, 27);
SELECT temp_insert_vertical('grocery', 'tienda_gourmet', 'tienda-gourmet', 'Tienda Gourmet', 'Gourmet Store', 'Productos gourmet y delicatessen', 'Star', 'GourmetPos', 'gourmet', 65, 28);
SELECT temp_insert_vertical('grocery', 'cafe_grano', 'cafe-grano', 'Tienda de Café en Grano', 'Coffee Bean Shop', 'Café de especialidad y granos selectos', 'Coffee', 'CafeGranoPos', 'cafegrano', 70, 29);
SELECT temp_insert_vertical('grocery', 'tes_infusiones', 'tes-infusiones', 'Tés e Infusiones', 'Tea Shop', 'Tés, infusiones y accesorios', 'CupSoda', 'TePos', 'tiendadete', 55, 30);
SELECT temp_insert_vertical('grocery', 'productos_importados', 'productos-importados', 'Productos Importados', 'Import Store', 'Bodega de productos internacionales', 'Globe', 'ImportadosPos', 'importados', 50, 31);
SELECT temp_insert_vertical('grocery', 'congelados', 'congelados', 'Tienda de Congelados', 'Frozen Food Store', 'Alimentos congelados y hielo', 'Snowflake', 'CongeladosPos', 'congelados', 55, 32);
SELECT temp_insert_vertical('grocery', 'huevos_lacteos', 'huevos-lacteos', 'Huevos y Lácteos', 'Eggs & Dairy', 'Venta especializada en lácteos y huevos', 'Egg', 'LacteosPos', 'lacteos', 60, 33);
SELECT temp_insert_vertical('grocery', 'miel_derivados', 'miel-derivados', 'Miel y Derivados', 'Honey Shop', 'Miel, polen y productos apícolas', 'Hexagon', 'MielPos', 'miel', 45, 34);
SELECT temp_insert_vertical('grocery', 'abarrotes_mayoreo', 'abarrotes-mayoreo', 'Abarrotes Mayoristas', 'Wholesale Grocery', 'Venta de abarrotes al mayoreo', 'Boxes', 'MayoreoPos', 'mayoreo', 65, 35);
SELECT temp_insert_vertical('grocery', 'snacks_saludables', 'snacks-saludables', 'Snacks Saludables', 'Healthy Snacks', 'Botanas y snacks nutritivos', 'Apple', 'SnacksPos', 'snackssanos', 50, 36);
SELECT temp_insert_vertical('grocery', 'productos_diabeticos', 'productos-diabeticos', 'Productos para Diabéticos', 'Diabetic Products', 'Productos especiales sin azúcar', 'Heart', 'DiabeticosPos', 'diabeticos', 45, 37);

-- ============================================
-- 2. BEBIDAS, VINOS Y TABACO (11 giros)
-- ============================================
SELECT temp_insert_vertical('beverages', 'vinateria', 'vinateria', 'Vinatería', 'Wine Shop', 'Venta de vinos y licores', 'Wine', 'VinateriaPos', 'vinateria', 80, 1, 'Cliente', 'Clientes', 'Botella', 'Botellas', 'Venta', 'Ventas', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['age_verification', 'loyalty_program'], ARRAY['delivery']);
SELECT temp_insert_vertical('beverages', 'licoreria', 'licoreria', 'Licorería', 'Liquor Store', 'Venta de licores y destilados', 'GlassWater', 'LicoreriaPos', 'licoreria', 85, 2);
SELECT temp_insert_vertical('beverages', 'cerveza_artesanal', 'cerveza-artesanal', 'Cerveza Artesanal', 'Craft Beer Shop', 'Cervecería artesanal y local', 'Beer', 'CervezaPos', 'cervezaartesanal', 75, 3);
SELECT temp_insert_vertical('beverages', 'distribuidor_vinos', 'distribuidor-vinos', 'Distribuidor de Vinos', 'Wine Distributor', 'Distribución mayorista de vinos', 'Truck', 'VinosDistPos', 'vinosdist', 60, 4);
SELECT temp_insert_vertical('beverages', 'mezcaleria', 'mezcaleria', 'Mezcalería', 'Mezcal Shop', 'Especialidad en mezcales artesanales', 'Flask', 'MezcalPos', 'mezcaleria', 70, 5);
SELECT temp_insert_vertical('beverages', 'vinos_premium', 'vinos-premium', 'Boutique de Vinos Premium', 'Premium Wine Boutique', 'Vinos de alta gama y colección', 'Crown', 'VinosPremiumPos', 'vinospremium', 55, 6);
SELECT temp_insert_vertical('beverages', 'whisky', 'whisky', 'Tienda de Whisky', 'Whisky Shop', 'Especialidad en whiskys del mundo', 'GlassWater', 'WhiskyPos', 'whisky', 50, 7);
SELECT temp_insert_vertical('beverages', 'cigarreria', 'cigarreria', 'Cigarrería', 'Tobacco Shop', 'Venta de cigarros y tabaco', 'Cigarette', 'CigarreriaPos', 'cigarreria', 65, 8);
SELECT temp_insert_vertical('beverages', 'puros', 'puros', 'Tienda de Puros', 'Cigar Shop', 'Puros y accesorios premium', 'Flame', 'PurosPos', 'puros', 50, 9);
SELECT temp_insert_vertical('beverages', 'vape_shop', 'vape-shop', 'Vape Shop', 'Vape Shop', 'Cigarros electrónicos y líquidos', 'Cloud', 'VapePos', 'vapeshop', 70, 10);
SELECT temp_insert_vertical('beverages', 'hookah', 'hookah', 'Hookah / Shisha', 'Hookah Shop', 'Accesorios y tabaco para hookah', 'Droplets', 'HookahPos', 'hookah', 45, 11);

-- ============================================
-- 3. RESTAURANTES Y COMIDA (34 giros)
-- ============================================
SELECT temp_insert_vertical('restaurants', 'restaurante', 'restaurante', 'Restaurante', 'Restaurant', 'Restaurante de servicio completo', 'UtensilsCrossed', 'RestaurantePos', 'restaurante', 100, 1, 'Comensal', 'Comensales', 'Platillo', 'Platillos', 'Orden', 'Órdenes', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['digital_menu', 'table_management', 'kitchen_display', 'ingredients', 'reservations'], ARRAY['voice_ordering', 'delivery', 'online_ordering']);
SELECT temp_insert_vertical('restaurants', 'taqueria', 'taqueria', 'Taquería', 'Taco Shop', 'Tacos y antojitos mexicanos', 'Beef', 'TaqueriaPos', 'taqueria', 95, 2, 'Cliente', 'Clientes', 'Taco', 'Tacos', 'Orden', 'Órdenes');
SELECT temp_insert_vertical('restaurants', 'torteria', 'torteria', 'Tortería', 'Sandwich Shop', 'Tortas y sandwiches', 'Sandwich', 'TorteriaPos', 'torteria', 80, 3);
SELECT temp_insert_vertical('restaurants', 'loncheria', 'loncheria', 'Lonchería', 'Lunch Counter', 'Comida casera y económica', 'Soup', 'LoncheriaPos', 'loncheria', 75, 4);
SELECT temp_insert_vertical('restaurants', 'comida_rapida', 'comida-rapida', 'Comida Rápida', 'Fast Food', 'Servicio rápido de alimentos', 'Zap', 'FastFoodPos', 'comidarapida', 90, 5, 'Cliente', 'Clientes', 'Combo', 'Combos', 'Orden', 'Órdenes', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['kitchen_display', 'queue_management'], ARRAY['delivery', 'online_ordering']);
SELECT temp_insert_vertical('restaurants', 'cafeteria', 'cafeteria', 'Cafetería', 'Coffee Shop', 'Café y bebidas calientes', 'Coffee', 'CafePos', 'cafeteria', 95, 6, 'Cliente', 'Clientes', 'Bebida', 'Bebidas', 'Orden', 'Órdenes', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['loyalty_program', 'digital_menu'], ARRAY['online_ordering']);
SELECT temp_insert_vertical('restaurants', 'heladeria', 'heladeria', 'Heladería', 'Ice Cream Shop', 'Helados y postres fríos', 'IceCream', 'HeladeriaPos', 'heladeria', 85, 7);
SELECT temp_insert_vertical('restaurants', 'paleteria', 'paleteria', 'Paletería', 'Popsicle Shop', 'Paletas y nieves artesanales', 'Popsicle', 'PaleteriaPos', 'paleteria', 75, 8);
SELECT temp_insert_vertical('restaurants', 'smoothie_bar', 'smoothie-bar', 'Smoothie Bar', 'Smoothie Bar', 'Smoothies y bebidas saludables', 'Glass', 'SmoothiePos', 'smoothiebar', 70, 9);
SELECT temp_insert_vertical('restaurants', 'jugueria', 'jugueria', 'Juguería', 'Juice Bar', 'Jugos naturales y licuados', 'Apple', 'JugueriaPos', 'jugueria', 75, 10);
SELECT temp_insert_vertical('restaurants', 'bar_ensaladas', 'bar-ensaladas', 'Bar de Ensaladas', 'Salad Bar', 'Ensaladas frescas y saludables', 'Salad', 'EnsaladasPos', 'ensaladas', 65, 11);
SELECT temp_insert_vertical('restaurants', 'buffet', 'buffet', 'Restaurante Buffet', 'Buffet Restaurant', 'Servicio de buffet libre', 'UtensilsCrossed', 'BuffetPos', 'buffet', 70, 12);
SELECT temp_insert_vertical('restaurants', 'cocina_economica', 'cocina-economica', 'Cocina Económica', 'Budget Kitchen', 'Comida corrida y económica', 'Utensils', 'CocinaEcoPos', 'cocinaeco', 80, 13);
SELECT temp_insert_vertical('restaurants', 'marisqueria', 'marisqueria', 'Marisquería', 'Seafood Restaurant', 'Mariscos y pescados frescos', 'Fish', 'MarisqueriaPos', 'marisqueria', 80, 14);
SELECT temp_insert_vertical('restaurants', 'pizzeria', 'pizzeria', 'Pizzería', 'Pizzeria', 'Pizzas artesanales', 'Pizza', 'PizzeriaPos', 'pizzeria', 90, 15, 'Cliente', 'Clientes', 'Pizza', 'Pizzas', 'Orden', 'Órdenes', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['delivery', 'online_ordering', 'ingredients'], ARRAY['voice_ordering']);
SELECT temp_insert_vertical('restaurants', 'hamburgueseria', 'hamburgueseria', 'Hamburguesería', 'Burger Joint', 'Hamburguesas gourmet', 'Hamburger', 'BurgerPos', 'burgers', 88, 16);
SELECT temp_insert_vertical('restaurants', 'alitas', 'alitas', 'Alitas y Boneless', 'Wings Shop', 'Alitas de pollo y boneless', 'Drumstick', 'AlitasPos', 'alitas', 75, 17);
SELECT temp_insert_vertical('restaurants', 'sushi', 'sushi', 'Sushi Bar', 'Sushi Bar', 'Sushi y comida japonesa', 'Fish', 'SushiPos', 'sushi', 85, 18);
SELECT temp_insert_vertical('restaurants', 'comida_china', 'comida-china', 'Comida China', 'Chinese Restaurant', 'Comida china tradicional', 'Soup', 'ChinaPos', 'comidachina', 80, 19);
SELECT temp_insert_vertical('restaurants', 'comida_italiana', 'comida-italiana', 'Comida Italiana', 'Italian Restaurant', 'Pastas y cocina italiana', 'Wheat', 'ItalianoPos', 'italiano', 75, 20);
SELECT temp_insert_vertical('restaurants', 'food_truck', 'food-truck', 'Food Truck', 'Food Truck', 'Cocina móvil sobre ruedas', 'Truck', 'FoodTruckPos', 'foodtruck', 80, 21, 'Cliente', 'Clientes', 'Platillo', 'Platillos', 'Orden', 'Órdenes', ARRAY['pos', 'inventory', 'reports'], ARRAY['digital_menu', 'queue_management'], ARRAY[]::TEXT[]);
SELECT temp_insert_vertical('restaurants', 'restaurante_fusion', 'restaurante-fusion', 'Restaurante Fusión', 'Fusion Restaurant', 'Cocina de fusión internacional', 'Sparkles', 'FusionPos', 'fusion', 65, 22);
SELECT temp_insert_vertical('restaurants', 'gelateria', 'gelateria', 'Gelatería', 'Gelato Shop', 'Gelato italiano artesanal', 'IceCream', 'GelateriaPos', 'gelateria', 70, 23);
SELECT temp_insert_vertical('restaurants', 'chocolateria', 'chocolateria', 'Chocolatería Gourmet', 'Chocolate Shop', 'Chocolates artesanales y postres', 'Cookie', 'ChocolateriaPos', 'chocolateria', 65, 24);
SELECT temp_insert_vertical('restaurants', 'creperia', 'creperia', 'Crepería', 'Creperie', 'Crepas dulces y saladas', 'Circle', 'CreperiaPos', 'creperia', 70, 25);
SELECT temp_insert_vertical('restaurants', 'waffles', 'waffles', 'Waffles Shop', 'Waffle Shop', 'Waffles y toppings', 'Grid', 'WafflesPos', 'waffles', 65, 26);
SELECT temp_insert_vertical('restaurants', 'rotisserie', 'rotisserie', 'Rotisserie', 'Rotisserie', 'Pollo rostizado y preparados', 'Flame', 'RotisseriePos', 'rotisserie', 70, 27);
SELECT temp_insert_vertical('restaurants', 'pupuseria', 'pupuseria', 'Pupusería', 'Pupuseria', 'Pupusas salvadoreñas', 'Circle', 'PupuseriaPos', 'pupuseria', 50, 28);
SELECT temp_insert_vertical('restaurants', 'areperia', 'areperia', 'Arepería', 'Arepa Shop', 'Arepas venezolanas', 'Circle', 'AreperiaPos', 'areperia', 50, 29);
SELECT temp_insert_vertical('restaurants', 'tamaleria', 'tamaleria', 'Tamalería', 'Tamale Shop', 'Tamales tradicionales', 'Package', 'TamaleriaPos', 'tamaleria', 60, 30);
SELECT temp_insert_vertical('restaurants', 'gorditas', 'gorditas', 'Gorditas Shop', 'Gorditas Shop', 'Gorditas y antojitos', 'Circle', 'GorditasPos', 'gorditas', 55, 31);
SELECT temp_insert_vertical('restaurants', 'antojitos', 'antojitos', 'Antojitos Mexicanos', 'Mexican Snacks', 'Antojitos y comida típica', 'Star', 'AntojitosPos', 'antojitos', 70, 32);
SELECT temp_insert_vertical('restaurants', 'bar_tapas', 'bar-tapas', 'Bar de Tapas', 'Tapas Bar', 'Tapas españolas y vinos', 'Wine', 'TapasPos', 'tapas', 60, 33);
SELECT temp_insert_vertical('restaurants', 'panaderia_cafeteria', 'panaderia-cafeteria', 'Panadería-Cafetería', 'Bakery Cafe', 'Panadería con servicio de café', 'Croissant', 'BakeryCafePos', 'bakerycafe', 80, 34);

-- ============================================
-- 4. MODA Y ACCESORIOS (22 giros)
-- ============================================
SELECT temp_insert_vertical('fashion', 'boutique_mujer', 'boutique-mujer', 'Boutique de Mujer', 'Women Boutique', 'Ropa y accesorios para dama', 'Shirt', 'BoutiqueMujerPos', 'boutiquemujer', 90, 1, 'Clienta', 'Clientas', 'Prenda', 'Prendas', 'Venta', 'Ventas', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['product_variants', 'loyalty_program'], ARRAY['online_ordering']);
SELECT temp_insert_vertical('fashion', 'boutique_hombre', 'boutique-hombre', 'Boutique de Hombre', 'Men Boutique', 'Ropa y accesorios para caballero', 'Shirt', 'BoutiqueHombrePos', 'boutiquehombre', 85, 2);
SELECT temp_insert_vertical('fashion', 'ropa_bebes', 'ropa-bebes', 'Ropa para Bebés', 'Baby Clothes', 'Ropa y accesorios infantiles', 'Baby', 'RopaBebesPos', 'ropabebes', 75, 3);
SELECT temp_insert_vertical('fashion', 'ropa_infantil', 'ropa-infantil', 'Ropa Infantil', 'Kids Clothing', 'Moda para niños y niñas', 'Shirt', 'RopaKidsPos', 'ropakids', 80, 4);
SELECT temp_insert_vertical('fashion', 'ropa_juvenil', 'ropa-juvenil', 'Ropa Juvenil', 'Teen Fashion', 'Moda para adolescentes', 'Shirt', 'RopaJuvenilPos', 'ropajuvenil', 75, 5);
SELECT temp_insert_vertical('fashion', 'ropa_urbana', 'ropa-urbana', 'Ropa Urbana', 'Urban Wear', 'Streetwear y moda urbana', 'Shirt', 'UrbanWearPos', 'urbanwear', 80, 6);
SELECT temp_insert_vertical('fashion', 'ropa_deportiva', 'ropa-deportiva', 'Ropa Deportiva', 'Sportswear', 'Ropa y accesorios deportivos', 'Shirt', 'SportwearPos', 'sportwear', 85, 7);
SELECT temp_insert_vertical('fashion', 'trajes', 'trajes', 'Tienda de Trajes', 'Suit Shop', 'Trajes formales y sastrería', 'Shirt', 'TrajesPos', 'trajes', 65, 8, 'Cliente', 'Clientes', 'Traje', 'Trajes', 'Venta', 'Ventas');
SELECT temp_insert_vertical('fashion', 'vestidos_noche', 'vestidos-noche', 'Vestidos de Noche', 'Evening Dresses', 'Vestidos de gala y ocasiones especiales', 'Sparkle', 'VestidosPos', 'vestidos', 60, 9);
SELECT temp_insert_vertical('fashion', 'boutique_novias', 'boutique-novias', 'Boutique de Novias', 'Bridal Shop', 'Vestidos de novia y accesorios', 'Heart', 'NoviasPos', 'novias', 55, 10, 'Novia', 'Novias', 'Vestido', 'Vestidos', 'Pedido', 'Pedidos', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['appointments', 'reservations'], ARRAY[]::TEXT[]);
SELECT temp_insert_vertical('fashion', 'xv_anos', 'xv-anos', 'Boutique XV Años', 'Quinceañera Shop', 'Vestidos y accesorios para XV años', 'Crown', 'XVPos', 'xvanos', 60, 11);
SELECT temp_insert_vertical('fashion', 'trajes_tipicos', 'trajes-tipicos', 'Trajes Típicos', 'Traditional Clothing', 'Ropa tradicional y regional', 'Shirt', 'TipicoPos', 'trajetipico', 45, 12);
SELECT temp_insert_vertical('fashion', 'ropa_interior', 'ropa-interior', 'Ropa Interior', 'Underwear', 'Ropa interior masculina y femenina', 'Shirt', 'InteriorPos', 'ropainterior', 70, 13);
SELECT temp_insert_vertical('fashion', 'lenceria', 'lenceria', 'Lencería', 'Lingerie', 'Lencería fina y ropa de dormir', 'Heart', 'LenceriaPos', 'lenceria', 65, 14);
SELECT temp_insert_vertical('fashion', 'calcetines_medias', 'calcetines-medias', 'Calcetas y Medias', 'Socks & Hosiery', 'Calcetines, medias y accesorios', 'Footprints', 'CalcetasPos', 'calcetas', 50, 15);
SELECT temp_insert_vertical('fashion', 'second_hand', 'second-hand', 'Ropa Usada', 'Second Hand', 'Boutique de ropa de segunda mano', 'Recycle', 'SecondHandPos', 'secondhand', 65, 16);
SELECT temp_insert_vertical('fashion', 'vintage', 'vintage', 'Vintage Store', 'Vintage Store', 'Ropa y accesorios vintage', 'Clock', 'VintagePos', 'vintage', 60, 17);
SELECT temp_insert_vertical('fashion', 'zapateria', 'zapateria', 'Zapatería', 'Shoe Store', 'Calzado para toda la familia', 'Footprints', 'ZapateriaPos', 'zapateria', 85, 18, 'Cliente', 'Clientes', 'Par', 'Pares', 'Venta', 'Ventas', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['product_variants'], ARRAY['online_ordering']);
SELECT temp_insert_vertical('fashion', 'bolsos_carteras', 'bolsos-carteras', 'Bolsos y Carteras', 'Bags & Wallets', 'Bolsos, carteras y maletines', 'ShoppingBag', 'BolsosPos', 'bolsos', 70, 19);
SELECT temp_insert_vertical('fashion', 'accesorios_moda', 'accesorios-moda', 'Accesorios de Moda', 'Fashion Accessories', 'Joyería, bisutería y accesorios', 'Gem', 'AccesoriosPos', 'accesoriosmoda', 75, 20);
SELECT temp_insert_vertical('fashion', 'sombreros_gorras', 'sombreros-gorras', 'Sombreros y Gorras', 'Hats & Caps', 'Bufandas, gorras y sombreros', 'Crown', 'SombrerosPos', 'sombreros', 55, 21);
SELECT temp_insert_vertical('fashion', 'lentes_sol', 'lentes-sol', 'Lentes de Sol', 'Sunglasses', 'Lentes de sol y óptica fashion', 'Sun', 'LentesPos', 'lentessol', 65, 22);

-- ============================================
-- 5. TECNOLOGÍA Y ELECTRÓNICA (15 giros)
-- ============================================
SELECT temp_insert_vertical('technology', 'celulares', 'celulares', 'Tienda de Celulares', 'Cell Phone Store', 'Venta de smartphones y accesorios', 'Smartphone', 'CelularesPos', 'celulares', 95, 1, 'Cliente', 'Clientes', 'Equipo', 'Equipos', 'Venta', 'Ventas', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['serial_numbers', 'product_variants'], ARRAY['appointments']);
SELECT temp_insert_vertical('technology', 'accesorios_celular', 'accesorios-celular', 'Accesorios para Celular', 'Phone Accessories', 'Fundas, cargadores y accesorios', 'Cable', 'AccesoriosCelPos', 'accesorioscel', 85, 2);
SELECT temp_insert_vertical('technology', 'reparacion_celulares', 'reparacion-celulares', 'Reparación de Celulares', 'Phone Repair', 'Servicio técnico de celulares', 'Wrench', 'ReparacionCelPos', 'reparacioncel', 80, 3, 'Cliente', 'Clientes', 'Reparación', 'Reparaciones', 'Servicio', 'Servicios', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['appointments', 'serial_numbers'], ARRAY[]::TEXT[]);
SELECT temp_insert_vertical('technology', 'electronica', 'electronica', 'Tienda de Electrónica', 'Electronics Store', 'Electrónica y gadgets', 'Cpu', 'ElectronicaPos', 'electronica', 85, 4);
SELECT temp_insert_vertical('technology', 'electrodomesticos', 'electrodomesticos', 'Electrodomésticos', 'Appliances', 'Línea blanca y electrodomésticos', 'Refrigerator', 'ElectrodomesticosPos', 'electrodomesticos', 80, 5);
SELECT temp_insert_vertical('technology', 'computadoras', 'computadoras', 'Computadoras', 'Computer Store', 'Computadoras, laptops y componentes', 'Laptop', 'ComputadorasPos', 'computadoras', 85, 6);
SELECT temp_insert_vertical('technology', 'gamer', 'gamer', 'Accesorios Gamer', 'Gaming Gear', 'Equipo y accesorios para gamers', 'Gamepad2', 'GamerPos', 'gamer', 80, 7);
SELECT temp_insert_vertical('technology', 'videojuegos', 'videojuegos', 'Videojuegos', 'Video Games', 'Juegos, consolas y accesorios', 'Gamepad', 'VideojuegosPos', 'videojuegos', 85, 8);
SELECT temp_insert_vertical('technology', 'consolas', 'consolas', 'Consolas y Controles', 'Gaming Consoles', 'Consolas y controles de videojuegos', 'Gamepad', 'ConsolasPos', 'consolas', 75, 9);
SELECT temp_insert_vertical('technology', 'realidad_virtual', 'realidad-virtual', 'Realidad Virtual', 'VR Shop', 'Equipos de realidad virtual', 'Glasses', 'VRPos', 'vr', 55, 10);
SELECT temp_insert_vertical('technology', 'drones', 'drones', 'Tienda de Drones', 'Drone Shop', 'Drones y accesorios', 'Plane', 'DronesPos', 'drones', 60, 11);
SELECT temp_insert_vertical('technology', 'camaras', 'camaras', 'Cámaras Fotográficas', 'Camera Shop', 'Cámaras, lentes y accesorios', 'Camera', 'CamarasPos', 'camaras', 70, 12);
SELECT temp_insert_vertical('technology', 'iluminacion_estudio', 'iluminacion-estudio', 'Iluminación y Estudio', 'Lighting Equipment', 'Equipo de iluminación profesional', 'Lightbulb', 'IluminacionPos', 'iluminacion', 50, 13);
SELECT temp_insert_vertical('technology', 'audio_profesional', 'audio-profesional', 'Audio Profesional', 'Pro Audio', 'Equipo de audio y sonido', 'Headphones', 'AudioPos', 'audiopro', 60, 14);
SELECT temp_insert_vertical('technology', 'seguridad_cctv', 'seguridad-cctv', 'Seguridad y CCTV', 'Security Systems', 'Cámaras de seguridad y monitoreo', 'Camera', 'CCTVPos', 'cctv', 70, 15);

-- ============================================
-- 6. HOGAR Y DECORACIÓN (11 giros)
-- ============================================
SELECT temp_insert_vertical('home', 'muebleria', 'muebleria', 'Mueblería', 'Furniture Store', 'Muebles para hogar y oficina', 'Armchair', 'MuebleriaPos', 'muebleria', 85, 1, 'Cliente', 'Clientes', 'Mueble', 'Muebles', 'Venta', 'Ventas', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['delivery', 'quotes'], ARRAY['online_ordering']);
SELECT temp_insert_vertical('home', 'decoracion', 'decoracion', 'Decoración', 'Home Decor', 'Artículos de decoración', 'Lamp', 'DecoracionPos', 'decoracion', 80, 2);
SELECT temp_insert_vertical('home', 'blancos', 'blancos', 'Blancos', 'Linens', 'Sábanas, toallas y blancos', 'Bed', 'BlancosPos', 'blancos', 75, 3);
SELECT temp_insert_vertical('home', 'colchoneria', 'colchoneria', 'Colchonería', 'Mattress Store', 'Colchones y bases', 'Bed', 'ColchoneriaPos', 'colchoneria', 70, 4);
SELECT temp_insert_vertical('home', 'cocinas_integrales', 'cocinas-integrales', 'Cocinas Integrales', 'Kitchen Design', 'Cocinas y muebles de cocina', 'UtensilsCrossed', 'CocinasPos', 'cocinas', 65, 5);
SELECT temp_insert_vertical('home', 'utensilios_cocina', 'utensilios-cocina', 'Utensilios de Cocina', 'Kitchenware', 'Artículos para cocina', 'ChefHat', 'UtensiliosPos', 'utensilios', 70, 6);
SELECT temp_insert_vertical('home', 'decoracion_vintage', 'decoracion-vintage', 'Decoración Vintage', 'Vintage Decor', 'Decoración estilo vintage', 'Clock', 'VintageDecorPos', 'vintagedecor', 55, 7);
SELECT temp_insert_vertical('home', 'cuadros_arte', 'cuadros-arte', 'Cuadros y Arte', 'Art Gallery', 'Cuadros, pinturas y arte', 'Image', 'ArtePos', 'arte', 60, 8);
SELECT temp_insert_vertical('home', 'espejos_cristales', 'espejos-cristales', 'Espejos y Cristales', 'Mirrors & Glass', 'Espejos decorativos y cristalería', 'Square', 'EspejosPos', 'espejos', 55, 9);
SELECT temp_insert_vertical('home', 'persianas_cortinas', 'persianas-cortinas', 'Persianas y Cortinas', 'Blinds & Curtains', 'Persianas, cortinas y decoración ventanas', 'Blinds', 'PersianasPos', 'persianas', 60, 10);
SELECT temp_insert_vertical('home', 'iluminacion_decorativa', 'iluminacion-decorativa', 'Iluminación Decorativa', 'Decorative Lighting', 'Lámparas y luminarias decorativas', 'Lamp', 'LamparasPos', 'lamparas', 65, 11);

-- ============================================
-- 7. FERRETERÍA Y CONSTRUCCIÓN (12 giros)
-- ============================================
SELECT temp_insert_vertical('hardware', 'ferreteria', 'ferreteria', 'Ferretería', 'Hardware Store', 'Herramientas y materiales', 'Hammer', 'FerreteriaPos', 'ferreteria', 90, 1, 'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['barcode_scanning', 'suppliers'], ARRAY['delivery']);
SELECT temp_insert_vertical('hardware', 'tlapaleria', 'tlapaleria', 'Tlapalería', 'General Hardware', 'Artículos de tlapalería', 'Wrench', 'TlapaPleriaPos', 'tlapaleria', 85, 2);
SELECT temp_insert_vertical('hardware', 'materiales_construccion', 'materiales-construccion', 'Materiales de Construcción', 'Building Materials', 'Materiales para obra', 'Brick', 'MaterialesPos', 'materiales', 80, 3);
SELECT temp_insert_vertical('hardware', 'cemento_agregados', 'cemento-agregados', 'Cemento y Agregados', 'Cement & Aggregates', 'Cemento, grava y arena', 'HardDrive', 'CementoPos', 'cemento', 70, 4);
SELECT temp_insert_vertical('hardware', 'pinturas', 'pinturas', 'Pinturas y Recubrimientos', 'Paint Store', 'Pinturas, barnices y acabados', 'Palette', 'PinturasPos', 'pinturas', 80, 5);
SELECT temp_insert_vertical('hardware', 'carpinteria', 'carpinteria', 'Carpintería', 'Woodworking', 'Madera y artículos de carpintería', 'Trees', 'CarpinteriaPos', 'carpinteria', 65, 6);
SELECT temp_insert_vertical('hardware', 'herramientas_electricas', 'herramientas-electricas', 'Herramientas Eléctricas', 'Power Tools', 'Herramientas eléctricas y accesorios', 'Zap', 'HerramientasPos', 'herramientas', 75, 7);
SELECT temp_insert_vertical('hardware', 'plomeria', 'plomeria', 'Plomería', 'Plumbing', 'Artículos de plomería', 'Droplet', 'PlomeriaPos', 'plomeria', 70, 8);
SELECT temp_insert_vertical('hardware', 'electricidad', 'electricidad', 'Electricidad', 'Electrical', 'Material eléctrico', 'Zap', 'ElectricidadPos', 'electricidad', 75, 9);
SELECT temp_insert_vertical('hardware', 'cerrajeria', 'cerrajeria', 'Cerrajería', 'Locksmith', 'Cerraduras, llaves y seguridad', 'Key', 'CerrajeriaPos', 'cerrajeria', 70, 10, 'Cliente', 'Clientes', 'Servicio', 'Servicios', 'Orden', 'Órdenes');
SELECT temp_insert_vertical('hardware', 'pisos_azulejos', 'pisos-azulejos', 'Pisos y Azulejos', 'Tiles & Flooring', 'Pisos, azulejos y acabados', 'Grid', 'PisosPos', 'pisos', 70, 11);
SELECT temp_insert_vertical('hardware', 'vidrieria', 'vidrieria', 'Vidriería', 'Glass Shop', 'Vidrios, cristales y espejos', 'Square', 'VidrieriaPos', 'vidrieria', 60, 12);

-- ============================================
-- 8. MASCOTAS (7 giros)
-- ============================================
SELECT temp_insert_vertical('pets', 'pet_shop', 'pet-shop', 'Pet Shop', 'Pet Shop', 'Tienda de mascotas completa', 'PawPrint', 'PetShopPos', 'petshop', 90, 1, 'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['loyalty_program', 'appointments'], ARRAY['delivery']);
SELECT temp_insert_vertical('pets', 'alimento_mascotas', 'alimento-mascotas', 'Alimento para Mascotas', 'Pet Food', 'Alimentos y nutrición animal', 'Bone', 'AlimentoMascotasPos', 'alimentomascotas', 85, 2);
SELECT temp_insert_vertical('pets', 'accesorios_mascotas', 'accesorios-mascotas', 'Accesorios de Mascotas', 'Pet Accessories', 'Juguetes y accesorios', 'Heart', 'AccesoriosMascotasPos', 'accesoriosmascotas', 80, 3);
SELECT temp_insert_vertical('pets', 'acuario', 'acuario', 'Acuario', 'Aquarium Shop', 'Peces, peceras y accesorios', 'Fish', 'AcuarioPos', 'acuario', 65, 4);
SELECT temp_insert_vertical('pets', 'reptiles_exoticos', 'reptiles-exoticos', 'Reptiles y Exóticos', 'Exotic Pets', 'Mascotas exóticas y reptiles', 'Turtle', 'ExoticosPos', 'exoticos', 50, 5);
SELECT temp_insert_vertical('pets', 'boutique_mascotas', 'boutique-mascotas', 'Boutique de Mascotas', 'Pet Boutique', 'Ropa y accesorios premium para mascotas', 'Crown', 'BoutiqueMascotasPos', 'boutiquemascotas', 55, 6);
SELECT temp_insert_vertical('pets', 'peluqueria_mascotas', 'peluqueria-mascotas', 'Peluquería para Mascotas', 'Pet Grooming', 'Estética canina y felina', 'Scissors', 'GroomingPos', 'grooming', 75, 7, 'Cliente', 'Clientes', 'Mascota', 'Mascotas', 'Servicio', 'Servicios', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['appointments', 'staff_management'], ARRAY[]::TEXT[]);

-- ============================================
-- 9. AUTOMOTRIZ (9 giros)
-- ============================================
SELECT temp_insert_vertical('automotive', 'refaccionaria', 'refaccionaria', 'Refaccionaria', 'Auto Parts', 'Refacciones automotrices', 'Car', 'RefaccionariaPos', 'refaccionaria', 90, 1, 'Cliente', 'Clientes', 'Refacción', 'Refacciones', 'Venta', 'Ventas', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['barcode_scanning', 'serial_numbers'], ARRAY['suppliers', 'delivery']);
SELECT temp_insert_vertical('automotive', 'autopartes', 'autopartes', 'Autopartes', 'Auto Parts Store', 'Partes y accesorios automotrices', 'Wrench', 'AutopartesPos', 'autopartes', 85, 2);
SELECT temp_insert_vertical('automotive', 'llantas', 'llantas', 'Tienda de Llantas', 'Tire Shop', 'Llantas, rines y accesorios', 'Circle', 'LlantasPos', 'llantas', 80, 3);
SELECT temp_insert_vertical('automotive', 'accesorios_auto', 'accesorios-auto', 'Accesorios Automotrices', 'Car Accessories', 'Accesorios y equipamiento', 'Car', 'AccesoriosAutoPos', 'accesoriosauto', 75, 4);
SELECT temp_insert_vertical('automotive', 'car_audio', 'car-audio', 'Car Audio', 'Car Audio', 'Sistemas de sonido automotriz', 'Music', 'CarAudioPos', 'caraudio', 70, 5);
SELECT temp_insert_vertical('automotive', 'detailing', 'detailing', 'Detailing Profesional', 'Auto Detailing', 'Limpieza y detallado profesional', 'Sparkles', 'DetailingPos', 'detailing', 65, 6, 'Cliente', 'Clientes', 'Vehículo', 'Vehículos', 'Servicio', 'Servicios');
SELECT temp_insert_vertical('automotive', 'limpieza_auto', 'limpieza-auto', 'Productos Limpieza Auto', 'Car Care Products', 'Productos de limpieza automotriz', 'Droplet', 'LimpiezaAutoPos', 'limpiezaauto', 55, 7);
SELECT temp_insert_vertical('automotive', 'boutique_4x4', 'boutique-4x4', 'Boutique 4x4', '4x4 Shop', 'Accesorios para vehículos 4x4', 'Truck', 'Boutique4x4Pos', '4x4', 50, 8);
SELECT temp_insert_vertical('automotive', 'lubricantes', 'lubricantes', 'Venta de Lubricantes', 'Lubricants', 'Aceites y lubricantes automotrices', 'Droplet', 'LubricantesPos', 'lubricantes', 70, 9);

-- ============================================
-- 10. PAPELERÍA Y OFICINA (10 giros)
-- ============================================
SELECT temp_insert_vertical('office', 'papeleria', 'papeleria', 'Papelería', 'Stationery Store', 'Artículos de papelería', 'FileText', 'PapeleriaPos', 'papeleria', 90, 1, 'Cliente', 'Clientes', 'Artículo', 'Artículos', 'Venta', 'Ventas', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['barcode_scanning'], ARRAY['online_ordering']);
SELECT temp_insert_vertical('office', 'libreria', 'libreria', 'Librería', 'Bookstore', 'Libros y publicaciones', 'BookOpen', 'LibreriaPos', 'libreria', 85, 2, 'Lector', 'Lectores', 'Libro', 'Libros', 'Venta', 'Ventas');
SELECT temp_insert_vertical('office', 'copias_impresiones', 'copias-impresiones', 'Copias e Impresiones', 'Copy Center', 'Servicios de copiado e impresión', 'Printer', 'CopiasPos', 'copias', 80, 3);
SELECT temp_insert_vertical('office', 'utiles_escolares', 'utiles-escolares', 'Útiles Escolares', 'School Supplies', 'Material escolar', 'Pencil', 'UtilesPos', 'utiles', 85, 4);
SELECT temp_insert_vertical('office', 'arte_dibujo', 'arte-dibujo', 'Arte y Dibujo', 'Art Supplies', 'Materiales para artistas', 'Palette', 'ArtePos', 'artedibujo', 65, 5);
SELECT temp_insert_vertical('office', 'material_didactico', 'material-didactico', 'Material Didáctico', 'Educational Materials', 'Material educativo', 'GraduationCap', 'DidacticoPos', 'didactico', 60, 6);
SELECT temp_insert_vertical('office', 'jugueteria_educativa', 'jugueteria-educativa', 'Juguetería Educativa', 'Educational Toys', 'Juguetes educativos y didácticos', 'Puzzle', 'JugueteriaEduPos', 'jugueteriaedu', 55, 7);
SELECT temp_insert_vertical('office', 'regalos_detalles', 'regalos-detalles', 'Regalos y Detalles', 'Gift Shop', 'Regalos y artículos especiales', 'Gift', 'RegalosPos', 'regalos', 70, 8);
SELECT temp_insert_vertical('office', 'souvenirs', 'souvenirs', 'Souvenirs', 'Souvenirs', 'Recuerdos y artículos turísticos', 'Bookmark', 'SouvenirsPos', 'souvenirs', 55, 9);
SELECT temp_insert_vertical('office', 'agendas_calendarios', 'agendas-calendarios', 'Calendarios y Agendas', 'Calendars & Planners', 'Agendas, calendarios y organizadores', 'Calendar', 'AgendasPos', 'agendas', 50, 10);

-- ============================================
-- 11. BELLEZA Y ESTÉTICA (10 giros)
-- ============================================
SELECT temp_insert_vertical('beauty', 'cosmeticos', 'cosmeticos', 'Tienda de Cosméticos', 'Cosmetics Store', 'Cosméticos y maquillaje', 'Sparkle', 'CosmeticosPos', 'cosmeticos', 90, 1, 'Clienta', 'Clientas', 'Producto', 'Productos', 'Venta', 'Ventas', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['loyalty_program', 'product_variants'], ARRAY['online_ordering']);
SELECT temp_insert_vertical('beauty', 'perfumeria', 'perfumeria', 'Perfumería', 'Perfume Shop', 'Perfumes y fragancias', 'Sparkles', 'PerfumeriaPos', 'perfumeria', 85, 2);
SELECT temp_insert_vertical('beauty', 'barberia', 'barberia', 'Barbería', 'Barbershop', 'Barbería con venta de productos', 'Scissors', 'BarberiaPos', 'barberia', 90, 3, 'Cliente', 'Clientes', 'Servicio', 'Servicios', 'Corte', 'Cortes', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['appointments', 'staff_management', 'loyalty_program'], ARRAY['online_ordering']);
SELECT temp_insert_vertical('beauty', 'estetica', 'estetica', 'Estética', 'Beauty Salon', 'Salón de belleza integral', 'Sparkle', 'EsteticaPos', 'estetica', 88, 4, 'Clienta', 'Clientas', 'Servicio', 'Servicios', 'Cita', 'Citas', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['appointments', 'staff_management'], ARRAY['loyalty_program']);
SELECT temp_insert_vertical('beauty', 'esmaltes', 'esmaltes', 'Venta de Esmaltes', 'Nail Polish Shop', 'Esmaltes y accesorios de uñas', 'Paintbrush', 'EsmaltesPos', 'esmaltes', 65, 5);
SELECT temp_insert_vertical('beauty', 'maquillaje_profesional', 'maquillaje-profesional', 'Maquillaje Profesional', 'Pro Makeup', 'Maquillaje y productos profesionales', 'Palette', 'MaquillajeProPos', 'maquillajeprofe', 70, 6);
SELECT temp_insert_vertical('beauty', 'extensiones_pelucas', 'extensiones-pelucas', 'Extensiones y Pelucas', 'Wigs & Extensions', 'Extensiones de cabello y pelucas', 'Scissors', 'ExtensionesPos', 'extensiones', 55, 7);
SELECT temp_insert_vertical('beauty', 'suministros_unas', 'suministros-unas', 'Suministros para Uñas', 'Nail Supplies', 'Productos para uñas profesionales', 'Paintbrush', 'SuministrosUnasPos', 'suministrosunas', 60, 8);
SELECT temp_insert_vertical('beauty', 'spa_retail', 'spa-retail', 'Spa Retail', 'Spa Retail', 'Productos de spa y bienestar', 'Droplet', 'SpaRetailPos', 'sparetail', 65, 9, 'Cliente', 'Clientes', 'Tratamiento', 'Tratamientos', 'Sesión', 'Sesiones');
SELECT temp_insert_vertical('beauty', 'aceites_esenciales', 'aceites-esenciales', 'Aceites Esenciales', 'Essential Oils', 'Aceites esenciales y aromaterapia', 'Droplet', 'AceitesPos', 'aceites', 55, 10);

-- ============================================
-- 12. DEPORTES Y AIRE LIBRE (8 giros)
-- ============================================
SELECT temp_insert_vertical('sports', 'deportes', 'deportes', 'Tienda de Deportes', 'Sports Store', 'Artículos deportivos generales', 'Dumbbell', 'DeportesPos', 'deportes', 85, 1, 'Cliente', 'Clientes', 'Artículo', 'Artículos', 'Venta', 'Ventas', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['product_variants'], ARRAY['online_ordering']);
SELECT temp_insert_vertical('sports', 'bicicletas', 'bicicletas', 'Bicicletería', 'Bike Shop', 'Bicicletas y accesorios', 'Bike', 'BicicletasPos', 'bicicletas', 80, 2, 'Cliente', 'Clientes', 'Bicicleta', 'Bicicletas', 'Venta', 'Ventas', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['appointments', 'serial_numbers'], ARRAY['delivery']);
SELECT temp_insert_vertical('sports', 'pesca', 'pesca', 'Pesca Deportiva', 'Fishing Shop', 'Equipo de pesca deportiva', 'Fish', 'PescaPos', 'pesca', 55, 3);
SELECT temp_insert_vertical('sports', 'campismo', 'campismo', 'Tienda de Campismo', 'Camping Store', 'Equipo de camping y outdoor', 'Tent', 'CampismoPos', 'campismo', 60, 4);
SELECT temp_insert_vertical('sports', 'airsoft_paintball', 'airsoft-paintball', 'Airsoft y Paintball', 'Airsoft & Paintball', 'Equipo de airsoft y paintball', 'Target', 'AirsoftPos', 'airsoft', 50, 5);
SELECT temp_insert_vertical('sports', 'extremos', 'extremos', 'Deportes Extremos', 'Extreme Sports', 'Skate, snowboard y más', 'Snowflake', 'ExtremosPos', 'extremos', 55, 6);
SELECT temp_insert_vertical('sports', 'artes_marciales', 'artes-marciales', 'Artes Marciales', 'Martial Arts', 'Equipo de artes marciales', 'Swords', 'ArtesMarcPos', 'artesmarciales', 45, 7);
SELECT temp_insert_vertical('sports', 'yoga', 'yoga', 'Tienda de Yoga', 'Yoga Shop', 'Accesorios y ropa de yoga', 'Activity', 'YogaPos', 'yoga', 55, 8);

-- ============================================
-- 13. NIÑOS Y BEBÉS (6 giros)
-- ============================================
SELECT temp_insert_vertical('kids', 'jugueteria', 'jugueteria', 'Juguetería', 'Toy Store', 'Juguetes para todas las edades', 'Puzzle', 'JugueteriaPos', 'jugueteria', 90, 1, 'Cliente', 'Clientes', 'Juguete', 'Juguetes', 'Venta', 'Ventas', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['barcode_scanning', 'loyalty_program'], ARRAY['online_ordering', 'delivery']);
SELECT temp_insert_vertical('kids', 'tienda_bebes', 'tienda-bebes', 'Tienda de Bebés', 'Baby Store', 'Artículos para bebés', 'Baby', 'BebesPos', 'tiendabebes', 85, 2);
SELECT temp_insert_vertical('kids', 'ropa_bebe', 'ropa-bebe', 'Ropa de Bebé', 'Baby Clothing', 'Ropa para recién nacidos', 'Baby', 'RopaBebePos', 'ropabebe', 80, 3);
SELECT temp_insert_vertical('kids', 'carriolas', 'carriolas', 'Carriolas y Accesorios', 'Strollers', 'Carriolas y accesorios de bebé', 'ShoppingCart', 'CarriolasPos', 'carriolas', 70, 4);
SELECT temp_insert_vertical('kids', 'montessori', 'montessori', 'Tienda Montessori', 'Montessori Store', 'Materiales y juguetes Montessori', 'Puzzle', 'MontessoriPos', 'montessori', 55, 5);
SELECT temp_insert_vertical('kids', 'aprendizaje', 'aprendizaje', 'Tienda de Aprendizaje', 'Learning Store', 'Productos educativos para niños', 'GraduationCap', 'AprendizajePos', 'aprendizaje', 50, 6);

-- ============================================
-- 14. TIENDAS ESPECIALIZADAS (64 giros)
-- ============================================
SELECT temp_insert_vertical('specialty', 'floreria', 'floreria', 'Florería', 'Flower Shop', 'Flores y arreglos florales', 'Flower', 'FloreriaPos', 'floreria', 85, 1, 'Cliente', 'Clientes', 'Arreglo', 'Arreglos', 'Pedido', 'Pedidos', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['reservations', 'delivery'], ARRAY['online_ordering']);
SELECT temp_insert_vertical('specialty', 'floreria_premium', 'floreria-premium', 'Florería Premium', 'Premium Flowers', 'Flores de alta gama y diseño floral', 'Flower2', 'FloresPremiumPos', 'florespremiium', 65, 2);
SELECT temp_insert_vertical('specialty', 'tienda_regalos', 'tienda-regalos', 'Tienda de Regalos', 'Gift Shop', 'Regalos para toda ocasión', 'Gift', 'RegalosPos', 'tiendaregalos', 75, 3);
SELECT temp_insert_vertical('specialty', 'velas', 'velas', 'Tienda de Velas', 'Candle Shop', 'Velas artesanales y decorativas', 'Flame', 'VelasPos', 'velas', 55, 4);
SELECT temp_insert_vertical('specialty', 'aromaterapia', 'aromaterapia', 'Tienda de Aromaterapia', 'Aromatherapy Shop', 'Productos de aromaterapia', 'Droplet', 'AromaterapiaPos', 'aromaterapia', 50, 5);
SELECT temp_insert_vertical('specialty', 'articulos_religiosos', 'articulos-religiosos', 'Artículos Religiosos', 'Religious Items', 'Artículos religiosos y devocionales', 'Star', 'ReligiososPos', 'religiosos', 60, 6);
SELECT temp_insert_vertical('specialty', 'antiguedades', 'antiguedades', 'Tienda de Antigüedades', 'Antique Shop', 'Antigüedades y coleccionables', 'Clock', 'AntiguedadesPos', 'antiguedades', 50, 7);
SELECT temp_insert_vertical('specialty', 'coleccionables', 'coleccionables', 'Coleccionables', 'Collectibles', 'Artículos de colección', 'Trophy', 'ColeccionablesPos', 'coleccionables', 55, 8);
SELECT temp_insert_vertical('specialty', 'comics', 'comics', 'Comics Shop', 'Comics Shop', 'Comics, manga y cultura geek', 'BookOpen', 'ComicsPos', 'comics', 65, 9);
SELECT temp_insert_vertical('specialty', 'sex_shop', 'sex-shop', 'Sex Shop', 'Adult Store', 'Productos para adultos', 'Heart', 'AdultPos', 'adultshop', 55, 10);
SELECT temp_insert_vertical('specialty', 'casa_empeno', 'casa-empeno', 'Casa de Empeño', 'Pawn Shop', 'Empeños y préstamos', 'DollarSign', 'EmpenoPos', 'empeno', 70, 11, 'Cliente', 'Clientes', 'Prenda', 'Prendas', 'Contrato', 'Contratos');
SELECT temp_insert_vertical('specialty', 'instrumentos_musicales', 'instrumentos-musicales', 'Instrumentos Musicales', 'Music Store', 'Instrumentos y accesorios', 'Music', 'MusicaPos', 'instrumentos', 70, 12);
SELECT temp_insert_vertical('specialty', 'audio_pro', 'audio-pro', 'Audio Profesional', 'Pro Audio Shop', 'Equipo de audio profesional', 'Headphones', 'AudioProPos', 'audioprofesional', 55, 13);
SELECT temp_insert_vertical('specialty', 'uniformes', 'uniformes', 'Tienda de Uniformes', 'Uniform Shop', 'Uniformes escolares e industriales', 'Shirt', 'UniformesPos', 'uniformes', 70, 14);
SELECT temp_insert_vertical('specialty', 'merceria', 'merceria', 'Mercería', 'Notions Store', 'Hilos, botones y accesorios de costura', 'Scissors', 'MerceriaPos', 'merceria', 65, 15);
SELECT temp_insert_vertical('specialty', 'pinateria', 'pinateria', 'Piñatería', 'Pinata Shop', 'Piñatas y artículos de fiesta', 'Star', 'PinateriaPos', 'pinateria', 60, 16);
SELECT temp_insert_vertical('specialty', 'manualidades', 'manualidades', 'Manualidades', 'Crafts Store', 'Materiales para manualidades', 'Palette', 'ManualidadesPos', 'manualidades', 70, 17);
SELECT temp_insert_vertical('specialty', 'globos', 'globos', 'Tienda de Globos', 'Balloon Shop', 'Globos y decoración de fiestas', 'Circle', 'GlobosPos', 'globos', 55, 18);
SELECT temp_insert_vertical('specialty', 'fiestas', 'fiestas', 'Artículos para Fiestas', 'Party Supplies', 'Todo para fiestas y eventos', 'PartyPopper', 'FiestasPos', 'fiestas', 75, 19);
SELECT temp_insert_vertical('specialty', 'energia_solar', 'energia-solar', 'Energías Solares', 'Solar Energy', 'Paneles y equipo solar', 'Sun', 'SolarPos', 'solar', 50, 20);
SELECT temp_insert_vertical('specialty', 'baterias', 'baterias', 'Tienda de Baterías', 'Battery Shop', 'Baterías y energía portátil', 'Battery', 'BateriasPos', 'baterias', 55, 21);
SELECT temp_insert_vertical('specialty', 'personalizados', 'personalizados', 'Regalos Personalizados', 'Custom Gifts', 'Productos personalizados', 'Pen', 'PersonalizadosPos', 'personalizados', 60, 22);
SELECT temp_insert_vertical('specialty', 'impresion_3d', 'impresion-3d', 'Impresión 3D', '3D Printing Shop', 'Servicios de impresión 3D', 'Printer', 'Impresion3DPos', '3d', 45, 23);
SELECT temp_insert_vertical('specialty', 'scooters', 'scooters', 'Scooters Eléctricos', 'Electric Scooters', 'Scooters y vehículos eléctricos', 'Bike', 'ScootersPos', 'scooters', 55, 24);
SELECT temp_insert_vertical('specialty', 'herbalismo', 'herbalismo', 'Herbalismo', 'Herbal Shop', 'Remedios y hierbas tradicionales', 'Leaf', 'HerbalismoPos', 'herbalismo', 45, 25);
SELECT temp_insert_vertical('specialty', 'recargas', 'recargas', 'Tienda de Recargas', 'Phone Recharge', 'Recargas telefónicas y servicios', 'Smartphone', 'RecargasPos', 'recargas', 75, 26);
SELECT temp_insert_vertical('specialty', 'limpieza', 'limpieza', 'Productos de Limpieza', 'Cleaning Supplies', 'Productos de limpieza', 'Sparkles', 'LimpiezaPos', 'limpieza', 70, 27);
SELECT temp_insert_vertical('specialty', 'aromatizantes', 'aromatizantes', 'Aromatizantes', 'Air Fresheners', 'Aromatizantes y difusores', 'Wind', 'AromatizantesPos', 'aromatizantes', 45, 28);
SELECT temp_insert_vertical('specialty', 'plasticos', 'plasticos', 'Tienda de Plásticos', 'Plastics Store', 'Contenedores y artículos plásticos', 'Box', 'PlasticosPos', 'plasticos', 55, 29);
SELECT temp_insert_vertical('specialty', 'outlet', 'outlet', 'Outlet', 'Outlet Store', 'Productos con descuento', 'Percent', 'OutletPos', 'outlet', 70, 30);
SELECT temp_insert_vertical('specialty', 'bazar', 'bazar', 'Bazar Segunda Mano', 'Thrift Store', 'Artículos usados y segunda mano', 'Recycle', 'BazarPos', 'bazar', 60, 31);
SELECT temp_insert_vertical('specialty', 'tianguis', 'tianguis', 'Tianguis Boutique', 'Market Stall', 'Ventas tipo tianguis', 'Store', 'TianguisPos', 'tianguis', 55, 32);
SELECT temp_insert_vertical('specialty', 'japonesa', 'japonesa', 'Tienda Japonesa', 'Japanese Store', 'Productos estilo Miniso/Mumuso', 'Circle', 'JaponesaPos', 'japonesa', 65, 33);
SELECT temp_insert_vertical('specialty', 'coreana', 'coreana', 'Tienda Coreana', 'Korean Store', 'K-pop, K-beauty y productos coreanos', 'Star', 'CoreanaPos', 'coreana', 60, 34);
SELECT temp_insert_vertical('specialty', 'posters', 'posters', 'Tienda de Posters', 'Poster Shop', 'Posters y arte impreso', 'Image', 'PostersPos', 'posters', 40, 35);
SELECT temp_insert_vertical('specialty', 'plantas', 'plantas', 'Tienda de Plantas', 'Plant Shop', 'Plantas de interior y exterior', 'TreeDeciduous', 'PlantasPos', 'plantas', 70, 36);
SELECT temp_insert_vertical('specialty', 'vivero', 'vivero', 'Vivero', 'Nursery', 'Vivero de plantas y flores', 'Flower', 'ViveroPos', 'vivero', 65, 37);
SELECT temp_insert_vertical('specialty', 'bonsais', 'bonsais', 'Bonsáis', 'Bonsai Shop', 'Bonsáis y plantas ornamentales', 'TreeDeciduous', 'BonsaisPos', 'bonsais', 40, 38);
SELECT temp_insert_vertical('specialty', 'suculentas', 'suculentas', 'Suculentas y Macetas', 'Succulents', 'Suculentas, cactus y macetas', 'Flower', 'SuculentasPos', 'suculentas', 55, 39);
SELECT temp_insert_vertical('specialty', 'hidroponia', 'hidroponia', 'Hidroponía', 'Hydroponics', 'Sistemas y productos de hidroponía', 'Droplet', 'HidroponiaPos', 'hidroponia', 40, 40);
SELECT temp_insert_vertical('specialty', 'souvenirs_turisticos', 'souvenirs-turisticos', 'Souvenirs Turísticos', 'Tourist Souvenirs', 'Recuerdos turísticos', 'MapPin', 'SouvenirsTuristicosPos', 'souvenirsturisticos', 55, 41);
SELECT temp_insert_vertical('specialty', 'artesanias', 'artesanias', 'Artesanías Regionales', 'Regional Crafts', 'Artesanías tradicionales', 'Palette', 'ArtesaniasPos', 'artesanias', 60, 42);
SELECT temp_insert_vertical('specialty', 'comida_llevar', 'comida-llevar', 'Comida para Llevar', 'Prepared Foods', 'Alimentos preparados to-go', 'UtensilsCrossed', 'ComidaLlevarPos', 'comidallevar', 65, 43);
SELECT temp_insert_vertical('specialty', 'dulces_tipicos', 'dulces-tipicos', 'Dulces Típicos', 'Traditional Sweets', 'Dulces regionales y tradicionales', 'Candy', 'DulcesTipicosPos', 'dulcestipicos', 55, 44);
SELECT temp_insert_vertical('specialty', 'boutique_lujo', 'boutique-lujo', 'Boutique de Lujo', 'Luxury Boutique', 'Artículos de lujo y premium', 'Crown', 'BoutiqueLujoPos', 'boutiquelujo', 50, 45);
SELECT temp_insert_vertical('specialty', 'maletas', 'maletas', 'Maletas y Equipaje', 'Luggage Shop', 'Maletas, mochilas y equipaje', 'Briefcase', 'MaletasPos', 'maletas', 60, 46);
SELECT temp_insert_vertical('specialty', 'tapiceria', 'tapiceria', 'Tapicería', 'Upholstery Shop', 'Telas y servicios de tapicería', 'Scissors', 'TapiceriaPos', 'tapiceria', 45, 47);
SELECT temp_insert_vertical('specialty', 'lonas_impresion', 'lonas-impresion', 'Lonas e Impresión', 'Banner Printing', 'Lonas, banners e impresión', 'Printer', 'LonasPos', 'lonas', 55, 48);
SELECT temp_insert_vertical('specialty', 'empaques', 'empaques', 'Tienda de Empaques', 'Packaging Store', 'Empaques y materiales de envío', 'Package', 'EmpaquesPos', 'empaques', 50, 49);
SELECT temp_insert_vertical('specialty', 'cajas_bolsas', 'cajas-bolsas', 'Cajas y Bolsas', 'Boxes & Bags', 'Cajas, bolsas y embalaje', 'Box', 'CajasBolsasPos', 'cajasbolsas', 50, 50);
SELECT temp_insert_vertical('specialty', 'suministros_barberia', 'suministros-barberia', 'Suministros para Barberías', 'Barber Supplies', 'Productos profesionales para barberías', 'Scissors', 'SuministrosBarberiaPos', 'suministrosbarberia', 55, 51);
SELECT temp_insert_vertical('specialty', 'suministros_spa', 'suministros-spa', 'Productos para Spas', 'Spa Supplies', 'Productos profesionales para spas', 'Droplet', 'SuministrosSpaPos', 'suministrosspa', 50, 52);
SELECT temp_insert_vertical('specialty', 'cristaleria', 'cristaleria', 'Cristalería', 'Glassware', 'Artículos de cristal y vidrio', 'GlassWater', 'CristaleriaPos', 'cristaleria', 50, 53);
SELECT temp_insert_vertical('specialty', 'material_electrico', 'material-electrico', 'Material Eléctrico Industrial', 'Industrial Electric', 'Material eléctrico industrial', 'Zap', 'ElectricoIndPos', 'electricoind', 55, 54);
SELECT temp_insert_vertical('specialty', 'extintores', 'extintores', 'Extintores y Seguridad', 'Fire Safety', 'Extintores y equipo de seguridad', 'Shield', 'ExtintoresPos', 'extintores', 50, 55);
SELECT temp_insert_vertical('specialty', 'senalizacion', 'senalizacion', 'Señalización', 'Signage', 'Señales y letreros', 'AlertTriangle', 'SenalizacionPos', 'senalizacion', 45, 56);
SELECT temp_insert_vertical('specialty', 'impermeabilizantes', 'impermeabilizantes', 'Impermeabilizantes', 'Waterproofing', 'Impermeabilizantes y selladores', 'Droplet', 'ImpermeabilizantesPos', 'impermeabilizantes', 50, 57);
SELECT temp_insert_vertical('specialty', 'pinturas_auto', 'pinturas-auto', 'Pinturas Automotrices', 'Auto Paint', 'Pinturas para automóviles', 'Palette', 'PinturasAutoPos', 'pinturasauto', 55, 58);

-- ============================================
-- 15. SERVICIOS (para completar)
-- ============================================
SELECT temp_insert_vertical('services', 'taller_mecanico', 'taller-mecanico', 'Taller Mecánico', 'Auto Shop', 'Taller de reparación automotriz', 'Wrench', 'TallerPos', 'taller', 85, 1, 'Cliente', 'Clientes', 'Servicio', 'Servicios', 'Orden', 'Órdenes', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['appointments', 'quotes', 'serial_numbers'], ARRAY['whatsapp_integration']);
SELECT temp_insert_vertical('services', 'lavanderia', 'lavanderia', 'Lavandería', 'Laundry', 'Servicio de lavandería', 'Shirt', 'LavanderiaPos', 'lavanderia', 75, 2, 'Cliente', 'Clientes', 'Prenda', 'Prendas', 'Orden', 'Órdenes');
SELECT temp_insert_vertical('services', 'tintoreria', 'tintoreria', 'Tintorería', 'Dry Cleaning', 'Tintorería y limpieza especializada', 'Shirt', 'TintoreriaPos', 'tintoreria', 70, 3);
SELECT temp_insert_vertical('services', 'sastreria', 'sastreria', 'Sastrería', 'Tailor Shop', 'Confección y arreglos de ropa', 'Scissors', 'SastreriaPos', 'sastreria', 60, 4);
SELECT temp_insert_vertical('services', 'reparacion_electronica', 'reparacion-electronica', 'Reparación Electrónica', 'Electronics Repair', 'Reparación de equipos electrónicos', 'Wrench', 'ReparacionElecPos', 'reparacionelec', 70, 5);
SELECT temp_insert_vertical('services', 'fotografia', 'fotografia', 'Estudio Fotográfico', 'Photo Studio', 'Fotografía y servicios digitales', 'Camera', 'FotoPos', 'fotografia', 65, 6, 'Cliente', 'Clientes', 'Sesión', 'Sesiones', 'Servicio', 'Servicios');

-- ============================================
-- 16. SALUD Y BIENESTAR (para completar)
-- ============================================
SELECT temp_insert_vertical('health', 'farmacia', 'farmacia', 'Farmacia', 'Pharmacy', 'Farmacia y productos de salud', 'Pill', 'FarmaciaPos', 'farmacia', 95, 1, 'Cliente', 'Clientes', 'Medicamento', 'Medicamentos', 'Venta', 'Ventas', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['barcode_scanning', 'expiry_tracking', 'batch_tracking'], ARRAY['delivery', 'online_ordering']);
SELECT temp_insert_vertical('health', 'clinica_dental', 'clinica-dental', 'Clínica Dental', 'Dental Clinic', 'Consultorio y clínica dental', 'Smile', 'DentalPos', 'dental', 80, 2, 'Paciente', 'Pacientes', 'Tratamiento', 'Tratamientos', 'Cita', 'Citas', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['appointments', 'staff_management'], ARRAY['whatsapp_integration']);
SELECT temp_insert_vertical('health', 'optica', 'optica', 'Óptica', 'Optical Shop', 'Lentes y servicios ópticos', 'Eye', 'OpticaPos', 'optica', 80, 3, 'Paciente', 'Pacientes', 'Lentes', 'Lentes', 'Venta', 'Ventas', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['appointments', 'product_variants'], ARRAY[]::TEXT[]);
SELECT temp_insert_vertical('health', 'consultorio_medico', 'consultorio-medico', 'Consultorio Médico', 'Medical Office', 'Consultorio médico general', 'Stethoscope', 'ConsultorioPos', 'consultorio', 75, 4, 'Paciente', 'Pacientes', 'Consulta', 'Consultas', 'Cita', 'Citas', ARRAY['pos', 'customers', 'reports'], ARRAY['appointments', 'staff_management'], ARRAY[]::TEXT[]);
SELECT temp_insert_vertical('health', 'laboratorio', 'laboratorio', 'Laboratorio Clínico', 'Clinical Lab', 'Análisis clínicos', 'TestTube', 'LaboratorioPos', 'laboratorio', 70, 5, 'Paciente', 'Pacientes', 'Estudio', 'Estudios', 'Orden', 'Órdenes');
SELECT temp_insert_vertical('health', 'spa', 'spa', 'Spa', 'Spa', 'Centro de relajación y bienestar', 'Flower', 'SpaPos', 'spa', 75, 6, 'Cliente', 'Clientes', 'Tratamiento', 'Tratamientos', 'Sesión', 'Sesiones', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['appointments', 'staff_management', 'loyalty_program'], ARRAY[]::TEXT[]);
SELECT temp_insert_vertical('health', 'gimnasio', 'gimnasio', 'Gimnasio', 'Gym', 'Centro de acondicionamiento físico', 'Dumbbell', 'GimnasioPos', 'gimnasio', 80, 7, 'Miembro', 'Miembros', 'Membresía', 'Membresías', 'Pago', 'Pagos', ARRAY['pos', 'customers', 'reports'], ARRAY['staff_management', 'loyalty_program'], ARRAY['appointments']);
SELECT temp_insert_vertical('health', 'nutriologo', 'nutriologo', 'Consultorio Nutriólogo', 'Nutritionist', 'Consultas de nutrición', 'Apple', 'NutriologoPos', 'nutriologo', 55, 8, 'Paciente', 'Pacientes', 'Consulta', 'Consultas', 'Cita', 'Citas');
SELECT temp_insert_vertical('health', 'fisioterapia', 'fisioterapia', 'Fisioterapia', 'Physical Therapy', 'Centro de fisioterapia', 'Activity', 'FisioterapiaPos', 'fisioterapia', 60, 9, 'Paciente', 'Pacientes', 'Sesión', 'Sesiones', 'Terapia', 'Terapias');
SELECT temp_insert_vertical('health', 'veterinaria', 'veterinaria', 'Veterinaria', 'Veterinary Clinic', 'Clínica veterinaria', 'PawPrint', 'VeterinariaPos', 'veterinaria', 75, 10, 'Cliente', 'Clientes', 'Mascota', 'Mascotas', 'Consulta', 'Consultas', ARRAY['pos', 'inventory', 'customers', 'reports'], ARRAY['appointments'], ARRAY['delivery']);

-- ============================================
-- CLEANUP
-- ============================================
DROP FUNCTION IF EXISTS temp_insert_vertical(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT[], TEXT[]);

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM verticals;
  RAISE NOTICE 'Successfully inserted % business verticals!', v_count;
END $$;


-- ===== 023_complete_all_verticals.sql =====
-- Migration: Complete All Business Verticals (250+)
-- Description: All business types with specific terminology, modules, and configurations
-- Includes: Health & Services (consultorios, farmacias), all specialty stores

-- ============================================
-- ENSURE temp_insert_vertical FUNCTION EXISTS
-- ============================================
CREATE OR REPLACE FUNCTION temp_insert_vertical(
  p_category_name TEXT,
  p_name TEXT,
  p_slug TEXT,
  p_display_name TEXT,
  p_display_name_en TEXT,
  p_description TEXT,
  p_icon TEXT,
  p_suggested_system_name TEXT,
  p_suggested_domain_prefix TEXT,
  p_popularity INTEGER,
  p_sort INTEGER,
  p_customer_singular TEXT DEFAULT 'Cliente',
  p_customer_plural TEXT DEFAULT 'Clientes',
  p_product_singular TEXT DEFAULT 'Producto',
  p_product_plural TEXT DEFAULT 'Productos',
  p_order_singular TEXT DEFAULT 'Orden',
  p_order_plural TEXT DEFAULT 'Órdenes',
  p_required_modules TEXT[] DEFAULT ARRAY['pos', 'inventory', 'customers', 'reports'],
  p_recommended_modules TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_optional_modules TEXT[] DEFAULT ARRAY[]::TEXT[]
)
RETURNS UUID AS $$
DECLARE
  v_category_id UUID;
  v_vertical_id UUID;
  v_module_id UUID;
  v_module_key TEXT;
BEGIN
  SELECT id INTO v_category_id FROM vertical_categories WHERE name = p_category_name;
  
  INSERT INTO verticals (name, slug, display_name, display_name_en, description, icon, category_id, 
    suggested_system_name, suggested_domain_prefix, popularity_score, sort_order, active)
  VALUES (p_name, p_slug, p_display_name, p_display_name_en, p_description, p_icon, v_category_id,
    p_suggested_system_name, p_suggested_domain_prefix, p_popularity, p_sort, true)
  ON CONFLICT (name) DO UPDATE SET
    slug = EXCLUDED.slug,
    display_name = EXCLUDED.display_name,
    display_name_en = EXCLUDED.display_name_en,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    category_id = EXCLUDED.category_id,
    suggested_system_name = EXCLUDED.suggested_system_name,
    suggested_domain_prefix = EXCLUDED.suggested_domain_prefix,
    popularity_score = EXCLUDED.popularity_score,
    sort_order = EXCLUDED.sort_order
  RETURNING id INTO v_vertical_id;
  
  INSERT INTO vertical_terminology (vertical_id, customer_singular, customer_plural, 
    product_singular, product_plural, order_singular, order_plural)
  VALUES (v_vertical_id, p_customer_singular, p_customer_plural, 
    p_product_singular, p_product_plural, p_order_singular, p_order_plural)
  ON CONFLICT (vertical_id) DO UPDATE SET
    customer_singular = EXCLUDED.customer_singular,
    customer_plural = EXCLUDED.customer_plural,
    product_singular = EXCLUDED.product_singular,
    product_plural = EXCLUDED.product_plural,
    order_singular = EXCLUDED.order_singular,
    order_plural = EXCLUDED.order_plural;
  
  FOREACH v_module_key IN ARRAY p_required_modules
  LOOP
    SELECT id INTO v_module_id FROM system_modules WHERE key = v_module_key;
    IF v_module_id IS NOT NULL THEN
      INSERT INTO vertical_module_configs (vertical_id, module_id, enabled_by_default, is_required, is_recommended)
      VALUES (v_vertical_id, v_module_id, true, true, false)
      ON CONFLICT (vertical_id, module_id) DO UPDATE SET
        enabled_by_default = true, is_required = true;
    END IF;
  END LOOP;
  
  FOREACH v_module_key IN ARRAY p_recommended_modules
  LOOP
    SELECT id INTO v_module_id FROM system_modules WHERE key = v_module_key;
    IF v_module_id IS NOT NULL THEN
      INSERT INTO vertical_module_configs (vertical_id, module_id, enabled_by_default, is_required, is_recommended)
      VALUES (v_vertical_id, v_module_id, true, false, true)
      ON CONFLICT (vertical_id, module_id) DO UPDATE SET
        enabled_by_default = true, is_recommended = true;
    END IF;
  END LOOP;
  
  FOREACH v_module_key IN ARRAY p_optional_modules
  LOOP
    SELECT id INTO v_module_id FROM system_modules WHERE key = v_module_key;
    IF v_module_id IS NOT NULL THEN
      INSERT INTO vertical_module_configs (vertical_id, module_id, enabled_by_default, is_required, is_recommended)
      VALUES (v_vertical_id, v_module_id, false, false, false)
      ON CONFLICT (vertical_id, module_id) DO UPDATE SET
        enabled_by_default = false;
    END IF;
  END LOOP;
  
  RETURN v_vertical_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- HEALTH & WELLNESS / SERVICES CATEGORY
-- Special terminology: Paciente, Consulta, Receta, Tratamiento
-- ============================================

-- Consultorio Médico General
SELECT temp_insert_vertical('health', 'consultorio_medico', 'consultorio-medico', 
  'Consultorio Médico', 'Medical Office', 
  'Consultorio de medicina general con expedientes digitales', 'Stethoscope', 
  'MedicoPos', 'consultoriomedico', 95, 1,
  'Paciente', 'Pacientes', 'Servicio', 'Servicios', 'Consulta', 'Consultas',
  ARRAY['pos', 'customers', 'reports'], 
  ARRAY['appointments', 'staff_management'], 
  ARRAY['whatsapp_integration', 'email_marketing']);

-- Consultorio Dental
SELECT temp_insert_vertical('health', 'consultorio_dental', 'consultorio-dental', 
  'Consultorio Dental', 'Dental Office', 
  'Clínica dental con control de tratamientos', 'Smile', 
  'DentalPos', 'clinicadental', 90, 2,
  'Paciente', 'Pacientes', 'Tratamiento', 'Tratamientos', 'Cita', 'Citas',
  ARRAY['pos', 'customers', 'reports'], 
  ARRAY['appointments', 'staff_management'], 
  ARRAY['whatsapp_integration']);

-- Farmacia
SELECT temp_insert_vertical('health', 'farmacia', 'farmacia', 
  'Farmacia', 'Pharmacy', 
  'Farmacia con control de medicamentos y recetas', 'Pill', 
  'FarmaciaPos', 'farmacia', 95, 3,
  'Cliente', 'Clientes', 'Medicamento', 'Medicamentos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports', 'barcode_scanning'], 
  ARRAY['expiry_tracking', 'batch_tracking', 'suppliers'], 
  ARRAY['delivery', 'loyalty_program']);

-- Clínica de Especialidades
SELECT temp_insert_vertical('health', 'clinica_especialidades', 'clinica-especialidades', 
  'Clínica de Especialidades', 'Specialty Clinic', 
  'Clínica con múltiples especialidades médicas', 'Building2', 
  'ClinicaPos', 'clinica', 85, 4,
  'Paciente', 'Pacientes', 'Consulta', 'Consultas', 'Cita', 'Citas',
  ARRAY['pos', 'customers', 'reports'], 
  ARRAY['appointments', 'staff_management', 'queue_management'], 
  ARRAY['whatsapp_integration', 'email_marketing']);

-- Laboratorio Clínico
SELECT temp_insert_vertical('health', 'laboratorio_clinico', 'laboratorio-clinico', 
  'Laboratorio Clínico', 'Clinical Laboratory', 
  'Laboratorio de análisis clínicos', 'TestTube', 
  'LabPos', 'laboratorio', 80, 5,
  'Paciente', 'Pacientes', 'Estudio', 'Estudios', 'Orden', 'Órdenes',
  ARRAY['pos', 'customers', 'reports'], 
  ARRAY['appointments', 'queue_management'], 
  ARRAY['whatsapp_integration']);

-- Óptica
SELECT temp_insert_vertical('health', 'optica', 'optica', 
  'Óptica', 'Optical Shop', 
  'Óptica con exámenes de la vista y venta de lentes', 'Eye', 
  'OpticaPos', 'optica', 85, 6,
  'Paciente', 'Pacientes', 'Lente', 'Lentes', 'Orden', 'Órdenes',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['appointments', 'product_variants'], 
  ARRAY['loyalty_program']);

-- Veterinaria
SELECT temp_insert_vertical('health', 'veterinaria', 'veterinaria', 
  'Veterinaria', 'Veterinary Clinic', 
  'Clínica veterinaria con tienda de productos', 'PawPrint', 
  'VetPos', 'veterinaria', 85, 7,
  'Paciente', 'Pacientes', 'Servicio', 'Servicios', 'Consulta', 'Consultas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['appointments', 'staff_management'], 
  ARRAY['whatsapp_integration', 'delivery']);

-- Spa
SELECT temp_insert_vertical('health', 'spa', 'spa', 
  'Spa', 'Spa', 
  'Spa con tratamientos de belleza y relajación', 'Sparkle', 
  'SpaPos', 'spa', 80, 8,
  'Cliente', 'Clientes', 'Tratamiento', 'Tratamientos', 'Cita', 'Citas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['appointments', 'staff_management', 'loyalty_program'], 
  ARRAY['whatsapp_integration', 'online_ordering']);

-- Gimnasio
SELECT temp_insert_vertical('health', 'gimnasio', 'gimnasio', 
  'Gimnasio', 'Gym', 
  'Gimnasio con membresías y tienda de suplementos', 'Dumbbell', 
  'GymPos', 'gimnasio', 80, 9,
  'Miembro', 'Miembros', 'Membresía', 'Membresías', 'Inscripción', 'Inscripciones',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['staff_management', 'loyalty_program'], 
  ARRAY['whatsapp_integration']);

-- Consultorio Psicológico
SELECT temp_insert_vertical('health', 'consultorio_psicologico', 'consultorio-psicologico', 
  'Consultorio Psicológico', 'Psychology Office', 
  'Consultorio de psicología y terapia', 'Brain', 
  'PsicoPos', 'psicologia', 70, 10,
  'Paciente', 'Pacientes', 'Sesión', 'Sesiones', 'Cita', 'Citas',
  ARRAY['pos', 'customers', 'reports'], 
  ARRAY['appointments'], 
  ARRAY['whatsapp_integration']);

-- Consultorio Nutrición
SELECT temp_insert_vertical('health', 'nutricion', 'nutricion', 
  'Consultorio de Nutrición', 'Nutrition Office', 
  'Consultorio de nutrición y dietética', 'Apple', 
  'NutricionPos', 'nutricion', 70, 11,
  'Paciente', 'Pacientes', 'Plan', 'Planes', 'Consulta', 'Consultas',
  ARRAY['pos', 'customers', 'reports'], 
  ARRAY['appointments'], 
  ARRAY['whatsapp_integration']);

-- Fisioterapia
SELECT temp_insert_vertical('health', 'fisioterapia', 'fisioterapia', 
  'Fisioterapia', 'Physical Therapy', 
  'Centro de rehabilitación y fisioterapia', 'Activity', 
  'FisioPos', 'fisioterapia', 70, 12,
  'Paciente', 'Pacientes', 'Sesión', 'Sesiones', 'Cita', 'Citas',
  ARRAY['pos', 'customers', 'reports'], 
  ARRAY['appointments', 'staff_management'], 
  ARRAY['whatsapp_integration']);

-- Droguería
SELECT temp_insert_vertical('health', 'drogueria', 'drogueria', 
  'Droguería', 'Drugstore', 
  'Droguería con medicamentos de patente y genéricos', 'Pill', 
  'DrogueriaPos', 'drogueria', 75, 13,
  'Cliente', 'Clientes', 'Medicamento', 'Medicamentos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports', 'barcode_scanning'], 
  ARRAY['expiry_tracking'], 
  ARRAY['delivery']);

-- ============================================
-- SERVICES CATEGORY (Non-health services)
-- ============================================

-- Barbería
SELECT temp_insert_vertical('services', 'barberia', 'barberia', 
  'Barbería', 'Barber Shop', 
  'Barbería con servicios de corte y arreglo', 'Scissors', 
  'BarberiaPos', 'barberia', 90, 1,
  'Cliente', 'Clientes', 'Servicio', 'Servicios', 'Turno', 'Turnos',
  ARRAY['pos', 'customers', 'reports'], 
  ARRAY['appointments', 'queue_management', 'staff_management'], 
  ARRAY['loyalty_program', 'whatsapp_integration']);

-- Estética / Salón de Belleza
SELECT temp_insert_vertical('services', 'estetica', 'estetica', 
  'Salón de Belleza', 'Beauty Salon', 
  'Estética con servicios de belleza integral', 'Sparkle', 
  'EsteticaPos', 'estetica', 90, 2,
  'Clienta', 'Clientas', 'Servicio', 'Servicios', 'Cita', 'Citas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['appointments', 'staff_management', 'loyalty_program'], 
  ARRAY['whatsapp_integration', 'online_ordering']);

-- Salón de Uñas
SELECT temp_insert_vertical('services', 'salon_unas', 'salon-unas', 
  'Salón de Uñas', 'Nail Salon', 
  'Especialistas en uñas y manicure', 'Hand', 
  'UnasPos', 'unas', 80, 3,
  'Clienta', 'Clientas', 'Servicio', 'Servicios', 'Cita', 'Citas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['appointments', 'staff_management'], 
  ARRAY['loyalty_program']);

-- Taller Mecánico
SELECT temp_insert_vertical('services', 'taller_mecanico', 'taller-mecanico', 
  'Taller Mecánico', 'Auto Repair Shop', 
  'Taller de reparación automotriz', 'Wrench', 
  'TallerPos', 'taller', 85, 4,
  'Cliente', 'Clientes', 'Servicio', 'Servicios', 'Orden', 'Órdenes',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['quotes', 'staff_management'], 
  ARRAY['whatsapp_integration']);

-- Tintorería / Lavandería
SELECT temp_insert_vertical('services', 'tintoreria', 'tintoreria', 
  'Tintorería', 'Dry Cleaner', 
  'Servicio de limpieza de prendas', 'Shirt', 
  'TintoreriaPos', 'tintoreria', 75, 5,
  'Cliente', 'Clientes', 'Prenda', 'Prendas', 'Ticket', 'Tickets',
  ARRAY['pos', 'customers', 'reports'], 
  ARRAY['queue_management'], 
  ARRAY['delivery', 'whatsapp_integration']);

-- Reparación de Celulares
SELECT temp_insert_vertical('services', 'reparacion_celulares', 'reparacion-celulares', 
  'Reparación de Celulares', 'Phone Repair', 
  'Servicio de reparación de dispositivos móviles', 'Smartphone', 
  'RepairPos', 'reparacion', 85, 6,
  'Cliente', 'Clientes', 'Reparación', 'Reparaciones', 'Orden', 'Órdenes',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['serial_numbers', 'quotes'], 
  ARRAY['whatsapp_integration']);

-- Fotografía
SELECT temp_insert_vertical('services', 'fotografia', 'fotografia', 
  'Estudio Fotográfico', 'Photo Studio', 
  'Estudio de fotografía y servicios', 'Camera', 
  'FotoPos', 'fotografia', 70, 7,
  'Cliente', 'Clientes', 'Sesión', 'Sesiones', 'Pedido', 'Pedidos',
  ARRAY['pos', 'customers', 'reports'], 
  ARRAY['appointments', 'reservations'], 
  ARRAY['whatsapp_integration']);

-- Imprenta / Copy Center
SELECT temp_insert_vertical('services', 'imprenta', 'imprenta', 
  'Imprenta', 'Print Shop', 
  'Servicios de impresión y copias', 'Printer', 
  'ImprentaPos', 'imprenta', 75, 8,
  'Cliente', 'Clientes', 'Trabajo', 'Trabajos', 'Orden', 'Órdenes',
  ARRAY['pos', 'customers', 'reports'], 
  ARRAY['quotes'], 
  ARRAY['delivery']);

-- Carpintería
SELECT temp_insert_vertical('services', 'carpinteria', 'carpinteria', 
  'Carpintería', 'Carpentry Shop', 
  'Taller de carpintería y muebles', 'Hammer', 
  'CarpinteriaPos', 'carpinteria', 65, 9,
  'Cliente', 'Clientes', 'Proyecto', 'Proyectos', 'Orden', 'Órdenes',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['quotes', 'suppliers'], 
  ARRAY['delivery']);

-- Cerrajería
SELECT temp_insert_vertical('services', 'cerrajeria', 'cerrajeria', 
  'Cerrajería', 'Locksmith', 
  'Servicios de cerrajería', 'Key', 
  'CerrajeriaPos', 'cerrajeria', 70, 10,
  'Cliente', 'Clientes', 'Servicio', 'Servicios', 'Orden', 'Órdenes',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['quotes'], 
  ARRAY['whatsapp_integration']);

-- Plomería
SELECT temp_insert_vertical('services', 'plomeria', 'plomeria', 
  'Plomería', 'Plumbing Services', 
  'Servicios de plomería', 'Droplets', 
  'PlomeriaPos', 'plomeria', 65, 11,
  'Cliente', 'Clientes', 'Servicio', 'Servicios', 'Orden', 'Órdenes',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['quotes'], 
  ARRAY['whatsapp_integration']);

-- Electricista
SELECT temp_insert_vertical('services', 'electricista', 'electricista', 
  'Electricista', 'Electrical Services', 
  'Servicios eléctricos profesionales', 'Zap', 
  'ElectricoPos', 'electricista', 65, 12,
  'Cliente', 'Clientes', 'Servicio', 'Servicios', 'Orden', 'Órdenes',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['quotes'], 
  ARRAY['whatsapp_integration']);

-- Car Wash
SELECT temp_insert_vertical('services', 'car_wash', 'car-wash', 
  'Car Wash', 'Car Wash', 
  'Lavado de autos', 'Car', 
  'CarWashPos', 'carwash', 75, 13,
  'Cliente', 'Clientes', 'Servicio', 'Servicios', 'Ticket', 'Tickets',
  ARRAY['pos', 'customers', 'reports'], 
  ARRAY['queue_management', 'loyalty_program'], 
  ARRAY['whatsapp_integration']);

-- Academia / Escuela
SELECT temp_insert_vertical('services', 'academia', 'academia', 
  'Academia', 'Academy', 
  'Academia o escuela de cursos', 'GraduationCap', 
  'AcademiaPos', 'academia', 70, 14,
  'Alumno', 'Alumnos', 'Curso', 'Cursos', 'Inscripción', 'Inscripciones',
  ARRAY['pos', 'customers', 'reports'], 
  ARRAY['appointments', 'staff_management'], 
  ARRAY['whatsapp_integration', 'email_marketing']);

-- Guardería
SELECT temp_insert_vertical('services', 'guarderia', 'guarderia', 
  'Guardería', 'Daycare', 
  'Guardería y cuidado infantil', 'Baby', 
  'GuarderiaPos', 'guarderia', 65, 15,
  'Niño', 'Niños', 'Servicio', 'Servicios', 'Inscripción', 'Inscripciones',
  ARRAY['pos', 'customers', 'reports'], 
  ARRAY['staff_management'], 
  ARRAY['whatsapp_integration']);

-- Hotel / Hospedaje
SELECT temp_insert_vertical('services', 'hotel', 'hotel', 
  'Hotel', 'Hotel', 
  'Hotel y servicio de hospedaje', 'Hotel', 
  'HotelPos', 'hotel', 75, 16,
  'Huésped', 'Huéspedes', 'Habitación', 'Habitaciones', 'Reservación', 'Reservaciones',
  ARRAY['pos', 'customers', 'reports'], 
  ARRAY['reservations', 'staff_management'], 
  ARRAY['online_ordering', 'whatsapp_integration']);

-- ============================================
-- REMAINING FASHION & ACCESSORIES
-- ============================================

SELECT temp_insert_vertical('fashion', 'bolsos_carteras', 'bolsos-carteras', 
  'Bolsos y Carteras', 'Bags & Purses', 
  'Bolsos, carteras y accesorios de piel', 'Briefcase', 
  'BolsosPos', 'bolsos', 75, 19,
  'Cliente', 'Clientes', 'Bolso', 'Bolsos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('fashion', 'accesorios_moda', 'accesorios-moda', 
  'Accesorios de Moda', 'Fashion Accessories', 
  'Joyería, bisutería y accesorios', 'Gem', 
  'AccesoriosPos', 'accesorios', 80, 20,
  'Cliente', 'Clientes', 'Accesorio', 'Accesorios', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants', 'loyalty_program'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('fashion', 'gorras_sombreros', 'gorras-sombreros', 
  'Bufandas, Gorras y Sombreros', 'Scarves & Hats', 
  'Accesorios para la cabeza y cuello', 'Crown', 
  'SombrerosPos', 'sombreros', 55, 21,
  'Cliente', 'Clientes', 'Prenda', 'Prendas', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants'], 
  ARRAY[]::TEXT[]);

SELECT temp_insert_vertical('fashion', 'lentes_sol', 'lentes-sol', 
  'Lentes de Sol', 'Sunglasses Shop', 
  'Tienda de lentes de sol y armazones', 'Eye', 
  'LentesPos', 'lentes', 65, 22,
  'Cliente', 'Clientes', 'Lente', 'Lentes', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants'], 
  ARRAY['online_ordering']);

-- ============================================
-- TECHNOLOGY & ELECTRONICS
-- ============================================

SELECT temp_insert_vertical('technology', 'tienda_celulares', 'tienda-celulares', 
  'Tienda de Celulares', 'Cell Phone Store', 
  'Venta de celulares y smartphones', 'Smartphone', 
  'CelularesPos', 'celulares', 95, 1,
  'Cliente', 'Clientes', 'Equipo', 'Equipos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports', 'serial_numbers'], 
  ARRAY['product_variants'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('technology', 'accesorios_celular', 'accesorios-celular', 
  'Accesorios para Celular', 'Phone Accessories', 
  'Fundas, cargadores y accesorios móviles', 'Cable', 
  'AccesoriosCelPos', 'accesorioscel', 85, 2,
  'Cliente', 'Clientes', 'Accesorio', 'Accesorios', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants', 'barcode_scanning'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('technology', 'electronica', 'electronica', 
  'Tienda de Electrónica', 'Electronics Store', 
  'Electrónica general y gadgets', 'Cpu', 
  'ElectronicaPos', 'electronica', 85, 3,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports', 'serial_numbers'], 
  ARRAY['barcode_scanning', 'product_variants'], 
  ARRAY['online_ordering', 'delivery']);

SELECT temp_insert_vertical('technology', 'electrodomesticos', 'electrodomesticos', 
  'Electrodomésticos', 'Appliance Store', 
  'Línea blanca y electrodomésticos', 'Refrigerator', 
  'ElectrodomesticosPos', 'electrodomesticos', 80, 4,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports', 'serial_numbers'], 
  ARRAY['delivery', 'quotes'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('technology', 'computadoras', 'computadoras', 
  'Computadoras y Laptops', 'Computer Store', 
  'Computadoras, laptops y componentes', 'Laptop', 
  'ComputadorasPos', 'computadoras', 85, 5,
  'Cliente', 'Clientes', 'Equipo', 'Equipos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports', 'serial_numbers'], 
  ARRAY['product_variants', 'quotes'], 
  ARRAY['online_ordering', 'delivery']);

SELECT temp_insert_vertical('technology', 'gamer', 'gamer', 
  'Tienda Gamer', 'Gaming Store', 
  'Accesorios gamer y periféricos', 'Gamepad2', 
  'GamerPos', 'gamer', 80, 6,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['loyalty_program', 'online_ordering'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('technology', 'videojuegos', 'videojuegos', 
  'Tienda de Videojuegos', 'Video Game Store', 
  'Videojuegos nuevos y usados', 'Gamepad', 
  'VideoJuegosPos', 'videojuegos', 75, 7,
  'Cliente', 'Clientes', 'Juego', 'Juegos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['loyalty_program', 'barcode_scanning'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('technology', 'consolas', 'consolas', 
  'Consolas y Controles', 'Console Store', 
  'Consolas de videojuegos y accesorios', 'Joystick', 
  'ConsolasPos', 'consolas', 70, 8,
  'Cliente', 'Clientes', 'Consola', 'Consolas', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports', 'serial_numbers'], 
  ARRAY['product_variants'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('technology', 'realidad_virtual', 'realidad-virtual', 
  'Realidad Virtual', 'VR Store', 
  'Equipos de realidad virtual y aumentada', 'Glasses', 
  'VRPos', 'vr', 55, 9,
  'Cliente', 'Clientes', 'Equipo', 'Equipos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports', 'serial_numbers'], 
  ARRAY[]::TEXT[],
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('technology', 'drones', 'drones', 
  'Tienda de Drones', 'Drone Store', 
  'Drones y accesorios de vuelo', 'Plane', 
  'DronesPos', 'drones', 60, 10,
  'Cliente', 'Clientes', 'Drone', 'Drones', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports', 'serial_numbers'], 
  ARRAY['quotes'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('technology', 'camaras', 'camaras', 
  'Cámaras Fotográficas', 'Camera Store', 
  'Cámaras, lentes y equipo fotográfico', 'Camera', 
  'CamarasPos', 'camaras', 65, 11,
  'Cliente', 'Clientes', 'Equipo', 'Equipos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports', 'serial_numbers'], 
  ARRAY['product_variants'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('technology', 'iluminacion_profesional', 'iluminacion-profesional', 
  'Iluminación Profesional', 'Pro Lighting', 
  'Iluminación para foto, video y eventos', 'Lightbulb', 
  'IluminacionPos', 'iluminacion', 50, 12,
  'Cliente', 'Clientes', 'Equipo', 'Equipos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['quotes'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('technology', 'audio_profesional', 'audio-profesional', 
  'Audio Profesional', 'Pro Audio', 
  'Equipo de sonido profesional', 'Speaker', 
  'AudioPos', 'audio', 55, 13,
  'Cliente', 'Clientes', 'Equipo', 'Equipos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports', 'serial_numbers'], 
  ARRAY['quotes'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('technology', 'seguridad_cctv', 'seguridad-cctv', 
  'Seguridad y CCTV', 'Security & CCTV', 
  'Sistemas de seguridad y videovigilancia', 'Shield', 
  'SeguridadPos', 'seguridad', 70, 14,
  'Cliente', 'Clientes', 'Sistema', 'Sistemas', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports', 'serial_numbers'], 
  ARRAY['quotes', 'delivery'], 
  ARRAY['whatsapp_integration']);

-- ============================================
-- HOME & DECORATION
-- ============================================

SELECT temp_insert_vertical('home', 'muebleria', 'muebleria', 
  'Mueblería', 'Furniture Store', 
  'Muebles para hogar y oficina', 'Armchair', 
  'MuebleriaPos', 'muebleria', 85, 1,
  'Cliente', 'Clientes', 'Mueble', 'Muebles', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['delivery', 'quotes'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('home', 'decoracion', 'decoracion', 
  'Decoración', 'Home Decor', 
  'Artículos decorativos para el hogar', 'Flower', 
  'DecoPos', 'decoracion', 75, 2,
  'Cliente', 'Clientes', 'Artículo', 'Artículos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('home', 'blancos', 'blancos', 
  'Blancos', 'Linens', 
  'Sábanas, toallas y ropa de cama', 'Bed', 
  'BlancosPos', 'blancos', 70, 3,
  'Cliente', 'Clientes', 'Artículo', 'Artículos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('home', 'colchoneria', 'colchoneria', 
  'Colchonería', 'Mattress Store', 
  'Colchones y bases de cama', 'Bed', 
  'ColchoneriaPos', 'colchoneria', 70, 4,
  'Cliente', 'Clientes', 'Colchón', 'Colchones', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['delivery', 'quotes'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('home', 'cocinas_integrales', 'cocinas-integrales', 
  'Cocinas Integrales', 'Kitchen Store', 
  'Cocinas integrales y closets', 'ChefHat', 
  'CocinasPos', 'cocinas', 60, 5,
  'Cliente', 'Clientes', 'Cocina', 'Cocinas', 'Proyecto', 'Proyectos',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['quotes', 'delivery'], 
  ARRAY[]::TEXT[]);

SELECT temp_insert_vertical('home', 'utensilios_cocina', 'utensilios-cocina', 
  'Utensilios de Cocina', 'Kitchenware', 
  'Ollas, sartenes y utensilios', 'Utensils', 
  'UtensiliosPos', 'utensilios', 65, 6,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['barcode_scanning'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('home', 'decoracion_vintage', 'decoracion-vintage', 
  'Decoración Vintage', 'Vintage Decor', 
  'Artículos decorativos vintage y retro', 'Clock', 
  'VintageDecoPos', 'decovintagee', 50, 7,
  'Cliente', 'Clientes', 'Artículo', 'Artículos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY[]::TEXT[],
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('home', 'cuadros_arte', 'cuadros-arte', 
  'Cuadros y Arte', 'Art & Frames', 
  'Cuadros, marcos y arte decorativo', 'Frame', 
  'ArtePos', 'arte', 55, 8,
  'Cliente', 'Clientes', 'Obra', 'Obras', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['quotes'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('home', 'espejos_cristales', 'espejos-cristales', 
  'Espejos y Cristales', 'Mirrors & Glass', 
  'Espejos decorativos y cristalería', 'Square', 
  'EspejosPos', 'espejos', 50, 9,
  'Cliente', 'Clientes', 'Espejo', 'Espejos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['quotes'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('home', 'persianas_cortinas', 'persianas-cortinas', 
  'Persianas y Cortinas', 'Blinds & Curtains', 
  'Persianas, cortinas y toldos', 'Blinds', 
  'PersianasPos', 'persianas', 55, 10,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Pedido', 'Pedidos',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['quotes', 'delivery'], 
  ARRAY[]::TEXT[]);

SELECT temp_insert_vertical('home', 'iluminacion_decorativa', 'iluminacion-decorativa', 
  'Iluminación Decorativa', 'Decorative Lighting', 
  'Lámparas y candiles decorativos', 'Lamp', 
  'LamparasPos', 'lamparas', 55, 11,
  'Cliente', 'Clientes', 'Lámpara', 'Lámparas', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants'], 
  ARRAY['online_ordering']);

-- ============================================
-- CONSTRUCTION & HARDWARE
-- ============================================

SELECT temp_insert_vertical('hardware', 'ferreteria', 'ferreteria', 
  'Ferretería', 'Hardware Store', 
  'Ferretería y materiales de construcción', 'Hammer', 
  'FerreteriaPos', 'ferreteria', 90, 1,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports', 'barcode_scanning'], 
  ARRAY['suppliers', 'quotes'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('hardware', 'tlapaleria', 'tlapaleria', 
  'Tlapalería', 'Small Hardware', 
  'Artículos de ferretería y hogar', 'Wrench', 
  'TlapaleriaPos', 'tlapaleria', 85, 2,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['barcode_scanning'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('hardware', 'materiales_construccion', 'materiales-construccion', 
  'Materiales de Construcción', 'Building Materials', 
  'Cemento, varilla y materiales', 'Building', 
  'MaterialesPos', 'materiales', 80, 3,
  'Cliente', 'Clientes', 'Material', 'Materiales', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['suppliers', 'delivery', 'quotes'], 
  ARRAY['whatsapp_integration']);

SELECT temp_insert_vertical('hardware', 'cemento_agregados', 'cemento-agregados', 
  'Cemento y Agregados', 'Cement & Aggregates', 
  'Cemento, arena, grava y agregados', 'Boxes', 
  'CementoPos', 'cemento', 65, 4,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['delivery', 'quotes'], 
  ARRAY[]::TEXT[]);

SELECT temp_insert_vertical('hardware', 'pinturas', 'pinturas', 
  'Pinturas y Recubrimientos', 'Paint Store', 
  'Pinturas, barnices y recubrimientos', 'Paintbrush', 
  'PinturasPos', 'pinturas', 75, 5,
  'Cliente', 'Clientes', 'Pintura', 'Pinturas', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['barcode_scanning', 'product_variants'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('hardware', 'carpinteria_retail', 'carpinteria-retail', 
  'Carpintería Retail', 'Woodworking Store', 
  'Maderas, tableros y herramientas', 'TreePine', 
  'MaderasPos', 'maderas', 60, 6,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['quotes', 'delivery'], 
  ARRAY[]::TEXT[]);

SELECT temp_insert_vertical('hardware', 'herramientas_electricas', 'herramientas-electricas', 
  'Herramientas Eléctricas', 'Power Tools', 
  'Herramientas eléctricas y accesorios', 'Wrench', 
  'HerramientasPos', 'herramientas', 70, 7,
  'Cliente', 'Clientes', 'Herramienta', 'Herramientas', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports', 'serial_numbers'], 
  ARRAY['barcode_scanning'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('hardware', 'plomeria_retail', 'plomeria-retail', 
  'Plomería Retail', 'Plumbing Supplies', 
  'Materiales y accesorios de plomería', 'Droplets', 
  'PlomeriaRetailPos', 'plomeriaretail', 65, 8,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['barcode_scanning'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('hardware', 'electricidad_retail', 'electricidad-retail', 
  'Electricidad Retail', 'Electrical Supplies', 
  'Material eléctrico y cables', 'Plug', 
  'ElectricidadPos', 'electricidadretail', 65, 9,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['barcode_scanning'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('hardware', 'cerrajeria_retail', 'cerrajeria-retail', 
  'Cerrajería Retail', 'Locksmith Supplies', 
  'Cerraduras, llaves y seguridad', 'Lock', 
  'CerrajeriaRetailPos', 'cerrajeriaretail', 55, 10,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY[]::TEXT[],
  ARRAY['quotes']);

SELECT temp_insert_vertical('hardware', 'pisos_azulejos', 'pisos-azulejos', 
  'Pisos y Azulejos', 'Tile Store', 
  'Pisos, azulejos y losetas', 'Grid3x3', 
  'PisosPos', 'pisos', 70, 11,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['quotes', 'delivery'], 
  ARRAY[]::TEXT[]);

SELECT temp_insert_vertical('hardware', 'vidrieria', 'vidrieria', 
  'Vidriería', 'Glass Shop', 
  'Vidrios, cristales y espejos', 'Square', 
  'VidrieriaPos', 'vidrieria', 60, 12,
  'Cliente', 'Clientes', 'Vidrio', 'Vidrios', 'Pedido', 'Pedidos',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['quotes', 'delivery'], 
  ARRAY[]::TEXT[]);

-- ============================================
-- PETS
-- ============================================

SELECT temp_insert_vertical('pets', 'pet_shop', 'pet-shop', 
  'Pet Shop', 'Pet Shop', 
  'Tienda de mascotas y accesorios', 'PawPrint', 
  'PetShopPos', 'petshop', 90, 1,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['loyalty_program', 'expiry_tracking'], 
  ARRAY['online_ordering', 'delivery']);

SELECT temp_insert_vertical('pets', 'alimento_mascotas', 'alimento-mascotas', 
  'Alimento para Mascotas', 'Pet Food Store', 
  'Especialidad en alimento para mascotas', 'Dog', 
  'AlimentoMascotasPos', 'alimentomascotas', 80, 2,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['loyalty_program', 'expiry_tracking', 'barcode_scanning'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('pets', 'accesorios_mascotas', 'accesorios-mascotas', 
  'Accesorios de Mascotas', 'Pet Accessories', 
  'Juguetes, camas y accesorios', 'Dog', 
  'AccesoriosMascotasPos', 'accesoriosmascotas', 70, 3,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('pets', 'acuario', 'acuario', 
  'Acuario', 'Aquarium Store', 
  'Peces, acuarios y accesorios', 'Fish', 
  'AcuarioPos', 'acuario', 60, 4,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY[]::TEXT[],
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('pets', 'reptiles_exoticos', 'reptiles-exoticos', 
  'Reptiles y Exóticos', 'Exotic Pets', 
  'Mascotas exóticas y reptiles', 'Bug', 
  'ExoticosPos', 'exoticos', 45, 5,
  'Cliente', 'Clientes', 'Mascota', 'Mascotas', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY[]::TEXT[],
  ARRAY[]::TEXT[]);

SELECT temp_insert_vertical('pets', 'boutique_mascotas', 'boutique-mascotas', 
  'Boutique de Mascotas', 'Pet Boutique', 
  'Ropa y accesorios premium para mascotas', 'Heart', 
  'BoutiqueMascotasPos', 'boutiquemascotas', 55, 6,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants', 'loyalty_program'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('pets', 'peluqueria_mascotas', 'peluqueria-mascotas', 
  'Peluquería de Mascotas', 'Pet Grooming', 
  'Estética canina y felina con tienda', 'Scissors', 
  'GroomingPos', 'petgrooming', 70, 7,
  'Cliente', 'Clientes', 'Servicio', 'Servicios', 'Cita', 'Citas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['appointments', 'queue_management'], 
  ARRAY['whatsapp_integration']);

-- ============================================
-- AUTOMOTIVE
-- ============================================

SELECT temp_insert_vertical('automotive', 'refaccionaria', 'refaccionaria', 
  'Refaccionaria', 'Auto Parts Store', 
  'Refacciones automotrices', 'Car', 
  'RefaccionariaPos', 'refaccionaria', 90, 1,
  'Cliente', 'Clientes', 'Refacción', 'Refacciones', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports', 'barcode_scanning'], 
  ARRAY['suppliers', 'quotes'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('automotive', 'autopartes', 'autopartes', 
  'Autopartes', 'Auto Parts', 
  'Partes y accesorios automotrices', 'Cog', 
  'AutopartesPos', 'autopartes', 85, 2,
  'Cliente', 'Clientes', 'Parte', 'Partes', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports', 'barcode_scanning'], 
  ARRAY['suppliers'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('automotive', 'llantas', 'llantas', 
  'Tienda de Llantas', 'Tire Shop', 
  'Llantas y servicios de alineación', 'Circle', 
  'LlantasPos', 'llantas', 80, 3,
  'Cliente', 'Clientes', 'Llanta', 'Llantas', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants', 'quotes'], 
  ARRAY['whatsapp_integration']);

SELECT temp_insert_vertical('automotive', 'accesorios_auto', 'accesorios-auto', 
  'Accesorios Automotrices', 'Auto Accessories', 
  'Accesorios y tuning automotriz', 'Car', 
  'AccesoriosAutoPos', 'accesoriosauto', 70, 4,
  'Cliente', 'Clientes', 'Accesorio', 'Accesorios', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('automotive', 'car_audio', 'car-audio', 
  'Car Audio', 'Car Audio', 
  'Audio y electrónica automotriz', 'Speaker', 
  'CarAudioPos', 'caraudio', 65, 5,
  'Cliente', 'Clientes', 'Equipo', 'Equipos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports', 'serial_numbers'], 
  ARRAY['quotes'], 
  ARRAY[]::TEXT[]);

SELECT temp_insert_vertical('automotive', 'detailing', 'detailing', 
  'Detailing Profesional', 'Auto Detailing', 
  'Productos de detallado automotriz', 'Sparkle', 
  'DetailingPos', 'detailing', 55, 6,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['loyalty_program'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('automotive', 'limpieza_auto', 'limpieza-auto', 
  'Productos de Limpieza Automotriz', 'Car Cleaning Products', 
  'Productos para limpieza de autos', 'Sparkle', 
  'LimpiezaAutoPos', 'limpiezaauto', 50, 7,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['barcode_scanning'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('automotive', 'boutique_4x4', 'boutique-4x4', 
  'Boutique 4x4', '4x4 Boutique', 
  'Accesorios para vehículos todo terreno', 'Mountain', 
  'Boutique4x4Pos', '4x4', 45, 8,
  'Cliente', 'Clientes', 'Accesorio', 'Accesorios', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['quotes'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('automotive', 'lubricantes', 'lubricantes', 
  'Venta de Lubricantes', 'Lubricant Store', 
  'Aceites, grasas y lubricantes', 'Droplet', 
  'LubricantesPos', 'lubricantes', 55, 9,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['barcode_scanning'], 
  ARRAY['delivery']);

-- ============================================
-- OFFICE & STATIONERY
-- ============================================

SELECT temp_insert_vertical('office', 'papeleria', 'papeleria', 
  'Papelería', 'Stationery Store', 
  'Artículos de papelería y oficina', 'Pencil', 
  'PapeleriaPos', 'papeleria', 90, 1,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports', 'barcode_scanning'], 
  ARRAY['suppliers'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('office', 'libreria', 'libreria', 
  'Librería', 'Bookstore', 
  'Libros, revistas y publicaciones', 'Book', 
  'LibreriaPos', 'libreria', 85, 2,
  'Cliente', 'Clientes', 'Libro', 'Libros', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports', 'barcode_scanning'], 
  ARRAY['loyalty_program'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('office', 'copias_impresiones', 'copias-impresiones', 
  'Copias e Impresiones', 'Copy Center', 
  'Centro de copiado e impresión', 'Printer', 
  'CopiasPos', 'copias', 75, 3,
  'Cliente', 'Clientes', 'Servicio', 'Servicios', 'Orden', 'Órdenes',
  ARRAY['pos', 'customers', 'reports'], 
  ARRAY['quotes'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('office', 'utiles_escolares', 'utiles-escolares', 
  'Útiles Escolares', 'School Supplies', 
  'Material escolar y mochilas', 'GraduationCap', 
  'UtilesPos', 'utiles', 80, 4,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports', 'barcode_scanning'], 
  ARRAY['promotions'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('office', 'arte_dibujo', 'arte-dibujo', 
  'Arte y Dibujo', 'Art Supplies', 
  'Materiales para artistas y dibujantes', 'Palette', 
  'ArtePos', 'artedibujo', 65, 5,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('office', 'material_didactico', 'material-didactico', 
  'Material Didáctico', 'Educational Materials', 
  'Material educativo y didáctico', 'Blocks', 
  'DidacticoPos', 'didactico', 60, 6,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY[]::TEXT[],
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('office', 'jugueteria_educativa', 'jugueteria-educativa', 
  'Juguetería Educativa', 'Educational Toys', 
  'Juguetes didácticos y educativos', 'Blocks', 
  'JugueteriaEduPos', 'jugueteriaedu', 55, 7,
  'Cliente', 'Clientes', 'Juguete', 'Juguetes', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('office', 'regalos_detalles', 'regalos-detalles', 
  'Regalos y Detalles', 'Gift Shop', 
  'Artículos para regalo y detalles', 'Gift', 
  'RegalosPos', 'regalos', 70, 8,
  'Cliente', 'Clientes', 'Regalo', 'Regalos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('office', 'souvenirs', 'souvenirs', 
  'Souvenirs', 'Souvenir Shop', 
  'Recuerdos y artículos turísticos', 'MapPin', 
  'SouvenirsPos', 'souvenirs', 60, 9,
  'Cliente', 'Clientes', 'Artículo', 'Artículos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY[]::TEXT[],
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('office', 'calendarios_agendas', 'calendarios-agendas', 
  'Calendarios y Agendas', 'Calendars & Planners', 
  'Calendarios, agendas y organizadores', 'Calendar', 
  'CalendariosPos', 'calendarios', 50, 10,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY[]::TEXT[],
  ARRAY['online_ordering']);

-- ============================================
-- BEAUTY & GROOMING
-- ============================================

SELECT temp_insert_vertical('beauty', 'cosmeticos', 'cosmeticos', 
  'Tienda de Cosméticos', 'Cosmetics Store', 
  'Maquillaje y productos de belleza', 'Sparkle', 
  'CosmeticosPos', 'cosmeticos', 90, 1,
  'Clienta', 'Clientas', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['loyalty_program', 'product_variants'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('beauty', 'perfumeria', 'perfumeria', 
  'Perfumería', 'Perfume Store', 
  'Perfumes y fragancias', 'Flower', 
  'PerfumeriaPos', 'perfumeria', 85, 2,
  'Cliente', 'Clientes', 'Perfume', 'Perfumes', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['loyalty_program', 'product_variants'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('beauty', 'barberia_productos', 'barberia-productos', 
  'Barbería con Productos', 'Barber Shop with Products', 
  'Barbería con venta de productos masculinos', 'Scissors', 
  'BarberiaProdsPos', 'barberiaprods', 75, 3,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['appointments', 'loyalty_program'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('beauty', 'estetica_productos', 'estetica-productos', 
  'Estética con Productos', 'Beauty Salon with Products', 
  'Salón de belleza con venta de productos', 'Sparkle', 
  'EsteticaProdsPos', 'esteticaprods', 80, 4,
  'Clienta', 'Clientas', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['appointments', 'loyalty_program', 'staff_management'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('beauty', 'esmaltes', 'esmaltes', 
  'Venta de Esmaltes', 'Nail Polish Store', 
  'Esmaltes y productos para uñas', 'Palette', 
  'EsmaltesPos', 'esmaltes', 55, 5,
  'Clienta', 'Clientas', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('beauty', 'maquillaje_profesional', 'maquillaje-profesional', 
  'Maquillaje Profesional', 'Pro Makeup Store', 
  'Maquillaje profesional y herramientas', 'Paintbrush', 
  'MakeupProPos', 'makeuppro', 65, 6,
  'Clienta', 'Clientas', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants', 'loyalty_program'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('beauty', 'extensiones_pelucas', 'extensiones-pelucas', 
  'Extensiones y Pelucas', 'Hair Extensions & Wigs', 
  'Cabello, extensiones y pelucas', 'User', 
  'ExtensionesPos', 'extensiones', 55, 7,
  'Clienta', 'Clientas', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('beauty', 'suministros_unas', 'suministros-unas', 
  'Suministros para Uñas', 'Nail Supplies', 
  'Productos profesionales para uñas', 'Hand', 
  'NailSuppliesPos', 'nailsupplies', 60, 8,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants', 'barcode_scanning'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('beauty', 'spa_retail', 'spa-retail', 
  'Spa Retail', 'Spa Products', 
  'Productos de spa y relajación', 'Flower', 
  'SpaRetailPos', 'sparetail', 50, 9,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['loyalty_program'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('beauty', 'aceites_esenciales', 'aceites-esenciales', 
  'Aceites Esenciales', 'Essential Oils', 
  'Aromaterapia y aceites esenciales', 'Droplet', 
  'AceitesPos', 'aceites', 50, 10,
  'Cliente', 'Clientes', 'Aceite', 'Aceites', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY[]::TEXT[],
  ARRAY['online_ordering']);

-- ============================================
-- SPORTS & OUTDOORS
-- ============================================

SELECT temp_insert_vertical('sports', 'deportes', 'deportes', 
  'Tienda de Deportes', 'Sports Store', 
  'Artículos y ropa deportiva', 'Dumbbell', 
  'DeportesPos', 'deportes', 85, 1,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants', 'loyalty_program'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('sports', 'bicicletas', 'bicicletas', 
  'Bicicletería', 'Bike Shop', 
  'Bicicletas, partes y accesorios', 'Bike', 
  'BicicletasPos', 'bicicletas', 80, 2,
  'Cliente', 'Clientes', 'Bicicleta', 'Bicicletas', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports', 'serial_numbers'], 
  ARRAY['quotes'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('sports', 'pesca', 'pesca', 
  'Pesca Deportiva', 'Fishing Store', 
  'Artículos de pesca deportiva', 'Fish', 
  'PescaPos', 'pesca', 55, 3,
  'Cliente', 'Clientes', 'Artículo', 'Artículos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['loyalty_program'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('sports', 'campismo', 'campismo', 
  'Tienda de Campismo', 'Camping Store', 
  'Artículos para acampar y senderismo', 'Tent', 
  'CampismoPos', 'campismo', 60, 4,
  'Cliente', 'Clientes', 'Artículo', 'Artículos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('sports', 'airsoft_paintball', 'airsoft-paintball', 
  'Airsoft y Paintball', 'Airsoft & Paintball', 
  'Equipos y accesorios tácticos', 'Target', 
  'AirsoftPos', 'airsoft', 50, 5,
  'Cliente', 'Clientes', 'Equipo', 'Equipos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['age_verification'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('sports', 'deportes_extremos', 'deportes-extremos', 
  'Deportes Extremos', 'Extreme Sports', 
  'Skate, snowboard y deportes extremos', 'Snowflake', 
  'ExtremoPos', 'extremo', 55, 6,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('sports', 'artes_marciales', 'artes-marciales', 
  'Artes Marciales', 'Martial Arts Store', 
  'Equipo y uniformes de artes marciales', 'Sword', 
  'ArtesMarciales', 'artesmarciales', 50, 7,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('sports', 'yoga', 'yoga', 
  'Tienda de Yoga', 'Yoga Store', 
  'Productos y accesorios de yoga', 'User', 
  'YogaPos', 'yoga', 50, 8,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['loyalty_program'], 
  ARRAY['online_ordering']);

-- ============================================
-- KIDS & BABY
-- ============================================

SELECT temp_insert_vertical('kids', 'jugueteria', 'jugueteria', 
  'Juguetería', 'Toy Store', 
  'Juguetes para todas las edades', 'Gamepad2', 
  'JugueteriaPos', 'jugueteria', 90, 1,
  'Cliente', 'Clientes', 'Juguete', 'Juguetes', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports', 'barcode_scanning'], 
  ARRAY['loyalty_program', 'product_variants'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('kids', 'tienda_bebes', 'tienda-bebes', 
  'Tienda de Bebés', 'Baby Store', 
  'Todo para el bebé y mamá', 'Baby', 
  'BebesPos', 'bebes', 85, 2,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants', 'loyalty_program'], 
  ARRAY['online_ordering', 'delivery']);

SELECT temp_insert_vertical('kids', 'ropa_bebe', 'ropa-bebe', 
  'Ropa de Bebé', 'Baby Clothing', 
  'Moda infantil para bebés', 'Shirt', 
  'RopaBebePos', 'ropabebe', 75, 3,
  'Cliente', 'Clientes', 'Prenda', 'Prendas', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('kids', 'carriolas', 'carriolas', 
  'Carriolas y Accesorios', 'Strollers & Accessories', 
  'Carriolas, sillas y accesorios para bebé', 'Baby', 
  'CarriolasPos', 'carriolas', 65, 4,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('kids', 'montessori', 'montessori', 
  'Tienda Montessori', 'Montessori Store', 
  'Material y juguetes Montessori', 'Blocks', 
  'MontessoriPos', 'montessori', 50, 5,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY[]::TEXT[],
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('kids', 'aprendizaje', 'aprendizaje', 
  'Tienda de Aprendizaje', 'Learning Store', 
  'Material didáctico y de aprendizaje', 'GraduationCap', 
  'AprendizajePos', 'aprendizaje', 45, 6,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY[]::TEXT[],
  ARRAY['online_ordering']);

-- ============================================
-- SPECIALTY STORES
-- ============================================

SELECT temp_insert_vertical('specialty', 'floreria', 'floreria', 
  'Florería', 'Flower Shop', 
  'Flores, arreglos y plantas', 'Flower2', 
  'FloreriaPos', 'floreria', 85, 1,
  'Cliente', 'Clientes', 'Arreglo', 'Arreglos', 'Pedido', 'Pedidos',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['delivery', 'online_ordering', 'expiry_tracking'], 
  ARRAY['whatsapp_integration']);

SELECT temp_insert_vertical('specialty', 'floreria_premium', 'floreria-premium', 
  'Florería Premium', 'Premium Flower Shop', 
  'Arreglos florales de lujo y eventos', 'Flower2', 
  'FloresPremiumPos', 'florespremi', 65, 2,
  'Cliente', 'Clientes', 'Arreglo', 'Arreglos', 'Pedido', 'Pedidos',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['delivery', 'reservations', 'quotes'], 
  ARRAY['whatsapp_integration']);

SELECT temp_insert_vertical('specialty', 'tienda_regalos', 'tienda-regalos', 
  'Tienda de Regalos', 'Gift Shop', 
  'Artículos de regalo y detalles', 'Gift', 
  'RegalosPos', 'regalos', 75, 3,
  'Cliente', 'Clientes', 'Regalo', 'Regalos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('specialty', 'velas', 'velas', 
  'Tienda de Velas', 'Candle Shop', 
  'Velas artesanales y aromáticas', 'Flame', 
  'VelasPos', 'velas', 55, 4,
  'Cliente', 'Clientes', 'Vela', 'Velas', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('specialty', 'aromaterapia', 'aromaterapia', 
  'Tienda de Aromaterapia', 'Aromatherapy Shop', 
  'Difusores, esencias y aromaterapia', 'Leaf', 
  'AromaPos', 'aromaterapia', 50, 5,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY[]::TEXT[],
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('specialty', 'articulos_religiosos', 'articulos-religiosos', 
  'Artículos Religiosos', 'Religious Items', 
  'Artículos religiosos y de fe', 'Church', 
  'ReligiososPos', 'religiosos', 55, 6,
  'Cliente', 'Clientes', 'Artículo', 'Artículos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY[]::TEXT[],
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('specialty', 'antiguedades', 'antiguedades', 
  'Tienda de Antigüedades', 'Antique Shop', 
  'Antigüedades y coleccionables', 'Clock', 
  'AntiguedadesPos', 'antiguedades', 45, 7,
  'Cliente', 'Clientes', 'Pieza', 'Piezas', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['quotes'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('specialty', 'coleccionables', 'coleccionables', 
  'Coleccionables', 'Collectibles', 
  'Artículos de colección y memorabilia', 'Star', 
  'ColeccionablesPos', 'coleccionables', 50, 8,
  'Cliente', 'Clientes', 'Artículo', 'Artículos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('specialty', 'comics', 'comics', 
  'Comics Shop', 'Comic Shop', 
  'Comics, manga y novelas gráficas', 'Book', 
  'ComicsPos', 'comics', 55, 9,
  'Cliente', 'Clientes', 'Comic', 'Comics', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports', 'barcode_scanning'], 
  ARRAY['loyalty_program'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('specialty', 'sex_shop', 'sex-shop', 
  'Sex Shop', 'Adult Store', 
  'Productos para adultos', 'Heart', 
  'AdultPos', 'adultos', 50, 10,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['age_verification', 'product_variants'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('specialty', 'casa_empeno', 'casa-empeno', 
  'Casa de Empeño', 'Pawn Shop', 
  'Préstamos prendarios y venta', 'DollarSign', 
  'EmpenaPos', 'empeno', 65, 11,
  'Cliente', 'Clientes', 'Artículo', 'Artículos', 'Empeño', 'Empeños',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['serial_numbers', 'quotes'], 
  ARRAY[]::TEXT[]);

SELECT temp_insert_vertical('specialty', 'instrumentos_musicales', 'instrumentos-musicales', 
  'Instrumentos Musicales', 'Music Store', 
  'Instrumentos y accesorios musicales', 'Music', 
  'MusicaPos', 'musica', 70, 12,
  'Cliente', 'Clientes', 'Instrumento', 'Instrumentos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports', 'serial_numbers'], 
  ARRAY['quotes'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('specialty', 'uniformes', 'uniformes', 
  'Tienda de Uniformes', 'Uniform Store', 
  'Uniformes escolares e industriales', 'Shirt', 
  'UniformesPos', 'uniformes', 65, 13,
  'Cliente', 'Clientes', 'Uniforme', 'Uniformes', 'Pedido', 'Pedidos',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants', 'quotes'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('specialty', 'merceria', 'merceria', 
  'Mercería', 'Haberdashery', 
  'Hilos, botones y accesorios de costura', 'Scissors', 
  'MerceriaPos', 'merceria', 60, 14,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['barcode_scanning'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('specialty', 'pinateria', 'pinateria', 
  'Piñatería', 'Pinata Shop', 
  'Piñatas y artículos para fiestas', 'Party', 
  'PinateriaPos', 'pinateria', 55, 15,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Pedido', 'Pedidos',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['reservations'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('specialty', 'manualidades', 'manualidades', 
  'Manualidades', 'Craft Store', 
  'Materiales para manualidades', 'Palette', 
  'ManualidadesPos', 'manualidades', 65, 16,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['barcode_scanning'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('specialty', 'globos', 'globos', 
  'Tienda de Globos', 'Balloon Shop', 
  'Globos y decoración con globos', 'Circle', 
  'GlobosPos', 'globos', 50, 17,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Pedido', 'Pedidos',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['delivery'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('specialty', 'fiestas', 'fiestas', 
  'Artículos para Fiestas', 'Party Supplies', 
  'Decoración y artículos de fiesta', 'Party', 
  'FiestasPos', 'fiestas', 70, 18,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants'], 
  ARRAY['online_ordering', 'delivery']);

SELECT temp_insert_vertical('specialty', 'energia_solar', 'energia-solar', 
  'Energía Solar', 'Solar Energy', 
  'Paneles solares y energía renovable', 'Sun', 
  'SolarPos', 'solar', 50, 19,
  'Cliente', 'Clientes', 'Sistema', 'Sistemas', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports', 'serial_numbers'], 
  ARRAY['quotes', 'delivery'], 
  ARRAY['whatsapp_integration']);

SELECT temp_insert_vertical('specialty', 'baterias_energia', 'baterias-energia', 
  'Baterías y Energía', 'Battery Store', 
  'Baterías, pilas y energía portátil', 'Battery', 
  'BateriasPos', 'baterias', 55, 20,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['barcode_scanning'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('specialty', 'regalos_personalizados', 'regalos-personalizados', 
  'Regalos Personalizados', 'Custom Gifts', 
  'Regalos personalizados y grabados', 'Gift', 
  'RegalosPersonalizadosPos', 'personalizado', 60, 21,
  'Cliente', 'Clientes', 'Pedido', 'Pedidos', 'Orden', 'Órdenes',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['quotes'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('specialty', 'impresion_3d', 'impresion-3d', 
  'Impresión 3D', '3D Printing', 
  'Servicio de impresión 3D y productos', '3dCubeSphere', 
  'Impresion3DPos', '3dprint', 45, 22,
  'Cliente', 'Clientes', 'Impresión', 'Impresiones', 'Orden', 'Órdenes',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['quotes'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('specialty', 'scooters_electricos', 'scooters-electricos', 
  'Scooters Eléctricos', 'Electric Scooters', 
  'Patinetas y scooters eléctricos', 'Zap', 
  'ScootersPos', 'scooters', 55, 23,
  'Cliente', 'Clientes', 'Scooter', 'Scooters', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports', 'serial_numbers'], 
  ARRAY['quotes'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('specialty', 'herbalismo', 'herbalismo', 
  'Herbalismo', 'Herbal Shop', 
  'Hierbas y remedios tradicionales', 'Leaf', 
  'HerbalismoPos', 'herbalismo', 50, 24,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY[]::TEXT[],
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('specialty', 'recargas', 'recargas', 
  'Recargas Telefónicas', 'Phone Recharges', 
  'Recargas y servicios telefónicos', 'Phone', 
  'RecargasPos', 'recargas', 70, 25,
  'Cliente', 'Clientes', 'Recarga', 'Recargas', 'Venta', 'Ventas',
  ARRAY['pos', 'customers', 'reports'], 
  ARRAY[]::TEXT[],
  ARRAY[]::TEXT[]);

SELECT temp_insert_vertical('specialty', 'limpieza', 'limpieza', 
  'Productos de Limpieza', 'Cleaning Products', 
  'Productos de limpieza y aseo', 'Sparkle', 
  'LimpiezaPos', 'limpieza', 65, 26,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['barcode_scanning'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('specialty', 'aromatizantes', 'aromatizantes', 
  'Tienda de Aromatizantes', 'Air Freshener Store', 
  'Aromatizantes y ambientadores', 'Wind', 
  'AromatizantesPos', 'aromatizantes', 45, 27,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('specialty', 'plasticos', 'plasticos', 
  'Tienda de Plásticos', 'Plastic Store', 
  'Contenedores y artículos de plástico', 'Box', 
  'PlasticosPos', 'plasticos', 50, 28,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['barcode_scanning'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('specialty', 'outlet', 'outlet', 
  'Outlet de Productos', 'Outlet Store', 
  'Productos de marca a precios reducidos', 'Tag', 
  'OutletPos', 'outlet', 70, 29,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['promotions', 'barcode_scanning'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('specialty', 'bazar_segunda_mano', 'bazar-segunda-mano', 
  'Bazar de Segunda Mano', 'Second Hand Bazaar', 
  'Artículos de segunda mano', 'Recycle', 
  'BazarPos', 'bazar', 55, 30,
  'Cliente', 'Clientes', 'Artículo', 'Artículos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY[]::TEXT[],
  ARRAY[]::TEXT[]);

SELECT temp_insert_vertical('specialty', 'tienda_japonesa', 'tienda-japonesa', 
  'Tienda Japonesa', 'Japanese Store', 
  'Productos japoneses estilo Miniso', 'Star', 
  'JaponesaPos', 'japonesa', 60, 31,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('specialty', 'tienda_coreana', 'tienda-coreana', 
  'Tienda Coreana', 'Korean Store', 
  'K-pop, K-beauty y productos coreanos', 'Music', 
  'CoreanaPos', 'coreana', 55, 32,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants', 'loyalty_program'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('specialty', 'plantas', 'plantas', 
  'Tienda de Plantas', 'Plant Shop', 
  'Plantas de interior y exterior', 'Flower2', 
  'PlantasPos', 'plantas', 65, 33,
  'Cliente', 'Clientes', 'Planta', 'Plantas', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['expiry_tracking'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('specialty', 'vivero', 'vivero', 
  'Vivero', 'Nursery', 
  'Plantas, árboles y jardinería', 'TreeDeciduous', 
  'ViveroPos', 'vivero', 70, 34,
  'Cliente', 'Clientes', 'Planta', 'Plantas', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['delivery'], 
  ARRAY['whatsapp_integration']);

SELECT temp_insert_vertical('specialty', 'bonsais', 'bonsais', 
  'Bonsáis', 'Bonsai Shop', 
  'Bonsáis y arte de cultivo', 'TreePine', 
  'BonsaiPos', 'bonsai', 40, 35,
  'Cliente', 'Clientes', 'Bonsái', 'Bonsáis', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY[]::TEXT[],
  ARRAY['delivery']);

SELECT temp_insert_vertical('specialty', 'suculentas', 'suculentas', 
  'Suculentas y Macetas', 'Succulent Shop', 
  'Suculentas, cactus y macetas', 'Flower', 
  'SuculentasPos', 'suculentas', 55, 36,
  'Cliente', 'Clientes', 'Planta', 'Plantas', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants'], 
  ARRAY['online_ordering', 'delivery']);

SELECT temp_insert_vertical('specialty', 'hidroponia', 'hidroponia', 
  'Tienda de Hidroponía', 'Hydroponics Shop', 
  'Sistemas y suministros hidropónicos', 'Droplets', 
  'HidroponiaPos', 'hidroponia', 40, 37,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY[]::TEXT[],
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('specialty', 'souvenirs_turisticos', 'souvenirs-turisticos', 
  'Souvenirs Turísticos', 'Tourist Souvenirs', 
  'Recuerdos y artesanías turísticas', 'MapPin', 
  'SouvenirsTuristicosPos', 'souvenirsturisticos', 55, 38,
  'Cliente', 'Clientes', 'Souvenir', 'Souvenirs', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('specialty', 'artesanias', 'artesanias', 
  'Artesanías Regionales', 'Regional Crafts', 
  'Artesanías locales y regionales', 'Palette', 
  'ArtesaniasPos', 'artesanias', 60, 39,
  'Cliente', 'Clientes', 'Artesanía', 'Artesanías', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY[]::TEXT[],
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('specialty', 'alimentos_llevar', 'alimentos-llevar', 
  'Alimentos para Llevar', 'Take-Away Food', 
  'Comida preparada para llevar', 'Package', 
  'AlimentosLlevarPos', 'alimentosllevar', 70, 40,
  'Cliente', 'Clientes', 'Platillo', 'Platillos', 'Orden', 'Órdenes',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['kitchen_display', 'queue_management'], 
  ARRAY['delivery', 'online_ordering']);

SELECT temp_insert_vertical('specialty', 'dulces_tipicos', 'dulces-tipicos', 
  'Dulces Típicos', 'Traditional Sweets', 
  'Dulces tradicionales y regionales', 'Candy', 
  'DulcesTipicosPos', 'dulcestipicos', 55, 41,
  'Cliente', 'Clientes', 'Dulce', 'Dulces', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['expiry_tracking'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('specialty', 'boutique_lujo', 'boutique-lujo', 
  'Boutique de Lujo', 'Luxury Boutique', 
  'Artículos de lujo y alta gama', 'Crown', 
  'LujoPos', 'lujo', 50, 42,
  'Cliente', 'Clientes', 'Artículo', 'Artículos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['loyalty_program', 'quotes'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('specialty', 'maletas', 'maletas', 
  'Maletería', 'Luggage Store', 
  'Maletas, paraguas y artículos de viaje', 'Luggage', 
  'MaletasPos', 'maletas', 55, 43,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('specialty', 'tapiceria', 'tapiceria', 
  'Tienda de Tapicería', 'Upholstery Store', 
  'Telas y materiales para tapicería', 'Scissors', 
  'TapiceriaPos', 'tapiceria', 45, 44,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['quotes'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('specialty', 'lonas_impresion', 'lonas-impresion', 
  'Lonas e Impresión', 'Banner Printing', 
  'Lonas, vinil y gran formato', 'Printer', 
  'LonasPos', 'lonas', 50, 45,
  'Cliente', 'Clientes', 'Trabajo', 'Trabajos', 'Orden', 'Órdenes',
  ARRAY['pos', 'customers', 'reports'], 
  ARRAY['quotes'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('specialty', 'empaques', 'empaques', 
  'Tienda de Empaques', 'Packaging Store', 
  'Cajas, bolsas y materiales de empaque', 'Package', 
  'EmpaquesPos', 'empaques', 55, 46,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['barcode_scanning'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('specialty', 'articulos_barberias', 'articulos-barberias', 
  'Artículos para Barberías', 'Barber Supplies', 
  'Equipo profesional para barbería', 'Scissors', 
  'BarberSuppliesPos', 'barbersupplies', 45, 47,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['barcode_scanning'], 
  ARRAY['online_ordering', 'delivery']);

SELECT temp_insert_vertical('specialty', 'productos_spas', 'productos-spas', 
  'Productos para Spas', 'Spa Supplies', 
  'Equipo y productos profesionales de spa', 'Flower', 
  'SpaSuppliesPos', 'spasupplies', 45, 48,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['barcode_scanning'], 
  ARRAY['online_ordering', 'delivery']);

SELECT temp_insert_vertical('specialty', 'cristaleria', 'cristaleria', 
  'Cristalería', 'Glassware Store', 
  'Cristalería fina y decorativa', 'Glass', 
  'CristaleriaPos', 'cristaleria', 50, 49,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('specialty', 'material_electrico_industrial', 'material-electrico-industrial', 
  'Material Eléctrico Industrial', 'Industrial Electrical', 
  'Material eléctrico para industria', 'Zap', 
  'ElectricoIndustrialPos', 'electricoindustrial', 55, 50,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['quotes', 'suppliers'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('specialty', 'extintores', 'extintores', 
  'Extintores y Seguridad', 'Fire Safety', 
  'Extintores y equipo contra incendios', 'Flame', 
  'ExtintoresPos', 'extintores', 50, 51,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports', 'expiry_tracking'], 
  ARRAY['quotes'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('specialty', 'senalizacion', 'senalizacion', 
  'Tienda de Señalización', 'Signage Store', 
  'Señales, letreros y rotulación', 'Sign', 
  'SenalizacionPos', 'senalizacion', 45, 52,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Orden', 'Órdenes',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['quotes'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('specialty', 'impermeabilizantes', 'impermeabilizantes', 
  'Impermeabilizantes', 'Waterproofing Store', 
  'Impermeabilizantes y selladores', 'Droplets', 
  'ImpermeabilizantesPos', 'impermeabilizantes', 50, 53,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['quotes'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('specialty', 'pinturas_automotrices', 'pinturas-automotrices', 
  'Pinturas Automotrices', 'Auto Paint Store', 
  'Pinturas y acabados automotrices', 'Paintbrush', 
  'PinturasAutoPos', 'pinturasauto', 50, 54,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants'], 
  ARRAY['delivery']);

-- ============================================
-- DROP TEMPORARY FUNCTION
-- ============================================
DROP FUNCTION IF EXISTS temp_insert_vertical;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'All 250+ business verticals inserted successfully!';
  RAISE NOTICE 'Categories: grocery, beverages, restaurants, fashion, technology, home, hardware, pets, automotive, office, beauty, sports, kids, specialty, services, health';
  RAISE NOTICE 'Special terminology configured for medical (Paciente), restaurants (Comensal), etc.';
END $$;
