# 06 — Design System

**Purpose:** Define the current UpNexx UI foundation and reusable implementation standards  
**Status:** Approved  
**Last Updated:** 2026-07-28  
**Intended Audience:** Designers, frontend developers, QA, and content authors

## Contents

1. [Current implementation](#current-implementation)
2. [Foundations](#foundations)
3. [Components](#components)
4. [Surface guidance](#surface-guidance)
5. [Accessibility and responsive behavior](#accessibility-and-responsive-behavior)
6. [Standards and gaps](#reusable-component-standards)

## Current implementation

The repository uses Tailwind CSS, CSS variables, Manrope, Inter, Lucide icons, and local reusable components. shadcn/ui is **not installed**. Core components live in `components/ui`; product shells, content cards, feedback states, and brand components live in domain folders.

## Principles

1. Premium, calm, and professional—not decorative or noisy.
2. Light application canvas with a navy navigation spine.
3. Violet primary actions, cyan selective highlights, and semantic status colors.
4. Tenant-brand flexibility without weakening readability or platform-admin identity.
5. Reusable states for loading, empty, error, success, and confirmation.

## Foundations

### Color tokens

The canonical values are in [Brand Guidelines](02_Brand_Guidelines.md). `app/globals.css` defines `--upnexx-*` variables; `tailwind.config.ts` maps `brand`, `accent`, `highlight`, `success`, `warning`, `danger`, and `info`.

```css
:root {
  --upnexx-midnight: #03071e;
  --upnexx-navy: #08112b;
  --upnexx-violet: #7c3aed;
  --upnexx-cyan: #06b6d4;
  --upnexx-white: #f8fafc;
  --upnexx-gradient: linear-gradient(135deg, #06b6d4 0%, #7c3aed 55%, #9333ea 100%);
}
```

### Typography

- Display: Manrope, 600–800.
- Body/control: Inter, 400–600.
- Prefer 45–75 characters per body line.
- Use semantic heading levels; visual size must not replace hierarchy.

### Spacing and grid

- Tailwind’s 4px-derived scale is the implementation baseline.
- Page content uses `Container` with a `72rem` maximum.
- Component padding is generally 16–32px.
- Marketing sections use larger 64–96px vertical rhythm.
- Responsive grids collapse from multi-column to single-column without horizontal scrolling.

### Radius and shadow

- Small controls: 8px.
- Standard cards/inputs: 12–16px.
- Large marketing panels: 24–32px.
- `shadow-card` for surfaces, `shadow-lift` for emphasis, `shadow-pop` for hero layers, and glow only on interactive hover.

## Components

| Pattern | Current standard |
| --- | --- |
| Buttons | Gradient primary; outlined secondary; quiet ghost; red destructive; visible focus |
| Forms | Explicit labels, hints, error text, required state, and accessible input names |
| Cards | White/light surface, cool border, restrained shadow, coherent padding |
| Tables | Responsive wrapper, labeled headers, readable row actions, empty state |
| Navigation | Dark sidebar, grouped categories, violet active state, mobile overflow navigation |
| Modals | Named dialog, focus entry, clear close/cancel, destructive confirmation |
| Alerts | Semantic role plus icon/text; status never represented by color alone |
| Badges | Compact labels for status/access; semantic color only |
| Empty states | Explain absence and provide the next available action |
| Loading states | Plain-language progress with spinner/skeleton; always exit on error |
| Error states | Human-readable recovery guidance; detailed errors remain server-side |
| Charts | Navy labels, violet primary series, cyan comparison, semantic colors only for status |

### AI interface patterns

- Identify the source content and tenant context.
- Show generation state, remaining credits, provider/model where useful, and review requirements.
- Citations are mandatory before member RAG is considered production ready.
- AI failures must preserve source input and provide a retry path.
- Never expose saved API keys; show only provider and last four characters.

## Surface guidance

### Dashboard

Use a light `brand-50` canvas, white cards, deep navy sidebar, violet active states, cyan focus/highlight, navy typography, and lavender supporting surfaces. Dense data may use tables; browsable member content should prefer visual cards.

### Marketing

Use midnight/navy backgrounds, restrained violet/cyan radial light, short outcome-led copy, product UI evidence, and clear calls to action. Avoid turning every section dark.

### Dark and light surfaces

- White or soft-white text on midnight/navy.
- Deep navy text on soft white.
- Muted slate text is acceptable on deep backgrounds only when contrast passes.
- Secondary dark buttons use a visible violet or white-alpha border.

## Accessibility and responsive behavior

- Target WCAG 2.2 AA and keyboard completeness.
- Breakpoint behavior follows Tailwind defaults (`sm`, `md`, `lg`, `xl`, `2xl`).
- Primary validation occurs at approximately 390px mobile and 1440–1536px desktop, with intermediate tablet review.
- Respect `prefers-reduced-motion`.
- Provide `aria-label` for icon-only actions, appropriate live regions, and non-empty alt text for meaningful imagery.
- Avoid hover-only access to critical actions.

## Reusable-component standards

- Put generic primitives in `components/ui`.
- Put business-aware reusable elements in a domain folder.
- Use typed variants rather than duplicating long class strings.
- Keep data fetching out of purely presentational components.
- Include loading, empty, error, and permission-denied states.
- Add component tests for behavior and Playwright coverage for critical workflows.

## Visual consistency rules

- Do not reintroduce lime, yellow-as-brand, or legacy bright-blue product colors.
- Do not hard-code official brand colors repeatedly.
- Use one primary action per decision area.
- Align icons, labels, and action placement across related content managers.
- Use tiles for discovery and lists/tables for high-volume administration.

## Implementation gaps

- No Storybook or automated visual snapshot baseline.
- Charting library and production chart components are not installed.
- Focus trapping and modal primitives need broader audit.
- Tenant color contrast is not automatically validated.
- shadcn/ui should only be adopted through an explicit migration decision.

## Open questions

- Should a component catalog be introduced before additional modules?
- Which tenant-brand customization values are safe without per-tenant contrast checks?
- What browser/device matrix is required for launch?

## Related documents

[Brand Guidelines](02_Brand_Guidelines.md) · [Testing and QA](14_Testing_and_Quality_Assurance.md) · [Security and Privacy](12_Security_and_Privacy.md)
