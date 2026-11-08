// Les quatre maquettes de cendre. Aucune figure humaine, aucune arme, aucun drapeau :
// seulement des lieux, évoqués, et une braise qui finit par s'éteindre.
import * as THREE from "three";
import { fbm, mulberry32, simplex, smoothstep } from "../lib/noise";
import { box, clayPart, cyl, groundDisk, lump, merge } from "./kit";

export type Diorama = {
  clay: THREE.BufferGeometry;
  water?: { y: number };
  embers: { p: [number, number, number]; s: [number, number, number] }[];
  light: [number, number, number];
};

const R = 8;
const groundTone = (base: number) => (x: number, z: number, h: number) =>
  base * (0.85 + 0.25 * (0.5 + 0.5 * fbm(x * 0.6, z * 0.6, 3))) * (0.9 + h * 0.03);

/** Pose une pièce sur le sol : y = hauteur minimale sous son emprise. */
const footY = (h: (x: number, z: number) => number, x: number, z: number, r: number) =>
  Math.min(h(x - r, z - r), h(x + r, z - r), h(x - r, z + r), h(x + r, z + r), h(x, z)) - 0.05;

// --- SOUDAN : village de terre crue dans les dunes ---------------------------
export const soudan = (): Diorama => {
  const rnd = mulberry32(11);
  const h = (x: number, z: number) =>
    0.25 + 0.38 * (0.5 + 0.5 * simplex(x * 0.16, z * 0.16)) + 0.12 * Math.sin(x * 0.55 + z * 0.3);
  const parts: THREE.BufferGeometry[] = [groundDisk(R, h, groundTone(0.36))];
  const embers: Diorama["embers"] = [];
  const houses: [number, number, number][] = [
    [-3.1, -1.2, 0.3], [-0.8, -3.4, -0.2], [1.8, -2.5, 0.15], [3.6, -0.3, -0.35],
    [-4.4, 2.0, 0.1], [-1.4, 1.1, 0.5], [2.1, 1.9, -0.1], [0.3, 4.3, 0.25],
  ];
  houses.forEach(([x, z, ry], i) => {
    const w = 1.3 + rnd() * 0.7;
    const d = 1.1 + rnd() * 0.7;
    const ht = 0.95 + rnd() * 0.4;
    const y = footY(h, x, z, w / 2);
    const tone = 0.52 + rnd() * 0.08;
    parts.push(clayPart(box(w, ht, d, x, y, z, ry), tone, 0.06, i + 1));
    // parapet
    const t = 0.1;
    const c = Math.cos(ry);
    const s = Math.sin(ry);
    const off = (lx: number, lz: number): [number, number] => [x + lx * c + lz * s, z - lx * s + lz * c];
    const [ax, az] = off(0, d / 2 - t / 2);
    const [bx, bz] = off(0, -d / 2 + t / 2);
    parts.push(clayPart(box(w, 0.18, t, ax, y + ht, az, ry), tone, 0.03, i + 30));
    parts.push(clayPart(box(w, 0.18, t, bx, y + ht, bz, ry), tone, 0.03, i + 40));
    // porte (sombre) sur la façade avant
    const [dx, dz] = off(w * 0.15, d / 2 + 0.01);
    if (i === 2) {
      embers.push({ p: [dx, y + 0.3, dz], s: [0.34, 0.56, 0.04] });
      // rotation de la porte ignorée volontairement : petite lueur
    } else {
      parts.push(clayPart(box(0.34, 0.56, 0.05, dx, y + 0.02, dz, ry, 1), 0.12, 0, i + 50));
    }
  });
  // tukuls (cases rondes à toit conique)
  [[-4.9, -2.8], [4.8, 2.9], [-2.6, 4.6]].forEach(([x, z], i) => {
    const y = footY(h, x, z, 0.7);
    parts.push(clayPart(cyl(0.72, 0.78, 0.85, x, y, z, 12), 0.5, 0.05, 60 + i));
    const cone = new THREE.ConeGeometry(1.05, 0.95, 12, 2);
    cone.translate(x, y + 0.85 + 0.47, z);
    parts.push(clayPart(cone, 0.44, 0.08, 70 + i, true));
  });
  // acacia mort
  {
    const [x, z] = [-5.5, 0.2];
    const y = h(x, z) - 0.05;
    const trunk = new THREE.CylinderGeometry(0.07, 0.14, 1.9, 7, 3);
    trunk.rotateZ(0.12);
    trunk.translate(x, y + 0.95, z);
    parts.push(clayPart(trunk, 0.38, 0.03, 80));
    for (let b = 0; b < 5; b++) {
      const br = new THREE.CylinderGeometry(0.025, 0.05, 0.9 + rnd() * 0.5, 5, 2);
      br.translate(0, 0.45, 0);
      br.rotateZ(0.6 + rnd() * 0.5);
      br.rotateY((b / 5) * Math.PI * 2 + rnd());
      br.translate(x + 0.1, y + 1.55 + rnd() * 0.3, z);
      parts.push(clayPart(br, 0.36, 0.02, 81 + b));
    }
  }
  // mur effondré
  for (let k = 0; k < 6; k++) {
    const x = 1.2 + k * 0.55;
    const z = 5.2 - k * 0.12;
    parts.push(clayPart(box(0.5, 0.25 + rnd() * 0.5, 0.18, x, h(x, z) - 0.05, z, 0.2), 0.5, 0.05, 90 + k));
  }
  // foyer
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2;
    const x = 0.6 + Math.cos(a) * 0.32;
    const z = -0.6 + Math.sin(a) * 0.32;
    parts.push(clayPart(lump(0.09, x, h(x, z), z), 0.34, 0.02, 100 + k));
  }
  embers.push({ p: [0.6, h(0.6, -0.6) + 0.06, -0.6], s: [0.28, 0.06, 0.28] });
  return { clay: merge(parts), embers, light: [0.8, 1.6, -0.2] };
};

// --- RDC : collines de forêt, rivière, cases ---------------------------------
export const rdc = (): Diorama => {
  const rnd = mulberry32(22);
  const riverZ = (x: number) => 1.6 * Math.sin(x * 0.33 + 0.4) - 0.3;
  const clearing: [number, number] = [2.4, -3.6];
  const hills = (x: number, z: number) =>
    0.35 + 1.5 * Math.max(0, 0.35 + fbm(x * 0.11 + 3, z * 0.11, 3)) - 0.6 * Math.exp(-((x - clearing[0]) ** 2 + (z - clearing[1]) ** 2) / 6);
  const h = (x: number, z: number) => {
    const dr = Math.abs(z - riverZ(x));
    return Math.max(0.05, hills(x, z) * smoothstep(0.5, 1.9, dr) + 0.05);
  };
  const parts: THREE.BufferGeometry[] = [groundDisk(R, h, groundTone(0.34), 48, 160)];
  let placed = 0;
  for (let k = 0; k < 400 && placed < 78; k++) {
    const a = rnd() * Math.PI * 2;
    const rr = Math.sqrt(rnd()) * (R - 0.6);
    const x = Math.cos(a) * rr;
    const z = Math.sin(a) * rr;
    if (Math.abs(z - riverZ(x)) < 1.5) continue;
    if (Math.hypot(x - clearing[0], z - clearing[1]) < 2.3) continue;
    const y = h(x, z) - 0.05;
    const th = 0.5 + rnd() * 0.9;
    parts.push(clayPart(cyl(0.05, 0.08, th, x, y, z, 5), 0.3, 0.02, 200 + k));
    const n = 2 + Math.floor(rnd() * 3);
    for (let c = 0; c < n; c++) {
      const r = 0.38 + rnd() * 0.42;
      parts.push(
        clayPart(
          lump(r, x + (rnd() - 0.5) * 0.5, y + th + r * 0.6 + c * 0.25, z + (rnd() - 0.5) * 0.5, 1, 0.85, 1),
          0.42 + rnd() * 0.12,
          0.1,
          300 + k * 5 + c,
          true,
        ),
      );
    }
    placed++;
  }
  // cases rondes dans la clairière
  [[1.3, -2.9], [3.4, -2.6], [3.1, -4.7], [1.6, -4.9]].forEach(([x, z], i) => {
    const y = footY(h, x, z, 0.5);
    parts.push(clayPart(cyl(0.52, 0.56, 0.6, x, y, z, 12), 0.5, 0.04, 500 + i));
    const cone = new THREE.ConeGeometry(0.82, 0.75, 12, 2);
    cone.translate(x, y + 0.6 + 0.37, z);
    parts.push(clayPart(cone, 0.4, 0.09, 510 + i, true));
  });
  const [fx, fz] = [2.35, -3.7];
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    parts.push(clayPart(lump(0.08, fx + Math.cos(a) * 0.26, h(fx, fz), fz + Math.sin(a) * 0.26), 0.3, 0.02, 520 + k));
  }
  return {
    clay: merge(parts),
    water: { y: 0.16 },
    embers: [{ p: [fx, h(fx, fz) + 0.05, fz], s: [0.24, 0.07, 0.24] }],
    light: [fx, h(fx, fz) + 1.1, fz + 0.3],
  };
};

// --- GAZA : ville dense au bord de la mer --------------------------------------
export const gaza = (): Diorama => {
  const rnd = mulberry32(33);
  const h = (x: number) => 0.18 - smoothstep(4.2, 5.6, x) * 0.62;
  const hf = (x: number, z: number) => h(x) + 0.03 * simplex(x, z);
  const parts: THREE.BufferGeometry[] = [groundDisk(R, hf, groundTone(0.36), 36, 140)];
  const embers: Diorama["embers"] = [];
  let lightP: [number, number, number] = [0, 2, 0];
  let id = 0;
  for (let gx = -6.6; gx <= 3.4; gx += 1.52) {
    for (let gz = -6.6; gz <= 6.6; gz += 1.52) {
      const x = gx + (rnd() - 0.5) * 0.2;
      const z = gz + (rnd() - 0.5) * 0.2;
      if (Math.hypot(x, z) > 7.2) continue;
      id++;
      const w = 1.05 + rnd() * 0.25;
      const d = 1.05 + rnd() * 0.25;
      const tall = 1.1 + rnd() * rnd() * 3.6;
      const tone = 0.5 + rnd() * 0.1;
      const broken = rnd() < 0.34;
      const y = 0.12;
      if (!broken) {
        parts.push(clayPart(box(w, tall, d, x, y, z, 0, 2), tone, 0.03, 600 + id));
        for (let f = 0.62; f < tall - 0.2; f += 0.62)
          parts.push(clayPart(box(w + 0.07, 0.05, d + 0.07, x, y + f, z, 0, 1), tone + 0.06, 0.01, 700 + id * 7 + f * 10));
        if (rnd() < 0.4) parts.push(clayPart(cyl(0.12, 0.12, 0.18, x + 0.2, y + tall, z - 0.2, 8), tone, 0.01, 800 + id));
        if (!embers.length && tall > 2.6 && x < 1 && z > -2) {
          embers.push({ p: [x - 0.2, y + tall * 0.62, z + d / 2 + 0.012], s: [0.16, 0.22, 0.02] });
          lightP = [x - 0.2, y + tall * 0.62, z + d / 2 + 0.8];
        }
      } else {
        // bâtiment en partie effondré : moignon, dalles penchées, gravats
        const stub = 0.4 + rnd() * 1.4;
        parts.push(clayPart(box(w, stub, d, x, y, z, 0, 3), tone, 0.12, 900 + id));
        parts.push(clayPart(box(w * 0.5, stub * 0.7, d * 0.4, x - w * 0.25, y + stub, z + d * 0.25, 0, 2), tone, 0.1, 950 + id));
        parts.push(clayPart(box(w * 1.1, 0.06, d * 0.7, x + 0.15, y + stub * 0.8, z, 0.1, 1, 0.05, -0.32), tone + 0.05, 0.02, 990 + id));
        for (let k = 0; k < 9; k++) {
          const s = 0.08 + rnd() * 0.22;
          parts.push(
            clayPart(
              box(s, s * 0.7, s * 1.2, x + (rnd() - 0.5) * 1.4, y - 0.05, z + (rnd() - 0.5) * 1.4, rnd() * 3, 1, rnd(), rnd()),
              tone - 0.05,
              0.02,
              1000 + id * 11 + k,
            ),
          );
        }
      }
    }
  }
  return { clay: merge(parts), water: { y: -0.22 }, embers, light: lightP };
};

// --- YÉMEN : montagne en terrasses et maisons-tours --------------------------
export const yemen = (): Diorama => {
  const rnd = mulberry32(44);
  const m = (x: number, z: number) =>
    4.3 * Math.exp(-((x + 1.6) ** 2 + (z + 2.0) ** 2) / 16) + 0.55 * (0.5 + 0.5 * fbm(x * 0.2, z * 0.2, 3));
  const h = (x: number, z: number) => {
    const v = m(x, z);
    const step = 0.36;
    const q = Math.floor(v / step) * step;
    const f = (v - q) / step;
    const terr = q + step * smoothstep(0.75, 1, f);
    return 0.15 + (v > 0.7 ? 0.88 * terr + 0.12 * v : v);
  };
  const parts: THREE.BufferGeometry[] = [groundDisk(R, h, groundTone(0.38), 64, 180)];
  const embers: Diorama["embers"] = [];
  const towers: [number, number][] = [
    [2.2, 1.2], [3.5, 0.2], [3.3, 2.6], [1.0, 2.9], [4.6, 1.6], [2.0, 4.2], [0.3, 1.4], [3.9, -1.3],
  ];
  let lightP: [number, number, number] = [0, 3, 0];
  towers.forEach(([x, z], i) => {
    const w = 0.95 + rnd() * 0.35;
    const tall = 2.2 + rnd() * 1.9;
    const y = footY(h, x, z, w / 2);
    const tone = 0.5 + rnd() * 0.08;
    const ry = (rnd() - 0.5) * 0.3;
    parts.push(clayPart(box(w, tall, w, x, y, z, ry, 2), tone, 0.04, 1200 + i));
    [0.36, 0.62, 0.84].forEach((f, k) =>
      parts.push(clayPart(box(w + 0.08, 0.07, w + 0.08, x, y + tall * f, z, ry, 1), tone + 0.12, 0.01, 1250 + i * 4 + k)),
    );
    // créneaux
    for (let k = 0; k < 4; k++) {
      const a = ry + (k / 4) * Math.PI * 2 + Math.PI / 4;
      const r = w * 0.5;
      parts.push(clayPart(box(0.16, 0.2, 0.16, x + Math.cos(a) * r, y + tall, z + Math.sin(a) * r, ry, 1), tone, 0.01, 1300 + i * 4 + k));
    }
    // fenêtres
    const c = Math.cos(ry);
    const s = Math.sin(ry);
    for (let row = 0; row < 3; row++)
      for (let col = -1; col <= 1; col += 2) {
        const lx = col * w * 0.22;
        const wy = y + tall * (0.22 + row * 0.26);
        const wx = x + lx * c + (w / 2 + 0.01) * s;
        const wz = z - lx * s + (w / 2 + 0.01) * c;
        if (i === 0 && row >= 1) {
          embers.push({ p: [wx, wy + 0.12, wz], s: [0.13, 0.19, 0.02] });
          lightP = [x, y + tall * 0.55, z + w / 2 + 0.9];
        } else {
          parts.push(clayPart(box(0.13, 0.19, 0.03, wx, wy, wz, ry, 1), 0.1, 0, 1400 + i * 10 + row * 2 + col));
        }
      }
  });
  return { clay: merge(parts), embers, light: lightP };
};

export const DIORAMAS = [soudan, rdc, gaza, yemen];
/** Centres des maquettes posées sur la table (unités du décor). */
export const DIORAMA_POS: [number, number, number][] = [
  [-54, 3.6, -22],
  [-18, 3.6, -22],
  [18, 3.6, -22],
  [54, 3.6, -22],
];
