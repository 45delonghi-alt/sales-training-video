// 会話の場面（Before / After）。タイムラインの区間ごとに舞台・字幕・音声を切り替える。

import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame} from 'remotion';
import type {DialogueScene, Script} from '../types';
import type {Segment} from '../timeline';
import {Stage} from '../components/Stage';
import {
  ActionCard,
  EvaluationSheet,
  InnerVoice,
  SceneLabel,
  StepIndicator,
  Subtitle,
  Telop,
} from '../components/Overlays';

type Props = {
  script: Script;
  scene: DialogueScene;
  segments: Segment[];
  hasAmbient: boolean;
};

const findSegment = (segments: Segment[], frame: number) => {
  let current = segments[0];
  for (const s of segments) {
    if (s.from <= frame) current = s;
    else break;
  }
  return current;
};

export const DialogueSceneView: React.FC<Props> = ({script, scene, segments, hasAmbient}) => {
  const frame = useCurrentFrame();
  const seg = findSegment(segments, frame);
  if (!seg) return null;
  const {item} = seg;

  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Stage
        script={script}
        poses={seg.poses}
        focus={seg.focus}
        framesInShot={frame - seg.shotStart}
        desaturate={scene.desaturate}
      />

      {seg.sheet.visible && <EvaluationSheet script={script} state={seg.sheet} />}

      {item.type === 'line' && (
        <Subtitle
          speaker={script.characters[item.speaker]}
          text={item.text}
          startFrame={seg.from}
        />
      )}
      {item.type === 'inner' && (
        <InnerVoice
          speaker={script.characters[item.speaker]}
          text={item.text}
          startFrame={seg.from}
        />
      )}
      {item.type === 'telop' && <Telop lines={item.lines} startFrame={seg.from} />}
      {item.type === 'actionCard' && (
        <ActionCard title={item.title} rows={item.rows} startFrame={seg.from} />
      )}

      <SceneLabel label={scene.label} />
      {scene.steps && <StepIndicator steps={scene.steps} current={seg.step} />}

      {/* 台詞の音声（ファイルがあるものだけ）。BGM は流さない */}
      {segments.map((s) =>
        s.item.type === 'line' && s.audioSeconds !== undefined ? (
          <Sequence key={s.item.id} from={s.from} durationInFrames={s.durationInFrames} layout="none">
            <Audio src={staticFile(`audio/${s.item.id}.${script.meta.audioExt}`)} />
          </Sequence>
        ) : null,
      )}
      {/* 環境音（空調音など）を小さく */}
      {hasAmbient && (
        <Audio
          src={staticFile(`audio/${script.meta.ambientFile}`)}
          volume={script.meta.ambientVolume}
          loop
        />
      )}
    </AbsoluteFill>
  );
};
