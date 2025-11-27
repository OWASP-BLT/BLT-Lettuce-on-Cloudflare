# BLT Lettuce

A comprehensive serverless Slackbot for the OWASP BLT project, built on Cloudflare Workers with TypeScript.

## Features

- 🎉 **Automatic Welcome Messages** - Sends personalized welcome messages to new members
- 🔒 **Security Testing** - Run XSS, SQLi, CSRF, and Open Redirect tests via slash commands
- 📊 **Analytics Dashboard** - Track join statistics with beautiful charts
- ⚡ **Edge Performance** - Sub-50ms response times via Cloudflare's global network
- 🤖 **Smart Event Handling** - Detects contribution mentions and handles DMs
- 🚀 **Zero Infrastructure** - No servers to manage, scales automatically

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Create KV namespace
npx wrangler kv:namespace create SLACK_BOT_KV
# Update wrangler.toml with the returned namespace ID

# 3. Configure Slack app at api.slack.com/apps
# - Create new app with Bot Token Scopes: 
#   chat:write, channels:read, im:write, im:read, users:read
# - Enable slash commands: /blt-test, /blt-help
# - Enable events: team_join, message.channels, message.im
# - Copy Bot Token and Signing Secret

# 4. Set up credentials
npx wrangler secret put SLACK_BOT_TOKEN
npx wrangler secret put SLACK_SIGNING_SECRET

# 5. Deploy to Cloudflare
npm run deploy

# 6. Update Slack app Request URL to: 
# https://your-worker.workers.dev/slack/events
```

## Usage

### Slash Commands

- `/blt-test xss <url>` - Test for XSS vulnerabilities
- `/blt-test sqli <url>` - Test for SQL injection
- `/blt-test csrf <url>` - Check CSRF protection
- `/blt-test open-redirect <url>` - Test redirect handling
- `/blt-help` - Show help message

### Dashboard

Visit your worker URL to see:
- Total members welcomed
- Join statistics and charts
- Recent join events
- 30-day join trends

### Automatic Features

- **Welcome Messages**: New members receive a customizable welcome DM
- **Contribution Detection**: Mentions of "contribute" trigger helpful responses
- **DM Handling**: Direct messages are logged and acknowledged

## Development

```bash
# Local development
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Run tests
npm test

# View live logs
npm run logs
```

## Project Structure

```
BLT-Lettuce/
├── src/
│   ├── index.ts              # Entry point & routing
│   ├── types.ts              # TypeScript type definitions
│   ├── config.ts             # Configuration constants
│   ├── dashboard.ts          # Dashboard HTML generator
│   ├── handlers/
│   │   ├── commands.ts       # Slash command handlers
│   │   ├── events.ts         # Slack event handlers
│   │   └── api.ts            # API endpoint handlers
│   ├── tests/
│   │   ├── runner.ts         # Security test execution
│   │   └── payloads.ts       # OWASP test payloads
│   └── utils/
│       ├── slack-api.ts      # Slack API wrappers
│       └── slack-verify.ts   # Request verification
├── WELCOME_MESSAGE.md        # Customizable welcome message
├── wrangler.toml            # Cloudflare config
└── package.json             # Dependencies
```

## Configuration

### Environment Variables

| Variable | Description |
|----------|-------------|
| `SLACK_BOT_TOKEN` | Slack Bot OAuth Token (starts with `xoxb-`) |
| `SLACK_SIGNING_SECRET` | Slack Signing Secret for request verification |

### Customization

Edit `WELCOME_MESSAGE.md` to customize the welcome message. Supports:
- Headers (`#`, `##`)
- Bold text (`**bold**`)
- Links (`[text](url)`)
- Bullet points (`-`)
- Emoji 🎉

Edit `src/config.ts` to update:
- Channel IDs for joins and contributions
- Data retention periods
- Dashboard URLs

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Dashboard homepage |
| `/health` | GET | Health check |
| `/slack/events` | POST | Slack Events API endpoint |
| `/api/stats` | GET | Get aggregate statistics |
| `/api/joins` | GET | Get list of recent joins |

## Version History

**v3.0.0** (2025-11-27) - Merged implementation
- Combined welcome bot with security testing features
- Migrated to TypeScript for better type safety
- Added comprehensive dashboard with analytics
- Unified event handling and slash commands
- Improved code organization and maintainability

**v2.0.0** (2025-11-27) - Security testing features
- Added security testing framework (XSS, SQLi, CSRF, Open Redirect)
- Implemented slash commands
- Improved performance to <50ms response time

**v1.0.0** (2024) - Original Python implementation (archived)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## License

GPL-3.0 - See [LICENSE](LICENSE)

## About OWASP BLT

[OWASP BLT](https://owasp.org/www-project-bug-logging-tool/) (Bug Logging Tool) is an open-source project designed to help the security community track and report vulnerabilities.
