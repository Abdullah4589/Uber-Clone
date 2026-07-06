// Tiny Web Audio chime so we don't need to ship an audio asset. Used when the
// driver arrives at the pickup. Safe to call anytime — it no-ops if the browser
// blocks audio (e.g. before any user gesture).

let ctx: AudioContext | null = null;

export function playArrivalChime() {
  try {
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = ctx ?? new AudioCtx();
    if (ctx.state === 'suspended') ctx.resume();

    // Two rising notes, repeated once — a friendly "ding-dong, ding-dong".
    const notes = [880, 1175, 880, 1175];
    notes.forEach((freq, i) => {
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = ctx!.currentTime + i * 0.22;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.2);
      osc.connect(gain).connect(ctx!.destination);
      osc.start(start);
      osc.stop(start + 0.22);
    });
  } catch {
    // audio unavailable — ignore
  }
}
