-- =================================================================
-- Migración: Agregar user_id a productos y categorías
-- Fecha: 2025-01-10
-- Descripción: Implementa arquitectura multi-tenant donde cada
--              administrador tiene su propio menú digital
-- =================================================================

-- Agregar columna user_id a la tabla products
ALTER TABLE products
ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Agregar columna user_id a la tabla categories
ALTER TABLE categories
ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Crear índices para mejorar búsquedas por usuario
CREATE INDEX idx_products_user_id ON products(user_id);
CREATE INDEX idx_categories_user_id ON categories(user_id);

-- Índice compuesto para búsquedas comunes
CREATE INDEX idx_products_user_type ON products(user_id, product_type);

-- Comentarios en las columnas
COMMENT ON COLUMN products.user_id IS 'ID del usuario/restaurante dueño del producto';
COMMENT ON COLUMN categories.user_id IS 'ID del usuario/restaurante dueño de la categoría';

-- Actualizar políticas RLS para products
DROP POLICY IF EXISTS "Service role can do anything on products" ON products;
DROP POLICY IF EXISTS "Users can view products" ON products;
DROP POLICY IF EXISTS "Users can manage their own products" ON products;

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
DROP POLICY IF EXISTS "Service role can do anything on categories" ON categories;
DROP POLICY IF EXISTS "Users can view categories" ON categories;
DROP POLICY IF EXISTS "Users can manage their own categories" ON categories;

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
