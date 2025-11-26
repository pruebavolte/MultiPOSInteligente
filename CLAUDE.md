# CLAUDE.md - AI Assistant Guide for SalvadoreX POS System

> **Last Updated**: 2025-11-21
> **Project**: SalvadoreX - AI-Powered Point of Sale System
> **Version**: 0.1.0

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture Patterns](#architecture-patterns)
4. [Directory Structure](#directory-structure)
5. [Development Workflows](#development-workflows)
6. [Code Conventions](#code-conventions)
7. [Database Management](#database-management)
8. [API Patterns](#api-patterns)
9. [Common Tasks Guide](#common-tasks-guide)
10. [Important Considerations](#important-considerations)

---

## Project Overview

**SalvadoreX** is a production-ready, enterprise-grade Point of Sale (POS) system with cutting-edge AI capabilities. The system features:

- **Traditional POS**: Product catalog, inventory management, sales processing, customer management
- **Voice Ordering**: Revolutionary AI-powered voice agent for hands-free order placement (see `VOICE_ORDER_README.md`)
- **AI Menu Digitalization**: Upload physical menu photos and automatically extract products using AI vision
- **AI Image Generation**: Automatically generate professional food photos for products
- **Multi-language Support**: 6 languages (Spanish, English, Portuguese, German, Japanese, French)
- **Dual Dashboard**: Separate interfaces for staff (`/dashboard/*`) and customers (`/dashboard-user/*`)

### Key Statistics
- 120+ TypeScript files
- 21 API endpoints
- 48 UI components (Shadcn/ui)
- 7 custom hooks
- 12 Supabase migrations
- 6 supported languages
- 5 supported currencies (MXN, USD, BRL, EUR, JPY)

---

## Technology Stack

### Core Framework
- **Next.js 16.0.1** - App Router with React Server Components
- **React 19.2.0** - Latest stable release
- **TypeScript 5.x** - Strict mode enabled

### UI & Styling
- **Tailwind CSS 3.4.1** - Utility-first CSS
- **Shadcn/ui** - Component library (Radix UI primitives)
- **Framer Motion 11.x** - Animations
- **Lucide React** - Icons
- **next-themes** - Dark mode support

### State Management
- **Zustand 4.5.2** - Global state (lightweight)
- **TanStack React Query 5.45.1** - Server state & caching
- **React Hook Form 7.52.0** - Form management
- **Zod 3.23.8** - Schema validation

### Backend & Database
- **Dual Database Architecture**:
  - **Prisma 5.x** + PostgreSQL - Users, orders, health tracking
  - **Supabase** - Products, categories, sales, inventory, storage
- **Hybrid Approach**: Prisma for transactional data, Supabase for operational data

### Authentication
- **Clerk 6.34.5** - Complete auth solution
  - Roles: ADMIN, USER, CUSTOMER
  - Middleware-based route protection

### AI Services
- **OpenRouter API** - AI model routing
  - Default model: `anthropic/claude-3.5-sonnet`
  - Image model: `google/gemini-2.5-flash-image-preview`
- **Eleven Labs** - Voice services (TTS, STT)
- **Google Generative AI** - Additional AI features
- **Web Speech API** - Browser-native speech recognition

### Development Tools
- **pnpm 10.20.0** - Fast package manager (required)
- **ESLint** - Next.js config
- **PostCSS** - CSS processing

---

## Architecture Patterns

### 1. App Router Architecture

```
src/app/
├── (root)/          # Root layout group
├── api/             # API route handlers (server-only)
├── dashboard/       # Staff/admin interface
├── dashboard-user/  # Customer interface
├── login/           # Auth pages
└── signup/
```

**Key Principles**:
- Server Components by default
- `"use client"` directive for interactive components
- File-based routing with nested layouts
- Middleware for authentication (`middleware.ts`)

### 2. Dual Dashboard Pattern

```typescript
// Staff Interface: /dashboard/*
// - Inventory management
// - POS operations
// - Reports & analytics
// - Customer management

// Customer Interface: /dashboard-user/*
// - Digital menu (public shareable)
// - Voice ordering
// - Order history
// - Profile management
```

**Route Protection**:
- Middleware checks Clerk authentication
- Role-based access control
- Public routes: `/dashboard-user/menu` (with restaurantId parameter)

### 3. Dual Database Strategy

```typescript
// Prisma (PostgreSQL) - Transactional Data
// - Users (Clerk integration)
// - Orders & OrderItems
// - Health tracking (Symptoms, Medications, MentalWellness)
// - Messages (chat)

// Supabase (PostgreSQL) - Operational Data
// - Products (multi-channel: POS + Digital Menu)
// - Categories (hierarchical)
// - Sales & SaleItems
// - Customers (credit, loyalty)
// - Inventory tracking
// - Storage (product images)
```

**Why Dual Database?**:
- Flexibility in data access patterns
- Supabase for real-time features & storage
- Prisma for type-safe transactional operations

### 4. Component Architecture

```
src/components/
├── ui/              # Shadcn/ui primitives (48 components)
├── auth/            # Authentication components
├── dashboard/       # Staff dashboard components
├── dashboard-user/  # Customer dashboard components
├── pos/             # Point of Sale components
├── inventory/       # Inventory management
├── customers/       # Customer management
├── menu-digital/    # AI menu digitalization
├── navigation/      # Nav components
├── layout/          # Layout components
└── global/          # Global providers
```

**Pattern**: Atomic design with feature-based grouping

---

## Directory Structure

```
/home/user/pos2/
├── .env.example              # Environment variable template
├── .eslintrc.json            # ESLint configuration
├── .gitignore                # Git ignore rules
├── LICENSE                   # Project license
├── VOICE_ORDER_README.md     # Voice ordering documentation
├── components.json           # Shadcn/ui configuration
├── next.config.mjs           # Next.js configuration
├── package.json              # Dependencies & scripts
├── pnpm-lock.yaml            # pnpm lockfile
├── postcss.config.mjs        # PostCSS configuration
├── tailwind.config.ts        # Tailwind CSS configuration
├── tsconfig.json             # TypeScript configuration
│
├── prisma/
│   └── schema.prisma         # Prisma schema (User, Order, Health models)
│
├── public/                   # Static assets
│   ├── images/               # Image assets
│   └── [icons, fonts, etc.]
│
├── scripts/                  # Utility scripts
│
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── api/              # API routes (21 endpoints)
│   │   ├── dashboard/        # Staff interface
│   │   ├── dashboard-user/   # Customer interface
│   │   ├── login/            # Login page
│   │   ├── signup/           # Signup page
│   │   ├── layout.tsx        # Root layout
│   │   └── page.tsx          # Home page
│   │
│   ├── components/           # React components
│   │   ├── ui/               # Shadcn/ui components
│   │   ├── auth/             # Auth components
│   │   ├── dashboard/        # Dashboard components
│   │   ├── dashboard-user/   # Customer UI
│   │   ├── pos/              # POS components
│   │   ├── inventory/        # Inventory UI
│   │   ├── customers/        # Customer management
│   │   ├── menu-digital/     # AI menu digitalization
│   │   ├── navigation/       # Navigation
│   │   ├── layout/           # Layout components
│   │   └── global/           # Global providers
│   │
│   ├── contexts/             # React contexts
│   │   └── LanguageContext.tsx
│   │
│   ├── hooks/                # Custom hooks
│   │   ├── use-products.ts   # Product CRUD
│   │   ├── use-customers.ts  # Customer management
│   │   ├── use-sales.ts      # Sales & cart logic
│   │   ├── use-voice-orders.ts # Voice ordering
│   │   ├── use-current-user.ts # User auth
│   │   ├── use-category-mutations.ts
│   │   └── use-image-search.ts
│   │
│   ├── lib/                  # Utilities & services
│   │   ├── services/         # Business logic
│   │   ├── supabase/         # Supabase client
│   │   ├── translations/     # i18n files
│   │   └── utils.ts          # Utility functions
│   │
│   ├── styles/               # Global CSS
│   │   └── globals.css
│   │
│   └── types/                # TypeScript types
│       ├── supabase.ts       # Supabase types
│       └── [other types]
│
└── supabase/
    └── migrations/           # 12 SQL migration files
        ├── 001_initial_setup.sql
        ├── 002_categories.sql
        ├── ...
        └── 012_ai_image_generation.sql
```

---

## Development Workflows

### Setup & Installation

```bash
# Clone repository
git clone <repo-url>
cd pos2

# Install dependencies (use pnpm, not npm or yarn)
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Generate Prisma client
npx prisma generate

# Run database migrations (Prisma)
npx prisma migrate dev

# Apply Supabase migrations
# (Use Supabase CLI or dashboard)

# Start development server
pnpm dev
```

### Available Scripts

```bash
pnpm dev          # Start development server (http://localhost:3000)
pnpm build        # Production build
pnpm start        # Start production server
pnpm lint         # Run ESLint
```

### Database Workflows

**Prisma (User & Orders)**:
```bash
npx prisma generate           # Generate Prisma client
npx prisma migrate dev        # Create & apply migration
npx prisma migrate deploy     # Apply migrations (production)
npx prisma studio             # Open Prisma Studio GUI
npx prisma db push            # Push schema without migration (dev only)
```

**Supabase (Products & Sales)**:
```bash
# Migrations are in supabase/migrations/
# Apply via Supabase CLI or dashboard
# RLS policies defined in migration files
```

### Git Workflow

**Branch Naming**:
- Feature branches should start with `claude/`
- Include descriptive names with session IDs
- Example: `claude/claude-md-mi91ynt6qfq9yi32-011Gn9E6kN4tAfgyBT743bqf`

**Commit Guidelines**:
```bash
# Push to feature branch
git add .
git commit -m "Descriptive commit message"
git push -u origin <branch-name>

# Retry on network errors (up to 4 times with exponential backoff)
```

---

## Code Conventions

### File Naming

```
kebab-case for files:      voice-order.tsx
PascalCase for components: VoiceOrder
camelCase for utilities:   getCurrentUser
```

### Import Organization

```typescript
// 1. React imports
import { useState, useEffect } from 'react'

// 2. Third-party libraries
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'

// 3. Local components
import { ProductCard } from '@/components/inventory/product-card'

// 4. Utilities, hooks, types
import { cn } from '@/lib/utils'
import { useProducts } from '@/hooks/use-products'
import type { Product } from '@/types/supabase'
```

### Component Structure

```typescript
"use client" // Add if component uses client features

import { ... }

// Props interface
interface ProductCardProps {
  product: Product
  onSelect?: (product: Product) => void
}

// Component
export function ProductCard({ product, onSelect }: ProductCardProps) {
  // Hooks first
  const [isHovered, setIsHovered] = useState(false)

  // Event handlers
  const handleClick = () => {
    onSelect?.(product)
  }

  // Render
  return (
    <div onClick={handleClick}>
      {/* JSX */}
    </div>
  )
}
```

### TypeScript Guidelines

```typescript
// ✅ DO: Explicit types for function parameters
function calculateTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
}

// ✅ DO: Use Zod for validation
const productSchema = z.object({
  name: z.string().min(1),
  price: z.number().positive(),
})

// ✅ DO: Use type imports for types
import type { Product } from '@/types/supabase'

// ❌ AVOID: Implicit any
function processData(data) { ... } // Bad

// ❌ AVOID: Type assertions without reason
const product = data as Product // Use type guards instead
```

### Path Aliases

```typescript
// tsconfig.json defines: "@/*" → "./src/*"

import { Button } from '@/components/ui/button'
import { useProducts } from '@/hooks/use-products'
import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/types/supabase'
```

### Server vs Client Components

```typescript
// ✅ Server Component (default)
export default async function ProductsPage() {
  const products = await getProducts() // Can use async/await
  return <ProductList products={products} />
}

// ✅ Client Component (interactive)
"use client"
export function ProductCard({ product }: Props) {
  const [count, setCount] = useState(0) // Needs client state
  return <button onClick={() => setCount(count + 1)}>...</button>
}
```

**Use Client Components for**:
- `useState`, `useEffect`, event handlers
- Browser APIs (localStorage, window, etc.)
- Third-party libraries that use client features
- Interactive UI components

**Use Server Components for**:
- Data fetching
- Direct database queries
- Server-only logic
- Static content

---

## Database Management

### Prisma Models (Transactional Data)

**Location**: `prisma/schema.prisma`

```prisma
// Key Models
model User {
  id            String    @id @default(uuid())
  clerkUserId   String    @unique
  email         String    @unique
  role          UserRole  @default(USER)
  orders        Order[]
  // ... health tracking fields
}

model Order {
  id          String      @id @default(uuid())
  userId      String
  user        User        @relation(...)
  items       OrderItem[]
  status      OrderStatus @default(PENDING)
  totalAmount Float
  createdAt   DateTime    @default(now())
}

// Enums
enum UserRole {
  ADMIN
  USER
  CUSTOMER
}

enum OrderStatus {
  PENDING
  PROCESSING
  COMPLETED
  DELIVERED
  CANCELLED
}
```

**Usage Pattern**:
```typescript
import { prisma } from '@/lib/prisma'

// In API routes or Server Components
const orders = await prisma.order.findMany({
  where: { userId },
  include: { items: true },
  orderBy: { createdAt: 'desc' }
})
```

### Supabase Tables (Operational Data)

**Location**: `supabase/migrations/`

**Key Tables**:
```sql
-- products (multi-channel support)
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  cost NUMERIC(10,2),
  stock INTEGER DEFAULT 0,
  min_stock INTEGER DEFAULT 5,
  max_stock INTEGER DEFAULT 100,
  category_id UUID REFERENCES categories(id),
  sku TEXT UNIQUE,
  barcode TEXT,
  image_url TEXT,
  is_pos_available BOOLEAN DEFAULT true,
  is_digital_menu_available BOOLEAN DEFAULT true,
  restaurant_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- categories (hierarchical)
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES categories(id),
  restaurant_id TEXT NOT NULL
);

-- sales
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id),
  total_amount NUMERIC(10,2) NOT NULL,
  discount_amount NUMERIC(10,2) DEFAULT 0,
  payment_method TEXT,
  sale_date TIMESTAMPTZ DEFAULT NOW(),
  restaurant_id TEXT NOT NULL
);

-- customers
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  credit_limit NUMERIC(10,2) DEFAULT 0,
  credit_balance NUMERIC(10,2) DEFAULT 0,
  loyalty_points INTEGER DEFAULT 0,
  restaurant_id TEXT NOT NULL
);
```

**Usage Pattern**:
```typescript
import { supabase } from '@/lib/supabase/client'

// Fetching products
const { data: products, error } = await supabase
  .from('products')
  .select('*, categories(*)')
  .eq('restaurant_id', restaurantId)
  .eq('is_pos_available', true)
  .order('name')

// Inserting sale
const { data: sale, error } = await supabase
  .from('sales')
  .insert({
    customer_id: customerId,
    total_amount: total,
    payment_method: 'cash',
    restaurant_id: restaurantId
  })
  .select()
  .single()
```

### Row Level Security (RLS)

**Supabase tables have RLS policies** for data isolation:
```sql
-- Example: Users can only see their restaurant's products
CREATE POLICY "Users see own restaurant products"
ON products FOR SELECT
USING (restaurant_id = auth.jwt() ->> 'restaurant_id');
```

**Important**: Always filter by `restaurant_id` in queries.

### Storage (Supabase)

**Bucket**: `product-images`

```typescript
// Upload image
const { data, error } = await supabase
  .storage
  .from('product-images')
  .upload(`${restaurantId}/${fileName}`, file)

// Get public URL
const { data: { publicUrl } } = supabase
  .storage
  .from('product-images')
  .getPublicUrl(filePath)
```

---

## API Patterns

### API Route Structure

**Location**: `src/app/api/`

```
api/
├── products/
│   └── route.ts             # GET, POST
├── categories/
│   └── route.ts
├── sales/
│   └── route.ts
├── orders/
│   ├── route.ts
│   └── [id]/
│       └── route.ts         # DELETE
├── ai/
│   ├── extract-menu/
│   │   └── route.ts         # POST (menu digitalization)
│   ├── generate-image/
│   │   └── route.ts         # POST (AI image generation)
│   └── voice-order/
│       └── route.ts         # POST (voice order processing)
└── webhooks/
    └── stripe/
        └── route.ts
```

### API Route Template

```typescript
// src/app/api/products/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase/client'

// GET /api/products
export async function GET(req: NextRequest) {
  try {
    // 1. Authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Get query parameters
    const searchParams = req.nextUrl.searchParams
    const restaurantId = searchParams.get('restaurantId')

    // 3. Fetch data
    const { data, error } = await supabase
      .from('products')
      .select('*, categories(*)')
      .eq('restaurant_id', restaurantId)

    if (error) throw error

    // 4. Return response
    return NextResponse.json({ data, success: true })
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products', success: false },
      { status: 500 }
    )
  }
}

// POST /api/products
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    // Validate with Zod (recommended)
    const validated = productSchema.parse(body)

    const { data, error } = await supabase
      .from('products')
      .insert(validated)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data, success: true }, { status: 201 })
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json(
      { error: 'Failed to create product', success: false },
      { status: 500 }
    )
  }
}
```

### Response Format

**Standard Response**:
```typescript
{
  data: T | null,
  error?: string,
  success: boolean
}
```

### Authentication in API Routes

```typescript
import { auth, currentUser } from '@clerk/nextjs/server'

// Get userId only
const { userId } = await auth()

// Get full user object
const user = await currentUser()
```

### AI API Patterns

**OpenRouter Integration**:
```typescript
// src/app/api/ai/voice-order/route.ts
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ]
  })
})

const data = await response.json()
const aiResponse = data.choices[0].message.content
```

**Streaming Response** (for long operations):
```typescript
// Use ReadableStream for streaming
const encoder = new TextEncoder()
const stream = new ReadableStream({
  async start(controller) {
    controller.enqueue(encoder.encode('Processing...\n'))
    // ... processing logic
    controller.close()
  }
})

return new Response(stream, {
  headers: { 'Content-Type': 'text/plain' }
})
```

---

## Common Tasks Guide

### 1. Adding a New Product

```typescript
// Using the custom hook (client-side)
import { useProducts } from '@/hooks/use-products'

function MyComponent() {
  const { createProduct } = useProducts(restaurantId)

  const handleSubmit = async (data: ProductFormData) => {
    await createProduct.mutateAsync({
      name: data.name,
      price: data.price,
      category_id: data.categoryId,
      stock: data.stock,
      restaurant_id: restaurantId
    })
  }
}

// Direct API call (server-side)
const { data } = await supabase
  .from('products')
  .insert({
    name: 'New Product',
    price: 10.99,
    restaurant_id: restaurantId,
    is_pos_available: true
  })
  .select()
  .single()
```

### 2. Creating a Sale (POS Checkout)

```typescript
// Using the custom hook
import { useSales } from '@/hooks/use-sales'

function POSCheckout() {
  const { createSale } = useSales(restaurantId)

  const handleCheckout = async () => {
    await createSale.mutateAsync({
      items: cartItems.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price
      })),
      customer_id: selectedCustomer?.id,
      payment_method: 'cash',
      discount_amount: discountAmount
    })
  }
}
```

### 3. Voice Order Processing

```typescript
// The voice order flow is complex - see VOICE_ORDER_README.md
// Quick overview:

// 1. User speaks → Web Speech API captures audio
// 2. Transcript sent to /api/ai/voice-order
// 3. Claude processes natural language
// 4. AI responds with products to add
// 5. Frontend updates cart automatically
// 6. AI response read aloud via Eleven Labs TTS

// Usage in component:
import { useVoiceOrders } from '@/hooks/use-voice-orders'

function VoiceOrder() {
  const {
    isListening,
    startListening,
    stopListening,
    transcript,
    aiResponse
  } = useVoiceOrders({ restaurantId, products })

  return (
    <button onClick={isListening ? stopListening : startListening}>
      {isListening ? 'Stop' : 'Start'} Voice Order
    </button>
  )
}
```

### 4. AI Menu Digitalization

```typescript
// Upload menu image and extract products
async function digitizeMenu(imageFile: File, restaurantId: string) {
  const formData = new FormData()
  formData.append('image', imageFile)
  formData.append('restaurantId', restaurantId)
  formData.append('generateImages', 'true') // Optional AI images

  const response = await fetch('/api/ai/extract-menu', {
    method: 'POST',
    body: formData
  })

  // Response includes extracted products with AI-generated images
  const { products } = await response.json()

  // Import to database
  for (const product of products) {
    await supabase.from('products').insert(product)
  }
}
```

### 5. Managing Inventory

```typescript
// Update stock levels
async function updateStock(productId: string, newStock: number) {
  const { error } = await supabase
    .from('products')
    .update({ stock: newStock })
    .eq('id', productId)

  if (error) throw error
}

// Get low stock alerts
const { data: lowStockProducts } = await supabase
  .from('products')
  .select('*')
  .lt('stock', supabase.raw('min_stock'))
  .eq('restaurant_id', restaurantId)
```

### 6. Customer Management

```typescript
// Create customer with credit
const { data: customer } = await supabase
  .from('customers')
  .insert({
    name: 'John Doe',
    phone: '555-1234',
    credit_limit: 1000,
    credit_balance: 0,
    restaurant_id: restaurantId
  })
  .select()
  .single()

// Update credit balance after sale
await supabase
  .from('customers')
  .update({
    credit_balance: customer.credit_balance + saleTotal
  })
  .eq('id', customer.id)
```

### 7. Adding a New UI Component

```bash
# Use Shadcn CLI to add components
npx shadcn@latest add button
npx shadcn@latest add dialog
npx shadcn@latest add form

# Components are added to src/components/ui/
```

### 8. Creating a Custom Hook

```typescript
// src/hooks/use-my-feature.ts
import { useQuery, useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'

export function useMyFeature(restaurantId: string) {
  // Fetch data
  const query = useQuery({
    queryKey: ['my-feature', restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('my_table')
        .select('*')
        .eq('restaurant_id', restaurantId)

      if (error) throw error
      return data
    }
  })

  // Mutation
  const createItem = useMutation({
    mutationFn: async (newItem: NewItem) => {
      const { data, error } = await supabase
        .from('my_table')
        .insert(newItem)
        .select()
        .single()

      if (error) throw error
      return data
    }
  })

  return {
    data: query.data,
    isLoading: query.isLoading,
    createItem
  }
}
```

### 9. Internationalization

```typescript
// Using LanguageContext
import { useLanguage } from '@/contexts/LanguageContext'

function MyComponent() {
  const { t, language, setLanguage } = useLanguage()

  return (
    <div>
      <h1>{t('dashboard.welcome')}</h1>
      <button onClick={() => setLanguage('es')}>
        Español
      </button>
    </div>
  )
}

// Adding translations
// src/lib/translations/es.ts
export const es = {
  dashboard: {
    welcome: 'Bienvenido'
  }
}
```

### 10. Implementing Dark Mode

```typescript
// Already configured with next-themes
import { useTheme } from 'next-themes'

function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      Toggle Theme
    </button>
  )
}
```

---

## Important Considerations

### 1. Authentication & Authorization

**Always check authentication in API routes**:
```typescript
const { userId } = await auth()
if (!userId) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

**Role-based access**:
```typescript
const user = await currentUser()
const role = user?.publicMetadata?.role

if (role !== 'ADMIN') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

### 2. Restaurant Isolation

**Always filter by `restaurant_id`**:
```typescript
// ✅ DO
const products = await supabase
  .from('products')
  .select('*')
  .eq('restaurant_id', restaurantId)

// ❌ DON'T - exposes all restaurants' data
const products = await supabase
  .from('products')
  .select('*')
```

### 3. Error Handling

**Client-side**:
```typescript
import { toast } from 'sonner'

try {
  await createProduct.mutateAsync(data)
  toast.success('Product created successfully')
} catch (error) {
  console.error(error)
  toast.error('Failed to create product')
}
```

**Server-side**:
```typescript
try {
  // ... operation
} catch (error) {
  console.error('Detailed error:', error)
  return NextResponse.json(
    { error: 'User-friendly message', success: false },
    { status: 500 }
  )
}
```

### 4. Environment Variables

**Required variables** (see `.env.example`):
```bash
# Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# Database
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://...

# AI Services
OPENROUTER_API_KEY=sk-...
ELEVENLABS_API_KEY=...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Never commit `.env` files**!

### 5. Image Handling

**Upload to Supabase Storage**:
```typescript
// 1. Upload file
const fileName = `${Date.now()}-${file.name}`
const { error: uploadError } = await supabase
  .storage
  .from('product-images')
  .upload(`${restaurantId}/${fileName}`, file)

// 2. Get public URL
const { data: { publicUrl } } = supabase
  .storage
  .from('product-images')
  .getPublicUrl(`${restaurantId}/${fileName}`)

// 3. Save URL to product
await supabase
  .from('products')
  .update({ image_url: publicUrl })
  .eq('id', productId)
```

**Use Next.js Image component**:
```typescript
import Image from 'next/image'

<Image
  src={product.image_url || '/placeholder.png'}
  alt={product.name}
  width={300}
  height={300}
  className="object-cover"
/>
```

### 6. Performance Optimization

**Use React Query caching**:
```typescript
const { data: products } = useQuery({
  queryKey: ['products', restaurantId],
  queryFn: fetchProducts,
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 10 * 60 * 1000    // 10 minutes (formerly cacheTime)
})
```

**Optimize imports**:
```typescript
// ✅ DO - tree-shakeable
import { Button } from '@/components/ui/button'

// ❌ AVOID - imports entire module
import * as Components from '@/components/ui'
```

**Use dynamic imports for heavy components**:
```typescript
import dynamic from 'next/dynamic'

const VoiceOrder = dynamic(
  () => import('@/components/pos/voice-order'),
  { ssr: false, loading: () => <LoadingSpinner /> }
)
```

### 7. Security Best Practices

**Never expose API keys in client**:
```typescript
// ✅ DO - server-side only
// src/app/api/ai/voice-order/route.ts
const apiKey = process.env.OPENROUTER_API_KEY

// ❌ NEVER - client-side exposure
const apiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY
```

**Validate all inputs**:
```typescript
import { z } from 'zod'

const productSchema = z.object({
  name: z.string().min(1).max(200),
  price: z.number().positive(),
  stock: z.number().int().min(0)
})

// In API route
const validated = productSchema.parse(await req.json())
```

**Prevent SQL injection** (handled by Prisma/Supabase, but be aware):
```typescript
// ✅ DO - parameterized queries (automatic with Prisma/Supabase)
const products = await supabase
  .from('products')
  .select('*')
  .eq('name', userInput)

// ❌ NEVER - raw SQL with string concatenation
// (Supabase doesn't allow this by default, but be aware)
```

### 8. Testing Considerations

**Test API routes**:
```bash
# Use curl or Postman
curl http://localhost:3000/api/products?restaurantId=test-123
```

**Test authentication**:
- Use Clerk's test mode
- Create test users with different roles
- Test role-based access

### 9. Deployment Checklist

- [ ] Environment variables configured
- [ ] Prisma migrations applied
- [ ] Supabase migrations applied
- [ ] Clerk authentication configured
- [ ] Supabase RLS policies enabled
- [ ] API keys for OpenRouter & Eleven Labs
- [ ] Product images bucket created
- [ ] Build succeeds (`pnpm build`)
- [ ] No TypeScript errors

### 10. Common Pitfalls

**❌ Using npm/yarn instead of pnpm**:
```bash
# ❌ DON'T
npm install

# ✅ DO
pnpm install
```

**❌ Forgetting to filter by restaurant_id**:
```typescript
// This will return ALL products across ALL restaurants
const products = await supabase.from('products').select('*')
```

**❌ Not handling errors**:
```typescript
// Always check for errors
const { data, error } = await supabase.from('products').select('*')
if (error) {
  console.error(error)
  // Handle error appropriately
}
```

**❌ Exposing sensitive data**:
```typescript
// Never return full user objects or API keys to client
return NextResponse.json({ user, apiKey }) // BAD
```

**❌ Using client components unnecessarily**:
```typescript
// If it doesn't need interactivity, keep it as server component
"use client" // Remove if not needed
```

---

## Additional Resources

### Documentation
- **Voice Ordering**: See `VOICE_ORDER_README.md` for comprehensive guide
- **Next.js**: https://nextjs.org/docs
- **Prisma**: https://www.prisma.io/docs
- **Supabase**: https://supabase.com/docs
- **Clerk**: https://clerk.com/docs
- **Shadcn/ui**: https://ui.shadcn.com
- **TanStack Query**: https://tanstack.com/query/latest

### Key Files to Reference
- `src/hooks/use-products.ts` - Product CRUD patterns
- `src/hooks/use-sales.ts` - Sales & cart logic
- `src/hooks/use-voice-orders.ts` - Voice ordering implementation
- `src/app/api/ai/extract-menu/route.ts` - AI menu digitalization
- `src/components/pos/voice-order.tsx` - Voice UI component
- `prisma/schema.prisma` - Database schema (Prisma)
- `supabase/migrations/` - Database schema (Supabase)

### Support
- For bugs or feature requests, create an issue in the repository
- Review recent commits for implementation examples
- Check console logs for detailed error messages

---

## Summary

**SalvadoreX** is a modern, AI-powered POS system built with Next.js 16, React 19, TypeScript, and a dual-database architecture (Prisma + Supabase). The system features traditional POS capabilities enhanced with revolutionary AI features:

- **Voice Ordering**: Hands-free, conversational ordering using Claude 3.5 Sonnet
- **AI Menu Digitalization**: Upload menu photos and automatically extract products
- **AI Image Generation**: Generate professional product photos with Gemini 2.5 Flash

The codebase follows modern best practices with Server Components, React Query for state management, Clerk for authentication, and a clean, maintainable architecture.

**When working on this codebase**:
1. Always authenticate API routes with Clerk
2. Filter all queries by `restaurant_id`
3. Use the custom hooks for data operations
4. Follow the established patterns in existing code
5. Test thoroughly before deploying
6. Keep security and performance in mind

Happy coding! 🚀
