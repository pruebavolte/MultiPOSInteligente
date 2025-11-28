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
    ALTER TABLE products ADD COLUMN active BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Actualizar productos inactivos
UPDATE products
SET active = true
WHERE active IS NULL;
