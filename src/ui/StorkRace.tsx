"use client";

import { useEffect, useMemo } from "react";

/** Clicks on the logo, each within this time of the last. */
export const RACE_CLICKS = 5;
export const RACE_CLICK_GAP_MS = 700;

/** Stork seen from the side, facing right, with a wing that flaps about the shoulder. */
function Stork({ flapS }: { flapS: number }) {
  return (
    <svg viewBox="0 -26 120 90" width="120" height="90" aria-hidden="true">
      <g className="race-legs" stroke="#d8402a" strokeWidth="2.2" strokeLinecap="round">
        <line x1="34" y1="37" x2="3" y2="40" />
        <line x1="36" y1="38" x2="5" y2="44" />
      </g>
      <polygon points="28,30 14,27 16,35" fill="#f6f6f2" stroke="#c9c9c2" strokeWidth="0.8" />
      <ellipse cx="48" cy="33" rx="22" ry="9" fill="#f6f6f2" stroke="#c9c9c2" strokeWidth="0.8" />
      <path d="M66 30 Q76 24 88 22" stroke="#f6f6f2" strokeWidth="6" strokeLinecap="round" fill="none" />
      <circle cx="89" cy="21" r="5.5" fill="#f6f6f2" stroke="#c9c9c2" strokeWidth="0.8" />
      <circle cx="91" cy="19.5" r="1.4" fill="#1a1a1e" />
      <polygon points="93,19 117,23 93,24.5" fill="#d8402a" />
      <g className="race-wing" style={{ animationDuration: `${flapS}s` }}>
        <polygon points="40,30 62,29 60,8 44,4" fill="#f6f6f2" stroke="#c9c9c2" strokeWidth="0.8" />
        <polygon points="44,4 60,8 54,-14 40,-20 34,-8" fill="#1a1a1e" />
      </g>
    </svg>
  );
}

/** Small seeded random generator (mulberry32), so a race is fixed once started. */
function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Three storks flying across the screen from left to right. Decorative, ignores the pointer, skipped with reduced motion. */
export function StorkRace({ seed, onDone }: { seed: number; onDone: () => void }) {
  // Each stork gets its own lane, pace and wing beat; the fastest wins.
  const storks = useMemo(() => {
    const rnd = random(seed);
    return [0, 1, 2].map((lane) => ({
      lane,
      top: 14 + lane * 16 + rnd() * 6,
      durS: 4.2 + rnd() * 2.4,
      flapS: 0.42 + rnd() * 0.2,
      bobS: 1.1 + rnd() * 0.6,
    }));
  }, [seed]);
  const longest = Math.max(...storks.map((s) => s.durS));
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { onDone(); return; }
    const timer = setTimeout(onDone, longest * 1000 + 200);
    return () => clearTimeout(timer);
  }, [longest, onDone]);
  return (
    <div className="race" aria-hidden="true">
      {storks.map((s) => (
        <div key={s.lane} className="race-lane" style={{ top: `${s.top}vh`, animationDuration: `${s.durS}s` }}>
          <div className="race-bob" style={{ animationDuration: `${s.bobS}s` }}><Stork flapS={s.flapS} /></div>
        </div>
      ))}
    </div>
  );
}
