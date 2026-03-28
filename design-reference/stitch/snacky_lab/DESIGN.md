# Design System Documentation

## 1. Overview & Creative North Star

**Creative North Star: The Living Laboratory**
This design system rejects the clinical coldness of traditional health apps in favor of a "Living Laboratory"—a high-end editorial experience that blends scientific precision with organic warmth. We move beyond the "standard app" aesthetic by utilizing a sophisticated Bento UI framework that feels like a curated magazine layout rather than a rigid data table.

To achieve this, we prioritize **intentional asymmetry** and **tonal depth**. Rather than placing elements on a flat canvas, we treat the interface as an architectural space where information is "carved" out of surfaces or floated on frosted glass. The goal is to make the user feel like they are interacting with a premium, bespoke digital concierge that understands both the data of nutrition and the humanity of eating.

---

## 2. Colors & Surface Logic

Our palette is rooted in the vitality of nature (`primary`: #006E1C) and the clarity of a clean lab (`surface`: #F9F9F9). 

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders for sectioning or containment. Boundaries must be defined strictly through:
*   **Background Shifts:** Distinguish a section by placing a `surface_container_low` card against a `surface` background.
*   **Tonal Transitions:** Use subtle variations in the surface-container tiers to imply structure without visual noise.

### Surface Hierarchy & Nesting
We use "Tonal Layering" to create depth. The UI is a series of nested physical layers:
1.  **Base Layer:** `surface` (#F9F9F9) – The expansive canvas.
2.  **Section Layer:** `surface_container_low` (#F3F3F3) – To group related Bento tiles.
3.  **Active Component Layer:** `surface_container_lowest` (#FFFFFF) – Reserved for the most interactive elements (e.g., a card the user is currently editing).

### The "Glass & Gradient" Rule
To elevate the "high-tech" brand promise, use **Glassmorphism** for persistent floating elements (like bottom navigation bars or active modals).
*   **Recipe:** Apply `surface_container_lowest` at 70% opacity with a `40px` backdrop blur.
*   **Signature Textures:** Use subtle linear gradients for primary CTAs, transitioning from `primary` (#006E1C) to `primary_container` (#4CAF50). This adds a "lithographic" quality that flat colors lack.

---

## 3. Typography

The typography strategy employs a "High-Contrast Scale" to drive the editorial feel. We pair the modern, geometric clarity of **Manrope** with the technical precision of **Plus Jakarta Sans**.

*   **Display & Headlines (Manrope):** Use `display-lg` and `headline-lg` for daily nutritional totals. The bold weight of Manrope conveys authority and "science-backed" confidence.
*   **Titles (Manrope):** `title-lg` should be used for Bento tile headers. This ensures that even in a crowded grid, the "editorial" voice remains clear.
*   **Body (Manrope):** `body-lg` is for primary reading. Ensure generous line heights to maintain the "warm and empathetic" vibe.
*   **Functional Labels (Plus Jakarta Sans):** Use `label-md` for data-heavy metrics (e.g., "14g Protein"). The slightly more technical look of Jakarta Sans signals to the user that this is raw data.

---

## 4. Elevation & Depth

We eschew traditional "Drop Shadows" in favor of environmental lighting.

*   **Tonal Stacking:** Depth is achieved by placing a `surface_container_high` (#E8E8E8) element inside a `surface_container_low` (#F3F3F3) environment. This creates "recessed" or "elevated" areas without any artificial shadows.
*   **Ambient Shadows:** When an element *must* float (e.g., a FAB or a floating macro-summary), use a shadow with a 32px blur at 6% opacity. The shadow color must be a tint of `on_surface` (#1A1C1C), never pure black.
*   **The "Ghost Border" Fallback:** If accessibility requirements demand a border, use the `outline_variant` (#BECAB9) at **15% opacity**. It should feel like a suggestion of a line, not a boundary.

---

## 5. Components

### The Bento Tile (Card)
*   **Structure:** No dividers. Use `spacing.4` (1.4rem) to separate internal tile elements.
*   **Corner Radius:** Use `DEFAULT` (1rem) for standard tiles and `lg` (2rem) for "Hero" tiles that span multiple columns.
*   **Background:** Use `surface_container_low` as the default tile color.

### Primary Buttons
*   **Shape:** `full` roundedness (Pill shape).
*   **Color:** `primary` (#006E1C) with `on_primary` (#FFFFFF) text.
*   **State:** On hover/active, transition to a subtle gradient using `primary_container`.

### The Macro-Tracker (Signature Component)
*   **Protein:** `secondary` (#4355B9 / Indigo).
*   **Carbs:** `tertiary` (#785900 / Amber).
*   **Fats:** `error` (#BA1A1A / Red).
*   **Style:** Use these colors as soft "glows" or data-viz fills, never as full-background tiles, to keep the off-white editorial feel dominant.

### Input Fields
*   **Style:** Minimalist. No bottom line. Use `surface_container_highest` (#E2E2E2) as a soft background fill with `sm` (0.5rem) rounded corners.
*   **Typography:** Labels must use `label-md` in `on_surface_variant`.

---

## 6. Do's and Don'ts

### Do:
*   **Do** embrace white space. If a Bento grid feels "cramped," increase the spacing scale from `3` to `4`.
*   **Do** use overlapping elements. A glassmorphic chip can slightly overlap the edge of a Bento tile to break the "grid" feel.
*   **Do** mix your typography. A `display-sm` number next to a `label-sm` unit creates a professional, data-rich hierarchy.

### Don't:
*   **Don't** use 100% opaque black. Always use `on_surface` or `on_surface_variant`.
*   **Don't** use dividers. If two pieces of content need separation, use `spacing.5` or a background color shift.
*   **Don't** use sharp corners. This system is "warm and empathetic"; everything must have at least a `sm` (0.5rem) radius.
*   **Don't** use "Default" Material shadows. If it looks like a standard Android app, it has failed the "Living Laboratory" aesthetic.