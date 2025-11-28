-- Migration: Returns System
-- Description: Tables for managing product returns and refunds

-- Create returns table
CREATE TABLE IF NOT EXISTS returns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  user_id TEXT NOT NULL,
  return_number TEXT UNIQUE,
  reason TEXT,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, cancelled
  restaurant_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create return_items table
CREATE TABLE IF NOT EXISTS return_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  return_id UUID NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  subtotal NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create function to generate return number
CREATE OR REPLACE FUNCTION generate_return_number()
RETURNS TRIGGER AS $$
DECLARE
  next_number INTEGER;
  new_return_number TEXT;
BEGIN
  -- Get the next return number
  SELECT COALESCE(MAX(CAST(SUBSTRING(return_number FROM 4) AS INTEGER)), 0) + 1
  INTO next_number
  FROM returns
  WHERE restaurant_id = NEW.restaurant_id;

  -- Generate return number (format: RET-000001)
  new_return_number := 'RET-' || LPAD(next_number::TEXT, 6, '0');

  NEW.return_number := new_return_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-generating return number
DROP TRIGGER IF EXISTS trigger_generate_return_number ON returns;
CREATE TRIGGER trigger_generate_return_number
  BEFORE INSERT ON returns
  FOR EACH ROW
  EXECUTE FUNCTION generate_return_number();

-- Create function to increment product stock
CREATE OR REPLACE FUNCTION increment_product_stock(
  product_id UUID,
  quantity_change INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE products
  SET stock = stock + quantity_change,
      updated_at = NOW()
  WHERE id = product_id;
END;
$$ LANGUAGE plpgsql;

-- Create updated_at trigger for returns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_returns_updated_at ON returns;
CREATE TRIGGER trigger_update_returns_updated_at
  BEFORE UPDATE ON returns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_returns_sale_id ON returns(sale_id);
CREATE INDEX IF NOT EXISTS idx_returns_customer_id ON returns(customer_id);
CREATE INDEX IF NOT EXISTS idx_returns_user_id ON returns(user_id);
CREATE INDEX IF NOT EXISTS idx_returns_restaurant_id ON returns(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_returns_created_at ON returns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_return_items_return_id ON return_items(return_id);
CREATE INDEX IF NOT EXISTS idx_return_items_product_id ON return_items(product_id);

-- Row Level Security (RLS)
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for returns
CREATE POLICY "Users can view their restaurant's returns"
  ON returns FOR SELECT
  USING (restaurant_id = current_setting('app.restaurant_id', true));

CREATE POLICY "Users can insert returns for their restaurant"
  ON returns FOR INSERT
  WITH CHECK (restaurant_id = current_setting('app.restaurant_id', true));

CREATE POLICY "Users can update their restaurant's returns"
  ON returns FOR UPDATE
  USING (restaurant_id = current_setting('app.restaurant_id', true));

-- RLS Policies for return_items
CREATE POLICY "Users can view return items"
  ON return_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM returns
    WHERE returns.id = return_items.return_id
    AND returns.restaurant_id = current_setting('app.restaurant_id', true)
  ));

CREATE POLICY "Users can insert return items"
  ON return_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM returns
    WHERE returns.id = return_items.return_id
    AND returns.restaurant_id = current_setting('app.restaurant_id', true)
  ));

-- Grant permissions
GRANT ALL ON returns TO authenticated;
GRANT ALL ON return_items TO authenticated;
GRANT EXECUTE ON FUNCTION generate_return_number() TO authenticated;
GRANT EXECUTE ON FUNCTION increment_product_stock(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION update_updated_at_column() TO authenticated;

-- Add comment
COMMENT ON TABLE returns IS 'Table for storing product returns and refunds';
COMMENT ON TABLE return_items IS 'Table for storing individual items in a return';
