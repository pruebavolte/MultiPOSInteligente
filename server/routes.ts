import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { detectLanguage, parseVoiceCommand } from "./services/openai";
import { transcribeAudio, synthesizeSpeech } from "./services/elevenlabs";
import { getExchangeRates, convertCurrency } from "./services/exchange-rates";
import { 
  insertProductSchema,
  insertCategorySchema,
  insertCustomerSchema,
  insertTenantConfigSchema,
  type CartItem, 
  type PaymentMethod 
} from "@shared/schema";
import { z } from "zod";

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  // Products endpoints
  app.get("/api/products", async (req, res) => {
    try {
      const products = await storage.getProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      const validatedData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(validatedData);
      res.status(201).json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid product data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create product" });
    }
  });

  app.put("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.updateProduct(req.params.id, req.body);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      res.status(500).json({ error: "Failed to update product" });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteProduct(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete product" });
    }
  });

  // Categories endpoints
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.post("/api/categories", async (req, res) => {
    try {
      const validatedData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(validatedData);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid category data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create category" });
    }
  });

  // Customers endpoints
  app.get("/api/customers", async (req, res) => {
    try {
      const customers = await storage.getCustomers();
      res.json(customers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  app.get("/api/customers/:id", async (req, res) => {
    try {
      const customer = await storage.getCustomer(req.params.id);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customer" });
    }
  });

  app.post("/api/customers", async (req, res) => {
    try {
      const validatedData = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(validatedData);
      res.status(201).json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid customer data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create customer" });
    }
  });

  // Sales endpoints
  app.get("/api/sales", async (req, res) => {
    try {
      const sales = await storage.getSales();
      res.json(sales);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sales" });
    }
  });

  app.post("/api/sales", async (req, res) => {
    try {
      const {
        items,
        paymentMethod,
        customerLanguage,
        customerCurrency,
        exchangeRate,
        customerId,
      }: {
        items: CartItem[];
        paymentMethod: PaymentMethod;
        customerLanguage: string;
        customerCurrency: string;
        exchangeRate: number;
        customerId?: string;
      } = req.body;

      // Calculate totals
      const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
      const tax = subtotal * 0.16;
      const total = subtotal + tax;

      // Generate sale number
      const saleNumber = `SALE-${Date.now()}`;

      // Create sale
      const sale = await storage.createSale({
        saleNumber,
        customerId: customerId || null,
        userId: null,
        subtotal: subtotal.toFixed(2),
        discount: "0.00",
        tax: tax.toFixed(2),
        total: total.toFixed(2),
        paymentMethod,
        status: "completed",
        customerLanguage: customerLanguage || null,
        customerCurrency: customerCurrency || null,
        exchangeRate: exchangeRate?.toFixed(6) || null,
      });

      // Create sale items and update stock
      for (const item of items) {
        await storage.createSaleItem({
          saleId: sale.id,
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.product.price,
          subtotal: item.subtotal.toFixed(2),
          discount: item.discount.toFixed(2),
        });

        // Update product stock
        const product = await storage.getProduct(item.product.id);
        if (product) {
          await storage.updateProduct(item.product.id, {
            stock: product.stock - item.quantity,
          });
        }
      }

      res.status(201).json(sale);
    } catch (error) {
      console.error("Error creating sale:", error);
      res.status(500).json({ error: "Failed to create sale" });
    }
  });

  // Tenant config endpoints
  app.get("/api/config", async (req, res) => {
    try {
      const config = await storage.getConfig();
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch config" });
    }
  });

  app.put("/api/config", async (req, res) => {
    try {
      const validatedData = insertTenantConfigSchema.partial().parse(req.body);
      const config = await storage.updateConfig(validatedData);
      res.json(config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid config data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update config" });
    }
  });

  // Voice endpoints
  app.post("/api/voice/transcribe", upload.single("audio"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      const language = req.body.language || "es";
      const text = await transcribeAudio(req.file.buffer, language);

      res.json({ text });
    } catch (error) {
      console.error("Transcription error:", error);
      res.status(500).json({ error: "Failed to transcribe audio" });
    }
  });

  app.post("/api/voice/process", async (req, res) => {
    try {
      const { transcription, language, products } = req.body;

      const result = await parseVoiceCommand(transcription, language, products);

      res.json(result);
    } catch (error) {
      console.error("Voice processing error:", error);
      res.status(500).json({ error: "Failed to process voice command" });
    }
  });

  app.post("/api/voice/synthesize", async (req, res) => {
    try {
      const { text, language } = req.body;

      if (!text) {
        return res.status(400).json({ error: "No text provided" });
      }

      const audioBuffer = await synthesizeSpeech(text, language || "es");

      res.set("Content-Type", "audio/mpeg");
      res.send(audioBuffer);
    } catch (error) {
      console.error("Speech synthesis error:", error);
      res.status(500).json({ error: "Failed to synthesize speech" });
    }
  });

  // Exchange rate endpoints
  app.get("/api/exchange-rate", async (req, res) => {
    try {
      const from = (req.query.from as string) || "MXN";
      const to = (req.query.to as string) || "USD";
      const amount = parseFloat(req.query.amount as string) || 1;

      const rates = await getExchangeRates(from as any);
      const rate = rates.rates[to as keyof typeof rates.rates];

      res.json({
        from,
        to,
        rate,
        amount,
        converted: amount * rate,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch exchange rate" });
    }
  });

  app.get("/api/exchange-rates", async (req, res) => {
    try {
      const base = (req.query.base as string) || "MXN";
      const rates = await getExchangeRates(base as any);
      res.json(rates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch exchange rates" });
    }
  });

  // Language detection endpoint
  app.post("/api/detect-language", async (req, res) => {
    try {
      const { text } = req.body;

      if (!text) {
        return res.status(400).json({ error: "No text provided" });
      }

      const language = await detectLanguage(text);

      res.json({ language });
    } catch (error) {
      res.status(500).json({ error: "Failed to detect language" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
