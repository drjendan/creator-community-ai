# Design System

The shared visual foundation for Creator Community AI. Build every screen from
these tokens and primitives so patterns stay consistent (spec §14, §24). This is
the platform default palette; **tenant themes override `--brand` / `--accent` at
runtime** — never hardcode a tenant's colors into a component.

## Tokens (`tailwind.config.ts`)

### Color
- **`brand-50…900`** — warm neutral scale (paper → ink). Backgrounds, text, borders.
  - Backgrounds: `brand-50` (page), `white` (cards). Borders: `brand-200`.
  - Text: `brand-900` (headings), `brand-700` (body), `brand-500` (muted), `brand-400` (placeholder).
- **`accent-50…900`** — warm gold accent. Eyebrows, links, focus rings, small highlights. Use sparingly.
- **Semantic** — `success`, `warning`, `danger`, `info`, each with `-soft` (bg) / `DEFAULT` / `-strong` (text).

### Type
- **Display**: `font-display` (Fraunces) for headings only.
- **Body**: `font-body` (Instrument Sans) for everything else.
- Heading sizes are controlled: **h1 caps at `text-5xl`**, h2 at `text-3xl`. Avoid oversized type (§9.1).

### Radius & shadow
- Radius: `rounded-lg` (controls), `rounded-2xl` (cards). Shadows: `shadow-card` (default), `shadow-lift`, `shadow-pop`. Keep shadows restrained (§9.1).
- Layout width: `max-w-content` (72rem) via `<Container>`.

## Primitives (`components/ui`)

Import from `@/components/ui`.

| Component | Purpose | Notes |
|---|---|---|
| `Button` | Actions | `variant`: primary \| secondary \| ghost \| destructive · `size`: sm \| md \| lg · pass `href` to render a Next `<Link>` |
| `Card`, `CardHeader`, `CardTitle` | Content containers | `padded={false}` to opt out of default padding |
| `Badge` | Status / labels | `tone`: neutral \| brand \| accent \| success \| warning \| danger \| info |
| `Container` | Page column | Centered, `max-w-content`, responsive gutters |
| `SectionHeading` | Eyebrow + heading + subtitle | `as="h1"` for page titles, `align="center"` optional |
| `Input`, `Textarea`, `Select` | Form controls | `invalid` prop wires `aria-invalid` + danger border |
| `Field`, `Label` | Form field wrapper | Wires label ↔ control, hint/error text with aria |

### Accessibility baseline (§14)
- All interactive elements show a visible focus ring (`focus-visible:ring-accent-500`).
- Form controls use `Field` for label association and error messaging.
- Buttons/links are semantic elements; keyboard operable by default.

## Usage example

```tsx
import { Container, SectionHeading, Card, Button, Badge } from "@/components/ui";

<Container>
  <SectionHeading eyebrow="Podcast" title="Latest episodes" />
  <Card>
    <Badge tone="accent">New</Badge>
    <Button href="/podcast">Browse all</Button>
  </Card>
</Container>
```
