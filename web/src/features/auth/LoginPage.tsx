import { ClerkAuthButtons } from './ClerkAuthButtons';

export function LoginPage() {
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
        <div className="mb-10 text-center">
          <div className="mb-3 text-4xl" aria-hidden>🛺</div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight">
            RideShare <span className="text-kesar">PK</span>
          </h1>
          <p className="mt-2 text-sm text-muted">
            <span className="font-semibold text-body">Apni marzi ka kiraya</span> — your fare,
            your call
          </p>
        </div>

        <ClerkAuthButtons />

        <p className="mt-8 text-center text-xs text-muted">
          Prototype — payments, SMS and GPS are mocked.
        </p>
      </div>
    </div>
  );
}
