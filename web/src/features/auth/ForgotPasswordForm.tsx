import { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { BarButton } from '../../components/BarButton';
import { PasswordInput } from '../../components/PasswordInput';

function errorMessage(e: unknown, fallback: string): string {
  const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
  return msg || fallback;
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
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const requestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await forgotPassword(email);
      setStep('verify');
    } catch (err) {
      setError(errorMessage(err, 'Could not send a reset code'));
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
      setError(errorMessage(err, 'Could not reset your password'));
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

      {step === 'request' ? (
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
          {/* Email sent confirmation */}
          <div className="rounded-xl border border-hairline bg-surface2 px-4 py-3">
            <p className="text-sm font-semibold">Check your inbox</p>
            <p className="mt-0.5 text-xs text-muted">
              We sent a 6-digit code to{' '}
              <span className="font-semibold text-body">{email}</span>. It
              expires in 10 minutes — check spam if you don't see it.
            </p>
          </div>

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
