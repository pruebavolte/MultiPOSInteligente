# Multi-Tenant POS System

## Overview

This is a modern Point of Sale (POS) system built as a full-stack web application. The system is designed to handle retail transactions with support for multiple languages, currencies, and voice-based ordering. It features a comprehensive product catalog capable of managing up to 190,000+ items, customer management with loyalty programs, and real-time inventory tracking.

The application serves as a complete retail management solution with POS transactions, inventory control, customer relationship management, and business analytics capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System:**
- React 18+ with TypeScript for type safety
- Vite as the build tool and development server
- Wouter for client-side routing (lightweight React Router alternative)
- TanStack Query (React Query) for server state management and caching

**UI Component System:**
- Shadcn/ui component library based on Radix UI primitives
- Tailwind CSS for styling with custom design tokens
- Material Design 3 principles for touch-optimized interfaces
- Custom theme system supporting light/dark modes
- Typography: Inter for UI text, JetBrains Mono for monospaced content (prices, SKUs)

**State Management:**
- TanStack Query for server state with infinite stale time
- Local React state for UI interactions
- Context API for theme and global settings

**Key Design Decisions:**
- Touch-first interface optimized for tablets and mobile devices
- 60/40 split layout on POS screen (product grid vs cart sidebar)
- Minimum touch target heights (h-24) for accessibility
- Real-time exchange rate conversion for multi-currency support

### Backend Architecture

**Server Framework:**
- Express.js with TypeScript
- ESM module system throughout
- Custom middleware for request logging and JSON parsing

**Database & ORM:**
- PostgreSQL as the primary database
- Drizzle ORM for type-safe database operations
- Neon serverless PostgreSQL for hosting
- Schema-first approach with Zod validation integration

**Data Models:**
- Products: SKU, barcode, pricing tiers, stock levels, categories
- Customers: Contact info, credit limits, loyalty points
- Sales: Transaction records with line items and payment methods
- Categories: Hierarchical product organization
- TenantConfig: Multi-tenant business settings

**Storage Strategy:**
- PostgreSQL database storage (DbStorage) using Drizzle ORM
- Interface-based design (IStorage) for abstraction
- All CRUD operations abstracted behind IStorage interface
- Neon serverless PostgreSQL with WebSocket configuration for Node.js
- Database migrations managed with drizzle-kit
- Seed script (server/seed.ts) for initial data population

### API Design

**RESTful Endpoints:**
- `/api/products` - Product CRUD operations
- `/api/categories` - Category management
- `/api/customers` - Customer management
- `/api/sales` - Transaction processing
- `/api/config` - Tenant configuration
- `/api/voice/transcribe` - Audio transcription
- `/api/voice/command` - Voice command processing
- `/api/exchange-rate` - Currency conversion

**Request Handling:**
- Zod schema validation on all inputs
- Multer for audio file uploads (voice orders)
- Express-session with PostgreSQL store for session management
- CORS and security headers configured

**Error Handling:**
- Consistent error responses with status codes
- Validation errors return detailed field information
- Request/response logging for debugging

### Voice AI Integration

**Speech Processing Pipeline:**
1. Browser captures audio via MediaRecorder API
2. Audio uploaded as WebM to `/api/voice/transcribe`
3. OpenAI Whisper API transcribes audio to text
4. Text analyzed by GPT-5 to extract product commands
5. ElevenLabs TTS synthesizes confirmation audio

**Language Support:**
- Auto-detection of spoken language (Spanish, English, French, German, Chinese, Japanese)
- Multi-language voice models via ElevenLabs
- Natural language processing handles variations ("agrega 3 coca colas", "add 3 cokes")

**Design Choice:**
- Whisper for transcription (more accurate than ElevenLabs for this use case)
- GPT-5 for command parsing (newest model as of August 2025)
- ElevenLabs for speech synthesis (better voice quality)

## External Dependencies

### Third-Party Services

**AI & Voice Services:**
- OpenAI API: Whisper transcription, GPT-5 language detection and command parsing
- ElevenLabs API: Text-to-speech synthesis with multi-language voice models

**Database & Infrastructure:**
- Neon serverless PostgreSQL: Database hosting with connection pooling
- ExchangeRate API: Real-time currency conversion rates (free tier)

**Development Tools:**
- Replit development environment integrations (@replit/vite-plugin-*)

### Key NPM Dependencies

**Frontend:**
- @tanstack/react-query: Server state management
- @radix-ui/*: Headless UI component primitives
- wouter: Lightweight routing
- date-fns: Date formatting and manipulation
- class-variance-authority: Component variant management
- tailwind-merge & clsx: Class name utilities

**Backend:**
- drizzle-orm: Type-safe ORM
- @neondatabase/serverless: Serverless PostgreSQL client
- express: HTTP server framework
- multer: File upload handling
- connect-pg-simple: PostgreSQL session store
- zod: Schema validation

**Build Tools:**
- vite: Build tool and dev server
- esbuild: Production server bundling
- tsx: TypeScript execution for development
- drizzle-kit: Database migrations

### Environment Variables Required

- `DATABASE_URL`: PostgreSQL connection string
- `OPENAI_API_KEY`: OpenAI API authentication
- `ELEVENLABS_API_KEY`: ElevenLabs API authentication
- `NODE_ENV`: Environment indicator (development/production)