import { cookies, headers } from 'next/headers';
import { auth, type Session } from '@cavalry/auth/server';
import { getDb, type Database } from '@cavalry/database';

export interface TrpcContext {
  db: Database;
  session: Session | null;
  headers: Headers;
  ip: string | null;
}

export async function createContext(opts?: { req?: Request }): Promise<TrpcContext> {
  const h = opts?.req ? opts.req.headers : await headers();
  const session = await auth.api.getSession({ headers: h });
  // cookies() ensures this handler is treated as dynamic in RSC callers
  if (!opts?.req) await cookies();

  const forwarded = h.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? null;

  return {
    db: getDb(),
    session,
    headers: new Headers(h),
    ip,
  };
}
