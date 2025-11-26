const { Client } = require('pg');

const connectionString = 'postgresql://postgres:PvLAERI2878291.$#@db.zhvwmzkcqngcaqpdxtwr.supabase.co:5432/postgres';

async function setupDatabase() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    console.log('Connecting to Supabase PostgreSQL...');
    await client.connect();
    console.log('Connected successfully!');

    // Create tables
    const createTablesSQL = `
      -- 1. Users table
      CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        clerk_id text UNIQUE NOT NULL,
        email text UNIQUE NOT NULL,
        first_name text,
        last_name text,
        image text,
        role text DEFAULT 'CUSTOMER',
        restaurant_id uuid,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );

      -- 2. Categories table
      CREATE TABLE IF NOT EXISTS categories (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        parent_id uuid REFERENCES categories(id),
        user_id uuid REFERENCES users(id),
        active boolean DEFAULT true,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );

      -- 3. Products table
      CREATE TABLE IF NOT EXISTS products (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        sku text UNIQUE NOT NULL,
        barcode text,
        name text NOT NULL,
        description text,
        price numeric(10,2) NOT NULL,
        cost numeric(10,2),
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
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );

      -- 4. Product Variants table
      CREATE TABLE IF NOT EXISTS product_variants (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id uuid REFERENCES products(id) ON DELETE CASCADE,
        name text NOT NULL,
        variant_type text DEFAULT 'SIZE',
        price_modifier numeric(10,2) DEFAULT 0,
        is_default boolean DEFAULT false,
        active boolean DEFAULT true,
        created_at timestamptz DEFAULT now()
      );

      -- 5. Customers table
      CREATE TABLE IF NOT EXISTS customers (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        email text,
        phone text,
        credit_balance numeric(10,2) DEFAULT 0,
        loyalty_points integer DEFAULT 0,
        user_id uuid REFERENCES users(id),
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );

      -- 6. Sales table
      CREATE TABLE IF NOT EXISTS sales (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        sale_number text UNIQUE NOT NULL,
        total numeric(10,2) NOT NULL,
        subtotal numeric(10,2),
        tax numeric(10,2),
        discount numeric(10,2) DEFAULT 0,
        payment_method text DEFAULT 'CASH',
        status text DEFAULT 'COMPLETED',
        notes text,
        customer_id uuid REFERENCES customers(id),
        user_id uuid REFERENCES users(id),
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );

      -- 7. Sale Items table
      CREATE TABLE IF NOT EXISTS sale_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        sale_id uuid REFERENCES sales(id) ON DELETE CASCADE,
        product_id uuid REFERENCES products(id),
        variant_id uuid REFERENCES product_variants(id),
        quantity integer NOT NULL,
        unit_price numeric(10,2) NOT NULL,
        total numeric(10,2) NOT NULL,
        notes text,
        created_at timestamptz DEFAULT now()
      );

      -- 8. Orders table (for digital menu)
      CREATE TABLE IF NOT EXISTS orders (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        order_number text,
        customer_name text,
        customer_email text,
        customer_phone text,
        total numeric(10,2) NOT NULL,
        subtotal numeric(10,2),
        tax numeric(10,2),
        payment_method text DEFAULT 'PENDING',
        status text DEFAULT 'PENDING',
        notes text,
        restaurant_id uuid,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );

      -- 9. Order Items table
      CREATE TABLE IF NOT EXISTS order_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
        product_id uuid REFERENCES products(id),
        variant_id uuid REFERENCES product_variants(id),
        quantity integer NOT NULL,
        unit_price numeric(10,2) NOT NULL,
        total numeric(10,2) NOT NULL,
        notes text,
        created_at timestamptz DEFAULT now()
      );

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
      CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
      CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
      CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
      CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);
      CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);
      CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
      CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON orders(restaurant_id);
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    `;

    console.log('Creating tables...');
    await client.query(createTablesSQL);
    console.log('Tables created successfully!');

    // Verify tables
    const verifyResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log('Tables in database:', verifyResult.rows.map(r => r.table_name));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

setupDatabase();
