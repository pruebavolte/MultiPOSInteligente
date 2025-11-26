-- =================================================================
-- Actualizar políticas RLS para permitir operaciones sin autenticación
-- NOTA: Esto es para desarrollo. En producción deberías integrar Clerk con Supabase
-- =================================================================

-- Eliminar políticas existentes restrictivas
DROP POLICY IF EXISTS "Permitir lectura de usuarios a todos los autenticados" ON users;
DROP POLICY IF EXISTS "Permitir inserción de usuarios a administradores" ON users;
DROP POLICY IF EXISTS "Permitir actualización de usuarios propios" ON users;
DROP POLICY IF EXISTS "Permitir lectura de categorías" ON categories;
DROP POLICY IF EXISTS "Permitir todas las operaciones en categorías" ON categories;
DROP POLICY IF EXISTS "Permitir lectura de productos" ON products;
DROP POLICY IF EXISTS "Permitir todas las operaciones en productos" ON products;
DROP POLICY IF EXISTS "Permitir lectura de clientes" ON customers;
DROP POLICY IF EXISTS "Permitir todas las operaciones en clientes" ON customers;
DROP POLICY IF EXISTS "Permitir lectura de ventas" ON sales;
DROP POLICY IF EXISTS "Permitir todas las operaciones en ventas" ON sales;
DROP POLICY IF EXISTS "Permitir lectura de items de venta" ON sale_items;
DROP POLICY IF EXISTS "Permitir todas las operaciones en items de venta" ON sale_items;

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
