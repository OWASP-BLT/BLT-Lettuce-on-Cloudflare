/**
 * API endpoint handlers for dashboard
 */

import { Env, JoinEvent } from '../types';

/**
 * Handle API request for stats
 */
export async function handleGetStats(env: Env): Promise<Response> {
  try {
    const statsKey = 'stats:aggregate';
    const stats = await env.SLACK_BOT_KV?.get(statsKey);
    
    return new Response(stats || JSON.stringify({ totalJoins: 0, lastJoinAt: null, dailyJoins: {} }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    // Return empty stats if KV not configured
    return new Response(JSON.stringify({ totalJoins: 0, lastJoinAt: null, dailyJoins: {} }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

/**
 * Handle API request for recent joins
 */
export async function handleGetJoins(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    
    const joins: JoinEvent[] = [];
    
    if (!env.SLACK_BOT_KV) {
      // Return empty array if KV not configured
      return new Response(JSON.stringify(joins), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    
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
  } catch (error) {
    // Return empty array on error
    return new Response(JSON.stringify([]), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
