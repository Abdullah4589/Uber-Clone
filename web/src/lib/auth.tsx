import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { useAuth as useClerkSession } from '@clerk/clerk-react';
import type { UserPublic } from '@uber-clone/shared';
import { api, setAuthToken } from './api';
import { disconnectSocket } from './socket';
import { toast } from '../components/Toast';

const clerkEnabled = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

interface AuthCtx {
  user: UserPublic | null;
  token: string | null;
  loading: boolean;
  needsOnboarding: boolean;
  login: (email: string, password: string) => Promise<UserPublic>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (email: string, code: string, password: string) => Promise<UserPublic>;
  completeOnboarding: (role: 'RIDER' | 'DRIVER', vehicle?: string) => Promise<UserPublic>;
  logout: () => void;
  refresh: () => Promise<void>;
  // Internal — used by the Clerk bridge only.
  _bindClerk: (getToken: () => Promise<string | null>, signOut: () => Promise<void>) => void;
  _clerkExchange: (clerkToken: string) => Promise<void>;
  _setClerkResolved: (v: boolean) => void;
}

const Ctx = createContext<AuthCtx>(null!);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserPublic | null>(null);
  const [token, setToken] = useState<string | null>(sessionStorage.getItem('token'));
  const [appChecked, setAppChecked] = useState(!token);
  const [clerkResolved, setClerkResolved] = useState(!clerkEnabled);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  const clerkGetToken = useRef<null | (() => Promise<string | null>)>(null);
  const clerkSignOut = useRef<null | (() => Promise<void>)>(null);

  // Validate any stored app token.
  useEffect(() => {
    if (!token) {
      setAppChecked(true);
      return;
    }
    api
      .get('/me')
      .then((r) => setUser(r.data))
      .catch(() => {
        setAuthToken(null);
        setToken(null);
      })
      .finally(() => setAppChecked(true));
  }, [token]);

  const applySession = (tok: string, u: UserPublic) => {
    setAuthToken(tok);
    setToken(tok);
    setUser(u);
    setNeedsOnboarding(false);
  };

  const login = async (email: string, password: string) => {
    const r = await api.post('/auth/login', { email, password });
    applySession(r.data.token, r.data.user);
    return r.data.user as UserPublic;
  };

  // Request a password-reset code. In this mocked prototype the server returns
  // the code (`devCode`) directly instead of emailing it.
  const forgotPassword = async (email: string) => {
    await api.post('/auth/forgot', { email });
  };

  // Set a new password with the reset code, then sign the user straight in.
  const resetPassword = async (email: string, code: string, password: string) => {
    const r = await api.post('/auth/reset-password', { email, code, password });
    applySession(r.data.token, r.data.user);
    return r.data.user as UserPublic;
  };

  // Trade a Clerk session token for our app JWT (or flag onboarding).
  const _clerkExchange = async (clerkToken: string) => {
    const r = await api.post(
      '/auth/clerk',
      {},
      { headers: { Authorization: `Bearer ${clerkToken}` } }
    );
    if (r.data.needsOnboarding) setNeedsOnboarding(true);
    else applySession(r.data.token, r.data.user);
  };

  const completeOnboarding = async (role: 'RIDER' | 'DRIVER', vehicle?: string) => {
    const clerkToken = clerkGetToken.current ? await clerkGetToken.current() : null;
    if (!clerkToken) throw new Error('Not signed in');
    const r = await api.post(
      '/auth/clerk/onboard',
      { role, vehicle },
      { headers: { Authorization: `Bearer ${clerkToken}` } }
    );
    applySession(r.data.token, r.data.user);
    return r.data.user as UserPublic;
  };

  const logout = () => {
    setAuthToken(null);
    setToken(null);
    setUser(null);
    setNeedsOnboarding(false);
    disconnectSocket();
    if (clerkSignOut.current) clerkSignOut.current().catch(() => {});
  };

  const refresh = async () => {
    const r = await api.get('/me');
    setUser(r.data);
  };

  const _bindClerk = (
    getToken: () => Promise<string | null>,
    signOut: () => Promise<void>
  ) => {
    clerkGetToken.current = getToken;
    clerkSignOut.current = signOut;
  };

  const loading = !appChecked || !clerkResolved;

  return (
    <Ctx.Provider
      value={{
        user,
        token,
        loading,
        needsOnboarding,
        login,
        forgotPassword,
        resetPassword,
        completeOnboarding,
        logout,
        refresh,
        _bindClerk,
        _clerkExchange,
        _setClerkResolved: setClerkResolved,
      }}
    >
      {clerkEnabled && <ClerkBridge />}
      {children}
    </Ctx.Provider>
  );
}

/**
 * Lives inside both ClerkProvider and AuthProvider. Watches the Clerk session
 * and, once loaded, either exchanges it for an app JWT or marks Clerk resolved
 * so the app can render. Rendered only when a Clerk key is configured.
 */
function ClerkBridge() {
  const { isLoaded, isSignedIn, getToken, signOut } = useClerkSession();
  const auth = useAuth();

  useEffect(() => {
    auth._bindClerk(() => getToken(), () => signOut());
  }, [getToken, signOut]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      auth._setClerkResolved(true);
      return;
    }
    // Signed into Clerk — exchange for an app session if we don't have one yet.
    if (auth.token || auth.needsOnboarding) {
      auth._setClerkResolved(true);
      return;
    }
    getToken()
      .then((t) => (t ? auth._clerkExchange(t) : undefined))
      .catch((err) => {
        const msg: string =
          err?.response?.data?.error ?? err?.message ?? 'Sign-in failed';
        toast(msg, 'error');
        // Sign them out of Clerk so they land back on the login page cleanly.
        signOut().catch(() => {});
      })
      .finally(() => auth._setClerkResolved(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn, auth.token, auth.needsOnboarding]);

  return null;
}
