/**
 * Slack event handlers
 */

import { Env, SlackEventType, SlackTeamJoinEvent, SlackMessageEvent, JoinEvent, Stats } from '../types';
import { sendSlackMessage, sendWelcomeDM } from '../utils/slack-api';
import { CONFIG } from '../config';
import welcomeMessage from '../../WELCOME_MESSAGE.md';

export async function handleSlackEvent(event: SlackEventType, env: Env): Promise<void> {
  try {
    // Handle team join events
    if (event.type === 'team_join') {
      await handleTeamJoin(event as SlackTeamJoinEvent, env);
      return;
    }

    // Handle messages
    if (event.type === 'message') {
      const messageEvent = event as SlackMessageEvent;
      if (!messageEvent.bot_id) {
        await handleMessage(messageEvent, env);
      }
      return;
    }
  } catch (error) {
    console.error('Error handling event:', error);
  }
}

async function handleTeamJoin(event: SlackTeamJoinEvent, env: Env): Promise<void> {
  const user = event.user;
  let userId: string;
  let userName: string;
  
  if (typeof user === 'string') {
    userId = user;
    userName = 'Unknown';
  } else {
    userId = user.id;
    userName = user.name || user.real_name || user.profile?.real_name || 'Unknown';
  }

  // Notify joins channel
  await sendSlackMessage(
    env.SLACK_BOT_TOKEN,
    CONFIG.JOINS_CHANNEL_ID,
    `<@${userId}> joined the team.`
  );

  // Send welcome DM with formatted message
  await sendWelcomeDM(userId, welcomeMessage, env.SLACK_BOT_TOKEN);

  // Record join event for dashboard
  await recordJoinEvent(env, userId, userName);
}

async function handleMessage(event: SlackMessageEvent, env: Env): Promise<void> {
  const text = event.text?.toLowerCase() || '';
  const channel = event.channel || '';
  const user = event.user || '';

  // Detect "contribute" mentions (but not #contribute)
  if (
    !text.includes('#contribute') &&
    (text.includes('contribute') || text.includes('contributing') || text.includes('contributes'))
  ) {
    await sendSlackMessage(
      env.SLACK_BOT_TOKEN,
      channel,
      `Hello <@${user}>! Please check this channel <#${CONFIG.CONTRIBUTE_CHANNEL_ID}> for contributing guidelines today!`
    );
  }

  // Handle DMs
  if (event.channel_type === 'im') {
    await sendSlackMessage(
      env.SLACK_BOT_TOKEN,
      CONFIG.JOINS_CHANNEL_ID,
      `<@${user}> sent a DM: ${event.text}`
    );
    await sendSlackMessage(
      env.SLACK_BOT_TOKEN,
      user,
      `Hello <@${user}>, you said: ${event.text}`
    );
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
    expirationTtl: CONFIG.JOIN_EVENT_TTL_SECONDS,
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

  // Keep only configured days of daily data
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - CONFIG.DAILY_STATS_RETENTION_DAYS);
  const cutoffString = cutoffDate.toISOString().split('T')[0];
  
  for (const d of Object.keys(stats.dailyJoins)) {
    if (d < cutoffString) {
      delete stats.dailyJoins[d];
    }
  }

  await env.SLACK_BOT_KV.put(statsKey, JSON.stringify(stats));
}
