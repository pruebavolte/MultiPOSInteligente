-- =================================================================
-- Migración: Agregar campo product_type para diferenciar productos
-- Fecha: 2025-01-10
-- Descripción: Añade un campo para distinguir entre productos de
--              inventario y productos de menú digital
-- =================================================================

-- Agregar columna product_type a la tabla products
ALTER TABLE products
ADD COLUMN product_type TEXT NOT NULL DEFAULT 'inventory'
CHECK (product_type IN ('inventory', 'menu_digital'));

-- Crear índice para mejorar búsquedas por tipo de producto
CREATE INDEX idx_products_product_type ON products(product_type);

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
