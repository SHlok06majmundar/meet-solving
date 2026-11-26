import { Box, Typography, Container, Stack } from '@mui/material';
import { motion, useReducedMotion } from 'framer-motion';

export default function Hero({ onStartTrial }) {
  const reduceMotion = useReducedMotion();
  const enter = delay => ({
    initial: reduceMotion ? false : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduceMotion ? 0 : 0.5, delay: reduceMotion ? 0 : delay },
  });

  return (
    <Box component="section" aria-labelledby="hero-title" sx={{
      position: 'relative', isolation: 'isolate',
      pt: { xs: 17, sm: 19, md: 22 }, pb: { xs: 8, sm: 10, md: 12 },
      minHeight: { xs: 'auto', md: 'min(760px, 88svh)' },
      display: 'flex', alignItems: 'center',
    }}>
      <Box aria-hidden="true" sx={{ position: 'absolute', inset: 0, zIndex: -1, pointerEvents: 'none', background: 'radial-gradient(ellipse at 50% 22%, var(--hero-glow), transparent 66%)' }} />
      <Container maxWidth="lg" sx={{ px: { xs: 2.5, sm: 4 } }}>
        <Box sx={{ textAlign: 'center', maxWidth: 860, mx: 'auto' }}>
          <Box component={motion.div} {...enter(0)} sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, mb: { xs: 3, md: 4 }, py: 0.8, px: 1.6, border: '1px solid var(--bg-border)', background: 'var(--bg-surface)', borderRadius: '999px' }}>
            <Box component="span" aria-hidden="true" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'var(--color-primary)' }} />
            <Typography component="span" sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Video meetings, with a clear next step</Typography>
          </Box>
          <Typography id="hero-title" component={motion.h1} {...enter(0.06)} sx={{ fontSize: 'clamp(2.15rem, 5.4vw, 4.25rem)', fontFamily: 'var(--font-heading)', fontWeight: 700, lineHeight: 1.08, letterSpacing: '-0.055em', mb: 3, color: 'var(--text-primary)', textWrap: 'balance' }}>
            Better conversations.<br />
            <Box component="span" sx={{ color: 'var(--color-primary)' }}>Clearer decisions.</Box>
          </Typography>
          <Typography component={motion.p} {...enter(0.12)} sx={{ fontSize: { xs: '1rem', sm: '1.125rem' }, maxWidth: 610, mx: 'auto', color: 'var(--text-secondary)', lineHeight: 1.8, mb: { xs: 4, md: 4.5 }, textWrap: 'pretty' }}>
            Bring your team together with video, shared screens, and live captions. Turn the conversation into useful notes and next steps.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center" component={motion.div} {...enter(0.18)} sx={{ maxWidth: { xs: 340, sm: 'none' }, mx: 'auto' }}>
            <Box component="button" type="button" className="btn-premium" onClick={onStartTrial} sx={{ py: 1.75, px: 3.5, fontSize: '1rem' }}>Start a meeting</Box>
            <Box component="button" type="button" className="btn-premium-outline" onClick={() => document.getElementById('product-preview')?.scrollIntoView({ behavior: reduceMotion ? 'instant' : 'smooth' })} sx={{ py: 1.75, px: 3.5, fontSize: '1rem' }}>Explore the workspace</Box>
          </Stack>
          <Box component={motion.div} {...enter(0.24)} sx={{ mt: 4, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: { xs: 1.5, sm: 3 } }}>
            {['Video & screen sharing', 'Live captions', 'Meeting insights'].map(item => <Typography key={item} sx={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>{item}</Typography>)}
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
