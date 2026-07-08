import { useSignIn, useSignUp } from '@clerk/clerk-react';
import { BarButton } from '../../components/BarButton';

type OAuthProvider = 'oauth_google' | 'oauth_facebook';

const PROVIDERS: { strategy: OAuthProvider; label: string; icon: JSX.Element }[] = [
  { strategy: 'oauth_google',   label: 'Continue with Google',   icon: <GoogleIcon /> },
  { strategy: 'oauth_facebook', label: 'Continue with Facebook', icon: <FacebookIcon /> },
];

const CALLBACK_URL = `${window.location.origin}/sso-callback`;

export function ClerkAuthButtons() {
  const { signIn, isLoaded: siLoaded } = useSignIn();
  const { signUp, isLoaded: suLoaded } = useSignUp();
  const loaded = siLoaded && suLoaded;

  const handleOAuth = async (strategy: OAuthProvider) => {
    if (!loaded) return;
    try {
      // Try sign-in first; Clerk will prompt sign-up for new accounts.
      await signIn!.authenticateWithRedirect({
        strategy,
        redirectUrl: CALLBACK_URL,
        redirectUrlComplete: '/',
      });
    } catch {
      await signUp!.authenticateWithRedirect({
        strategy,
        redirectUrl: CALLBACK_URL,
        redirectUrlComplete: '/',
      });
    }
  };

  return (
    <div className="space-y-2">
      {PROVIDERS.map(({ strategy, label, icon }) => (
        <BarButton
          key={strategy}
          variant="outline"
          disabled={!loaded}
          onClick={() => handleOAuth(strategy)}
        >
          {icon}
          {label}
        </BarButton>
      ))}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917Z"/>
      <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691Z"/>
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44Z"/>
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917Z"/>
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2" aria-hidden>
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073Z"/>
    </svg>
  );
}
