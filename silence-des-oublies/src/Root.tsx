import { Composition } from "remotion";
import { Intro } from "./Intro";
import { DURATION, FPS, HEIGHT, WIDTH } from "./timeline";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="LeSilenceDesOublies"
    component={Intro}
    durationInFrames={DURATION * FPS}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
  />
);
