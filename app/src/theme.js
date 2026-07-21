// Design-Tokens — Zamma-Brand-Palette laut DESIGN-LOOP.md (Rebranding-Beschluss
// Juli 2026): Koralle (Wärme & Verbundenheit) + Petrol (Vertrauen & Ruhe) auf
// warmem Neutral. Typografie/Radii/Spacing stammen weiter aus dem Layout des
// Design-Handoffs. Historie: docs/qa-report.md.

export const colors = {
  bg: '#FAFAF9',           // background (neutral-50)
  pageBg: '#F5F5F4',       // neutral-100
  ink: '#1C1917',          // Text (neutral-900)
  secondary: '#44403C',    // Sekundärtext (neutral-700)
  muted: '#78716C',        // neutral-500
  disabled: '#A8A29E',     // neutral-400
  deco: '#D6D3D1',         // neutral-300
  cardBorder: '#E7E5E4',   // neutral-200
  divider: '#F5F5F4',      // neutral-100
  primary: '#FF6B42',      // Koralle (primary-500)
  primaryDark: '#C43D1E',  // primary-700 — Links/aktive Chip-Texte
  primarySoft: '#FFE8E0',  // primary-100
  success: '#0F9B8E',      // Petrol (secondary-500) — Vertrauen/Verifizierung
  successSoft: '#CCFBF1',  // secondary-100
  successDark: '#0A6159',  // secondary-700
  amber: '#D97706',        // Skill/Sterne (Text-tauglich)
  amberBright: '#F59E0B',  // warning-500 — gefüllte Sterne
  amberSoft: '#FEF3C7',
  amberDarkText: '#92400E',
  error: '#EF4444',        // destruktive Aktionen (Absagen, Blockieren)
  errorSoft: '#FEE2E2',
  btnDisabledBg: '#E7E5E4',
  dashedBorder: '#D6D3D1',
  overlay: 'rgba(28,25,23,0.6)',
  white: '#FFFFFF',
  tabBarBg: 'rgba(250,250,249,0.94)',
  bgTransparent: 'rgba(250,250,249,0)',
};

// Dark-Mode-Palette (Tokens vorbereitet — Verdrahtung ist Backlog-Item 6)
export const darkColors = {
  ...colors,
  bg: '#1C1917',
  pageBg: '#1C1917',
  ink: '#FAFAF9',
  secondary: '#D6D3D1',
  muted: '#A8A29E',
  cardBorder: '#44403C',
  divider: '#292524',
  white: '#292524',        // surface
  tabBarBg: 'rgba(28,25,23,0.94)',
  bgTransparent: 'rgba(28,25,23,0)',
  overlay: 'rgba(0,0,0,0.7)',
};

export const categories = {
  sport: { label: 'Sport', color: '#FF6B42', bg: '#FFE8E0' },
  spiele: { label: 'Spiele', color: '#8B5CF6', bg: '#EDE9FE' },
  kreativ: { label: 'Kreativ', color: '#D97706', bg: '#FEF3C7' },
  outdoor: { label: 'Outdoor', color: '#0F9B8E', bg: '#CCFBF1' },
  kochen: { label: 'Kochen', color: '#DB2777', bg: '#FCE7F3' },
};

// Nunito Sans — jede Gewichtung ist in RN eine eigene fontFamily
export const font = {
  400: 'NunitoSans_400Regular',
  600: 'NunitoSans_600SemiBold',
  700: 'NunitoSans_700Bold',
  800: 'NunitoSans_800ExtraBold',
};

export const radius = { card: 16, cardLg: 18, btn: 16, btnSm: 12, pill: 999, input: 14 };
export const spacing = { page: 20, cardPad: 16, cardPadSm: 14, listGap: 12 };

export const HOBBIES = ['Laufen', 'Fußball', 'Bouldern', 'Radfahren', 'Wandern', 'Brettspiele',
  'Schafkopf', 'Fotografie', 'Malen', 'Musik', 'Kochen', 'Bücher'];

// Custom-Tab-Bar: Inhalt (Icon+Label+Paddings) ≈ 56, Bottom-Pad Safe-Area-abhängig
// (Design-Basis 26; auf Geräten mit größerem Inset wächst es mit).
export const tabBarBottomPad = (insets) => Math.max((insets?.bottom ?? 0) + 8, 26);
export const tabBarHeight = (insets) => 56 + tabBarBottomPad(insets);
