# 02 — Brand Guidelines

**Purpose:** Define the approved UpNexx product identity and its relationship to Nexx Jenn Technologies  
**Status:** Approved  
**Last Updated:** 2026-07-28  
**Intended Audience:** Product, design, engineering, marketing, sales, and partners

## Contents

1. [Brand architecture and messaging](#brand-architecture-and-messaging)
2. [Personality](#personality)
3. [Logo](#logo)
4. [Color](#color)
5. [Typography and iconography](#typography-and-iconography)
6. [Voice and tone](#voice-and-tone)
7. [Accessibility](#accessibility)

## Brand architecture and messaging

| Element | Approved usage |
| --- | --- |
| Product | **UpNexx** |
| Parent company | **Nexx Jenn Technologies** |
| Descriptor | **The Intelligent Content, Learning & Community Platform** |
| Primary message | **Transform your expertise into engagement, learning, and revenue.** |
| Supporting message | **Empower your members with personalized learning, AI-powered recommendations, vibrant communities, and experiences that inspire them to return again and again.** |
| Attribution | **Powered by Nexx Jenn Technologies** |

UpNexx has a distinct product identity. The Nexx Jenn gear may appear in parent-company references but must not serve as the UpNexx product logo.

## Personality

Intelligent, forward-looking, human-centered, empowering, professional, welcoming, practical, and growth-oriented. Avoid language or visuals that feel gimmicky, robotic, exclusive, or needlessly technical.

## Logo

The approved mark is a stylized U-shaped monogram whose right side becomes an upward arrow. It represents growth, progress, movement, and what comes next. The repository implements horizontal, stacked, icon, light, dark, monochrome, and favicon variants in `components/brand/UpNexxLogo.tsx` and `app/icon.svg`.

### Usage

- Preserve the mark’s proportions and internal negative space.
- Use the cyan–violet–purple gradient on approved light or dark surfaces.
- Use monochrome only where gradient reproduction is unavailable.
- Maintain clear space of at least one-half the icon width.
- Ensure the wordmark is readable at the selected size.
- Keep parent attribution separate from the product lockup.

### Incorrect usage

- Do not substitute the Nexx Jenn gear.
- Do not rotate, stretch, outline, bevel, or recolor the mark.
- Do not place gradient text on a competing photographic background.
- Do not combine “UpNexx” with “PodcastOS” in user-facing branding.

## Color

| Name | Hex | Role |
| --- | --- | --- |
| Midnight Navy | `#03071E` | Marketing background |
| Deep Navy | `#08112B` | Sidebar, typography, dark sections |
| Navy Slate | `#101936` | Elevated dark surface |
| Electric Violet | `#7C3AED` | Primary action and active state |
| Bright Purple | `#9333EA` | Gradient and emphasis |
| Electric Cyan | `#06B6D4` | Selective highlight and link |
| Cyan Glow | `#22D3EE` | Focus and dark-surface accent |
| Lavender | `#C4B5FD` | Supporting text and surface |
| Soft White | `#F8FAFC` | Light canvas and dark text |
| Cool Gray | `#CBD5E1` | Border and secondary text |
| Slate Gray | `#94A3B8` | Muted text |
| Muted Indigo | `#312E81` | Dark-theme border |
| Success | `#22C55E` | Success only |
| Warning | `#F59E0B` | Warning only |
| Error | `#EF4444` | Error/destructive only |

```css
background: linear-gradient(
  135deg,
  #06B6D4 0%,
  #7C3AED 55%,
  #9333EA 100%
);
```

Use navy and cool white structurally, violet for primary actions, and cyan selectively. Avoid large cyan text fields, constant glow, or using success/warning colors as decoration.

## Typography and iconography

- **Manrope:** display headings, metrics, and strong navigation labels.
- **Inter:** body copy, forms, tables, and supporting content.
- Maintain a clear heading hierarchy, readable line lengths, and sentence case.
- Use Lucide-style line icons with consistent stroke width.
- Prefer meaningful content imagery: creators teaching, members learning, real media, structured progress, and human collaboration.
- Avoid generic robots, neon circuitry, excessive stock-photo handshakes, and unrelated abstract AI art.

## Voice and tone

- Lead with the customer outcome, then explain the capability.
- Use plain business language and define technical terms.
- Be confident without claiming unsupported automation or results.
- Use “members” for a tenant’s audience and “tenants” for organizations using UpNexx.
- State whether AI output requires review and whether a feature is planned.

### Approved phrases

- “Turn what you know into what comes next.”
- “One intelligent platform for content, learning, and community.”
- “Source-grounded AI.”
- “Powered by Nexx Jenn Technologies.”

### Avoid

- “Fully autonomous”
- “Guaranteed revenue”
- “Train the AI on everything”
- “Unlimited” unless a documented limit and fair-use policy support it
- “Compliant” without naming evidence and scope
- “Podcast-only platform”

## Messaging hierarchy

1. Product name and descriptor
2. Outcome: engagement, learning, and revenue
3. Supporting member value
4. Capability proof
5. Trust and operational proof
6. Nexx Jenn Technologies attribution

### Sample hero

> **The Intelligent Content, Learning & Community Platform**  
> # Transform your expertise into engagement, learning, and revenue.  
> Empower your members with personalized learning, AI-powered recommendations, vibrant communities, and experiences that inspire them to return again and again.  
> **Start Free Trial** · **Book a Demo**

### Sample footer

> Empowering creators. Enriching communities. Driving growth.  
> Powered by Nexx Jenn Technologies

## Product family naming

- UpNexx Creator AI Studio
- UpNexx Member AI Assistant
- UpNexx Learning Paths
- UpNexx Community
- UpNexx Insights

Do not create new “UpNexx AI,” “NexxAI,” or parent-brand derivatives without an approved naming decision.

## Accessibility

- Target WCAG 2.2 AA.
- Body text contrast: at least 4.5:1; large text: at least 3:1.
- Never communicate status by color alone.
- Provide visible keyboard focus, text alternatives, reduced-motion support, and descriptive control names.
- Test gradient buttons at the actual text position; do not assume the entire gradient provides equal contrast.

## Correct and incorrect examples

| Correct | Incorrect |
| --- | --- |
| UpNexx on a midnight background | UpNexx written as Up Nexx, UPNEXX, or PodcastOS |
| Cyan used for a focused highlight | Cyan glow around every component |
| Tenant brand shown in tenant member space | UpNexx identity overwritten in platform-admin areas |
| “AI-generated draft—review before publishing” | “AI writes perfect content automatically” |
| Separate parent attribution | Gear incorporated into the UpNexx mark |

## Open questions

- Final trademark and domain usage review
- Approved co-branding rules for enterprise customers
- Formal downloadable asset package and minimum print sizes

## Related documents

[Design System](06_Design_System.md) · [Product Vision](01_Product_Vision.md) · [Decision Log](16_Decision_Log.md)
