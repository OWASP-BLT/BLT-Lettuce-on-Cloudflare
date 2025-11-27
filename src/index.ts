/**
 * OWASP BLT Lettuce Slack Bot
 * 
 * A comprehensive Cloudflare Worker that:
 * - Sends welcome messages to new Slack members
 * - Provides security testing via slash commands
 * - Tracks join statistics with a dashboard
 */

import { Env, SlackEvent, SlackUrlVerification } from './types';
import { verifySlackSignature } from './utils/slack-verify';
import { handleSlackEvent } from './handlers/events';
import { handleSlashCommand } from './handlers/commands';
import { renderDashboard } from './dashboard';
import { handleGetStats, handleGetJoins } from './handlers/api';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Health check endpoint
    if (url.pathname === '/health' && request.method === 'GET') {
      return new Response(JSON.stringify({ status: 'ok', version: '3.0.0' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // API endpoints
    if (url.pathname === '/api/stats' && request.method === 'GET') {
      return handleGetStats(env);
    }

    if (url.pathname === '/api/joins' && request.method === 'GET') {
      return handleGetJoins(request, env);
    }

    // Main Slack events endpoint
    if (url.pathname === '/slack/events' && request.method === 'POST') {
      return handleSlackRequest(request, env, ctx);
    }

    // Serve the dashboard for all other routes
    return handleDashboard(env);
  },
};

/**
 * Handle Slack Events API and slash command requests
 */
async function handleSlackRequest(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  try {
    const body = await request.text();
    const timestamp = request.headers.get('X-Slack-Request-Timestamp');
    const signature = request.headers.get('X-Slack-Signature');
    const contentType = request.headers.get('Content-Type') || '';

    // Verify the request is from Slack
    if (!timestamp || !signature) {
      return new Response('Missing headers', { status: 401 });
    }

    const isValid = await verifySlackSignature(body, timestamp, signature, env.SLACK_SIGNING_SECRET);
    if (!isValid) {
      return new Response('Invalid signature', { status: 401 });
    }

    let payload: any;

    // Parse based on content type
    if (contentType.includes('application/x-www-form-urlencoded')) {
      // Slash commands come as form data
      const params = new URLSearchParams(body);
      payload = Object.fromEntries(params);
    } else {
      // Events come as JSON
      payload = JSON.parse(body);
    }

    // Handle URL verification challenge from Slack
    if (payload.type === 'url_verification') {
      return new Response((payload as SlackUrlVerification).challenge, {
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // Handle event callbacks
    if (payload.type === 'event_callback') {
      const event = (payload as SlackEvent).event;
      ctx.waitUntil(handleSlackEvent(event, env));
      return new Response('OK', { status: 200 });
    }

    // Handle slash commands
    if (payload.command) {
      ctx.waitUntil(handleSlashCommand(payload, env));
      return new Response('', { status: 200 });
    }

    return new Response('Event received', { status: 200 });
  } catch (error) {
    console.error('Error handling Slack request:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
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
