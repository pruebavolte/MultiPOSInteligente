-- Add currency field to products table
ALTER TABLE products
ADD COLUMN currency TEXT NOT NULL DEFAULT 'MXN'
CHECK (currency IN ('MXN', 'USD', 'BRL', 'EUR', 'JPY'));

-- Add index for better query performance
CREATE INDEX idx_products_currency ON products(currency);

-- Update existing products to have MXN as default
UPDATE products SET currency = 'MXN' WHERE currency IS NULL;

-- Add comment to explain the field
COMMENT ON COLUMN products.currency IS 'Currency of the product price: MXN (Mexican Peso), USD (US Dollar), BRL (Brazilian Real), EUR (Euro), or JPY (Japanese Yen)';
