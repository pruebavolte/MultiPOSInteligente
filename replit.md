# SalvadoreX POS System

## Overview

SalvadoreX es un enterprise-grade Point of Sale (POS) system con capacidades AI-powered. La aplicación está construida con Next.js 16, React 19, TypeScript, y utiliza Supabase como base de datos principal.

**Status**: ✅ Base de datos configurada y poblada con datos de prueba

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
3. `products` - Products with multi-channel availability
4. `customers` - Customer records with loyalty points
5. `sales` - POS sales transactions
6. `sale_items` - Line items for sales
7. `orders` - Digital menu orders
8. `order_items` - Line items for orders
9. `product_variants` - Product variations (sizes, toppings, etc.)

**Test Data Included:**
- Admin user: admin@salvadorex.test
- Dev user: dev@salvadorex.test (ID: 6c1c07e3-5e49-4bf3-99c0-3acc1ccbfd3e)
- 5 categories: Bebidas, Comidas, Postres, Snacks, Entradas y Antojitos
- 5+ sample products with prices and inventory (Coca-Cola, Pepsi, Agua, Hamburguesa, Pizza)
- Products require SKU field (not null constraint)

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
- ✅ Category organization
- ✅ Sales transactions (CASH/CARD)
- ✅ Customer tracking
- ✅ Inventory management

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

- `GET /api/init-db?step=check` - Check database tables status
- `GET /api/init-db?step=seed` - Populate test data (already done)

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
