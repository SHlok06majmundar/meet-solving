import { useEffect, useMemo, useState } from 'react';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { MotionConfig } from 'framer-motion';
import { AppThemeContext } from './themeContext';

const STORAGE_KEY = 'nexus_ui_mode';

export function AppThemeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch { /* Use the system preference when browser storage is unavailable. */ }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, mode); } catch { /* Theme switching still works without persistent storage. */ }
    document.documentElement.setAttribute('data-theme', mode);
    document.documentElement.style.colorScheme = mode;
  }, [mode]);

  const value = useMemo(() => ({ mode, setMode, toggleMode: () => setMode(current => current === 'dark' ? 'light' : 'dark') }), [mode]);
  const muiTheme = useMemo(() => {
    const isDark = mode === 'dark';
    return createTheme({
      palette: {
        mode,
        primary: { main: isDark ? '#8ab4ff' : '#1d4ed8', contrastText: isDark ? '#0b1220' : '#ffffff' },
        secondary: { main: isDark ? '#a7c7ff' : '#365ab3' },
        background: { default: isDark ? '#0b1220' : '#f7f9fc', paper: isDark ? '#101a2b' : '#ffffff' },
        text: { primary: isDark ? '#edf3ff' : '#0f172a', secondary: isDark ? '#bcc9db' : '#475569' },
        divider: isDark ? '#2a3850' : '#dbe3ef',
      },
      shape: { borderRadius: 14 },
      typography: {
        fontFamily: 'var(--font-primary)',
        h1: { fontFamily: 'var(--font-heading)', fontWeight: 700 },
        h2: { fontFamily: 'var(--font-heading)', fontWeight: 700 },
        h3: { fontFamily: 'var(--font-heading)', fontWeight: 700 },
        h4: { fontFamily: 'var(--font-heading)', fontWeight: 700 },
        h5: { fontFamily: 'var(--font-heading)', fontWeight: 700 },
        h6: { fontFamily: 'var(--font-heading)', fontWeight: 600 },
        body1: { fontSize: '1rem', lineHeight: 1.7 },
        body2: { fontSize: '0.875rem', lineHeight: 1.65 },
        button: { textTransform: 'none', fontWeight: 600, fontSize: '0.875rem' },
      },
      components: {
        MuiButton: { styleOverrides: { root: { minHeight: 44, borderRadius: 10, boxShadow: 'none' } } },
        MuiIconButton: { styleOverrides: { root: { minWidth: 44, minHeight: 44, flexShrink: 0 } } },
        MuiMenuItem: { styleOverrides: { root: { minHeight: 44, fontSize: '0.9375rem' } } },
        MuiInputBase: { styleOverrides: { input: { fontSize: '1rem' } } },
        MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 10 } } },
        MuiPaper: { styleOverrides: { root: { backgroundImage: 'none', borderColor: isDark ? '#2a3850' : '#dbe3ef' } } },
        MuiDialog: { styleOverrides: { paper: ({ ownerState }) => ownerState.fullScreen ? {} : { margin: 16, maxHeight: 'calc(100dvh - 32px)', border: '1px solid var(--bg-border)' } } },
        MuiTooltip: { defaultProps: { enterDelay: 300 }, styleOverrides: { tooltip: { fontSize: '0.8125rem', lineHeight: 1.5, padding: '8px 12px', borderRadius: 8 } } },
      },
    });
  }, [mode]);

  return <AppThemeContext.Provider value={value}>
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </ThemeProvider>
  </AppThemeContext.Provider>;
}
