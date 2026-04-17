'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import type { AppRouter } from '@/server/trpc/root';
import { Button } from '@/components/ui/button';

export function AcceptInviteButton({ token }: { token: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <Button
      className="w-full"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          const client = createTRPCClient<AppRouter>({
            links: [httpBatchLink({ url: '/api/trpc', transformer: superjson })],
          });
          const data = await client.invitation.accept.mutate({ token });
          toast.success('Joined organization');
          router.push(`/${data.orgSlug}`);
          router.refresh();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Failed to accept');
        } finally {
          setLoading(false);
        }
      }}
    >
      {loading ? 'Joining…' : 'Accept invitation'}
    </Button>
  );
}
