-- Update currency constraint to include all supported currencies
-- First, drop the old constraint
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_currency_check;

-- Add the new constraint with all currencies
ALTER TABLE products
ADD CONSTRAINT products_currency_check
CHECK (currency IN ('MXN', 'USD', 'BRL', 'EUR', 'JPY'));

-- Update the comment
COMMENT ON COLUMN products.currency IS 'Currency of the product price: MXN (Mexican Peso), USD (US Dollar), BRL (Brazilian Real), EUR (Euro), or JPY (Japanese Yen)';
