// ORIRO Step 7 — connector catalog. 59 VALIDATED MCP connectors (folded from ORIROs
// connectors_pass.jsonl, scrubbed to the fields the CLI needs). INERT data — nothing connects until
// the user runs `oriro connectors add <slug>`. Generated; do not hand-edit. Zero OpenClaw footprint.

export interface ConnectorEntry {
  slug: string;
  name: string;
  category: string;
  authType: string;
  mcpUrl: string;
  description: string;
  configSchema: unknown;
}

export const CONNECTOR_CATALOG: readonly ConnectorEntry[] = [
  {
    "slug": "github",
    "name": "GitHub",
    "category": "Development",
    "authType": "oauth",
    "mcpUrl": "https://github.com/github/github-mcp-server",
    "description": "Official GitHub server for integration with repository management, PRs, issues, and more.",
    "configSchema": {
      "auth": "oauth",
      "fields": [],
      "note": "Authorize via GitHub OAuth — no keys to paste.",
      "docs": "https://docs.github.com/rest"
    }
  },
  {
    "slug": "gitlab",
    "name": "GitLab",
    "category": "Development",
    "authType": "oauth",
    "mcpUrl": "https://github.com/kopfrechner/gitlab-mr-mcp",
    "description": "Interact seamlessly with issues and merge requests of your GitLab projects.",
    "configSchema": {
      "auth": "oauth",
      "fields": [],
      "note": "Authorize via GitLab OAuth — no keys to paste.",
      "docs": "https://docs.gitlab.com/ee/api/"
    }
  },
  {
    "slug": "linear",
    "name": "Linear",
    "category": "Development",
    "authType": "oauth",
    "mcpUrl": "https://github.com/tacticlaunch/mcp-linear",
    "description": "Integrates with Linear project management system",
    "configSchema": {
      "auth": "oauth",
      "fields": [],
      "note": "Authorize via Linear OAuth — no keys to paste.",
      "docs": "https://developers.linear.app/"
    }
  },
  {
    "slug": "jira",
    "name": "Jira",
    "category": "Development",
    "authType": "oauth",
    "mcpUrl": "https://github.com/sooperset/mcp-atlassian",
    "description": "MCP server for Atlassian products (Confluence and Jira). Supports Confluence Cloud, Jira Cloud, and Jira Server/Data Center. Provides comprehensive tools for searching, reading, creating, and managing content across Atlassian workspaces.",
    "configSchema": {
      "auth": "oauth",
      "fields": [],
      "note": "Authorize via Jira OAuth — no keys to paste.",
      "docs": "https://developer.atlassian.com/cloud/jira/"
    }
  },
  {
    "slug": "sentry",
    "name": "Sentry",
    "category": "Development",
    "authType": "token",
    "mcpUrl": "https://github.com/getsentry/sentry-mcp",
    "description": "Sentry.io integration for error tracking and performance monitoring",
    "configSchema": {
      "auth": "token",
      "fields": [
        {
          "key": "access_token",
          "label": "Sentry Access Token",
          "type": "password",
          "help": "https://docs.sentry.io/api/"
        }
      ]
    }
  },
  {
    "slug": "vercel",
    "name": "Vercel",
    "category": "Development",
    "authType": "oauth",
    "mcpUrl": "https://mcp.vercel.com",
    "description": "Vercel is the platform for deploying and hosting frontend apps and serverless functions. Its official remote MCP server lets ORIRO manage projects, deployments, domains, and environment variables.",
    "configSchema": {
      "auth": "oauth",
      "fields": [],
      "note": "Authorize via Vercel OAuth — no keys to paste.",
      "docs": "https://vercel.com/docs/rest-api"
    }
  },
  {
    "slug": "netlify",
    "name": "Netlify",
    "category": "Development",
    "authType": "oauth",
    "mcpUrl": "npm:@netlify/mcp",
    "description": "Netlify is a web platform for building, deploying, and hosting modern sites and serverless functions. The official @netlify/mcp package (6 tools, node) exposes site, deploy, and build operations.",
    "configSchema": {
      "auth": "oauth",
      "fields": [],
      "note": "Authorize via Netlify OAuth — no keys to paste.",
      "docs": "https://docs.netlify.com/api/get-started/"
    }
  },
  {
    "slug": "cloudflare",
    "name": "Cloudflare",
    "category": "Development",
    "authType": "apikey",
    "mcpUrl": "https://github.com/cloudflare/mcp-server-cloudflare",
    "description": "Integration with Cloudflare services including Workers, KV, R2, and D1",
    "configSchema": {
      "auth": "apikey",
      "fields": [
        {
          "key": "api_key",
          "label": "Cloudflare API Key",
          "type": "password",
          "help": "https://developers.cloudflare.com/api/"
        }
      ]
    }
  },
  {
    "slug": "aws",
    "name": "AWS",
    "category": "Development",
    "authType": "apikey",
    "mcpUrl": "https://github.com/awslabs/mcp",
    "description": "AWS MCP servers for seamless integration with AWS services and resources.",
    "configSchema": {
      "auth": "apikey",
      "fields": [
        {
          "key": "api_key",
          "label": "AWS API Key",
          "type": "password",
          "help": "https://docs.aws.amazon.com/"
        }
      ]
    }
  },
  {
    "slug": "datadog",
    "name": "Datadog",
    "category": "Development",
    "authType": "apikey",
    "mcpUrl": "https://github.com/traceloop/opentelemetry-mcp-server",
    "description": "An MCP server for connecting to any OpenTelemetry backend (Datadog, Grafana, Dynatrace, Traceloop, etc.).",
    "configSchema": {
      "auth": "apikey",
      "fields": [
        {
          "key": "api_key",
          "label": "Datadog API Key",
          "type": "password",
          "help": "https://docs.datadoghq.com/api/"
        }
      ]
    }
  },
  {
    "slug": "slack",
    "name": "Slack",
    "category": "Communication",
    "authType": "oauth",
    "mcpUrl": "https://github.com/korotovsky/slack-mcp-server",
    "description": "The most powerful MCP server for Slack Workspaces.",
    "configSchema": {
      "auth": "oauth",
      "fields": [],
      "note": "Authorize via Slack OAuth — no keys to paste.",
      "docs": "https://api.slack.com/"
    }
  },
  {
    "slug": "discord",
    "name": "Discord",
    "category": "Communication",
    "authType": "token",
    "mcpUrl": "https://github.com/SaseQ/discord-mcp",
    "description": "A MCP server for the Discord integration. Enable your AI assistants to seamlessly interact with Discord. Enhance your Discord experience with powerful automation capabilities.",
    "configSchema": {
      "auth": "token",
      "fields": [
        {
          "key": "access_token",
          "label": "Discord Access Token",
          "type": "password",
          "help": "https://discord.com/developers/docs"
        }
      ]
    }
  },
  {
    "slug": "telegram",
    "name": "Telegram",
    "category": "Communication",
    "authType": "token",
    "mcpUrl": "https://github.com/chaindead/telegram-mcp",
    "description": "Telegram API integration for accessing user data, managing dialogs (chats, channels, groups), retrieving messages, and handling read status",
    "configSchema": {
      "auth": "token",
      "fields": [
        {
          "key": "access_token",
          "label": "Telegram Access Token",
          "type": "password",
          "help": "https://core.telegram.org/bots/api"
        }
      ]
    }
  },
  {
    "slug": "microsoft-teams",
    "name": "Microsoft Teams",
    "category": "Communication",
    "authType": "oauth",
    "mcpUrl": "https://github.com/InditexTech/mcp-teams-server",
    "description": "MCP server that integrates Microsoft Teams messaging (read, post, mention, list members and threads)",
    "configSchema": {
      "auth": "oauth",
      "fields": [],
      "note": "Authorize via Microsoft Teams OAuth — no keys to paste.",
      "docs": "https://learn.microsoft.com/graph/teams-concept-overview"
    }
  },
  {
    "slug": "zoom",
    "name": "Zoom",
    "category": "Communication",
    "authType": "oauth",
    "mcpUrl": "https://github.com/joinly-ai/joinly",
    "description": "MCP server to interact with browser-based meeting platforms (Zoom, Teams, Google Meet). Enables AI agents to send bots to online meetings, gather live transcripts, speak text, and send messages in the meeting chat.",
    "configSchema": {
      "auth": "oauth",
      "fields": [],
      "note": "Authorize via Zoom OAuth — no keys to paste.",
      "docs": "https://developers.zoom.us/docs/api/"
    }
  },
  {
    "slug": "twilio",
    "name": "Twilio",
    "category": "Communication",
    "authType": "apikey",
    "mcpUrl": "",
    "description": "Twilio integration for ORIRO. (Communication category.)",
    "configSchema": {
      "auth": "apikey",
      "fields": [
        {
          "key": "api_key",
          "label": "Twilio API Key",
          "type": "password",
          "help": "https://www.twilio.com/docs/usage/api"
        }
      ]
    }
  },
  {
    "slug": "notion",
    "name": "Notion",
    "category": "Productivity",
    "authType": "oauth",
    "mcpUrl": "https://github.com/suekou/mcp-notion-server",
    "description": "Interacting with Notion API",
    "configSchema": {
      "auth": "oauth",
      "fields": [],
      "note": "Authorize via Notion OAuth — no keys to paste.",
      "docs": "https://developers.notion.com/"
    }
  },
  {
    "slug": "google-drive",
    "name": "Google Drive",
    "category": "Productivity",
    "authType": "oauth",
    "mcpUrl": "https://github.com/isaacphi/mcp-gdrive",
    "description": "Model Context Protocol (MCP) Server for reading from Google Drive and editing Google Sheets.",
    "configSchema": {
      "auth": "oauth",
      "fields": [],
      "note": "Authorize via Google Drive OAuth — no keys to paste.",
      "docs": "https://developers.google.com/drive"
    }
  },
  {
    "slug": "airtable",
    "name": "Airtable",
    "category": "Productivity",
    "authType": "apikey",
    "mcpUrl": "https://github.com/domdomegg/airtable-mcp-server",
    "description": "Airtable database integration with schema inspection, read and write capabilities",
    "configSchema": {
      "auth": "apikey",
      "fields": [
        {
          "key": "api_key",
          "label": "Airtable API Key",
          "type": "password",
          "help": "https://airtable.com/developers/web/api/introduction"
        }
      ]
    }
  },
  {
    "slug": "confluence",
    "name": "Confluence",
    "category": "Productivity",
    "authType": "oauth",
    "mcpUrl": "https://github.com/sooperset/mcp-atlassian",
    "description": "MCP server for Atlassian products (Confluence and Jira). Supports Confluence Cloud, Jira Cloud, and Jira Server/Data Center. Provides comprehensive tools for searching, reading, creating, and managing content across Atlassian workspaces.",
    "configSchema": {
      "auth": "oauth",
      "fields": [],
      "note": "Authorize via Confluence OAuth — no keys to paste.",
      "docs": "https://developer.atlassian.com/cloud/confluence/"
    }
  },
  {
    "slug": "google-calendar",
    "name": "Google Calendar",
    "category": "Productivity",
    "authType": "oauth",
    "mcpUrl": "https://github.com/takumi0706/google-calendar-mcp",
    "description": "An MCP server to interface with the Google Calendar API. Based on TypeScript.",
    "configSchema": {
      "auth": "oauth",
      "fields": [],
      "note": "Authorize via Google Calendar OAuth — no keys to paste.",
      "docs": "https://developers.google.com/calendar"
    }
  },
  {
    "slug": "microsoft-365",
    "name": "Microsoft 365",
    "category": "Productivity",
    "authType": "oauth",
    "mcpUrl": "",
    "description": "Microsoft 365 is the productivity suite — Outlook, Teams, SharePoint, OneDrive. ORIRO connects via the Microsoft Graph API for mail, calendar, files, and collaboration.",
    "configSchema": {
      "auth": "oauth",
      "fields": [],
      "note": "Authorize via Microsoft 365 OAuth — no keys to paste.",
      "docs": "https://learn.microsoft.com/graph/"
    }
  },
  {
    "slug": "figma",
    "name": "Figma",
    "category": "Design",
    "authType": "token",
    "mcpUrl": "https://github.com/GLips/Figma-Context-MCP",
    "description": "Provide coding agents direct access to Figma data to help them one-shot design implementation.",
    "configSchema": {
      "auth": "token",
      "fields": [
        {
          "key": "access_token",
          "label": "Figma Access Token",
          "type": "password",
          "help": "https://www.figma.com/developers/api"
        }
      ]
    }
  },
  {
    "slug": "canva",
    "name": "Canva",
    "category": "Design",
    "authType": "oauth",
    "mcpUrl": "",
    "description": "Canva integration for ORIRO. (Design category.)",
    "configSchema": {
      "auth": "oauth",
      "fields": [],
      "note": "Authorize via Canva OAuth — no keys to paste.",
      "docs": "https://www.canva.dev/docs/connect/"
    }
  },
  {
    "slug": "adobe",
    "name": "Adobe",
    "category": "Design",
    "authType": "oauth",
    "mcpUrl": "",
    "description": "Adobe Analytics is an enterprise web/marketing analytics platform. Its official MCP server exposes reporting and segment tools.",
    "configSchema": {
      "auth": "oauth",
      "fields": [],
      "note": "Authorize via Adobe OAuth — no keys to paste.",
      "docs": "https://developer.adobe.com/"
    }
  },
  {
    "slug": "google-analytics",
    "name": "Google Analytics",
    "category": "Data and Analytics",
    "authType": "oauth",
    "mcpUrl": "https://github.com/googleanalytics/google-analytics-mcp",
    "description": "Google Analytics (GA4) is the standard web analytics platform. Its official MCP server provides read-only reporting tools, authenticated via Google Application Default Credentials.",
    "configSchema": {
      "auth": "oauth",
      "fields": [],
      "note": "Authorize via Google Analytics OAuth — no keys to paste.",
      "docs": "https://developers.google.com/analytics"
    }
  },
  {
    "slug": "mixpanel",
    "name": "Mixpanel",
    "category": "Data and Analytics",
    "authType": "apikey",
    "mcpUrl": "https://docs.mixpanel.com/docs/mcp",
    "description": "Mixpanel is a product-analytics platform. Its official hosted MCP server (2026) answers natural-language questions about events, funnels, flows, retention, and session replays.",
    "configSchema": {
      "auth": "apikey",
      "fields": [
        {
          "key": "api_key",
          "label": "Mixpanel API Key",
          "type": "password",
          "help": "https://developer.mixpanel.com/"
        }
      ]
    }
  },
  {
    "slug": "amplitude",
    "name": "Amplitude",
    "category": "Data and Analytics",
    "authType": "apikey",
    "mcpUrl": "",
    "description": "Amplitude is a digital-analytics platform. Its official MCP server covers analytics, session replays, feature flags, and web vitals.",
    "configSchema": {
      "auth": "apikey",
      "fields": [
        {
          "key": "api_key",
          "label": "Amplitude API Key",
          "type": "password",
          "help": "https://www.docs.developers.amplitude.com/"
        }
      ]
    }
  },
  {
    "slug": "segment",
    "name": "Segment",
    "category": "Data and Analytics",
    "authType": "apikey",
    "mcpUrl": "",
    "description": "Segment is a customer-data platform. ORIRO connects via its REST + Connections API to route and manage event and customer data across tools.",
    "configSchema": {
      "auth": "apikey",
      "fields": [
        {
          "key": "api_key",
          "label": "Segment API Key",
          "type": "password",
          "help": "https://segment.com/docs/"
        }
      ]
    }
  },
  {
    "slug": "snowflake",
    "name": "Snowflake",
    "category": "Data and Analytics",
    "authType": "apikey",
    "mcpUrl": "https://github.com/Snowflake-Labs/mcp",
    "description": "Open-source MCP server for Snowflake from official Snowflake-Labs supports prompting Cortex Agents, querying structured & unstructured data, object management, SQL execution, semantic view querying, and more. RBAC, fine-grained CRUD controls, and all authentication methods supported.",
    "configSchema": {
      "auth": "apikey",
      "fields": [
        {
          "key": "api_key",
          "label": "Snowflake API Key",
          "type": "password",
          "help": "https://docs.snowflake.com/"
        }
      ]
    }
  },
  {
    "slug": "bigquery",
    "name": "BigQuery",
    "category": "Data and Analytics",
    "authType": "apikey",
    "mcpUrl": "https://github.com/ergut/mcp-bigquery-server",
    "description": "Server implementation for Google BigQuery integration that enables direct BigQuery database access and querying capabilities",
    "configSchema": {
      "auth": "apikey",
      "fields": [
        {
          "key": "api_key",
          "label": "BigQuery API Key",
          "type": "password",
          "help": "https://cloud.google.com/bigquery/docs"
        }
      ]
    }
  },
  {
    "slug": "supabase",
    "name": "Supabase",
    "category": "Data and Analytics",
    "authType": "apikey",
    "mcpUrl": "https://github.com/supabase-community/supabase-mcp",
    "description": "Official Supabase MCP server to connect AI assistants directly with your Supabase project and allows them to perform tasks like managing tables, fetching config, and querying data.",
    "configSchema": {
      "auth": "apikey",
      "fields": [
        {
          "key": "api_key",
          "label": "Supabase API Key",
          "type": "password",
          "help": "https://supabase.com/docs"
        }
      ]
    }
  },
  {
    "slug": "mongodb-atlas",
    "name": "MongoDB Atlas",
    "category": "Data and Analytics",
    "authType": "apikey",
    "mcpUrl": "https://github.com/furey/mongodb-lens",
    "description": "MongoDB Lens: Full Featured MCP Server for MongoDB Databases",
    "configSchema": {
      "auth": "apikey",
      "fields": [
        {
          "key": "api_key",
          "label": "MongoDB Atlas API Key",
          "type": "password",
          "help": "https://www.mongodb.com/docs/atlas/"
        }
      ]
    }
  },
  {
    "slug": "planetscale",
    "name": "PlanetScale",
    "category": "Data and Analytics",
    "authType": "apikey",
    "mcpUrl": "https://github.com/planetscale/cli",
    "description": "The CLI for PlanetScale Database.",
    "configSchema": {
      "auth": "apikey",
      "fields": [
        {
          "key": "api_key",
          "label": "PlanetScale API Key",
          "type": "password",
          "help": "https://planetscale.com/docs"
        }
      ]
    }
  },
  {
    "slug": "stripe",
    "name": "Stripe",
    "category": "Finance",
    "authType": "apikey",
    "mcpUrl": "",
    "description": "Stripe integration for ORIRO. (Finance category.)",
    "configSchema": {
      "auth": "apikey",
      "fields": [
        {
          "key": "api_key",
          "label": "Stripe API Key",
          "type": "password",
          "help": "https://stripe.com/docs/api"
        }
      ]
    }
  },
  {
    "slug": "quickbooks",
    "name": "QuickBooks",
    "category": "Finance",
    "authType": "oauth",
    "mcpUrl": "",
    "description": "QuickBooks integration for ORIRO. (Finance category.)",
    "configSchema": {
      "auth": "oauth",
      "fields": [],
      "note": "Authorize via QuickBooks OAuth — no keys to paste.",
      "docs": "https://developer.intuit.com/"
    }
  },
  {
    "slug": "xero",
    "name": "Xero",
    "category": "Finance",
    "authType": "oauth",
    "mcpUrl": "https://github.com/XeroAPI/xero-mcp-server",
    "description": "An MCP server that integrates with Xero's API, allowing for standardized access to Xero's accounting and business features.",
    "configSchema": {
      "auth": "oauth",
      "fields": [],
      "note": "Authorize via Xero OAuth — no keys to paste.",
      "docs": "https://developer.xero.com/"
    }
  },
  {
    "slug": "plaid",
    "name": "Plaid",
    "category": "Finance",
    "authType": "apikey",
    "mcpUrl": "",
    "description": "Plaid connects apps to users' bank accounts. ORIRO connects via its REST API for balances, transactions, and identity (financial data connectivity).",
    "configSchema": {
      "auth": "apikey",
      "fields": [
        {
          "key": "api_key",
          "label": "Plaid API Key",
          "type": "password",
          "help": "https://plaid.com/docs/api/"
        }
      ]
    }
  },
  {
    "slug": "shopify",
    "name": "Shopify",
    "category": "E-commerce",
    "authType": "apikey",
    "mcpUrl": "",
    "description": "Shopify is a leading e-commerce platform. ORIRO connects via its REST + GraphQL Admin API to manage products, orders, customers, and inventory.",
    "configSchema": {
      "auth": "apikey",
      "fields": [
        {
          "key": "api_key",
          "label": "Shopify API Key",
          "type": "password",
          "help": "https://shopify.dev/docs/api"
        }
      ]
    }
  },
  {
    "slug": "woocommerce",
    "name": "WooCommerce",
    "category": "E-commerce",
    "authType": "apikey",
    "mcpUrl": "",
    "description": "WooCommerce is the WordPress e-commerce plugin powering millions of stores. ORIRO connects via its REST API for products, orders, and customers.",
    "configSchema": {
      "auth": "apikey",
      "fields": [
        {
          "key": "api_key",
          "label": "WooCommerce API Key",
          "type": "password",
          "help": "https://woocommerce.github.io/woocommerce-rest-api-docs/"
        }
      ]
    }
  },
  {
    "slug": "mailchimp",
    "name": "Mailchimp",
    "category": "Marketing",
    "authType": "apikey",
    "mcpUrl": "",
    "description": "Mailchimp is an email-marketing industry standard. ORIRO connects via REST API v3 to manage audiences, campaigns, and automations.",
    "configSchema": {
      "auth": "apikey",
      "fields": [
        {
          "key": "api_key",
          "label": "Mailchimp API Key",
          "type": "password",
          "help": "https://mailchimp.com/developer/"
        }
      ]
    }
  },
  {
    "slug": "sendgrid",
    "name": "SendGrid",
    "category": "Marketing",
    "authType": "apikey",
    "mcpUrl": "",
    "description": "SendGrid is a transactional and marketing email service used by millions of developers. ORIRO connects via its REST API to send mail and manage templates, contacts, and stats.",
    "configSchema": {
      "auth": "apikey",
      "fields": [
        {
          "key": "api_key",
          "label": "SendGrid API Key",
          "type": "password",
          "help": "https://docs.sendgrid.com/api-reference"
        }
      ]
    }
  },
  {
    "slug": "hubspot",
    "name": "HubSpot",
    "category": "Marketing",
    "authType": "oauth",
    "mcpUrl": "https://developers.hubspot.com/mcp",
    "description": "HubSpot is a leading CRM and marketing/sales platform. Its official remote MCP server (GA May 2026) works with contacts, companies, deals, tickets, and engagements.",
    "configSchema": {
      "auth": "oauth",
      "fields": [],
      "note": "Authorize via HubSpot OAuth — no keys to paste.",
      "docs": "https://developers.hubspot.com/"
    }
  },
  {
    "slug": "salesforce",
    "name": "Salesforce",
    "category": "Marketing",
    "authType": "oauth",
    "mcpUrl": "https://github.com/salesforcecli/mcp",
    "description": "Salesforce is the leading enterprise CRM. The official salesforcecli/mcp server (Apache 2.0) exposes 60+ tools with dynamic toolsets for orgs, records, and metadata.",
    "configSchema": {
      "auth": "oauth",
      "fields": [],
      "note": "Authorize via Salesforce OAuth — no keys to paste.",
      "docs": "https://developer.salesforce.com/"
    }
  },
  {
    "slug": "meta",
    "name": "Meta",
    "category": "Marketing",
    "authType": "oauth",
    "mcpUrl": "https://github.com/gomarble-ai/facebook-ads-mcp-server",
    "description": "MCP server acting as an interface to the Facebook Ads, enabling programmatic access to Facebook Ads data and management features.",
    "configSchema": {
      "auth": "oauth",
      "fields": [],
      "note": "Authorize via Meta OAuth — no keys to paste.",
      "docs": "https://developers.facebook.com/"
    }
  },
  {
    "slug": "google-ads",
    "name": "Google Ads",
    "category": "Marketing",
    "authType": "oauth",
    "mcpUrl": "https://github.com/gomarble-ai/google-ads-mcp-server",
    "description": "MCP server acting as an interface to the Google Ads, enabling programmatic access to Google Ads data and management features.",
    "configSchema": {
      "auth": "oauth",
      "fields": [],
      "note": "Authorize via Google Ads OAuth — no keys to paste.",
      "docs": "https://developers.google.com/google-ads/api/docs/start"
    }
  },
  {
    "slug": "youtube",
    "name": "YouTube",
    "category": "Media and Content",
    "authType": "oauth",
    "mcpUrl": "https://github.com/kimtaeyoon83/mcp-server-youtube-transcript",
    "description": "Fetch YouTube subtitles and transcripts for AI analysis",
    "configSchema": {
      "auth": "oauth",
      "fields": [],
      "note": "Authorize via YouTube OAuth — no keys to paste.",
      "docs": "https://developers.google.com/youtube"
    }
  },
  {
    "slug": "tiktok",
    "name": "TikTok",
    "category": "Media and Content",
    "authType": "oauth",
    "mcpUrl": "https://github.com/Seym0n/tiktok-mcp",
    "description": "Interact with TikTok videos",
    "configSchema": {
      "auth": "oauth",
      "fields": [],
      "note": "Authorize via TikTok OAuth — no keys to paste.",
      "docs": "https://developers.tiktok.com/"
    }
  },
  {
    "slug": "vimeo",
    "name": "Vimeo",
    "category": "Media and Content",
    "authType": "oauth",
    "mcpUrl": "",
    "description": "Vimeo is a professional video-hosting platform. ORIRO connects via its REST API v3.4 (OAuth) to upload, manage, and retrieve videos.",
    "configSchema": {
      "auth": "oauth",
      "fields": [],
      "note": "Authorize via Vimeo OAuth — no keys to paste.",
      "docs": "https://developer.vimeo.com/"
    }
  },
  {
    "slug": "wordpress",
    "name": "WordPress",
    "category": "Media and Content",
    "authType": "apikey",
    "mcpUrl": "",
    "description": "WordPress integration for ORIRO. (Media and Content category.)",
    "configSchema": {
      "auth": "apikey",
      "fields": [
        {
          "key": "api_key",
          "label": "WordPress API Key",
          "type": "password",
          "help": "https://developer.wordpress.org/rest-api/"
        }
      ]
    }
  },
  {
    "slug": "ghost",
    "name": "Ghost",
    "category": "Media and Content",
    "authType": "apikey",
    "mcpUrl": "",
    "description": "Ghost is a modern publishing platform. ORIRO connects via its Content + Admin REST API to manage posts, pages, and members.",
    "configSchema": {
      "auth": "apikey",
      "fields": [
        {
          "key": "api_key",
          "label": "Ghost API Key",
          "type": "password",
          "help": "https://ghost.org/docs/admin-api/"
        }
      ]
    }
  },
  {
    "slug": "hugging-face",
    "name": "Hugging Face",
    "category": "AI and Research",
    "authType": "token",
    "mcpUrl": "https://github.com/evalstate/mcp-hfspace",
    "description": "Use HuggingFace Spaces directly from Claude. Use Open Source Image Generation, Chat, Vision tasks and more. Supports Image, Audio and text uploads/downloads.",
    "configSchema": {
      "auth": "token",
      "fields": [
        {
          "key": "access_token",
          "label": "Hugging Face Access Token",
          "type": "password",
          "help": "https://huggingface.co/docs/api-inference"
        }
      ]
    }
  },
  {
    "slug": "replicate",
    "name": "Replicate",
    "category": "AI and Research",
    "authType": "token",
    "mcpUrl": "https://github.com/awkoy/replicate-flux-mcp",
    "description": "Provides the ability to generate images via Replicate's API.",
    "configSchema": {
      "auth": "token",
      "fields": [
        {
          "key": "access_token",
          "label": "Replicate Access Token",
          "type": "password",
          "help": "https://replicate.com/docs/reference/http"
        }
      ]
    }
  },
  {
    "slug": "wolfram-alpha",
    "name": "Wolfram Alpha",
    "category": "AI and Research",
    "authType": "apikey",
    "mcpUrl": "https://github.com/SecretiveShell/MCP-wolfram-alpha",
    "description": "An MCP server for querying wolfram alpha API.",
    "configSchema": {
      "auth": "apikey",
      "fields": [
        {
          "key": "api_key",
          "label": "Wolfram Alpha API Key",
          "type": "password",
          "help": "https://products.wolframalpha.com/api/"
        }
      ]
    }
  },
  {
    "slug": "arxiv",
    "name": "arXiv",
    "category": "AI and Research",
    "authType": "none",
    "mcpUrl": "https://github.com/andybrandt/mcp-simple-arxiv",
    "description": "MCP for LLM to search and read papers from arXiv",
    "configSchema": {
      "auth": "none",
      "fields": [],
      "note": "Public API — no credentials required."
    }
  },
  {
    "slug": "pubmed",
    "name": "PubMed",
    "category": "AI and Research",
    "authType": "none",
    "mcpUrl": "https://github.com/andybrandt/mcp-simple-pubmed",
    "description": "MCP to search and read medical / life sciences papers from PubMed.",
    "configSchema": {
      "auth": "none",
      "fields": [],
      "note": "Public API — no credentials required."
    }
  },
  {
    "slug": "octoprint",
    "name": "OctoPrint",
    "category": "Making and Hardware",
    "authType": "apikey",
    "mcpUrl": "",
    "description": "OctoPrint is the leading 3D-printer web control software (8k+ stars). ORIRO connects via its REST API to monitor and control prints.",
    "configSchema": {
      "auth": "apikey",
      "fields": [
        {
          "key": "api_key",
          "label": "OctoPrint API Key",
          "type": "password",
          "help": "https://docs.octoprint.org/en/master/api/"
        }
      ]
    }
  },
  {
    "slug": "arduino-cloud",
    "name": "Arduino Cloud",
    "category": "Making and Hardware",
    "authType": "apikey",
    "mcpUrl": "",
    "description": "Arduino Cloud is an IoT platform for managing devices and dashboards. ORIRO connects via its REST API for device and data management.",
    "configSchema": {
      "auth": "apikey",
      "fields": [
        {
          "key": "api_key",
          "label": "Arduino Cloud API Key",
          "type": "password",
          "help": "https://docs.arduino.cc/arduino-cloud/"
        }
      ]
    }
  },
  {
    "slug": "home-assistant",
    "name": "Home Assistant",
    "category": "Making and Hardware",
    "authType": "token",
    "mcpUrl": "https://github.com/tevonsb/homeassistant-mcp",
    "description": "Access Home Assistant data and control devices (lights, switches, thermostats, etc).",
    "configSchema": {
      "auth": "token",
      "fields": [
        {
          "key": "access_token",
          "label": "Home Assistant Access Token",
          "type": "password",
          "help": "https://developers.home-assistant.io/docs/api/rest/"
        }
      ]
    }
  }
];

export function connectorBySlug(slug: string): ConnectorEntry | undefined {
  return CONNECTOR_CATALOG.find((c) => c.slug === slug);
}

export function connectorsByCategory(category: string): ConnectorEntry[] {
  return CONNECTOR_CATALOG.filter((c) => c.category === category);
}

export function connectorCategories(): string[] {
  return [...new Set(CONNECTOR_CATALOG.map((c) => c.category))].sort();
}
