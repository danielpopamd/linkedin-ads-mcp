# LinkedIn Ads MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-blue)](https://modelcontextprotocol.io)

An MCP (Model Context Protocol) server that enables **Claude AI** to access and analyze your LinkedIn Ads data. Built for marketers, founders, and growth teams who want to leverage AI for campaign optimization, performance reporting, and data-driven advertising decisions.

---

# Quick Install (No Coding Required!)

**Don't want to deal with technical stuff?** Just copy one of the prompts below and paste it into Claude. The AI will do everything for you!

---

## Option 1: Install with Claude Code (Recommended)

If you have [Claude Code](https://claude.ai/code) installed, just copy and paste this entire prompt:

<details>
<summary><strong>Click to expand the Claude Code installation prompt</strong></summary>

```
I want you to install the LinkedIn Ads MCP server so I can analyze my LinkedIn advertising data. Please do the following:

1. FIRST, check if Node.js is installed by running `node --version`. If not installed, tell me to install it from https://nodejs.org first.

2. Clone the repository to my home directory:
   - cd ~
   - git clone https://github.com/danielpopamd/linkedin-ads-mcp.git
   - cd linkedin-ads-mcp

3. Install dependencies and build:
   - npm install
   - npm run build

4. Create the .env file with placeholder values:
   - cp .env.example .env

5. NOW IMPORTANT - Ask me for my LinkedIn API credentials:
   - Ask: "Please provide your LinkedIn Client ID (from https://www.linkedin.com/developers/apps)"
   - Ask: "Please provide your LinkedIn Client Secret"

6. Update the .env file with the credentials I provide.

7. Set up Claude Desktop configuration:
   - Read the current Claude Desktop config file:
     - macOS: ~/Library/Application Support/Claude/claude_desktop_config.json
     - Windows: %APPDATA%/Claude/claude_desktop_config.json
   - Add the linkedin-ads MCP server to mcpServers (merge with existing config if any):
     {
       "mcpServers": {
         "linkedin-ads": {
           "command": "node",
           "args": ["<FULL_PATH_TO>/linkedin-ads-mcp/dist/index.js"],
           "env": {
             "LINKEDIN_CLIENT_ID": "<MY_CLIENT_ID>",
             "LINKEDIN_CLIENT_SECRET": "<MY_CLIENT_SECRET>"
           }
         }
       }
     }
   - Replace <FULL_PATH_TO> with the actual path (e.g., /Users/username)
   - Replace the env values with my actual credentials

8. Run the authentication flow:
   - npm run auth
   - This will open my browser - tell me to authorize the app with LinkedIn

9. Tell me to restart Claude Desktop to activate the MCP server.

10. After restart, confirm setup by telling me to ask Claude: "List my LinkedIn ad accounts"

If you don't have my LinkedIn API credentials yet, first explain how to get them:
- Go to https://www.linkedin.com/developers/apps
- Create a new app (need a LinkedIn Company Page)
- Go to Products tab and request "Advertising API" access
- Go to Auth tab and add redirect URL: http://localhost:3000/callback
- Copy the Client ID and Client Secret

Start now!
```

</details>

---

## Option 2: Install with Claude Desktop (Chat-Based)

If you're using Claude Desktop directly (without Claude Code), copy this prompt to start a guided setup:

<details>
<summary><strong>Click to expand the Claude Desktop guided setup prompt</strong></summary>

```
I want to install the LinkedIn Ads MCP server to analyze my LinkedIn advertising data with Claude. I'm not technical, so please guide me step by step with simple instructions.

Please walk me through:

1. **Check Prerequisites**
   - Do I have Node.js installed? (Tell me how to check and where to download if needed)
   - Do I have a LinkedIn Developer App? (If not, guide me through creating one at https://www.linkedin.com/developers/apps)

2. **Get LinkedIn API Access**
   Walk me through:
   - Creating a LinkedIn Developer App
   - Requesting Advertising API access (Products tab)
   - Adding the redirect URL: http://localhost:3000/callback (Auth tab)
   - Finding my Client ID and Client Secret

3. **Download and Install**
   Give me the exact commands to run in my terminal (one at a time):
   - How to open Terminal (Mac) or Command Prompt (Windows)
   - Clone the repository
   - Install dependencies
   - Build the project

4. **Configure Claude Desktop**
   - Tell me exactly where the config file is located
   - Give me the exact JSON to add (with placeholders for my credentials)
   - Show me how to edit the file

5. **Authenticate with LinkedIn**
   - What command to run
   - What to do when the browser opens

6. **Test the Setup**
   - Tell me to restart Claude Desktop
   - Give me a test question to ask

Please start with step 1 and wait for my response before moving to the next step. Use simple language and assume I've never used a terminal before.
```

</details>

---

## What You'll Need Before Installing

Before using either installation method, you'll need:

1. **Node.js** (version 18 or higher) - [Download here](https://nodejs.org)
2. **A LinkedIn Company Page** - Required to create a developer app
3. **LinkedIn Developer App** with Advertising API access - [Create one here](https://www.linkedin.com/developers/apps)

### Getting LinkedIn API Credentials (5-10 minutes)

1. Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps)
2. Click **"Create App"**
3. Fill in:
   - **App name**: "My LinkedIn Ads Analytics" (or anything you want)
   - **LinkedIn Page**: Select your company page
   - **App logo**: Upload any square image
4. After creating, go to **"Products"** tab → Request **"Advertising API"** (approval takes 1-5 days)
5. Go to **"Auth"** tab → Add redirect URL: `http://localhost:3000/callback`
6. Copy your **Client ID** and **Client Secret** - you'll need these!

---

## Created By

**[Daniel Popa](https://danielpopa.me)** - Performance Marketing Consultant & AI Automation Specialist

I help ambitious startups scale profitably through paid ads, conversion rate optimization, and data-driven growth strategies. With 10+ years in performance marketing and $100M+ in managed ad budgets, I now focus on implementing AI workflows and automation to improve marketing efficiency and performance.

This tool was built to bridge the gap between LinkedIn's advertising data and AI-powered analysis, making it easier for marketers to get actionable insights through natural language conversations with Claude.

- Website: [danielpopa.me](https://danielpopa.me)
- Focus: Performance Marketing, AI Automation, Growth Strategy

---

# Manual Installation (For Developers)

If you prefer to install manually or want more control, follow the instructions below.

---

## What This Does

This MCP server connects Claude Desktop (or any MCP-compatible client) to the LinkedIn Marketing API, allowing you to:

- **Query campaign performance** using natural language
- **Analyze audience demographics** to understand who's engaging with your ads
- **Track conversions and leads** across your LinkedIn campaigns
- **Compare performance** between time periods, campaigns, or campaign groups
- **Get AI-powered insights** on your advertising data

### Example Conversations with Claude

```
"Show me campaign performance for the last 30 days"
"Which job functions are responding best to my ads?"
"Compare this week's performance vs last week"
"What's my cost per lead for the lead gen campaigns?"
"Which creatives have the best CTR?"
"Show me the daily trend for conversions"
```

---

## Features

- **14 Specialized Tools** - Covering accounts, campaigns, creatives, audiences, conversions, and analytics
- **Comprehensive Metrics** - Every report includes: Spend, Impressions, Clicks, CTR, Reach, Frequency, Engagements, Engagement Rate, CPM, CPC, Conversions, Conversion Rate, Cost per Conversion, and Audience Penetration
- **Single OAuth Authentication** - Authenticate once and access all your LinkedIn ad accounts
- **Automatic Token Refresh** - Tokens refresh automatically before expiration
- **Rate Limit Handling** - Built-in exponential backoff for API rate limits
- **Human-Readable Names** - Demographic data shows actual names (not IDs) for seniorities, job functions, industries, and more

---

## Prerequisites

### 1. LinkedIn Developer App

Before using this MCP server, you need to set up a LinkedIn Developer application:

1. Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps)
2. Click **"Create App"**
3. Fill in your app details:
   - **App name**: e.g., "My LinkedIn Ads Analytics"
   - **LinkedIn Page**: Select your company page
   - **App logo**: Upload a logo (required)
4. Note your **Client ID** and **Client Secret**

### 2. Request Advertising API Access

1. In your app, go to the **"Products"** tab
2. Select **"Advertising API"**
3. Submit the request form with your business justification
4. Wait for approval (typically 1-5 business days)

### 3. Configure OAuth

1. Go to the **"Auth"** tab in your app
2. Add this redirect URL: `http://localhost:3000/callback`
3. Verify these OAuth 2.0 scopes are available:
   - `r_ads` - Read ad accounts
   - `r_ads_reporting` - Read reporting data
   - `r_organization_social` - Read organization posts (for creative content)

---

## Installation

```bash
# Clone the repository
git clone https://github.com/danielpopamd/linkedin-ads-mcp.git
cd linkedin-ads-mcp

# Install dependencies
npm install

# Build the project
npm run build

# Create your environment file
cp .env.example .env
```

Edit `.env` with your LinkedIn credentials:

```env
LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret
```

---

## Authentication

Run the authentication flow to get your access tokens:

```bash
npm run auth
```

This will:
1. Open your browser to LinkedIn's OAuth page
2. Ask you to authorize the application
3. Store your tokens locally in `~/.linkedin-ads-mcp/tokens.json`
4. Tokens are valid for 60 days and auto-refresh

---

## Claude Desktop Setup

Add this to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "linkedin-ads": {
      "command": "node",
      "args": ["/full/path/to/linkedin-ads-mcp/dist/index.js"],
      "env": {
        "LINKEDIN_CLIENT_ID": "your_client_id",
        "LINKEDIN_CLIENT_SECRET": "your_client_secret"
      }
    }
  }
}
```

**Important**: Replace `/full/path/to/linkedin-ads-mcp` with the actual path where you cloned this repository.

After updating the config, restart Claude Desktop for the changes to take effect.

---

## Available Tools

### Account Management

| Tool | Description |
|------|-------------|
| `list_ad_accounts` | List all accessible LinkedIn ad accounts |
| `get_account_details` | Get detailed account configuration and settings |

### Campaign & Creative Performance

| Tool | Description |
|------|-------------|
| `get_campaign_performance` | Campaign metrics with all standard KPIs |
| `get_creative_performance` | Ad-level metrics with engagement and video stats |
| `get_campaign_groups` | List campaign groups with aggregated performance |

### Audience & Demographics

| Tool | Description |
|------|-------------|
| `get_audience_demographics` | Performance by job function, industry, seniority, company size, country, region |
| `get_audience_reach` | Unique member reach and frequency metrics |
| `list_saved_audiences` | View matched and lookalike audiences |

### Conversions & Lead Generation

| Tool | Description |
|------|-------------|
| `get_conversion_performance` | Conversion metrics by conversion action |
| `list_conversions` | View conversion tracking rules and configuration |
| `get_lead_gen_performance` | Lead form submissions and cost per lead |
| `list_lead_forms` | View lead gen form configurations |

### Advanced Analytics

| Tool | Description |
|------|-------------|
| `compare_performance` | Compare metrics between time periods or entities |
| `get_daily_trends` | Daily time-series data for trend analysis |

---

## Standard Metrics

Every performance report includes these metrics:

| Metric | Description |
|--------|-------------|
| **Spend** | Total cost in USD |
| **Impressions** | Number of times ads were shown |
| **Clicks** | Total clicks on ads |
| **CTR** | Click-through rate (%) |
| **Reach** | Approximate unique members reached |
| **Frequency** | Average impressions per unique member |
| **Engagements** | Total engagements (likes, comments, shares, etc.) |
| **Engagement Rate** | Engagements / Impressions (%) |
| **CPM** | Cost per 1,000 impressions |
| **CPC** | Cost per click |
| **Conversions** | Total conversion events |
| **Conversion Rate** | Conversions / Clicks (%) |
| **Cost per Conversion** | Spend / Conversions |
| **Audience Penetration** | Reach / Estimated audience size (%) |

---

## API Limits & Best Practices

### LinkedIn API Limits

- **Rate Limit**: 45 million metric values per 5-minute window
- **Response Limit**: Max 15,000 elements per response
- **Metrics per Request**: Max 20 metrics
- **Demographic Data Delay**: 12-24 hours
- **Reach Data**: Max 92-day date range

### Best Practices

1. **Start with account listing** - Always list accounts first to get valid account IDs
2. **Use reasonable date ranges** - Shorter ranges return faster; use 30 days for regular reporting
3. **Be specific with campaigns** - Filter by campaign IDs when you know which campaigns to analyze
4. **Leverage comparisons** - Use the compare tool to quickly identify performance changes

---

## Project Structure

```
linkedin-ads-mcp/
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── auth-cli.ts           # OAuth CLI tool
│   ├── auth/
│   │   ├── oauth.ts          # OAuth 2.0 flow
│   │   └── token-store.ts    # Secure token storage
│   ├── lib/
│   │   ├── linkedin-api.ts   # LinkedIn Marketing API client
│   │   └── types.ts          # TypeScript type definitions
│   └── tools/
│       ├── accounts.ts       # Account management tools
│       ├── performance.ts    # Campaign & creative performance
│       ├── demographics.ts   # Audience demographics tools
│       ├── conversions.ts    # Conversion & lead gen tools
│       └── analytics.ts      # Advanced analytics tools
├── dist/                     # Compiled JavaScript output
├── package.json
├── tsconfig.json
└── .env.example
```

---

## Development

```bash
# Build the project
npm run build

# Run the server (for testing)
npm run dev

# Run authentication flow
npm run auth
```

---

## Troubleshooting

### "Not authenticated" error

Run `npm run auth` to authenticate with LinkedIn.

### "Rate limited" responses

The server automatically handles rate limits with exponential backoff. If you're hitting limits frequently, reduce the frequency of your requests.

### Token expired

Tokens auto-refresh. If you're still having issues, delete `~/.linkedin-ads-mcp/tokens.json` and re-authenticate with `npm run auth`.

### API access denied

Ensure your LinkedIn Developer app has:
1. The "Advertising API" product approved
2. The correct OAuth scopes enabled (`r_ads`, `r_ads_reporting`)
3. Your user account has access to the ad accounts you're trying to query

### Campaign names showing as "Unknown"

This typically means the campaign ID from analytics doesn't match any campaign in your account. This can happen with archived campaigns or if there's a sync delay.

---

## Tech Stack

- **[Model Context Protocol (MCP)](https://modelcontextprotocol.io)** - The protocol that enables Claude to interact with external tools
- **[LinkedIn Marketing API](https://learn.microsoft.com/en-us/linkedin/marketing/)** - Official API for LinkedIn advertising data
- **TypeScript** - Type-safe development
- **Node.js** - Runtime environment

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

## Acknowledgments

Built with the [Model Context Protocol SDK](https://github.com/modelcontextprotocol/sdk) by Anthropic.

---

**Made with AI-powered workflows by [Daniel Popa](https://danielpopa.me)**
