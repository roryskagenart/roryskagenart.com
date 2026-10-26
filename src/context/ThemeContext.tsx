import React, { createContext, useContext, useState, useEffect, useLayoutEffect } from 'react';

export type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
  setTheme: () => {},
  isDark: false,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  /**
   * Light is the studio default for BOTH the public site and the admin app.
   * A saved preference still wins — only a stored `'dark'` turns the lights off.
   * Mirrored by the no-flash boot script in `index.html`; change both together.
   */
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('rory_studio_theme');
      if (saved === 'light' || saved === 'dark') {
        return saved;
      }
    } catch {
      // Fallback
    }
    return 'light';
  });

  // Apply classes synchronously before paint
  useLayoutEffect(() => {
    try {
      localStorage.setItem('rory_studio_theme', theme);
    } catch {}

    const root = document.documentElement;
    const body = document.body;

    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      if (body) {
        body.classList.add('dark');
        body.classList.remove('light');
      }
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      if (body) {
        body.classList.remove('dark');
        body.classList.add('light');
      }
      root.style.colorScheme = 'light';
    }
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setTheme = (t: ThemeMode) => {
    setThemeState(t);
  };

  const isDark = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
