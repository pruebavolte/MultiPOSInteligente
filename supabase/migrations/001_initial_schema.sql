-- Crear enums
CREATE TYPE user_role AS ENUM ('ADMIN', 'USER', 'CUSTOMER');
CREATE TYPE order_status AS ENUM ('PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED');
CREATE TYPE message_role AS ENUM ('user', 'model');
CREATE TYPE frequency AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'RARELY');
CREATE TYPE symptom_name AS ENUM ('HEADACHE', 'NAUSEA', 'VOMITING', 'DIARRHEA', 'FATIGUE', 'DIZZINESS', 'INSOMNIA', 'CONSTIPATION', 'MUSCLE_PAIN', 'JOINT_PAIN', 'OTHER');
CREATE TYPE adherence AS ENUM ('ALWAYS', 'OFTEN', 'SOMETIMES', 'NEVER', 'RARELY');
CREATE TYPE mood AS ENUM ('HAPPY', 'SAD', 'ANGRY', 'ANXIOUS', 'STRESSED', 'NEUTRAL');
CREATE TYPE sleep AS ENUM ('GOOD', 'BAD', 'AVERAGE');
CREATE TYPE stress AS ENUM ('NOT_STRESSED', 'SLIGHTLY', 'MODERATELY', 'HIGHLY', 'EXTREMELY');

-- Tabla de usuarios
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  image TEXT,
  role user_role DEFAULT 'USER' NOT NULL,
  age INTEGER,
  height INTEGER,
  weight INTEGER,
  gender TEXT,
  blood_group TEXT,
  medical_issues TEXT,
  stripe_customer_id TEXT,
  stripe_invoice_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Tabla de órdenes
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status order_status DEFAULT 'PENDING' NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'MXN' NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Tabla de items de orden
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'MXN' NOT NULL,
  image_url TEXT
);

-- Índices
CREATE INDEX idx_users_clerk_id ON users(clerk_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- Función updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can do anything on users" ON users FOR ALL USING (true);
CREATE POLICY "Service role can do anything on orders" ON orders FOR ALL USING (true);
CREATE POLICY "Service role can do anything on order_items" ON order_items FOR ALL USING (true);
