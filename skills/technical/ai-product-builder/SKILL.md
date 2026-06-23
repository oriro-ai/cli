---
watermark: ORIRO
name: ai-product-builder
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >



  AI product development — LLM integration, RAG, prompt engineering, AI UX patterns, streaming, and building with AI APIs.


  Sources: Stripe docs, Anthropic docs, Sanity/Contentful docs, industry-specific technical resources.
---

# AI Product Development

## LLM integration fundamentals

### Calling the API (Anthropic)

```ts
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const response = await client.messages.create({
  model: "claude-opus-4-5", // or claude-sonnet-4-5, claude-haiku-4-5-20251001
  max_tokens: 1024,
  system: "You are a helpful assistant for a financial planning app.",
  messages: [{ role: "user", content: userMessage }],
});

const text = response.content[0].type === "text" ? response.content[0].text : "";
```

### Streaming responses (essential for good UX)

```ts
// Long AI responses should stream — users see output as it generates
const stream = await client.messages.create({
  model: 'claude-sonnet-4-5',
  max_tokens: 2048,
  stream: true,
  messages: [{ role: 'user', content: prompt }],
});

// In Next.js App Router:
export async function POST(req: Request) {
  const body = await req.json();
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const anthropicStream = client.messages.stream({ ... });
      for await (const event of anthropicStream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          controller.enqueue(encoder.encode(event.delta.text));
        }
      }
      controller.close();
    }
  });
  return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
```

## RAG (Retrieval Augmented Generation)

### Why RAG

LLMs have knowledge cutoffs. RAG = search your own data, inject into context.
Better than fine-tuning for: changing data, specific documents, proprietary knowledge.

### RAG pipeline

```
User query → Embed query → Vector search → Top-k chunks → Augmented prompt → LLM → Answer
```

### Implementation

```ts
import OpenAI from "openai"; // or use Anthropic for embeddings
import { Pinecone } from "@pinecone-database/pinecone";

// 1. Embed user query
const embedding = await openai.embeddings.create({
  model: "text-embedding-3-small",
  input: userQuery,
});

// 2. Search vector store
const results = await pinecone.index("knowledge-base").query({
  vector: embedding.data[0].embedding,
  topK: 5,
  includeMetadata: true,
});

// 3. Build augmented prompt
const context = results.matches.map((m) => m.metadata.text).join("\n\n");
const augmentedPrompt = `
Context information:
${context}

User question: ${userQuery}

Answer based on the context above. If the information isn't in the context, say so.
`;

// 4. Generate with context
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-5",
  max_tokens: 1024,
  messages: [{ role: "user", content: augmentedPrompt }],
});
```

## Tool use (function calling)

```ts
const tools = [
  {
    name: "get_weather",
    description: "Get current weather for a location",
    input_schema: {
      type: "object",
      properties: {
        location: { type: "string", description: "City name or coordinates" },
        units: { type: "string", enum: ["celsius", "fahrenheit"] },
      },
      required: ["location"],
    },
  },
];

const response = await client.messages.create({
  model: "claude-sonnet-4-5",
  max_tokens: 1024,
  tools,
  messages: [{ role: "user", content: "What's the weather in Paris?" }],
});

// Check if model wants to use a tool
if (response.stop_reason === "tool_use") {
  const toolUse = response.content.find((c) => c.type === "tool_use");
  const result = await executeToolCall(toolUse.name, toolUse.input);
  // Continue conversation with tool result
}
```

## AI UX patterns

**Streaming text:** Always stream for long responses. Users disengage if they wait.
**Optimistic UI:** Show user message immediately, wait for AI response.
**Stop generation:** Provide ability to stop mid-stream.
**Retry / regenerate:** Always offer re-generation.
**Citation / sources:** For RAG responses, cite the source documents.
**Feedback:** Thumbs up/down on responses. Improves model or prompt over time.
**Guardrails UI:** If request refused, explain why and offer alternatives.
**Conversation history:** Maintain context across turns. Summarize long conversations.
**Token awareness:** Show remaining context. Warn when approaching limits.

## Prompt engineering

**Be specific:** Vague prompts → vague outputs.
**System prompt:** Set role, behavior, constraints, output format.
**Few-shot examples:** 2-5 examples of desired input→output.
**Chain of thought:** "Think step by step" or "Let's reason through this."
**Output format:** "Respond in JSON", "Use markdown headers", "Maximum 3 bullet points."
**Role assignment:** "You are an expert [role] who specializes in [domain]."

## Cost management

Claude Haiku: cheapest for simple tasks. Sonnet: balanced. Opus: most capable.
Cache common prompts (Anthropic prompt caching).
Set max_tokens appropriately. Don't over-generate.
Log and monitor token usage per feature.
Rate limit users to prevent runaway costs.

Sources: Anthropic documentation (docs.anthropic.com — free), Vercel AI SDK (sdk.vercel.ai/docs — free), LangChain documentation (free), Building AI Products by Lenny Rachitsky (Substack)
