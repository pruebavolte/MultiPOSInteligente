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
- 5 categories: Bebidas, Comidas Rápidas, Postres, Snacks, Entradas
- 20+ sample products with prices and inventory
- 5 sample customers with loyalty points
- Sample sales data

## Configuration

### Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=https://zhvwmzkcqngcaqpdxtwr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon key]
CLERK_PUBLISHABLE_KEY=[clerk pk]
```

### Service Keys (Stored Securely)
- Supabase Service Role Key: ✅ Configured
- Clerk Secret Key: ✅ Configured
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
- ✅ Clerk OAuth integration
- ✅ User synchronization to Supabase
- ✅ Role-based access control

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
- Supabase Dashboard: https://supabase.com/dashboard/project/zhvwmzkcqngcaqpdxtwr

## Notes

- Service Worker RPC not available via API - manual SQL execution required for initial setup
- All subsequent data changes can be handled automatically
- Database auto-syncs with Clerk for user management
- Ready for production deployment
