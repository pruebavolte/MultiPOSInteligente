import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, boolean, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Categories Table
export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  parentId: varchar("parent_id").references((): any => categories.id),
  active: boolean("active").notNull().default(true),
});

// Products Table
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sku: text("sku").notNull().unique(),
  barcode: text("barcode").unique(),
  name: text("name").notNull(),
  description: text("description"),
  categoryId: varchar("category_id").references(() => categories.id),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  cost: decimal("cost", { precision: 10, scale: 2 }).notNull(),
  stock: integer("stock").notNull().default(0),
  minStock: integer("min_stock").notNull().default(0),
  maxStock: integer("max_stock").notNull().default(1000),
  imageUrl: text("image_url"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Customers Table
export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").unique(),
  phone: text("phone"),
  address: text("address"),
  creditLimit: decimal("credit_limit", { precision: 10, scale: 2 }).notNull().default("0"),
  creditBalance: decimal("credit_balance", { precision: 10, scale: 2 }).notNull().default("0"),
  points: integer("points").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Sales Table
export const sales = pgTable("sales", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  saleNumber: text("sale_number").notNull().unique(),
  customerId: varchar("customer_id").references(() => customers.id),
  userId: varchar("user_id"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 10, scale: 2 }).notNull().default("0"),
  tax: decimal("tax", { precision: 10, scale: 2 }).notNull().default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull(),
  status: text("status").notNull().default("completed"),
  customerLanguage: text("customer_language"),
  customerCurrency: text("customer_currency"),
  exchangeRate: decimal("exchange_rate", { precision: 10, scale: 6 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Sale Items Table
export const saleItems = pgTable("sale_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  saleId: varchar("sale_id").notNull().references(() => sales.id),
  productId: varchar("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 10, scale: 2 }).notNull().default("0"),
});

// Tenant Configuration Table (White Label)
export const tenantConfig = pgTable("tenant_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessName: text("business_name").notNull(),
  domain: text("domain").notNull().unique(),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color").notNull().default("#3b82f6"),
  secondaryColor: text("secondary_color").notNull().default("#64748b"),
  accentColor: text("accent_color").notNull().default("#8b5cf6"),
  defaultLanguage: text("default_language").notNull().default("es"),
  defaultCurrency: text("default_currency").notNull().default("MXN"),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).notNull().default("16"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Insert Schemas
export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
});

export const insertSaleSchema = createInsertSchema(sales).omit({
  id: true,
  createdAt: true,
});

export const insertSaleItemSchema = createInsertSchema(saleItems).omit({
  id: true,
});

export const insertTenantConfigSchema = createInsertSchema(tenantConfig).omit({
  id: true,
  createdAt: true,
});

// Types
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

export type Sale = typeof sales.$inferSelect;
export type InsertSale = z.infer<typeof insertSaleSchema>;

export type SaleItem = typeof saleItems.$inferSelect;
export type InsertSaleItem = z.infer<typeof insertSaleItemSchema>;

export type TenantConfig = typeof tenantConfig.$inferSelect;
export type InsertTenantConfig = z.infer<typeof insertTenantConfigSchema>;

// Cart Item (Frontend only)
export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  subtotal: number;
  discount: number;
}

// Supported Languages
export const SUPPORTED_LANGUAGES = {
  es: { name: "Español", flag: "🇪🇸" },
  en: { name: "English", flag: "🇺🇸" },
  fr: { name: "Français", flag: "🇫🇷" },
  de: { name: "Deutsch", flag: "🇩🇪" },
  zh: { name: "中文", flag: "🇨🇳" },
  ja: { name: "日本語", flag: "🇯🇵" },
} as const;

export type LanguageCode = keyof typeof SUPPORTED_LANGUAGES;

// Supported Currencies
export const SUPPORTED_CURRENCIES = {
  MXN: { name: "Peso Mexicano", symbol: "$" },
  USD: { name: "US Dollar", symbol: "$" },
  EUR: { name: "Euro", symbol: "€" },
  GBP: { name: "British Pound", symbol: "£" },
  CNY: { name: "Chinese Yuan", symbol: "¥" },
  JPY: { name: "Japanese Yen", symbol: "¥" },
} as const;

export type CurrencyCode = keyof typeof SUPPORTED_CURRENCIES;

// Payment Methods
export const PAYMENT_METHODS = {
  cash: "Efectivo / Cash",
  card: "Tarjeta / Card",
  transfer: "Transferencia / Transfer",
  credit: "Crédito / Credit",
} as const;

export type PaymentMethod = keyof typeof PAYMENT_METHODS;

// Voice Command Types
export interface VoiceCommand {
  type: "add" | "remove" | "change" | "search" | "total" | "complete" | "cancel";
  productName?: string;
  quantity?: number;
}

// Exchange Rate Response
export interface ExchangeRate {
  base: CurrencyCode;
  rates: Record<CurrencyCode, number>;
  timestamp: number;
}
