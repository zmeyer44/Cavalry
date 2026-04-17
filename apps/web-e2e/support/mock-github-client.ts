import { createHmac } from 'node:crypto';
import type { MockInstallation, MockState } from './mock-github-server';

const MOCK_URL = `http://127.0.0.1:${process.env.CAVALRY_E2E_GITHUB_MOCK_PORT ?? 3102}`;
const WEB_URL = `http://localhost:${process.env.CAVALRY_E2E_WEB_PORT ?? 3100}`;

async function post(path: string, body?: unknown): Promise<Response> {
  return fetch(`${MOCK_URL}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function get(path: string): Promise<Response> {
  return fetch(`${MOCK_URL}${path}`);
}

export async function resetMockGitHub(): Promise<void> {
  const res = await post('/_control/reset');
  if (!res.ok) throw new Error(`mock reset failed: ${res.status}`);
  const clr = await post('/_control/requests/clear');
  if (!clr.ok) throw new Error(`mock requests clear failed: ${clr.status}`);
}

export async function setMockState(state: MockState): Promise<void> {
  const res = await post('/_control/state', state);
  if (!res.ok) throw new Error(`mock state set failed: ${res.status}`);
}

export async function getMockState(): Promise<MockState> {
  const res = await get('/_control/state');
  if (!res.ok) throw new Error(`mock state get failed: ${res.status}`);
  return (await res.json()) as MockState;
}

export async function getMockRequests(): Promise<
  Array<{ method: string; url: string; status: number }>
> {
  const res = await get('/_control/requests');
  if (!res.ok) throw new Error(`mock requests fetch failed: ${res.status}`);
  return (await res.json()) as Array<{ method: string; url: string; status: number }>;
}

/**
 * Helper: seed a single installation with a single repo. Returns so specs
 * can continue building up state if needed.
 */
export async function seedInstallation(params: {
  installationId: number;
  accountLogin: string;
  installation?: Partial<MockInstallation>;
  repos: MockInstallation['repos'];
}): Promise<void> {
  const state: MockState = {
    installations: [
      {
        id: params.installationId,
        accountLogin: params.accountLogin,
        accountType: 'organization',
        permissions: { contents: 'read', metadata: 'read' },
        repos: params.repos,
        ...params.installation,
      },
    ],
  };
  await setMockState(state);
}

/**
 * Sign and POST a GitHub-style webhook payload to the Cavalry web app.
 */
export async function postWebhook(params: {
  event: string;
  deliveryId: string;
  payload: Record<string, unknown>;
  secret?: string;
  overrideSignature?: string;
}): Promise<Response> {
  const body = JSON.stringify(params.payload);
  const secret =
    params.secret ??
    process.env.CAVALRY_GITHUB_APP_WEBHOOK_SECRET ??
    'e2e-webhook-secret';
  const signature =
    params.overrideSignature ??
    'sha256=' + createHmac('sha256', secret).update(body).digest('hex');
  return fetch(`${WEB_URL}/api/webhooks/github`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-github-event': params.event,
      'x-github-delivery': params.deliveryId,
      'x-hub-signature-256': signature,
    },
    body,
  });
}
