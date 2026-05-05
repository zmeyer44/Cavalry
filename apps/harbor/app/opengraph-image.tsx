import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

export const alt = 'Harbor Intelligence — Turn AI into operational leverage';
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
                d="M22 16h14v30h28V16h14v68H64V58H36v26H22z"
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
              Harbor Intelligence
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
            AI for mid-market companies
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
            AI implementation for mid-market companies
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
            <div style={{ display: 'flex' }}>Turn AI into</div>
            <div style={{ display: 'flex', color: PRIMARY, marginTop: 4 }}>
              operational leverage.
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
            We help mid-market companies find high-impact workflow bottlenecks, build custom AI
            systems, and ship them into the tools your team already uses.
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
            {['Audit', 'Automate', 'Integrate', 'Measure'].map((tag) => (
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
            harborintelligence.com
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
