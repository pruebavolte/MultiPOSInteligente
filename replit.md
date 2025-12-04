# SalvadoreX - AI-Powered Point of Sale System

## Overview

SalvadoreX is an enterprise-grade Point of Sale (POS) system with advanced AI capabilities designed for restaurants and retail businesses. The system combines traditional POS functionality with cutting-edge AI features including voice ordering, menu digitalization from photos, and automatic image generation. It supports multi-channel sales (in-store POS and digital menu), multi-language interfaces (6 languages), and multi-currency operations (5 currencies).

**Key Features:**
- Traditional POS with product catalog, inventory management, and sales processing
- AI-powered voice ordering for hands-free order placement
- AI menu digitalization (upload menu photos to extract products automatically)
- AI image generation for product photos
- Digital menu system for customer self-ordering
- Product variants support (sizes, toppings, extras with price modifiers)
- Multi-brand/white-label capability
- PWA support for offline functionality
- Real-time kitchen display and virtual queue management

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework:** Next.js 16.0.1 with App Router and React 19.2.0
- Server Components for performance optimization
- Client Components for interactive features
- TypeScript strict mode for type safety

**UI Components:** Shadcn/UI component library
- 48+ pre-built components using Radix UI primitives
- Tailwind CSS for styling with custom design system
- Dark mode support via CSS variables
- Responsive design patterns for mobile/tablet/desktop

**State Management:**
- React Context API for global state (language, search, cart)
- TanStack Query (React Query) for server state and data fetching
- Local state with React hooks for component-level state

**Routing Strategy:**
- `/dashboard/*` - Staff/admin interface (POS, inventory, reports)
- `/dashboard-user/*` - Customer interface (digital menu, orders, profile)
- `/fila/*` - Public virtual queue system
- Public menu sharing via `restaurantId` query parameter

### Backend Architecture

**API Layer:** Next.js API Routes (App Router)
- RESTful API design pattern
- 23+ API endpoints under `/api/*`
- Server-side rendering with React Server Components
- Edge runtime support for performance-critical routes

**Authentication:** Clerk
- JWT-based authentication
- Role-based access control (ADMIN, USER, CUSTOMER)
- User sync mechanism between Clerk and Supabase
- Middleware-based route protection via `clerkMiddleware()`

**Authorization Patterns:**
- Route-level protection in `middleware.ts`
- API endpoint guards using `auth()` helper
- Role checking via database queries
- Resource ownership validation (user_id/restaurant_id)

### Data Storage Solutions

**Primary Database:** Supabase (PostgreSQL)
- 13+ migration files for schema versioning
- Tables: users, products, categories, customers, sales, orders, ingredients, variants
- Row Level Security (RLS) policies for multi-tenant isolation
- UUID primary keys with `gen_random_uuid()`

**Database Design Patterns:**
- Soft deletes via `active` boolean flags
- Audit fields: `created_at`, `updated_at` timestamps
- Foreign key relationships with proper indexes
- JSON columns for flexible metadata (branding, settings, enabled_modules)

**File Storage:** Supabase Storage
- Product images in public buckets
- Image upload/delete helpers in `/lib/supabase/storage.ts`
- CDN-backed URL generation for performance

**Caching Strategy:**
- Service Worker caching for PWA offline support
- React Query caching with stale-while-revalidate pattern
- localStorage for user preferences (language, theme)

### External Dependencies

**AI Services:**
- **ElevenLabs:** Text-to-speech and speech-to-text for voice ordering
  - WebSocket-based real-time voice conversation
  - Multilingual support (Spanish, English)
  - Configuration via `ELEVENLABS_API_KEY`

- **OpenRouter (Claude AI):** Natural language processing for voice commands
  - Product matching and order parsing
  - Context-aware conversation handling
  - Configuration via `OPENROUTER_API_KEY`

- **Google Gemini AI:** Menu digitalization from photos
  - Vision API for text extraction from images
  - Product data structuring
  - Configuration via `GOOGLE_AI_API_KEY`

**Payment Processing:**
- **Stripe:** Payment gateway integration
  - Customer tracking via `stripe_customer_id`
  - Invoice management via `stripe_invoice_id`
  - Configuration via Stripe API keys

- **Mercado Pago Point:** Terminal integration for in-person payments
  - OAuth 2.0 authentication flow
  - Terminal device discovery and selection
  - Payment intent creation via API
  - Connection data stored in Replit PostgreSQL (not Supabase) to avoid PostgREST cache issues
  - Multi-tenant isolation enforced via user_id queries
  - Configuration via `MERCADOPAGO_CLIENT_ID` and `MERCADOPAGO_CLIENT_SECRET`

**Image Services:**
- **Pexels API:** Product image search
  - Free stock photos for products
  - Fallback for when merchants don't have images
  - Configuration via `PEXELS_API_KEY`

**Third-Party Libraries:**
- `@tanstack/react-query` - Server state management
- `@clerk/nextjs` - Authentication and user management
- `@supabase/supabase-js` - Database client
- `@dnd-kit/*` - Drag-and-drop functionality
- `recharts` - Data visualization for reports
- `react-hook-form` + `zod` - Form handling and validation
- `date-fns` - Date manipulation
- `lucide-react` - Icon library

**Development Tools:**
- `tsx` - TypeScript execution for scripts
- ESLint with Next.js config
- Tailwind CSS for styling
- PostCSS for CSS processing

**PWA Capabilities:**
- Service Worker (`/public/sw.js`) with offline support
- Web App Manifest (`/public/manifest.json`)
- Adaptive Cards for widgets
- IndexedDB for offline data persistence

**Multi-Brand Architecture:**
- Vertical-based system (restaurant, retail, etc.)
- Brand customization (colors, logos, domains)
- Module enablement per brand
- White-label capability for resellers