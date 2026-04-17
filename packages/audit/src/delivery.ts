import { and, asc, desc, eq, gt, lt, sql, isNull, or } from 'drizzle-orm';
import {
  auditEvents,
  auditWebhookDeliveries,
  auditWebhooks,
  getDb,
} from '@cavalry/database';
import picomatch from 'picomatch';
import {
  buildWebhookPayload,
  signPayload,
  type AuditWebhookEvent,
  type WebhookFormat,
} from './webhooks';

const MAX_ATTEMPTS = 5;
const BACKOFF_MS = [0, 30_000, 2 * 60_000, 10 * 60_000, 60 * 60_000];

/** Test-only injection point. */
let fetchImpl: typeof fetch = globalThis.fetch;
export function _setFetchForTests(impl: typeof fetch): void {
  fetchImpl = impl;
}

export interface DecryptSecret {
  (envelope: string): { secret: string };
}

export interface ScanOptions {
  decryptSecret: DecryptSecret;
  /** Upper bound on events processed per run. Prevents runaway batches. */
  batchSize?: number;
}

export interface ScanResult {
  events: number;
  scheduled: number;
}

/**
 * Fan-out pass. Walks audit events newer than the last-processed watermark
 * per webhook and inserts `auditWebhookDeliveries` rows with status=pending.
 * The separate `deliverPending` pass actually sends them.
 *
 * Watermarking: we take the max event id seen in deliveries per webhook. For
 * a brand-new webhook with no deliveries, we start at the time the webhook
 * was created so we don't flood the destination with historical events.
 */
export async function scanAndSchedule(opts: ScanOptions): Promise<ScanResult> {
  const db = getDb();
  const batchSize = opts.batchSize ?? 500;

  const webhooks = await db
    .select()
    .from(auditWebhooks)
    .where(eq(auditWebhooks.enabled, true));

  let totalEvents = 0;
  let totalScheduled = 0;

  for (const webhook of webhooks) {
    // Find the most recent delivery's event createdAt for this webhook. Only
    // events created AFTER that watermark are candidates.
    const lastRows = await db
      .select({
        eventCreatedAt: auditEvents.createdAt,
      })
      .from(auditWebhookDeliveries)
      .innerJoin(auditEvents, eq(auditEvents.id, auditWebhookDeliveries.eventId))
      .where(eq(auditWebhookDeliveries.webhookId, webhook.id))
      .orderBy(desc(auditEvents.createdAt))
      .limit(1);
    const watermark = lastRows[0]?.eventCreatedAt ?? webhook.createdAt;

    const candidateEvents = await db
      .select()
      .from(auditEvents)
      .where(
        and(
          eq(auditEvents.orgId, webhook.orgId),
          gt(auditEvents.createdAt, watermark),
        ),
      )
      .orderBy(asc(auditEvents.createdAt))
      .limit(batchSize);

    const matchers = (webhook.actionFilters ?? []).map((p) =>
      picomatch(p, { dot: true, bash: true }),
    );

    for (const event of candidateEvents) {
      totalEvents += 1;
      if (matchers.length > 0 && !matchers.some((m) => m(event.action))) {
        // Skip events not matching any filter. Insert a skipped delivery so
        // the watermark advances and we don't re-evaluate forever.
        await db.insert(auditWebhookDeliveries).values({
          webhookId: webhook.id,
          eventId: event.id,
          status: 'skipped',
          scheduledAt: new Date(),
        });
        continue;
      }
      await db.insert(auditWebhookDeliveries).values({
        webhookId: webhook.id,
        eventId: event.id,
        status: 'pending',
        attempt: 0,
      });
      totalScheduled += 1;
    }
  }

  return { events: totalEvents, scheduled: totalScheduled };
}

/**
 * Deliver all pending + backoff-elapsed rows. Each delivery updates itself
 * to `sent`, `failed`, or re-inserts a retry row on transient failure.
 */
export async function deliverPending(opts: ScanOptions): Promise<{ delivered: number; failed: number }> {
  const db = getDb();
  const now = new Date();

  const rows = await db
    .select({
      delivery: auditWebhookDeliveries,
      webhook: auditWebhooks,
      event: auditEvents,
    })
    .from(auditWebhookDeliveries)
    .innerJoin(
      auditWebhooks,
      eq(auditWebhooks.id, auditWebhookDeliveries.webhookId),
    )
    .innerJoin(
      auditEvents,
      eq(auditEvents.id, auditWebhookDeliveries.eventId),
    )
    .where(
      and(
        eq(auditWebhookDeliveries.status, 'pending'),
        lt(auditWebhookDeliveries.scheduledAt, now),
      ),
    )
    .limit(opts.batchSize ?? 100);

  let delivered = 0;
  let failed = 0;

  for (const row of rows) {
    const secret = opts.decryptSecret(row.webhook.secret).secret;
    const event: AuditWebhookEvent = {
      id: row.event.id,
      orgId: row.event.orgId,
      action: row.event.action,
      actorType: row.event.actorType as 'user' | 'token' | 'system',
      actorId: row.event.actorId,
      resourceType: row.event.resourceType,
      resourceId: row.event.resourceId,
      payload: (row.event.payload ?? {}) as Record<string, unknown>,
      createdAt: row.event.createdAt.toISOString(),
    };
    const payload = buildWebhookPayload(event, row.webhook.format as WebhookFormat);
    const signature = signPayload(payload.body, secret);

    try {
      const res = await fetchImpl(row.webhook.url, {
        method: 'POST',
        headers: {
          'content-type': payload.contentType,
          'x-cavalry-signature': signature,
          'x-cavalry-delivery-id': row.delivery.id,
          'x-cavalry-event-id': row.event.id,
          'x-cavalry-event-action': row.event.action,
        },
        body: payload.body,
      });

      if (res.ok) {
        await db
          .update(auditWebhookDeliveries)
          .set({
            status: 'sent',
            sentAt: new Date(),
            responseStatus: res.status,
          })
          .where(eq(auditWebhookDeliveries.id, row.delivery.id));
        await db
          .update(auditWebhooks)
          .set({
            lastDeliveryAt: new Date(),
            lastSuccessAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(auditWebhooks.id, row.webhook.id));
        delivered += 1;
        continue;
      }

      const bodyText = await res.text().catch(() => '');
      failed += 1;
      await handleFailure({
        row,
        errorMessage: `HTTP ${res.status}`,
        responseStatus: res.status,
        responseBody: bodyText.slice(0, 4000),
      });
    } catch (err) {
      failed += 1;
      await handleFailure({
        row,
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { delivered, failed };
}

async function handleFailure(args: {
  row: { delivery: typeof auditWebhookDeliveries.$inferSelect; webhook: typeof auditWebhooks.$inferSelect };
  errorMessage: string;
  responseStatus?: number;
  responseBody?: string;
}): Promise<void> {
  const db = getDb();
  const nextAttempt = args.row.delivery.attempt + 1;
  const terminal = nextAttempt >= MAX_ATTEMPTS;

  await db
    .update(auditWebhookDeliveries)
    .set({
      status: terminal ? 'failed' : 'retrying',
      sentAt: new Date(),
      responseStatus: args.responseStatus ?? null,
      responseBody: args.responseBody ?? null,
      errorMessage: args.errorMessage,
    })
    .where(eq(auditWebhookDeliveries.id, args.row.delivery.id));

  await db
    .update(auditWebhooks)
    .set({
      lastDeliveryAt: new Date(),
      lastFailureAt: new Date(),
      lastFailureReason: args.errorMessage,
      updatedAt: new Date(),
    })
    .where(eq(auditWebhooks.id, args.row.webhook.id));

  if (!terminal) {
    const delay = BACKOFF_MS[nextAttempt] ?? BACKOFF_MS[BACKOFF_MS.length - 1]!;
    await db.insert(auditWebhookDeliveries).values({
      webhookId: args.row.webhook.id,
      eventId: args.row.delivery.eventId,
      attempt: nextAttempt,
      status: 'pending',
      scheduledAt: new Date(Date.now() + delay),
    });
  }
}

// keep drizzle helpers imported so future extensions (rate-limit, count) can use them
void isNull;
void or;
void sql;
