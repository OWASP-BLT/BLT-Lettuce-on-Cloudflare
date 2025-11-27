/**
 * Slack API utilities for the Welcome Bot
 */

import { SlackBlock } from './types';
import { CONFIG } from './config';

// Regex pattern to validate Slack signature format (v0=hexstring)
const SLACK_SIGNATURE_PATTERN = /^v0=[a-f0-9]{64}$/;

/**
 * Verify that a request is legitimately from Slack using HMAC signature
 */
export async function verifySlackSignature(
  request: Request,
  signingSecret: string
): Promise<boolean> {
  const timestamp = request.headers.get('x-slack-request-timestamp');
  const slackSignature = request.headers.get('x-slack-signature');

  if (!timestamp || !slackSignature) {
    return false;
  }

  // Validate signature format before processing
  if (!SLACK_SIGNATURE_PATTERN.test(slackSignature)) {
    return false;
  }

  // Validate timestamp is a valid number
  const timestampNum = parseInt(timestamp, 10);
  if (isNaN(timestampNum) || timestampNum <= 0) {
    return false;
  }

  // Check if request is older than configured max age (prevents replay attacks)
  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - timestampNum) > CONFIG.SLACK_SIGNATURE_MAX_AGE_SECONDS) {
    return false;
  }

  const body = await request.text();
  const sigBaseString = `${CONFIG.SLACK_SIGNATURE_VERSION}:${timestamp}:${body}`;

  // Create HMAC-SHA256 signature
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(signingSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(sigBaseString));
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  const computedSignature = `${CONFIG.SLACK_SIGNATURE_VERSION}=${hashHex}`;

  // Constant-time comparison to prevent timing attacks
  return timingSafeEqual(computedSignature, slackSignature);
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
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
