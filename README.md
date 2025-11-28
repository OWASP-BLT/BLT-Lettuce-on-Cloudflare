# BLT-Lettuce-on-Cloudflare

🥬 **The BLT Lettuce (OWASP Helper) Bot** - An Interactive OWASP Project Finder Bot hosted on Cloudflare Workers (Python)

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/OWASP-BLT/BLT-Lettuce-on-Cloudflare)

## Features

- 🔍 **Interactive Project Finder** - Guides users through a flowchart conversation to find the perfect OWASP project
- 🎉 **Automatic Welcome Messages** - Sends an interactive welcome message to new members when they join your Slack workspace
- 🏗️ **GitHub Integration** - Automatically scans OWASP GitHub organizations for projects with `index.md` metadata
- 💾 **Smart Caching** - Caches project metadata with automatic 24-hour refresh via scheduled tasks
- 📊 **Stats Dashboard** - Track search statistics with a beautiful dashboard
- 🐍 **Python Native** - Built with Cloudflare Workers Python support for clean, maintainable code
- 🚀 **One-Click Deploy** - Deploy to Cloudflare Workers with a single click

## How It Works

The bot uses a **flowchart-based conversation** to help users find OWASP projects:

1. **User joins Slack** → Receives interactive welcome message
2. **User clicks "Find a Project"** → Bot asks categorization questions
3. **Multiple-choice questions** → Technology-based or mission-based approach
4. **Project recommendations** → Links to matching OWASP projects
5. **Fallback** → If no projects found, option to start over or learn how to start a new project

### Project Categorization Flow

```
Start
├── 🛠️ Security Tool
│   ├── Code Analysis/SAST
│   ├── Web Application Testing
│   ├── Authentication/Authorization
│   └── Security Monitoring
├── 📚 Documentation/Guide
│   ├── Security Standards/Checklists
│   ├── Secure Development Guide
│   ├── Security Testing Guide
│   └── Quick Reference/Cheatsheet
├── 🎓 Training/Education
│   ├── Hands-on Labs/CTF
│   ├── Presentations/Slides
│   └── Courses/Curriculum
└── 🔬 Vulnerable Application
    ├── Web Application
    ├── Mobile Application
    └── API Security
```

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [uv](https://docs.astral.sh/uv/) (Python package manager)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)

### One-Click Deploy

1. Click the **Deploy to Cloudflare Workers** button above
2. Follow the prompts to connect your Cloudflare account
3. Configure your Slack app credentials (see below)
4. Your bot is live!

### Manual Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/OWASP-BLT/BLT-Lettuce-on-Cloudflare.git
   cd BLT-Lettuce-on-Cloudflare
   ```

2. **Install dependencies**
   ```bash
   npm install
   uv sync
   ```

3. **Create a Slack App**
   - Go to [Slack API](https://api.slack.com/apps) and create a new app
   - Enable **Event Subscriptions** and subscribe to:
     - `team_join` - When users join the workspace
     - `message.im` - Direct messages to the bot
   - Enable **Interactivity** and set the Request URL (see step 7)
   - Add the following **Bot Token Scopes**:
     - `chat:write` - Send messages
     - `im:write` - Open direct messages
     - `im:history` - Read direct message history
     - `users:read` - Read user info
   - Install the app to your workspace
   - Copy the **Bot User OAuth Token** and **Signing Secret**

4. **Create a KV namespace**
   ```bash
   npx wrangler kv:namespace create SLACK_BOT_KV
   ```
   Update `wrangler.toml` with the returned namespace ID.

5. **Set secrets**
   ```bash
   npx wrangler secret put SLACK_BOT_TOKEN
   npx wrangler secret put SLACK_SIGNING_SECRET
   ```

6. **Deploy**
   ```bash
   npx wrangler deploy
   ```

7. **Configure Slack URLs**
   In your Slack app settings:
   - **Event Request URL**: `https://your-worker.your-subdomain.workers.dev/slack/events`
   - **Interactivity Request URL**: `https://your-worker.your-subdomain.workers.dev/slack/interactivity`

## Dashboard

The bot includes a built-in dashboard at your worker URL that shows:

- **Members Welcomed** - Count of all members who received welcome messages
- **Last Join** - When the most recent member joined
- **Joins Today** - Number of new members today
- **Joins Chart** - Visual chart of joins over the last 30 days
- **Recent Joins List** - Table of recent join events
- **Total Searches** - Count of project finder queries
- **Projects Indexed** - Number of OWASP projects in cache
- **Search Categories** - Chart showing which categories are most searched
- **Featured Projects** - Top OWASP projects by level and stars

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /` | Dashboard homepage |
| `POST /slack/events` | Slack Events API endpoint |
| `POST /slack/interactivity` | Slack Interactive Components endpoint |
| `GET /api/stats` | Get combined search and join statistics |
| `GET /api/projects` | Get cached OWASP projects |
| `GET /api/joins` | Get list of recent joins |

## Project Metadata

The bot scans OWASP GitHub repositories for `index.md` files with YAML frontmatter:

```yaml
---
layout: col-sidebar
title: OWASP Project Name
tags: tag1, tag2
level: 4
type: tool
pitch: Short description of the project
---
```

### Metadata Fields

| Field | Description |
|-------|-------------|
| `title` | Project name |
| `tags` | Keywords for categorization |
| `level` | OWASP project level (1-4, with 4 = Flagship) |
| `type` | Project type (tool, documentation, code, etc.) |
| `pitch` | Short description |

## Development

```bash
# Run locally
npx wrangler dev

# Run tests
npm test

# Lint
npm run lint

# Type check
npm run type-check
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SLACK_BOT_TOKEN` | Slack Bot OAuth Token (starts with `xoxb-`) |
| `SLACK_SIGNING_SECRET` | Slack Signing Secret for request verification |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Cloudflare Worker (Python)              │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │ Slack Events│  │ Interactivity│  │ Dashboard/API   │  │
│  │   Handler   │  │   Handler   │  │    Handler      │  │
│  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘  │
│         │                │                   │          │
│         ▼                ▼                   ▼          │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Core Bot Logic                       │   │
│  │  - Flowchart Navigation                          │   │
│  │  - Project Matching                              │   │
│  │  - Slack API Communication                       │   │
│  └──────────────────────────────────────────────────┘   │
│         │                                               │
│         ▼                                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │              KV Storage                           │   │
│  │  - Project Cache (24h TTL)                       │   │
│  │  - Conversation State                            │   │
│  │  - Search Statistics                             │   │
│  └──────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│  Scheduled Task: Daily cache refresh (0 0 * * *)        │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│  GitHub API     │
│  (OWASP repos)  │
└─────────────────┘
```

## License

This project is licensed under the GNU Affero General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## About OWASP BLT

[OWASP BLT](https://owasp.org/www-project-bug-logging-tool/) (Bug Logging Tool) is an open-source project designed to help the security community track and report vulnerabilities.

