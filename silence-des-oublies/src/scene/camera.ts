// Trajectoire de caméra « drone » : orbites lentes sur les maquettes, puis une
// seule spline continue (vitesse continue) du recul jusqu'à la Broken Chair.
import * as THREE from "three";
import { routeSamples, kmToWorld, groundWorldY } from "../lib/geo";
import { clamp, easeInOutSine, lerp } from "../lib/noise";
import { T, shotStart } from "../timeline";
import { DIORAMA_POS } from "./dioramas";

export type Pose = { pos: THREE.Vector3; target: THREE.Vector3; fov: number; fog: number };
type Key = { t: number; pos: THREE.Vector3; target: THREE.Vector3; fov: number; fog: number };
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// --- Parcours complet (relief soulevé) --------------------------------------
let _route: THREE.CatmullRomCurve3 | null = null;
export const ROUTE_LIFT = 0.05;
export const fullRouteCurve = () => {
  if (_route) return _route;
  const pts = routeSamples(140).map(([x, y]) => {
    const [wx, wz] = kmToWorld([x, y]);
    return v3(wx, groundWorldY(x, y) + ROUTE_LIFT, wz);
  });
  _route = new THREE.CatmullRomCurve3(pts, false, "centripetal");
  return _route;
};

/** Avancement de la ligne braise (0 → 1) et donc du compteur. */
export const routeProgress = (t: number) => {
  const k = clamp((t - T.route[0]) / (T.route[1] - T.route[0]));
  return 0.72 * k + 0.28 * easeInOutSine(k);
};

const routeDir = (p: number) => {
  const c = fullRouteCurve();
  const a = c.getPointAt(clamp(p - 0.025));
  const b = c.getPointAt(clamp(p + 0.025));
  const d = b.sub(a);
  d.y = 0;
  return d.normalize();
};

export const chairPlacement = () => {
  const c = fullRouteCurve();
  const end = c.getPointAt(1);
  const d = routeDir(0.985);
  const pos = end.clone().addScaledVector(d, 0.42);
  pos.y = end.y - ROUTE_LIFT;
  return { pos, dir: d };
};

const followPose = (p: number): Omit<Key, "t"> => {
  const H = fullRouteCurve().getPointAt(p);
  const d = routeDir(p);
  const side = v3(d.z, 0, -d.x);
  return {
    pos: H.clone().addScaledVector(d, -3.6).addScaledVector(side, 1.2).add(v3(0, 2.4, 0)),
    target: H.clone().addScaledVector(d, 2.6).add(v3(0, -0.2, 0)),
    fov: 38,
    fog: 0.04,
  };
};

const chairPose = (k: number): Omit<Key, "t"> => {
  const { pos: C, dir } = chairPlacement();
  const phi0 = Math.atan2(-dir.x, -dir.z);
  const phi = phi0 + lerp(0.05, 0.85, k);
  const r = lerp(3.0, 1.9, k);
  const h = lerp(1.4, 0.45, k);
  return {
    pos: C.clone().add(v3(Math.sin(phi) * r, h, Math.cos(phi) * r)),
    target: C.clone().add(v3(0, lerp(0.45, 0.62, k), 0)),
    fov: 36,
    fog: lerp(0.07, 0.11, k),
  };
};

// --- Plans des maquettes -------------------------------------------------------
const SHOTS = [
  { a: [-0.55, -0.2], r: [15, 12.5], h: [8.5, 7.0], ty: 1.0 },
  { a: [0.45, 0.12], r: [14, 12], h: [6.6, 6.0], ty: 1.6 },
  { a: [-0.25, 0.12], r: [15.5, 13], h: [11, 9], ty: 1.4 },
  { a: [0.55, 0.2], r: [14.5, 12.5], h: [5.5, 7.2], ty: 2.4 },
];
const shotPose = (i: number, k: number): Omit<Key, "t"> => {
  const s = SHOTS[i];
  const kk = 0.8 * k + 0.2 * easeInOutSine(k);
  const [cx, cy, cz] = DIORAMA_POS[i];
  const a = lerp(s.a[0], s.a[1], kk);
  const r = lerp(s.r[0], s.r[1], kk);
  return {
    pos: v3(cx + Math.sin(a) * r, cy + lerp(s.h[0], s.h[1], kk), cz + Math.cos(a) * r),
    target: v3(cx, cy + s.ty, cz),
    fov: 35,
    fog: 0.042,
  };
};

// --- Spline continue --------------------------------------------------------
const KEYS: Key[] = (() => {
  const k = (t: number, p: Omit<Key, "t">): Key => ({ t, ...p });
  const raw = (t: number, pos: number[], target: number[], fov: number, fog: number): Key => ({
    t,
    pos: v3(pos[0], pos[1], pos[2]),
    target: v3(target[0], target[1], target[2]),
    fov,
    fog,
  });
  const y0 = shotStart(3);
  const keys: Key[] = [
    k(y0, shotPose(3, 0)),
    k(y0 + 2.25, shotPose(3, 0.5)),
    k(y0 + 4.5, shotPose(3, 1)),
    raw(27.6, [47, 21, 8], [40, 3, -20], 35, 0.016),
    raw(30.6, [22, 32, 58], [11, 1, -15], 34, 0.009),
    raw(33.5, [0, 33, 100], [0, 1, -12], 34, 0.0055),
    raw(36.2, [-3, 33, 78], [-4, 0, 6], 33, 0.007),
    raw(38.6, [-9, 19, 52], [-16, 0, 20], 33, 0.012),
    raw(41.0, [-11, 8.8, 37.5], [-19, 0.3, 23.3], 34, 0.02),
    raw(43.0, [-13.5, 6.8, 34], [-19.5, 0.3, 23.5], 34, 0.022),
    raw(46.4, [-7, 12.5, 40], [-13, 0.8, 20], 35, 0.02),
    raw(48.8, [-2, 23, 45], [-5, 0.5, 13], 35, 0.014),
  ];
  for (const t of [51.0, 52.4, 53.8, 55.2, 56.6, 58.0]) keys.push(k(t, followPose(routeProgress(t))));
  keys.push(k(59.5, chairPose(0.3)));
  keys.push(k(61.3, chairPose(0.66)));
  keys.push(k(63.2, chairPose(1)));
  return keys;
})();

const hermite = (p0: number, p1: number, m0: number, m1: number, u: number) => {
  const u2 = u * u;
  const u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * p0 + (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) * p1 + (u3 - u2) * m1;
};

const splineAt = (t: number): Omit<Key, "t"> => {
  const n = KEYS.length;
  if (t <= KEYS[0].t) return KEYS[0];
  if (t >= KEYS[n - 1].t) return KEYS[n - 1];
  let i = 0;
  while (KEYS[i + 1].t < t) i++;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const dt = b.t - a.t;
  const u = (t - a.t) / dt;
  const slope = (j: number, get: (k: Key) => number) => {
    if (j <= 0 || j >= n - 1) return 0;
    return (get(KEYS[j + 1]) - get(KEYS[j - 1])) / (KEYS[j + 1].t - KEYS[j - 1].t);
  };
  const interp = (get: (k: Key) => number) =>
    hermite(get(a), get(b), slope(i, get) * dt, slope(i + 1, get) * dt, u);
  return {
    pos: v3(interp((k) => k.pos.x), interp((k) => k.pos.y), interp((k) => k.pos.z)),
    target: v3(interp((k) => k.target.x), interp((k) => k.target.y), interp((k) => k.target.z)),
    fov: interp((k) => k.fov),
    fog: Math.max(0.003, interp((k) => k.fog)),
  };
};

export const cameraPose = (t: number): Pose => {
  let p: Omit<Key, "t">;
  if (t < shotStart(3)) {
    const i = clamp(Math.floor((t - T.maquettesStart) / T.maquetteLen), 0, 2);
    p = shotPose(i, clamp((t - shotStart(i)) / T.maquetteLen));
  } else {
    p = splineAt(t);
  }
  // léger flottement de drone
  const dist = p.pos.distanceTo(p.target);
  const w = 0.004 * dist;
  const pos = p.pos.clone().add(
    v3(Math.sin(t * 0.71) * w, Math.sin(t * 0.93 + 1) * w * 0.8, Math.cos(t * 0.57) * w),
  );
  return { pos, target: p.target, fov: p.fov, fog: p.fog };
};
