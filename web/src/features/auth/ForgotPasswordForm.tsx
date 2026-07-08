import { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { BarButton } from '../../components/BarButton';
import { PasswordInput } from '../../components/PasswordInput';

function errorMessage(e: unknown, fallback: string): string {
  const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
  return msg || fallback;
}

/**
 * Two-step password reset. Step 1 requests a code by email; because this
 * prototype has no email provider, the server returns the code directly and we
 * show it here. Step 2 sets a new password and signs the user straight in.
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
      const { devCode } = await forgotPassword(email);
      setDevCode(devCode);
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
            Enter your account email and we’ll send you a reset code.
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
            {busy ? 'Please wait…' : 'Send reset code'}
          </BarButton>
        </form>
      ) : (
        <form onSubmit={reset} className="card space-y-3">
          {devCode ? (
            <div className="rounded-xl border border-kesar/40 bg-kesar/10 px-3 py-2 text-sm">
              <span className="text-muted">Demo — your reset code is </span>
              <span className="font-display text-base font-bold tracking-widest text-kesar">
                {devCode}
              </span>
              <p className="mt-1 text-xs text-muted">
                (No email is sent in this prototype.)
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted">
              If an account exists for <span className="font-semibold">{email}</span>, a reset
              code has been sent.
            </p>
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
          <BarButton type="submit" disabled={busy}>
            {busy ? 'Please wait…' : 'Reset password & sign in'}
          </BarButton>
          <button
            type="button"
            onClick={() => {
              setStep('request');
              setError('');
            }}
            className="w-full text-center text-xs font-semibold text-muted hover:text-body"
          >
            Use a different email
          </button>
        </form>
      )}
    </div>
  );
}
