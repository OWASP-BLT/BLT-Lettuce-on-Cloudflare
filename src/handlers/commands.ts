/**
 * Slash command handlers
 */

import { Env, SlashCommandPayload, SecurityTestResult } from '../types';
import { runSecurityTest } from '../tests/runner';

export async function handleSlashCommand(payload: SlashCommandPayload, env: Env): Promise<void> {
  const { command, text, response_url } = payload;

  try {
    // Handle /blt-test command
    if (command === '/blt-test') {
      await handleBltTest(text, response_url, env);
      return;
    }

    // Handle /blt-help command
    if (command === '/blt-help') {
      await handleBltHelp(response_url, env);
      return;
    }
  } catch (error) {
    console.error('Error handling command:', error);
    await sendResponseUrl(response_url, {
      text: 'Error: An error occurred while processing your command.',
      response_type: 'ephemeral',
    });
  }
}

async function handleBltTest(text: string, responseUrl: string, _env: Env): Promise<void> {
  // Parse command: /blt-test <scenario> <target_url>
  const parts = text.trim().split(/\s+/);
  
  if (parts.length < 2) {
    await sendResponseUrl(responseUrl, {
      text: 'Usage: `/blt-test <scenario> <target_url>`\n\nAvailable scenarios: xss, sqli, csrf, open-redirect',
      response_type: 'ephemeral',
    });
    return;
  }

  const [scenario, targetUrl] = parts;

  // Run the test
  const result = await runSecurityTest(scenario, targetUrl);

  // Format and send results
  const message = formatTestResult(result);
  await sendResponseUrl(responseUrl, {
    text: message.text,
    blocks: message.blocks,
    response_type: 'in_channel',
  });
}

async function handleBltHelp(responseUrl: string, _env: Env): Promise<void> {
  const helpText = `*BLT Lettuce Bot - Help*

*Available Commands:*
• \`/blt-test <scenario> <target_url>\` - Run a security test
• \`/blt-help\` - Show this help message

*Available Test Scenarios:*
• \`xss\` - Cross-Site Scripting test
• \`sqli\` - SQL Injection test
• \`csrf\` - Cross-Site Request Forgery test
• \`open-redirect\` - Open Redirect test

*Example:*
\`/blt-test xss https://example.com/search\`

For more information, visit the OWASP BLT project.`;

  await sendResponseUrl(responseUrl, {
    text: helpText,
    response_type: 'ephemeral',
  });
}

function formatTestResult(result: SecurityTestResult): { text: string; blocks: any[] } {
  const status = result.passed ? 'PASSED' : 'FAILED';
  
  return {
    text: `Test Result: ${result.scenario.toUpperCase()} - ${status}`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${result.scenario.toUpperCase()} Test Result - ${status}*`,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Target:*\n${result.target}` },
          { type: 'mrkdwn', text: `*Status:*\n${status}` },
          { type: 'mrkdwn', text: `*Details:*\n${result.details}` },
        ],
      },
    ],
  };
}

async function sendResponseUrl(url: string, payload: any): Promise<void> {
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}
