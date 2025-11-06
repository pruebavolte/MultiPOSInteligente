# Design Guidelines: Multi-Tenant POS System

## Design Approach
**Selected Approach:** Design System - Material Design 3
**Rationale:** POS systems demand clarity, efficiency, and touch-optimized interfaces. Material Design provides established patterns for data-dense applications with excellent touch targets and accessibility, while supporting the multi-language and customizable theming requirements essential for white-label deployment.

**Key Design Principles:**
- Efficiency First: Minimize taps/clicks to complete transactions
- Touch-Optimized: All interactive elements sized for finger navigation
- Scannable: Information hierarchy supports quick visual parsing
- Dual-Context: Designs work for both cashier and customer-facing displays
- White-Label Ready: Systematic approach to brand customization

---

## Typography System

**Font Families:**
- Primary: Inter (via Google Fonts) - highly legible at all sizes
- Monospace: JetBrains Mono - for prices, SKUs, transaction IDs

**Hierarchy:**
- Dashboard Headers: text-3xl font-bold (business name, page titles)
- Section Headers: text-xl font-semibold 
- Product Names: text-lg font-medium
- Prices/Totals: text-2xl font-bold (monospace)
- Body Text: text-base font-normal
- Secondary Info: text-sm font-normal
- Labels/Captions: text-xs font-medium uppercase tracking-wide

**Special Considerations:**
- Price displays always use monospace font for alignment
- Multi-language support: generous line-height (leading-relaxed) to accommodate character variations
- Customer-facing displays: +1 size larger than cashier equivalents

---

## Layout System

**Spacing Units:** Tailwind spacing of 2, 4, 8, 16, 24 (p-2, p-4, p-8, p-16, p-24)

**Core Layouts:**

**POS Screen (Primary View):**
- Split layout: 60% product grid + 40% cart sidebar
- Touch-optimized product cards: minimum h-24 with clear tap areas
- Fixed cart sidebar with sticky total at bottom
- Voice order button: prominent floating action button (bottom-right)

**Product Grid:**
- Grid: grid-cols-2 md:grid-cols-3 lg:grid-cols-4
- Gap: gap-4
- Cards: Elevated (shadow-md), rounded-lg, p-4
- Product image: aspect-square, object-cover
- Touch targets: min-h-24, full clickable area

**Cart Sidebar:**
- Fixed width: w-full lg:w-96
- Sticky positioning for persistent visibility
- Line items: py-3 with clear dividers
- Total section: sticky bottom, elevated (shadow-lg), p-6

**Dashboard Layout:**
- Top navigation bar: h-16, shadow-sm
- Sidebar navigation: w-64 (collapsible to w-16 icon-only on mobile)
- Main content: max-w-7xl mx-auto, p-8
- Cards for metrics: grid-cols-1 md:grid-cols-2 lg:grid-cols-4, gap-6

**Customer-Facing Display:**
- Centered, spacious layout with generous whitespace
- Large product images (if available)
- Running total always visible at top: text-4xl
- Language/currency indicator: top-right corner

---

## Component Library

### Core Components

**Product Card (POS):**
- Container: bg-white shadow-md rounded-lg p-4 cursor-pointer hover:shadow-lg transition
- Image: aspect-square rounded-md mb-3
- Name: text-lg font-medium truncate
- Price: text-xl font-bold monospace
- Stock indicator: text-sm badge (if low stock)
- Touch target: min-h-24

**Cart Item:**
- Layout: flex justify-between items-center py-3 border-b
- Quantity controls: Large +/- buttons (w-10 h-10)
- Product name: text-base font-medium
- Unit price: text-sm text-gray-600
- Subtotal: text-lg font-bold monospace
- Remove button: Icon-only, accessible label

**Voice Order Component:**
- Floating action button: w-16 h-16 rounded-full, fixed bottom-6 right-6
- Microphone icon: Large (w-8 h-8)
- Active state: Pulsing animation, visual waveform
- Transcription display: Overlay modal with real-time text
- Confirmation: Toast notifications for each added item

**Payment Modal:**
- Full-screen overlay on mobile, centered modal on desktop
- Large payment method buttons: min-h-20, grid-cols-1 md:grid-cols-2
- Amount tendered input: text-3xl font-bold
- Change calculation: Prominent display, text-2xl
- Complete sale button: w-full, h-14, text-xl

**Search Bar:**
- Prominent position: Top of product grid
- Large input: h-12, text-lg
- Autocomplete dropdown: max-h-96 overflow-auto
- Keyboard shortcut indicator: visible focus state

### Navigation

**Top Navigation:**
- Height: h-16
- Logo/Business name: Left-aligned
- Quick actions: Right-aligned (language, currency, user menu)
- Icons: w-6 h-6 with text labels on desktop

**Sidebar Navigation:**
- Full width on mobile (slide-out drawer)
- Fixed w-64 on desktop
- Navigation items: py-3 px-4 rounded-lg
- Active state: Clear visual indicator
- Icons: w-5 h-5, aligned with text

### Data Display

**Transaction Table:**
- Zebra striping for readability
- Column headers: Sticky, font-semibold, text-sm uppercase
- Row height: min-h-12 for touch targets
- Actions column: Right-aligned, icon buttons

**Stats Cards (Dashboard):**
- Container: bg-white shadow rounded-lg p-6
- Metric value: text-3xl font-bold
- Label: text-sm font-medium uppercase
- Trend indicator: Icon + percentage change
- Sparkline chart (optional): Bottom of card

**Product Details:**
- Two-column layout: Image left, details right
- Large image: max-w-md
- Field labels: text-sm font-medium text-gray-600
- Field values: text-base
- Actions: Sticky bottom toolbar

### Forms

**Input Fields:**
- Height: h-12 (h-14 on touch devices)
- Border: border-2, rounded-lg
- Focus state: Clear visual indication (ring-2)
- Labels: text-sm font-medium, mb-2
- Helper text: text-xs, mt-1

**Buttons:**
- Primary: h-12 px-6 text-base font-semibold rounded-lg
- Secondary: h-10 px-4 text-sm font-medium rounded-md
- Large (touch): h-14 px-8 text-lg
- Icon buttons: w-10 h-10 (w-12 h-12 on touch)

### Overlays

**Modals:**
- Backdrop: Semi-transparent overlay
- Container: max-w-2xl, rounded-lg, shadow-2xl
- Header: p-6 border-b
- Body: p-6
- Footer: p-6 border-t, action buttons right-aligned

**Toasts/Notifications:**
- Position: top-right, stacked
- Width: max-w-sm
- Padding: p-4
- Auto-dismiss: 5 seconds
- Close button: Icon-only, top-right

---

## Animations

**Minimal, Purposeful Only:**
- Cart updates: Smooth height transitions (duration-200)
- Voice activation: Pulsing microphone indicator
- Product add: Brief scale animation on cart icon
- Page transitions: Simple fade (duration-150)
- NO decorative animations

---

## Responsive Breakpoints

- Mobile (default): Single column, full-screen modals
- Tablet (md: 768px): 2-column grids, side-by-side layouts
- Desktop (lg: 1024px): Full sidebar, multi-column grids
- Large (xl: 1280px): Max content width constraints

**Touch Considerations:**
- All interactive elements: min-h-12 (48px minimum)
- Spacing between touch targets: Minimum gap-2
- Swipe gestures: Cart drawer, navigation

---

## White-Label Customization

**Customizable Elements:**
- Logo placement: Top-left of navigation
- Business name: Prominent in header and receipts
- Theme colors: Applied systematically via CSS variables
- Typography: Optional custom font override
- Favicon and metadata

**Fixed Elements (Non-Customizable):**
- Layout structure and spacing system
- Component proportions and touch targets
- Accessibility features
- Core interaction patterns

---

## Images

**Product Images:**
- Aspect ratio: Square (1:1)
- Minimum resolution: 400x400px
- Placeholder: Generic product icon if missing
- Location: Product cards, cart items, customer display

**Business Logo:**
- Maximum height: 48px in navigation
- Formats: SVG preferred, PNG acceptable
- Location: Top-left navigation bar

**No Hero Images:** This is a functional application, not a marketing site. Focus on operational efficiency over visual storytelling.