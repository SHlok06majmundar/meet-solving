import { SignIn, useAuth } from '@clerk/react';
import { Box, CircularProgress } from '@mui/material';


export default function RequireSession({ children }) {
  const { isLoaded, isSignedIn } = useAuth();
  return <Box sx={{ minHeight: '100vh' }}>
    {!isLoaded ? <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}><CircularProgress aria-label="Loading your session" /></Box>
      : isSignedIn ? children
        : <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '100vh', p: 2 }}>
          <SignIn routing="hash" forceRedirectUrl={window.location.pathname} />
        </Box>}
  </Box>;
}
