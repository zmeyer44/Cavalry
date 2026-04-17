import { describe, it, expect } from 'vitest';
import {
  buildWebhookPayload,
  signPayload,
  verifyPayloadSignature,
  type AuditWebhookEvent,
} from './webhooks';

const sample: AuditWebhookEvent = {
  id: 'evt_1',
  orgId: 'org_1',
  action: 'skill.installed',
  actorType: 'user',
  actorId: 'u_1',
  resourceType: 'skill_version',
  resourceId: 'sv_1',
  payload: { ref: 'internal:acme/lib@1.0.0' },
  createdAt: '2026-04-17T14:30:00.000Z',
};

describe('signPayload / verifyPayloadSignature', () => {
  it('round-trips a valid signature', () => {
    const sig = signPayload('hello', 'secret');
    expect(verifyPayloadSignature('hello', 'secret', sig)).toBe(true);
  });

  it('rejects a tampered body', () => {
    const sig = signPayload('hello', 'secret');
    expect(verifyPayloadSignature('hello tampered', 'secret', sig)).toBe(false);
  });

  it('rejects a wrong-length signature', () => {
    expect(verifyPayloadSignature('hello', 'secret', 'sha256=short')).toBe(false);
  });

  it('rejects a wrong-secret signature', () => {
    const sig = signPayload('hello', 'wrong');
    expect(verifyPayloadSignature('hello', 'secret', sig)).toBe(false);
  });
});

describe('buildWebhookPayload', () => {
  it('generic format wraps the event under `event`', () => {
    const p = buildWebhookPayload(sample, 'generic');
    expect(p.contentType).toBe('application/json');
    const parsed = JSON.parse(p.body);
    expect(parsed.event.id).toBe('evt_1');
  });

  it('splunk format produces HEC shape', () => {
    const p = buildWebhookPayload(sample, 'splunk');
    const parsed = JSON.parse(p.body);
    expect(parsed).toMatchObject({
      host: 'cavalry',
      source: 'cavalry',
      sourcetype: 'cavalry:skill.installed',
    });
    expect(typeof parsed.time).toBe('number');
    expect(parsed.event.id).toBe('evt_1');
  });

  it('datadog format produces ddsource/service/ddtags', () => {
    const p = buildWebhookPayload(sample, 'datadog');
    const parsed = JSON.parse(p.body);
    expect(parsed).toMatchObject({
      ddsource: 'cavalry',
      service: 'cavalry',
    });
    expect(parsed.ddtags).toContain('org:org_1');
    expect(parsed.ddtags).toContain('action:skill.installed');
  });
});
