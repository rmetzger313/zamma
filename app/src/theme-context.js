// Reaktives Theming: folgt standardmäßig der System-Einstellung (useColorScheme),
// lässt sich aber im Profil manuell auf Hell/Dunkel stellen. Der Modus lebt im
// Speicher (keine native Persistenz-Abhängigkeit → kein Dev-Client-Rebuild nötig).
import React, { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { getTheme } from './theme';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const system = useColorScheme() ?? 'light';
  const [mode, setMode] = useState('system'); // 'system' | 'light' | 'dark'
  const scheme = mode === 'system' ? system : mode;

  const value = useMemo(() => {
    const theme = getTheme(scheme);
    return { ...theme, scheme, mode, setMode };
  }, [scheme, mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function useTheme() {
  const ctx = useContext(ThemeContext);
  // Fallback (z. B. im Web-Preview außerhalb des Providers): Light-Palette.
  return ctx ?? { ...getTheme('light'), scheme: 'light', mode: 'system', setMode: () => {} };
}

export function useColors() {
  return useTheme().colors;
}

export function useCategories() {
  return useTheme().categories;
}

export function useThemeControl() {
  const { scheme, mode, setMode } = useTheme();
  return { scheme, mode, setMode };
}
