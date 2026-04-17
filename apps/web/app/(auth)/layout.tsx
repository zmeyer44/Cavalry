import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-screen flex-col bg-background">
      <div className="absolute inset-0 cav-grid-bg opacity-60" />
      <div
        className="absolute inset-x-0 top-0 h-[400px] opacity-30"
        style={{
          background:
            'radial-gradient(ellipse at 50% 0%, oklch(0.66 0.21 265 / 0.25), transparent 60%)',
        }}
      />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <span className="cav-display text-[15px] leading-none">C</span>
          </div>
          <span className="text-sm font-medium tracking-tight">Cavalry</span>
        </Link>
        <span className="cav-label">GOV · OBS · CTRL</span>
      </header>

      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-8">
        {children}
      </div>

      <footer className="relative z-10 mx-auto w-full max-w-6xl px-6 py-6">
        <p className="cav-label text-center">
          self-hosted governance for AI agent context
        </p>
      </footer>
    </main>
  );
}
