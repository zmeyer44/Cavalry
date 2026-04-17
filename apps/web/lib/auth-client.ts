import { createAuthClient } from 'better-auth/react';

// Same-origin by default. Only set baseURL if the auth server is on a different
// origin than the web app (never in our current topology).
const baseURL = process.env.NEXT_PUBLIC_APP_URL;

export const authClient = createAuthClient(baseURL ? { baseURL } : {});

export const { useSession, signIn, signOut, signUp } = authClient;
