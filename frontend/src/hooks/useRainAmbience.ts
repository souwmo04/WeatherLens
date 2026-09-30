import { useEffect, useRef } from "react";

/**
 * Soft generated rain: filtered noise with a slow swell. Only runs when `on`
 * (which requires the user to have explicitly enabled sound — a user gesture).
 */
export function useRainAmbience(on: boolean, heavy = false) {
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  useEffect(() => {
    if (!on) {
      const ctx = ctxRef.current, gain = gainRef.current;
      if (ctx && gain) {
        gain.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
        const t = setTimeout(() => { void ctx.suspend(); }, 1500);
        return () => clearTimeout(t);
      }
      return;
    }
    let ctx = ctxRef.current;
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      ctxRef.current = ctx;
      const len = ctx.sampleRate * 4;
      const buffer = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const data = buffer.getChannelData(ch);
        let last = 0;
        for (let i = 0; i < len; i++) {
          const white = Math.random() * 2 - 1;
          last = (last + 0.035 * white) / 1.035; // brown-ish noise
          data[i] = last * 3.2 + white * 0.04;   // plus a little "patter"
        }
      }
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 300;
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 4200;
      const gain = ctx.createGain(); gain.gain.value = 0;
      src.connect(hp).connect(lp).connect(gain).connect(ctx.destination);
      src.start();
      gainRef.current = gain;
    }
    void ctx.resume();
    gainRef.current?.gain.setTargetAtTime(heavy ? 0.22 : 0.13, ctx.currentTime, 0.8);
  }, [on, heavy]);

  useEffect(() => () => { void ctxRef.current?.close(); }, []);
}
