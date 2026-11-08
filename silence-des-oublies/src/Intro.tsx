import { loadFont } from "@remotion/fonts";
import { ThreeCanvas } from "@remotion/three";
import React, { useEffect, useState } from "react";
import { AbsoluteFill, Audio, Sequence, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import * as THREE from "three";
import {
  CountryNames, Counter, DarkSpecks, Geneve, Grain, Letterbox, Phrase, Placeholders, Suisse, Title, Vignette, blackAt,
} from "./overlay/Overlay";
import { WORLD_FROM, World } from "./scene/World";
import { FPS, HEIGHT, T, WIDTH } from "./timeline";

const FONTS = [
  { family: "Cormorant Garamond", file: "cormorant-garamond-latin-300-italic.woff2", style: "italic", weight: "300" },
  { family: "Cormorant Garamond", file: "cormorant-garamond-latin-400-italic.woff2", style: "italic", weight: "400" },
  { family: "Barlow Condensed", file: "barlow-condensed-latin-300-normal.woff2", style: "normal", weight: "300" },
  { family: "Barlow Condensed", file: "barlow-condensed-latin-500-normal.woff2", style: "normal", weight: "500" },
  { family: "Barlow Condensed", file: "barlow-condensed-latin-600-normal.woff2", style: "normal", weight: "600" },
];

const useFonts = () => {
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender("polices"));
  useEffect(() => {
    Promise.all(FONTS.map((f) => loadFont({ family: f.family, url: staticFile(`fonts/${f.file}`), style: f.style, weight: f.weight })))
      .then(() => document.fonts.ready)
      .then(() => {
        setReady(true);
        continueRender(handle);
      });
  }, [handle]);
  return ready;
};

export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const ready = useFonts();
  if (!ready) return <AbsoluteFill style={{ background: "#000" }} />;
  // tremblement de pellicule très léger
  const wx = Math.sin(frame * 1.7) * 0.4 + Math.sin(frame * 0.37) * 0.3;
  const wy = Math.cos(frame * 1.3) * 0.3;
  const fl = 1 + 0.018 * Math.sin(frame * 2.1) * Math.sin(frame * 0.71);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Audio src={staticFile("audio/nappe.wav")} />
      <AbsoluteFill style={{ transform: `translate(${wx}px, ${wy}px) scale(1.004)`, filter: `brightness(${fl})` }}>
        <Sequence from={Math.round(WORLD_FROM * FPS)} durationInFrames={Math.round((T.sceneEnd + 0.4 - WORLD_FROM) * FPS)}>
          <ThreeCanvas
            width={WIDTH}
            height={HEIGHT}
            shadows
            gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0 }}
            camera={{ fov: 35, near: 0.1, far: 900, position: [0, 10, 30] }}
          >
            <World />
          </ThreeCanvas>
        </Sequence>
        <Vignette />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "#000", opacity: blackAt(t) }} />
      <DarkSpecks t={t} />
      <Phrase t={t} text="Certains silences sont imposés." win={T.silenceText} />
      <CountryNames t={t} />
      <Phrase t={t} text="Des guerres qu'on n'entend plus." win={T.guerresText} />
      <Phrase t={t} text="Celui-ci est choisi." win={T.choisiText} y={0.3} />
      <Suisse t={t} />
      <Counter t={t} />
      <Geneve t={t} />
      <Placeholders t={t} />
      <Title t={t} />
      <Grain />
      <Letterbox />
    </AbsoluteFill>
  );
};
