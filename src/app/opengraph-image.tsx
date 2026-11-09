import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "TLMscope: a flight path in 3D over a ground grid, coloured by motor climb, glide and thermal, next to the TLMscope logo.";
export const dynamic = "force-static";

// Phase colours as in the app (light theme).
const MOTOR = "#eb6834";
const GLIDE = "#3987e5";
const LIFT = "#1baf7a";

type P = [number, number, number];

/** Oblique view of a ground plane: x to the right and away, y to the left and away, z up. */
const project = ([x, y, z]: P): [number, number] => [300 + (x - y) * 0.87 * 1.55, 400 + (x + y) * 0.5 * 1.55 - z * 1.9];
const points = (ps: P[]) => ps.map((p) => project(p).map((v) => v.toFixed(1)).join(",")).join(" ");
const ground = (ps: P[]): P[] => ps.map(([x, y]) => [x, y, 0]);

/** A small synthetic flight: motor climb, glide, a thermal spiral, glide out. */
function flight() {
  const climb: P[] = [];
  for (let k = 0; k <= 20; k++) climb.push([-60 + k * 4, 40 - k * 1.5, k * 4.5]);
  const glide: P[] = [];
  const [gx, gy, gz] = climb[climb.length - 1];
  for (let k = 0; k <= 40; k++) {
    const t = k / 40;
    glide.push([gx + 60 * t, gy - 40 * Math.sin(t * Math.PI) + 30 * t, gz - 25 * t]);
  }
  const thermal: P[] = [];
  const [tx, ty, tz] = glide[glide.length - 1];
  const r = 22;
  for (let k = 0; k <= 120; k++) {
    const a = (k / 120) * 4 * Math.PI;
    thermal.push([tx - r + r * Math.cos(a), ty + r * Math.sin(a), tz + k * 0.62]);
  }
  const out: P[] = [];
  const [ox, oy, oz] = thermal[thermal.length - 1];
  for (let k = 0; k <= 40; k++) {
    const t = k / 40;
    out.push([ox - 70 * t, oy - 60 * t + 25 * Math.sin(t * Math.PI), oz - 30 * t]);
  }
  return { climb, glide, thermal, out };
}

/** Preview image for links shared on social networks and in messengers. */
export default function OpengraphImage() {
  const f = flight();
  const all = [...f.climb, ...f.glide, ...f.thermal, ...f.out];
  const grid: [P, P][] = [];
  for (let k = -100; k <= 100; k += 25) {
    grid.push([[k, -100, 0], [k, 100, 0]], [[-100, k, 0], [100, k, 0]]);
  }
  const marker = project(f.out[f.out.length - 1]);
  const home = project(f.climb[0]);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "linear-gradient(135deg, #0b2a35 0%, #0d6a83 100%)", color: "#ffffff", fontFamily: "sans-serif" }}>
        <div style={{ width: 560, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 0 0 72px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
            <svg width="96" height="96" viewBox="0 0 64 64">
              <rect width="64" height="64" rx="14" fill="#ffffff" />
              <path d="M12 46H21L27 37L32 40L39 27L44 30L51 17" fill="none" stroke="#0d6a83" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="51" cy="17" r="5" fill="#0d6a83" />
            </svg>
            {/* The built-in font has no bold, so the two halves of the name differ in colour. */}
            <div style={{ display: "flex", fontSize: 80, letterSpacing: -1 }}>
              <span>TLM</span>
              <span style={{ color: "#8fd3e6", marginLeft: -14 }}>scope</span>
            </div>
          </div>
          <div style={{ display: "flex", marginTop: 34, fontSize: 40, lineHeight: 1.25, fontWeight: 600 }}>
            See what happened during your RC flights.
          </div>
          <div style={{ display: "flex", marginTop: 22, fontSize: 27, lineHeight: 1.4, color: "#cfe3ea" }}>
            Spektrum telemetry logs in your browser: summaries, charts, map and 3D replay. Free, nothing uploaded.
          </div>
        </div>
        <svg width="640" height="630" viewBox="0 0 640 630">
          {grid.map(([a, b], k) => {
            const [x1, y1] = project(a), [x2, y2] = project(b);
            return <line key={k} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ffffff" strokeOpacity="0.16" strokeWidth="1.5" />;
          })}
          <polyline points={points(ground(all))} fill="none" stroke="#000000" strokeOpacity="0.28" strokeWidth="3" strokeLinejoin="round" />
          <polyline points={points(f.climb)} fill="none" stroke={MOTOR} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points={points(f.glide)} fill="none" stroke={GLIDE} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points={points(f.thermal)} fill="none" stroke={LIFT} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points={points(f.out)} fill="none" stroke={GLIDE} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={home[0]} cy={home[1]} r="9" fill="#ffffff" />
          <circle cx={marker[0]} cy={marker[1]} r="11" fill="#ffffff" stroke="#0b2a35" strokeWidth="4" />
        </svg>
      </div>
    ),
    size,
  );
}
