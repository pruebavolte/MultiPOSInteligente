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
    ALTER TABLE products ADD COLUMN product_type TEXT;
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
    ALTER TABLE products ADD COLUMN calculated_cost NUMERIC(10,2) DEFAULT 0;
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
