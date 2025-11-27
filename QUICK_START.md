# Quick Start Guide

Get BLT Lettuce running in 10 minutes.

## Prerequisites

- Node.js 18+
- Cloudflare account (free)
- Slack workspace admin access

## 1. Install

```bash
npm install
```

## 2. Cloudflare Setup

```bash
# Login
npx wrangler login

# Create KV namespace
npx wrangler kv:namespace create SLACK_BOT_KV
npx wrangler kv:namespace create SLACK_BOT_KV --preview

# Update wrangler.toml with the IDs returned above
```

## 3. Slack App Setup

Go to [api.slack.com/apps](https://api.slack.com/apps) and create a new app.

### Bot Token Scopes
Add these in "OAuth & Permissions":
- `chat:write`
- `channels:read`
- `im:write`
- `im:read`
- `users:read`

### Event Subscriptions
Enable and subscribe to:
- `team_join`
- `message.channels`
- `message.im`

### Slash Commands
Create:
- `/blt-test` - Run security tests
- `/blt-help` - Show help

### Get Credentials
- Copy **Bot User OAuth Token** (starts with `xoxb-`)
- Copy **Signing Secret** from Basic Information

## 4. Configure Secrets

```bash
npx wrangler secret put SLACK_BOT_TOKEN
# Paste your xoxb- token

npx wrangler secret put SLACK_SIGNING_SECRET
# Paste your signing secret
```

## 5. Deploy

```bash
npm run deploy
```

You'll get a URL like: `https://blt-lettuce-slackbot.your-subdomain.workers.dev`

## 6. Update Slack URLs

In your Slack app settings, set these URLs to your worker URL:
- Event Subscriptions Request URL: `https://your-worker.workers.dev/slack/events`
- Both slash command URLs: `https://your-worker.workers.dev/slack/events`

## 7. Test

### Test Dashboard
Visit your worker URL in a browser

### Test Commands
In Slack:
```
/blt-help
/blt-test xss https://example.com
```

### Test Welcome
Invite a test user to your workspace

## Customization

### Welcome Message
Edit `WELCOME_MESSAGE.md`

### Channel IDs
Edit `src/config.ts`:
```typescript
JOINS_CHANNEL_ID: 'YOUR_CHANNEL_ID',
CONTRIBUTE_CHANNEL_ID: 'YOUR_CHANNEL_ID',
```

## Troubleshooting

### "Invalid signature"
- Check `SLACK_SIGNING_SECRET` is correct
- Verify Request URLs match your worker URL

### Welcome messages not sending
- Check bot has `im:write` scope
- Verify KV namespace is configured

### Commands not working
- Verify slash commands are created in Slack
- Check Request URLs are correct

## Commands

```bash
npm run dev          # Local development
npm run deploy       # Deploy to production
npm run logs         # View live logs
npm run type-check   # Check TypeScript
npm run lint         # Lint code
npm test             # Run tests
```

## Need Help?

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.
