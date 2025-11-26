# SalvadoreX POS System

## Overview

SalvadoreX is an enterprise-grade Point of Sale (POS) system with AI-powered capabilities. The system combines traditional POS functionality with cutting-edge features including voice-based ordering, AI menu digitalization from photos, and automated product image generation. It serves both restaurant staff through a comprehensive dashboard and customers through a digital menu interface.

The application is built with Next.js 16 using the App Router, TypeScript, and integrates with Supabase for data persistence and Clerk for authentication. It supports multi-language operations (6 languages) and multi-currency transactions (5 currencies).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: Next.js 16.0.1 with App Router and React Server Components
- TypeScript strict mode enabled for type safety
- Client-side state management using React hooks and context API
- React Query (@tanstack/react-query) for server state management
- Dual dashboard architecture:
  - `/dashboard/*` - Staff/admin interface for POS operations, inventory, and reporting
  - `/dashboard-user/*` - Customer interface for menu browsing and ordering

**UI Component System**: Shadcn/ui (48+ components)
- Radix UI primitives for accessible, unstyled components
- Tailwind CSS for styling with CSS variables for theming
- Custom components for domain-specific functionality (POS cart, product search, voice ordering)

**State Management**:
- Language context provider for multi-language support (6 languages)
- Cart management using custom hooks (use-sales.ts)
- Product variants and customization tracking
- Real-time voice transcription state

**Key Design Patterns**:
- Server Components for data fetching where possible
- Client Components marked with "use client" for interactivity
- Custom hooks for reusable business logic (7 custom hooks)
- Conditional layouts based on route patterns (authenticated vs public)

### Backend Architecture

**API Layer**: Next.js API Routes (21 endpoints)
- RESTful endpoints under `/api/*`
- Server-side authentication using Clerk
- API route handlers for CRUD operations
- Special endpoints for AI features (voice-order, text-to-speech, search-images)

**Authentication & Authorization**:
- Clerk for user authentication and session management
- Middleware-based route protection (src/middleware.ts)
- Role-based access control (ADMIN, CUSTOMER roles)
- Automatic user sync from Clerk to Supabase via `/api/auth/sync-user`
- Public menu sharing via restaurantId query parameter

**Business Logic**:
- Multi-channel product availability system (POS vs Digital Menu)
- Inventory tracking with min/max stock levels
- Product variants system (sizes, toppings, extras with pricing)
- Customer credit/points management
- Tax calculation (16% IVA/VAT)
- Multi-currency conversion with exchange rates

### Data Storage Solutions

**Primary Database**: Supabase (PostgreSQL)
- User management with Clerk integration
- Products with multi-channel availability flags
- Categories with hierarchical support
- Product variants (sizes, extras, customizations)
- Sales and sale items tracking
- Customer records with credit/loyalty points
- Orders from digital menu
- 12 database migrations in `/supabase/migrations`

**Database Schema Highlights**:
- `users` table synced with Clerk (clerk_id, email, role, restaurant_id)
- `products` table with unified multi-channel flags (available_in_pos, available_in_digital_menu, track_inventory)
- `product_variants` for customizable product options
- `categories` with parent-child relationships
- `sales` and `sale_items` for POS transactions
- `customers` for customer relationship management
- `orders` and `order_items` for digital menu purchases

**File Storage**: Supabase Storage
- Product images with upload/delete functionality
- AI-generated product images
- Menu photo uploads for digitalization

**Client-Side Storage**:
- localStorage for language preferences
- Session storage for cart state

### External Dependencies

**Authentication & User Management**:
- **Clerk** (@clerk/nextjs): User authentication, session management, and user profiles
- Provides UserButton component and auth hooks
- Automatic user synchronization to Supabase

**AI & Machine Learning**:
- **OpenAI/Google Generative AI** (@google/generative-ai): Menu digitalization from photos
- **OpenRouter**: Claude AI for intelligent voice order processing
- **ElevenLabs** (@elevenlabs/elevenlabs-js, @elevenlabs/react): Text-to-speech and voice agent capabilities
- Uses ElevenLabs multilingual v2 model for voice responses

**Database & Backend**:
- **Supabase** (@supabase/supabase-js): PostgreSQL database and file storage
- Service role key for server-side operations
- Row-level security policies

**Payment Processing**:
- **Stripe** (@stripe/stripe-js): Payment processing integration (configured but implementation details minimal in provided files)

**Image & Media**:
- **Pexels API**: External image search for product photos (via `/api/search-images`)
- Native browser APIs: Web Speech API for voice recognition, MediaRecorder for audio capture

**UI & Interactions**:
- **Framer Motion**: Animations and transitions
- **Recharts**: Dashboard charts and analytics visualization
- **React Day Picker**: Date selection for reports
- **dnd-kit**: Drag-and-drop functionality
- **QRCode.react**: QR code generation for menu sharing

**Development Tools**:
- **Prisma** (@prisma/client): Database ORM (configured alongside Supabase)
- **Zod**: Schema validation with react-hook-form integration
- **React Hook Form**: Form state management
- **Axios**: HTTP client for API calls

**Internationalization**:
- Custom translation system in `/src/lib/translations`
- Supports: Spanish, English, Portuguese, German, Japanese, French
- Currency conversion for: MXN, USD, BRL, EUR, JPY

**Voice & Speech**:
- Browser Web Speech API for continuous voice recognition
- ElevenLabs API for natural voice synthesis
- Auto-pause detection (1.5 seconds) for message submission
- Turn-based conversation management

**Key Integration Points**:
- Voice orders processed through OpenRouter → Claude AI → Product matching
- Menu photos → Google Generative AI Vision → Product extraction → Auto-save
- Product names → AI image generation → Supabase storage
- QR codes → Public menu sharing with restaurantId parameter
- Clerk authentication → Supabase user sync → Role-based access