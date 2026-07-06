import { SignInButton, SignUpButton } from '@clerk/clerk-react';
import { BarButton } from '../../components/BarButton';

// Clerk's hosted sign-in/up modals. Only rendered when a Clerk key is set, so
// these are always inside <ClerkProvider>. After auth, the bridge in auth.tsx
// exchanges the Clerk session for an app JWT automatically.
export function ClerkAuthButtons() {
  return (
    <div className="space-y-2">
      <SignInButton mode="modal">
        <BarButton>Sign in with Clerk</BarButton>
      </SignInButton>
      <SignUpButton mode="modal">
        <BarButton variant="secondary">Create an account</BarButton>
      </SignUpButton>
    </div>
  );
}
