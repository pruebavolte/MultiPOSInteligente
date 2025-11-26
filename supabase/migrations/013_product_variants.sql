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
