# BLT-Lettuce-on-Cloudflare

🥬 **The BLT Lettuce (OWASP Helper) Bot** - A Slack welcome bot hosted on Cloudflare Workers

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/OWASP-BLT/BLT-Lettuce-on-Cloudflare)

## Features

- 🎉 **Automatic Welcome Messages** - Sends a personalized welcome message to new members when they join your Slack workspace
- 📝 **Editable Welcome Message** - Customize the welcome message by editing `WELCOME_MESSAGE.md`
- 📊 **Stats Dashboard** - Track join statistics with a beautiful dashboard
- 📈 **Analytics** - View charts showing joins over time
- 🚀 **One-Click Deploy** - Deploy to Cloudflare Workers with a single click

## Quick Start

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
   ```

3. **Create a Slack App**
   - Go to [Slack API](https://api.slack.com/apps) and create a new app
   - Enable **Event Subscriptions** and subscribe to the `team_join` event
   - Add the following **Bot Token Scopes**:
     - `chat:write` - Send messages
     - `im:write` - Open direct messages
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
   npm run deploy
   ```

7. **Configure Slack Event URL**
   - In your Slack app settings, set the Event Request URL to:
     `https://your-worker.your-subdomain.workers.dev/slack/events`

## Customizing the Welcome Message

Edit the `WELCOME_MESSAGE.md` file to customize the welcome message sent to new members. The file supports:

- Headers (`#`, `##`)
- Bold text (`**bold**`)
- Links (`[text](url)`)
- Bullet points (`-`)
- Emoji 🎉

After editing, redeploy to apply changes:
```bash
npm run deploy
```

## Dashboard

The bot includes a built-in dashboard at your worker URL that shows:

- **Total Members Welcomed** - Count of all members who received welcome messages
- **Last Join** - When the most recent member joined
- **Joins Today** - Number of new members today
- **Joins Chart** - Visual chart of joins over the last 30 days
- **Recent Joins List** - Table of recent join events

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /` | Dashboard homepage |
| `POST /slack/events` | Slack Events API endpoint |
| `GET /api/stats` | Get aggregate statistics |
| `GET /api/joins` | Get list of recent joins |

## Development

```bash
# Run locally
npm run dev

# Type check
npm run type-check

# Lint
npm run lint

# Run tests
npm test
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SLACK_BOT_TOKEN` | Slack Bot OAuth Token (starts with `xoxb-`) |
| `SLACK_SIGNING_SECRET` | Slack Signing Secret for request verification |

## License

This project is licensed under the GNU Affero General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## About OWASP BLT

[OWASP BLT](https://owasp.org/www-project-bug-logging-tool/) (Bug Logging Tool) is an open-source project designed to help the security community track and report vulnerabilities.

