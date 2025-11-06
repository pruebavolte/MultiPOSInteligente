import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import * as schema from "../shared/schema";

// Configure WebSocket for Node.js environment
neonConfig.webSocketConstructor = ws;

async function seed() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set. Please provision a database.");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  console.log("🌱 Seeding database...");

  // Check if data already exists to make seed idempotent
  const existingConfig = await db.select().from(schema.tenantConfig).limit(1);
  if (existingConfig.length > 0) {
    console.log("⚠️  Database already seeded, skipping...");
    await pool.end();
    process.exit(0);
  }

  // Seed categories
  const categories = await db
    .insert(schema.categories)
    .values([
      { name: "Bebidas", parentId: null, active: true },
      { name: "Snacks", parentId: null, active: true },
      { name: "Alimentos", parentId: null, active: true },
    ])
    .returning();

  console.log(`✅ Created ${categories.length} categories`);

  // Seed products
  const products = await db
    .insert(schema.products)
    .values([
      {
        sku: "BEB-001",
        barcode: "7501234567890",
        name: "Coca Cola 600ml",
        description: "Refresco de cola sabor original",
        categoryId: categories[0].id,
        price: "18.00",
        cost: "12.00",
        stock: 50,
        minStock: 10,
        maxStock: 100,
        imageUrl: null,
        active: true,
      },
      {
        sku: "BEB-002",
        barcode: "7501234567891",
        name: "Agua Mineral 1L",
        description: "Agua purificada embotellada",
        categoryId: categories[0].id,
        price: "12.00",
        cost: "8.00",
        stock: 75,
        minStock: 15,
        maxStock: 150,
        imageUrl: null,
        active: true,
      },
      {
        sku: "SNK-001",
        barcode: "7501234567892",
        name: "Sabritas Originales",
        description: "Papas fritas sabor original 45g",
        categoryId: categories[1].id,
        price: "15.00",
        cost: "10.00",
        stock: 30,
        minStock: 10,
        maxStock: 80,
        imageUrl: null,
        active: true,
      },
      {
        sku: "SNK-002",
        barcode: "7501234567893",
        name: "Doritos Nacho",
        description: "Totopos con queso nacho 55g",
        categoryId: categories[1].id,
        price: "16.50",
        cost: "11.00",
        stock: 25,
        minStock: 8,
        maxStock: 60,
        imageUrl: null,
        active: true,
      },
      {
        sku: "ALI-001",
        barcode: "7501234567894",
        name: "Pan Blanco",
        description: "Pan de caja blanco rebanado",
        categoryId: categories[2].id,
        price: "32.00",
        cost: "22.00",
        stock: 20,
        minStock: 5,
        maxStock: 40,
        imageUrl: null,
        active: true,
      },
      {
        sku: "ALI-002",
        barcode: "7501234567895",
        name: "Leche Entera 1L",
        description: "Leche pasteurizada entera",
        categoryId: categories[2].id,
        price: "24.00",
        cost: "18.00",
        stock: 35,
        minStock: 10,
        maxStock: 70,
        imageUrl: null,
        active: true,
      },
    ])
    .returning();

  console.log(`✅ Created ${products.length} products`);

  // Seed customers
  const customers = await db
    .insert(schema.customers)
    .values([
      {
        name: "Cliente General",
        email: null,
        phone: null,
        address: null,
        creditLimit: "0.00",
        creditBalance: "0.00",
        points: 0,
        active: true,
      },
      {
        name: "Juan Pérez",
        email: "juan@example.com",
        phone: "5551234567",
        address: "Calle Principal 123",
        creditLimit: "5000.00",
        creditBalance: "0.00",
        points: 150,
        active: true,
      },
    ])
    .returning();

  console.log(`✅ Created ${customers.length} customers`);

  // Seed tenant config
  const config = await db
    .insert(schema.tenantConfig)
    .values({
      businessName: "Mi Tienda POS",
      domain: "mitienda.pos",
      logoUrl: null,
      primaryColor: "#3b82f6",
      secondaryColor: "#64748b",
      accentColor: "#8b5cf6",
      defaultLanguage: "es",
      defaultCurrency: "MXN",
      taxRate: "16.00",
      active: true,
    })
    .returning();

  console.log(`✅ Created tenant config`);

  console.log("🎉 Database seeded successfully!");

  await pool.end();
  process.exit(0);
}

seed().catch((error) => {
  console.error("❌ Error seeding database:", error);
  process.exit(1);
});
