---
watermark: ORIRO
disable-model-invocation: true
name: ecommerce-builder
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >

  E-commerce development — product catalog, cart, checkout, payments, order management, and e-commerce best practices.




  Sources: Stripe docs, Anthropic docs, Sanity/Contentful docs, industry-specific technical resources.
---

# E-Commerce Development

## Core data models

```prisma
model Product {
  id          String    @id @default(cuid())
  name        String
  slug        String    @unique
  description String?
  price       Int       // Always store money in cents/smallest unit
  comparePrice Int?     // "Was" price for sale display
  inventory   Int       @default(0)
  images      String[]  // URLs
  variants    Variant[]
  categories  Category[]
  published   Boolean   @default(false)
}

model Order {
  id          String      @id @default(cuid())
  userId      String?     // Null for guest checkout
  status      OrderStatus @default(PENDING)
  items       OrderItem[]
  subtotal    Int         // In cents
  tax         Int
  shipping    Int
  total       Int
  shippingAddress Json
  paymentIntentId String? @unique // Stripe PaymentIntent ID
}
```

## Cart implementation

**Server-side cart (recommended for logged-in users):** Persists across devices. Merge with guest cart on login.
**Client-side cart (guest):** localStorage or cookie. Simple but doesn't persist across devices.

```ts
// Cart stored in DB for logged-in users
// Merge on login: combine guest cart items with any existing saved cart

async function mergeCarts(guestCartId: string, userId: string) {
  const guestCart = await getCart(guestCartId);
  const userCart = await getOrCreateCart(userId);

  for (const item of guestCart.items) {
    await upsertCartItem(userCart.id, item.productId, item.quantity);
  }
  await deleteCart(guestCartId);
}
```

## Checkout flow

1. Cart review → 2. Shipping address → 3. Shipping method → 4. Payment → 5. Review → 6. Confirm

**Stripe Payment Intent flow:**

```ts
// Create PaymentIntent when customer reaches payment step
const paymentIntent = await stripe.paymentIntents.create({
  amount: order.total,
  currency: "usd",
  automatic_payment_methods: { enabled: true },
  metadata: { orderId: order.id },
});

// Return client_secret to frontend for Stripe Elements
return { clientSecret: paymentIntent.client_secret };
```

**Webhook confirms payment:**

```ts
case 'payment_intent.succeeded':
  const paymentIntent = event.data.object;
  const orderId = paymentIntent.metadata.orderId;
  await db.order.update({
    where: { id: orderId },
    data: { status: 'CONFIRMED', paymentIntentId: paymentIntent.id }
  });
  await sendOrderConfirmationEmail(orderId);
  await decrementInventory(orderId);
```

## Inventory management

**Optimistic reservation:** Reserve on add-to-cart (release after 30 min if not purchased).
**Hard reservation:** Reserve on checkout initiation.
**Commit:** Reduce inventory on payment confirmation.
**Oversell protection:** Use database transactions with SELECT FOR UPDATE or PostgreSQL advisory locks.

## Search and filtering

**Product search:** PostgreSQL full-text search for small catalogs. Algolia, Typesense, Meilisearch for larger catalogs.
**Faceted filtering:** Filter by category, price range, attributes simultaneously.
**Sorting:** By relevance, price (asc/desc), newest, best-selling.

## E-commerce SEO

**URL structure:** `/products/category/product-name-slug` — descriptive, stable.
**Structured data:** Product schema with price, availability, reviews.
**Canonical URLs:** For products appearing in multiple categories.
**Sitemap:** Auto-generated including all published products.

Sources: Stripe documentation (free), Shopify Commerce API docs (free, good patterns reference), Next.js Commerce template (open source), Medusa.js (open source e-commerce)
