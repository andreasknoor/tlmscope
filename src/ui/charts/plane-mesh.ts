/**
 * A small low-poly model aircraft for the replay, built in code (no model file to load).
 * Units: wingspan = 1. Nose along +x, left wing along +y, up along +z, which is the frame
 * deck.gl's SimpleMeshLayer rotates with [pitch, yaw, roll].
 */

type V = [number, number, number];

const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a: V): V => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

/** Convex part given by its corners and its faces (corner indices, any winding). */
interface Part { corners: V[]; faces: number[][] }

/** Box with its x range at the bottom/top scaled by `taper` towards `x1` (for a pointed nose or tail). */
function box(x0: number, x1: number, y: number, z0: number, z1: number, tail = 1, nose = 1, dz = 0): Part {
  const c: V[] = [];
  for (const x of [x0, x1]) {
    const s = x === x0 ? tail : nose;
    for (const [yy, zz] of [[-y, z0], [y, z0], [y, z1], [-y, z1]] as [number, number][]) c.push([x, yy * s, (zz - (z0 + z1) / 2) * s + (z0 + z1) / 2 + (x === x0 ? dz : 0)]);
  }
  return { corners: c, faces: [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]] };
}

/** Flat plate: a wing or tail surface, given by its outline in the x–y plane at height z. */
function plate(outline: [number, number][], z: number, thick: number): Part {
  const n = outline.length;
  const corners: V[] = [...outline.map(([x, y]): V => [x, y, z - thick / 2]), ...outline.map(([x, y]): V => [x, y, z + thick / 2])];
  const faces = [[...Array(n).keys()], [...Array(n).keys()].map((i) => i + n)];
  for (let i = 0; i < n; i++) faces.push([i, (i + 1) % n, ((i + 1) % n) + n, i + n]);
  return { corners, faces };
}

/** Fin: a plate standing upright in the x–z plane. */
function fin(outline: [number, number][], thick: number): Part {
  const p = plate(outline, 0, thick);
  return { corners: p.corners.map(([x, z, y]): V => [x, y, z]), faces: p.faces };
}

const PARTS: Part[] = [
  // Fuselage: square section, pointed towards nose and tail.
  box(-0.12, 0.3, 0.035, -0.035, 0.04, 1, 0.45),
  box(-0.5, -0.12, 0.035, -0.035, 0.04, 0.3, 1, 0.025),
  // Wing with a little taper, slightly above the fuselage centre.
  plate([[0.13, 0], [0.12, 0.5], [0.05, 0.5], [0.0, 0], [0.05, -0.5], [0.12, -0.5]], 0.035, 0.018),
  // Tail plane and fin.
  plate([[-0.38, 0], [-0.41, 0.17], [-0.47, 0.17], [-0.49, 0], [-0.47, -0.17], [-0.41, -0.17]], 0.045, 0.012),
  fin([[-0.38, 0.04], [-0.44, 0.19], [-0.5, 0.19], [-0.5, 0.04]], 0.012),
];

/** Triangle list with flat normals pointing outwards, in the shape SimpleMeshLayer accepts. */
export function planeMesh() {
  const positions: number[] = [];
  const normals: number[] = [];
  for (const { corners, faces } of PARTS) {
    const centre = corners.reduce<V>((s, c) => [s[0] + c[0] / corners.length, s[1] + c[1] / corners.length, s[2] + c[2] / corners.length], [0, 0, 0]);
    for (const f of faces) {
      const p = f.map((i) => corners[i]);
      const mid = p.reduce<V>((s, c) => [s[0] + c[0] / p.length, s[1] + c[1] / p.length, s[2] + c[2] / p.length], [0, 0, 0]);
      let nrm = norm(cross(sub(p[1], p[0]), sub(p[2], p[0])));
      if (dot(nrm, sub(mid, centre)) < 0) nrm = [-nrm[0], -nrm[1], -nrm[2]];
      for (let k = 1; k < p.length - 1; k++) {
        for (const q of [p[0], p[k], p[k + 1]]) { positions.push(...q); normals.push(...nrm); }
      }
    }
  }
  return {
    positions: { value: new Float32Array(positions), size: 3 },
    normals: { value: new Float32Array(normals), size: 3 },
  };
}
