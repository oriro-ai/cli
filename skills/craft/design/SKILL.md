---
name: design
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: Master design skill combining frontend engineering, UI/UX strategy, and canvas/visual creation. Activate for ANY design request — web components, landing pages, dashboards, apps, posters, banners, illustrations, social graphics, mockups, or any visual artifact. Triggers on: /design command, "design this", "make it look better", "create a UI", "build a layout", "make a poster", "create a banner", "design a logo", "build a dashboard", "make this beautiful", "improve the UI", "canvas design", "visual design", "UX this", "wireframe", "mockup", "brand design", or any request where the primary deliverable is visual. Do NOT skip this skill for any design task — it contains critical aesthetic rules and production patterns that elevate every output.
---

# /design — Master Design Skill

Three disciplines. One prompt. Always use this skill for any design task.

## DISCIPLINE 1 — Frontend Design Engineering

Production-grade frontend code with exceptional aesthetic quality. No generic AI slop.

Before writing a line of code — commit to a direction:

- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Pick ONE extreme and own it:
  - Brutally minimal / Maximalist / Retro-futuristic / Organic / Luxury
  - Playful / Editorial / Brutalist / Art deco / Soft pastel / Industrial
  - Glassmorphism / Neobrutalism / Swiss grid / Memphis / Vapor wave
- **Differentiation**: What is the ONE thing someone will remember about this?

**Typography rules:**

- Never: Inter, Roboto, Arial, system-ui as primary display font
- Always: pair a distinctive display font with a refined body font
- Options: Clash Display, Cabinet Grotesk, General Sans, Instrument Serif, Bebas Neue, Editorial New, Neue Machina, Space Mono (sparingly), Playfair Display, DM Serif Display
- Size scale: dramatic contrast between display and body (80px vs 16px)
- Letter spacing: -0.02em to -0.04em for large display, +0.08em for caps labels

**Color rules:**

- Use CSS variables for every color — never hardcode hex in components
- Dominant color (70%) + secondary (20%) + accent (10%) — never equal distribution
- Dark themes: never pure #000000 — use #0A0A0F, #0F0F1A, #111118
- Light themes: never pure #FFFFFF — use #FAFAF8, #F8F9FF, #FFFFF0
- Accent colors that POP: electric lime, hot coral, acid yellow, neon mint

**Motion rules:**

- Page load: staggered reveals with animation-delay (0ms, 80ms, 160ms, 240ms)
- Hover states: transform + opacity together (never just color change)
- Scroll: intersection observer for reveal animations
- Timing: ease-out for enters, ease-in for exits, spring for interactive
- Duration: 200ms for micro-interactions, 400ms for transitions, 600ms for reveals

**Spatial composition:**

- Break the grid intentionally — one element per layout should escape its column
- Generous negative space OR controlled density — never mediocre middle ground
- Asymmetry creates tension — use it deliberately
- Overlap elements to create depth
- Diagonal flow lines guide the eye

**Backgrounds and atmosphere:**

- Gradient meshes with 4+ color stops
- Noise texture overlay (opacity: 0.03-0.08) on flat colors
- Grain effect via SVG filter or canvas
- Dramatic drop shadows (0 40px 80px rgba(0,0,0,0.15))
- Glassmorphism: backdrop-filter blur(20px) + subtle border

**Implementation:**

- HTML artifacts: single file, inline CSS + JS, no external dependencies except CDN fonts
- React artifacts: Tailwind core utilities only, no custom CSS unless necessary
- Always: CSS custom properties, semantic HTML, keyboard accessible
- Never: inline styles scattered everywhere, !important, z-index wars

## DISCIPLINE 2 — UI/UX Pro Max

Strategic UX thinking before any pixel. Design that converts, retains, and delights.

**UX Audit (run mentally before designing):**

- Jobs to be done: What is the user trying to accomplish in one sentence?
- Current friction: What are the 3 biggest points of failure or confusion?
- Desired emotion: How should the user FEEL after completing the task?
- Success metric: What single number proves this design works?

**The 5 UX laws to apply:**

1. **Fitts's Law** — Interactive targets must be large enough and close enough
   - Minimum tap target: 44x44px mobile, 32x32px desktop
   - Primary CTA: never smaller than 48px height
   - Destructive actions: separated from constructive ones by space or color

2. **Hick's Law** — Reduce choices to reduce decision time
   - Navigation: max 5-7 primary items
   - Forms: one question per screen for complex flows
   - Pricing: highlight ONE recommended option, not three equal ones

3. **Miller's Law** — Chunk information into groups of 7±2
   - Break long forms into logical sections with headers
   - Progressive disclosure: show advanced options behind "Advanced settings"
   - Data tables: max 6-7 columns before horizontal scroll or collapsing

4. **Jakob's Law** — Users expect familiar patterns
   - Search: top right or top center
   - Logo: top left links to home
   - Primary CTA: contrasting color, above the fold
   - Deviate from convention only when there is a strong reason

5. **Peak-End Rule** — Users remember the best/worst moment and the ending
   - Make the success state (form submitted, purchase complete) memorable and delightful
   - The empty state is the beginning — make it welcoming, not barren
   - Error states must feel helpful, not punishing

**Component design patterns:**

Forms:

- Labels above fields (never floating labels — they confuse users)
- Inline validation on blur, not on every keystroke
- Error messages below the field in red, success icon inside the field
- Progress indicator for multi-step (always show where user is)
- Primary action button: right-aligned and labeled with the outcome ("Save changes" not "Submit")

Navigation:

- Active state must be unambiguous (color + weight, never just underline)
- Mobile: bottom tab bar for 3-5 primary destinations
- Breadcrumbs for deep hierarchies (3+ levels)
- Search is navigation — never hide it

Data display:

- Empty states need: illustration, headline, body, and a CTA
- Loading states: skeleton screens (not spinners) for content areas
- Error states: explain what happened + what to do next
- Pagination vs infinite scroll: pagination for search results, infinite for feeds

Modals and overlays:

- Darken backdrop to 60% opacity minimum
- Close on backdrop click AND escape key
- Never trap keyboard focus outside the modal
- Max width: 560px for simple dialogs, 720px for complex forms

**Accessibility (non-negotiable):**

- Color contrast: 4.5:1 minimum for body text, 3:1 for large text
- Focus states: visible and styled (not browser default ring)
- Alt text: describe the function, not the appearance ("Submit button" not "Arrow icon")
- ARIA labels on icon-only buttons
- Headings: logical hierarchy (never skip H2 to H4)

**Responsive breakpoints:**

- Mobile: 375px (design here first)
- Tablet: 768px
- Desktop: 1280px
- Wide: 1440px+
- Never: breakpoints based on device names (use content-based breakpoints)

## DISCIPLINE 3 — Canvas and Visual Design

Posters, banners, social graphics, illustrations, brand assets, and anything that lives outside the browser.

**Visual hierarchy framework:**
Every visual has ONE primary focal point. Everything else supports it.

- **Level 1 — Dominant** (the thing the eye lands on first):
  - Largest element, highest contrast, most saturated color
  - Usually the main headline or hero image
  - Only ONE dominant element per composition
- **Level 2 — Secondary** (guides after the dominant):
  - Supporting headline, product image, key visual
  - 60-70% of the dominant's visual weight
- **Level 3 — Supporting** (context and detail):
  - Body copy, captions, metadata
  - Subtle, never competing with Level 1 or 2

**Grid systems for canvas work:**

Social media (9:16 vertical):

- Safe zone: 15% margin on all sides for mobile crops
- Text: max 20% of frame area (platform guideline)
- Logo: bottom 20% or top 20%

Poster (standard: 24×36 or A1):

- Column grid: 12 columns with 4% gutters
- Baseline grid: 8px or 12px
- Margins: minimum 5% of shortest dimension

Banner (horizontal: 16:9, 3:1, 8:1):

- Keep critical content in center 60% (edges get cut on some platforms)
- Text: max 30% of frame area
- Contrast ratio: 7:1 minimum (banners are viewed at distance)

**Color palettes for visual design:**

Building a palette:

- Start with one brand/hero color
- Create a monochromatic scale (50% lighter, 25% lighter, base, 25% darker, 50% darker)
- Add one complementary accent (180° on color wheel)
- Add one neutral (warm or cool, not both)
- Define one "danger" color (always red-family)

Contrast techniques:

- Light text on dark: add 5% opacity white overlay to soften pure black backgrounds
- Dark text on light: use #0F0F0F not #000000 for less harsh rendering
- Colored text: desaturate 10-15% when using on white — pure saturated colors strain eyes

**Typography for print/visual:**

- Display sizes: 72px, 96px, 120px, 144px (go big or go home)
- Body on print: minimum 9pt (never smaller — unreadable in print)
- Line height for headlines: 0.9-1.0 (tighter than web)
- Line height for body: 1.4-1.6
- Tracking for all-caps: +0.08em minimum
- Widows/orphans: never end a paragraph with a single word on its own line

**SVG and illustration:**
When creating SVG illustrations:

- viewBox should be a clean ratio: 0 0 800 600, 0 0 400 400, etc.
- Use CSS variables for colors inside SVG (enables theme switching)
- Group related elements with `<g>` and meaningful IDs
- Optimize: no unnecessary transforms, combine paths where possible
- Animation: prefer CSS animation over SMIL for SVG elements

**Icon design rules:**

- Consistent stroke width across all icons in a set (2px or 1.5px)
- Optical size compensation: round icons need to be slightly larger than square ones
- Minimum size: 16×16px, preferred: 24×24px
- Grid: design on a 24×24px canvas with 2px padding

## OUTPUT DECISION TREE

Before producing any design output:

- Is this a **web component, page, or app**? → DISCIPLINE 1 (Frontend) + DISCIPLINE 2 (UX) → Produce working HTML/CSS/JS or React code
- Is this a **poster, banner, social graphic, or print asset**? → DISCIPLINE 3 (Canvas) + DISCIPLINE 2 (UX) → Produce SVG artifact or styled HTML canvas
- Is this a **dashboard or data visualization**? → All three disciplines → Produce React with recharts or D3, full UX audit
- Is this a **mockup or wireframe**? → DISCIPLINE 2 (UX) first, then DISCIPLINE 3 for visual → Produce clean SVG wireframe or styled HTML mockup
- Is this a **brand/logo/identity system**? → DISCIPLINE 3 (Canvas) → Produce SVG with color palette, typography guide, usage rules

## QUALITY CHECKLIST

Before delivering any design output, verify:

- [ ] Clear visual hierarchy — one dominant element
- [ ] Typography is distinctive (not Inter/Roboto/Arial as display)
- [ ] Colors use CSS variables, not scattered hex values
- [ ] Mobile responsive at 375px (for web work)
- [ ] Hover and focus states defined
- [ ] Empty and error states designed (for UI work)
- [ ] Animations have purpose, not decoration
- [ ] Contrast meets 4.5:1 minimum
- [ ] The design has ONE memorable, distinctive quality

## NEVER DO

- Generic purple gradient on white background
- Inter or Roboto as the only font
- Equal visual weight on every element (no hierarchy)
- Animations that serve no purpose
- Pure #000000 or #FFFFFF (use near-black/near-white)
- Three primary CTAs competing for attention
- Hamburger menu on desktop
- Text over busy images without scrim/overlay
- Clipart or stock icon aesthetics
- Symmetric layouts when asymmetry would create energy
