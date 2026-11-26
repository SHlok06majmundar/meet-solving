import { createContext, useContext } from 'react';
export const AppThemeContext = createContext({
  mode: 'light',
  setMode: () => {},
  toggleMode: () => {},
});

export function useAppTheme() { return useContext(AppThemeContext); }
