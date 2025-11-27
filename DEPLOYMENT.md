# Deployment Guide

Complete guide for deploying BLT Lettuce Slack Bot to Cloudflare Workers.

## Prerequisites

- Node.js 18+ installed
- Cloudflare account (free tier works)
- Slack workspace with admin access
- 15 minutes

## Step 1: Clone and Install

```bash
git clone https://github.com/OWASP-BLT/BLT-Lettuce-on-Cloudflare.git
cd BLT-Lettuce-on-Cloudflare
npm install
```

## Step 2: Create Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click "Create New App" → "From scratch"
3. Name it "BLT Lettuce Bot" and select your workspace

### Configure OAuth & Permissions

Add these Bot Token Scopes:
- `chat:write` - Send messages
- `channels:read` - Read channel info
- `im:write` - Send DMs
- `im:read` - Read DMs
- `users:read` - Read user info

Install the app to your workspace and copy the **Bot User OAuth Token** (starts with `xoxb-`)

### Configure Event Subscriptions

1. Enable Event Subscriptions
2. Request URL: `https://your-worker.workers.dev/slack/events` (we'll update this after deployment)
3. Subscribe to bot events:
   - `team_join` - New member joins
   - `message.channels` - Channel messages
   - `message.im` - Direct messages

### Configure Slash Commands

Create these commands (Request URL: `https://your-worker.workers.dev/slack/events`):

1. `/blt-test`
   - Description: "Run security tests on a target URL"
   - Usage hint: `<scenario> <target_url>`

2. `/blt-help`
   - Description: "Show BLT Lettuce Bot help"
   - Usage hint: (leave empty)

### Get Signing Secret

Go to "Basic Information" → "App Credentials" and copy the **Signing Secret**

## Step 3: Configure Cloudflare

```bash
# Login to Cloudflare
npx wrangler login

# Create KV namespace for production
npx wrangler kv:namespace create SLACK_BOT_KV

# Create KV namespace for preview/dev
npx wrangler kv:namespace create SLACK_BOT_KV --preview
```

Update `wrangler.toml` with the returned namespace IDs:

```toml
[[kv_namespaces]]
binding = "SLACK_BOT_KV"
id = "your-production-id-here"

[[kv_namespaces]]
binding = "SLACK_BOT_KV"
preview_id = "your-preview-id-here"
```

## Step 4: Set Secrets

```bash
# Set Slack bot token
npx wrangler secret put SLACK_BOT_TOKEN
# Paste your xoxb- token when prompted

# Set Slack signing secret
npx wrangler secret put SLACK_SIGNING_SECRET
# Paste your signing secret when prompted
```

## Step 5: Customize Configuration

### Update Channel IDs

Edit `src/config.ts` and update these channel IDs for your workspace:

```typescript
JOINS_CHANNEL_ID: 'C06RMMRMGHE',  // Channel where join notifications go
CONTRIBUTE_CHANNEL_ID: 'C04DH8HEPTR',  // Channel for contribution info
```

To find channel IDs:
1. Right-click on a channel in Slack
2. Select "View channel details"
3. Scroll down to find the Channel ID

### Customize Welcome Message

Edit `WELCOME_MESSAGE.md` to personalize the welcome message sent to new members.

## Step 6: Deploy

```bash
# Deploy to Cloudflare Workers
npm run deploy
```

You'll get a URL like: `https://blt-lettuce-slackbot.your-subdomain.workers.dev`

## Step 7: Update Slack URLs

Go back to your Slack app settings and update:

1. **Event Subscriptions** → Request URL: `https://your-worker.workers.dev/slack/events`
2. **Slash Commands** → Update both command URLs to: `https://your-worker.workers.dev/slack/events`

Click "Save Changes" and verify the URLs (Slack will send a verification request)

## Step 8: Test

### Test Welcome Message
1. Invite a test user to your workspace
2. They should receive a welcome DM
3. Check the dashboard at your worker URL

### Test Slash Commands
```
/blt-help
/blt-test xss https://example.com
```

### Test Dashboard
Visit your worker URL to see the analytics dashboard

## Local Development

```bash
# Start local dev server
npm run dev

# In another terminal, expose with ngrok
ngrok http 8787

# Update Slack Request URLs to ngrok URL for testing
```

## Monitoring

```bash
# View live logs
npm run logs

# Check deployment status
npx wrangler deployments list
```

## Troubleshooting

### "Invalid signature" errors
- Verify `SLACK_SIGNING_SECRET` is set correctly
- Check that Request URLs in Slack match your worker URL

### Welcome messages not sending
- Verify bot has `im:write` scope
- Check KV namespace is configured correctly
- View logs with `npm run logs`

### Slash commands not working
- Verify commands are configured in Slack app
- Check Request URLs match your worker URL
- Ensure bot has necessary scopes

### Dashboard not loading
- Check KV namespace binding in `wrangler.toml`
- Verify worker is deployed successfully

## Rollback

If something goes wrong:

```bash
# View deployment history
npx wrangler deployments list

# Rollback to previous version
npm run rollback
```

## Production Checklist

- [ ] KV namespaces created and configured
- [ ] Secrets set (SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET)
- [ ] Channel IDs updated in config.ts
- [ ] Welcome message customized
- [ ] Slack app URLs updated
- [ ] All scopes granted
- [ ] Event subscriptions enabled
- [ ] Slash commands configured
- [ ] Tested with real user join
- [ ] Tested slash commands
- [ ] Dashboard accessible

## Support

For issues or questions:
- GitHub Issues: [github.com/OWASP-BLT/BLT-Lettuce-on-Cloudflare/issues](https://github.com/OWASP-BLT/BLT-Lettuce-on-Cloudflare/issues)
- OWASP BLT: [owasp.org/www-project-bug-logging-tool/](https://owasp.org/www-project-bug-logging-tool/)
