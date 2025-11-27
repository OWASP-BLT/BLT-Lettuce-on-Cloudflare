/**
 * Slack API utilities
 */

import { SlackBlock } from '../types';

/**
 * Send a message to a Slack channel or user
 */
export async function sendSlackMessage(
  token: string,
  channel: string,
  text: string,
  blocks: any[] | null = null
): Promise<any> {
  const payload: any = {
    channel,
    text,
  };

  if (blocks) {
    payload.blocks = blocks;
  }

  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json() as any;
  if (!data.ok) {
    console.error('Slack API error:', data.error);
    throw new Error(`Slack API error: ${data.error}`);
  }

  return data;
}

/**
 * Open a DM channel with a user
 */
export async function openDM(token: string, userId: string): Promise<string | null> {
  const response = await fetch('https://slack.com/api/conversations.open', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ users: userId }),
  });

  const data = await response.json() as any;
  if (!data.ok) {
    console.error('Failed to open DM:', data.error);
    return null;
  }

  return data.channel.id;
}

/**
 * Send a welcome direct message to a user
 */
export async function sendWelcomeDM(
  userId: string,
  markdownMessage: string,
  botToken: string
): Promise<void> {
  // First, open a DM channel with the user
  const conversationResponse = await fetch('https://slack.com/api/conversations.open', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ users: userId }),
  });

  const conversationData = await conversationResponse.json() as {
    ok: boolean;
    channel?: { id: string };
    error?: string;
  };

  if (!conversationData.ok || !conversationData.channel) {
    console.error('Failed to open conversation:', conversationData.error);
    throw new Error(`Failed to open conversation: ${conversationData.error}`);
  }

  const channelId = conversationData.channel.id;

  // Convert markdown to Slack blocks
  const blocks = markdownToSlackBlocks(markdownMessage);

  // Send the welcome message
  const messageResponse = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel: channelId,
      blocks: blocks,
      text: 'Welcome to the team!', // Fallback text
    }),
  });

  const messageData = await messageResponse.json() as { ok: boolean; error?: string };

  if (!messageData.ok) {
    console.error('Failed to send message:', messageData.error);
    throw new Error(`Failed to send message: ${messageData.error}`);
  }
}

/**
 * Convert a markdown message to Slack Block Kit format
 */
export function markdownToSlackBlocks(markdown: string): SlackBlock[] {
  const blocks: SlackBlock[] = [];
  const lines = markdown.split('\n');
  let currentSection = '';

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Handle headers
    if (trimmedLine.startsWith('# ')) {
      if (currentSection) {
        blocks.push(createSectionBlock(currentSection.trim()));
        currentSection = '';
      }
      blocks.push({
        type: 'header',
        text: {
          type: 'plain_text',
          text: trimmedLine.substring(2),
          emoji: true,
        },
      });
    } else if (trimmedLine.startsWith('## ')) {
      if (currentSection) {
        blocks.push(createSectionBlock(currentSection.trim()));
        currentSection = '';
      }
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${trimmedLine.substring(3)}*`,
        },
      });
    } else if (trimmedLine.startsWith('---') || trimmedLine.startsWith('***')) {
      if (currentSection) {
        blocks.push(createSectionBlock(currentSection.trim()));
        currentSection = '';
      }
      blocks.push({ type: 'divider' });
    } else if (trimmedLine === '') {
      if (currentSection) {
        blocks.push(createSectionBlock(currentSection.trim()));
        currentSection = '';
      }
    } else {
      // Convert markdown formatting to Slack mrkdwn
      const formattedLine = trimmedLine
        .replace(/\*\*(.*?)\*\*/g, '*$1*') // Bold
        .replace(/\[(.*?)\]\((.*?)\)/g, '<$2|$1>'); // Links
      
      currentSection += formattedLine + '\n';
    }
  }

  // Add any remaining content
  if (currentSection) {
    blocks.push(createSectionBlock(currentSection.trim()));
  }

  return blocks;
}

/**
 * Create a Slack section block with mrkdwn text
 */
function createSectionBlock(text: string): SlackBlock {
  return {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: text,
    },
  };
}

/**
 * Get the bot's user ID
 */
export async function getBotUserId(token: string): Promise<string | null> {
  const response = await fetch('https://slack.com/api/auth.test', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json() as any;
  return data.ok ? data.user_id : null;
}
