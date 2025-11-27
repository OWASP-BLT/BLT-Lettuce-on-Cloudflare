/**
 * Type definitions for the BLT Lettuce Slack Bot
 */

export interface Env {
  SLACK_BOT_KV: KVNamespace;
  SLACK_BOT_TOKEN: string;
  SLACK_SIGNING_SECRET: string;
  ENVIRONMENT?: string;
}

export interface JoinEvent {
  userId: string;
  userName: string;
  timestamp: string;
  success: boolean;
}

export interface Stats {
  totalJoins: number;
  lastJoinAt: string | null;
  dailyJoins: Record<string, number>;
}

export interface SlackUrlVerification {
  type: 'url_verification';
  challenge: string;
  token: string;
}

export interface SlackUser {
  id: string;
  name?: string;
  real_name?: string;
  profile?: {
    real_name?: string;
    display_name?: string;
  };
}

export interface SlackTeamJoinEvent {
  type: 'team_join';
  user: SlackUser | string;
}

export interface SlackMessageEvent {
  type: 'message';
  text?: string;
  user?: string;
  channel?: string;
  channel_type?: string;
  bot_id?: string;
}

export type SlackEventType = SlackTeamJoinEvent | SlackMessageEvent;

export interface SlackEvent {
  type: 'event_callback';
  token: string;
  team_id: string;
  api_app_id: string;
  event: SlackEventType;
  event_id: string;
  event_time: number;
}

export interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
    emoji?: boolean;
  };
  fields?: Array<{
    type: string;
    text: string;
  }>;
  elements?: Array<{
    type: string;
    text: string;
  }>;
}

export interface SlashCommandPayload {
  command: string;
  text: string;
  response_url: string;
  user_id: string;
  channel_id: string;
  team_id: string;
  trigger_id: string;
}

export interface SecurityTestResult {
  scenario: string;
  target: string;
  passed: boolean;
  details: string;
}
