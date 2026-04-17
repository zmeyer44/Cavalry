import { ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/page-header';

export default function PoliciesPage() {
  return (
    <div className="p-6 md:p-10">
      <PageHeader
        eyebrow="Governance rules"
        title={
          <>
            Enforcement <span className="cav-display italic">policies</span>
          </>
        }
        description="Allowlists, blocklists, version pins, and approval gates. Every policy is evaluated at the gateway before an install completes."
      />
      <div className="rounded-lg border border-dashed border-border p-14 text-center">
        <ShieldCheck className="mx-auto size-7 text-muted-foreground" />
        <p className="mt-4 text-sm">
          <span className="cav-display italic text-base">M4 ·</span> arriving with the policy engine
        </p>
        <p className="mx-auto mt-2 max-w-md text-xs text-muted-foreground">
          Create rules that govern which skills can be installed, by whom, and at which version.
          Previews let you test a rule against sample installs before rolling it out.
        </p>
      </div>
    </div>
  );
}
