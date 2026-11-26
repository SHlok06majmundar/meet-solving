import { Button } from '@mui/material';
import { Google } from '@mui/icons-material';
import { useClerk, useAuth } from '@clerk/react'

const GoogleSignInButton = ({ variant = 'contained', size = 'medium', fullWidth = false, ...props }) => {
  const { openSignIn } = useClerk()
  const { isLoaded } = useAuth()
  const loading = !isLoaded

  const handleGoogleSignIn = async () => {
    try {
      await openSignIn()
    } catch (error) {
      console.error('Failed to sign in with Google:', error)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      fullWidth={fullWidth}
      startIcon={<Google />}
      onClick={handleGoogleSignIn}
      disabled={loading}
      sx={{
        backgroundColor: variant === 'contained' ? '#4285f4' : 'transparent',
        color: variant === 'contained' ? 'white' : '#4285f4',
        borderColor: '#4285f4',
        '&:hover': {
          backgroundColor: variant === 'contained' ? '#357ae8' : 'transparent',
          color: variant === 'contained' ? 'white' : '#357ae8',
        },
        '&:disabled': {
          backgroundColor: variant === 'contained' ? '#e0e0e0' : 'transparent',
          color: '#9e9e9e',
          borderColor: '#e0e0e0',
        }
      }}
      {...props}
    >
      {loading ? 'Signing in...' : 'Sign in with Google'}
    </Button>
  )
}

export default GoogleSignInButton
