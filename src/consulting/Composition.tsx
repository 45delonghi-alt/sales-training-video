// Root に登録する Composition。音声ファイルの長さを測って尺を決める。
import React from 'react';
import {Composition, staticFile} from 'remotion';
import {getAudioDurationInSeconds} from '@remotion/media-utils';
import {script} from './script';
import type {AudioDurations} from './types';
import {allLines, buildTimeline} from './timeline';
import {ConsultingSales, type ConsultingProps} from './ConsultingSales';

// 音声ファイルがあれば長さ（秒）、無ければ null（素材なしでも動く）
const probeAudio = async (path: string): Promise<number | null> => {
  const src = staticFile(path);
  try {
    const res = await fetch(src, {method: 'HEAD'});
    if (!res.ok) return null;
    return await getAudioDurationInSeconds(src);
  } catch {
    return null;
  }
};

export const ConsultingSalesComposition: React.FC = () => {
  const {fps, width, height, narrationDir, audioExt, bgmFile} = script.meta;
  return (
    <Composition
      id="ConsultingSales"
      component={ConsultingSales}
      fps={fps}
      width={width}
      height={height}
      durationInFrames={fps}
      defaultProps={{timeline: null, hasBgm: false} as ConsultingProps}
      calculateMetadata={async () => {
        const audio: AudioDurations = {};
        await Promise.all(
          allLines(script).map(async ({line}) => {
            const s = await probeAudio(`${narrationDir}/${line.id}.${audioExt}`);
            if (s !== null) audio[line.id] = s;
          }),
        );
        const hasBgm = (await probeAudio(bgmFile)) !== null;
        const timeline = buildTimeline(script, audio);
        return {durationInFrames: timeline.totalFrames, props: {timeline, hasBgm}};
      }}
    />
  );
};
