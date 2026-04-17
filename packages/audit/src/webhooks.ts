import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Canonical outbound payload for Cavalry-generated audit events. Adapter
 * transforms (Splunk HEC, Datadog logs) wrap this structure; the signature
 * is always computed over the final JSON string that goes on the wire so
 * receivers can verify without re-serializing.
 */
export interface AuditWebhookEvent {
  id: string;
  orgId: string;
  action: string;
  actorType: 'user' | 'token' | 'system';
  actorId: string | null;
  resourceType: string;
  resourceId: string;
  payload: Record<string, unknown>;
  createdAt: string; // ISO
}

export type WebhookFormat = 'generic' | 'splunk' | 'datadog';

export interface WebhookPayload {
  contentType: string;
  body: string;
}

/**
 * Build the wire payload for a given format. All formats ultimately include
 * the same event data; the wrapper changes to match each vendor's shape.
 */
export function buildWebhookPayload(
  event: AuditWebhookEvent,
  format: WebhookFormat = 'generic',
): WebhookPayload {
  switch (format) {
    case 'generic':
      return {
        contentType: 'application/json',
        body: JSON.stringify({ event }),
      };
    case 'splunk': {
      // Splunk HTTP Event Collector — https://docs.splunk.com/Documentation/Splunk/latest/Data/HECExamples
      const hec = {
        time: Math.floor(new Date(event.createdAt).getTime() / 1000),
        host: 'cavalry',
        source: 'cavalry',
        sourcetype: `cavalry:${event.action}`,
        event,
      };
      return {
        contentType: 'application/json',
        body: JSON.stringify(hec),
      };
    }
    case 'datadog': {
      // Datadog log intake — https://docs.datadoghq.com/api/latest/logs/#send-logs
      const dd = {
        ddsource: 'cavalry',
        service: 'cavalry',
        ddtags: `org:${event.orgId},action:${event.action},actor:${event.actorType}`,
        message: `${event.action} ${event.resourceType}:${event.resourceId}`,
        event,
      };
      return {
        contentType: 'application/json',
        body: JSON.stringify(dd),
      };
    }
  }
}

/**
 * Compute an HMAC-SHA256 signature for a payload. Returned as hex for the
 * `X-Cavalry-Signature` header. Receivers verify by recomputing with their
 * shared secret over the raw body.
 */
export function signPayload(body: string, secret: string): string {
  return `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
}

export function verifyPayloadSignature(
  body: string,
  secret: string,
  provided: string,
): boolean {
  const expected = signPayload(body, secret);
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
