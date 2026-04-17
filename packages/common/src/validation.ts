import { z } from 'zod';
import {
  NAMESPACE_PATTERN,
  SKILL_NAME_PATTERN,
  ORG_SLUG_PATTERN,
  MAX_PAGE_SIZE,
  DEFAULT_PAGE_SIZE,
} from './constants';

export const orgSlugSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(ORG_SLUG_PATTERN, 'must be lowercase alphanumeric with hyphens');

export const namespaceSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(NAMESPACE_PATTERN, 'invalid namespace');

export const skillNameSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(SKILL_NAME_PATTERN, 'invalid skill name');

export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export const createOrgSchema = z.object({
  name: z.string().min(1).max(255),
  slug: orgSlugSchema,
});

export const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(255),
  orgName: z.string().min(1).max(255),
  orgSlug: orgSlugSchema,
});
