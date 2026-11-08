// Toutes les durées sont en secondes. Le film fait 78 s à 30 i/s.
export const FPS = 30;
export const DURATION = 78;
export const WIDTH = 1920;
export const HEIGHT = 1080;
// Format scope 2,35:1 dans un cadre 16:9
export const BAR = Math.round((HEIGHT - WIDTH / 2.35) / 2);

export const T = {
  // 1. Le silence
  silenceText: [2.6, 6.4] as const,
  // 2. Les guerres oubliées : 4 maquettes de 4,5 s
  maquettesStart: 7,
  maquetteLen: 4.5,
  extinguishAt: 2.75, // dans chaque plan, la braise commence à mourir
  extinguishLen: 0.95,
  guerresText: [25.6, 29.6] as const,
  // 3. Le passage
  pullBack: [25, 33.5] as const,
  paperFall: [33.6, 36.4] as const,
  trace: [36.9, 40.4] as const,
  choisiText: [40.2, 43.6] as const,
  // 4. Le décor
  ignite: 43.0,
  burn: [43.3, 47.6] as const,
  suisseText: [46.4, 50.0] as const,
  route: [51.0, 58.2] as const,
  counter: [50.6, 59.4] as const,
  chairRise: [57.4, 59.6] as const,
  geneveText: [59.0, 62.4] as const,
  sceneEnd: 63.0,
  // 5. Les marcheurs
  plans: [63.0, 66.0, 69.0] as const,
  planLen: 3,
  title: 73.0,
  subtitle: 74.7,
};

export const COUNTRIES = ["SOUDAN", "RDC", "GAZA", "YÉMEN"] as const;
export const shotStart = (i: number) => T.maquettesStart + i * T.maquetteLen;
