# Design System — Draupnir

## Product Context
- **What this is:** Draupnir is an AI service management platform built on the Bifrost AI Gateway. It provides a centralized interface to manage AI models, track usage, monitor costs, and manage organization permissions.
- **Who it's for:** Cloud administrators, organization managers, and developers using AI services.
- **Space/industry:** AI infrastructure / cloud management SaaS (B2B).
- **Project type:** Multi-entry web application (Admin, Manager, and Member dashboards).

## Aesthetic Direction
- **Direction:** Modern technical dashboard (Shadcn-inspired).
- **Decoration level:** Minimal. Typography and grid drive the design; avoid unnecessary ornament.
- **Mood:** Precise, professional, and reliable—like a high-end engineering tool, not a consumer app.
- **Core vibe:** “The control center for your AI infrastructure.”

## Typography
- **Display/Hero:** **Geist Sans** — modern, balanced, high-tech feel.
- **Body:** **Geist Sans** — strong readability for long lists and data.
- **UI/Labels:** Mostly **Geist Sans**, with mono treatment used in shell chrome and dense controls where compactness matters.
- **Data/Tables:** **Geist Mono** — monospace for numbers, token counts, costs, and IDs for visual alignment.
- **Code:** **Geist Mono**.
- **Scale:** Modular scale anchored to 8px (0.5rem).
  - Base: 16px (1rem)
  - Small: 14px (0.875rem) — most UI labels.
  - Large: 18px (1.125rem)
  - H1: 30px (1.875rem)

## Color
- **Approach:** Balanced—neutral grayscale canvas with high-saturation indigo accents.
- **Primary:** `hsl(239 84% 67%)` (#6E73FF) — primary actions, selected states, and brand identity.
- **Background:**
  - Light: `hsl(0 0% 100%)`
  - Dark: `hsl(240 10% 3.9%)`
- **Foreground:**
  - Light: `hsl(240 10% 3.9%)`
  - Dark: `hsl(0 0% 98%)`
- **Neutrals (Slate-based):**
  - Border: `hsl(240 5.9% 90%)` (Light) / `hsl(240 3.7% 15.9%)` (Dark)
  - Muted: `hsl(240 4.8% 95.9%)` (Light) / `hsl(240 3.7% 15.9%)` (Dark)
- **Semantic:**
  - Success: Emerald
  - Warning: Amber
  - Error/Destructive: Rose/Red (`hsl(0 84.2% 60.2%)`)
  - Info: Blue

## Spacing & Layout
- **Base unit:** 4px / 8px.
- **Density:** Comfortable spacing on dashboards; compact layout for data tables.
- **App shell:** Sidebar is `w-64` (256px) and top bar is `h-14` (56px).
- **Border radius:** Buttons, cards, and inputs use 0.5rem (8px) consistently (`rounded-lg` or `rounded-md`).
- **Container:** No single global width token. Most content areas use centered page wrappers ranging from `max-w-4xl` to `max-w-7xl` depending on the module.

## Components
- **Buttons:** Solid primary for main actions; outline or ghost for secondary actions.
- **Cards:** White / dark gray background, thin border, very light shadow (`shadow-sm`).
- **Tables:** Clean row styling with hover states; numeric columns use monospace.
- **Charts:** Area/Bar/Donut charts should lead with primary indigo, with series differentiated by opacity or tone.
- **Shell chrome:** Sidebar and top bar use mono, uppercase, wide-tracking labels to create a technical control-panel feel.
- **Member dashboard:** Uses a darker translucent treatment in several cards and charts to differentiate the analytics experience from the admin/manager shells.

## Motion
- **Approach:** Minimal, utility-focused motion.
- **Transitions:** Hover and toggles use 200ms consistently.
- **Easing:** `cubic-bezier(0.4, 0, 0.2, 1)`.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-18 | Initialize design spec | Extracted from existing `resources/` and normalized to shadcn/ui patterns. |
