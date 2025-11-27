/**
 * Configuration constants for the BLT Lettuce Slack Bot
 */

export const CONFIG = {
  // URLs
  GITHUB_REPO_URL: 'https://github.com/OWASP-BLT/BLT-Lettuce-on-Cloudflare',
  OWASP_BLT_URL: 'https://owasp.org/www-project-bug-logging-tool/',
  DEPLOY_URL: 'https://deploy.workers.cloudflare.com/?url=https://github.com/OWASP-BLT/BLT-Lettuce-on-Cloudflare',
  
  // Slack signature validation
  SLACK_SIGNATURE_VERSION: 'v0',
  SLACK_SIGNATURE_MAX_AGE_SECONDS: 60 * 5, // 5 minutes
  
  // Data retention
  JOIN_EVENT_TTL_SECONDS: 60 * 60 * 24 * 365, // 1 year
  DAILY_STATS_RETENTION_DAYS: 90,
  
  // Slack channel IDs (configure these for your workspace - currently the project blt channel's ids)
  JOINS_CHANNEL_ID: 'C2FF0UVHU',
  CONTRIBUTE_CHANNEL_ID: 'C2FF0UVHU',
} as const;
