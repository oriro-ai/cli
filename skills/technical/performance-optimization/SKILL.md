---
name: performance-optimization
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >






  Web performance optimization — profiling, bundle size, rendering, caching, CDN, database optimization, and measurement.





  Sources: Google Search Central, GDPR text, AWS security documentation, Stripe API docs.
---

# Web Performance Optimization

## Measure first, optimize second

**Never optimize without measuring.** Optimization without measurement = guessing.
**Tools:**

- Chrome DevTools Performance panel: CPU profiling, waterfall.
- Lighthouse: Overall score, specific recommendations.
- WebPageTest: Real-device testing, waterfall, filmstrip.
- Core Web Vitals report in Google Search Console: Real user data.

```bash
# Lighthouse CLI
npx lighthouse https://example.com --view

# Check bundle size
npx bundlesize
```

## Frontend performance

### Bundle optimization

```ts
// Dynamic imports — only load code when needed
const HeavyChart = dynamic(() => import('../components/HeavyChart'), {
  loading: () => <Spinner />,
  ssr: false // if not needed server-side
});

// Next.js bundle analyzer
// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({ enabled: process.env.ANALYZE === 'true' });
module.exports = withBundleAnalyzer({});
// Run: ANALYZE=true npm run build
```

**Tree shaking:** Import specific named exports, not entire libraries.

```ts
// BAD: Imports entire lodash (71KB)
import _ from "lodash";
const sorted = _.sortBy(arr, "name");

// GOOD: Import only what you use
import sortBy from "lodash/sortBy";
// Or use native alternatives
const sorted = [...arr].sort((a, b) => a.name.localeCompare(b.name));
```

### Image optimization

WebP: 25-35% smaller than JPEG. AVIF: 50% smaller but less support.

```html
<!-- Responsive images -->
<img
  srcset="image-320.webp 320w, image-640.webp 640w, image-1280.webp 1280w"
  sizes="(max-width: 640px) 320px, (max-width: 1280px) 640px, 1280px"
  src="image-1280.webp"
  alt="Description"
  width="1280"
  height="720"
  loading="lazy"  <!-- or "eager" for above-the-fold -->
/>
```

### Critical rendering path

```html
<!-- Preload critical resources -->
<link rel="preload" href="/fonts/inter.woff2" as="font" crossorigin />
<link rel="preload" href="/hero.webp" as="image" fetchpriority="high" />

<!-- Defer non-critical scripts -->
<script src="analytics.js" defer></script>
<script src="chat-widget.js" async></script>
```

**Inline critical CSS:** CSS required for above-the-fold content. Load rest async.

## Backend performance

### Database optimization

N+1 queries: The most common performance killer.

```ts
// BAD: N+1
const posts = await db.post.findMany();
for (const post of posts) {
  post.author = await db.user.findUnique({ where: { id: post.authorId } }); // N queries!
}

// GOOD: One query with include
const posts = await db.post.findMany({
  include: { author: { select: { id: true, name: true, avatar: true } } },
});
```

**EXPLAIN ANALYZE:** Run on slow queries. Look for: Sequential Scans on large tables (need indexes), high row estimates vs. actuals (stale statistics), Nested Loops on large datasets.

### Caching

```ts
// Redis caching with stale-while-revalidate pattern
async function getCachedData(key: string, fetchFn: () => Promise<any>, ttl: number) {
  const cached = await redis.get(key);
  if (cached) {
    // Refresh in background if close to expiry
    const ttlRemaining = await redis.ttl(key);
    if (ttlRemaining < ttl * 0.1) {
      fetchFn().then((data) => redis.setex(key, ttl, JSON.stringify(data)));
    }
    return JSON.parse(cached);
  }
  const data = await fetchFn();
  await redis.setex(key, ttl, JSON.stringify(data));
  return data;
}
```

**Cache layers (fastest to slowest):**
Browser cache → CDN cache → Application memory cache → Redis → Database

## CDN and edge

**Static assets:** 1-year cache with content hash in URL (file.abc123.js).
**HTML:** Short cache or cache-control: no-store for dynamic pages.
**API responses:** Cache GET responses at CDN when possible (public, not user-specific).
**Cloudflare Workers / Vercel Edge:** Move logic to edge for lower latency globally.

Sources: web.dev performance (free), Google Chrome DevTools documentation (free), Next.js optimization docs (free), WebPageTest (free tool)
