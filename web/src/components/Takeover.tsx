import { ReactNode } from 'react';

/**
 * Full-screen sheet takeover (location search, incoming request, receipt).
 * Slides up over everything; safe-area aware; optional docked footer.
 */
export function Takeover({
  title,
  onClose,
  closeLabel = '←',
  children,
  footer,
  tone = 'raat',
}: {
  title?: ReactNode;
  onClose?: () => void;
  closeLabel?: string;
  children: ReactNode;
  footer?: ReactNode;
  tone?: 'raat' | 'surface';
}) {
  return (
    <div
      className={`fixed inset-0 z-[2000] flex animate-slide-up flex-col pt-safe ${
        tone === 'raat' ? 'bg-raat' : 'bg-surface'
      }`}
    >
      {(title || onClose) && (
        <header className="flex min-h-[56px] shrink-0 items-center gap-2 px-2">
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Back"
              className="flex h-11 w-11 items-center justify-center rounded-full text-xl text-muted transition hover:bg-surface2 active:scale-[0.95]"
            >
              {closeLabel}
            </button>
          )}
          {title && <div className="min-w-0 flex-1 font-display text-lg font-bold">{title}</div>}
        </header>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">{children}</div>
      {footer && (
        <div className="shrink-0 border-t border-hairline p-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
          <div className="mx-auto max-w-md">{footer}</div>
        </div>
      )}
    </div>
  );
}

/**
 * Bottom-sheet modal (ratings, confirmations): dim backdrop + panel that
 * slides up from the bottom edge.
 */
export function SheetModal({
  children,
  onBackdrop,
}: {
  children: ReactNode;
  onBackdrop?: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[2100] flex flex-col justify-end">
      <div className="absolute inset-0 animate-fade-in bg-black/60" onClick={onBackdrop} />
      <div className="relative mx-auto w-full max-w-md animate-slide-up rounded-t-3xl border border-b-0 border-hairline bg-surface p-4 pb-[calc(16px+env(safe-area-inset-bottom))]">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-hairline" />
        {children}
      </div>
    </div>
  );
}
