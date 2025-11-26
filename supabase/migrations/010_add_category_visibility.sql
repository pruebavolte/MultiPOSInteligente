-- =================================================================
-- Migración: Agregar campos de visibilidad a categorías
-- Fecha: 2025-01-12
-- Descripción: Permite controlar qué categorías aparecen en POS
--              y menú digital, heredando la configuración a productos
-- =================================================================

-- Agregar campos de visibilidad a categorías
ALTER TABLE categories
ADD COLUMN available_in_pos BOOLEAN DEFAULT true,
ADD COLUMN available_in_digital_menu BOOLEAN DEFAULT false;

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
CREATE INDEX idx_categories_pos ON categories(available_in_pos) WHERE available_in_pos = true;
CREATE INDEX idx_categories_digital_menu ON categories(available_in_digital_menu) WHERE available_in_digital_menu = true;

-- Comentarios
COMMENT ON COLUMN categories.available_in_pos IS 'Si la categoría y sus productos están disponibles en POS';
COMMENT ON COLUMN categories.available_in_digital_menu IS 'Si la categoría y sus productos están disponibles en menú digital';
