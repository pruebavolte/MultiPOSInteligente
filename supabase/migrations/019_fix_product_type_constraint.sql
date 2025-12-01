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
