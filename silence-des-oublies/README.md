# Le Silence des Oubliés — intro (motion design)

This is the 78-second intro of the documentary *Le Silence des Oubliés* (ZSD). It is built with
[Remotion](https://www.remotion.dev) and three.js. Every element is generated in code: the miniatures
made of ash and grey clay, the fog, the paper map, the Swiss relief, the Broken Chair, the film grain and
the low sound bed. There is no image bank and no AI-generated imagery.

```bash
npm install
npm run dev                                   # Remotion Studio (preview)
npx remotion render LeSilenceDesOublies out/intro.mp4
python3 tools/make_audio.py public/audio/nappe.wav   # regenerate the sound bed (numpy)
```

> Without a GPU (cloud server), add `--gl=swangle`. Use `--browser-executable=…` if Chrome
> isn't downloaded automatically.

## The 5 movements (`src/timeline.ts`)

| Time | Movement | Content |
|---|---|---|
| 0–7 s | 1. Silence | Black, a breath, *« Certains silences sont imposés. »* |
| 7–25 s | 2. Forgotten wars | 4 ash miniatures (SOUDAN, RDC, GAZA, YÉMEN), each ember goes out, *« Des guerres qu'on n'entend plus. »* |
| 25–43 s | 3. The passage | Pull back to the table, falling ash, the paper map of Switzerland, the charcoal line, *« Celui-ci est choisi. »* |
| 43–63 s | 4. The setting | The line catches fire, the paper burns from the line outward and the relief rises; SUISSE, KM 0 → 100, Genève, Broken Chair |
| 63–78 s | 5. The walkers | 3 empty frames for the real footage, black, ember title |

## Where to change things

- **Route**: `ROUTE_LL` in `src/lib/geo.ts`. The current route (north shore of Lake Geneva, Vevey → Place des
  Nations) is an **assumption**. Replace it with the real stages; the counter always runs from 0 to 100.
- **Texts**: `src/Intro.tsx` (sentences) and `src/overlay/Overlay.tsx` (names, counter, title, placeholders).
- **Rhythm**: everything is in `src/timeline.ts` and the camera keyframes in `src/scene/camera.ts`.
- **Miniatures**: `src/scene/dioramas.ts`.

## Real footage (movement 5)

The three placeholder frames are labelled `PLACEHOLDER_PLAN_01` to `_03`, with their timecodes:

| Shot | Timecode | Content |
|---|---|---|
| 01 | 00:01:03:00 → 00:01:06:00 | The line of headlamps in the night |
| 02 | 00:01:06:00 → 00:01:09:00 | The group of walkers, from behind |
| 03 | 00:01:09:00 → 00:01:12:00 | Feet and breath |

The whole film is letterboxed at 2.35:1 (black bars top and bottom). Lay the footage over these frames in
the edit, or drop the files into `public/` and replace the `<Placeholders>` component with `<OffthreadVideo>`.

## Editorial rules followed

No bodies, no blood, no wounds, no flags, no weapons, and no casualty figures on screen. War is evoked only
through miniatures, never shown as if it were real footage. The single colour is the red of an ember.
Sentences are set in italic (Cormorant Garamond); names and the counter in condensed capitals
(Barlow Condensed). Both typefaces are under the SIL Open Font License. The sound is a low sound bed with
no melody.
