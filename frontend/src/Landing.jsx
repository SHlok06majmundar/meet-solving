import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Show, useUser, useClerk, useAuth } from '@clerk/react';
import { AppBar, Avatar, Box, Button, Container, Menu, MenuItem, Toolbar, Typography, Stack } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import Hero from './components/landing/Hero';
import FeaturesSection from './components/landing/FeaturesSection';
import ProductPreview from './components/landing/ProductPreview';
import CTASection from './components/landing/CTASection';
import ThemeToggle from './components/ThemeToggle';

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { isLoaded } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const isMenuOpen = Boolean(anchorEl);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 16);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const closeProfileMenu = () => setAnchorEl(null);
  const handleGetStarted = () => {
    if (user) navigate('/dashboard');
    else document.getElementById('auth-section')?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  };

  return (
    <Box sx={{ minHeight: '100dvh', backgroundColor: 'var(--bg-dark)', color: 'var(--text-primary)' }}>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <AppBar component="header" position="fixed" elevation={0} sx={{
        backgroundColor: 'var(--header-bg)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--bg-border)',
        boxShadow: scrolled ? 'var(--shadow-soft)' : 'none',
        transition: 'box-shadow 180ms ease',
        pt: 'env(safe-area-inset-top)',
        zIndex: 100,
      }}>
        <Container maxWidth="xl" sx={{ px: { xs: 2, sm: 3, md: 5 } }}>
          <Toolbar component="nav" aria-label="Main navigation" disableGutters sx={{ minHeight: { xs: 72, sm: 80 }, gap: 1 }}>
            <Box component="a" href="/" aria-label="Nexus Meet home" sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, minHeight: 44, flexShrink: 0, borderRadius: 1 }}>
              <Box component="img" src="/nexus-meet-logo.svg" alt="" sx={{ width: { xs: 28, sm: 32 }, height: { xs: 28, sm: 32 }, objectFit: 'contain' }} />
              <Typography component="span" sx={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: { xs: '1rem', sm: '1.2rem' }, letterSpacing: '-0.035em', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                Nexus Meet<Box component="span" sx={{ display: { xs: 'none', md: 'inline' }, color: 'var(--color-primary)' }}> AI</Box>
              </Typography>
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }} />
            <Stack direction="row" spacing={{ xs: 1, sm: 1.5 }} alignItems="center" sx={{ flexShrink: 0 }}>
              <ThemeToggle />
              {!isLoaded ? <Typography role="status" sx={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading</Typography> : <>
                <Show when="signed-out">
                  <Box component="button" type="button" className="btn-premium-outline" onClick={handleGetStarted} sx={{ display: { xs: 'none', sm: 'inline-flex' }, px: 2 }}>Sign in</Box>
                  <Box component="button" type="button" className="btn-premium" onClick={handleGetStarted} aria-label="Get started with Nexus Meet" sx={{ px: { xs: 1.75, sm: 2.5 }, py: 1.25, fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                    <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>Start</Box>
                    <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Get started</Box>
                  </Box>
                </Show>
                <Show when="signed-in">
                  <Button id="account-menu-trigger" aria-label="Open account menu" aria-controls={isMenuOpen ? 'account-menu' : undefined} aria-haspopup="menu" aria-expanded={isMenuOpen} onClick={event => setAnchorEl(event.currentTarget)} sx={{ minWidth: 44, minHeight: 44, px: { xs: 0.5, sm: 1 }, gap: 1.25, color: 'var(--text-primary)', borderRadius: 2 }}>
                    <Typography component="span" noWrap sx={{ display: { xs: 'none', sm: 'block' }, maxWidth: 160, fontSize: '0.875rem', fontWeight: 600 }}>{user?.firstName || user?.username || 'Account'}</Typography>
                    {user?.imageUrl ? <Avatar src={user.imageUrl} alt="" sx={{ width: 32, height: 32 }} /> : <AccountCircleIcon sx={{ fontSize: 32 }} />}
                  </Button>
                </Show>
              </>}
            </Stack>
          </Toolbar>
        </Container>
      </AppBar>

      <Box component="main" id="main-content" tabIndex={-1} sx={{ position: 'relative', zIndex: 1, outline: 'none' }}>
        <Hero onStartTrial={handleGetStarted} />
        <Box id="product-preview" sx={{ scrollMarginTop: 100 }}><ProductPreview /></Box>
        <FeaturesSection />
        <CTASection onGetStarted={handleGetStarted} />
      </Box>

      <Box component="footer" sx={{ py: { xs: 4, md: 5 }, pb: 'max(32px, env(safe-area-inset-bottom))', borderTop: '1px solid var(--bg-border)', backgroundColor: 'var(--bg-surface)' }}>
        <Container maxWidth="xl" sx={{ px: { xs: 2.5, sm: 3, md: 5 } }}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2}>
            <Stack direction="row" spacing={1.25} alignItems="center">
              <Box component="img" src="/nexus-meet-logo.svg" alt="" sx={{ width: 24, height: 24 }} />
              <Typography sx={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1rem' }}>Nexus Meet</Typography>
            </Stack>
            <Typography sx={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.7 }}>Clear conversations. Shared decisions. A practical next step.</Typography>
          </Stack>
        </Container>
      </Box>

      <Menu id="account-menu" anchorEl={anchorEl} open={isMenuOpen} onClose={closeProfileMenu} slotProps={{ list: { 'aria-labelledby': 'account-menu-trigger' }, paper: { sx: { mt: 1, backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)', borderRadius: 2, minWidth: 200, boxShadow: 'var(--shadow-strong)' } } }}>
        <MenuItem onClick={() => { closeProfileMenu(); navigate('/dashboard'); }} sx={{ minHeight: 44 }}>Dashboard</MenuItem>
        <MenuItem onClick={() => { closeProfileMenu(); signOut(); }} sx={{ minHeight: 44, color: 'var(--color-error)' }}><LogoutIcon fontSize="small" sx={{ mr: 1.5 }} />Sign out</MenuItem>
      </Menu>
    </Box>
  );
}
