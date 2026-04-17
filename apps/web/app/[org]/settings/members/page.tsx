'use client';

import { useState } from 'react';
import { Mail, Trash2, X, Users } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { PageHeader } from '@/components/page-header';

export default function MembersPage() {
  const utils = trpc.useUtils();
  const members = trpc.org.listMembers.useQuery();
  const invites = trpc.org.listInvitations.useQuery();
  const org = trpc.org.get.useQuery();

  const invite = trpc.org.inviteMember.useMutation({
    onSuccess: (data) => {
      toast.success('Invitation sent', { description: data.acceptUrl });
      setInviteOpen(false);
      setEmail('');
      utils.org.listInvitations.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const revoke = trpc.org.revokeInvitation.useMutation({
    onSuccess: () => {
      toast.success('Invitation revoked');
      utils.org.listInvitations.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const remove = trpc.org.removeMember.useMutation({
    onSuccess: () => {
      toast.success('Member removed');
      utils.org.listMembers.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'author' | 'member'>('member');

  const isAdmin = org.data?.role === 'owner' || org.data?.role === 'admin';

  return (
    <div className="p-6 md:p-10">
      <PageHeader
        eyebrow="Organization · People"
        title={
          <>
            Members &<span className="cav-display italic"> invitations</span>
          </>
        }
        description="People with access to this organization and pending invitation links."
        actions={
          isAdmin ? (
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Mail className="size-4" /> Invite
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite member</DialogTitle>
                  <DialogDescription>
                    A signed link is sent to their email. They sign in with the same address.
                  </DialogDescription>
                </DialogHeader>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    invite.mutate({ email, role });
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="inv-email">Email</Label>
                    <Input
                      id="inv-email"
                      type="email"
                      placeholder="teammate@acme.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inv-role">Role</Label>
                    <Select
                      id="inv-role"
                      value={role}
                      onChange={(e) => setRole(e.target.value as typeof role)}
                    >
                      <option value="member">Member — read-only</option>
                      <option value="author">Author — publish skills</option>
                      <option value="admin">Admin — full governance</option>
                    </Select>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="outline">
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button type="submit" disabled={invite.isPending}>
                      Send invitation
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          ) : null
        }
      />

      <section className="space-y-3">
        <h2 className="cav-label">Active members</h2>
        {members.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {members.data?.map((m) => (
              <div
                key={m.id}
                className="grid grid-cols-12 items-center gap-4 px-5 py-3"
              >
                <div className="col-span-6 flex min-w-0 items-center gap-3">
                  <Avatar name={m.name ?? m.email} className="size-7 shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium leading-tight">
                      {m.name ?? m.email.split('@')[0]}
                    </p>
                    <p className="truncate font-mono text-xs text-muted-foreground mt-0.5">
                      {m.email}
                    </p>
                  </div>
                </div>
                <div className="col-span-3">
                  <Badge variant="outline" className="uppercase tracking-wide">
                    {m.role}
                  </Badge>
                </div>
                <div className="col-span-2 text-xs text-muted-foreground tabular">
                  {new Date(m.createdAt).toLocaleDateString()}
                </div>
                <div className="col-span-1 text-right">
                  {isAdmin && m.role !== 'owner' ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm(`Remove ${m.email}?`)) {
                          remove.mutate({ userId: m.userId });
                        }
                      }}
                      aria-label={`Remove ${m.email}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="cav-label">Pending invitations</h2>
        {invites.data && invites.data.length > 0 ? (
          <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {invites.data.map((inv) => (
              <div
                key={inv.id}
                className="grid grid-cols-12 items-center gap-4 px-5 py-3"
              >
                <div className="col-span-6 flex items-center gap-3">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full border border-dashed border-border-strong">
                    <Mail className="size-3 text-muted-foreground" />
                  </div>
                  <span className="font-mono text-xs">{inv.email}</span>
                </div>
                <div className="col-span-2">
                  <Badge variant="outline" className="uppercase tracking-wide">
                    {inv.role}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <Badge
                    variant={
                      inv.status === 'pending'
                        ? 'warning'
                        : inv.status === 'accepted'
                          ? 'success'
                          : 'default'
                    }
                  >
                    {inv.status}
                  </Badge>
                </div>
                <div className="col-span-1 text-xs text-muted-foreground tabular">
                  {new Date(inv.expiresAt).toLocaleDateString()}
                </div>
                <div className="col-span-1 text-right">
                  {isAdmin && inv.status === 'pending' ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => revoke.mutate({ invitationId: inv.id })}
                      aria-label={`Revoke ${inv.email}`}
                    >
                      <X className="size-4" />
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border px-5 py-8 text-center text-sm text-muted-foreground">
            <Users className="mx-auto size-5" />
            <p className="mt-2">No pending invitations.</p>
          </div>
        )}
      </section>
    </div>
  );
}
