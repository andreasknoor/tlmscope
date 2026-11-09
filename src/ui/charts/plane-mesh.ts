/**
 * Small low-poly models for the replay (aircraft, stork), built in code: no model files to load.
 * Units: wingspan = 1. Nose along +x, left wing along +y, up along +z, which is the frame
 * deck.gl's SimpleMeshLayer rotates with [pitch, yaw, roll].
 */

export type V = [number, number, number];

const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a: V): V => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

/** Convex part given by its corners and its faces (corner indices, any winding), with a colour (0…1). */
export interface Part { corners: V[]; faces: number[][]; color?: V }

/**
 * Box from x0 (back) to x1 (front). The back and front ends are scaled by `back` / `front`
 * around the centre line (for a pointed nose or tail); `lift` raises the back end.
 */
export function box(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, back = 1, front = 1, lift = 0): Part {
  const cy = (y0 + y1) / 2, cz = (z0 + z1) / 2;
  const c: V[] = [];
  for (const x of [x0, x1]) {
    const s = x === x0 ? back : front;
    for (const [yy, zz] of [[y0, z0], [y1, z0], [y1, z1], [y0, z1]] as [number, number][]) {
      c.push([x, cy + (yy - cy) * s, cz + (zz - cz) * s + (x === x0 ? lift : 0)]);
    }
  }
  return { corners: c, faces: [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]] };
}

/** Flat plate: a wing or tail surface, given by its convex outline in the x–y plane at height z. */
export function plate(outline: [number, number][], z: number, thick: number): Part {
  const n = outline.length;
  const corners: V[] = [...outline.map(([x, y]): V => [x, y, z - thick / 2]), ...outline.map(([x, y]): V => [x, y, z + thick / 2])];
  const faces = [[...Array(n).keys()], [...Array(n).keys()].map((i) => i + n)];
  for (let i = 0; i < n; i++) faces.push([i, (i + 1) % n, ((i + 1) % n) + n, i + n]);
  return { corners, faces };
}

/** Fin: a plate standing upright in the x–z plane. */
export function fin(outline: [number, number][], thick: number): Part {
  const p = plate(outline, 0, thick);
  return { corners: p.corners.map(([x, z, y]): V => [x, y, z]), faces: p.faces };
}

/** Mirror a part to the other side (y → −y). */
export const mirror = (p: Part): Part => ({ ...p, corners: p.corners.map(([x, y, z]): V => [x, -y, z]) });
export const paint = (p: Part, color: V): Part => ({ ...p, color });

/** Triangle list with flat normals pointing outwards and colours, in the shape SimpleMeshLayer accepts. */
export function buildMesh(parts: Part[]) {
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  for (const { corners, faces, color = [1, 1, 1] } of parts) {
    const centre = corners.reduce<V>((s, c) => [s[0] + c[0] / corners.length, s[1] + c[1] / corners.length, s[2] + c[2] / corners.length], [0, 0, 0]);
    for (const f of faces) {
      const p = f.map((i) => corners[i]);
      const mid = p.reduce<V>((s, c) => [s[0] + c[0] / p.length, s[1] + c[1] / p.length, s[2] + c[2] / p.length], [0, 0, 0]);
      let nrm = norm(cross(sub(p[1], p[0]), sub(p[2], p[0])));
      if (dot(nrm, sub(mid, centre)) < 0) nrm = [-nrm[0], -nrm[1], -nrm[2]];
      for (let k = 1; k < p.length - 1; k++) {
        for (const q of [p[0], p[k], p[k + 1]]) { positions.push(...q); normals.push(...nrm); colors.push(...color); }
      }
    }
  }
  return {
    positions: { value: new Float32Array(positions), size: 3 },
    normals: { value: new Float32Array(normals), size: 3 },
    colors: { value: new Float32Array(colors), size: 3 },
  };
}

export type Mesh = ReturnType<typeof buildMesh>;

/** Model aircraft: fuselage pointed at both ends, tapered wing, tail plane and fin. */
export function planeMesh(): Mesh {
  return buildMesh([
    box(-0.12, 0.3, -0.035, 0.035, -0.035, 0.04, 1, 0.45),
    box(-0.5, -0.12, -0.035, 0.035, -0.035, 0.04, 0.3, 1, 0.025),
    plate([[0.13, 0], [0.12, 0.5], [0.05, 0.5], [0.0, 0], [0.05, -0.5], [0.12, -0.5]], 0.035, 0.018),
    plate([[-0.38, 0], [-0.41, 0.17], [-0.47, 0.17], [-0.49, 0], [-0.47, -0.17], [-0.41, -0.17]], 0.045, 0.012),
    fin([[-0.38, 0.04], [-0.44, 0.19], [-0.5, 0.19], [-0.5, 0.04]], 0.012),
  ]);
}

const WHITE: V = [0.97, 0.97, 0.95];
const BLACK: V = [0.1, 0.1, 0.12];
const RED: V = [0.86, 0.22, 0.14];

/** Where the stork's wings join the body (left side; the right one is mirrored). */
export const STORK_SHOULDER: V = [0.03, 0.05, 0.03];

/**
 * White stork, in three meshes so the wings can flap: body (with neck, red beak and legs
 * trailing behind) and the two wings, each with its shoulder at the origin.
 * Inner wing white, outer wing (flight feathers) black.
 */
export function storkMeshes(): { body: Mesh; left: Mesh; right: Mesh } {
  const wing: Part[] = [
    paint(plate([[0.07, 0], [0.07, 0.24], [-0.07, 0.24], [-0.06, 0]], 0, 0.014), WHITE),
    paint(plate([[0.07, 0.24], [0.04, 0.47], [-0.02, 0.5], [-0.09, 0.44], [-0.07, 0.24]], 0, 0.012), BLACK),
  ];
  return {
    body: buildMesh([
      paint(box(-0.13, 0.12, -0.06, 0.06, -0.05, 0.055, 0.55, 0.8), WHITE),
      paint(plate([[-0.12, 0], [-0.2, 0.05], [-0.23, 0], [-0.2, -0.05]], 0.01, 0.012), WHITE),
      paint(box(0.11, 0.31, -0.022, 0.022, -0.012, 0.03, 1, 0.85), WHITE),
      paint(box(0.29, 0.37, -0.035, 0.035, -0.015, 0.045), WHITE),
      paint(box(0.37, 0.53, -0.012, 0.012, -0.004, 0.02, 1, 0.25), RED),
      // Eyes, a little larger than life so they show at map scale: a white ring with a black pupil on each side.
      ...[1, -1].flatMap((side) => [
        paint(box(0.312, 0.352, side * 0.034, side * 0.039, 0.004, 0.04), WHITE),
        paint(box(0.322, 0.346, side * 0.038, side * 0.043, 0.011, 0.033), BLACK),
      ]),
      paint(box(-0.45, -0.1, 0.017, 0.031, -0.04, -0.028, 0.7, 1), RED),
      paint(box(-0.45, -0.1, -0.031, -0.017, -0.04, -0.028, 0.7, 1), RED),
    ]),
    left: buildMesh(wing),
    right: buildMesh(wing.map(mirror)),
  };
}
