'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { signUp } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const slug = orgSlug.trim() || slugify(orgName);
    try {
      const result = await signUp.email({ name, email, password });
      if (result.error) {
        toast.error(result.error.message ?? 'Sign up failed');
        return;
      }
      const orgRes = await fetch('/api/onboarding/org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: orgName, slug }),
      });
      if (!orgRes.ok) {
        const body = (await orgRes.json().catch(() => ({}))) as { error?: string };
        toast.error(body.error ?? 'Could not create organization');
        return;
      }
      const { slug: createdSlug } = (await orgRes.json()) as { slug: string };
      router.push(`/${createdSlug}/onboarding`);
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md cav-fade-up">
      <div className="mb-8">
        <span className="cav-label">
          Onboarding · Step {step} / 2
        </span>
        <h1 className="mt-3 text-3xl tracking-tight">
          {step === 1 ? (
            <>
              Take <span className="cav-display italic">command</span>.
            </>
          ) : (
            <>
              Name your <span className="cav-display italic">organization</span>.
            </>
          )}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {step === 1
            ? 'Create the operator account that will own this Cavalry instance.'
            : 'Your organization slug is the tenant segment in every URL: cavalry.sh/<slug>'}
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (step === 1) {
            if (!name || !email || password.length < 8) {
              toast.error('Fill in all fields (password ≥ 8 chars)');
              return;
            }
            setStep(2);
          } else {
            handleSubmit(e);
          }
        }}
        className="space-y-4 rounded-lg border border-border bg-card p-6 shadow-sm"
      >
        {step === 1 ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="name">Your name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Minimum 8 characters.
              </p>
            </div>
            <Button type="submit" className="w-full">
              Continue
              <ArrowRight className="size-4" />
            </Button>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="orgName">Organization name</Label>
              <Input
                id="orgName"
                value={orgName}
                onChange={(e) => {
                  setOrgName(e.target.value);
                  if (!orgSlug) setOrgSlug(slugify(e.target.value));
                }}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orgSlug">Slug</Label>
              <Input
                id="orgSlug"
                value={orgSlug}
                onChange={(e) => setOrgSlug(slugify(e.target.value))}
                pattern="[a-z0-9][a-z0-9-]*"
                required
              />
              <p className="font-mono text-xs text-muted-foreground">
                cavalry.sh/{orgSlug || 'your-slug'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                disabled={loading}
              >
                Back
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    Create organization
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
