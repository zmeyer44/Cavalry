import { Hono } from 'hono';
import { getDb } from '@cavalry/database';
import { sql } from 'drizzle-orm';

export const healthRouter = new Hono();

healthRouter.get('/healthz', (c) => c.json({ status: 'ok' }));

healthRouter.get('/readyz', async (c) => {
  try {
    await getDb().execute(sql`select 1`);
    return c.json({ status: 'ok' });
  } catch (err) {
    return c.json({ status: 'unavailable', error: String(err) }, 503);
  }
});
