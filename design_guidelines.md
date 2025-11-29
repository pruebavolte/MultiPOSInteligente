# SalvadoreX POS System - Design Guidelines

## Design Approach
**System-Based:** Shadcn/UI component library with enterprise focus, inspired by Linear's professional aesthetics and Stripe's clarity. Priority on operational efficiency, data density, and dark-mode-first design.

## Core Design Elements

### Typography
- **Primary Font:** Inter via Google Fonts (professional, excellent readability)
- **Hierarchy:**
  - Hero/Headers: text-4xl to text-6xl, font-semibold
  - Section Titles: text-2xl to text-3xl, font-semibold
  - Body: text-base, font-normal
  - UI Labels: text-sm, font-medium
  - Metadata/Captions: text-xs, font-normal

### Layout System
- **Spacing Primitives:** Tailwind units of 2, 4, 6, 8, 12, 16
- **Grid System:** 12-column responsive grid
- **Container:** max-w-7xl with px-4 md:px-6 lg:px-8
- **Vertical Rhythm:** Section padding py-12 md:py-16 lg:py-20

### Component Library

**Navigation:**
- Sticky header with backdrop-blur effect
- Logo left, primary nav center, CTA + dark mode toggle right
- Mobile: Slide-out drawer with smooth transitions

**Dashboard Components:**
- Card-based layouts with subtle borders (border rounded-lg)
- Data tables with zebra striping and hover states
- Metric cards in 3-4 column grids
- Sidebar navigation (240px width) with collapsible sections

**Forms & Inputs:**
- Shadcn/UI form components with consistent spacing (space-y-4)
- Floating labels or top-aligned labels
- Clear validation states with inline error messages
- Input groups with icon prefixes where relevant

**Data Visualization:**
- Chart cards with minimal chrome
- Real-time update indicators
- AI insights panels with distinctive accent treatment
- KPI dashboards with large numbers, micro-labels

**CTA Elements:**
- Primary: Solid background with subtle shadow
- Secondary: Outline style
- Buttons on images: bg-white/10 backdrop-blur-md

**Overlays:**
- Modals: Centered with max-w-2xl, overlay backdrop
- Dropdowns: Shadcn/UI Dropdown Menu with smooth animations
- Toast notifications: Bottom-right positioning

## Page Structure

### Landing Page (Marketing)

**Hero Section (100vh):**
- Full-width split layout: Left 60% (content), Right 40% (dashboard preview image)
- Headline emphasizing "Enterprise-grade AI POS"
- Two CTAs: "Request Demo" (primary), "Watch Video" (secondary)
- Subtle grid pattern background
- Trust indicators below: "Trusted by 500+ Restaurants" with logos

**Features Section:**
- 3-column grid showcasing AI capabilities, inventory management, analytics
- Each card: Icon top, title, 2-line description, "Learn more" link
- Alternating card backgrounds for visual interest

**Dashboard Preview:**
- 2-column layout: Static dashboard screenshot + feature callouts
- Highlight real-time capabilities, AI recommendations
- "See it in action" CTA

**Integration Showcase:**
- 4-column logo grid of supported payment/delivery platforms
- "200+ Integrations" headline

**Testimonials:**
- 2-column layout with restaurant owner photos, quotes, business names
- Star ratings and specific metrics mentioned

**Pricing Section:**
- 3-tier comparison table (Starter, Professional, Enterprise)
- Toggle for monthly/annual billing
- Feature comparison rows with checkmarks

**CTA Banner:**
- Full-width dark background
- Centered content: "Ready to transform your operations?"
- Primary CTA + secondary "Talk to sales"

**Footer:**
- 4-column layout: Product, Company, Resources, Contact
- Newsletter signup with inline form
- Social links, compliance badges
- Copyright and legal links

### Dashboard Application (Post-Login)

**Sidebar Navigation (Dark):**
- Logo at top
- Icon + label menu items: Dashboard, Orders, Inventory, Customers, Analytics, Settings
- AI Assistant toggle at bottom
- User profile dropdown

**Main Content Area:**
- Page header: Title, breadcrumb, action buttons (right-aligned)
- Stats row: 4 metric cards with trend indicators
- Primary content: Data tables/charts based on section
- Quick actions floating button (bottom-right)

**AI Features Panel (Collapsible):**
- Slide-in from right (320px width)
- Predictive insights cards
- Recommendation actions
- Conversation interface for AI queries

## Images

**Hero Image:** Dashboard preview showing modern POS interface with order management, real-time updates, and clean data tables - conveys enterprise sophistication

**Feature Section Images:** Screenshots of specific features (AI recommendations panel, inventory dashboard, analytics charts) - 3 images total

**Integration Logos:** Brand logos for Square, Stripe, Toast, DoorDash, Uber Eats, etc.

**Testimonial Photos:** Restaurant owner headshots (professional, warm) - 2-3 images

**Dashboard Screenshots:** Full application views showing real workflows - 2-3 throughout landing page

## Animations
Minimal, purposeful only: Subtle fade-ins on scroll for feature cards, smooth modal transitions, loading states for data tables.