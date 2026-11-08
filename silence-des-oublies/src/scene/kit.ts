// Kit de modelage « argile et cendre » : géométries légèrement irrégulières,
// teintes grises par sommet, textures de grain générées une seule fois.
import * as THREE from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { fbm, hash3, mulberry32 } from "../lib/noise";

export const EMBER = new THREE.Color("#ff4a1c");
export const EMBER_DEEP = new THREE.Color("#b3260f");
export const FOG = new THREE.Color("#141415");

/** Prépare une pièce : sommets malaxés, teinte grise, normales recalculées. */
export const clayPart = (
  g: THREE.BufferGeometry,
  tone: number,
  jitter = 0.05,
  seed = 1,
  smooth = false,
): THREE.BufferGeometry => {
  g.deleteAttribute("uv");
  g.deleteAttribute("normal");
  let geo = smooth ? mergeVertices(g) : g.index ? g.toNonIndexed() : g;
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count && jitter > 0; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    pos.setXYZ(
      i,
      x + (hash3(x, y, z + seed) - 0.5) * jitter,
      y + (hash3(y + seed, z, x) - 0.5) * jitter,
      z + (hash3(z, x + seed, y) - 0.5) * jitter,
    );
  }
  geo.computeVertexNormals();
  if (geo.index) geo = geo.toNonIndexed();
  const p2 = geo.attributes.position as THREE.BufferAttribute;
  const col = new Float32Array(p2.count * 3);
  const uv = new Float32Array(p2.count * 2);
  const r = mulberry32(seed);
  const shade = tone * (0.9 + 0.2 * r());
  for (let i = 0; i < p2.count; i++) {
    const x = p2.getX(i);
    const y = p2.getY(i);
    const z = p2.getZ(i);
    const speck = 0.93 + 0.14 * hash3(x * 3.1, y * 2.7, z * 3.3);
    const c = shade * speck;
    col[i * 3] = c;
    col[i * 3 + 1] = c * 0.985;
    col[i * 3 + 2] = c * 0.965;
    uv[i * 2] = (x + z * 0.7) * 1.4;
    uv[i * 2 + 1] = (y - x * 0.4 + z * 0.3) * 1.4;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return geo;
};

export const merge = (parts: THREE.BufferGeometry[]) => {
  const m = mergeGeometries(parts, false);
  if (!m) throw new Error("merge failed");
  return m;
};

export const box = (
  w: number, h: number, d: number,
  x: number, y: number, z: number,
  ry = 0, seg = 2, rx = 0, rz = 0,
) => {
  const g = new THREE.BoxGeometry(w, h, d, seg, seg, seg);
  g.rotateX(rx);
  g.rotateZ(rz);
  g.rotateY(ry);
  g.translate(x, y + h / 2, z);
  return g;
};

export const cyl = (rt: number, rb: number, h: number, x: number, y: number, z: number, seg = 10) => {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg, 2);
  g.translate(x, y + h / 2, z);
  return g;
};

export const lump = (r: number, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1) => {
  const g = new THREE.IcosahedronGeometry(r, 2);
  g.scale(sx, sy, sz);
  g.translate(x, y, z);
  return g;
};

/** Sol circulaire de maquette avec bord vertical (jupe). */
export const groundDisk = (
  R: number,
  hfn: (x: number, z: number) => number,
  tone: (x: number, z: number, h: number) => number,
  rings = 40,
  segs = 140,
  bottom = -0.6,
) => {
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const push = (x: number, y: number, z: number, c: number) => {
    pos.push(x, y, z);
    col.push(c, c * 0.985, c * 0.965);
    return pos.length / 3 - 1;
  };
  const center = push(0, hfn(0, 0), 0, tone(0, 0, hfn(0, 0)));
  const ringIdx: number[][] = [];
  for (let r = 1; r <= rings; r++) {
    const rad = (r / rings) * R;
    const row: number[] = [];
    for (let s = 0; s < segs; s++) {
      const a = (s / segs) * Math.PI * 2;
      const x = Math.cos(a) * rad;
      const z = Math.sin(a) * rad;
      const h = hfn(x, z);
      row.push(push(x, h, z, tone(x, z, h)));
    }
    ringIdx.push(row);
  }
  for (let s = 0; s < segs; s++) idx.push(center, ringIdx[0][(s + 1) % segs], ringIdx[0][s]);
  for (let r = 0; r < rings - 1; r++)
    for (let s = 0; s < segs; s++) {
      const a = ringIdx[r][s];
      const b = ringIdx[r][(s + 1) % segs];
      const c = ringIdx[r + 1][s];
      const d = ringIdx[r + 1][(s + 1) % segs];
      idx.push(a, b, c, b, d, c);
    }
  // jupe
  const outer = ringIdx[rings - 1];
  const low = outer.map((i) => push(pos[i * 3], bottom, pos[i * 3 + 2], 0.16));
  for (let s = 0; s < segs; s++) {
    const a = outer[s];
    const b = outer[(s + 1) % segs];
    const c = low[s];
    const d = low[(s + 1) % segs];
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  const uvs: number[] = [];
  for (let i = 0; i < pos.length; i += 3) uvs.push(pos[i] * 0.6, (pos[i + 2] + pos[i + 1]) * 0.6);
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const ni = g.toNonIndexed();
  return ni;
};

// --- textures ---------------------------------------------------------------
const canvasTex = (size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void) => {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  draw(c.getContext("2d")!, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  return t;
};

let _bump: THREE.Texture | null = null;
/** Grain d'argile et de cendre (relief fin). */
export const clayBump = () => {
  if (_bump) return _bump;
  _bump = canvasTex(512, (ctx, s) => {
    const img = ctx.createImageData(s, s);
    const r = mulberry32(7);
    for (let y = 0; y < s; y++)
      for (let x = 0; x < s; x++) {
        // bruit périodique
        const u = (x / s) * Math.PI * 2;
        const v = (y / s) * Math.PI * 2;
        const n = fbm(Math.cos(u) * 3 + Math.sin(v) * 1.7, Math.sin(u) * 3 + Math.cos(v) * 2.3, 5);
        const k = 128 + n * 70 + (r() - 0.5) * 70;
        const i = (y * s + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = k;
        img.data[i + 3] = 255;
      }
    ctx.putImageData(img, 0, 0);
  });
  return _bump;
};

let _glow: THREE.Texture | null = null;
export const glowTex = () => {
  if (_glow) return _glow;
  _glow = canvasTex(256, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.15, "rgba(255,255,255,0.55)");
    g.addColorStop(0.45, "rgba(255,255,255,0.12)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  });
  _glow.wrapS = _glow.wrapT = THREE.ClampToEdgeWrapping;
  return _glow;
};

let _dot: THREE.Texture | null = null;
export const dotTex = () => {
  if (_dot) return _dot;
  _dot = canvasTex(64, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.5, "rgba(255,255,255,0.6)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  });
  _dot.wrapS = _dot.wrapT = THREE.ClampToEdgeWrapping;
  return _dot;
};

let _fog: THREE.Texture | null = null;
export const fogTex = () => {
  if (_fog) return _fog;
  _fog = canvasTex(256, (ctx, s) => {
    const img = ctx.createImageData(s, s);
    for (let y = 0; y < s; y++)
      for (let x = 0; x < s; x++) {
        const dx = x / s - 0.5;
        const dy = y / s - 0.5;
        const fall = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) * 2);
        const n = 0.5 + 0.5 * fbm(x / 60, y / 60, 5);
        const i = (y * s + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
        img.data[i + 3] = Math.min(255, 255 * fall * fall * n * 1.3);
      }
    ctx.putImageData(img, 0, 0);
  });
  _fog.wrapS = _fog.wrapT = THREE.ClampToEdgeWrapping;
  return _fog;
};

export const clayMaterial = (bumpRepeat = 3, bumpScale = 1.2) => {
  const b = clayBump().clone();
  b.repeat.set(bumpRepeat, bumpRepeat);
  b.needsUpdate = true;
  return new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 1,
    metalness: 0,
    bumpMap: b,
    bumpScale,
  });
};
