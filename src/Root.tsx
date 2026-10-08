import '@fontsource/noto-sans-jp/400.css';
import '@fontsource/noto-sans-jp/500.css';
import '@fontsource/noto-sans-jp/700.css';

import React from 'react';
import {Composition, staticFile} from 'remotion';
import {getAudioDurationInSeconds} from '@remotion/media-utils';
import scriptJson from './script.json';
import type {AudioDurations, Script} from './types';
import {audioStems, buildTimeline, type Timeline} from './timeline';
import {Main} from './Main';
import {ConsultingSalesComposition} from './consulting/Composition';
import {ExperienceCompositions} from './experience/remotion/Compositions';

const script = scriptJson as Script;

export type MainProps = {
  timeline: Timeline | null;
  hasAmbient: boolean;
};

// 音声ファイルがあれば長さ（秒）を返し、なければ null（素材なしでも動くように）
const probeAudio = async (path: string): Promise<number | null> => {
  const src = staticFile(path);
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    return await getAudioDurationInSeconds(src);
  } catch {
    return null;
  }
};

export const RemotionRoot: React.FC = () => {
  const {fps, width, height, audioExt, ambientFile} = script.meta;
  return (
    <>
    <Composition
      id="OneOnOne"
      component={Main}
      fps={fps}
      width={width}
      height={height}
      durationInFrames={fps}
      defaultProps={{timeline: null, hasAmbient: false} as MainProps}
      calculateMetadata={async () => {
        const audio: AudioDurations = {};
        await Promise.all(
          audioStems(script).map(async (stem) => {
            const seconds = await probeAudio(`audio/${stem}.${audioExt}`);
            if (seconds !== null) audio[stem] = seconds;
          }),
        );
        const hasAmbient = (await probeAudio(`audio/${ambientFile}`)) !== null;
        const timeline = buildTimeline(script, audio);
        return {
          durationInFrames: timeline.totalFrames,
          props: {timeline, hasAmbient},
        };
      }}
    />
    {/* 新卒採用向け「コンサルティング営業体験」導入動画 */}
    <ConsultingSalesComposition />
    <ExperienceCompositions />
    </>
  );
};
