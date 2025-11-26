-- =================================================================
-- Migración: Sistema Unificado de Productos Multi-Canal
-- Fecha: 2025-01-12
-- Descripción: Reemplaza product_type con campos de visibilidad para
--              permitir que los mismos productos estén disponibles en
--              múltiples canales (POS, menú digital, venta en línea)
-- =================================================================

-- Agregar nuevas columnas de visibilidad
ALTER TABLE products
ADD COLUMN available_in_pos BOOLEAN DEFAULT true,
ADD COLUMN available_in_digital_menu BOOLEAN DEFAULT false,
ADD COLUMN track_inventory BOOLEAN DEFAULT true;

-- Migrar datos existentes basados en product_type
UPDATE products
SET
  available_in_pos = (product_type = 'inventory'),
  available_in_digital_menu = (product_type = 'menu_digital'),
  track_inventory = (product_type = 'inventory')
WHERE product_type IS NOT NULL;

-- Crear índices para mejorar búsquedas por canal
CREATE INDEX idx_products_pos ON products(available_in_pos) WHERE available_in_pos = true;
CREATE INDEX idx_products_digital_menu ON products(available_in_digital_menu) WHERE available_in_digital_menu = true;
CREATE INDEX idx_products_user_pos ON products(user_id, available_in_pos) WHERE available_in_pos = true;
CREATE INDEX idx_products_user_digital ON products(user_id, available_in_digital_menu) WHERE available_in_digital_menu = true;

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
