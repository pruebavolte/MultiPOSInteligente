import {
  type Product,
  type InsertProduct,
  type Category,
  type InsertCategory,
  type Customer,
  type InsertCustomer,
  type Sale,
  type InsertSale,
  type SaleItem,
  type InsertSaleItem,
  type TenantConfig,
  type InsertTenantConfig,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Products
  getProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<boolean>;

  // Categories
  getCategories(): Promise<Category[]>;
  getCategory(id: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;

  // Customers
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined>;

  // Sales
  getSales(): Promise<Sale[]>;
  getSale(id: string): Promise<Sale | undefined>;
  createSale(sale: InsertSale): Promise<Sale>;
  getSaleItems(saleId: string): Promise<SaleItem[]>;
  createSaleItem(item: InsertSaleItem): Promise<SaleItem>;

  // Tenant Config
  getConfig(): Promise<TenantConfig | undefined>;
  updateConfig(config: Partial<InsertTenantConfig>): Promise<TenantConfig>;
}

export class MemStorage implements IStorage {
  private products: Map<string, Product>;
  private categories: Map<string, Category>;
  private customers: Map<string, Customer>;
  private sales: Map<string, Sale>;
  private saleItems: Map<string, SaleItem>;
  private config: TenantConfig | undefined;

  constructor() {
    this.products = new Map();
    this.categories = new Map();
    this.customers = new Map();
    this.sales = new Map();
    this.saleItems = new Map();
    this.seedData();
  }

  private seedData() {
    // Seed default config
    this.config = {
      id: randomUUID(),
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
      createdAt: new Date(),
    };

    // Seed categories
    const categories: Category[] = [
      {
        id: randomUUID(),
        name: "Bebidas",
        parentId: null,
        active: true,
      },
      {
        id: randomUUID(),
        name: "Snacks",
        parentId: null,
        active: true,
      },
      {
        id: randomUUID(),
        name: "Alimentos",
        parentId: null,
        active: true,
      },
    ];

    categories.forEach((cat) => this.categories.set(cat.id, cat));

    // Seed products
    const products: Product[] = [
      {
        id: randomUUID(),
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
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: randomUUID(),
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
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: randomUUID(),
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
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: randomUUID(),
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
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: randomUUID(),
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
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: randomUUID(),
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
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    products.forEach((prod) => this.products.set(prod.id, prod));

    // Seed customers
    const customers: Customer[] = [
      {
        id: randomUUID(),
        name: "Cliente General",
        email: null,
        phone: null,
        address: null,
        creditLimit: "0.00",
        creditBalance: "0.00",
        points: 0,
        active: true,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "Juan Pérez",
        email: "juan@example.com",
        phone: "5551234567",
        address: "Calle Principal 123",
        creditLimit: "5000.00",
        creditBalance: "0.00",
        points: 150,
        active: true,
        createdAt: new Date(),
      },
    ];

    customers.forEach((cust) => this.customers.set(cust.id, cust));
  }

  // Products
  async getProducts(): Promise<Product[]> {
    return Array.from(this.products.values());
  }

  async getProduct(id: string): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const id = randomUUID();
    const product: Product = {
      ...insertProduct,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.products.set(id, product);
    return product;
  }

  async updateProduct(id: string, updates: Partial<InsertProduct>): Promise<Product | undefined> {
    const product = this.products.get(id);
    if (!product) return undefined;

    const updated = {
      ...product,
      ...updates,
      updatedAt: new Date(),
    };
    this.products.set(id, updated);
    return updated;
  }

  async deleteProduct(id: string): Promise<boolean> {
    return this.products.delete(id);
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    return Array.from(this.categories.values());
  }

  async getCategory(id: string): Promise<Category | undefined> {
    return this.categories.get(id);
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const id = randomUUID();
    const category: Category = {
      ...insertCategory,
      id,
    };
    this.categories.set(id, category);
    return category;
  }

  // Customers
  async getCustomers(): Promise<Customer[]> {
    return Array.from(this.customers.values());
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    return this.customers.get(id);
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const id = randomUUID();
    const customer: Customer = {
      ...insertCustomer,
      id,
      createdAt: new Date(),
    };
    this.customers.set(id, customer);
    return customer;
  }

  async updateCustomer(id: string, updates: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const customer = this.customers.get(id);
    if (!customer) return undefined;

    const updated = { ...customer, ...updates };
    this.customers.set(id, updated);
    return updated;
  }

  // Sales
  async getSales(): Promise<Sale[]> {
    return Array.from(this.sales.values());
  }

  async getSale(id: string): Promise<Sale | undefined> {
    return this.sales.get(id);
  }

  async createSale(insertSale: InsertSale): Promise<Sale> {
    const id = randomUUID();
    const sale: Sale = {
      ...insertSale,
      id,
      createdAt: new Date(),
    };
    this.sales.set(id, sale);
    return sale;
  }

  async getSaleItems(saleId: string): Promise<SaleItem[]> {
    return Array.from(this.saleItems.values()).filter((item) => item.saleId === saleId);
  }

  async createSaleItem(insertItem: InsertSaleItem): Promise<SaleItem> {
    const id = randomUUID();
    const item: SaleItem = {
      ...insertItem,
      id,
    };
    this.saleItems.set(id, item);
    return item;
  }

  // Tenant Config
  async getConfig(): Promise<TenantConfig | undefined> {
    return this.config;
  }

  async updateConfig(updates: Partial<InsertTenantConfig>): Promise<TenantConfig> {
    if (!this.config) {
      this.config = {
        id: randomUUID(),
        businessName: updates.businessName || "Sistema POS",
        domain: updates.domain || "pos.local",
        logoUrl: updates.logoUrl || null,
        primaryColor: updates.primaryColor || "#3b82f6",
        secondaryColor: updates.secondaryColor || "#64748b",
        accentColor: updates.accentColor || "#8b5cf6",
        defaultLanguage: updates.defaultLanguage || "es",
        defaultCurrency: updates.defaultCurrency || "MXN",
        taxRate: updates.taxRate || "16.00",
        active: true,
        createdAt: new Date(),
      };
    } else {
      this.config = { ...this.config, ...updates };
    }
    return this.config;
  }
}

export const storage = new MemStorage();
