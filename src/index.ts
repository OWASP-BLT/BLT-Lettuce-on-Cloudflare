/**
 * OWASP BLT Lettuce Slack Welcome Bot
 * 
 * A Cloudflare Worker that sends welcome messages to new Slack members
 * and provides a dashboard with join statistics.
 */

import { Env, JoinEvent, SlackEvent, SlackUrlVerification, Stats } from './types';
import { verifySlackSignature, sendWelcomeDM } from './slack';
import { renderDashboard } from './dashboard';
import welcomeMessage from '../WELCOME_MESSAGE.md';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Route requests
    if (url.pathname === '/slack/events' && request.method === 'POST') {
      return handleSlackEvents(request, env, ctx);
    }

    if (url.pathname === '/api/stats' && request.method === 'GET') {
      return handleGetStats(env);
    }

    if (url.pathname === '/api/joins' && request.method === 'GET') {
      return handleGetJoins(request, env);
    }

    // Serve the dashboard for all other routes
    return handleDashboard(env);
  },
};

/**
 * Handle Slack Events API requests
 */
async function handleSlackEvents(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  try {
    // Verify the request is from Slack
    const isValid = await verifySlackSignature(request.clone(), env.SLACK_SIGNING_SECRET);
    if (!isValid) {
      return new Response('Invalid signature', { status: 401 });
    }

    const body = await request.json() as SlackEvent | SlackUrlVerification;

    // Handle URL verification challenge from Slack
    if (body.type === 'url_verification') {
      return new Response((body as SlackUrlVerification).challenge, {
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // Handle team_join events
    if (body.type === 'event_callback') {
      const event = (body as SlackEvent).event;
      
      if (event.type === 'team_join') {
        const user = event.user;
        let userId: string;
        let userName: string;
        
        if (typeof user === 'string') {
          userId = user;
          userName = 'Unknown';
        } else {
          userId = user.id;
          userName = user.name || user.real_name || 'Unknown';
        }
        
        // Send welcome message asynchronously
        ctx.waitUntil(
          (async () => {
            await sendWelcomeDM(userId, welcomeMessage, env.SLACK_BOT_TOKEN);
            await recordJoinEvent(env, userId, userName);
          })()
        );
      }
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Error handling Slack event:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

/**
 * Record a join event in KV storage
 */
async function recordJoinEvent(env: Env, userId: string, userName: string): Promise<void> {
  const timestamp = new Date().toISOString();
  const joinEvent: JoinEvent = {
    userId,
    userName,
    timestamp,
    success: true,
  };

  // Store individual join event
  const eventKey = `join:${timestamp}:${userId}`;
  await env.SLACK_BOT_KV.put(eventKey, JSON.stringify(joinEvent), {
    expirationTtl: 60 * 60 * 24 * 365, // Keep for 1 year
  });

  // Update statistics
  await updateStats(env, timestamp);
}

/**
 * Update aggregate statistics
 */
async function updateStats(env: Env, timestamp: string): Promise<void> {
  const statsKey = 'stats:aggregate';
  const existingStats = await env.SLACK_BOT_KV.get(statsKey);
  
  const stats: Stats = existingStats 
    ? JSON.parse(existingStats) 
    : { totalJoins: 0, lastJoinAt: null, dailyJoins: {} };

  stats.totalJoins += 1;
  stats.lastJoinAt = timestamp;

  // Track daily joins for charting
  const date = timestamp.split('T')[0];
  stats.dailyJoins[date] = (stats.dailyJoins[date] || 0) + 1;

  // Keep only last 90 days of daily data
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 90);
  const cutoffString = cutoffDate.toISOString().split('T')[0];
  
  for (const d of Object.keys(stats.dailyJoins)) {
    if (d < cutoffString) {
      delete stats.dailyJoins[d];
    }
  }

  await env.SLACK_BOT_KV.put(statsKey, JSON.stringify(stats));
}

/**
 * Handle API request for stats
 */
async function handleGetStats(env: Env): Promise<Response> {
  const statsKey = 'stats:aggregate';
  const stats = await env.SLACK_BOT_KV.get(statsKey);
  
  return new Response(stats || JSON.stringify({ totalJoins: 0, lastJoinAt: null, dailyJoins: {} }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

/**
 * Handle API request for recent joins
 */
async function handleGetJoins(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '50', 10);
  
  const joins: JoinEvent[] = [];
  const list = await env.SLACK_BOT_KV.list({ prefix: 'join:' });
  
  // Get the most recent joins (keys are sorted by timestamp in the key)
  const sortedKeys = list.keys
    .map(k => k.name)
    .sort()
    .reverse()
    .slice(0, limit);

  for (const key of sortedKeys) {
    const value = await env.SLACK_BOT_KV.get(key);
    if (value) {
      joins.push(JSON.parse(value));
    }
  }

  return new Response(JSON.stringify(joins), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

/**
 * Handle dashboard request
 */
async function handleDashboard(_env: Env): Promise<Response> {
  const html = renderDashboard();
  
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html;charset=UTF-8',
    },
  });
}
