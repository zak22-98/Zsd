import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { clamp, mulberry32, smoothstep } from "../lib/noise";
import { BAR, COUNTRIES, FPS, T, shotStart } from "../timeline";
import { routeProgress } from "../scene/camera";

export const SERIF = "'Cormorant Garamond', serif";
export const COND = "'Barlow Condensed', sans-serif";
export const ASH = "#d6d1c9";
export const EMBER_CSS = "#ff4a1c";

const fadeWin = (t: number, a: number, b: number, fin = 0.9, fout = 0.7) =>
  smoothstep(a, a + fin, t) * (1 - smoothstep(b - fout, b, t));

/** Phrase en italique, qui sort lentement du noir. */
export const Phrase: React.FC<{ t: number; text: string; win: readonly [number, number]; y?: number }> = ({
  t, text, win, y = 0.5,
}) => {
  const o = fadeWin(t, win[0], win[1], 1.1, 0.8);
  if (o <= 0) return null;
  const k = smoothstep(win[0], win[0] + 1.6, t);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          top: `${y * 100}%`,
          transform: `translateY(calc(-50% + ${(1 - k) * 8}px))`,
          fontFamily: SERIF,
          fontStyle: "italic",
          fontWeight: 300,
          fontSize: 64,
          letterSpacing: `${0.02 - 0.01 * k}em`,
          color: ASH,
          opacity: o,
          filter: `blur(${(1 - k) * 5}px)`,
          textShadow: "0 0 24px rgba(0,0,0,0.85)",
          whiteSpace: "nowrap",
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

const Caps: React.FC<{ children: React.ReactNode; size: number; spacing: number; weight?: number; style?: React.CSSProperties }> = ({
  children, size, spacing, weight = 500, style,
}) => (
  <div
    style={{
      fontFamily: COND, fontWeight: weight, fontSize: size, letterSpacing: `${spacing}em`, color: ASH,
      textTransform: "uppercase", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", ...style,
    }}
  >
    {children}
  </div>
);

/** Nom du pays sur chaque maquette. */
export const CountryNames: React.FC<{ t: number }> = ({ t }) => (
  <>
    {COUNTRIES.map((name, i) => {
      const s = shotStart(i);
      const o = fadeWin(t, s + 0.6, s + 3.9, 0.8, 0.6);
      if (o <= 0) return null;
      const k = smoothstep(s + 0.6, s + 2.4, t);
      return (
        <div key={name} style={{ position: "absolute", left: 150, bottom: BAR + 78, opacity: o }}>
          <Caps size={22} spacing={0.5} weight={500} style={{ opacity: 0.55, marginBottom: 10 }}>
            {`0${i + 1} / 04`}
          </Caps>
          <Caps size={84} spacing={0.24 + 0.06 * k} weight={500}>
            {name}
          </Caps>
          <div style={{ marginTop: 14, height: 2, width: 26 + 40 * k, background: EMBER_CSS, opacity: 0.85 }} />
        </div>
      );
    })}
  </>
);

export const Suisse: React.FC<{ t: number }> = ({ t }) => {
  const o = fadeWin(t, T.suisseText[0], T.suisseText[1], 1.2, 0.9);
  if (o <= 0) return null;
  const k = smoothstep(T.suisseText[0], T.suisseText[1], t);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <Caps
        size={150}
        spacing={0.5 + 0.12 * k}
        weight={300}
        style={{ opacity: o * 0.92, paddingLeft: "0.6em", textShadow: "0 0 40px rgba(0,0,0,0.7)" }}
      >
        Suisse
      </Caps>
    </AbsoluteFill>
  );
};

export const Counter: React.FC<{ t: number }> = ({ t }) => {
  const o = fadeWin(t, T.counter[0], T.counter[1], 0.6, 0.8);
  if (o <= 0) return null;
  const km = Math.round(100 * routeProgress(t));
  return (
    <div style={{ position: "absolute", right: 150, bottom: BAR + 70, opacity: o, textAlign: "right" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "flex-end", gap: 18 }}>
        <Caps size={34} spacing={0.3} weight={500} style={{ opacity: 0.6 }}>
          KM
        </Caps>
        <Caps size={112} spacing={0.06} weight={600} style={{ minWidth: 190, textAlign: "right" }}>
          {km}
        </Caps>
      </div>
      <div style={{ marginTop: 10, marginLeft: "auto", height: 2, width: 260, background: "rgba(214,209,201,0.18)" }}>
        <div style={{ height: 2, width: `${km}%`, background: EMBER_CSS }} />
      </div>
    </div>
  );
};

export const Geneve: React.FC<{ t: number }> = ({ t }) => {
  const o = fadeWin(t, T.geneveText[0], T.geneveText[1], 0.9, 0.7);
  if (o <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 150, bottom: BAR + 78, opacity: o }}>
      <Caps size={84} spacing={0.24} weight={500}>
        Genève
      </Caps>
      <Caps size={24} spacing={0.42} weight={500} style={{ opacity: 0.6, marginTop: 8 }}>
        Place des Nations · Broken Chair
      </Caps>
      <div style={{ marginTop: 14, height: 2, width: 66, background: EMBER_CSS, opacity: 0.85 }} />
    </div>
  );
};

// --- cadres vides pour les vraies images ----------------------------------------
const PLANS = [
  { title: "La file de lampes frontales", desc: "La nuit. Une ligne de lumières avance, sans un mot." },
  { title: "Le groupe de marcheurs, de dos", desc: "Ils marchent ensemble, sans se retourner." },
  { title: "Les pieds et le souffle", desc: "Le bruit des pas, la respiration. Rien d'autre." },
];
const tc = (s: number) => {
  const f = Math.round(s * FPS);
  const p = (n: number) => String(n).padStart(2, "0");
  return `00:${p(Math.floor(f / FPS / 60))}:${p(Math.floor(f / FPS) % 60)}:${p(f % FPS)}`;
};

export const Placeholders: React.FC<{ t: number }> = ({ t }) => (
  <>
    {PLANS.map((p, i) => {
      const a = T.plans[i];
      const b = a + T.planLen;
      const o = smoothstep(a, a + 0.35, t) * (1 - smoothstep(b - 0.3, b, t));
      if (o <= 0) return null;
      const bracket = (pos: React.CSSProperties, bt: string, bl: string) => (
        <div style={{ position: "absolute", width: 46, height: 46, borderTop: bt, borderLeft: bl, ...pos }} />
      );
      const e = `2px solid ${EMBER_CSS}`;
      return (
        <div key={i} style={{ position: "absolute", left: 0, right: 0, top: BAR, bottom: BAR, background: "#0d0d0d", opacity: o }}>
          <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
            <line x1="0" y1="0" x2="100%" y2="100%" stroke="rgba(214,209,201,0.06)" strokeWidth="1.5" />
            <line x1="100%" y1="0" x2="0" y2="100%" stroke="rgba(214,209,201,0.06)" strokeWidth="1.5" />
          </svg>
          <div style={{ position: "absolute", inset: 40, border: "1px dashed rgba(214,209,201,0.22)" }} />
          {bracket({ left: 40, top: 40 }, e, e)}
          {bracket({ right: 40, top: 40, transform: "scaleX(-1)" }, e, e)}
          {bracket({ left: 40, bottom: 40, transform: "scaleY(-1)" }, e, e)}
          {bracket({ right: 40, bottom: 40, transform: "scale(-1,-1)" }, e, e)}
          <Caps size={22} spacing={0.42} style={{ position: "absolute", left: 80, top: 76, opacity: 0.75 }}>
            {`Plan 0${i + 1} / 03 · Images réelles à insérer au montage`}
          </Caps>
          <Caps size={22} spacing={0.3} style={{ position: "absolute", right: 80, top: 76, opacity: 0.55 }}>
            {`TC ${tc(a)} → ${tc(b)} · ${T.planLen} s · 2,35:1`}
          </Caps>
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 22 }}>
            <Caps size={64} spacing={0.2} weight={500}>
              {p.title}
            </Caps>
            <div style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 300, fontSize: 36, color: ASH, opacity: 0.7 }}>
              {p.desc}
            </div>
          </AbsoluteFill>
          <Caps size={20} spacing={0.42} style={{ position: "absolute", left: 80, bottom: 74, opacity: 0.45 }}>
            Cadre vide · à remplacer
          </Caps>
          <Caps size={20} spacing={0.42} style={{ position: "absolute", right: 80, bottom: 74, opacity: 0.45 }}>
            {`PLACEHOLDER_PLAN_0${i + 1}`}
          </Caps>
        </div>
      );
    })}
  </>
);

// --- titre qui s'allume comme une braise ------------------------------------------
const TITLE = "LE SILENCE DES OUBLIÉS";
export const Title: React.FC<{ t: number }> = ({ t }) => {
  if (t < T.title - 0.1) return null;
  const tt = t - T.title;
  const r = mulberry32(8);
  const end = 1 - smoothstep(77.3, 78, t);
  const sub = smoothstep(T.subtitle, T.subtitle + 1.4, t);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", opacity: end }}>
      <div style={{ display: "flex", fontFamily: COND, fontWeight: 500, fontSize: 112, letterSpacing: "0.26em", paddingLeft: "0.26em" }}>
        {TITLE.split("").map((ch, i) => {
          const d = 0.04 * i + r() * 0.5;
          const b = smoothstep(d, d + 0.9, tt);
          const fl = 0.88 + 0.12 * Math.sin(t * 17 + i * 3.1) * Math.sin(t * 5.3 + i);
          const settle = 1 - 0.25 * smoothstep(d + 0.9, d + 2.2, tt);
          const k = clamp(b * fl * settle);
          const col = `rgb(${Math.round(40 + 215 * k)}, ${Math.round(10 + 64 * k * k)}, ${Math.round(6 + 22 * k * k)})`;
          return (
            <span
              key={i}
              style={{
                color: col,
                textShadow: `0 0 ${10 + 18 * k}px rgba(255,74,28,${0.55 * k}), 0 0 ${50 * k}px rgba(255,60,20,${0.25 * k})`,
                whiteSpace: "pre",
              }}
            >
              {ch}
            </span>
          );
        })}
      </div>
      <div
        style={{
          marginTop: 30, fontFamily: SERIF, fontStyle: "italic", fontWeight: 300, fontSize: 48, color: ASH,
          opacity: sub * 0.9, filter: `blur(${(1 - sub) * 4}px)`,
        }}
      >
        100 km. Pas un mot.
      </div>
    </AbsoluteFill>
  );
};

// --- noir entre les plans --------------------------------------------------------------
export const blackAt = (t: number) => {
  if (t < T.maquettesStart) return 1;
  let o = 0;
  for (let i = 0; i < 4; i++) {
    const b = shotStart(i);
    if (t >= b) o = Math.max(o, 1 - smoothstep(b, b + 0.8, t));
    else if (i > 0) o = Math.max(o, smoothstep(b - 0.55, b, t));
  }
  o = Math.max(o, smoothstep(T.sceneEnd - 0.8, T.sceneEnd, t));
  return clamp(o);
};

// --- cendres en suspension dans le noir du début ---------------------------------------
export const DarkSpecks: React.FC<{ t: number }> = ({ t }) => {
  const o = smoothstep(1.5, 4.5, t) * (1 - smoothstep(6.5, 7.2, t));
  if (o <= 0) return null;
  const r = mulberry32(31);
  return (
    <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: o }}>
      {Array.from({ length: 70 }, (_, i) => {
        const x = r() * 1920 + Math.sin(t * 0.4 + i) * 12;
        const y = ((r() * 1080 + t * (8 + r() * 14)) % 1080);
        const s = 0.6 + r() * 1.6;
        return <circle key={i} cx={x} cy={y} r={s} fill="#8e8a84" opacity={0.15 + r() * 0.3} />;
      })}
    </svg>
  );
};

export const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ mixBlendMode: "overlay", opacity: 0.32, pointerEvents: "none" }}>
      <svg width="100%" height="100%">
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves={2} seed={frame % 997} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  );
};

export const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{ background: "radial-gradient(ellipse at 50% 48%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.55) 85%, rgba(0,0,0,0.85) 100%)" }}
  />
);

export const Letterbox: React.FC = () => (
  <>
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: BAR, background: "#000" }} />
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: BAR, background: "#000" }} />
  </>
);
