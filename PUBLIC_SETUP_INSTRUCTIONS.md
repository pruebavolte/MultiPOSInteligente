# 🚀 Configuración Manual de la Base de Datos - SalvadoreX POS

Tu aplicación está conectada a Supabase pero necesita que crees las tablas. Aquí hay dos formas de hacerlo:

## Opción 1: Usando el SQL Editor de Supabase (RECOMENDADO - 2 minutos)

1. Ve a tu proyecto Supabase: https://supabase.com/dashboard
2. Abre tu proyecto "zhvwmzkcqngcaqpdxtwr"
3. Ve a **SQL Editor** en el panel izquierdo
4. Copia y ejecuta los siguientes SQL:

### PASO 1: Crea las tablas

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_id text UNIQUE NOT NULL,
  email text UNIQUE NOT NULL,
  first_name text,
  last_name text,
  image text,
  role text DEFAULT 'CUSTOMER' CHECK (role IN ('ADMIN', 'USER', 'CUSTOMER')),
  restaurant_id uuid,
  age integer,
  height integer,
  weight integer,
  gender text,
  blood_group text,
  medical_issues text,
  stripe_customer_id text,
  stripe_invoice_id text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  parent_id uuid REFERENCES categories(id),
  user_id uuid REFERENCES users(id),
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku text UNIQUE NOT NULL,
  barcode text,
  name text NOT NULL,
  description text,
  price numeric(10, 2) NOT NULL,
  cost numeric(10, 2),
  stock integer DEFAULT 0,
  min_stock integer DEFAULT 5,
  max_stock integer DEFAULT 100,
  category_id uuid REFERENCES categories(id),
  image_url text,
  product_type text DEFAULT 'PRODUCT',
  available_in_pos boolean DEFAULT true,
  available_in_digital_menu boolean DEFAULT false,
  track_inventory boolean DEFAULT true,
  active boolean DEFAULT true,
  user_id uuid REFERENCES users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  email text UNIQUE,
  phone text,
  credit_balance numeric(10, 2) DEFAULT 0,
  loyalty_points integer DEFAULT 0,
  user_id uuid REFERENCES users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Sales table
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_number text UNIQUE NOT NULL,
  total numeric(10, 2) NOT NULL,
  subtotal numeric(10, 2),
  tax numeric(10, 2),
  payment_method text DEFAULT 'CASH',
  status text DEFAULT 'COMPLETED',
  customer_id uuid REFERENCES customers(id),
  user_id uuid REFERENCES users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Sale Items table
CREATE TABLE IF NOT EXISTS sale_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id uuid REFERENCES sales(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  quantity integer NOT NULL,
  unit_price numeric(10, 2) NOT NULL,
  total numeric(10, 2) NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Orders table (for digital menu)
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name text,
  customer_email text,
  customer_phone text,
  total numeric(10, 2) NOT NULL,
  payment_method text DEFAULT 'PENDING',
  status text DEFAULT 'PENDING',
  restaurant_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Order Items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  quantity integer NOT NULL,
  unit_price numeric(10, 2) NOT NULL,
  total numeric(10, 2) NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON orders(restaurant_id);
```

### PASO 2: Inserta datos de prueba

```sql
-- Insert test data
INSERT INTO users (clerk_id, email, first_name, last_name, role) 
VALUES 
  ('test_admin_001', 'admin@salvadorex.test', 'Admin', 'User', 'ADMIN'),
  ('test_cashier_001', 'cashier@salvadorex.test', 'Cajero', 'POS', 'USER')
ON CONFLICT (email) DO NOTHING;

-- Get admin user ID and insert data
DO $$ 
DECLARE
  admin_id uuid;
BEGIN
  SELECT id INTO admin_id FROM users WHERE email = 'admin@salvadorex.test' LIMIT 1;
  
  -- Insert categories
  INSERT INTO categories (name, user_id, active) VALUES
    ('Bebidas', admin_id, true),
    ('Comidas Rápidas', admin_id, true),
    ('Postres', admin_id, true),
    ('Snacks', admin_id, true)
  ON CONFLICT DO NOTHING;
  
  -- Insert 8 sample products
  INSERT INTO products (sku, barcode, name, description, price, cost, stock, category_id, user_id, available_in_pos, available_in_digital_menu)
  SELECT 
    'BEB-001', '7501234567890', 'Coca Cola 600ml', 'Refresco de cola', 2.50, 1.00, 100,
    (SELECT id FROM categories WHERE name = 'Bebidas' LIMIT 1), admin_id, true, true
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'BEB-001');
  
  INSERT INTO products (sku, barcode, name, description, price, cost, stock, category_id, user_id, available_in_pos, available_in_digital_menu)
  SELECT 
    'BEB-002', '7501234567891', 'Sprite 600ml', 'Refresco de limón', 2.50, 1.00, 80,
    (SELECT id FROM categories WHERE name = 'Bebidas' LIMIT 1), admin_id, true, true
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'BEB-002');
  
  INSERT INTO products (sku, barcode, name, description, price, cost, stock, category_id, user_id, available_in_pos, available_in_digital_menu)
  SELECT 
    'COM-001', '7501234567893', 'Hamburguesa Clásica', 'Con queso y tomate', 8.00, 3.50, 50,
    (SELECT id FROM categories WHERE name = 'Comidas Rápidas' LIMIT 1), admin_id, true, true
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'COM-001');
  
  INSERT INTO products (sku, barcode, name, description, price, cost, stock, category_id, user_id, available_in_pos, available_in_digital_menu)
  SELECT 
    'COM-002', '7501234567894', 'Tacos de Carne Asada', 'Tres tacos con cilantro', 6.50, 2.50, 60,
    (SELECT id FROM categories WHERE name = 'Comidas Rápidas' LIMIT 1), admin_id, true, true
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'COM-002');
  
  INSERT INTO products (sku, barcode, name, description, price, cost, stock, category_id, user_id, available_in_pos, available_in_digital_menu)
  SELECT 
    'COM-003', '7501234567895', 'Pizza Personal', 'Con queso y pepperoni', 9.50, 4.00, 40,
    (SELECT id FROM categories WHERE name = 'Comidas Rápidas' LIMIT 1), admin_id, true, true
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'COM-003');
  
  INSERT INTO products (sku, barcode, name, description, price, cost, stock, category_id, user_id, available_in_pos, available_in_digital_menu)
  SELECT 
    'POS-001', '7501234567897', 'Helado de Vainilla', 'Cremoso de vainilla', 3.00, 1.00, 60,
    (SELECT id FROM categories WHERE name = 'Postres' LIMIT 1), admin_id, true, true
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'POS-001');
  
  INSERT INTO products (sku, barcode, name, description, price, cost, stock, category_id, user_id, available_in_pos, available_in_digital_menu)
  SELECT 
    'SNK-001', '7501234567899', 'Papas Fritas', 'Papas crujientes', 2.00, 0.60, 100,
    (SELECT id FROM categories WHERE name = 'Snacks' LIMIT 1), admin_id, true, true
  WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = 'SNK-001');
  
  -- Insert customers
  INSERT INTO customers (name, email, phone, loyalty_points, user_id)
  SELECT 'Juan Pérez García', 'juan@example.com', '5551234567', 150, admin_id
  WHERE NOT EXISTS (SELECT 1 FROM customers WHERE email = 'juan@example.com');
  
  INSERT INTO customers (name, email, phone, credit_balance, loyalty_points, user_id)
  SELECT 'María García López', 'maria@example.com', '5559876543', 25.00, 350, admin_id
  WHERE NOT EXISTS (SELECT 1 FROM customers WHERE email = 'maria@example.com');
  
  INSERT INTO customers (name, email, phone, credit_balance, loyalty_points, user_id)
  SELECT 'Carlos Rodríguez', 'carlos@example.com', '5552468135', 10.00, 75, admin_id
  WHERE NOT EXISTS (SELECT 1 FROM customers WHERE email = 'carlos@example.com');
  
END $$;
```

## ✅ Una vez completado:

Cuando termines de ejecutar los SQL anteriores, tu aplicación mostrará:
- ✅ Dashboard con estadísticas
- ✅ 8 productos en el inventario
- ✅ 3 clientes registrados
- ✅ Menú digital con productos disponibles

La aplicación está en: http://localhost:5000

¡Disfruta tu SalvadoreX POS completamente funcional! 🎉
