import { Network } from 'lucide-react';
import { PageHeader } from '@/components/page-header';

export default function RegistriesPage() {
  return (
    <div className="p-6 md:p-10">
      <PageHeader
        eyebrow="Upstream sources"
        title={
          <>
            Registry <span className="cav-display italic">sources</span>
          </>
        }
        description="Tessl, GitHub, and generic HTTP registries that the gateway proxies on behalf of your org."
      />
      <div className="rounded-lg border border-dashed border-border p-14 text-center">
        <Network className="mx-auto size-7 text-muted-foreground" />
        <p className="mt-4 text-sm">
          <span className="cav-display italic text-base">M3 ·</span> arriving with the upstream proxy pipeline
        </p>
        <p className="mx-auto mt-2 max-w-md text-xs text-muted-foreground">
          You&apos;ll configure Tessl, GitHub, and HTTP registries here. Each registry can
          be enabled, disabled, or scoped to a workspace.
        </p>
      </div>
    </div>
  );
}
