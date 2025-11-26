-- =================================================================
-- Migración: Crear tablas de ventas (sales y sale_items)
-- Fecha: 2025-01-17
-- Descripción: Crea las tablas para el sistema de punto de venta
-- =================================================================

-- Crear enum para métodos de pago
DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('cash', 'card', 'transfer', 'credit');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Crear enum para estados de venta
DO $$ BEGIN
  CREATE TYPE sale_status AS ENUM ('pending', 'completed', 'cancelled', 'refunded');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Crear tabla de ventas (sales)
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_number TEXT UNIQUE NOT NULL DEFAULT '',
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
  discount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  tax DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  payment_method payment_method NOT NULL DEFAULT 'cash',
  status sale_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Crear tabla de items de venta (sale_items)
CREATE TABLE IF NOT EXISTS sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  discount DECIMAL(10, 2) NOT NULL DEFAULT 0
);

-- Crear función para generar número de venta
CREATE OR REPLACE FUNCTION generate_sale_number()
RETURNS TRIGGER AS $$
DECLARE
  next_number INTEGER;
  sale_year TEXT;
BEGIN
  -- Obtener el año actual
  sale_year := TO_CHAR(NOW(), 'YYYY');

  -- Obtener el siguiente número de venta del año actual
  SELECT COALESCE(MAX(CAST(SUBSTRING(sale_number FROM '\d+$') AS INTEGER)), 0) + 1
  INTO next_number
  FROM sales
  WHERE sale_number LIKE 'V-' || sale_year || '-%';

  -- Generar el número de venta con formato V-YYYY-NNNN
  NEW.sale_number := 'V-' || sale_year || '-' || LPAD(next_number::TEXT, 4, '0');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para generar número de venta automáticamente
DROP TRIGGER IF EXISTS generate_sale_number_trigger ON sales;
CREATE TRIGGER generate_sale_number_trigger
  BEFORE INSERT ON sales
  FOR EACH ROW
  WHEN (NEW.sale_number = '')
  EXECUTE FUNCTION generate_sale_number();

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_sale_number ON sales(sale_number);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);

-- Habilitar RLS
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS (permisivas para desarrollo)
DROP POLICY IF EXISTS "Permitir todo en sales" ON sales;
CREATE POLICY "Permitir todo en sales" ON sales
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo en sale_items" ON sale_items;
CREATE POLICY "Permitir todo en sale_items" ON sale_items
    FOR ALL USING (true) WITH CHECK (true);

-- Comentarios
COMMENT ON TABLE sales IS 'Tabla de ventas del punto de venta';
COMMENT ON TABLE sale_items IS 'Tabla de items/productos de cada venta';
COMMENT ON COLUMN sales.sale_number IS 'Número único de venta con formato V-YYYY-NNNN';
COMMENT ON COLUMN sales.customer_id IS 'Cliente asociado (opcional)';
COMMENT ON COLUMN sales.user_id IS 'Usuario que realizó la venta (obligatorio)';
COMMENT ON COLUMN sales.payment_method IS 'Método de pago: cash, card, transfer, credit';
COMMENT ON COLUMN sales.status IS 'Estado de la venta: pending, completed, cancelled, refunded';
COMMENT ON POLICY "Permitir todo en sales" ON sales IS 'DESARROLLO: Política permisiva. Reemplazar en producción.';
COMMENT ON POLICY "Permitir todo en sale_items" ON sale_items IS 'DESARROLLO: Política permisiva. Reemplazar en producción.';
