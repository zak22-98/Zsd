// Bruit déterministe : chaque image du film doit se recalculer à l'identique,
// quel que soit l'ordre dans lequel Remotion rend les frames.

export const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const hash3 = (x: number, y: number, z: number) => {
  let h = Math.imul(Math.round(x * 997) | 0, 374761393);
  h = (h + Math.imul(Math.round(y * 991) | 0, 668265263)) | 0;
  h = (h + Math.imul(Math.round(z * 983) | 0, 2147483647)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

// Simplex 2D (Gustavson), table de permutation fixe.
const perm = new Uint8Array(512);
{
  const r = mulberry32(1987);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
}
const G2 = [
  [1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1],
];
const F2 = 0.5 * (Math.sqrt(3) - 1);
const U2 = (3 - Math.sqrt(3)) / 6;

export const simplex = (xin: number, yin: number) => {
  const s = (xin + yin) * F2;
  const i = Math.floor(xin + s);
  const j = Math.floor(yin + s);
  const t = (i + j) * U2;
  const x0 = xin - (i - t);
  const y0 = yin - (j - t);
  const i1 = x0 > y0 ? 1 : 0;
  const j1 = x0 > y0 ? 0 : 1;
  const x1 = x0 - i1 + U2;
  const y1 = y0 - j1 + U2;
  const x2 = x0 - 1 + 2 * U2;
  const y2 = y0 - 1 + 2 * U2;
  const ii = i & 255;
  const jj = j & 255;
  let n = 0;
  const corner = (x: number, y: number, g: number) => {
    let tt = 0.5 - x * x - y * y;
    if (tt < 0) return 0;
    tt *= tt;
    const gr = G2[g % 8];
    return tt * tt * (gr[0] * x + gr[1] * y);
  };
  n += corner(x0, y0, perm[ii + perm[jj]]);
  n += corner(x1, y1, perm[ii + i1 + perm[jj + j1]]);
  n += corner(x2, y2, perm[ii + 1 + perm[jj + 1]]);
  return 70 * n; // ~[-1, 1]
};

export const fbm = (x: number, y: number, oct = 4) => {
  let a = 0.5;
  let f = 1;
  let s = 0;
  for (let o = 0; o < oct; o++) {
    s += a * simplex(x * f, y * f);
    f *= 2.03;
    a *= 0.5;
  }
  return s;
};

export const ridged = (x: number, y: number, oct = 4) => {
  let a = 0.55;
  let f = 1;
  let s = 0;
  for (let o = 0; o < oct; o++) {
    const n = 1 - Math.abs(simplex(x * f + o * 17.3, y * f - o * 9.1));
    s += a * n * n;
    f *= 2.1;
    a *= 0.5;
  }
  return s; // ~[0, 1]
};

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const easeInOutSine = (t: number) => -(Math.cos(Math.PI * clamp(t)) - 1) / 2;
