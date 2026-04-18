import Link from 'next/link';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'Cavalry docs',
  description:
    'Governance, observability, and control for AI agent context at enterprise scale.',
};

const NAV: Array<{ section: string; items: Array<{ href: string; label: string }> }> = [
  {
    section: 'Get started',
    items: [
      { href: '/', label: 'Overview' },
      { href: '/quickstart', label: 'Quickstart' },
      { href: '/architecture', label: 'Architecture' },
    ],
  },
  {
    section: 'Guides',
    items: [
      { href: '/policies', label: 'Policies' },
      { href: '/git-repos', label: 'Skill repos' },
      { href: '/approvals', label: 'Approvals' },
      { href: '/siem', label: 'Audit webhooks' },
    ],
  },
  {
    section: 'Reference',
    items: [
      { href: '/cli', label: 'CLI reference' },
      { href: '/api', label: 'Gateway REST API' },
      { href: '/mcp', label: 'MCP endpoint' },
    ],
  },
];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(220px, 260px) minmax(0, 1fr)',
            minHeight: '100vh',
          }}
        >
          <aside
            style={{
              borderRight: '1px solid var(--border)',
              padding: '1.5rem 1.25rem',
              position: 'sticky',
              top: 0,
              alignSelf: 'start',
              height: '100vh',
              overflowY: 'auto',
            }}
          >
            <Link
              href="/"
              style={{
                fontWeight: 700,
                fontSize: '1.05rem',
                color: 'var(--fg)',
                textDecoration: 'none',
                letterSpacing: '-0.01em',
              }}
            >
              Cavalry <span style={{ color: 'var(--muted)' }}>docs</span>
            </Link>
            <nav style={{ marginTop: '1.5rem' }}>
              {NAV.map((group) => (
                <div key={group.section} style={{ marginBottom: '1.25rem' }}>
                  <p
                    style={{
                      textTransform: 'uppercase',
                      fontSize: '0.7rem',
                      letterSpacing: '0.05em',
                      color: 'var(--muted)',
                      marginBottom: '0.5rem',
                    }}
                  >
                    {group.section}
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {group.items.map((item) => (
                      <li key={item.href} style={{ margin: '2px 0' }}>
                        <Link
                          href={item.href}
                          style={{ fontSize: '0.9rem', color: 'var(--fg)' }}
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </aside>
          <main style={{ padding: '2.5rem 3rem', maxWidth: '820px' }}>{children}</main>
        </div>
      </body>
    </html>
  );
}
