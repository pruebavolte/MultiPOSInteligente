-- =================================================================
-- Migración: Agregar restaurant_id a usuarios
-- Fecha: 2025-01-10
-- Descripción: Vincula clientes (CUSTOMER) con su restaurante/administrador
-- =================================================================

-- Agregar columna restaurant_id a la tabla users
-- Los usuarios con rol CUSTOMER tendrán el ID del ADMIN al que pertenecen
-- Los usuarios con rol ADMIN tienen restaurant_id = NULL (son el restaurante)
ALTER TABLE users
ADD COLUMN restaurant_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Crear índice para mejorar búsquedas
CREATE INDEX idx_users_restaurant_id ON users(restaurant_id);

-- Comentario en la columna
COMMENT ON COLUMN users.restaurant_id IS 'ID del restaurante/admin al que pertenece este usuario. NULL para ADMINs.';

-- Actualizar políticas RLS si es necesario
-- Los usuarios pueden ver información básica de su restaurante
