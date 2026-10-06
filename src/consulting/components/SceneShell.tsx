// 各Sceneの共通枠：ナレーション音声の再生と字幕の表示。
// Scene の中身は useCue() で「どのナレーションのときに出すか」を指定して描く。
import React, {createContext, useContext} from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import type {Cue} from '../types';
import {resolveCue, type SceneTiming} from '../timeline';
import {script} from '../script';
import {C} from '../theme';

const TimingContext = createContext<SceneTiming | null>(null);

export const useCue = () => {
  const timing = useContext(TimingContext);
  const {fps} = useVideoConfig();
  if (!timing) throw new Error('SceneShell の外で useCue は使えません');
  return (cue: Cue) => resolveCue(timing, fps, cue);
};

export const useSceneDuration = () => useContext(TimingContext)?.durationInFrames ?? 0;

export const SceneShell: React.FC<{timing: SceneTiming; children: React.ReactNode}> = ({timing, children}) => (
  <TimingContext.Provider value={timing}>
    <AbsoluteFill>
      {children}
      {timing.lines.map((l) =>
        l.audioFile ? (
          <Sequence key={l.line.id} from={l.from} durationInFrames={l.speechFrames + 15} layout="none">
            <Audio src={staticFile(l.audioFile)} />
          </Sequence>
        ) : null,
      )}
      <Subtitles timing={timing} />
    </AbsoluteFill>
  </TimingContext.Provider>
);

// 重要語句を赤・太字にする
export const Emphasized: React.FC<{text: string; color?: string}> = ({text, color = C.redOnDark}) => {
  const words = script.meta.emphasis;
  const re = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');
  return (
    <>
      {text.split(re).map((part, i) =>
        words.includes(part) ? (
          <span key={i} style={{color, fontWeight: 900}}>
            {part}
          </span>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        ),
      )}
    </>
  );
};

const Subtitles: React.FC<{timing: SceneTiming}> = ({timing}) => {
  const frame = useCurrentFrame();
  const current = timing.lines.flatMap((l) => l.subtitles).find((s) => frame >= s.from && frame < s.to);
  if (!current) return null;
  const local = frame - current.from;
  const opacity = Math.min(1, local / 4);
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 64,
        display: 'flex',
        justifyContent: 'center',
        opacity,
      }}
    >
      <div
        style={{
          background: 'rgba(13,14,16,0.84)',
          color: C.white,
          fontSize: 46,
          fontWeight: 700,
          letterSpacing: 1.5,
          padding: '14px 40px 16px',
          borderLeft: `6px solid ${C.red}`,
          lineHeight: 1.3,
        }}
      >
        <Emphasized text={current.text} />
      </div>
    </div>
  );
};
