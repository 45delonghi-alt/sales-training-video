// Root に登録する Composition。ナレーションの配置（narrationTiming.json）から尺を決める。
import React from 'react';
import {Composition, staticFile} from 'remotion';
import {script} from './script';
import type {NarrationTiming} from './types';
import narrationTiming from './narrationTiming.json';
import {buildTimeline} from './timeline';
import {ConsultingSales, type ConsultingProps} from './ConsultingSales';

// BGM ファイルがあるか（素材なしでも動くように）
const exists = async (path: string) => {
  try {
    return (await fetch(staticFile(path), {method: 'HEAD'})).ok;
  } catch {
    return false;
  }
};

export const ConsultingSalesComposition: React.FC = () => {
  const {fps, width, height, bgmFile} = script.meta;
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
        const timeline = buildTimeline(script, narrationTiming as NarrationTiming);
        const hasBgm = await exists(bgmFile);
        return {durationInFrames: timeline.totalFrames, props: {timeline, hasBgm}};
      }}
    />
  );
};
