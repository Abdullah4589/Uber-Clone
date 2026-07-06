import { ReactNode, useEffect, useRef, useState } from 'react';
import { searchPlaces, type GeoPlace } from '../lib/geo';
import { CITIES } from '../lib/locations';
import { Takeover } from './Takeover';

export interface QuickRow {
  icon: string;
  label: string;
  hint?: string;
  onPick: () => void;
}

function Row({
  icon,
  label,
  hint,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      className="flex min-h-[52px] w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-surface2 active:scale-[0.99]"
      onClick={onClick}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface2 text-base">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium">{label}</span>
        {hint && <span className="block truncate text-xs text-muted">{hint}</span>}
      </span>
      <span className="text-muted">›</span>
    </button>
  );
}

/**
 * Full-sheet location picker: debounced Nominatim search up top, recents and
 * seeded Pakistani landmarks underneath. Replaces the old inline dropdown.
 */
export function LocationTakeover({
  title,
  placeholder,
  accent = 'neela',
  quickRows = [],
  recents = [],
  onClose,
  onSelect,
}: {
  title: string;
  placeholder: string;
  accent?: 'neela' | 'kesar';
  quickRows?: QuickRow[];
  recents?: GeoPlace[];
  onClose: () => void;
  onSelect: (p: GeoPlace) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeoPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => inputRef.current?.focus(), []);

  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        setResults(await searchPlaces(query));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [query]);

  const searching = query.trim().length >= 3;

  return (
    <Takeover title={title} onClose={onClose}>
      <div className="sticky top-0 z-10 -mx-4 bg-raat px-4 pb-3">
        <div
          className={`flex items-center gap-2 rounded-2xl border-2 bg-surface2 px-4 ${
            accent === 'kesar' ? 'border-kesar/50' : 'border-neela/50'
          }`}
        >
          <span aria-hidden>🔎</span>
          <input
            ref={inputRef}
            className="w-full bg-transparent py-3.5 text-base outline-none placeholder:text-muted"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              className="min-h-[44px] px-1 text-muted"
              onClick={() => setQuery('')}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {searching ? (
        <div className="space-y-1">
          {loading && (
            <>
              <div className="skeleton h-[52px]" />
              <div className="skeleton h-[52px]" />
              <div className="skeleton h-[52px]" />
            </>
          )}
          {!loading && results.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-muted">
              No matches — try a nearby landmark, market, or area name.
            </p>
          )}
          {!loading &&
            results.map((r, i) => (
              <Row
                key={`${r.lat},${r.lng},${i}`}
                icon="📍"
                label={r.label}
                onClick={() => onSelect(r)}
              />
            ))}
        </div>
      ) : (
        <div className="space-y-5">
          {quickRows.length > 0 && (
            <div className="space-y-1">
              {quickRows.map((q) => (
                <Row key={q.label} icon={q.icon} label={q.label} hint={q.hint} onClick={q.onPick} />
              ))}
            </div>
          )}

          {recents.length > 0 && (
            <section>
              <h3 className="mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-muted">
                Recent
              </h3>
              <div className="space-y-1">
                {recents.map((r, i) => (
                  <Row
                    key={`${r.label}-${i}`}
                    icon="🕐"
                    label={r.label}
                    onClick={() => onSelect(r)}
                  />
                ))}
              </div>
            </section>
          )}

          <section>
            <h3 className="mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-muted">
              Popular landmarks
            </h3>
            {CITIES.map((c) => (
              <div key={c.name} className="space-y-1">
                {c.places.map((p) => (
                  <Row
                    key={p.label}
                    icon="🏙️"
                    label={p.label}
                    hint={c.name}
                    onClick={() => onSelect({ label: `${p.label}, ${c.name}`, lat: p.lat, lng: p.lng })}
                  />
                ))}
              </div>
            ))}
          </section>
        </div>
      )}
    </Takeover>
  );
}
