import '@fontsource/manrope/latin-400.css';
import '@fontsource/manrope/latin-500.css';
import '@fontsource/manrope/latin-600.css';
import '@fontsource/manrope/latin-700.css';
import '@fontsource/manrope/latin-800.css';
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-500.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import '@fontsource/ibm-plex-sans/latin-700.css';
import ClerkShell from './components/ClerkShell';
import { StrictMode } from 'react';
import { AppThemeProvider } from './theme/AppThemeProvider';
import { createRoot } from 'react-dom/client';
import './index.css';
import './clerk-styles.css'; // Premium theme-adaptive Clerk styling


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppThemeProvider>
      <ClerkShell />
    </AppThemeProvider>
  </StrictMode>
);
