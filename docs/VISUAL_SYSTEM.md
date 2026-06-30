# UK Dropshipping Hub — Visual System Guide

This guide documents the design system, colors, typography, component styling, and UX standards enforced across the UK Dropshipping Hub.

---

## 🎨 Color Palette (Nexus Design Tokens)

The application implements a cohesive, high-contrast palette tailored for professional B2B e-commerce operators (Wholesalers, Retailers, and Administrators).

| Token | Hex Value | Visual representation | Main Usage |
|-------|-----------|-------------------|------------|
| **Brand Dark** | `#1a1a1c` | `█` | Lateral navigation sidebar, primary button backgrounds, header title text |
| **Brand Accent** | `#8b5cf6` | `█` | Active menu states, focus rings, hover effects, links |
| **Accent Hover** | `#7c3aed` | `█` | Button hover states, interactive elements |
| **Background** | `#f5f5f7` | `█` | App shell outer container, page body background |
| **Surface** | `#ffffff` | `█` | Content cards, data tables, dialog modals, forms |
| **Border / Divider**| `#e5e7eb` | `█` | Grid lines, section dividers, input borders |

### Functional Status Colors

Status pills use dedicated background and text combinations for maximum readability:

- **PENDING / STAGED**: Amber/Yellow (`#fef3c7` / `#92400e`)
- **ACCEPTED / APPROVED**: Blue (`#dbeafe` / `#1e40af`)
- **SHIPPED / ONGOING**: Violet (`#f3e8ff` / `#6b21a8`)
- **DELIVERED / COMPLETE**: Green (`#d1fae5` / `#065f46`)
- **CANCELLED / REJECTED**: Red (`#fee2e2` / `#991b1b`)

---

## font Typography

- **Font Family**: `Inter Tight`, sans-serif (imported dynamically via Google Fonts).
- **Scale**:
  - `h1`: 1.875rem (`30px`), bold, tracking-tight
  - `h2`: 1.5rem (`24px`), semibold
  - `h3`: 1.25rem (`20px`), semibold
  - `Body`: 0.875rem (`14px`) or 1rem (`16px`), tracking-normal, slate-700/800
  - `Small / Meta`: 0.75rem (`12px`), gray-500

---

## 🧱 Key Layout Components

### 1. Navigation Sidebar
- **Background**: Solid `#1a1a1c` (Brand Dark).
- **Active State**: Injected background using `#8b5cf6` (Brand Accent) with left border highlights and white text.
- **Inactive State**: Gray text (`#9ca3af`), transforming to white text on hover.
- **Structure**: Collapsible panels, containing roles-filtered catalogs, orders lists, wallet ledgers, and notification indicators.

### 2. Cards & Panels
- **Container Styling**: `.bg-white .rounded-xl .border .border-gray-200 .shadow-sm`.
- **Spacing**: Generous padding (`p-6` / `24px`) to preserve layout breathing room.

### 3. Data Tables
- **Header**: Thin light-gray background (`#f9fafb`) with uppercase labels.
- **Row Hover**: Subtle highlight row background (`hover:bg-gray-50/50`) with pointer mouse indicators for clickable orders or products.

---

## ⚡ Interactive UX Standards

1. **Micro-animations**:
   - Navigation links, buttons, and settings switches must transition with:
     ```css
     transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
     ```
2. **State Backtracking**:
   - Any form configuration, product editor, or returns processor MUST provide a visible "Back" or "Cancel" button styled as an outline/text variant.
3. **Empty States**:
   - Lists without data (e.g. empty orders, no active notifications) must render a custom gray icon, a friendly explanatory copy, and a primary CTA (e.g., "Source Products" or "Add Item").
