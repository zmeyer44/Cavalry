import type { RegistryAdapter, UpstreamRegistry } from './adapter';
import { TesslAdapter } from './tessl';
import { GithubAdapter } from './github';
import { HttpAdapter } from './http';

export * from './adapter';
export { TesslAdapter } from './tessl';
export { GithubAdapter } from './github';
export { HttpAdapter } from './http';
export { encrypt, decrypt, isEnvelope } from './crypto';

export interface AdapterFactoryOptions {
  fetchImpl?: typeof fetch;
}

export function getAdapter(
  registry: UpstreamRegistry,
  opts: AdapterFactoryOptions = {},
): RegistryAdapter {
  switch (registry.type) {
    case 'tessl':
      return new TesslAdapter({ registry, fetchImpl: opts.fetchImpl });
    case 'github':
      return new GithubAdapter({ registry, fetchImpl: opts.fetchImpl });
    case 'http':
      return new HttpAdapter({ registry, fetchImpl: opts.fetchImpl });
    case 'mcp':
      throw new Error('MCP registries are not proxied via skill artifacts (M3b will add bundle endpoint)');
    default: {
      const _exhaustive: never = registry.type;
      throw new Error(`Unknown registry type: ${_exhaustive as string}`);
    }
  }
}
