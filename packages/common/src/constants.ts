export const DEFAULT_WEB_PORT = 3000;
export const DEFAULT_GATEWAY_PORT = 3001;
export const DEFAULT_POSTGRES_PORT = 5432;

export const MAX_ARTIFACT_SIZE_BYTES = 52_428_800; // 50 MB
export const DEFAULT_CACHE_TTL_SECONDS = 3_600;
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;

export const TOKEN_PREFIX = 'cav_';
export const TOKEN_PREFIX_DISPLAY_LEN = 8;

export const NAMESPACE_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
export const SKILL_NAME_PATTERN = NAMESPACE_PATTERN;
export const ORG_SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
