export interface TabDef<T extends string> {
  key: T;
  label: string;
  icon: string;
}

/** Bottom tab bar — thumb-first navigation, safe-area aware. */
export function TabBar<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: TabDef<T>[];
  active: T;
  onChange: (t: T) => void;
}) {
  return (
    <nav className="z-[1500] shrink-0 border-t border-hairline bg-surface/95 pb-safe backdrop-blur">
      <div className="mx-auto flex max-w-md">
        {tabs.map((t) => {
          const on = t.key === active;
          return (
            <button
              key={t.key}
              onClick={() => onChange(t.key)}
              className="flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 active:scale-[0.97]"
              aria-current={on ? 'page' : undefined}
            >
              <span className={`text-xl leading-none ${on ? '' : 'opacity-60 grayscale'}`}>
                {t.icon}
              </span>
              <span
                className={`text-[11px] font-semibold ${on ? 'text-kesar' : 'text-muted'}`}
              >
                {t.label}
              </span>
              <span
                className={`h-1 w-1 rounded-full transition-colors ${on ? 'bg-kesar' : 'bg-transparent'}`}
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
