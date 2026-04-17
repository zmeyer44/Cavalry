import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { logger as reqLogger } from 'hono/logger';
import { config } from './config';
import { logger } from './logger';
import { healthRouter } from './routes/health';
import { skillsRouter } from './routes/skills';

const app = new Hono();

app.use('*', reqLogger((msg) => logger.info(msg)));

app.route('/', healthRouter);
app.route('/', skillsRouter);

app.onError((err, c) => {
  logger.error({ err }, 'unhandled gateway error');
  return c.json(
    {
      type: 'https://cavalry.sh/errors/internal-error',
      title: 'internal_error',
      status: 500,
      detail: err.message,
    },
    500,
  );
});

app.notFound((c) =>
  c.json({ title: 'not_found', status: 404, detail: `No route for ${c.req.method} ${c.req.path}` }, 404),
);

serve({ fetch: app.fetch, port: config.port }, (info) => {
  logger.info({ port: info.port, env: config.env }, 'cavalry gateway listening');
});

export { app };
