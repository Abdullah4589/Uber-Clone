import { SignInButton, SignUpButton } from '@clerk/clerk-react';
import { BarButton } from '../../components/BarButton';

// Opens Clerk's hosted modal which automatically shows all social providers
// enabled in the Clerk dashboard (Google, Facebook, Microsoft, X, etc.).
// No redirect URL configuration needed.
export function ClerkAuthButtons() {
  return (
    <div className="space-y-2">
      <SignInButton mode="modal">
        <BarButton variant="outline">
          <SocialIcon />
          Sign in with social account
        </BarButton>
      </SignInButton>
      <SignUpButton mode="modal">
        <BarButton variant="secondary">
          Create account with social
        </BarButton>
      </SignUpButton>
    </div>
  );
}

function SocialIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}
