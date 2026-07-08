import { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { BarButton } from '../../components/BarButton';
import { PasswordInput } from '../../components/PasswordInput';
import { ClerkAuthButtons } from './ClerkAuthButtons';
import { ForgotPasswordForm } from './ForgotPasswordForm';

const clerkEnabled = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function errorMessage(e: unknown, fallback: string): string {
  const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
  return msg || fallback;
}

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [forgot, setForgot] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
    } catch (err) {
      setError(errorMessage(err, 'Invalid email or password'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative h-full overflow-y-auto bg-raat">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-72"
        style={{
          background:
            'radial-gradient(ellipse 70% 90% at 50% 0%, rgba(255,122,26,0.18), rgba(245,72,143,0.06) 55%, transparent 75%)',
        }}
      />

      <div className="relative mx-auto flex min-h-full w-full max-w-sm flex-col justify-center px-5 py-10 pt-[calc(40px+env(safe-area-inset-top))] pb-[calc(40px+env(safe-area-inset-bottom))]">
        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="mb-3 text-4xl" aria-hidden>🛺</div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight">
            RideShare <span className="text-kesar">PK</span>
          </h1>
          <p className="mt-2 text-sm text-muted">
            <span className="font-semibold text-body">Apni marzi ka kiraya</span> — your fare,
            your call
          </p>
        </div>

        {forgot ? (
          <ForgotPasswordForm
            initialEmail={email}
            onBack={() => { setForgot(false); setError(''); }}
          />
        ) : (
          <>
            {/* Primary: sign up / sign in via Google (Clerk) */}
            {clerkEnabled && (
              <>
                <ClerkAuthButtons />
                <div className="my-5 flex items-center gap-3 text-xs text-muted">
                  <span className="h-px flex-1 bg-hairline" />
                  or sign in with existing account
                  <span className="h-px flex-1 bg-hairline" />
                </div>
              </>
            )}

            {/* Sign-in only — new accounts go through Google above */}
            <form onSubmit={submit} className="card space-y-3">
              <input
                className="input"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <PasswordInput
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setForgot(true)}
                  className="text-xs font-semibold text-neela hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              {error && <p className="text-sm text-danger">{error}</p>}
              <BarButton type="submit" disabled={busy}>
                {busy ? 'Please wait…' : 'Sign in'}
              </BarButton>
            </form>

            {!clerkEnabled && (
              <p className="mt-4 text-center text-xs text-muted">
                New here? Ask an admin to create your account.
              </p>
            )}
          </>
        )}

        <p className="mt-6 text-center text-xs text-muted">
          Prototype — payments, SMS and GPS are mocked.
        </p>
      </div>
    </div>
  );
}
