# SalvadoreX POS System

## Overview

SalvadoreX es un enterprise-grade Point of Sale (POS) system con capacidades AI-powered. La aplicación está construida con Next.js 16, React 19, TypeScript, y utiliza Supabase como base de datos principal.

**Status**: ✅ Base de datos configurada y poblada con datos de prueba
**Last Updated**: 2025-12-02 - Payment terminal integration (Mercado Pago Point, Clip) with automatic payment processing; terminal configuration page at /dashboard/settings/terminals; Kitchen Display module (/dashboard/cocina) with real-time orders; redesigned payment modal with numpad validation and terminal status; complete printer system (58mm/80mm)

## User Preferences

Preferred communication style: Simple, everyday language
Database Choice: Supabase (con acceso automático desde la aplicación)

## System Architecture

### Frontend Architecture
- **Framework**: Next.js 16.0.1 con App Router
- **Language**: TypeScript 5.x
- **UI Components**: Shadcn/ui (48+ components)
- **State Management**: React hooks + Zustand
- **Server State**: TanStack React Query v5
- **Styling**: Tailwind CSS + CSS variables
- **Authentication**: Clerk (OAuth)

### Backend Architecture
- **API Layer**: Next.js API Routes (/api/*)
- **Database**: Supabase PostgreSQL
- **Authentication**: Clerk with Supabase sync
- **File Storage**: Supabase Storage
- **External APIs**: Google Generative AI, ElevenLabs, OpenRouter

### Database Schema

**Tables Created:**
1. `users` - User accounts with Clerk integration
2. `categories` - Product categories with hierarchy
3. `products` - Products with multi-channel availability (includes has_variants flag)
4. `customers` - Customer records with loyalty points
5. `sales` - POS sales transactions
6. `sale_items` - Line items for sales
7. `orders` - Digital menu orders
8. `order_items` - Line items for orders
9. `variant_types` - Types of variants (Tamaño, Topping, Extra)
10. `product_variants` - Product variations with price modifiers
11. `sale_item_variants` - Tracks variants selected in POS sales
12. `tenant_config` - Multi-tenant configuration
13. `global_products` - Shared barcode database with external API cache **NEW**

**Test Data Included:**
- Admin user: admin@salvadorex.test
- Dev user: grupovolvix@gmail.com (ADMIN) - Current dev user
- 8 categories: Entradas, Hamburguesas, Menú Ejecutivo, etc.
- Sample products with prices and inventory
- Products require SKU and cost fields (not null constraint)

## Configuration

### Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=https://ycwdsecikgpojdpzffpf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon key]
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_Y3VyaW91cy1oZXJvbi00OC5jbGVyay5hY2NvdW50cy5kZXYk
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
IMAGE_GENERATION_MODEL=google/gemini-2.5-flash-image-preview
```

### Service Keys (Stored Securely)
- SUPABASE_SERVICE_ROLE_KEY: ✅ Configured
- CLERK_SECRET_KEY: ✅ Configured
- OPENROUTER_API_KEY: ✅ Configured
- ELEVENLABS_API_KEY: ✅ Configured
- PEXELS_API_KEY: ✅ Configured
- UNSPLASH_ACCESS_KEY: ✅ Configured
- Database Connection: ✅ Working

## Current Features

### POS System
- ✅ Product management
- ✅ Category organization with flexible positioning (left, top, bottom, hidden)
- ✅ Smart dual-mode search (barcode vs text detection)
- ✅ **Cascade barcode lookup** (client DB → global DB → external APIs)
- ✅ Best sellers filter integrated in category dropdown
- ✅ Quick product creation modal with auto-focus logic and description field
- ✅ **Redesigned Payment Modal** with numeric keypad, quick amounts, real-time change display
- ✅ Sales transactions (CASH/CARD)
- ✅ Customer tracking
- ✅ Inventory management
- ✅ Sidebar auto-closes when interacting with POS

### Payment Modal (REDESIGNED)
- ✅ Redesigned payment interface with two-column layout
- ✅ Total a Pagar and Falta por Pagar/Cambio displays
- ✅ Numeric keypad (0-9, 00, decimal) with validation
- ✅ Quick amount buttons ($20, $50, $100, $200, $500, $1000)
- ✅ Exact amount button
- ✅ Multiple payment methods: Efectivo, Tarjeta, Transferencia, Crédito
- ✅ Real-time change/remaining calculation
- ✅ Customer selection for credit payments
- ✅ **Terminal integration**: Auto-detects configured terminals when selecting "Tarjeta"
- ✅ **Terminal status display**: Shows processing, approved, rejected states with visual feedback
- ✅ **Auto-complete**: Automatically completes sale when terminal payment is approved
- ✅ **Link terminal prompt**: First-time users see option to connect their terminal

### Payment Terminals (NEW)
- ✅ Support for **Mercado Pago Point** and **Clip** terminals
- ✅ Configuration page at `/dashboard/settings/terminals`
- ✅ Step-by-step accordion instructions for easy setup
- ✅ Terminal discovery and device listing
- ✅ Test connection functionality
- ✅ Default terminal selection
- ✅ Demo mode for testing without real terminals
- ✅ Automatic payment flow:
  1. User selects "Tarjeta" in payment modal
  2. System sends amount to configured terminal
  3. Customer pays on physical terminal
  4. System polls for approval status
  5. On approval, sale completes automatically
- ✅ Real-time status indicators (Processing, Approved, Rejected, Error)
- ✅ Authorization code display on successful payments
- ✅ Quick access from Settings page with gradient icon

### Printer System
- ✅ Multi-printer configuration (58mm & 80mm thermal printers)
- ✅ Connection types: USB, Network, Bluetooth, Email
- ✅ Auto-numbered printer names (Impresora 1, Impresora 2, etc.)
- ✅ Receipt template generation (text and HTML formats)
- ✅ Test print functionality
- ✅ Default printer selection
- ✅ PWA-compatible printing via WebUSB, Web Bluetooth, and network

### Digital Platforms Integration
- ✅ Delivery platform connection UI (Uber Eats, Didi Food, Rappi, Pedidos Ya, Sin Delantal, Cornershop)
- ✅ API credential management per platform
- ✅ Webhook URL generation
- ✅ Enable/disable platform integration
- ✅ Platform connection status indicators
- ✅ Webhook endpoints for automatic order receiving

### Kitchen Display (Cocina)
- ✅ Real-time order display at `/dashboard/cocina`
- ✅ Color-coded status cards:
  - Red/Orange: Pending orders (Pendientes)
  - Yellow: In progress (En Preparación)
  - Green: Ready (Listos)
  - Gray: Delivered (Entregados)
- ✅ Order details with items, quantities, modifiers
- ✅ Status action buttons (Iniciar, Listo, Entregado)
- ✅ Filter by status and source (POS, Uber Eats, Didi Food, Rappi)
- ✅ 5-second auto-refresh polling
- ✅ Demo data fallback when tables don't exist

### Cascade Barcode Lookup System
When scanning an unknown barcode in the POS:
1. **Client DB** - First searches in the user's products table
2. **Global DB** - If not found, searches in the shared `global_products` table
3. **External APIs** - If not found, queries Open Food Facts and UPC Item DB
4. **Auto-save** - Results from external APIs are saved to `global_products` for future lookups
5. **Pre-fill** - Modal shows product info (name, price, description, image) with source indicator

### Digital Menu
- ✅ Public menu sharing
- ✅ Product browsing
- ✅ Order placement

### Authentication
- ✅ Clerk OAuth integration (production)
- ✅ Development auth bypass system (no Clerk login required in dev mode)
- ✅ User synchronization to Supabase
- ✅ Role-based access control

### Development Auth Bypass
- **Current Dev User**: grupovolvix@gmail.com (ADMIN) - from new Supabase database
- **Files**: `src/lib/auth-wrapper.ts`, `src/lib/auth-dev.ts`
- **How it works**: In development mode, all API routes automatically use an ADMIN user from the database without requiring Clerk authentication

## Important API Endpoints

### Database Initialization
- `GET /api/init-db?step=check` - Check database tables status
- `GET /api/init-db?step=seed` - Populate test data (already done)
- `GET /api/init-kitchen?action=check` - Check kitchen tables status
- `GET /api/init-kitchen?action=sql` - Get SQL to create kitchen tables
- `GET /api/init-kitchen?action=seed` - Populate sample kitchen orders

### Kitchen Orders
- `GET /api/kitchen/orders` - Get all kitchen orders
- `POST /api/kitchen/orders` - Create new kitchen order
- `PATCH /api/kitchen/orders` - Update order status

### Webhooks (Digital Platforms)
- `POST /api/webhooks/uber-eats` - Receive Uber Eats orders
- `POST /api/webhooks/didi-food` - Receive Didi Food orders
- `POST /api/webhooks/rappi` - Receive Rappi orders

## Future Enhancements (From Task List)

1. Multi-Language System - French, German, Chinese, Japanese support
2. Enhanced Currency System - Real-time exchange rate conversion
3. Analytics & Reporting Dashboard - Sales analytics with charts
4. Employee Management - Role-based access control
5. Customer Loyalty System - Points and rewards
6. Bulk Product Import - CSV/Excel upload
7. Receipt Printing - Print tickets and reports
8. Offline Mode - Service workers for offline functionality
9. CFDI 4.0 - Mexican electronic invoicing

## Application URLs

- Local Dev: http://localhost:5000
- Production: Will be available after deployment
- Supabase Dashboard: https://supabase.com/dashboard/project/ycwdsecikgpojdpzffpf

## Notes

- Service Worker RPC not available via API - manual SQL execution required for initial setup
- All subsequent data changes can be handled automatically
- Database auto-syncs with Clerk for user management
- Ready for production deployment
