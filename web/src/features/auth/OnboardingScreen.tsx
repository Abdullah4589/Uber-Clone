import { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { BarButton } from '../../components/BarButton';

/**
 * Shown once, right after a first-time Clerk sign-up, to capture the role
 * (and vehicle for drivers) that Clerk itself doesn't know about.
 */
export function OnboardingScreen() {
  const { completeOnboarding, logout } = useAuth();
  const [role, setRole] = useState<'RIDER' | 'DRIVER'>('RIDER');
  const [vehicle, setVehicle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await completeOnboarding(role, vehicle || undefined);
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Could not finish setup');
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
        <div className="mb-8 text-center">
          <div className="mb-3 text-4xl" aria-hidden>
            👋
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Khush aamdeed</h1>
          <p className="mt-2 text-sm text-muted">
            Tell us how you’ll use RideShare <span className="font-semibold text-kesar">PK</span>
          </p>
        </div>

        <form onSubmit={submit} className="card space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {(['RIDER', 'DRIVER'] as const).map((r) => (
              <button
                type="button"
                key={r}
                onClick={() => setRole(r)}
                className={`min-h-[64px] rounded-xl border text-sm font-semibold transition active:scale-[0.97] ${
                  role === r
                    ? 'border-kesar bg-kesar/10 text-kesar'
                    : 'border-hairline bg-surface2'
                }`}
              >
                {r === 'RIDER' ? '🙋 I need rides' : '🚕 I drive'}
              </button>
            ))}
          </div>

          {role === 'DRIVER' && (
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
            {busy ? 'Setting up…' : 'Continue'}
          </BarButton>
          <button
            type="button"
            className="min-h-[44px] w-full text-sm font-semibold text-muted transition hover:text-body"
            onClick={logout}
          >
            Cancel & sign out
          </button>
        </form>
      </div>
    </div>
  );
}
