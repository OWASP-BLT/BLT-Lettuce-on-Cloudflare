import { describe, it, expect } from 'vitest';
import { verifySlackSignature } from '../src/utils/slack-verify';

describe('Slack Signature Verification', () => {
  it('should reject invalid signature format', async () => {
    const body = 'test body';
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const invalidSignature = 'invalid-signature';
    const secret = 'test-secret';

    const result = await verifySlackSignature(body, timestamp, invalidSignature, secret);
    expect(result).toBe(false);
  });

  it('should reject old timestamps', async () => {
    const body = 'test body';
    const oldTimestamp = (Math.floor(Date.now() / 1000) - 600).toString(); // 10 minutes ago
    const signature = 'v0=' + '0'.repeat(64);
    const secret = 'test-secret';

    const result = await verifySlackSignature(body, oldTimestamp, signature, secret);
    expect(result).toBe(false);
  });

  it('should reject invalid timestamp format', async () => {
    const body = 'test body';
    const invalidTimestamp = 'not-a-number';
    const signature = 'v0=' + '0'.repeat(64);
    const secret = 'test-secret';

    const result = await verifySlackSignature(body, invalidTimestamp, signature, secret);
    expect(result).toBe(false);
  });
});
