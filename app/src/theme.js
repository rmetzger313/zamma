// Design-Tokens — Zamma-Brand (Koralle/Petrol, DESIGN-LOOP-Palette).
// Zwei Paletten (light/dark), reaktiv über src/theme-context.js (useColors).
// `surface` = Karten-/Eingabe-Fläche (≠ `white`, das immer weiß ist für Text
// auf Akzenten). `inverse`/`inverseInk` = bewusst kontrastierende Elemente
// (Feedback-Banner, aktiver Filter-Chip), die im Dark Mode invertieren.

export const lightColors = {
  bg: '#FAFAF9',
  pageBg: '#F5F5F4',
  ink: '#1C1917',
  secondary: '#44403C',
  muted: '#78716C',
  disabled: '#A8A29E',
  deco: '#D6D3D1',
  cardBorder: '#E7E5E4',
  divider: '#F5F5F4',
  primary: '#FF6B42',
  primaryDark: '#C43D1E',
  primarySoft: '#FFE8E0',
  success: '#0F9B8E',
  successSoft: '#CCFBF1',
  successDark: '#0A6159',
  amber: '#D97706',
  amberBright: '#F59E0B',
  amberSoft: '#FEF3C7',
  amberDarkText: '#92400E',
  error: '#EF4444',
  errorSoft: '#FEE2E2',
  btnDisabledBg: '#E7E5E4',
  dashedBorder: '#D6D3D1',
  overlay: 'rgba(28,25,23,0.6)',
  surface: '#FFFFFF',
  inverse: '#1C1917',
  inverseInk: '#FFFFFF',
  white: '#FFFFFF',
  tabBarBg: 'rgba(250,250,249,0.94)',
  bgTransparent: 'rgba(250,250,249,0)',
};

export const darkColors = {
  bg: '#1C1917',
  pageBg: '#0F0D0B',
  ink: '#FAFAF9',
  secondary: '#D6D3D1',
  muted: '#A8A29E',
  disabled: '#78716C',
  deco: '#57534E',
  cardBorder: '#3A3632',
  divider: '#2A2622',
  primary: '#FF6B42',
  primaryDark: '#FF8A6A',
  primarySoft: 'rgba(255,107,66,0.20)',
  success: '#2DD4BF',
  successSoft: 'rgba(45,212,191,0.18)',
  successDark: '#5EEAD4',
  amber: '#FBBF24',
  amberBright: '#FBBF24',
  amberSoft: 'rgba(245,158,11,0.18)',
  amberDarkText: '#FCD34D',
  error: '#F87171',
  errorSoft: 'rgba(248,113,113,0.20)',
  btnDisabledBg: '#3A3632',
  dashedBorder: '#57534E',
  overlay: 'rgba(0,0,0,0.72)',
  surface: '#26221F',
  inverse: '#F5F5F4',
  inverseInk: '#1C1917',
  white: '#FFFFFF',
  tabBarBg: 'rgba(24,21,19,0.94)',
  bgTransparent: 'rgba(28,25,23,0)',
};

export const lightCategories = {
  sport: { label: 'Sport', color: '#FF6B42', bg: '#FFE8E0' },
  spiele: { label: 'Spiele', color: '#8B5CF6', bg: '#EDE9FE' },
  kreativ: { label: 'Kreativ', color: '#D97706', bg: '#FEF3C7' },
  outdoor: { label: 'Outdoor', color: '#0F9B8E', bg: '#CCFBF1' },
  kochen: { label: 'Kochen', color: '#DB2777', bg: '#FCE7F3' },
};

export const darkCategories = {
  sport: { label: 'Sport', color: '#FF8A6A', bg: 'rgba(255,107,66,0.18)' },
  spiele: { label: 'Spiele', color: '#A78BFA', bg: 'rgba(139,92,246,0.22)' },
  kreativ: { label: 'Kreativ', color: '#FBBF24', bg: 'rgba(217,119,6,0.22)' },
  outdoor: { label: 'Outdoor', color: '#2DD4BF', bg: 'rgba(15,155,142,0.22)' },
  kochen: { label: 'Kochen', color: '#F472B6', bg: 'rgba(219,39,119,0.22)' },
};

export function getTheme(scheme) {
  return scheme === 'dark'
    ? { colors: darkColors, categories: darkCategories }
    : { colors: lightColors, categories: lightCategories };
}

// Statische Fallbacks (Light) — für Nicht-Komponenten-Kontexte.
export const colors = lightColors;
export const categories = lightCategories;

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

// Custom-Tab-Bar: Inhalt (Icon+Label+Paddings) ≈ 56, Bottom-Pad Safe-Area-abhängig.
export const tabBarBottomPad = (insets) => Math.max((insets?.bottom ?? 0) + 8, 26);
export const tabBarHeight = (insets) => 56 + tabBarBottomPad(insets);
