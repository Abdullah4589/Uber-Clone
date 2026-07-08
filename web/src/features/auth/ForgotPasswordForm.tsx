import { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { BarButton } from '../../components/BarButton';
import { PasswordInput } from '../../components/PasswordInput';
import { ClerkAuthButtons } from './ClerkAuthButtons';

function parseError(e: unknown): string {
  return (e as { response?: { data?: { error?: string } } })?.response?.data?.error
    ?? (e as { message?: string })?.message
    ?? 'Something went wrong';
}

/**
 * Two-step password reset.
 * Step 1: enter email → server emails a 6-digit code (expires in 10 min).
 * Step 2: enter the code + new password → signed in automatically.
 */
export function ForgotPasswordForm({
  initialEmail,
  onBack,
}: {
  initialEmail: string;
  onBack: () => void;
}) {
  const { forgotPassword, resetPassword } = useAuth();
  const [step, setStep] = useState<'request' | 'verify' | 'google'>('request');
  const [email, setEmail] = useState(initialEmail);
  const [devCode, setDevCode] = useState<string | undefined>();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const requestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await forgotPassword(email);
      setDevCode(res.devCode);
      setStep('verify');
    } catch (err) {
      const msg = parseError(err);
      if (msg.toLowerCase().includes('google')) {
        setStep('google');
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  const reset = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await resetPassword(email, code, password);
      // On success the auth session is applied and the app navigates away.
    } catch (err) {
      setError(parseError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-semibold text-muted hover:text-body"
        >
          ← Back
        </button>
        <h2 className="font-display text-lg font-bold">Reset password</h2>
      </div>

      {step === 'google' ? (
        <div className="card space-y-4">
          <div className="text-center">
            <div className="mb-2 text-3xl">🔑</div>
            <p className="font-semibold">This account uses Google sign-in</p>
            <p className="mt-1 text-sm text-muted">
              <span className="font-medium text-body">{email}</span> was signed up
              with Google. There's no password to reset — just sign in with Google below.
            </p>
          </div>
          <ClerkAuthButtons />
          <button
            type="button"
            onClick={() => { setStep('request'); setError(''); }}
            className="w-full text-center text-xs font-semibold text-muted hover:text-body"
          >
            Use a different email
          </button>
        </div>
      ) : step === 'request' ? (
        <form onSubmit={requestCode} className="card space-y-3">
          <p className="text-sm text-muted">
            Enter your account email and we'll send you a 6-digit reset code.
          </p>
          <input
            className="input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <BarButton type="submit" disabled={busy}>
            {busy ? 'Sending…' : 'Send reset code'}
          </BarButton>
        </form>
      ) : (
        <form onSubmit={reset} className="card space-y-3">
          {/* Show code on screen when no email provider is configured,
              otherwise tell the user to check their inbox. */}
          {devCode ? (
            <div className="rounded-xl border border-kesar/40 bg-kesar/10 px-4 py-3 text-center">
              <p className="text-xs text-muted">Your reset code</p>
              <p className="font-display text-3xl font-black tracking-widest text-kesar">
                {devCode}
              </p>
              <p className="mt-1 text-xs text-muted">Expires in 10 minutes</p>
            </div>
          ) : (
            <div className="rounded-xl border border-hairline bg-surface2 px-4 py-3">
              <p className="text-sm font-semibold">Check your inbox</p>
              <p className="mt-0.5 text-xs text-muted">
                We sent a 6-digit code to{' '}
                <span className="font-semibold text-body">{email}</span>. It
                expires in 10 minutes — check spam if you don't see it.
              </p>
            </div>
          )}

          <input
            className="input tracking-widest"
            inputMode="numeric"
            placeholder="6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            required
            autoFocus
          />
          <PasswordInput
            placeholder="New password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <BarButton type="submit" disabled={busy || code.length < 6}>
            {busy ? 'Please wait…' : 'Reset password & sign in'}
          </BarButton>
          <button
            type="button"
            onClick={() => {
              setStep('request');
              setCode('');
              setError('');
            }}
            className="w-full text-center text-xs font-semibold text-muted hover:text-body"
          >
            Resend code or use a different email
          </button>
        </form>
      )}
    </div>
  );
}
