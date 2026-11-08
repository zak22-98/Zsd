import { useThree } from "@react-three/fiber";
import React, { useMemo } from "react";
import { useCurrentFrame } from "remotion";
import * as THREE from "three";
import {
  CITIES, LAKES, LAKE_LEVEL_KM, MAP, S, V, ground, kmToWorld, llToKm, routeDistKm, routeSamples,
} from "../lib/geo";
import { clamp, easeInOutSine, fbm, lerp, mulberry32, smoothstep } from "../lib/noise";
import { FPS, T, shotStart } from "../timeline";
import { ROUTE_LIFT, cameraPose, chairPlacement, fullRouteCurve, routeProgress } from "./camera";
import { DIORAMAS, DIORAMA_POS } from "./dioramas";
import { EMBER, FOG, box, clayBump, clayMaterial, clayPart, dotTex, fogTex, glowTex, merge } from "./kit";
import { BURN_KM, burnTexture, burningPaperMaterial, paperFold, paperTexture } from "./paper";

// --- états temporels --------------------------------------------------------
const flicker = (t: number, seed: number) =>
  0.82 + 0.1 * Math.sin(t * 11.3 + seed) * Math.sin(t * 4.1 + seed * 2) + 0.08 * Math.sin(t * 23.7 + seed * 5);

export const emberLevel = (i: number, t: number) => {
  const off = shotStart(i) + T.extinguishAt;
  if (t < off) return flicker(t, i);
  const k = (t - off) / T.extinguishLen;
  if (k >= 1) return 0;
  const sputter = 0.6 + 0.4 * Math.abs(Math.sin(k * 31 + i));
  return Math.pow(1 - k, 1.7) * sputter * flicker(t, i);
};

const burnAt = (t: number) => {
  if (t < T.burn[0]) return -0.12;
  const k = clamp((t - T.burn[0]) / (T.burn[1] - T.burn[0]));
  return lerp(-0.04, 1.03, easeInOutSine(k));
};
const riseFor = (t: number, dKm: number) => {
  const front = ((burnAt(t) - 0.06) / 0.84) * BURN_KM;
  return smoothstep(0, 1, (front - dKm - 4) / 55);
};

// --- caméra et brouillard ----------------------------------------------------
const CameraRig: React.FC<{ t: number }> = ({ t }) => {
  const { camera, scene } = useThree();
  const p = cameraPose(t);
  const cam = camera as THREE.PerspectiveCamera;
  cam.position.copy(p.pos);
  cam.fov = p.fov;
  cam.near = Math.max(0.03, p.pos.distanceTo(p.target) * 0.01);
  cam.far = 900;
  cam.updateProjectionMatrix();
  cam.lookAt(p.target);
  if (!(scene.fog instanceof THREE.FogExp2)) scene.fog = new THREE.FogExp2(FOG.getHex(), p.fog);
  (scene.fog as THREE.FogExp2).density = p.fog;
  scene.background = FOG;
  return null;
};

// --- lumières ---------------------------------------------------------------------
const Lights: React.FC<{ t: number }> = ({ t }) => {
  const p = cameraPose(t);
  const scale = clamp(p.pos.distanceTo(p.target) / 14, 0.15, 8);
  const objs = useMemo(() => {
    const hemi = new THREE.HemisphereLight("#9aa0a8", "#0a0a0a", 0.3);
    const moon = new THREE.DirectionalLight("#b9bec6", 1.3);
    moon.castShadow = true;
    moon.shadow.mapSize.set(2048, 2048);
    moon.shadow.bias = -0.0004;
    moon.shadow.normalBias = 0.02;
    const lamp = new THREE.SpotLight("#d7d9dc", 0, 0, 0.55, 1, 0);
    lamp.position.set(-4, 70, 30);
    lamp.target.position.set(-6, 0, 10);
    const group = new THREE.Group();
    group.add(hemi, moon, moon.target, lamp, lamp.target);
    return { group, hemi, moon, lamp };
  }, []);
  const focus = p.target;
  const dir = new THREE.Vector3(-0.55, 1, -0.65).normalize();
  objs.moon.position.copy(focus).addScaledVector(dir, 60 * scale);
  objs.moon.target.position.copy(focus);
  const sc = objs.moon.shadow.camera as THREE.OrthographicCamera;
  const half = 26 * scale;
  sc.left = -half;
  sc.right = half;
  sc.top = half;
  sc.bottom = -half;
  sc.near = 1;
  sc.far = 140 * scale;
  sc.updateProjectionMatrix();
  objs.moon.target.updateMatrixWorld();
  const wide = smoothstep(26, 33, t) * (1 - smoothstep(44, 50, t));
  objs.hemi.intensity = 0.22 + 0.2 * wide;
  objs.moon.intensity = (1.25 + 0.35 * wide) * (1 - 0.55 * smoothstep(58, 60.5, t));
  objs.lamp.intensity = 1.7 * smoothstep(31.5, 35.5, t) * (1 - 0.6 * smoothstep(45, 50, t));
  return <primitive object={objs.group} />;
};

// --- braise générique : petite source, halo, lumière ----------------------------
const useEmber = (distance: number, size: number) =>
  useMemo(() => {
    const light = new THREE.PointLight(EMBER, 0, distance, 1.6);
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex(), color: EMBER, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true,
      }),
    );
    sprite.scale.setScalar(size);
    const g = new THREE.Group();
    g.add(light, sprite);
    return { g, light, sprite };
  }, [distance, size]);

// --- table et maquettes -----------------------------------------------------------
const Table: React.FC = () => {
  const obj = useMemo(() => {
    const g = new THREE.BoxGeometry(260, 3, 140);
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 18, uv.getY(i) * 10);
    const tex = clayBump().clone();
    tex.needsUpdate = true;
    const m = new THREE.MeshStandardMaterial({ color: "#2b2a28", roughness: 1, bumpMap: tex, bumpScale: 2, map: tex });
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set(0, -1.5, 0);
    mesh.receiveShadow = true;
    return mesh;
  }, []);
  return <primitive object={obj} />;
};

const Diorama: React.FC<{ i: number; t: number }> = ({ i, t }) => {
  const d = useMemo(() => DIORAMAS[i](), [i]);
  const objs = useMemo(() => {
    const group = new THREE.Group();
    const [x, y, z] = DIORAMA_POS[i];
    group.position.set(x, y, z);
    const clay = new THREE.Mesh(d.clay, clayMaterial(1, 0.9));
    clay.castShadow = clay.receiveShadow = true;
    group.add(clay);
    const plinth = new THREE.Mesh(
      clayPart(new THREE.CylinderGeometry(8.45, 8.7, 3, 72, 3), 0.17, 0.05, 900 + i),
      clayMaterial(),
    );
    plinth.position.set(0, -2.1, 0);
    plinth.castShadow = plinth.receiveShadow = true;
    group.add(plinth);
    if (d.water) {
      const w = new THREE.Mesh(
        new THREE.CircleGeometry(7.95, 64).rotateX(-Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: "#070708", roughness: 0.16, metalness: 0 }),
      );
      w.position.y = d.water.y;
      w.receiveShadow = true;
      group.add(w);
    }
    const emberMat = new THREE.MeshBasicMaterial({ color: EMBER.clone(), toneMapped: false });
    const emberGeo = merge(d.embers.map((e) => box(e.s[0], e.s[1], e.s[2], e.p[0], e.p[1] - e.s[1] / 2, e.p[2], 0, 1)));
    group.add(new THREE.Mesh(emberGeo, emberMat));
    const light = new THREE.PointLight(EMBER, 0, 6.5, 2);
    light.position.set(...d.light);
    group.add(light);
    const sprites = d.embers.map((e) => {
      const s = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: glowTex(), color: EMBER, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }),
      );
      s.position.set(...e.p);
      s.scale.setScalar(0.9);
      group.add(s);
      return s;
    });
    return { group, emberMat, light, sprites };
  }, [d, i]);
  const e = emberLevel(i, t);
  objs.emberMat.color.copy(EMBER).multiplyScalar(lerp(0, 2.4, e));
  objs.light.intensity = 3.2 * e;
  objs.sprites.forEach((s) => ((s.material as THREE.SpriteMaterial).opacity = 0.75 * e));
  return <primitive object={objs.group} />;
};

// --- carte en papier --------------------------------------------------------------
const Paper: React.FC<{ t: number }> = ({ t }) => {
  const objs = useMemo(() => {
    const g = new THREE.PlaneGeometry(MAP.w, MAP.d, 116, 80);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++)
      pos.setY(i, paperFold(pos.getX(i) + MAP.cx, pos.getZ(i) + MAP.cz) + 0.03);
    g.computeVertexNormals();
    const { material, uniforms } = burningPaperMaterial(paperTexture(), burnTexture());
    const mesh = new THREE.Mesh(g, material);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    const holder = new THREE.Group();
    holder.position.set(MAP.cx, 0, MAP.cz);
    holder.add(mesh);
    return { holder, mesh, uniforms };
  }, []);
  const k = clamp((t - T.paperFall[0]) / (T.paperFall[1] - T.paperFall[0]));
  const land = 1 - Math.pow(1 - k, 2.4);
  objs.holder.visible = t >= T.paperFall[0] && t < T.burn[1] + 0.3;
  objs.holder.position.y = 16 * (1 - land);
  objs.holder.rotation.set(0.32 * (1 - k) * Math.sin(k * 6.5), 0.18 * (1 - k), 0.22 * (1 - k) * Math.cos(k * 5));
  objs.uniforms.uOpacity.value = smoothstep(0, 0.4, k);
  objs.uniforms.uBurn.value = burnAt(t);
  return <primitive object={objs.holder} />;
};

// --- relief ---------------------------------------------------------------------
const SEG_X = 320;
const SEG_Z = 220;
const Terrain: React.FC<{ t: number }> = ({ t }) => {
  const objs = useMemo(() => {
    const g = new THREE.PlaneGeometry(MAP.w, MAP.d, SEG_X, SEG_Z);
    g.rotateX(-Math.PI / 2);
    g.translate(MAP.cx, 0, MAP.cz);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const n = pos.count;
    const full = new Float32Array(n);
    const dist = new Float32Array(n);
    const col = new Float32Array(n * 3);
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 14, uv.getY(i) * 10);
    for (let i = 0; i < n; i++) {
      const [x, y] = [(pos.getX(i) - MAP.cx) / S, (MAP.cz - pos.getZ(i)) / S];
      const gr = ground(x, y);
      full[i] = gr.h * S * V;
      dist[i] = routeDistKm(x, y);
      let c = 0.34 + 0.2 * clamp(gr.h / 3.6) + 0.05 * fbm(x / 6, y / 6, 2);
      c = lerp(0.2, c, gr.mask);
      if (gr.h < LAKE_LEVEL_KM - 0.05) c = 0.1;
      col[i * 3] = c;
      col[i * 3 + 1] = c * 0.985;
      col[i * 3 + 2] = c * 0.965;
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const mat = clayMaterial(1, 0.9);
    const mesh = new THREE.Mesh(g, mat);
    mesh.castShadow = mesh.receiveShadow = true;

    // lacs
    const water = new THREE.MeshStandardMaterial({ color: "#1a1b1d", roughness: 0.22, metalness: 0 });
    const lakes = LAKES.map((L) => {
      const shape = new THREE.Shape(L.map((p) => {
        const [wx, wz] = kmToWorld(p);
        return new THREE.Vector2(wx, -wz);
      }));
      const lg = new THREE.ShapeGeometry(shape, 8);
      lg.rotateX(-Math.PI / 2);
      const m = new THREE.Mesh(lg, water);
      m.receiveShadow = true;
      const c = L.reduce((a, p) => [a[0] + p[0] / L.length, a[1] + p[1] / L.length], [0, 0]);
      return { m, d: routeDistKm(c[0], c[1]) };
    });

    // villages (petits cubes de cendre)
    const rnd = mulberry32(77);
    const chairAt = chairPlacement().pos;
    const houses: { x: number; z: number; full: number; d: number; s: [number, number, number]; ry: number }[] = [];
    const tryAdd = (kx: number, ky: number) => {
      const gr = ground(kx, ky);
      if (gr.mask < 0.85 || gr.alps > 0.55 || gr.lake > 0.1 || gr.h < LAKE_LEVEL_KM + 0.02) return;
      const [wx, wz] = kmToWorld([kx, ky]);
      if (Math.hypot(wx - chairAt.x, wz - chairAt.z) < 1.4) return;
      houses.push({
        x: wx, z: wz, full: gr.h * S * V, d: routeDistKm(kx, ky),
        s: [0.03 + rnd() * 0.035, 0.025 + rnd() * 0.04, 0.03 + rnd() * 0.035], ry: rnd() * 3,
      });
    };
    for (const c of CITIES) {
      const [cx, cy] = llToKm(c.ll);
      for (let k = 0; k < 16; k++) tryAdd(cx + (rnd() - 0.5) * 7, cy + (rnd() - 0.5) * 7);
    }
    for (const [x, y] of routeSamples(60)) for (let k = 0; k < 3; k++) tryAdd(x + (rnd() - 0.5) * 6, y + rnd() * 5);
    for (let k = 0; k < 900 && houses.length < 420; k++) tryAdd((rnd() - 0.5) * 330, (rnd() - 0.5) * 220);
    const hg = clayPart(new THREE.BoxGeometry(1, 1, 1, 1, 1, 1).translate(0, 0.5, 0), 0.62, 0, 5);
    const inst = new THREE.InstancedMesh(hg, clayMaterial(1, 0), houses.length);
    inst.castShadow = inst.receiveShadow = true;

    const group = new THREE.Group();
    group.add(mesh, inst, ...lakes.map((l) => l.m));
    return { group, g, full, dist, lakes, houses, inst };
  }, []);

  const visible = t >= T.burn[0] - 0.5;
  objs.group.visible = visible;
  if (!visible) return <primitive object={objs.group} />;
  const pos = objs.g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) pos.setY(i, 0.005 + objs.full[i] * riseFor(t, objs.dist[i]));
  pos.needsUpdate = true;
  objs.g.computeVertexNormals();
  objs.lakes.forEach((l) => (l.m.position.y = 0.002 + LAKE_LEVEL_KM * S * V * riseFor(t, l.d)));
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  objs.houses.forEach((h, i) => {
    const r = riseFor(t, h.d);
    const pop = smoothstep(0.6, 1, r);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), h.ry);
    m.compose(
      new THREE.Vector3(h.x, h.full * r - 0.01, h.z),
      q,
      new THREE.Vector3(h.s[0], Math.max(0.0001, h.s[1] * pop), h.s[2]),
    );
    objs.inst.setMatrixAt(i, m);
  });
  objs.inst.instanceMatrix.needsUpdate = true;
  return <primitive object={objs.group} />;
};

// --- la ligne : fusain tracé, puis braise --------------------------------------
const ROUTE_N = 140;
const TUBE_SEG = 420;
const RADIAL = 6;
const Route: React.FC<{ t: number }> = ({ t }) => {
  const samples = useMemo(() => routeSamples(ROUTE_N), []);
  const full = useMemo(() => samples.map(([x, y]) => ground(x, y).h * S * V + ROUTE_LIFT), [samples]);
  const objs = useMemo(() => {
    const baseMat = new THREE.MeshBasicMaterial({ color: "#1a1918", toneMapped: false });
    const trailMat = new THREE.MeshBasicMaterial({ color: EMBER.clone(), toneMapped: false });
    const base = new THREE.Mesh(new THREE.BufferGeometry(), baseMat);
    const trail = new THREE.Mesh(new THREE.BufferGeometry(), trailMat);
    const group = new THREE.Group();
    group.add(base, trail);
    return { group, base, trail, baseMat, trailMat };
  }, []);
  const head = useEmber(2.2, 0.9);
  const visible = t >= T.trace[0];
  objs.group.visible = visible;
  head.g.visible = visible;
  if (!visible) return null;

  const rr = riseFor(t, 0);
  const pts = samples.map(([x, y], i) => {
    const [wx, wz] = kmToWorld([x, y]);
    const paperY = paperFold(wx, wz) + 0.075;
    return new THREE.Vector3(wx, lerp(paperY, full[i], rr), wz);
  });
  const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
  const onTerrain = rr > 0.999;
  const curveUse = onTerrain ? fullRouteCurve() : curve;

  objs.base.geometry.dispose();
  objs.base.geometry = new THREE.TubeGeometry(curveUse, TUBE_SEG, 0.045, RADIAL, false);
  const trace = easeInOutSine(clamp((t - T.trace[0]) / (T.trace[1] - T.trace[0])));
  objs.base.geometry.setDrawRange(0, Math.floor(trace * TUBE_SEG) * RADIAL * 6);

  // fusain → braise (embrasement de la ligne)
  const ig = smoothstep(T.ignite, T.ignite + 0.5, t);
  const flare = Math.exp(-Math.pow((t - T.ignite - 0.55) / 0.5, 2));
  const glow = ig * (0.4 + 1.6 * flare) * flicker(t, 3);
  objs.baseMat.color.set("#1a1918").lerp(EMBER, clamp(ig)).multiplyScalar(ig > 0 ? glow : 1);

  const p = routeProgress(t);
  objs.trail.visible = t >= T.route[0];
  if (objs.trail.visible) {
    objs.trail.geometry.dispose();
    objs.trail.geometry = new THREE.TubeGeometry(fullRouteCurve(), TUBE_SEG, 0.05, RADIAL, false);
    objs.trail.geometry.setDrawRange(0, Math.floor(p * TUBE_SEG) * RADIAL * 6);
    objs.trailMat.color.copy(EMBER).multiplyScalar(2.1 * flicker(t, 9));
  }

  // tête de la ligne
  let hp: THREE.Vector3 | null = null;
  let hi = 0;
  if (t < T.trace[1] + 0.4) {
    hp = curveUse.getPointAt(clamp(trace));
    hi = smoothstep(T.trace[0], T.trace[0] + 0.3, t) * (1 - smoothstep(T.trace[1], T.trace[1] + 0.4, t));
  } else if (t >= T.route[0] - 0.3) {
    hp = fullRouteCurve().getPointAt(clamp(p));
    hi = smoothstep(T.route[0] - 0.3, T.route[0] + 0.3, t) * (1 - 0.6 * smoothstep(T.route[1], T.route[1] + 1, t));
  }
  head.g.visible = !!hp;
  if (hp) {
    head.g.position.copy(hp).add(new THREE.Vector3(0, 0.06, 0));
    head.light.intensity = 0.9 * hi * flicker(t, 4);
    (head.sprite.material as THREE.SpriteMaterial).opacity = hi;
    head.sprite.scale.setScalar(t < T.trace[1] + 0.4 ? 1.1 : 0.85);
  }
  return (
    <>
      <primitive object={objs.group} />
      <primitive object={head.g} />
    </>
  );
};

// --- Broken Chair -----------------------------------------------------------------
const chairGeometry = () => {
  const P: THREE.BufferGeometry[] = [];
  const tone = 0.56;
  const leg = 0.055;
  const seatY = 0.6;
  const w = 0.5;
  const d = 0.48;
  const legAt = (x: number, z: number, h: number, y0 = 0) => P.push(clayPart(box(leg, h, leg, x, y0, z, 0, 1), tone, 0.006, P.length));
  const lx = w / 2 - leg / 2;
  const lz = d / 2 - leg / 2;
  // pieds arrière, montants du dossier
  legAt(-lx, -lz, seatY + 0.62);
  legAt(lx, -lz, seatY + 0.62);
  // pied avant droit, entier
  legAt(lx, lz, seatY);
  // pied avant gauche, cassé à mi-hauteur
  legAt(-lx, lz, seatY * 0.48, seatY * 0.52);
  const rnd = mulberry32(3);
  for (let k = 0; k < 7; k++) {
    const sw = 0.012 + rnd() * 0.016;
    const sh = 0.03 + rnd() * 0.07;
    P.push(
      clayPart(
        box(sw, sh, sw, -lx + (rnd() - 0.5) * 0.05, seatY * 0.52 - sh + 0.01, lz + (rnd() - 0.5) * 0.05, rnd() * 3, 1, (rnd() - 0.5) * 0.5, (rnd() - 0.5) * 0.5),
        tone - 0.04, 0, 40 + k,
      ),
    );
  }
  // assise
  P.push(clayPart(box(w + 0.03, 0.035, d + 0.03, 0, seatY, 0, 0, 2), tone + 0.03, 0.006, 60));
  // ceinture sous l'assise
  P.push(clayPart(box(w - 0.04, 0.04, 0.025, 0, seatY - 0.04, lz, 0, 1), tone, 0.004, 61));
  P.push(clayPart(box(w - 0.04, 0.04, 0.025, 0, seatY - 0.04, -lz, 0, 1), tone, 0.004, 62));
  // dossier : traverse haute, traverse basse, barreaux
  P.push(clayPart(box(w, 0.07, 0.045, 0, seatY + 0.55, -lz, 0, 1), tone + 0.02, 0.004, 63));
  P.push(clayPart(box(w - 0.06, 0.04, 0.04, 0, seatY + 0.2, -lz, 0, 1), tone, 0.004, 64));
  for (const x of [-0.09, 0, 0.09]) P.push(clayPart(box(0.03, 0.31, 0.025, x, seatY + 0.24, -lz, 0, 1), tone, 0.003, 70 + x * 100));
  return merge(P);
};

const CHAIR_SCALE = 1.0;
const Chair: React.FC<{ t: number }> = ({ t }) => {
  const objs = useMemo(() => {
    const { pos, dir } = chairPlacement();
    const group = new THREE.Group();
    group.position.copy(pos);
    // l'avant de la chaise regarde la ligne qui arrive
    group.rotation.y = Math.atan2(-dir.x, -dir.z);
    const chair = new THREE.Mesh(chairGeometry(), clayMaterial(1, 0));
    chair.scale.setScalar(CHAIR_SCALE);
    chair.castShadow = chair.receiveShadow = true;
    const plaza = new THREE.Mesh(clayPart(box(2.2, 0.06, 2.2, 0, -0.04, 0, 0, 4), 0.3, 0.01, 9), clayMaterial(1, 0));
    plaza.receiveShadow = true;
    const inner = new THREE.Group();
    inner.add(chair);
    group.add(inner, plaza);
    const light = new THREE.PointLight(EMBER, 0, 1.9, 2);
    light.position.set(0.12, 0.03, 0.62);
    group.add(light);
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: glowTex(), color: EMBER, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }),
    );
    glow.position.set(0.05, 0.05, 0.55);
    glow.scale.setScalar(0.8);
    group.add(glow);
    return { group, inner, light, glow };
  }, []);
  const k = smoothstep(T.chairRise[0], T.chairRise[1], t);
  objs.group.visible = t > T.chairRise[0] - 0.1;
  objs.inner.position.y = -1.6 * CHAIR_SCALE * Math.pow(1 - k, 1.6);
  const lit = smoothstep(T.route[1] - 0.4, T.route[1] + 1.2, t) * flicker(t, 6);
  objs.light.intensity = 0.5 * lit;
  (objs.glow.material as THREE.SpriteMaterial).opacity = 0.85 * lit;
  return <primitive object={objs.group} />;
};

// --- cendre qui tombe et nappes de brouillard --------------------------------------
const ASH_N = 2600;
const Ash: React.FC<{ t: number }> = ({ t }) => {
  const objs = useMemo(() => {
    const r = mulberry32(99);
    const base = new Float32Array(ASH_N * 4);
    for (let i = 0; i < ASH_N * 4; i++) base[i] = r();
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(ASH_N * 3), 3));
    const m = new THREE.PointsMaterial({
      map: dotTex(), color: "#a29e98", size: 0.1, transparent: true, depthWrite: false, opacity: 0.6, sizeAttenuation: true,
    });
    const pts = new THREE.Points(g, m);
    pts.frustumCulled = false;
    return { pts, base, g, m };
  }, []);
  const p = cameraPose(t);
  const scale = clamp(p.pos.distanceTo(p.target) / 14, 0.12, 8);
  const c = p.target;
  const half = [20 * scale, 11 * scale, 20 * scale];
  const pos = objs.g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < ASH_N; i++) {
    const b = i * 4;
    const speed = 0.05 + objs.base[b + 3] * 0.06;
    const fy = (((objs.base[b + 1] - t * speed) % 1) + 1) % 1;
    const sway = Math.sin(t * 0.6 + objs.base[b + 3] * 40) * 0.03;
    pos.setXYZ(
      i,
      c.x + ((objs.base[b] * 2 - 1) + sway) * half[0],
      c.y - half[1] * 0.25 + (fy * 2 - 1) * half[1],
      c.z + (objs.base[b + 2] * 2 - 1) * half[2],
    );
  }
  pos.needsUpdate = true;
  const amount =
    t < T.pullBack[0] ? 0.35 : t < T.burn[0] ? 0.4 + 0.6 * smoothstep(25, 31, t) : t < T.route[1] ? 0.55 : 0.85;
  objs.m.opacity = 0.7 * amount;
  objs.m.size = 0.085 * scale;
  return <primitive object={objs.pts} />;
};

const FogBanks: React.FC<{ t: number }> = ({ t }) => {
  const sprites = useMemo(() => {
    const r = mulberry32(5);
    return Array.from({ length: 10 }, () => {
      const s = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: fogTex(), color: "#8a8a8a", transparent: true, depthWrite: false, opacity: 0.1 }),
      );
      return { s, a: r() * Math.PI * 2, rr: 0.35 + r() * 0.9, y: r(), sp: (r() - 0.5) * 0.05, size: 0.8 + r() * 0.8 };
    });
  }, []);
  const p = cameraPose(t);
  const scale = clamp(p.pos.distanceTo(p.target) / 14, 0.12, 8);
  sprites.forEach((f, i) => {
    const a = f.a + t * f.sp;
    f.s.position.set(
      p.target.x + Math.cos(a) * f.rr * 18 * scale,
      p.target.y - 0.5 * scale + f.y * 2.2 * scale,
      p.target.z + Math.sin(a) * f.rr * 18 * scale,
    );
    f.s.scale.setScalar(f.size * 22 * scale);
    (f.s.material as THREE.SpriteMaterial).opacity = 0.13 + 0.05 * Math.sin(t * 0.3 + i);
  });
  return (
    <>
      {sprites.map((f, i) => (
        <primitive key={i} object={f.s} />
      ))}
    </>
  );
};

export const World: React.FC = () => {
  const frame = useCurrentFrame();
  // la Sequence décale les frames : on rattache au temps absolu du film
  const t = frame / FPS + WORLD_FROM;
  return (
    <>
      <CameraRig t={t} />
      <Lights t={t} />
      <Table />
      {[0, 1, 2, 3].map((i) => (
        <Diorama key={i} i={i} t={t} />
      ))}
      <Paper t={t} />
      <Terrain t={t} />
      <Route t={t} />
      <Chair t={t} />
      <Ash t={t} />
      <FogBanks t={t} />
    </>
  );
};
export const WORLD_FROM = 6.5;



