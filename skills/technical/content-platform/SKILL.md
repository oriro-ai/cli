---
watermark: ORIRO
disable-model-invocation: true
name: content-platform
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >




  Content platform development — CMS, media management, publishing workflows, SEO, and content delivery.

  Sources: Stripe docs, Anthropic docs, Sanity/Contentful docs, industry-specific technical resources.
---

# Content Platform Development

## CMS architecture

### Headless CMS vs. traditional

**Traditional (WordPress):** CMS manages content AND presentation. Coupled.
**Headless:** CMS manages content only. Exposes content via API. Frontend is separate.
**Benefits of headless:** Use any frontend framework. Better performance. Multi-channel (web, mobile, voice, IoT).

### Headless CMS options

**Sanity:** Flexible content modeling. Real-time collaboration. GROQ query language. Generous free tier.
**Contentful:** Enterprise-grade. Strong CDN. Good API.
**Strapi:** Self-hosted (open source) or cloud. Full customization.
**Payload:** Code-first headless CMS. TypeScript native. Self-hosted. Growing fast.
**Directus:** Database-first. Wraps existing database.
**Notion as CMS:** Via Notion API for simple blogs. Limited but no setup.

### Content modeling (Sanity example)

```ts
// schemas/post.ts
export default {
  name: "post",
  title: "Blog Post",
  type: "document",
  fields: [
    { name: "title", title: "Title", type: "string", validation: (Rule) => Rule.required() },
    { name: "slug", title: "Slug", type: "slug", options: { source: "title" } },
    { name: "publishedAt", title: "Published At", type: "datetime" },
    { name: "author", title: "Author", type: "reference", to: [{ type: "author" }] },
    { name: "mainImage", title: "Main Image", type: "image", options: { hotspot: true } },
    {
      name: "categories",
      title: "Categories",
      type: "array",
      of: [{ type: "reference", to: [{ type: "category" }] }],
    },
    { name: "body", title: "Body", type: "array", of: [{ type: "block" }, { type: "image" }] },
  ],
};
```

## Media management

### Image optimization

```tsx
// Next.js Image component handles optimization automatically
import Image from "next/image";

<Image
  src={imageSrc}
  alt="Description"
  width={800}
  height={450}
  priority // For above-the-fold images
  placeholder="blur"
  blurDataURL={blurDataUrl}
/>;
```

**CDN:** Cloudflare Images, Vercel Image Optimization, Cloudinary (transform on-the-fly).
**Formats:** WebP for photos (25-35% smaller than JPEG). AVIF even smaller but less support.
**Responsive images:** Different sizes for different screen widths. srcset attribute.
**Lazy loading:** `loading="lazy"` for below-fold images. Native browser support.

### Video

**Upload:** Direct to Cloudflare Stream, Mux, or Vimeo.
**Never:** Serve raw video from your own servers at scale.
**HLS (HTTP Live Streaming):** Adaptive bitrate. Player downloads appropriate quality based on bandwidth.
**Thumbnails:** Auto-generate at upload. Store in CDN.

## Publishing workflows

### Draft/Published state

```prisma
model Post {
  id          String     @id @default(cuid())
  status      PostStatus @default(DRAFT)  // DRAFT, REVIEW, PUBLISHED, ARCHIVED
  publishedAt DateTime?
  scheduledFor DateTime? // Future publish
}
```

### Content versioning

Store all edits. Allow rollback to any previous version. Show diff between versions.
Simple: Store JSON snapshots in a revisions table with authorId and timestamp.

## SEO implementation

```tsx
// Next.js metadata API
export async function generateMetadata({ params }): Promise<Metadata> {
  const post = await getPost(params.slug);
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: [{ url: post.mainImage.url, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title: post.title },
  };
}
```

**Structured data (JSON-LD):** Article, BreadcrumbList, FAQPage schemas.
**Sitemap:** Auto-generated. Include all published content. Update on publish.
**RSS feed:** Still important for readers and podcast aggregators.
**Robots.txt:** Control crawler access.

Sources: Sanity documentation (sanity.io/docs — free), Next.js docs (nextjs.org/docs — free), MDN SEO guide (free), web.dev SEO (free)
