import { describe, it, expect, beforeAll } from 'vitest';
import { generateKeyPairSync, createHmac } from 'node:crypto';
import { createGitHubProvider } from './index';
import type { GitHubAppConfig } from '../config';

let config: GitHubAppConfig;

beforeAll(() => {
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  config = {
    appId: '1',
    privateKey,
    webhookSecret: 'test-secret-value',
  };
});

function sign(body: string, secret: string): string {
  return `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
}

describe('GitHubProvider.verifyWebhookSignature', () => {
  it('accepts a correctly signed payload', async () => {
    const provider = createGitHubProvider(config);
    const body = JSON.stringify({ zen: 'hello', hook_id: 1 });
    const rawBody = Buffer.from(body);
    const result = await provider.verifyWebhookSignature(
      {
        'x-hub-signature-256': sign(body, config.webhookSecret),
        'x-github-delivery': 'delivery-1',
        'x-github-event': 'ping',
      },
      rawBody,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.deliveryId).toBe('delivery-1');
    expect(result.eventType).toBe('ping');
    expect(result.payload.zen).toBe('hello');
  });

  it('rejects a tampered body', async () => {
    const provider = createGitHubProvider(config);
    const originalBody = JSON.stringify({ zen: 'original' });
    const signature = sign(originalBody, config.webhookSecret);
    const tamperedBody = JSON.stringify({ zen: 'tampered' });
    const result = await provider.verifyWebhookSignature(
      {
        'x-hub-signature-256': signature,
        'x-github-delivery': 'delivery-2',
        'x-github-event': 'ping',
      },
      Buffer.from(tamperedBody),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(401);
  });

  it('rejects a signature with the wrong secret', async () => {
    const provider = createGitHubProvider(config);
    const body = JSON.stringify({ zen: 'hi' });
    const result = await provider.verifyWebhookSignature(
      {
        'x-hub-signature-256': sign(body, 'wrong-secret'),
        'x-github-delivery': 'delivery-3',
        'x-github-event': 'ping',
      },
      Buffer.from(body),
    );
    expect(result.ok).toBe(false);
  });

  it('400s on missing headers', async () => {
    const provider = createGitHubProvider(config);
    const body = JSON.stringify({});
    const result = await provider.verifyWebhookSignature(
      {},
      Buffer.from(body),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(400);
  });

  it('accepts headers as a Headers instance', async () => {
    const provider = createGitHubProvider(config);
    const body = JSON.stringify({ zen: 'web' });
    const headers = new Headers({
      'x-hub-signature-256': sign(body, config.webhookSecret),
      'x-github-delivery': 'd-4',
      'x-github-event': 'push',
    });
    const result = await provider.verifyWebhookSignature(
      headers,
      Buffer.from(body),
    );
    expect(result.ok).toBe(true);
  });
});
