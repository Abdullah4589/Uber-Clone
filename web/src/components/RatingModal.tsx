import { useState } from 'react';
import { api } from '../lib/api';
import { Stars } from './ui';
import { SheetModal } from './Takeover';
import { BarButton } from './BarButton';

const QUICK_TAGS = ['Polite', 'On time', 'Clean car', 'Safe driving', 'Smooth pickup'];

/** Post-trip rating as a bottom sheet: big stars + quick-tag chips. */
export function RatingModal({
  rideId,
  counterpartyName,
  onDone,
}: {
  rideId: string;
  counterpartyName: string;
  onDone: () => void;
}) {
  const [stars, setStars] = useState(5);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const toggleTag = (t: string) =>
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const submit = async () => {
    setBusy(true);
    try {
      const full = [...tags, comment.trim()].filter(Boolean).join(' · ');
      await api.post(`/rides/${rideId}/rate`, { stars, comment: full });
      onDone();
    } finally {
      setBusy(false);
    }
  };

  return (
    <SheetModal>
      <div className="space-y-4 text-center">
        <div>
          <h3 className="font-display text-xl font-bold">How was your safar?</h3>
          <p className="mt-0.5 text-sm text-muted">Rate {counterpartyName}</p>
        </div>

        <div className="flex justify-center">
          <Stars value={stars} onChange={setStars} size={38} />
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {QUICK_TAGS.map((t) => {
            const on = tags.includes(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleTag(t)}
                className={`min-h-[40px] rounded-full border px-4 text-sm font-medium transition active:scale-[0.95] ${
                  on
                    ? 'border-kesar bg-kesar/15 text-kesar'
                    : 'border-hairline bg-surface2 text-muted'
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>

        <textarea
          className="input min-h-[72px] resize-none text-left"
          placeholder="Anything else? (optional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />

        <div className="flex gap-2">
          <BarButton variant="secondary" className="flex-1" onClick={onDone}>
            Skip
          </BarButton>
          <BarButton className="flex-1" onClick={submit} disabled={busy}>
            {busy ? 'Sending…' : 'Submit'}
          </BarButton>
        </div>
      </div>
    </SheetModal>
  );
}
