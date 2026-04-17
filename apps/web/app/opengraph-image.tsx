import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

export const alt = 'Cavalry — Govern your AI skill supply chain';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const PRIMARY = '#2E5CFA';
const BG = '#FAFAF7';
const INK = '#1C1917';
const MUTED = '#78716C';
const BORDER = '#E7E5E4';

async function fetchTtf(url: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Font fetch failed: ${url}`);
  return r.arrayBuffer();
}

export default async function Image() {
  const geistMonoPath = join(
    process.cwd(),
    'node_modules/geist/dist/fonts/geist-mono/GeistMono-Medium.ttf',
  );
  const [grotesk500, grotesk600, geistMono] = await Promise.all([
    fetchTtf(
      'https://cdn.jsdelivr.net/gh/floriankarsten/space-grotesk@master/fonts/ttf/static/SpaceGrotesk-Medium.ttf',
    ),
    fetchTtf(
      'https://cdn.jsdelivr.net/gh/floriankarsten/space-grotesk@master/fonts/ttf/static/SpaceGrotesk-Bold.ttf',
    ),
    readFile(geistMonoPath),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: BG,
          padding: '56px 64px',
          fontFamily: 'Space Grotesk',
          position: 'relative',
        }}
      >
        {/* Soft radial glow — top right */}
        <div
          style={{
            position: 'absolute',
            top: -120,
            right: -120,
            width: 520,
            height: 520,
            borderRadius: 9999,
            background: 'radial-gradient(circle, rgba(46,92,250,0.18) 0%, rgba(46,92,250,0) 70%)',
            display: 'flex',
          }}
        />
        {/* Soft warm glow — bottom left */}
        <div
          style={{
            position: 'absolute',
            bottom: -100,
            left: -100,
            width: 440,
            height: 440,
            borderRadius: 9999,
            background: 'radial-gradient(circle, rgba(237,201,175,0.4) 0%, rgba(237,201,175,0) 70%)',
            display: 'flex',
          }}
        />

        {/* Top bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <svg width={48} height={48} viewBox="0 0 100 100">
              <path
                fill={PRIMARY}
                d="m98.7 37.1v-3.3h-55.2v-1.8h-7v-2.6h5v-3.5h4.8v-3.1h-8.5v-2.5h3.7v-3.4h-8.7v-3h-31.6v5.9h3.5v4h10v2.9h2.6v3.3s0.2-0.3 1.4-0.3c0.1 1 0 2.5 0 2.5h2.1v4.9h2.4l-0.1 3.1h1.5v3.2h2.2v4.3h2.3v3.1h-19.4v7.1h2.5v5h2.5v5h1.6v9.4h3.8v-2.9h3v-6.8h-3v-5.6h-2.3v-4.1h11.2v3h2.4v4.6h2.6v4.9h2.5v4.7h2.3v3.7h-2l0.1 4h-4v3.4h8v-4.8h2.6v-1.5h2.2v-5.3h-2.2v-4.3h-2.6v-5.1h-2v-4.3h-2.5v-4.4h5v4.4h2.5v4.6h2.2l0.1 4.9h2.5v4.7h2.2v3.7h-1.4v4h-3.7v3.4h7.6v-4.8h2.4v-1.5h2.2v-5.3h-2.2l-0.1-4.3h-2.6v-5.1h-2.1v-4.4h-2.4v-4.4h4.8v4.5h2.6v4.6h2.5v4.9h2.7v4.7h2.4l0.1 3.7h-1.5v4h-3.7v3.4h7.9v-4.8h2.4v-1.5h1.9s0-5.4-0.1-5.3h-2.2v-4.3h-2.8v-5.2h-2.2v-4.3h-2.5v-4.4h4.8v4.5h2.8v4.6h2.6v5h2.8v4.6h2.5l0.1 3.7h-1.5-3.7v7.4h7.7l-0.1-4.8h2.5v-1.5h2.3v-5.3h-2.5l-0.1-4.3h-2.7v-5.2h-2.3v-4.3h-2.7v-4.4h5v4.5h2.6v4.6h3.1v4.9h2.8v4.7h2.5v3.7h-1.4v4h-3.7v3.4h7.8v-6.3h3.7v-5.6h-2.1v-5.2h-2.1v-4.7h-2.2v-4.8h-2.4v-4.4l-2.5 0.1v-4.5h-2.3v-4.5h-2.3v-5.7h-2.2v-3.5h5.4v3.1h2.4v3.1h3.6l0.1 1.7h2.6v-3.2h1.9v1.5h5v-3.3h-2.9v-3l2.9 0.1z"
              />
            </svg>
            <span
              style={{
                fontFamily: 'Space Grotesk',
                fontWeight: 700,
                fontSize: 36,
                letterSpacing: '-0.02em',
                color: INK,
              }}
            >
              Cavalry
            </span>
          </div>
          <span
            style={{
              fontFamily: 'Geist Mono',
              fontSize: 12,
              fontWeight: 500,
              color: MUTED,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              border: `1px solid ${BORDER}`,
              borderRadius: 9999,
              padding: '7px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              backgroundColor: 'rgba(255,255,255,0.6)',
            }}
          >
            <span
              style={{
                display: 'flex',
                width: 6,
                height: 6,
                borderRadius: 9999,
                backgroundColor: PRIMARY,
              }}
            />
            Alpha · Now self-hostable
          </span>
        </div>

        {/* Main */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            justifyContent: 'center',
            position: 'relative',
            marginTop: 8,
          }}
        >
          <span
            style={{
              fontFamily: 'Geist Mono',
              fontSize: 13,
              fontWeight: 500,
              color: MUTED,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              marginBottom: 24,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span
              style={{
                display: 'flex',
                width: 28,
                height: 1,
                backgroundColor: MUTED,
              }}
            />
            Governance for AI agent context
          </span>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              fontFamily: 'Space Grotesk',
              fontWeight: 700,
              fontSize: 96,
              lineHeight: 1.0,
              letterSpacing: '-0.04em',
              color: INK,
            }}
          >
            <div style={{ display: 'flex' }}>Govern your AI skill</div>
            <div style={{ display: 'flex', color: PRIMARY, marginTop: 4 }}>
              supply chain.
            </div>
          </div>

          <div
            style={{
              marginTop: 32,
              fontFamily: 'Space Grotesk',
              fontSize: 22,
              fontWeight: 500,
              lineHeight: 1.45,
              color: MUTED,
              maxWidth: 820,
              display: 'flex',
            }}
          >
            Proxy every skill install through policy, publish your internal conventions, and audit
            every fetch — without changing the agents your engineers already love.
          </div>
        </div>

        {/* Bottom bar — capability pills */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative',
            marginTop: 8,
          }}
        >
          <div style={{ display: 'flex', gap: 10 }}>
            {['Policy', 'Gateway', 'Registry', 'Audit'].map((tag) => (
              <span
                key={tag}
                style={{
                  fontFamily: 'Geist Mono',
                  fontSize: 12,
                  fontWeight: 500,
                  color: INK,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  padding: '9px 14px',
                  border: `1px solid ${BORDER}`,
                  borderRadius: 9999,
                  backgroundColor: 'rgba(255,255,255,0.7)',
                  display: 'flex',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
          <span
            style={{
              fontFamily: 'Geist Mono',
              fontSize: 12,
              fontWeight: 500,
              color: MUTED,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              display: 'flex',
            }}
          >
            cavalry.sh
          </span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Space Grotesk', data: grotesk500, style: 'normal', weight: 500 },
        { name: 'Space Grotesk', data: grotesk600, style: 'normal', weight: 700 },
        { name: 'Geist Mono', data: geistMono, style: 'normal', weight: 500 },
      ],
    },
  );
}
