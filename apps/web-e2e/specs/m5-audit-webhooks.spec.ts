import { createServer, type IncomingMessage, type Server } from 'node:http';
import { AddressInfo } from 'node:net';
import { test, expect } from '../fixtures';
import { getPool } from '../support/db';
import { createId } from '@paralleldrive/cuid2';
import {
  verifyPayloadSignature,
  scanAndSchedule,
  deliverPending,
  _setFetchForTests,
} from '@cavalry/audit';

interface Capture {
  url: string;
  signature: string;
  eventId: string;
  eventAction: string;
  body: string;
}

async function runReceiver(): Promise<{ server: Server; url: string; requests: Capture[] }> {
  const requests: Capture[] = [];
  const server = createServer(async (req: IncomingMessage, res) => {
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    const body = Buffer.concat(chunks).toString('utf8');
    requests.push({
      url: req.url ?? '',
      signature: (req.headers['x-cavalry-signature'] as string) ?? '',
      eventId: (req.headers['x-cavalry-event-id'] as string) ?? '',
      eventAction: (req.headers['x-cavalry-event-action'] as string) ?? '',
      body,
    });
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end('{"ok":true}');
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const addr = server.address() as AddressInfo;
  return { server, url: `http://127.0.0.1:${addr.port}/ingest`, requests };
}

test.describe('M5 audit webhook delivery', () => {
  test('signed deliveries, receiver verifies signature', async ({
    authedOrg,
  }) => {
    const { org, userId } = authedOrg;
    const { server, url, requests } = await runReceiver();
    try {
      const pool = getPool();
      const secret = 'e2e-webhook-secret-16charsOrMore';
      const webhookId = createId();
      await pool.query(
        `INSERT INTO audit_webhooks (id, org_id, name, url, secret, format, action_filters)
         VALUES ($1, $2, $3, $4, $5, 'generic', $6::jsonb)`,
        [webhookId, org.id, 'e2e-sink', url, JSON.stringify(secret), JSON.stringify([])],
      );

      // Emit an audit event (insert directly — simulates whatever producer).
      const eventId = createId();
      await pool.query(
        `INSERT INTO audit_events (id, org_id, actor_type, actor_id, action, resource_type, resource_id, payload)
         VALUES ($1, $2, 'user', $3, 'skill.installed', 'skill_version', 'sv_fake', $4::jsonb)`,
        [eventId, org.id, userId, JSON.stringify({ ref: 'internal:fixture/one@1.0.0' })],
      );

      // Run the fan-out + delivery passes inline (no worker running in e2e).
      const decryptSecret = (envelope: string) => {
        // The webhook secret is inserted raw (no encrypt envelope) for the
        // test — the delivery helper's fallback path parses JSON strings.
        try {
          const parsed = JSON.parse(envelope);
          if (typeof parsed === 'string') return { secret: parsed };
          if (parsed?.secret) return parsed;
        } catch {
          // fallthrough
        }
        return { secret: envelope };
      };

      // Use real fetch (bound to our receiver).
      _setFetchForTests(globalThis.fetch);

      const scanResult = await scanAndSchedule({ decryptSecret });
      expect(scanResult.scheduled).toBeGreaterThanOrEqual(1);

      await expect.poll(
        async () => {
          await deliverPending({ decryptSecret });
          return requests.length;
        },
        { timeout: 5_000, intervals: [200, 500, 1000] },
      ).toBeGreaterThanOrEqual(1);

      const got = requests[0]!;
      expect(got.eventId).toBe(eventId);
      expect(got.eventAction).toBe('skill.installed');
      // Verify signature with the shared secret.
      expect(
        verifyPayloadSignature(got.body, secret, got.signature),
      ).toBe(true);

      // Delivery row marked sent.
      const rows = await pool.query<{ status: string; response_status: number }>(
        `SELECT status, response_status FROM audit_webhook_deliveries
         WHERE webhook_id = $1 AND event_id = $2`,
        [webhookId, eventId],
      );
      expect(rows.rows[0]).toMatchObject({ status: 'sent', response_status: 200 });
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
