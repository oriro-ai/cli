---
summary: "Generated inventory of Oriro plugins shipped in core, published externally, or kept source-only"
read_when:
  - You are deciding whether a plugin ships in the core npm package or installs separately
  - You are updating bundled plugin package metadata or release automation
  - You need the canonical internal vs external plugin list
title: "Plugin inventory"
---

# Plugin inventory

This page is generated from `extensions/*/package.json`, `oriro.plugin.json`,
and the root npm package `files` exclusions. Regenerate it with:

```bash
pnpm plugins:inventory:gen
```

## Definitions

- **Core npm package:** built into the `oriro` npm package and available without a separate plugin install.
- **Official external package:** Oriro-maintained plugin omitted from the core npm package, kept in this official inventory, and installed on demand through OriroHub and/or npm.
- **Source checkout only:** repo-local plugin omitted from published npm artifacts and not advertised as an installable package.

Source checkouts are different from npm installs: after `pnpm install`, bundled
plugins load from `extensions/<id>` so local edits and package-local workspace
dependencies are available.

## Install a plugin

Use the install route in each entry to decide whether install is needed. Plugins
that say `included in Oriro` are already present in the core package.
Official external packages need one install, then a Gateway restart.

For example, Discord is an official external package:

```bash
oriro plugins install @oriro/discord
oriro gateway restart
oriro plugins inspect discord --runtime --json
```

During the launch cutover, ordinary bare package specs still install from npm.
Use `orirohub:@oriro/discord` or `npm:@oriro/discord` when you need an
explicit source. After install, follow the plugin's setup doc, such as
[Discord](/channels/discord), to add credentials and channel config. See
[Manage plugins](/plugins/manage-plugins) for update, uninstall, and publishing
commands.

Each entry lists the package, distribution route, and description.

## Core npm package

72 plugins

- **[admin-http-rpc](/plugins/reference/admin-http-rpc)** (`@oriro/admin-http-rpc`) - included in Oriro. Oriro admin HTTP RPC endpoint.

- **[alibaba](/plugins/reference/alibaba)** (`@oriro/alibaba-provider`) - included in Oriro. Adds video generation provider support.

- **[anthropic](/plugins/reference/anthropic)** (`@oriro/anthropic-provider`) - included in Oriro. Adds Anthropic model provider support to Oriro.

- **[azure-speech](/plugins/reference/azure-speech)** (`@oriro/azure-speech`) - included in Oriro. Azure AI Speech text-to-speech (MP3, native Ogg/Opus voice notes, PCM telephony).

- **[bonjour](/plugins/reference/bonjour)** (`@oriro/bonjour`) - included in Oriro. Advertise the local Oriro gateway over Bonjour/mDNS.

- **[browser](/plugins/reference/browser)** (`@oriro/browser-plugin`) - included in Oriro. Adds agent-callable tools.

- **[byteplus](/plugins/reference/byteplus)** (`@oriro/byteplus-provider`) - included in Oriro. Adds BytePlus, BytePlus Plan model provider support to Oriro.

- **[canvas](/plugins/reference/canvas)** (`@oriro/canvas-plugin`) - included in Oriro. Experimental Canvas control and A2UI rendering surfaces for paired nodes.

- **[clickclack](/plugins/reference/clickclack)** (`@oriro/clickclack`) - included in Oriro. Adds the Clickclack channel surface for sending and receiving Oriro messages.

- **[codex-supervisor](/plugins/reference/codex-supervisor)** (`@oriro/codex-supervisor`) - included in Oriro. Supervise Codex app-server sessions from Oriro.

- **[cohere](/plugins/reference/cohere)** (`@oriro/cohere-provider`) - included in Oriro; npm; OriroHub: `orirohub:@oriro/cohere-provider`. Oriro Cohere provider plugin.

- **[comfy](/plugins/reference/comfy)** (`@oriro/comfy-provider`) - included in Oriro. Adds ComfyUI model provider support to Oriro.

- **[copilot-proxy](/plugins/reference/copilot-proxy)** (`@oriro/copilot-proxy`) - included in Oriro. Adds Copilot Proxy model provider support to Oriro.

- **[deepgram](/plugins/reference/deepgram)** (`@oriro/deepgram-provider`) - included in Oriro. Adds media understanding provider support. Adds realtime transcription provider support.

- **[document-extract](/plugins/reference/document-extract)** (`@oriro/document-extract-plugin`) - included in Oriro. Extract text and fallback page images from local document attachments.

- **[duckduckgo](/plugins/reference/duckduckgo)** (`@oriro/duckduckgo-plugin`) - included in Oriro. Adds web search provider support.

- **[elevenlabs](/plugins/reference/elevenlabs)** (`@oriro/elevenlabs-speech`) - included in Oriro. Adds media understanding provider support. Adds realtime transcription provider support. Adds text-to-speech provider support.

- **[fal](/plugins/reference/fal)** (`@oriro/fal-provider`) - included in Oriro. Adds fal model provider support to Oriro.

- **[file-transfer](/plugins/reference/file-transfer)** (`@oriro/file-transfer`) - included in Oriro. Fetch, list, and write files on paired nodes via dedicated node commands. Bypasses bash stdout truncation by using base64 over node.invoke for binaries up to 16 MB.

- **[fireworks](/plugins/reference/fireworks)** (`@oriro/fireworks-provider`) - included in Oriro. Adds Fireworks model provider support to Oriro.

- **[github-copilot](/plugins/reference/github-copilot)** (`@oriro/github-copilot-provider`) - included in Oriro. Adds GitHub Copilot model provider support to Oriro.

- **[google](/plugins/reference/google)** (`@oriro/google-plugin`) - included in Oriro. Adds Google, Google Gemini CLI, Google Vertex model provider support to Oriro.

- **[huggingface](/plugins/reference/huggingface)** (`@oriro/huggingface-provider`) - included in Oriro. Adds Hugging Face model provider support to Oriro.

- **[imessage](/plugins/reference/imessage)** (`@oriro/imessage`) - included in Oriro. Adds the iMessage channel surface for sending and receiving Oriro messages.

- **[irc](/plugins/reference/irc)** (`@oriro/irc`) - included in Oriro. Adds the IRC channel surface for sending and receiving Oriro messages.

- **[litellm](/plugins/reference/litellm)** (`@oriro/litellm-provider`) - included in Oriro. Adds LiteLLM model provider support to Oriro.

- **[llm-task](/plugins/reference/llm-task)** (`@oriro/llm-task`) - included in Oriro. Generic JSON-only LLM tool for structured tasks callable from workflows.

- **[lmstudio](/plugins/reference/lmstudio)** (`@oriro/lmstudio-provider`) - included in Oriro. Adds LM Studio model provider support to Oriro.

- **[mattermost](/plugins/reference/mattermost)** (`@oriro/mattermost`) - included in Oriro. Adds the Mattermost channel surface for sending and receiving Oriro messages.

- **[memory-core](/plugins/reference/memory-core)** (`@oriro/memory-core`) - included in Oriro. Adds agent-callable tools.

- **[memory-wiki](/plugins/reference/memory-wiki)** (`@oriro/memory-wiki`) - included in Oriro. Persistent wiki compiler and Obsidian-friendly knowledge vault for Oriro.

- **[microsoft](/plugins/reference/microsoft)** (`@oriro/microsoft-speech`) - included in Oriro. Adds text-to-speech provider support.

- **[microsoft-foundry](/plugins/reference/microsoft-foundry)** (`@oriro/microsoft-foundry`) - included in Oriro. Adds Microsoft Foundry model provider support to Oriro.

- **[migrate-claude](/plugins/reference/migrate-claude)** (`@oriro/migrate-claude`) - included in Oriro. Imports Claude Code and Claude Desktop instructions, MCP servers, skills, and safe configuration into Oriro.

- **[migrate-hermes](/plugins/reference/migrate-hermes)** (`@oriro/migrate-hermes`) - included in Oriro. Imports Hermes configuration, memories, skills, and supported credentials into Oriro.

- **[minimax](/plugins/reference/minimax)** (`@oriro/minimax-provider`) - included in Oriro. Adds MiniMax, MiniMax Portal model provider support to Oriro.

- **[mistral](/plugins/reference/mistral)** (`@oriro/mistral-provider`) - included in Oriro. Adds Mistral model provider support to Oriro.

- **[moonshot](/plugins/reference/moonshot)** (`@oriro/moonshot-provider`) - included in Oriro. Adds Moonshot model provider support to Oriro.

- **[novita](/plugins/reference/novita)** (`@oriro/novita-provider`) - included in Oriro. Adds Novita, Novita AI, Novitaai model provider support to Oriro.

- **[nvidia](/plugins/reference/nvidia)** (`@oriro/nvidia-provider`) - included in Oriro. Adds NVIDIA model provider support to Oriro.

- **[oc-path](/plugins/reference/oc-path)** (`@oriro/oc-path`) - included in Oriro. Adds the oriro path CLI for oc:// workspace file addressing.

- **[ollama](/plugins/reference/ollama)** (`@oriro/ollama-provider`) - included in Oriro. Adds Ollama, Ollama Cloud model provider support to Oriro.

- **[open-prose](/plugins/reference/open-prose)** (`@oriro/open-prose`) - included in Oriro. OpenProse VM skill pack with a /prose slash command.

- **[openai](/plugins/reference/openai)** (`@oriro/openai-provider`) - included in Oriro. Adds OpenAI model provider support to Oriro.

- **[opencode](/plugins/reference/opencode)** (`@oriro/opencode-provider`) - included in Oriro. Adds OpenCode model provider support to Oriro.

- **[opencode-go](/plugins/reference/opencode-go)** (`@oriro/opencode-go-provider`) - included in Oriro. Adds OpenCode Go model provider support to Oriro.

- **[openrouter](/plugins/reference/openrouter)** (`@oriro/openrouter-provider`) - included in Oriro. Adds OpenRouter model provider support to Oriro.

- **[policy](/plugins/reference/policy)** (`@oriro/policy`) - included in Oriro. Adds policy-backed doctor checks for workspace conformance.

- **[runway](/plugins/reference/runway)** (`@oriro/runway-provider`) - included in Oriro. Adds video generation provider support.

- **[searxng](/plugins/reference/searxng)** (`@oriro/searxng-plugin`) - included in Oriro. Adds web search provider support.

- **[senseaudio](/plugins/reference/senseaudio)** (`@oriro/senseaudio-provider`) - included in Oriro. Adds media understanding provider support.

- **[sglang](/plugins/reference/sglang)** (`@oriro/sglang-provider`) - included in Oriro. Adds SGLang model provider support to Oriro.

- **[signal](/plugins/reference/signal)** (`@oriro/signal`) - included in Oriro. Adds the Signal channel surface for sending and receiving Oriro messages.

- **[sms](/plugins/reference/sms)** (`@oriro/sms`) - included in Oriro. Twilio SMS channel plugin for Oriro text messages.

- **[synthetic](/plugins/reference/synthetic)** (`@oriro/synthetic-provider`) - included in Oriro. Adds Synthetic model provider support to Oriro.

- **[tavily](/plugins/reference/tavily)** (`@oriro/tavily-plugin`) - included in Oriro. Adds agent-callable tools. Adds web search provider support.

- **[telegram](/plugins/reference/telegram)** (`@oriro/telegram`) - included in Oriro. Adds the Telegram channel surface for sending and receiving Oriro messages.

- **[tencent](/plugins/reference/tencent)** (`@oriro/tencent-provider`) - included in Oriro. Adds Tencent TokenHub model provider support to Oriro.

- **[together](/plugins/reference/together)** (`@oriro/together-provider`) - included in Oriro. Adds Together model provider support to Oriro.

- **[tts-local-cli](/plugins/reference/tts-local-cli)** (`@oriro/tts-local-cli`) - included in Oriro. Adds text-to-speech provider support.

- **[venice](/plugins/reference/venice)** (`@oriro/venice-provider`) - included in Oriro. Adds Venice model provider support to Oriro.

- **[vercel-ai-gateway](/plugins/reference/vercel-ai-gateway)** (`@oriro/vercel-ai-gateway-provider`) - included in Oriro. Adds Vercel AI Gateway model provider support to Oriro.

- **[vllm](/plugins/reference/vllm)** (`@oriro/vllm-provider`) - included in Oriro. Adds vLLM model provider support to Oriro.

- **[volcengine](/plugins/reference/volcengine)** (`@oriro/volcengine-provider`) - included in Oriro. Adds Volcengine, Volcengine Plan model provider support to Oriro.

- **[voyage](/plugins/reference/voyage)** (`@oriro/voyage-provider`) - included in Oriro. Adds memory embedding provider support.

- **[vydra](/plugins/reference/vydra)** (`@oriro/vydra-provider`) - included in Oriro. Adds Vydra model provider support to Oriro.

- **[web-readability](/plugins/reference/web-readability)** (`@oriro/web-readability-plugin`) - included in Oriro. Extract readable article content from local HTML web fetch responses.

- **[webhooks](/plugins/reference/webhooks)** (`@oriro/webhooks`) - included in Oriro. Authenticated inbound webhooks that bind external automation to Oriro TaskFlows.

- **[workboard](/plugins/reference/workboard)** (`@oriro/workboard`) - included in Oriro. Dashboard workboard for agent-owned issues and sessions.

- **[xai](/plugins/reference/xai)** (`@oriro/xai-plugin`) - included in Oriro. Adds xAI model provider support to Oriro.

- **[xiaomi](/plugins/reference/xiaomi)** (`@oriro/xiaomi-provider`) - included in Oriro. Adds Xiaomi, Xiaomi Token Plan model provider support to Oriro.

- **[zai](/plugins/reference/zai)** (`@oriro/zai-provider`) - included in Oriro. Adds Z.AI model provider support to Oriro.

## Official external packages

54 plugins

- **[acpx](/plugins/reference/acpx)** (`@oriro/acpx`) - npm; OriroHub. Oriro ACP runtime backend with plugin-owned session and transport management.

- **[amazon-bedrock](/plugins/reference/amazon-bedrock)** (`@oriro/amazon-bedrock-provider`) - npm; OriroHub. Oriro Amazon Bedrock provider plugin with model discovery, embeddings, and guardrail support.

- **[amazon-bedrock-mantle](/plugins/reference/amazon-bedrock-mantle)** (`@oriro/amazon-bedrock-mantle-provider`) - npm; OriroHub. Oriro Amazon Bedrock Mantle provider plugin for OpenAI-compatible model routing.

- **[anthropic-vertex](/plugins/reference/anthropic-vertex)** (`@oriro/anthropic-vertex-provider`) - npm; OriroHub. Oriro Anthropic Vertex provider plugin for Claude models on Google Vertex AI.

- **[arcee](/plugins/reference/arcee)** (`@oriro/arcee-provider`) - npm; OriroHub: `orirohub:@oriro/arcee-provider`. Adds Arcee model provider support to Oriro.

- **[brave](/plugins/reference/brave)** (`@oriro/brave-plugin`) - npm; OriroHub. Oriro Brave Search provider plugin for web search.

- **[cerebras](/plugins/reference/cerebras)** (`@oriro/cerebras-provider`) - npm; OriroHub: `orirohub:@oriro/cerebras-provider`. Adds Cerebras model provider support to Oriro.

- **[chutes](/plugins/reference/chutes)** (`@oriro/chutes-provider`) - npm; OriroHub: `orirohub:@oriro/chutes-provider`. Adds Chutes model provider support to Oriro.

- **[cloudflare-ai-gateway](/plugins/reference/cloudflare-ai-gateway)** (`@oriro/cloudflare-ai-gateway-provider`) - npm; OriroHub: `orirohub:@oriro/cloudflare-ai-gateway-provider`. Adds Cloudflare AI Gateway model provider support to Oriro.

- **[codex](/plugins/reference/codex)** (`@oriro/codex`) - npm; OriroHub. Oriro Codex app-server harness and model provider plugin with a Codex-managed GPT catalog.

- **[copilot](/plugins/reference/copilot)** (`@oriro/copilot`) - npm; OriroHub: `orirohub:@oriro/copilot`. Registers the GitHub Copilot agent runtime.

- **[deepinfra](/plugins/reference/deepinfra)** (`@oriro/deepinfra-provider`) - npm; OriroHub: `orirohub:@oriro/deepinfra-provider`. Adds DeepInfra model provider support to Oriro.

- **[deepseek](/plugins/reference/deepseek)** (`@oriro/deepseek-provider`) - npm; OriroHub: `orirohub:@oriro/deepseek-provider`. Adds DeepSeek model provider support to Oriro.

- **[diagnostics-otel](/plugins/reference/diagnostics-otel)** (`@oriro/diagnostics-otel`) - npm; OriroHub: `orirohub:@oriro/diagnostics-otel`. Oriro diagnostics OpenTelemetry exporter for metrics, traces, and logs.

- **[diagnostics-prometheus](/plugins/reference/diagnostics-prometheus)** (`@oriro/diagnostics-prometheus`) - npm; OriroHub: `orirohub:@oriro/diagnostics-prometheus`. Oriro diagnostics Prometheus exporter for runtime metrics.

- **[diffs](/plugins/reference/diffs)** (`@oriro/diffs`) - npm; OriroHub. Oriro read-only diff viewer plugin and file renderer for agents.

- **[diffs-language-pack](/plugins/reference/diffs-language-pack)** (`@oriro/diffs-language-pack`) - npm; OriroHub: `orirohub:@oriro/diffs-language-pack`. Adds syntax highlighting for languages outside the default diffs viewer set.

- **[discord](/plugins/reference/discord)** (`@oriro/discord`) - npm; OriroHub. Oriro Discord channel plugin for channels, DMs, commands, and app events.

- **[exa](/plugins/reference/exa)** (`@oriro/exa-plugin`) - npm; OriroHub: `orirohub:@oriro/exa-plugin`. Adds web search provider support.

- **[feishu](/plugins/reference/feishu)** (`@oriro/feishu`) - npm; OriroHub. Oriro Feishu/Lark channel plugin for chats and workplace tools (community maintained by @m1heng).

- **[firecrawl](/plugins/reference/firecrawl)** (`@oriro/firecrawl-plugin`) - npm; OriroHub: `orirohub:@oriro/firecrawl-plugin`. Adds agent-callable tools. Adds web fetch provider support. Adds web search provider support.

- **[gmi](/plugins/reference/gmi)** (`@oriro/gmi-provider`) - npm; OriroHub: `orirohub:@oriro/gmi-provider`. Oriro GMI Cloud provider plugin.

- **[google-meet](/plugins/reference/google-meet)** (`@oriro/google-meet`) - npm; OriroHub. Oriro Google Meet participant plugin for joining calls through Chrome or Twilio transports.

- **[googlechat](/plugins/reference/googlechat)** (`@oriro/googlechat`) - npm; OriroHub. Oriro Google Chat channel plugin for spaces and direct messages.

- **[gradium](/plugins/reference/gradium)** (`@oriro/gradium-speech`) - npm; OriroHub: `orirohub:@oriro/gradium-speech`. Adds text-to-speech provider support.

- **[groq](/plugins/reference/groq)** (`@oriro/groq-provider`) - npm; OriroHub: `orirohub:@oriro/groq-provider`. Adds Groq model provider support to Oriro.

- **[inworld](/plugins/reference/inworld)** (`@oriro/inworld-speech`) - npm; OriroHub: `orirohub:@oriro/inworld-speech`. Inworld streaming text-to-speech (MP3, OGG_OPUS, PCM telephony).

- **[kilocode](/plugins/reference/kilocode)** (`@oriro/kilocode-provider`) - npm; OriroHub: `orirohub:@oriro/kilocode-provider`. Adds Kilocode model provider support to Oriro.

- **[kimi](/plugins/reference/kimi)** (`@oriro/kimi-provider`) - npm; OriroHub: `orirohub:@oriro/kimi-provider`. Adds Kimi, Kimi Coding model provider support to Oriro.

- **[line](/plugins/reference/line)** (`@oriro/line`) - npm; OriroHub. Oriro LINE channel plugin for LINE Bot API chats.

- **[llama-cpp](/plugins/reference/llama-cpp)** (`@oriro/llama-cpp-provider`) - npm; OriroHub. Local GGUF embeddings through node-llama-cpp.

- **[oriro](/plugins/reference/oriro)** (`@oriro-ai/cli`) - npm; OriroHub. Oriro workflow tool plugin for typed pipelines and resumable approvals.

- **[matrix](/plugins/reference/matrix)** (`@oriro/matrix`) - OriroHub: `orirohub:@oriro/matrix`; npm. Oriro Matrix channel plugin for rooms and direct messages.

- **[memory-lancedb](/plugins/reference/memory-lancedb)** (`@oriro/memory-lancedb`) - npm; OriroHub. Oriro LanceDB-backed long-term memory plugin with auto-recall, auto-capture, and vector search.

- **[msteams](/plugins/reference/msteams)** (`@oriro/msteams`) - npm; OriroHub. Oriro Microsoft Teams channel plugin for bot conversations.

- **[nextcloud-talk](/plugins/reference/nextcloud-talk)** (`@oriro/nextcloud-talk`) - npm; OriroHub. Oriro Nextcloud Talk channel plugin for conversations.

- **[nostr](/plugins/reference/nostr)** (`@oriro/nostr`) - npm; OriroHub. Oriro Nostr channel plugin for NIP-04 encrypted direct messages.

- **[openshell](/plugins/reference/openshell)** (`@oriro/openshell-sandbox`) - npm; OriroHub. Oriro sandbox backend for the NVIDIA OpenShell CLI with mirrored local workspaces and SSH command execution.

- **[parallel](/tools/parallel-search)** (`@oriro/parallel-plugin`) - npm; OriroHub: `orirohub:@oriro/parallel-plugin`. Adds web search provider support.

- **[perplexity](/plugins/reference/perplexity)** (`@oriro/perplexity-plugin`) - npm; OriroHub: `orirohub:@oriro/perplexity-plugin`. Adds web search provider support.

- **[pixverse](/plugins/reference/pixverse)** (`@oriro/pixverse-provider`) - npm; OriroHub: `orirohub:@oriro/pixverse-provider`. Oriro PixVerse video generation provider plugin.

- **[qianfan](/plugins/reference/qianfan)** (`@oriro/qianfan-provider`) - npm; OriroHub: `orirohub:@oriro/qianfan-provider`. Adds Qianfan model provider support to Oriro.

- **[qqbot](/plugins/reference/qqbot)** (`@oriro/qqbot`) - npm; OriroHub. Oriro QQ Bot channel plugin for group and direct-message workflows.

- **[qwen](/plugins/reference/qwen)** (`@oriro/qwen-provider`) - npm; OriroHub: `orirohub:@oriro/qwen-provider`. Adds Qwen, Qwen Cloud, Model Studio, DashScope, Qwen Oauth, Qwen Portal, Qwen CLI model provider support to Oriro.

- **[slack](/plugins/reference/slack)** (`@oriro/slack`) - npm; OriroHub. Oriro Slack channel plugin for channels, DMs, commands, and app events.

- **[stepfun](/plugins/reference/stepfun)** (`@oriro/stepfun-provider`) - npm. Adds StepFun, StepFun Plan model provider support to Oriro.

- **[synology-chat](/plugins/reference/synology-chat)** (`@oriro/synology-chat`) - npm; OriroHub. Synology Chat channel plugin for Oriro channels and direct messages.

- **[tlon](/plugins/reference/tlon)** (`@oriro/tlon`) - npm; OriroHub. Oriro Tlon/Urbit channel plugin for chat workflows.

- **[tokenjuice](/plugins/reference/tokenjuice)** (`@oriro/tokenjuice`) - npm; OriroHub: `orirohub:@oriro/tokenjuice`. Compacts exec and bash tool results with tokenjuice reducers.

- **[twitch](/plugins/reference/twitch)** (`@oriro/twitch`) - npm; OriroHub. Oriro Twitch channel plugin for chat and moderation workflows.

- **[voice-call](/plugins/reference/voice-call)** (`@oriro/voice-call`) - npm; OriroHub. Oriro voice-call plugin for Twilio, Telnyx, and Plivo phone calls.

- **[whatsapp](/plugins/reference/whatsapp)** (`@oriro/whatsapp`) - OriroHub: `orirohub:@oriro/whatsapp`; npm. Oriro WhatsApp channel plugin for WhatsApp Web chats.

- **[zalo](/plugins/reference/zalo)** (`@oriro/zalo`) - npm; OriroHub. Oriro Zalo channel plugin for bot and webhook chats.

- **[zalouser](/plugins/reference/zalouser)** (`@oriro/zalouser`) - npm; OriroHub. Oriro Zalo Personal Account plugin via native zca-js integration.

## Source checkout only

3 plugins

- **[qa-channel](/plugins/reference/qa-channel)** (`@oriro/qa-channel`) - source checkout only. Adds the QA Channel surface for sending and receiving Oriro messages.

- **[qa-lab](/plugins/reference/qa-lab)** (`@oriro/qa-lab`) - source checkout only. Oriro QA lab plugin with private debugger UI and scenario runner.

- **[qa-matrix](/plugins/reference/qa-matrix)** (`@oriro/qa-matrix`) - source checkout only. Matrix QA transport runner and substrate.
