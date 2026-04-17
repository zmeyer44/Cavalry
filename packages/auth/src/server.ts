import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { getDb, users, sessions, accounts, verifications } from '@cavalry/database';

export const auth = betterAuth({
  database: drizzleAdapter(getDb(), {
    provider: 'pg',
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  rateLimit: {
    enabled: process.env.CAVALRY_ENV !== 'test',
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  trustedOrigins: [
    process.env.CAVALRY_WEB_URL ?? 'http://localhost:3000',
    process.env.CAVALRY_GATEWAY_URL ?? 'http://localhost:3001',
  ],
});

export type Session = typeof auth.$Infer.Session;

export async function getServerSession(req: Request) {
  return auth.api.getSession({ headers: req.headers });
}

export async function getApiSession(req: Request) {
  return auth.api.getSession({ headers: req.headers });
}
