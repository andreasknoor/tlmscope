import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

// Phase colours as in the app (light theme).
const MOTOR = "#eb6834";
const GLIDE = "#3987e5";
const LIFT = "#1baf7a";

type P = [number, number, number];

/**
 * Oblique view of a ground plane: x to the right and away, y to the left and away, z up.
 * Everything that matters sits in the centre square (x 285…915), because compact previews
 * (phones, iMessage, Facebook) crop the wide image to a square around its middle.
 */
const project = ([x, y, z]: P): [number, number] => [600 + (x - y) * 0.87 * 1.9, 455 + (x + y) * 0.5 * 1.9 - z * 1.75];
const points = (ps: P[]) => ps.map((p) => project(p).map((v) => v.toFixed(1)).join(",")).join(" ");
const ground = (ps: P[]): P[] => ps.map(([x, y]) => [x, y, 0]);

/** A small synthetic flight: motor climb, glide, a thermal spiral, glide out. */
function flight() {
  const climb: P[] = [];
  for (let k = 0; k <= 20; k++) climb.push([-50 + k * 3.5, 50 - k * 2, k * 4]);
  const glide: P[] = [];
  const [gx, gy, gz] = climb[climb.length - 1];
  for (let k = 0; k <= 40; k++) {
    const t = k / 40;
    glide.push([gx + 45 * t, gy - 35 * Math.sin(t * Math.PI) + 20 * t, gz - 22 * t]);
  }
  const thermal: P[] = [];
  const [tx, ty, tz] = glide[glide.length - 1];
  const r = 20;
  for (let k = 0; k <= 120; k++) {
    const a = (k / 120) * 4 * Math.PI;
    thermal.push([tx - r + r * Math.cos(a), ty + r * Math.sin(a), tz + k * 0.5]);
  }
  const out: P[] = [];
  const [ox, oy, oz] = thermal[thermal.length - 1];
  for (let k = 0; k <= 40; k++) {
    const t = k / 40;
    out.push([ox - 60 * t, oy - 45 * t + 20 * Math.sin(t * Math.PI), oz - 25 * t]);
  }
  return { climb, glide, thermal, out };
}

/** Preview image for links shared on social networks and in messengers. */
export function renderOgImage(tagline: string) {
  const f = flight();
  const all = [...f.climb, ...f.glide, ...f.thermal, ...f.out];
  // The ground grid runs out to the sides, so the wide image is filled while the centre carries the content.
  const grid: [P, P][] = [];
  for (let k = -240; k <= 240; k += 30) {
    grid.push([[k, -240, 0], [k, 240, 0]], [[-240, k, 0], [240, k, 0]]);
  }
  const marker = project(f.out[f.out.length - 1]);
  const home = project(f.climb[0]);
  const line = { fill: "none", strokeWidth: 7, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "linear-gradient(180deg, #0b2a35 0%, #0d6a83 100%)", color: "#ffffff", fontFamily: "sans-serif" }}>
        <svg width="1200" height="630" viewBox="0 0 1200 630" style={{ position: "absolute", left: 0, top: 0 }}>
          {grid.map(([a, b], k) => {
            const [x1, y1] = project(a), [x2, y2] = project(b);
            return <line key={k} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ffffff" strokeOpacity="0.13" strokeWidth="1.5" />;
          })}
          <polyline points={points(ground(all))} fill="none" stroke="#000000" strokeOpacity="0.3" strokeWidth="3" strokeLinejoin="round" />
          <polyline points={points(f.climb)} stroke={MOTOR} {...line} />
          <polyline points={points(f.glide)} stroke={GLIDE} {...line} />
          <polyline points={points(f.thermal)} stroke={LIFT} {...line} />
          <polyline points={points(f.out)} stroke={GLIDE} {...line} />
          <circle cx={home[0]} cy={home[1]} r="9" fill="#ffffff" />
          <circle cx={marker[0]} cy={marker[1]} r="11" fill="#ffffff" stroke="#0b2a35" strokeWidth="4" />
        </svg>
        <div style={{ position: "absolute", left: 0, right: 0, top: 46, display: "flex", justifyContent: "center", alignItems: "center", gap: 20 }}>
          <svg width="84" height="84" viewBox="0 0 64 64">
            <rect width="64" height="64" rx="14" fill="#ffffff" />
            <path d="M12 46H21L27 37L32 40L39 27L44 30L51 17" fill="none" stroke="#0d6a83" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="51" cy="17" r="5" fill="#0d6a83" />
          </svg>
          {/* The built-in font has no bold, so the two halves of the name differ in colour. */}
          <div style={{ display: "flex", fontSize: 76, letterSpacing: -1 }}>
            <span>TLM</span>
            <span style={{ color: "#8fd3e6", marginLeft: -14 }}>scope</span>
          </div>
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 30, display: "flex", justifyContent: "center", fontSize: 27, fontWeight: 600 }}>
          {tagline}
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
