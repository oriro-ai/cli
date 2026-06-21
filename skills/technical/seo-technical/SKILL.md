---
name: seo-technical
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >
  Technical SEO — crawlability, Core Web Vitals, structured data, sitemaps, robots.txt, canonical URLs, and SEO for web apps.











  Sources: Google Search Central, GDPR text, AWS security documentation, Stripe API docs.
---

# Technical SEO

## Crawlability and indexability

### robots.txt

```
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /_next/

# Google News specific
User-agent: Googlebot-News
Allow: /news/

Sitemap: https://example.com/sitemap.xml
```

Test at: Google Search Console → URL Inspection tool.

### Sitemap

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/</loc>
    <lastmod>2024-01-15</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
```

Submit to: Google Search Console + Bing Webmaster Tools.
Auto-generate in Next.js: `app/sitemap.ts` returns `MetadataRoute.Sitemap`.

### Canonical URLs

Prevent duplicate content penalties.

```html
<link rel="canonical" href="https://example.com/page" />
```

Use when: Content accessible at multiple URLs (UTM params, sort orders, pagination).

## Core Web Vitals

### LCP (Largest Contentful Paint) — target < 2.5s

Optimize: Preload LCP image, server response time, critical CSS inline.

```html
<!-- Preload LCP image -->
<link rel="preload" fetchpriority="high" as="image" href="/hero.webp" />
```

### INP (Interaction to Next Paint) — target < 200ms

Replace FID from March 2024. Measures responsiveness to all interactions.
Optimize: Reduce long tasks (> 50ms), defer non-critical JavaScript.

### CLS (Cumulative Layout Shift) — target < 0.1

Optimize: Set explicit width/height on images and embeds, avoid inserting content above existing.

```html
<!-- Always include dimensions to reserve space -->
<img src="..." width="800" height="450" alt="..." />
```

## Structured data

Enables rich results in Google (review stars, FAQs, recipes, breadcrumbs).

```html
<script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Article Title",
    "author": { "@type": "Person", "name": "Author Name" },
    "datePublished": "2024-01-15",
    "image": "https://example.com/image.jpg",
    "publisher": {
      "@type": "Organization",
      "name": "Site Name",
      "logo": { "@type": "ImageObject", "url": "https://example.com/logo.png" }
    }
  }
</script>
```

Test: Google Rich Results Test (search.google.com/test/rich-results).

## SEO for JavaScript apps

**Problem:** Googlebot may not execute JavaScript well/quickly.
**Solution:** Server-side rendering (Next.js, Nuxt) or Static Site Generation.
**Check:** Use `Cache: no-store` during development and view Google's rendered version in Search Console.
**Next.js app router:** All pages server-rendered by default. No extra work needed.

## Core SEO on-page factors

**Title tag:** 50-60 characters. Primary keyword. Each page unique.
**Meta description:** 120-160 characters. Call to action. Not a ranking factor but affects CTR.
**H1:** One per page. Contains primary keyword. Matches search intent.
**Content quality:** Comprehensive, original, satisfies search intent. Length varies by keyword.
**Internal linking:** Link related pages together. Helps crawling and distributes authority.
**Page speed:** Both a ranking factor and UX factor. See performance-optimization skill.

Sources: Google Search Central documentation (developers.google.com/search — free), web.dev SEO (free), Core Web Vitals documentation (web.dev/vitals — free)
