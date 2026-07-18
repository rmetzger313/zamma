// Design-Tokens laut Handoff-README — Farben, Typografie, Radii, Spacing.

export const colors = {
  bg: '#faf6f0',           // App-Hintergrund
  pageBg: '#efe8dd',       // Seiten-Hintergrund außen
  ink: '#2b2016',          // Text
  secondary: '#5a4f42',    // Sekundärtext
  muted: '#8a7d6e',
  disabled: '#a99a85',
  deco: '#c9bda9',
  cardBorder: '#ece3d6',
  divider: '#f4efe7',
  primary: '#e05d38',      // Terracotta
  primaryDark: '#b94528',  // Hover/Links
  primarySoft: '#fbe9e2',
  success: '#2d7a5f',      // Erfolg/Verifizierung
  successSoft: '#e3f0e9',
  successDark: '#22543f',
  amber: '#c78f2e',        // Skill/Sterne
  amberBright: '#f2a541',
  amberSoft: '#f9efd9',
  btnDisabledBg: '#e2d8c8',
  dashedBorder: '#d9cfc0',
  overlay: 'rgba(43,32,22,.45)',
  white: '#fff',
  tabBarBg: 'rgba(255,252,247,.94)',
  amberDarkText: '#8a6a1f',
};

export const categories = {
  sport: { label: 'Sport', color: '#e05d38', bg: '#fbe9e2' },
  spiele: { label: 'Spiele', color: '#7a5fd5', bg: '#ece7fa' },
  kreativ: { label: 'Kreativ', color: '#c78f2e', bg: '#f9efd9' },
  outdoor: { label: 'Outdoor', color: '#2d7a5f', bg: '#e3f0e9' },
  kochen: { label: 'Kochen', color: '#b94572', bg: '#f9e4ec' },
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
