import { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'gulabi' | 'outline';

const styles: Record<Variant, string> = {
  primary: 'bg-kesar text-[#1B0E03] hover:bg-kesar-dark',
  secondary: 'bg-surface2 text-body hover:bg-hairline',
  danger: 'bg-danger/90 text-white hover:bg-danger',
  gulabi: 'bg-gulabi text-white hover:bg-gulabi-dark',
  outline: 'border border-hairline bg-transparent text-body hover:bg-surface2',
};

/** Full-width, thumb-height CTA bar button. */
export function BarButton({
  variant = 'primary',
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`flex h-14 w-full items-center justify-center gap-2 rounded-2xl px-4 font-display text-[17px] font-bold tracking-tight transition active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 ${styles[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/**
 * Fixed action dock at the bottom of a map/sheet screen. Content inside a
 * sheet should pad its bottom (~pb-24) so nothing hides behind the dock.
 */
export function Dock({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1300] p-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto mx-auto w-full max-w-md space-y-2 md:mx-0 md:ml-4 md:w-[calc(28rem-2rem)]">
        {children}
      </div>
    </div>
  );
}
