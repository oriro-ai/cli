---
watermark: ORIRO
name: oriro-ui-2026
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >
  THE latest (mid-2026) front-end UI/UX/motion/3D skill for ORIRO. Activate for ANY
  UI work — landing pages, app shells, dashboards, hero sections, agent/Forge UI,
  Sites builder, animations, scroll effects, 3D/WebGL scenes, video heroes, glass/
  gradient/mesh surfaces, micro-interactions, theming, dark mode. Triggers: "make it
  modern", "latest UI", "animate", "3D", "hero", "scroll effect", "make it beautiful",
  "improve the UI", "redesign", "polish", "gradient", "WebGL", "parallax", "particles",
  any front-end build. This skill pins the CURRENT 2026 stack and version-locks every
  library so output is current, not dated. Use ALONGSIDE the public frontend-design
  skill (aesthetic judgment) — this skill is the IMPLEMENTATION layer with the modern
  libraries frontend-design does not name.
last_verified: 2026-06-14 (web-verified library landscape + versions)
---

# ORIRO UI 2026 — the current front-end stack

This skill exists because the base design skills teach _taste_ (hierarchy, type,
restraint) but do NOT name the current motion/3D libraries. This is the
implementation layer. Pair it with `frontend-design` (judgment) and `/design`
(tokens) — this one is the _how_, with 2026 libraries.

**Hard rule for ORIRO: OR-FREE-FOREVER.** Every library below is free + MIT/Apache/
open-source and runs client-side ($0 to user, $0 to ORIRO). No paid-tier components,
no premium blocks, no external runtime calls. Where a library has a paid tier
(Aceternity premium, GSAP business plugins), use ONLY the free/open parts and
re-implement the rest natively. Verify each library's license before adding it.

---

## THE STACK (verified current, mid-2026) — version-pin these

Confirm latest patch with `npm view <pkg> version` before install; these are the
correct CURRENT major lines as of 2026-06.

### Motion / animation (2D, the everyday layer)

- **Motion** (`motion`) — formerly Framer Motion, now shipped as `motion`. The
  default React animation choice in 2026: declarative `animate`, `AnimatePresence`
  for enter/exit, layout animations, gestures, scroll, springs, timelines. Hybrid
  engine, 120fps GPU-accelerated. THIS is the spine of ORIRO's motion. `npm i motion`
  → `import { motion, AnimatePresence } from "motion/react"`.
- **GSAP** (`gsap`) + ScrollTrigger — professional-grade timeline orchestration for
  complex, multi-tween, scroll-driven sequences (the cinematic hero moments). Use
  when Motion's declarative model is awkward for 6–7 orchestrated tweens on a
  timeline. Free core + ScrollTrigger are open. `useGSAP()` hook for React.
- **Native CSS** — `linear()` easing now does spring-like motion with zero runtime;
  `@keyframes` + `animation-delay` staggers; `scroll-timeline` for scroll-driven
  CSS. Prefer this for simple micro-interactions — no bundle cost. Reach for a
  library only when CSS can't express it.

### Scroll

- **Lenis** (`lenis`, by darkroom.engineering) — the standard smooth-scroll /
  inertia layer in 2026. Pairs with Motion or GSAP ScrollTrigger. Lightweight.
  This is what gives a site that "expensive" smooth-scroll feel.

### 3D / WebGL (the depth ORIRO is missing)

- **Three.js** (`three`) — the WebGL engine.
- **React Three Fiber** (`@react-three/fiber`) — declarative React renderer for
  Three.js. THIS is how you do 3D in a React app without imperative spaghetti.
- **drei** (`@react-three/drei`) — the helper kit on top of R3F: `<OrbitControls>`,
  `<Environment>`, `<Float>`, `<MeshDistortMaterial>`, `<ScrollControls>`,
  `<useGLTF>`, `<Sparkles>`, `<Stars>`, instancing helpers. 90% of 3D-on-web is
  drei components, not raw Three.
- **@react-three/postprocessing** — bloom, depth-of-field, chromatic aberration,
  the glow that makes 3D look premium.
- Rule: 3D is OPT-IN and performance-gated. Never auto-3D (ORIRO Sites rule: ASK
  the user 2D vs 3D). Lazy-load the R3F bundle; never block first paint with WebGL.

### Component layers (copy-in, not dependency lock-in)

- **shadcn/ui** — unstyled Radix primitives you copy into the repo and own. The
  base for ORIRO's design system. Already aligned with Tailwind + Next 15 App Router.
- **MagicUI** — animation-first components built on Motion + Tailwind: shimmer,
  sparkles, marquee, bento grids, animated beams, number tickers. Copy-in, free.
  Use for _components_ (reusable motion utilities).
- **Aceternity UI** — hero-section spectacle built on Motion: spotlight, 3D cards,
  parallax, mesh/aurora backgrounds. FREE blocks only (skip the $199 premium).
  Use for _moments_ (the hero, the one memorable surface).
  → Industry pattern in 2026: MagicUI for components, Aceternity for moments,
  shadcn for the system. ORIRO copies the free parts and owns the code.

### Illustrative / vector motion

- **Lottie** (`lottie-react`) — render After Effects JSON animations (complex
  illustrative motion impractical to hand-code). Free.
- **Rive** (`@rive-app/react-canvas`) — real-time interactive vector animations,
  state-machine driven. Lighter than Lottie for interactive bits.

### Video (hero video, NARVO surfaces)

- **Native `<video>`** with `playsInline muted autoplay loop` + a poster + a
  gradient scrim overlay = the standard hero-video pattern. No library needed.
- For programmatic/generated video stays in NARVO's engine (separate skill).
- Background video: always `object-fit: cover`, always a scrim for text contrast,
  always a static poster for first paint + reduced-motion fallback.

### Fonts (never the AI-default trio)

- NEVER primary: Inter, Roboto, Arial, system-ui.
- Display options: Clash Display, Cabinet Grotesk, General Sans, Neue Machina,
  Instrument Serif, Editorial New, Bricolage Grotesque, Geist (the 2026 favorites).
- Pair a characterful display with a clean body + a mono for data/code.
- Self-host via Fontsource (`@fontsource-variable/...`) — $0, no external call,
  OR-FREE-FOREVER compliant. Do NOT hot-link Google Fonts at runtime (external call).

---

## THE DECISION TREE — which tool for which job

```
Simple hover / fade / stagger?           → native CSS (no bundle)
React enter/exit, layout, gesture?        → Motion (motion/react)
Complex orchestrated timeline / scroll?   → GSAP + ScrollTrigger (+ useGSAP)
Smooth-scroll / inertia feel?             → Lenis
3D object / scene / immersive bg?         → R3F + drei (+ postprocessing), lazy-loaded
Glow / bloom on 3D?                       → @react-three/postprocessing
Reusable animated component?              → MagicUI (copy-in)
The ONE hero spectacle moment?            → Aceternity free block (copy-in) or custom
Illustrative AE animation?                → Lottie
Interactive vector / state-machine?       → Rive
Hero video?                               → native <video> + scrim + poster
Base components / design system?          → shadcn/ui (own the code)
```

---

## THE "NOT JUNK / NOT OLD-SCHOOL" RULES (what makes 2026 ≠ 2018)

1. **Depth, not flat.** Layered gradients, mesh gradients (4+ stops), soft large
   shadows (`0 40px 80px rgba(0,0,0,.15)`), subtle noise overlay (opacity .03–.08),
   glassmorphism (`backdrop-filter: blur(20px)` + 1px translucent border). Flat
   near-black panels are the "shady" look — add depth.
2. **Dark mode done right.** NEVER pure `#000`. Use `#0A0A0F` / `#0F0F1A` / `#111118`
   with a faint colored ambient glow (radial gradient at 3–6% opacity) so dark feels
   _rich_, not _cheap_. This directly fixes "when it turns dark it looks shady."
3. **A hero is a thesis.** The landing/app entry opens with ONE characteristic
   moment — animated 3D object, aurora/mesh background, a live demo, a scroll
   reveal — not a tool grid. Spend boldness in ONE place; keep everything else quiet.
4. **Motion with purpose, 120fps.** Page-load staggered reveals (0/80/160/240ms),
   scroll-triggered reveals (intersection observer / ScrollTrigger), hover =
   transform+opacity together. GPU-accelerated transforms only (`transform`,
   `opacity` — never animate `width/top/left`). Respect `prefers-reduced-motion`.
5. **Progressive disclosure** (ORIRO product rule). Big primary action (chat/
   describe box LARGE); reveal controls only when relevant; ask via chat. No wall
   of options on day 1. No box-in-box (one scroll context per panel).
6. **Type carries personality.** Distinctive display face, dramatic scale contrast
   (display 72–144px vs body 16px), tight tracking on display (-0.02 to -0.04em),
   wide on caps labels (+0.08em).
7. **Spacing rhythm.** An 8px (or 4px) baseline grid; generous negative space OR
   controlled density — never the mediocre middle. Break the grid intentionally
   once per layout.
8. **Performance is a feature.** Lazy-load 3D/video, code-split heavy routes,
   skeleton screens not spinners, `content-visibility` for long lists, never block
   first paint with WebGL. A janky 3D site is worse than a crisp 2D one.

---

## QUICK-START SETUP (Next 15 App Router + Tailwind — ORIRO's stack)

```bash
# core motion + scroll (everyday)
npm i motion lenis
# 3D (opt-in, lazy-loaded route/section only)
npm i three @react-three/fiber @react-three/drei @react-three/postprocessing
# orchestration (cinematic timelines)
npm i gsap
# illustrative motion (as needed)
npm i lottie-react @rive-app/react-canvas
# fonts self-hosted (OR-FREE-FOREVER, no runtime external call)
npm i @fontsource-variable/geist @fontsource-variable/bricolage-grotesque
# shadcn — copy components in (owns the code)
npx shadcn@latest init
# MagicUI / Aceternity — copy the FREE component source into /components, do not
# add a paid dependency. Verify MIT/free license per component.
```

Always confirm the current patch: `npm view motion version`, `npm view three version`,
`npm view @react-three/fiber version`, etc. Pin in package.json.

---

## CORE PATTERNS (copy-ready, ORIRO-correct)

### 1. Rich dark surface (fixes "dark looks shady")

```css
.surface {
  background:
    radial-gradient(120% 120% at 50% 0%, rgba(99, 102, 241, 0.06), transparent 60%), #0b0b12; /* never #000 */
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 40px 80px rgba(0, 0, 0, 0.35);
}
.glass {
  /* glassmorphism panel */
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(20px) saturate(140%);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.noise::after {
  /* subtle grain over flat color */
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.05;
  background-image: url("data:image/svg+xml,..."); /* SVG fractalNoise */
}
```

### 2. Staggered page-load reveal (Motion)

```tsx
import { motion } from "motion/react";
const stagger = { show: { transition: { staggerChildren: 0.08 } } };
const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};
<motion.div variants={stagger} initial="hidden" animate="show">
  {items.map((x) => (
    <motion.div key={x.id} variants={item}>
      {x.label}
    </motion.div>
  ))}
</motion.div>;
```

### 3. Scroll-driven cinematic timeline (GSAP + ScrollTrigger + Lenis)

```tsx
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);
// Lenis drives smooth scroll; ScrollTrigger reads it:
useGSAP(
  () => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: ref.current,
        start: "top top",
        end: "+=1200",
        scrub: true,
        pin: true,
      },
    });
    tl.to(".layer-a", { y: -200, ease: "none" }).to(".layer-b", { scale: 1.2, opacity: 1 }, 0);
  },
  { scope: ref },
);
```

### 4. Lazy 3D hero (R3F + drei, opt-in, never blocks paint)

```tsx
import dynamic from "next/dynamic";
const Scene = dynamic(() => import("./Scene"), { ssr: false, loading: () => <Poster /> });
// Scene.tsx
import { Canvas } from "@react-three/fiber";
import { Float, Environment, MeshDistortMaterial } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
export default function Scene() {
  return (
    <Canvas camera={{ position: [0, 0, 5] }} dpr={[1, 2]}>
      <Environment preset="city" />
      <Float speed={2} rotationIntensity={1}>
        <mesh>
          <icosahedronGeometry args={[1.4, 8]} />
          <MeshDistortMaterial distort={0.4} speed={2} color="#6366f1" />
        </mesh>
      </Float>
      <EffectComposer>
        <Bloom luminanceThreshold={0.2} intensity={0.8} />
      </EffectComposer>
    </Canvas>
  );
}
```

(R3F r128 caveat: no `OrbitControls` from three core / no `CapsuleGeometry`; use drei
`<OrbitControls>` and Cylinder/Sphere geometries — matches ORIRO artifact constraints.)

### 5. Hero video with scrim + reduced-motion fallback

```tsx
<div className="relative">
  <video
    autoPlay
    muted
    loop
    playsInline
    poster="/hero-poster.avif"
    className="absolute inset-0 h-full w-full object-cover"
    aria-hidden /* decorative */
  />
  <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B12] via-[#0B0B12]/40 to-transparent" />
  <div className="relative z-10">{/* headline */}</div>
</div>
/* @media (prefers-reduced-motion: reduce){ video{display:none} .poster{display:block} } */
```

---

## QUALITY GATES (verify before "done" — real run, not build-green)

- [ ] Dark mode is rich (#0A0A0F-class + ambient glow), not pure-black "shady".
- [ ] There is ONE hero moment, not a flat grid entry.
- [ ] Motion is GPU-only (transform/opacity), 120fps, purposeful, reduced-motion-safe.
- [ ] 3D (if used) is lazy-loaded, never blocks first paint, has a poster fallback.
- [ ] Distinctive display font (not Inter/Roboto), self-hosted (no runtime external call).
- [ ] Progressive disclosure (big primary action, controls revealed on use, no box-in-box).
- [ ] Responsive 375 → 1440+, real-device checked, no viewport clip at 100%.
- [ ] Contrast ≥ 4.5:1, visible focus, keyboard accessible.
- [ ] Every library is free/MIT/open (OR-FREE-FOREVER) — no paid block, no external runtime call.
- [ ] Verified by a real run on staging + eyeball — not just `tsc`/build green.

## NEVER

- Pure #000 / #FFF · Inter/Roboto as display · flat lifeless panels · auto-3D without
  asking · WebGL blocking first paint · animating width/top/left · box-in-box scroll ·
  paid component dependencies · runtime Google-Fonts hot-link · "coming soon" shown as
  if available · build-green claimed as done.
