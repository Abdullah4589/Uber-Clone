import { ReactNode, useLayoutEffect, useRef, useState } from 'react';

export type SnapPoint = 'peek' | 'half' | 'full';

const EASE = 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)';

/**
 * Map-overlay bottom sheet with three snap points (peek / half / full).
 * Plain pointer events + CSS transforms — no animation deps. Drag from the
 * grab handle anywhere; the body is also draggable until the sheet is at
 * full, where the content scrolls natively instead.
 */
export function BottomSheet({
  snap,
  onSnapChange,
  peek = 180,
  snaps = ['peek', 'half', 'full'],
  children,
}: {
  snap: SnapPoint;
  onSnapChange: (s: SnapPoint) => void;
  peek?: number;
  snaps?: SnapPoint[];
  children: ReactNode;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [H, setH] = useState(0);
  const [drag, setDrag] = useState<number | null>(null);
  const st = useRef<{
    startY: number;
    startH: number;
    lastY: number;
    lastT: number;
    v: number;
    active: boolean;
  } | null>(null);
  const suppressClickUntil = useRef(0);

  useLayoutEffect(() => {
    const parent = sheetRef.current?.parentElement;
    if (!parent) return;
    const update = () => setH(parent.clientHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(parent);
    return () => ro.disconnect();
  }, []);

  const heightFor = (s: SnapPoint) =>
    s === 'peek'
      ? Math.min(peek, Math.max(120, H - 24))
      : s === 'half'
        ? Math.round(H * 0.55)
        : H - 12;

  const fullH = H ? heightFor(snaps[snaps.length - 1]) : peek;
  const visible = drag ?? (H ? heightFor(snap) : peek);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    st.current = {
      startY: e.clientY,
      startH: visible,
      lastY: e.clientY,
      lastT: performance.now(),
      v: 0,
      active: false,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const s = st.current;
    if (!s) return;
    const dy = s.startY - e.clientY; // dragging up is positive
    if (!s.active) {
      if (Math.abs(dy) < 6) return; // dead zone so taps stay taps
      s.active = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    const now = performance.now();
    if (now > s.lastT) s.v = (s.lastY - e.clientY) / (now - s.lastT); // px/ms
    s.lastY = e.clientY;
    s.lastT = now;
    const min = heightFor(snaps[0]);
    setDrag(Math.max(min * 0.6, Math.min(fullH, s.startH + dy)));
  };

  const endDrag = () => {
    const s = st.current;
    st.current = null;
    if (!s || !s.active) {
      setDrag(null);
      return;
    }
    suppressClickUntil.current = performance.now() + 250;
    const current = drag ?? heightFor(snap);
    // Project a little momentum, then land on the nearest snap.
    const projected = current + s.v * 160;
    let best = snaps[0];
    for (const cand of snaps) {
      if (Math.abs(heightFor(cand) - projected) < Math.abs(heightFor(best) - projected))
        best = cand;
    }
    setDrag(null);
    if (best !== snap) onSnapChange(best);
  };

  const dragBind = {
    onPointerDown,
    onPointerMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
    style: { touchAction: 'none' as const },
  };

  const scrollable = snap === 'full' && drag == null;
  const halfH = H ? heightFor('half') : 1;
  const dimFrom = snaps.includes('half') ? halfH : heightFor(snaps[0]);
  const backdrop =
    fullH > dimFrom ? Math.min(1, Math.max(0, (visible - dimFrom) / (fullH - dimFrom))) : 0;

  return (
    <>
      {backdrop > 0.02 && (
        <div
          className="absolute inset-0 z-[900] bg-black"
          style={{ opacity: backdrop * 0.45 }}
          onClick={() => onSnapChange(snaps.includes('half') ? 'half' : snaps[0])}
        />
      )}
      <div
        ref={sheetRef}
        className="absolute inset-x-0 bottom-0 z-[1000] mx-auto flex w-full max-w-md flex-col rounded-t-3xl border border-b-0 border-hairline bg-surface shadow-[0_-8px_40px_rgba(0,0,0,0.45)] md:left-4 md:right-auto md:mx-0 md:rounded-b-3xl md:border-b"
        style={{
          height: fullH,
          transform: `translateY(${Math.max(0, fullH - visible)}px)`,
          transition: drag != null ? 'none' : EASE,
        }}
        onClickCapture={(e) => {
          if (performance.now() < suppressClickUntil.current) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        <div {...dragBind} className="flex shrink-0 cursor-grab justify-center py-2.5">
          <div className="h-1.5 w-10 rounded-full bg-hairline" />
        </div>
        <div
          ref={scrollRef}
          className={`min-h-0 flex-1 px-4 pb-6 ${scrollable ? 'overflow-y-auto no-scrollbar' : 'overflow-hidden'}`}
          {...(snap !== 'full' ? dragBind : {})}
        >
          {children}
        </div>
      </div>
    </>
  );
}
