import { IconButton, Tooltip } from '@mui/material';

import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import { useAppTheme } from '../theme/themeContext';

export default function ThemeToggle({ sx = {} }) {
  const { mode, toggleMode } = useAppTheme();
  const isDark = mode === 'dark';

  return (
    <Tooltip title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
      <IconButton
        onClick={toggleMode}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        aria-pressed={isDark}
        sx={{
          width: 44,
          height: 44,
          flexShrink: 0,
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          backgroundColor: 'var(--surface-elevated)',
          color: 'var(--text-primary)',
          boxShadow: 'none',
          transition: 'all 0.2s ease',
          '&:hover': {
            transform: 'translateY(-1px)',
            backgroundColor: 'var(--surface-hover)',
          },
          ...sx,
        }}
      >
        {isDark ? <LightModeRoundedIcon fontSize="small" /> : <DarkModeRoundedIcon fontSize="small" />}
      </IconButton>
    </Tooltip>
  );
}
