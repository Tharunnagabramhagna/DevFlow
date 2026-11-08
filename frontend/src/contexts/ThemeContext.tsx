import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';

export type Theme = 'dark' | 'light';

export interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  isLight: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const THEME_STORAGE_KEY = 'devflow_theme';
const ACCOUNT_STORAGE_KEY = 'devflow_user_account_preferences';

const getInitialTheme = (): Theme => {
  try {
    // 1. Direct theme preference
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }

    // 2. Account preferences from Settings
    const accountRaw = localStorage.getItem(ACCOUNT_STORAGE_KEY);
    if (accountRaw) {
      const parsed = JSON.parse(accountRaw);
      if (parsed && typeof parsed.theme === 'string') {
        const normalized = parsed.theme.toLowerCase();
        if (normalized === 'light' || normalized === 'dark') {
          return normalized as Theme;
        }
      }
    }
  } catch {
    // safe fallback
  }

  // Default is dark mode per DevFlow specification
  return 'dark';
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  // Apply theme class and data-theme attribute on root element
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
      root.setAttribute('data-theme', 'light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    }

    // Persist to direct key
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);

      // Keep Settings account preferences synchronized
      const accountRaw = localStorage.getItem(ACCOUNT_STORAGE_KEY);
      if (accountRaw) {
        const parsed = JSON.parse(accountRaw);
        parsed.theme = theme === 'light' ? 'Light' : 'Dark';
        localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(parsed));
      }
    } catch {
      // safe fallback
    }
  }, [theme]);

  // Listen for storage events across tabs or external preference updates
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY && (e.newValue === 'light' || e.newValue === 'dark')) {
        setThemeState(e.newValue as Theme);
      } else if (e.key === ACCOUNT_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && typeof parsed.theme === 'string') {
            const normalized = parsed.theme.toLowerCase();
            if (normalized === 'light' || normalized === 'dark') {
              setThemeState(normalized as Theme);
            }
          }
        } catch {}
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const contextValue = useMemo(
    () => ({
      theme,
      isDark: theme === 'dark',
      isLight: theme === 'light',
      toggleTheme,
      setTheme,
    }),
    [theme]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;

