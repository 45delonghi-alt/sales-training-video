import React, {useEffect, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender} from 'remotion';
import {TransitionSeries, linearTiming} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import scriptJson from './script.json';
import type {Script} from './types';
import type {SceneTiming} from './timeline';
import type {MainProps} from './Root';
import {DialogueSceneView} from './scenes/DialogueSceneView';
import {
  CompareSceneView,
  EndSceneView,
  ExplainSceneView,
  SummarySceneView,
  TitleSceneView,
} from './scenes/InfoScenes';
import {FONT_FAMILY} from './theme';

const script = scriptJson as Script;

// 台本で使う文字のフォントを読み込み終えるまで描画を待つ（文字化け・フォント切り替わり防止）
const useFonts = () => {
  const [handle] = useState(() => delayRender('Noto Sans JP の読み込み'));
  useEffect(() => {
    const text = JSON.stringify(script);
    Promise.all(
      [400, 500, 700].map((w) => document.fonts.load(`${w} 40px "Noto Sans JP"`, text)),
    ).finally(() => continueRender(handle));
  }, [handle]);
};

const SceneView: React.FC<{timing: SceneTiming; hasAmbient: boolean}> = ({timing, hasAmbient}) => {
  const {scene} = timing;
  switch (scene.type) {
    case 'title':
      return <TitleSceneView scene={scene} />;
    case 'dialogue':
      return (
        <DialogueSceneView
          script={script}
          scene={scene}
          segments={timing.segments}
          hasAmbient={hasAmbient}
        />
      );
    case 'explain':
      return <ExplainSceneView scene={scene} />;
    case 'compare':
      return <CompareSceneView scene={scene} />;
    case 'summary':
      return <SummarySceneView scene={scene} />;
    case 'end':
      return <EndSceneView scene={scene} />;
  }
};

export const Main: React.FC<MainProps> = ({timeline, hasAmbient}) => {
  useFonts();
  if (!timeline) return null;
  return (
    <AbsoluteFill style={{background: '#000', fontFamily: FONT_FAMILY}}>
      <TransitionSeries>
        {timeline.scenes.flatMap((timing, i) => [
          ...(i > 0
            ? [
                <TransitionSeries.Transition
                  key={`t-${timing.scene.id}`}
                  presentation={fade()}
                  timing={linearTiming({durationInFrames: timeline.fadeFrames})}
                />,
              ]
            : []),
          <TransitionSeries.Sequence
            key={timing.scene.id}
            durationInFrames={timing.durationInFrames}
          >
            <SceneView timing={timing} hasAmbient={hasAmbient} />
          </TransitionSeries.Sequence>,
        ])}
      </TransitionSeries>
    </AbsoluteFill>
  );
};
