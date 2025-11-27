/**
 * Type definitions for the Slack Welcome Bot
 */

export interface Env {
  SLACK_BOT_KV: KVNamespace;
  SLACK_BOT_TOKEN: string;
  SLACK_SIGNING_SECRET: string;
  ENVIRONMENT: string;
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
}

export interface SlackTeamJoinEvent {
  type: 'team_join';
  user: SlackUser | string;
}

export interface SlackEvent {
  type: 'event_callback';
  token: string;
  team_id: string;
  api_app_id: string;
  event: SlackTeamJoinEvent;
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
  elements?: Array<{
    type: string;
    text: string;
  }>;
}
