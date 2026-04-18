import type { ReactNode } from 'react';
import { Footer } from '@/components/marketing/sections/footer';
import { TopNav } from '@/components/marketing/top-nav';

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="light min-h-screen bg-white text-stone-900">
      <TopNav />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
