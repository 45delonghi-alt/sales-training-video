import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import type {SceneSpec} from '../types';
import {C} from '../theme';
import {Backdrop} from '../components/Backdrop';
import {useCue} from '../components/SceneShell';
import {appear, keyZoom, progress} from '../components/anim';
import {Conveyor} from '../components/Conveyor';

// あなたなら、何を確認しますか？ → 仮説カードを順に表示 → 「ここからが、営業の仕事。」
export const Scene04Question: React.FC<{spec: SceneSpec<'Scene04Question'>}> = ({spec}) => {
  const frame = useCurrentFrame();
  const cue = useCue();
  const {visual: v, animation: a} = spec;
  const optStart = cue(a.options);
  const spoken = a.spoken.map((s) => ({option: s.option, at: cue(s.cue)}));
  const message = cue(a.message);
  const msgP = progress(frame, message, 16);

  // いま読み上げている選択肢（次の選択肢が読まれるか、メッセージが出るまで）
  const current = spoken.filter((s) => frame >= s.at && frame < message).pop();

  const CARD_W = 300;
  const GAP = 28;
  const left0 = (1920 - (CARD_W * 5 + GAP * 4)) / 2;

  return (
    <AbsoluteFill>
      <Backdrop tone="dark" sceneNo={4} />
      {/* 背景：ラインは誤カウントを続けている */}
      <AbsoluteFill style={{opacity: 0.16, filter: 'blur(2px)'}}>
        <Conveyor frame={frame + 900} sensorStart={-100} errorStart={0} />
      </AbsoluteFill>

      {/* 問い */}
      <div
        style={{
          position: 'absolute',
          top: 150,
          left: 0,
          right: 0,
          textAlign: 'center',
          whiteSpace: 'pre-line',
          fontSize: 92,
          fontWeight: 900,
          lineHeight: 1.3,
          color: C.white,
          ...appear(frame, 4, {dy: 30, dur: 18}),
          opacity: progress(frame, 4, 18) * interpolate(msgP, [0, 1], [1, 0.4]),
        }}
      >
        {v.question}
      </div>

      {/* 仮説カード */}
      {v.options.map((opt, i) => {
        const start = optStart + i * 14;
        const isCurrent = current?.option === i;
        const wasSpoken = spoken.some((s) => s.option === i && frame >= s.at);
        return (
          <div
            key={opt}
            style={{
              position: 'absolute',
              top: 480,
              left: left0 + i * (CARD_W + GAP),
              width: CARD_W,
              height: 150,
              ...appear(frame, start, {dy: 30}),
              opacity: progress(frame, start, 14) * interpolate(msgP, [0, 1], [1, 0.28]),
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 40,
                fontWeight: 700,
                color: C.white,
                background: isCurrent ? 'rgba(230,0,18,0.28)' : 'rgba(255,255,255,0.06)',
                border: `2px solid ${isCurrent ? C.redOnDark : wasSpoken ? 'rgba(255,77,87,0.5)' : 'rgba(255,255,255,0.3)'}`,
                transform: `scale(${isCurrent && current ? keyZoom(frame, current.at, 1.1) : 1})`,
              }}
            >
              {opt}
            </div>
          </div>
        );
      })}

      {/* ここからが、営業の仕事。 */}
      <div
        style={{
          position: 'absolute',
          top: 700,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: 96,
          fontWeight: 900,
          color: C.white,
          opacity: msgP,
          transform: `scale(${keyZoom(frame, message)})`,
        }}
      >
        <Highlight text={v.message} word="営業の仕事" />
        <div style={{margin: '10px auto 0', height: 8, width: 980 * progress(frame, message + 8, 16), background: C.red}} />
      </div>
    </AbsoluteFill>
  );
};

export const Highlight: React.FC<{text: string; word: string; color?: string}> = ({text, word, color = C.red}) => {
  const [a, b] = text.split(word);
  if (b === undefined) return <>{text}</>;
  return (
    <>
      {a}
      <span style={{color}}>{word}</span>
      {b}
    </>
  );
};
