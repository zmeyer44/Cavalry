import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Instrument_Serif, Space_Grotesk } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';
import { cn } from '@/lib/utils';
import { ThemeProvider } from '@/components/theme-provider';

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-instrument-serif',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-space-grotesk',
});

export const metadata: Metadata = {
  title: 'Cavalry — Governance for AI agent context',
  description:
    'Governance, observability, and control for AI agent context at enterprise scale.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          GeistSans.variable,
          GeistMono.variable,
          instrumentSerif.variable,
          spaceGrotesk.variable,
          'antialiased',
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster
            richColors
            position="top-right"
            toastOptions={{
              classNames: {
                toast:
                  'border border-border-strong bg-card text-foreground',
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
