import { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { BarButton } from '../../components/BarButton';
import { ClerkAuthButtons } from './ClerkAuthButtons';

const clerkEnabled = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

type Mode = 'signin' | 'signup';


function errorMessage(e: unknown, fallback: string): string {
  const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
  return msg || fallback;
}

export function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'RIDER' | 'DRIVER'>('RIDER');
  const [vehicle, setVehicle] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const switchMode = (m: Mode) => {
    setMode(m);
    setError('');
    if (m === 'signup') {
      setEmail('');
      setPassword('');
    }
  };


  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'signin') {
        await login(email, password);
      } else {
        await register({ name, email, password, role, vehicle: vehicle || undefined });
      }
    } catch (err) {
      setError(
        errorMessage(err, mode === 'signin' ? 'Invalid email or password' : 'Sign up failed')
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative h-full overflow-y-auto bg-raat">
      {/* Chaand-raat glow behind the wordmark */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-72"
        style={{
          background:
            'radial-gradient(ellipse 70% 90% at 50% 0%, rgba(255,122,26,0.18), rgba(245,72,143,0.06) 55%, transparent 75%)',
        }}
      />

      <div className="relative mx-auto flex min-h-full w-full max-w-sm flex-col justify-center px-5 py-10 pt-[calc(40px+env(safe-area-inset-top))] pb-[calc(40px+env(safe-area-inset-bottom))]">
        {/* Brand moment */}
        <div className="mb-8 text-center">
          <div className="mb-3 text-4xl" aria-hidden>
            🛺
          </div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight">
            RideShare <span className="text-kesar">PK</span>
          </h1>
          <p className="mt-2 text-sm text-muted">
            <span className="font-semibold text-body">Apni marzi ka kiraya</span> — your fare,
            your call
          </p>
        </div>


        {clerkEnabled && (
          <div className="mb-4">
            <ClerkAuthButtons />
            <div className="my-4 flex items-center gap-3 text-xs text-muted">
              <span className="h-px flex-1 bg-hairline" />
              or use email
              <span className="h-px flex-1 bg-hairline" />
            </div>
          </div>
        )}

        {/* Sign in / Sign up segmented control */}
        <div className="mb-4 flex rounded-xl bg-surface2 p-1 text-sm font-semibold">
          <button
            className={`min-h-[44px] flex-1 rounded-lg transition ${
              mode === 'signin' ? 'bg-kesar text-[#1B0E03]' : 'text-muted'
            }`}
            onClick={() => switchMode('signin')}
          >
            Sign in
          </button>
          <button
            className={`min-h-[44px] flex-1 rounded-lg transition ${
              mode === 'signup' ? 'bg-kesar text-[#1B0E03]' : 'text-muted'
            }`}
            onClick={() => switchMode('signup')}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={submit} className="card space-y-3">
          {mode === 'signup' && (
            <>
              {/* Role choice */}
              <div className="grid grid-cols-2 gap-2">
                {(['RIDER', 'DRIVER'] as const).map((r) => (
                  <button
                    type="button"
                    key={r}
                    onClick={() => setRole(r)}
                    className={`min-h-[52px] rounded-xl border text-sm font-semibold transition active:scale-[0.97] ${
                      role === r
                        ? 'border-kesar bg-kesar/10 text-kesar'
                        : 'border-hairline bg-surface2'
                    }`}
                  >
                    {r === 'RIDER' ? '🙋 I need rides' : '🚕 I drive'}
                  </button>
                ))}
              </div>
              <input
                className="input"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </>
          )}
          <input
            className="input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <div className="relative">
            <input
              className="input pr-12"
              type={showPassword ? 'text' : 'password'}
              placeholder={mode === 'signup' ? 'Password (min 6 characters)' : 'Password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={mode === 'signup' ? 6 : undefined}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted transition hover:text-body active:scale-90"
            >
              <EyeIcon off={showPassword} />
            </button>
          </div>
          {mode === 'signup' && role === 'DRIVER' && (
            <input
              className="input"
              placeholder="Vehicle (e.g. Toyota Corolla · LEA-4823)"
              value={vehicle}
              onChange={(e) => setVehicle(e.target.value)}
              required
            />
          )}
          {error && <p className="text-sm text-danger">{error}</p>}
          <BarButton type="submit" disabled={busy}>
            {busy
              ? 'Please wait…'
              : mode === 'signin'
                ? 'Sign in'
                : role === 'DRIVER'
                  ? 'Sign up to drive'
                  : 'Sign up to ride'}
          </BarButton>
        </form>

        <p className="mt-6 text-center text-xs text-muted">
          Prototype — payments, SMS and GPS are mocked.
        </p>
      </div>
    </div>
  );
}

/** Eye / eye-off toggle glyph for the password field. */
function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
      {off && <line x1="3" y1="3" x2="21" y2="21" />}
    </svg>
  );
}
