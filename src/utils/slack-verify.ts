/**
 * Slack request verification using HMAC-SHA256
 */

import { CONFIG } from '../config';

const SLACK_SIGNATURE_PATTERN = /^v0=[a-f0-9]{64}$/;

/**
 * Verify that a request is legitimately from Slack using HMAC signature
 */
export async function verifySlackSignature(
  body: string,
  timestamp: string,
  slackSignature: string,
  signingSecret: string
): Promise<boolean> {
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
