import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import './styles.css';
import { App } from './app/App';
import { AuthProvider } from './lib/auth';

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

// Clerk is optional — the app still runs on the built-in/demo auth without a key.
function Root() {
  const tree = (
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  );
  return CLERK_KEY ? (
    <ClerkProvider publishableKey={CLERK_KEY} afterSignOutUrl="/login">
      {tree}
    </ClerkProvider>
  ) : (
    tree
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
