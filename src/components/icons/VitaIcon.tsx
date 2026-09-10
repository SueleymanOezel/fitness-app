import type { ReactNode, SVGProps } from 'react'

export type VitaIconName =
  | 'home'
  | 'training'
  | 'nutrition'
  | 'body'
  | 'profile'
  | 'analysis'
  | 'history'
  | 'plans'
  | 'exercises'
  | 'scan'
  | 'add'
  | 'photos'
  | 'measurement'
  | 'start'
  | 'goal'
  | 'entries'
  | 'back'
  | 'close'
  | 'edit'
  | 'delete'
  | 'save'
  | 'search'
  | 'retry'
  | 'logout'

export type VitaIconTone = 'mono' | 'brand'

type Glyph = { main: ReactNode; accent: ReactNode }

/**
 * Ein Pfad-Paar je Icon: main in der Haupt- (mono: currentColor, brand:
 * Accent-Lila), accent im Endpunkt-Ton (mono: currentColor, brand: Mint) —
 * so trägt jedes Icon dieselbe Formensprache wie das VitaLoop-Logo (offener
 * Loop, kurzer Mint-Endpunkt). Quelle: vitaloop-symbol-system/VitaIcon.tsx.
 */
const glyphs: Record<VitaIconName, Glyph> = {
  home: {
    main: (
      <>
        <path d="M3.5 10.4 12 3.8l8.5 6.6" />
        <path d="M5.5 9.7v8.8c0 .9.7 1.7 1.7 1.7h9.6c.9 0 1.7-.8 1.7-1.7V9.7" />
      </>
    ),
    accent: <path d="M9.8 20.2v-5.8h4.4v5.8" />,
  },
  training: {
    main: (
      <>
        <path d="M6.3 7.4v9.2M3.7 9.2v5.6M17.7 7.4v9.2M20.3 9.2v5.6" />
        <path d="M2.5 12h1.2M20.3 12h1.2" />
      </>
    ),
    accent: <path d="M8.5 12h7" />,
  },
  nutrition: {
    main: <path d="M4.1 11.2h15.8c-.4 5.3-3.4 8.2-7.9 8.2s-7.5-2.9-7.9-8.2ZM7.1 19.4h9.8" />,
    accent: (
      <>
        <path d="M8.3 8.2c-1.1-1.3-.8-2.5.3-3.6M12 8.2c-1.1-1.3-.8-2.5.3-3.6" />
        <path d="M15.7 8.2c-1.1-1.3-.8-2.5.3-3.6" />
      </>
    ),
  },
  body: {
    main: (
      <>
        <circle cx="12" cy="4.7" r="2.1" />
        <path d="M8.5 8.2c-2.2 1.1-3.3 3-3.3 5.1 0 3.7 2.7 6.8 6.8 6.8s6.8-3.1 6.8-6.8c0-2.1-1.1-4-3.3-5.1" />
      </>
    ),
    accent: <path d="M8.2 13.7c2.4 1.2 5.2 1.2 7.6 0" />,
  },
  profile: {
    main: (
      <>
        <path d="M19.5 17.7A9 9 0 1 0 4.5 17.7" />
        <circle cx="12" cy="8.1" r="2.8" />
      </>
    ),
    accent: <path d="M6.8 19.2c.8-3 2.7-4.6 5.2-4.6s4.4 1.6 5.2 4.6" />,
  },
  analysis: {
    main: (
      <>
        <path d="M19.7 8.2A8.4 8.4 0 1 0 20 15.1" />
        <rect x="6.7" y="13.5" width="2.4" height="4.1" rx="1" />
        <rect x="10.8" y="10.5" width="2.4" height="7.1" rx="1" />
      </>
    ),
    accent: <path d="M16.1 16.8v-7l2.2 2.2M16.1 9.8 14 12" />,
  },
  history: {
    main: (
      <>
        <path d="M5.2 7.2A8.2 8.2 0 1 1 3.8 14" />
        <path d="M12 7.4v5l3.2 1.8" />
      </>
    ),
    accent: <path d="M5.1 3.9v3.4H1.8" />,
  },
  plans: {
    main: (
      <>
        <rect x="5.2" y="3.5" width="13.6" height="17" rx="2.4" />
        <path d="M8.2 8h5.2M8.2 12h7.4M8.2 16h5.6" />
      </>
    ),
    accent: <path d="m14.8 7.7 1.1 1.1 2.1-2.2" />,
  },
  exercises: {
    main: (
      <>
        <path d="M5.8 8.2v7.6M3.4 9.8v4.4M18.2 8.2v7.6M20.6 9.8v4.4" />
        <path d="M2.2 12h1.2M20.6 12h1.2" />
      </>
    ),
    accent: (
      <>
        <path d="M8.2 12h7.6" />
        <circle cx="12" cy="5.2" r="0.8" />
      </>
    ),
  },
  scan: {
    main: (
      <path d="M8 3.8H5.5c-.9 0-1.7.8-1.7 1.7V8M16 3.8h2.5c.9 0 1.7.8 1.7 1.7V8M8 20.2H5.5c-.9 0-1.7-.8-1.7-1.7V16M16 20.2h2.5c.9 0 1.7-.8 1.7-1.7V16" />
    ),
    accent: <path d="M7.1 8.3v7.4M10 8.3v7.4M13 8.3v7.4M16.9 8.3v7.4" />,
  },
  add: {
    main: <path d="M19.4 7.2A8.5 8.5 0 1 0 20.1 15.2" />,
    accent: <path d="M12 8v8M8 12h8" />,
  },
  photos: {
    main: (
      <>
        <rect x="3.3" y="6.8" width="17.4" height="12.4" rx="2.5" />
        <path d="M8 6.8 9.2 4.8h5.6L16 6.8" />
      </>
    ),
    accent: (
      <>
        <circle cx="12" cy="13" r="3.1" />
        <circle cx="17.4" cy="9.8" r="0.65" />
      </>
    ),
  },
  measurement: {
    main: <path d="M4 8.2c3.8-4.1 12.2-4.1 16 0 2.1 2.2 1 5.4-2.4 6.8-4.2 1.8-11 1.8-15.2 0-3.4-1.4-4.5-4.6-2.4-6.8" />,
    accent: <path d="M8 6.1v2.1M12 5.4v2.5M16 6.1v2.1" />,
  },
  start: {
    main: <path d="M19.5 7.5A8.5 8.5 0 1 0 20.1 15" />,
    accent: <path d="m10 8.5 5.5 3.5-5.5 3.5v-7Z" />,
  },
  goal: {
    main: (
      <>
        <circle cx="11" cy="13" r="7.4" />
        <circle cx="11" cy="13" r="3.5" />
      </>
    ),
    accent: (
      <>
        <path d="M13.5 10.5 20 4M16.6 4H20v3.4" />
        <circle cx="11" cy="13" r="0.7" />
      </>
    ),
  },
  entries: {
    main: <path d="M8 6h12M8 12h12M8 18h12" />,
    accent: (
      <>
        <circle cx="4.2" cy="6" r="0.8" />
        <circle cx="4.2" cy="12" r="0.8" />
        <circle cx="4.2" cy="18" r="0.8" />
      </>
    ),
  },
  back: {
    main: <path d="M19.5 12H5.5M10.5 6.7 5.2 12l5.3 5.3" />,
    accent: <path d="M19.5 12h1.2" />,
  },
  close: {
    main: <path d="M6.5 6.5 17.5 17.5" />,
    accent: <path d="M17.5 6.5 6.5 17.5" />,
  },
  edit: {
    main: <path d="M4.2 19.8 5 15.7 15.9 4.8a2.1 2.1 0 0 1 3 0l.3.3a2.1 2.1 0 0 1 0 3L8.3 19l-4.1.8Z" />,
    accent: <path d="m13.9 6.8 3.3 3.3M5 15.7 8.3 19" />,
  },
  delete: {
    main: <path d="M6.5 8.1 7.3 20h9.4l.8-11.9M9.4 11v5.8M14.6 11v5.8" />,
    accent: <path d="M4.7 6.1h14.6M9.1 6.1l.7-2.1h4.4l.7 2.1" />,
  },
  save: {
    main: <path d="M19.4 7.3A8.4 8.4 0 1 0 20 15" />,
    accent: <path d="m7.8 12.2 2.7 2.7 5.9-6" />,
  },
  search: {
    main: <circle cx="10.5" cy="10.5" r="6.3" />,
    accent: <path d="m15.2 15.2 5 5" />,
  },
  retry: {
    main: <path d="M19.3 8.2A8.2 8.2 0 1 0 20 15" />,
    accent: <path d="M19.3 4.8v3.5h-3.5" />,
  },
  logout: {
    main: <path d="M10 4H5.5c-.8 0-1.5.7-1.5 1.5v13c0 .8.7 1.5 1.5 1.5H10" />,
    accent: <path d="M13.5 8.1 17.4 12l-3.9 3.9M17.4 12H8.5" />,
  },
}

export type VitaIconProps = Omit<SVGProps<SVGSVGElement>, 'children'> & {
  name: VitaIconName
  size?: number
  tone?: VitaIconTone
  title?: string
}

/**
 * Zwei Farb-Layer statt einer: mono laesst beide Layer currentColor tragen
 * (folgt der Textfarbe des Elternelements, z.B. text-accent-text/text-text-muted
 * in der BottomNav), brand setzt die zwei Logo-Farben fest — fuer Stellen,
 * an denen das Icon immer markenfarbig sein soll, unabhaengig vom
 * umgebenden Text.
 */
/*
 * Brand-tone primary is --color-accent-text (src/index.css), not
 * --color-accent — an SVG stroke attribute can't read a CSS custom
 * property, so the value is duplicated here (same pattern as
 * chart-colors.ts). Plain --color-accent (#8766ed) fails WCAG AA as a
 * foreground color (2.45:1 against the nav pill, needs 3:1) — see
 * src/lib/contrast.test.ts. This literal must stay in sync with
 * --color-accent-text if that token ever changes.
 */
export function VitaIcon({ name, size = 24, tone = 'mono', title, ...props }: VitaIconProps) {
  const glyph = glyphs[name]
  const primary = tone === 'brand' ? '#a288f1' : 'currentColor'
  const accent = tone === 'brand' ? '#6efde6' : 'currentColor'

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      {...props}
    >
      {title && <title>{title}</title>}
      <g stroke={primary} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        {glyph.main}
      </g>
      <g stroke={accent} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        {glyph.accent}
      </g>
    </svg>
  )
}
