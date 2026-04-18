import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import type { NextConfig } from 'next';

const here = fileURLToPath(new URL('.', import.meta.url));
dotenv.config({ path: resolve(here, '../../.env') });

const nextConfig: NextConfig = {
  transpilePackages: [
    '@cavalry/common',
    '@cavalry/database',
    '@cavalry/auth',
    '@cavalry/audit',
    '@cavalry/registry-upstream',
    '@cavalry/skill-format',
  ],
  serverExternalPackages: ['pg'],
};

export default nextConfig;
