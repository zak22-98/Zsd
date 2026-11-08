// Carte en papier de la Suisse (texture dessinée) et carte de combustion.
import * as THREE from "three";
import { CH, CITIES, LAKES, MAP, ground, kmToWorld, llToWorld, routeDistKm, worldToKm } from "../lib/geo";
import { fbm, mulberry32 } from "../lib/noise";

const TW = 2048;
const TH = Math.round((TW * MAP.d) / MAP.w);

const toPx = (wx: number, wz: number): [number, number] => [
  ((wx - (MAP.cx - MAP.w / 2)) / MAP.w) * TW,
  ((wz - (MAP.cz - MAP.d / 2)) / MAP.d) * TH,
];
const kmPx = (p: [number, number]) => {
  const [wx, wz] = kmToWorld(p);
  return toPx(wx, wz);
};

/** Pli de la carte (repliée en huit) : petite hauteur en unités du décor. */
export const paperFold = (wx: number, wz: number) => {
  const u = (wx - (MAP.cx - MAP.w / 2)) / (MAP.w / 4);
  const v = (wz - (MAP.cz - MAP.d / 2)) / (MAP.d / 2);
  const tri = (t: number) => Math.abs((t % 2) - 1);
  return 0.1 * (1 - tri(u)) + 0.06 * tri(v);
};

export const paperTexture = () => {
  const c = document.createElement("canvas");
  c.width = TW;
  c.height = TH;
  const ctx = c.getContext("2d")!;
  const rnd = mulberry32(5);
  // papier gris cendré, fibres
  const img = ctx.createImageData(TW, TH);
  for (let y = 0; y < TH; y++)
    for (let x = 0; x < TW; x++) {
      const n = fbm(x / 180, y / 180, 4) * 14 + fbm(x / 9, y / 40, 2) * 5 + (rnd() - 0.5) * 9;
      const edge = Math.min(x, y, TW - x, TH - y);
      const dark = edge < 60 ? (60 - edge) * 0.55 : 0;
      const k = 158 + n - dark;
      const i = (y * TW + x) * 4;
      img.data[i] = k;
      img.data[i + 1] = k - 3;
      img.data[i + 2] = k - 8;
      img.data[i + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);

  // hachures de relief (orientées dans la pente, comme une carte ancienne)
  const step = 7;
  const e = 1.2; // km
  for (let py = step / 2; py < TH; py += step)
    for (let px = step / 2; px < TW; px += step) {
      const wx = MAP.cx - MAP.w / 2 + (px / TW) * MAP.w;
      const wz = MAP.cz - MAP.d / 2 + (py / TH) * MAP.d;
      const [x, y] = worldToKm(wx, wz);
      const g = ground(x, y);
      if (g.mask < 0.4 || g.lake > 0.4) continue;
      const gx = (ground(x + e, y).h - g.h) / e;
      const gy = (ground(x, y + e).h - g.h) / e;
      const slope = Math.hypot(gx, gy);
      if (slope < 0.02) continue;
      const len = Math.min(6, 2 + slope * 18);
      const a = Math.atan2(-gy, gx); // canvas : y vers le bas
      const jx = (rnd() - 0.5) * 2;
      const jy = (rnd() - 0.5) * 2;
      ctx.strokeStyle = `rgba(48,45,41,${Math.min(0.75, 0.12 + slope * 1.6)})`;
      ctx.lineWidth = 1 + Math.min(1.4, slope * 2);
      ctx.beginPath();
      ctx.moveTo(px + jx - (Math.cos(a) * len) / 2, py + jy - (Math.sin(a) * len) / 2);
      ctx.lineTo(px + jx + (Math.cos(a) * len) / 2, py + jy + (Math.sin(a) * len) / 2);
      ctx.stroke();
    }

  // lacs
  for (const L of LAKES) {
    ctx.beginPath();
    L.forEach((p, i) => {
      const [x, y] = kmPx(p);
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = "rgba(92,94,96,0.55)";
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = "rgba(40,40,42,0.45)";
    ctx.lineWidth = 1.2;
    for (let y = 0; y < TH; y += 5) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(TW, y);
      ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = "rgba(35,34,32,0.8)";
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }

  // contour du pays
  ctx.beginPath();
  CH.forEach((p, i) => {
    const [x, y] = kmPx(p);
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  });
  ctx.closePath();
  ctx.strokeStyle = "rgba(30,29,27,0.85)";
  ctx.lineWidth = 3;
  ctx.setLineDash([14, 6, 3, 6]);
  ctx.stroke();
  ctx.setLineDash([]);

  // villes
  ctx.font = "italic 400 30px 'Cormorant Garamond'";
  ctx.fillStyle = "rgba(28,27,25,0.9)";
  for (const city of CITIES) {
    const [x, y] = toPx(...llToWorld(city.ll));
    ctx.beginPath();
    ctx.arc(x, y, 4.5, 0, Math.PI * 2);
    ctx.fill();
    const left = city.name === "Genève" || city.name === "Lausanne";
    ctx.textAlign = left ? "right" : "left";
    ctx.fillText(city.name, x + (left ? -12 : 12), y - 8);
  }

  // échelle
  const [x0, y0] = [120, TH - 110];
  const km50 = (50 * 0.145 * TW) / MAP.w;
  ctx.fillStyle = "rgba(30,29,27,0.85)";
  ctx.fillRect(x0, y0, km50 / 2, 8);
  ctx.strokeStyle = "rgba(30,29,27,0.85)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x0, y0, km50, 8);
  ctx.font = "500 26px 'Barlow Condensed'";
  ctx.textAlign = "center";
  ctx.fillText("0", x0, y0 - 12);
  ctx.fillText("25", x0 + km50 / 2, y0 - 12);
  ctx.fillText("50 KM", x0 + km50, y0 - 12);

  // plis
  for (let k = 1; k < 4; k++) {
    const x = (k / 4) * TW;
    const g = ctx.createLinearGradient(x - 18, 0, x + 18, 0);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(0.5, "rgba(0,0,0,0.12)");
    g.addColorStop(0.52, "rgba(255,255,255,0.08)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - 18, 0, 36, TH);
  }
  {
    const y = TH / 2;
    const g = ctx.createLinearGradient(0, y - 14, 0, y + 14);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(0.5, "rgba(0,0,0,0.1)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, y - 14, TW, 28);
  }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
};

/** Distance au parcours normalisée + bruit : le papier brûle à partir de la ligne. */
export const BURN_KM = 330;
export const burnTexture = () => {
  const w = 512;
  const h = Math.round((w * MAP.d) / MAP.w);
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const wx = MAP.cx - MAP.w / 2 + ((x + 0.5) / w) * MAP.w;
      const wz = MAP.cz - MAP.d / 2 + ((y + 0.5) / h) * MAP.d;
      const [kx, ky] = worldToKm(wx, wz);
      const d = Math.min(1, routeDistKm(kx, ky) / BURN_KM);
      const n = 0.5 + 0.5 * fbm(x / 40, y / 40, 4);
      const v = Math.min(1, d * 0.84 + n * 0.16);
      const i = ((h - 1 - y) * w + x) * 4; // DataTexture : ligne 0 = bas (v = 0)
      data[i] = data[i + 1] = data[i + 2] = Math.round(v * 255);
      data[i + 3] = 255;
    }
  const t = new THREE.DataTexture(data, w, h);
  t.needsUpdate = true;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearFilter;
  return t;
};

/** Matériau papier qui se consume (bord de braise), à partir d'un MeshStandardMaterial. */
export const burningPaperMaterial = (map: THREE.Texture, burnMap: THREE.Texture) => {
  const uniforms = { uBurn: { value: -0.1 }, uBurnMap: { value: burnMap }, uOpacity: { value: 1 } };
  const m = new THREE.MeshStandardMaterial({ map, roughness: 0.92, metalness: 0, side: THREE.DoubleSide, transparent: true });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vBurnUv;")
      .replace("#include <uv_vertex>", "#include <uv_vertex>\nvBurnUv = uv;");
    sh.fragmentShader = sh.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec2 vBurnUv;\nuniform float uBurn;\nuniform float uOpacity;\nuniform sampler2D uBurnMap;",
      )
      .replace(
        "#include <clipping_planes_fragment>",
        "#include <clipping_planes_fragment>\nfloat bv = texture2D(uBurnMap, vBurnUv).r;\nif (bv < uBurn) discard;\nfloat edge = 1.0 - smoothstep(0.0, 0.035, bv - uBurn);\nfloat char = 1.0 - smoothstep(0.0, 0.09, bv - uBurn);",
      )
      .replace(
        "#include <map_fragment>",
        "#include <map_fragment>\ndiffuseColor.rgb *= mix(1.0, 0.08, char * step(-0.05, uBurn));\ndiffuseColor.a *= uOpacity;",
      )
      .replace(
        "#include <emissivemap_fragment>",
        "#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(1.0, 0.29, 0.11) * edge * edge * 2.6 * step(-0.05, uBurn);",
      );
  };
  return { material: m, uniforms };
};
