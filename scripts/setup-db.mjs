import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zhvwmzkcqngcaqpdxtwr.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpodndtemtjcW5nY2FxcGR4dHdyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDE2NzAxOCwiZXhwIjoyMDc5NzQzMDE4fQ.rvPkcyE7Cu1BzAhM_GdZjmqXvQe67gIpPaI7tLESD-Q';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function setupDatabase() {
  console.log('Setting up database...');

  // Create admin user
  const { data: adminUser, error: userError } = await supabase
    .from('users')
    .upsert([{
      clerk_id: 'test_admin_001',
      email: 'admin@salvadorex.test',
      first_name: 'Admin',
      last_name: 'Usuario',
      role: 'ADMIN'
    }], { onConflict: 'email' })
    .select()
    .single();

  if (userError) {
    console.error('User error:', userError);
    return;
  }

  console.log('Admin user created:', adminUser.email);

  // Create categories
  const categories = [
    { name: 'Bebidas', user_id: adminUser.id, active: true },
    { name: 'Comidas Rapidas', user_id: adminUser.id, active: true },
    { name: 'Postres', user_id: adminUser.id, active: true },
    { name: 'Snacks', user_id: adminUser.id, active: true },
    { name: 'Entradas', user_id: adminUser.id, active: true }
  ];

  for (const cat of categories) {
    await supabase.from('categories').upsert([cat], { onConflict: 'name', ignoreDuplicates: true });
  }
  console.log('Categories created');

  // Get categories
  const { data: allCats } = await supabase.from('categories').select('*');
  const bevCat = allCats?.find(c => c.name === 'Bebidas');
  const foodCat = allCats?.find(c => c.name === 'Comidas Rapidas');
  const dessertCat = allCats?.find(c => c.name === 'Postres');
  const snackCat = allCats?.find(c => c.name === 'Snacks');
  const entradaCat = allCats?.find(c => c.name === 'Entradas');

  // Create products
  const products = [
    { sku: 'BEB-001', name: 'Coca Cola 600ml', price: 2.50, cost: 1.00, stock: 100, category_id: bevCat?.id, user_id: adminUser.id, available_in_pos: true, available_in_digital_menu: true },
    { sku: 'BEB-002', name: 'Sprite 600ml', price: 2.50, cost: 1.00, stock: 80, category_id: bevCat?.id, user_id: adminUser.id, available_in_pos: true, available_in_digital_menu: true },
    { sku: 'COM-001', name: 'Hamburguesa Clasica', price: 8.00, cost: 3.50, stock: 50, category_id: foodCat?.id, user_id: adminUser.id, available_in_pos: true, available_in_digital_menu: true },
    { sku: 'COM-002', name: 'Tacos de Carne Asada (3)', price: 6.50, cost: 2.50, stock: 60, category_id: foodCat?.id, user_id: adminUser.id, available_in_pos: true, available_in_digital_menu: true },
    { sku: 'POS-001', name: 'Helado de Vainilla', price: 3.00, cost: 1.00, stock: 60, category_id: dessertCat?.id, user_id: adminUser.id, available_in_pos: true, available_in_digital_menu: true },
    { sku: 'SNK-001', name: 'Papas Fritas', price: 2.50, cost: 0.80, stock: 100, category_id: snackCat?.id, user_id: adminUser.id, available_in_pos: true, available_in_digital_menu: true },
    { sku: 'ENT-001', name: 'Ensalada Cesar', price: 6.00, cost: 2.20, stock: 35, category_id: entradaCat?.id, user_id: adminUser.id, available_in_pos: true, available_in_digital_menu: true },
  ];

  for (const prod of products) {
    await supabase.from('products').upsert([prod], { onConflict: 'sku', ignoreDuplicates: true });
  }
  console.log('Products created');

  // Create customers
  const customers = [
    { name: 'Juan Perez', email: 'juan@example.com', phone: '5551234567', loyalty_points: 150, user_id: adminUser.id },
    { name: 'Maria Garcia', email: 'maria@example.com', phone: '5559876543', credit_balance: 25.00, loyalty_points: 350, user_id: adminUser.id },
  ];

  for (const cust of customers) {
    await supabase.from('customers').upsert([cust], { onConflict: 'email', ignoreDuplicates: true });
  }
  console.log('Customers created');

  console.log('Database setup complete!');
}

setupDatabase().catch(console.error);
