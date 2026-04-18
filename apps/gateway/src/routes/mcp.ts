import { Hono } from 'hono';
import { and, desc, eq, sql } from 'drizzle-orm';
import {
  policies as policiesTable,
  skills,
  skillVersions,
} from '@cavalry/database';
import { evaluate, type PolicyRow } from '@cavalry/policy';
import { requireToken } from '../auth';
import { logger } from '../logger';

/**
 * Minimal MCP server. Speaks enough of the Model Context Protocol for an
 * agent like Claude Code to connect, enumerate skills this token is allowed
 * to install, and request a skill's metadata. Full MCP requires richer
 * server + SSE transport; that lands in a later milestone alongside
 * streaming. For M4 we support plain JSON-RPC 2.0 over a single POST.
 *
 * Supported methods:
 *   - `initialize`            handshake
 *   - `tools/list`            advertise `list_skills` + `get_skill`
 *   - `tools/call`            evaluate policy, return filtered results
 *   - `ping`                  heartbeat
 *
 * Every call is token-authenticated. The policy engine gates responses the
 * same way it gates the install path, so an agent can never discover a skill
 * through MCP that would be blocked via the HTTP install route.
 */

const MCP_PROTOCOL_VERSION = '2025-03-26';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

function rpcResult(id: string | number | null | undefined, result: unknown) {
  return { jsonrpc: '2.0' as const, id: id ?? null, result };
}

function rpcError(
  id: string | number | null | undefined,
  error: JsonRpcError,
) {
  return { jsonrpc: '2.0' as const, id: id ?? null, error };
}

export const mcpRouter = new Hono();
mcpRouter.use('*', requireToken);

mcpRouter.post('/mcp', async (c) => {
  const auth = c.get('auth');
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json(rpcError(null, { code: -32700, message: 'parse error' }), 400);
  }

  const batch = Array.isArray(body);
  const requests = (batch ? body : [body]) as JsonRpcRequest[];
  const responses = await Promise.all(
    requests.map((req) => handleRpc(auth, req)),
  );
  return c.json(batch ? responses : responses[0]);
});

async function handleRpc(
  auth: import('../auth').AuthContext,
  req: JsonRpcRequest,
): Promise<ReturnType<typeof rpcResult> | ReturnType<typeof rpcError>> {
  if (!req || req.jsonrpc !== '2.0' || typeof req.method !== 'string') {
    return rpcError(req?.id ?? null, { code: -32600, message: 'invalid request' });
  }

  try {
    switch (req.method) {
      case 'initialize':
        return rpcResult(req.id, {
          protocolVersion: MCP_PROTOCOL_VERSION,
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'cavalry', version: '0.1.0' },
        });
      case 'ping':
        return rpcResult(req.id, {});
      case 'tools/list':
        return rpcResult(req.id, { tools: TOOLS });
      case 'tools/call': {
        const name = (req.params?.name as string | undefined) ?? '';
        const args = (req.params?.arguments ?? {}) as Record<string, unknown>;
        return rpcResult(req.id, await callTool(auth, name, args));
      }
      default:
        return rpcError(req.id, { code: -32601, message: `method not found: ${req.method}` });
    }
  } catch (err) {
    logger.error({ err, method: req.method }, 'mcp handler error');
    return rpcError(req.id, {
      code: -32603,
      message: err instanceof Error ? err.message : 'internal error',
    });
  }
}

const TOOLS = [
  {
    name: 'list_skills',
    description:
      'List skills this token is allowed to install, filtered by Cavalry policies.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Optional substring filter on skill name or namespace.',
        },
        limit: { type: 'integer', minimum: 1, maximum: 200, default: 50 },
      },
    },
  },
  {
    name: 'get_skill',
    description:
      'Fetch a skill by its `namespace/name` reference. Returns the latest version, manifest, and policy decision.',
    inputSchema: {
      type: 'object',
      required: ['namespace', 'name'],
      properties: {
        namespace: { type: 'string' },
        name: { type: 'string' },
      },
    },
  },
];

async function callTool(
  auth: import('../auth').AuthContext,
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  if (name === 'list_skills') return listSkillsTool(auth, args);
  if (name === 'get_skill') return getSkillTool(auth, args);
  return {
    isError: true,
    content: [{ type: 'text', text: `unknown tool: ${name}` }],
  };
}

interface PolicyFilteredSkill {
  ref: string;
  namespace: string;
  name: string;
  source: 'internal';
  description: string | null;
  latestVersion: string | null;
}

async function loadPolicies(auth: import('../auth').AuthContext): Promise<PolicyRow[]> {
  const rows = await auth.db
    .select()
    .from(policiesTable)
    .where(eq(policiesTable.orgId, auth.orgId));
  return rows.map((r) => ({
    id: r.id,
    orgId: r.orgId,
    scopeType: r.scopeType as 'org' | 'workspace',
    scopeId: r.scopeId,
    name: r.name,
    type: r.type as PolicyRow['type'],
    config: r.config,
    priority: r.priority,
    enabled: r.enabled,
    createdAt: r.createdAt,
  }));
}

async function listSkillsTool(
  auth: import('../auth').AuthContext,
  args: Record<string, unknown>,
): Promise<unknown> {
  const limit = Math.min(200, Math.max(1, Number(args.limit) || 50));
  const query = typeof args.query === 'string' ? args.query.toLowerCase() : '';

  // Single round-trip: skills joined with their latest version via
  // `DISTINCT ON (skill_id)` ordered by published_at DESC. Replaces the prior
  // N+1 lookup inside the filter loop.
  const rows = await auth.db.execute<{
    id: string;
    namespace: string;
    name: string;
    description: string | null;
    latest_version: string | null;
  }>(sql`
    SELECT
      s.id,
      s.namespace,
      s.name,
      s.description,
      latest.version AS latest_version
    FROM ${skills} s
    LEFT JOIN LATERAL (
      SELECT sv.version
      FROM ${skillVersions} sv
      WHERE sv.skill_id = s.id
      ORDER BY sv.published_at DESC
      LIMIT 1
    ) latest ON true
    WHERE s.org_id = ${auth.orgId}
      AND s.status = 'active'
    ORDER BY s.namespace, s.name
    LIMIT 500
  `);

  const loadedPolicies = await loadPolicies(auth);
  const filtered: PolicyFilteredSkill[] = [];

  for (const row of rows.rows) {
    if (filtered.length >= limit) break;
    if (
      query &&
      !row.namespace.toLowerCase().includes(query) &&
      !row.name.toLowerCase().includes(query)
    ) {
      continue;
    }
    const ref = `internal:${row.namespace}/${row.name}`;
    const decision = evaluate(loadedPolicies, {
      action: 'install',
      org: { id: auth.orgId },
      workspace: null,
      actor: { userId: auth.userId, tokenId: auth.tokenId },
      skill: {
        ref,
        namespace: row.namespace,
        name: row.name,
        version: null,
        source: 'internal',
      },
    });
    if (decision.decision.type === 'deny') continue;

    filtered.push({
      ref,
      namespace: row.namespace,
      name: row.name,
      source: 'internal',
      description: row.description,
      latestVersion: row.latest_version,
    });
  }

  const text = filtered
    .map((s) =>
      `- ${s.ref}${s.latestVersion ? `@${s.latestVersion}` : ''}${
        s.description ? `  — ${s.description}` : ''
      }`,
    )
    .join('\n') || '(no skills available)';

  return {
    content: [{ type: 'text', text }],
    structuredContent: { skills: filtered },
  };
}

async function getSkillTool(
  auth: import('../auth').AuthContext,
  args: Record<string, unknown>,
): Promise<unknown> {
  const namespace = String(args.namespace ?? '');
  const name = String(args.name ?? '');
  if (!namespace || !name) {
    return {
      isError: true,
      content: [{ type: 'text', text: 'namespace and name are required' }],
    };
  }

  const [skill] = await auth.db
    .select()
    .from(skills)
    .where(
      and(
        eq(skills.orgId, auth.orgId),
        eq(skills.namespace, namespace),
        eq(skills.name, name),
      ),
    )
    .limit(1);
  if (!skill) {
    return {
      isError: true,
      content: [{ type: 'text', text: 'skill not found' }],
    };
  }

  const [latest] = await auth.db
    .select()
    .from(skillVersions)
    .where(eq(skillVersions.skillId, skill.id))
    .orderBy(desc(skillVersions.publishedAt))
    .limit(1);

  const loadedPolicies = await loadPolicies(auth);
  const { decision } = evaluate(loadedPolicies, {
    action: 'install',
    org: { id: auth.orgId },
    workspace: null,
    actor: { userId: auth.userId, tokenId: auth.tokenId },
    skill: {
      ref: `internal:${namespace}/${name}`,
      namespace,
      name,
      version: latest?.version ?? null,
      source: 'internal',
    },
  });

  const summary = {
    ref: `internal:${namespace}/${name}`,
    description: skill.description,
    latestVersion: latest?.version ?? null,
    artifactHash: latest?.artifactHash ?? null,
    decision: decision.type,
    policy: decision.type === 'allow' ? null : {
      id: decision.policyId,
      name: decision.policyName,
      reason: decision.reason,
    },
  };

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(summary, null, 2),
      },
    ],
    structuredContent: summary,
  };
}
