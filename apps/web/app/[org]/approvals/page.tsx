'use client';

import { useState } from 'react';
import { CheckCircle2, Clock, ShieldAlert, ThumbsDown, ThumbsUp, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/page-header';
import { cn } from '@/lib/utils';

type StatusFilter = 'pending' | 'approved' | 'denied' | 'expired' | 'all';

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200',
  approved:
    'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200',
  denied: 'bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200',
  expired: 'bg-muted text-muted-foreground',
};

const STATUS_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  pending: Clock,
  approved: CheckCircle2,
  denied: XCircle,
  expired: Clock,
};

function TabButton(props: {
  value: StatusFilter;
  active: StatusFilter;
  onClick: (v: StatusFilter) => void;
  label: string;
  count?: number;
}) {
  const isActive = props.value === props.active;
  return (
    <button
      type="button"
      className={cn(
        'px-3 py-1.5 text-xs rounded-md border transition-colors',
        isActive
          ? 'border-foreground bg-foreground text-background'
          : 'border-border text-muted-foreground hover:text-foreground',
      )}
      onClick={() => props.onClick(props.value)}
    >
      {props.label}
      {typeof props.count === 'number' ? (
        <span className="ml-1.5 text-[10px] opacity-70">{props.count}</span>
      ) : null}
    </button>
  );
}

function ApprovalRow({
  item,
  onDecide,
  pending,
}: {
  item: any;
  onDecide: (id: string, decision: 'approved' | 'denied', reason?: string) => void;
  pending: boolean;
}) {
  const [showReason, setShowReason] = useState<'approved' | 'denied' | null>(null);
  const [reason, setReason] = useState('');
  const Icon = STATUS_ICON[item.status] ?? Clock;

  return (
    <div
      className="grid grid-cols-12 items-start gap-4 px-5 py-4"
      data-testid={`approval-row-${item.id}`}
    >
      <div className="col-span-5 min-w-0">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" />
          <p className="truncate font-mono text-sm">{item.install.skillRef}</p>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          requested by{' '}
          {item.requester?.email ?? (
            <span className="italic">token</span>
          )}{' '}
          · {new Date(item.createdAt).toLocaleString()}
        </p>
      </div>

      <div className="col-span-2">
        <Badge className={STATUS_BADGE[item.status] ?? ''}>{item.status}</Badge>
        {item.decider?.email ? (
          <p className="mt-1 text-[11px] text-muted-foreground">
            by {item.decider.email}
          </p>
        ) : null}
      </div>

      <div className="col-span-2 text-[11px] text-muted-foreground">
        {item.expiresAt && item.status === 'pending' ? (
          <>expires {new Date(item.expiresAt).toLocaleDateString()}</>
        ) : item.decidedAt ? (
          <>decided {new Date(item.decidedAt).toLocaleDateString()}</>
        ) : null}
      </div>

      <div className="col-span-3 flex items-center justify-end gap-2">
        {item.status === 'pending' ? (
          showReason ? (
            <div className="flex w-full flex-col gap-2">
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="optional reason…"
                className="min-h-[60px] w-full rounded border border-border bg-background px-2 py-1 text-xs"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={showReason === 'approved' ? 'default' : 'outline'}
                  disabled={pending}
                  onClick={() => {
                    onDecide(item.id, showReason, reason.trim() || undefined);
                    setShowReason(null);
                    setReason('');
                  }}
                >
                  Confirm
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowReason(null);
                    setReason('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowReason('denied')}
                data-testid="approval-deny-btn"
              >
                <ThumbsDown className="size-3.5" /> Deny
              </Button>
              <Button
                size="sm"
                onClick={() => setShowReason('approved')}
                data-testid="approval-approve-btn"
              >
                <ThumbsUp className="size-3.5" /> Approve
              </Button>
            </>
          )
        ) : item.reason ? (
          <p className="text-right text-[11px] text-muted-foreground">
            {item.reason}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default function ApprovalsPage() {
  const [status, setStatus] = useState<StatusFilter>('pending');
  const utils = trpc.useUtils();
  const list = trpc.approval.list.useQuery(
    status === 'all' ? { limit: 100 } : { status, limit: 100 },
  );

  const decide = trpc.approval.decide.useMutation({
    onSuccess: (_, vars) => {
      toast.success(vars.decision === 'approved' ? 'Approved' : 'Denied');
      void utils.approval.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const items = list.data?.items ?? [];

  return (
    <div className="p-6 md:p-10">
      <PageHeader
        eyebrow="Human review"
        title={
          <>
            Pending <span className="cav-display italic">approvals</span>
          </>
        }
        description="Installs held by the gateway until a reviewer approves. Once approved, the CLI/agent retries and the install unblocks."
      />

      <div className="mb-4 flex items-center gap-2" data-testid="approvals-tabs">
        <TabButton
          value="pending"
          active={status}
          onClick={setStatus}
          label="Pending"
        />
        <TabButton
          value="approved"
          active={status}
          onClick={setStatus}
          label="Approved"
        />
        <TabButton
          value="denied"
          active={status}
          onClick={setStatus}
          label="Denied"
        />
        <TabButton value="all" active={status} onClick={setStatus} label="All" />
      </div>

      {list.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : items.length > 0 ? (
        <div
          className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card"
          data-testid="approvals-list"
        >
          {items.map((item) => (
            <ApprovalRow
              key={item.id}
              item={item}
              pending={decide.isPending}
              onDecide={(id, decision, reason) =>
                decide.mutate({ id, decision, reason })
              }
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border p-14 text-center">
          <ShieldAlert className="mx-auto size-7 text-muted-foreground" />
          <p className="mt-4 text-sm">No {status === 'all' ? '' : status} approvals.</p>
          <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
            When a policy marks an install as requiring approval, it lands here for a
            reviewer to approve or deny.
          </p>
        </div>
      )}
    </div>
  );
}
