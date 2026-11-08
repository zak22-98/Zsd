// Géographie stylisée de la Suisse : contour, lacs, relief et parcours.
// Coordonnées en (longitude, latitude), converties en km puis en unités du décor.
import { clamp, fbm, lerp, ridged, smoothstep } from "./noise";

type LL = [number, number];
type P = [number, number];

const LON0 = 8.23;
const LAT0 = 46.8;
const KX = 111.32 * Math.cos((LAT0 * Math.PI) / 180);
const KY = 111.2;

/** Unités du décor par km (la carte est posée sur la table). */
export const S = 0.145;
/** Exagération verticale du relief (comme une maquette de relief). */
export const V = 5;
export const MAP = { cx: 0, cz: 16, w: 58, d: 40 };

export const llToKm = ([lon, lat]: LL): P => [(lon - LON0) * KX, (lat - LAT0) * KY];
export const kmToWorld = ([x, y]: P): P => [MAP.cx + x * S, MAP.cz - y * S];
export const worldToKm = (wx: number, wz: number): P => [(wx - MAP.cx) / S, (MAP.cz - wz) / S];
export const llToWorld = (ll: LL) => kmToWorld(llToKm(ll));

// Contour de la Suisse, simplifié (aucune frontière voisine n'est dessinée).
const CH_LL: LL[] = [
  [9.59, 47.53], [9.63, 47.35], [9.48, 47.1], [9.93, 46.92], [10.44, 46.89],
  [10.36, 46.48], [9.92, 46.31], [9.18, 46.44], [8.97, 46.04], [8.49, 46.01],
  [8.32, 46.16], [7.76, 45.82], [7.27, 45.78], [7.04, 45.92], [6.79, 46.16],
  [6.81, 46.39], [6.52, 46.45], [6.24, 46.3], [6.31, 46.25], [6.24, 46.18],
  [6.12, 46.14], [5.96, 46.14], [5.97, 46.21], [6.07, 46.24], [6.1, 46.31],
  [6.12, 46.4], [6.13, 46.56], [6.43, 46.76], [6.47, 46.96], [6.73, 47.08],
  [6.94, 47.29], [6.98, 47.45], [7.13, 47.5], [7.2, 47.44], [7.47, 47.62],
  [8.32, 47.61], [8.52, 47.83], [8.85, 47.7], [9.18, 47.66],
];

const LEMAN_LL: LL[] = [
  [6.155, 46.205], [6.17, 46.25], [6.2, 46.3], [6.25, 46.37], [6.3, 46.42],
  [6.36, 46.455], [6.46, 46.47], [6.52, 46.497], [6.6, 46.503], [6.66, 46.5],
  [6.75, 46.478], [6.85, 46.452], [6.9, 46.43], [6.93, 46.4], [6.88, 46.385],
  [6.8, 46.39], [6.7, 46.405], [6.6, 46.4], [6.5, 46.385], [6.42, 46.37],
  [6.33, 46.37], [6.28, 46.33], [6.22, 46.27], [6.17, 46.21],
];

const ellipse = (c: LL, lenKm: number, widKm: number, angDeg: number, n = 20): P[] => {
  const [cx, cy] = llToKm(c);
  const a = (angDeg * Math.PI) / 180;
  return Array.from({ length: n }, (_, i) => {
    const t = (i / n) * Math.PI * 2;
    const x = (Math.cos(t) * lenKm) / 2;
    const y = (Math.sin(t) * widKm) / 2;
    return [cx + x * Math.cos(a) - y * Math.sin(a), cy + x * Math.sin(a) + y * Math.cos(a)];
  });
};

export const CH: P[] = CH_LL.map(llToKm);
export const LAKES: P[][] = [
  LEMAN_LL.map(llToKm),
  ellipse([6.84, 46.89], 38, 7, 38), // Neuchâtel
  ellipse([7.06, 46.93], 9, 2.5, 35), // Morat
  ellipse([8.17, 47.07], 22, 5, 15), // Quatre-Cantons (stylisé)
  ellipse([8.45, 47.0], 14, 3.4, -20),
  ellipse([8.7, 47.29], 28, 3.4, -38), // Zurich
  ellipse([7.74, 46.69], 17, 3.2, -22), // Thoune
  ellipse([7.97, 46.73], 13, 2.6, 18), // Brienz
  ellipse([8.85, 46.08], 26, 3.5, 75), // Majeur (partie suisse)
  ellipse([8.98, 45.99], 14, 2.2, 30), // Lugano
];
export const LAKE_LEVEL_KM = 0.4;

// Parcours de 100 km, entièrement en Suisse, jusqu'à la place des Nations.
// HYPOTHÈSE : rive nord du Léman, de Vevey à Genève. Remplacer par le tracé réel.
export const ROUTE_LL: LL[] = [
  [6.843, 46.465], [6.81, 46.474], [6.796, 46.479], [6.76, 46.492], [6.729, 46.497],
  [6.687, 46.508], [6.655, 46.512], [6.627, 46.518], [6.59, 46.52], [6.559, 46.516],
  [6.53, 46.514], [6.498, 46.512], [6.459, 46.49], [6.43, 46.483], [6.398, 46.478],
  [6.338, 46.466], [6.3, 46.45], [6.27, 46.424], [6.239, 46.386], [6.215, 46.35],
  [6.192, 46.316], [6.162, 46.285], [6.15, 46.255], [6.14, 46.222],
];
export const ROUTE_KM: P[] = ROUTE_LL.map(llToKm);
export const GENEVE_LL: LL = [6.14, 46.222];

const ALPS_EDGE: P[] = (
  [
    [5.9, 46.25], [6.75, 46.4], [7.2, 46.62], [7.7, 46.72], [8.2, 46.86],
    [8.7, 47.0], [9.2, 47.16], [9.7, 47.3], [10.6, 47.4],
  ] as LL[]
).map(llToKm);
const RHONE: P[] = (
  [
    [6.93, 46.39], [6.97, 46.24], [7.07, 46.11], [7.36, 46.23], [7.65, 46.3],
    [7.99, 46.31], [8.3, 46.52],
  ] as LL[]
).map(llToKm);
const JURA: P[] = (
  [
    [5.95, 46.27], [6.12, 46.47], [6.45, 46.78], [6.85, 47.05], [7.25, 47.3],
    [7.7, 47.4], [8.3, 47.53],
  ] as LL[]
).map(llToKm);

// --- géométrie plane -------------------------------------------------------
const segDist = (px: number, py: number, a: P, b: P) => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const t = clamp(((px - a[0]) * dx + (py - a[1]) * dy) / (dx * dx + dy * dy || 1));
  const x = a[0] + t * dx - px;
  const y = a[1] + t * dy - py;
  return Math.sqrt(x * x + y * y);
};
export const polylineDist = (px: number, py: number, pts: P[]) => {
  let d = Infinity;
  for (let i = 0; i < pts.length - 1; i++) d = Math.min(d, segDist(px, py, pts[i], pts[i + 1]));
  return d;
};
const inPoly = (px: number, py: number, poly: P[]) => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
/** Distance signée (km), positive à l'intérieur. */
export const signedDist = (px: number, py: number, poly: P[]) => {
  let d = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++)
    d = Math.min(d, segDist(px, py, poly[j], poly[i]));
  return inPoly(px, py, poly) ? d : -d;
};
const curveY = (x: number, pts: P[]) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    if (x <= bx) return lerp(ay, by, (x - ax) / (bx - ax));
  }
  return pts[pts.length - 1][1];
};

export type Ground = { h: number; mask: number; lake: number; alps: number };

/** Relief en km au point (x, y) exprimé en km. */
export const ground = (x: number, y: number): Ground => {
  const inside = signedDist(x, y, CH);
  const mask = smoothstep(-2, 5, inside);
  const plateau = 0.48 + 0.14 * fbm(x / 45, y / 45, 3) + 0.07 * fbm(x / 11 + 3, y / 11, 3);

  const dS = curveY(x, ALPS_EDGE) - y; // positif au sud de la bordure alpine
  const alps = smoothstep(-6, 26, dS);
  const r1 = ridged(x / 38 + 4.2, y / 38 - 1.3, 4);
  const r2 = ridged(x / 13 - 7.1, y / 13 + 2.2, 3);
  const env = smoothstep(-2, 40, dS) * (0.75 + 0.45 * fbm(x / 70 + 9, y / 70, 2));
  let alpsH = alps * (0.55 + 2.9 * r1 * env + 0.45 * r2 * alps);
  const dR = polylineDist(x, y, RHONE);
  alpsH *= 1 - 0.78 * Math.exp(-((dR / 4.5) ** 2));

  const dJ = polylineDist(x, y, JURA);
  const J = Math.exp(-((dJ / 15) ** 2));
  const folds = 0.5 + 0.5 * Math.cos((dJ * 2 * Math.PI) / 7.5 + fbm(x / 30, y / 30, 2));
  const juraH = J * (0.3 + 0.75 * folds) * (1 - alps);

  let h = mask * (plateau + juraH + alpsH);

  let lake = 0;
  let near = -Infinity;
  for (const L of LAKES) near = Math.max(near, signedDist(x, y, L));
  if (near > -6) {
    const shore = smoothstep(-0.2, -5.5, near); // 0 dans le lac, 1 à 5,5 km
    lake = 1 - smoothstep(-0.6, 0.6, -near);
    h = lerp(LAKE_LEVEL_KM - 0.22, Math.max(h, LAKE_LEVEL_KM + 0.04), shore);
    if (near > 0) h = LAKE_LEVEL_KM - 0.22;
  }
  return { h, mask, lake, alps };
};

/** Hauteur en unités du décor, relief entièrement soulevé. */
export const groundWorldY = (x: number, y: number) => ground(x, y).h * S * V;

export const routeDistKm = (x: number, y: number) => polylineDist(x, y, ROUTE_KM);

/** Points du parcours rééchantillonnés régulièrement (km). */
export const routeSamples = (n: number): P[] => {
  const segs: number[] = [];
  let total = 0;
  for (let i = 0; i < ROUTE_KM.length - 1; i++) {
    const [a, b] = [ROUTE_KM[i], ROUTE_KM[i + 1]];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    segs.push(l);
    total += l;
  }
  const out: P[] = [];
  for (let k = 0; k < n; k++) {
    let d = (k / (n - 1)) * total;
    let i = 0;
    while (i < segs.length - 1 && d > segs[i]) d -= segs[i++];
    const t = clamp(d / segs[i]);
    const [a, b] = [ROUTE_KM[i], ROUTE_KM[i + 1]];
    out.push([lerp(a[0], b[0], t), lerp(a[1], b[1], t)]);
  }
  return out;
};

export const CITIES: { name: string; ll: LL }[] = [
  { name: "Genève", ll: [6.143, 46.204] },
  { name: "Lausanne", ll: [6.633, 46.52] },
  { name: "Neuchâtel", ll: [6.93, 46.99] },
  { name: "Fribourg", ll: [7.16, 46.8] },
  { name: "Berne", ll: [7.447, 46.948] },
  { name: "Bâle", ll: [7.588, 47.56] },
  { name: "Lucerne", ll: [8.31, 47.05] },
  { name: "Zurich", ll: [8.54, 47.376] },
  { name: "Saint-Gall", ll: [9.377, 47.424] },
  { name: "Coire", ll: [9.53, 46.85] },
  { name: "Sion", ll: [7.36, 46.233] },
  { name: "Lugano", ll: [8.95, 46.005] },
];
