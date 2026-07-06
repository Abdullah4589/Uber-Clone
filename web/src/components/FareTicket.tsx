import { ReactNode } from 'react';

/**
 * The signature "Safar" fare-ticket card: one perforated edge (dashed rule +
 * punched notches, cut via CSS masks in styles.css). Body on top, stub below
 * the perforation — put the fare/total in the stub.
 */
export function FareTicket({
  children,
  stub,
  stubHeight = 56,
  className = '',
  selected = false,
  onClick,
}: {
  children: ReactNode;
  stub: ReactNode;
  stubHeight?: number;
  className?: string;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      className={`ticket ${selected ? '!border-kesar' : ''} ${onClick ? 'cursor-pointer active:scale-[0.98] transition' : ''} ${className}`}
      style={{ ['--perf' as string]: `${stubHeight}px` }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      <div className="p-3.5">{children}</div>
      <div className="ticket-perf" />
      <div className="flex items-center px-3.5" style={{ height: stubHeight - 2 }}>
        {stub}
      </div>
    </div>
  );
}

/** Fare set big and proud — "Rs" small at 60% ahead of the amount. */
export function FareAmount({
  value,
  className = '',
}: {
  value: number;
  className?: string;
}) {
  return (
    <span className={`font-display font-bold tracking-tight ${className}`}>
      <span className="mr-0.5 font-semibold uppercase opacity-70" style={{ fontSize: '0.6em' }}>
        Rs
      </span>
      {Math.round(value).toLocaleString()}
    </span>
  );
}
