import { ClerkProvider } from '@clerk/react';
import { useAppTheme } from '../theme/themeContext';
import App from '../App';
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
export default function ClerkShell() {
  const { mode } = useAppTheme();
  const isDark = mode === 'dark';

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      appearance={{
        options: {
          socialButtonsVariant: 'iconButton',
          showOptionalFields: false,
          logoPlacement: 'none',
          helpPageUrl: false,
          privacyPageUrl: false,
          termsPageUrl: false,
        },
        variables: {
          colorPrimary: isDark ? '#ffffff' : '#000000',
          colorTextOnPrimaryBackground: isDark ? '#000000' : '#ffffff',
          colorInputBackground: 'var(--bg-dark)',
          colorInputText: 'var(--text-primary)',
          colorText: 'var(--text-primary)',
          colorTextSecondary: 'var(--text-secondary)',
          fontFamily: 'var(--font-primary), sans-serif',
          borderRadius: '12px',
          spacingUnit: '0.75rem',
        },
        elements: {
          card: 'cl-card',
          formButtonPrimary: 'cl-formButtonPrimary',
          headerTitle: 'cl-headerTitle',
          headerSubtitle: 'cl-headerSubtitle',
          footerActionLink: 'cl-footerActionLink',
          footerActionText: 'cl-footerActionText',
          formFieldInput: 'cl-formFieldInput',
          formFieldLabel: 'cl-formFieldLabel',
          socialButtonsIconButton: 'cl-socialButtonsIconButton',
          identityPreviewText: 'cl-identityPreviewText',
          formFieldAction: 'cl-formFieldAction',
          dividerText: 'cl-dividerText',
          formFieldError: 'cl-formFieldError',
          userButtonTrigger: 'cl-userButtonTrigger',
        }
      }}
    >
      <App />
    </ClerkProvider>
  );
}

