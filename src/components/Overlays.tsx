// 舞台の上に重ねる表示：字幕、心の声、評価シート、テロップ、行動カード、ラベル類。
// 「派手なアニメーションは使わない」ため、動きは短いフェードのみ。

import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import type {Character, Script} from '../types';
import type {SheetState} from '../timeline';
import {COLORS, FONT_FAMILY} from '../theme';

const useFadeIn = (startFrame: number, frames = 6) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [startFrame, startFrame + frames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
};

// 台詞の字幕：画面下部中央。話者名を色分け（上長：紺、部下：深緑）
export const Subtitle: React.FC<{
  speaker: Character;
  text: string;
  startFrame: number;
}> = ({speaker, text, startFrame}) => {
  const opacity = useFadeIn(startFrame, 4);
  return (
    <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 48}}>
      <div
        style={{
          opacity,
          maxWidth: 1560,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 24,
          background: 'rgba(255,255,255,0.95)',
          borderLeft: `12px solid ${speaker.color}`,
          borderRadius: 12,
          padding: '22px 36px',
          fontFamily: FONT_FAMILY,
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
        }}
      >
        <div
          style={{
            flexShrink: 0,
            background: speaker.color,
            color: '#fff',
            fontSize: 30,
            fontWeight: 700,
            borderRadius: 8,
            padding: '6px 16px',
            marginTop: 6,
          }}
        >
          {speaker.name.split(' ')[0]}
        </div>
        <div
          style={{
            fontSize: 44,
            lineHeight: 1.5,
            color: COLORS.ink,
            fontWeight: 500,
            lineBreak: 'strict',
          }}
        >
          {text}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// 心の声：画面下部に斜体・半透明（音声なし）
export const InnerVoice: React.FC<{
  speaker: Character;
  text: string;
  startFrame: number;
}> = ({speaker, text, startFrame}) => {
  const opacity = useFadeIn(startFrame, 8);
  return (
    <AbsoluteFill style={{justifyContent: 'flex-end'}}>
      <div
        style={{
          opacity,
          height: 300,
          background: 'linear-gradient(transparent, rgba(10,14,22,0.7))',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: 64,
          fontFamily: FONT_FAMILY,
        }}
      >
        <div style={{fontSize: 26, color: 'rgba(255,255,255,0.7)', marginBottom: 10}}>
          （心の声）{speaker.name.split(' ')[0]}
        </div>
        <div
          style={{
            fontSize: 48,
            fontStyle: 'italic',
            color: 'rgba(255,255,255,0.78)',
            letterSpacing: '0.04em',
          }}
        >
          {text}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// 「Before」「After」ラベル（画面右上）
export const SceneLabel: React.FC<{label: string}> = ({label}) => {
  const isAfter = label.toLowerCase() === 'after';
  return (
    <div
      style={{
        position: 'absolute',
        top: 40,
        right: 48,
        background: isAfter ? COLORS.after : COLORS.before,
        color: '#fff',
        fontFamily: FONT_FAMILY,
        fontSize: 38,
        fontWeight: 700,
        letterSpacing: '0.06em',
        padding: '8px 30px',
        borderRadius: 8,
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      }}
    >
      {label}
    </div>
  );
};

const CIRCLED = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨'];

// 現在のステップ（画面左上）
export const StepIndicator: React.FC<{steps: string[]; current: number | null}> = ({
  steps,
  current,
}) => (
  <div
    style={{
      position: 'absolute',
      top: 40,
      left: 48,
      display: 'flex',
      gap: 6,
      alignItems: 'center',
      background: 'rgba(255,255,255,0.88)',
      borderRadius: 10,
      padding: '8px 12px',
      fontFamily: FONT_FAMILY,
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    }}
  >
    {steps.map((s, i) => {
      const n = i + 1;
      const active = n === current;
      const done = current !== null && n < current;
      return (
        <React.Fragment key={s}>
          {i > 0 && <span style={{color: '#9aa3b0', fontSize: 20}}>→</span>}
          <span
            style={{
              fontSize: 24,
              fontWeight: active ? 700 : 500,
              padding: '4px 12px',
              borderRadius: 6,
              background: active ? COLORS.after : 'transparent',
              color: active ? '#fff' : done ? COLORS.after : '#8a909a',
            }}
          >
            {CIRCLED[i]}
            {s}
          </span>
        </React.Fragment>
      );
    })}
  </div>
);

// 評価シート（架空UI）。ノートPCの画面を拡大した見た目
export const EvaluationSheet: React.FC<{script: Script; state: SheetState}> = ({
  script,
  state,
}) => {
  const {sheet} = script;
  const cols = state.showGap ? '2.2fr 1fr 1fr 1fr' : '2.2fr 1fr 1fr';
  const cell: React.CSSProperties = {padding: '16px 24px', fontSize: 34};
  return (
    <AbsoluteFill style={{alignItems: 'center', paddingTop: 120}}>
      <div
        style={{
          width: 1120,
          background: '#2b2f36',
          borderRadius: 16,
          padding: 14,
          boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
          fontFamily: FONT_FAMILY,
        }}
      >
        <div style={{background: '#fff', borderRadius: 6, overflow: 'hidden'}}>
          <div
            style={{
              background: '#eef1f5',
              padding: '14px 24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #d6dbe2',
            }}
          >
            <span style={{fontSize: 30, fontWeight: 700, color: '#24364f'}}>{sheet.title}</span>
            <span style={{fontSize: 24, color: '#5b6068'}}>{sheet.person}</span>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: cols,
              color: '#5b6068',
              background: '#f7f8fa',
              borderBottom: '2px solid #d6dbe2',
              fontWeight: 700,
            }}
          >
            <div style={{...cell, fontSize: 26}}>項目</div>
            <div style={{...cell, fontSize: 26, textAlign: 'center'}}>本人</div>
            <div style={{...cell, fontSize: 26, textAlign: 'center'}}>上長</div>
            {state.showGap && (
              <div style={{...cell, fontSize: 26, textAlign: 'center'}}>Gap</div>
            )}
          </div>
          {sheet.rows.map((r) => {
            const hi = state.highlights.includes(r.item);
            const gap = r.boss - r.self;
            return (
              <div
                key={r.item}
                style={{
                  display: 'grid',
                  gridTemplateColumns: cols,
                  background: hi ? COLORS.highlight : '#fff',
                  borderBottom: '1px solid #e6e9ee',
                  color: hi ? COLORS.ink : '#9aa0a8',
                  fontWeight: hi ? 700 : 400,
                }}
              >
                <div style={cell}>{r.item}</div>
                <div style={{...cell, textAlign: 'center'}}>{r.self}</div>
                <div style={{...cell, textAlign: 'center'}}>{r.boss}</div>
                {state.showGap && (
                  <div
                    style={{
                      ...cell,
                      textAlign: 'center',
                      color: gap === 0 ? '#9aa0a8' : gap > 0 ? COLORS.after : COLORS.warn,
                    }}
                  >
                    {gap > 0 ? `+${gap}` : gap}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// 場面の締めのテロップ（例：所要時間 8分）。1行ずつ順に表示
export const Telop: React.FC<{lines: string[]; startFrame: number}> = ({
  lines,
  startFrame,
}) => {
  const {fps} = useVideoConfig();
  const dim = useFadeIn(startFrame, 10);
  return (
    <AbsoluteFill
      style={{
        background: `rgba(15,18,24,${0.55 * dim})`,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 32,
        fontFamily: FONT_FAMILY,
      }}
    >
      {lines.map((line, i) => (
        <TelopLine key={line} text={line} startFrame={startFrame + Math.round(i * 1.5 * fps)} />
      ))}
    </AbsoluteFill>
  );
};

const TelopLine: React.FC<{text: string; startFrame: number}> = ({text, startFrame}) => {
  const opacity = useFadeIn(startFrame, 10);
  return (
    <div
      style={{
        opacity,
        background: 'rgba(255,255,255,0.96)',
        color: COLORS.ink,
        fontSize: 64,
        fontWeight: 700,
        padding: '22px 56px',
        borderRadius: 12,
      }}
    >
      {text}
    </div>
  );
};

// 行動カード（After の締め）
export const ActionCard: React.FC<{
  title: string;
  rows: {label: string; value: string}[];
  startFrame: number;
}> = ({title, rows, startFrame}) => {
  const {fps} = useVideoConfig();
  const dim = useFadeIn(startFrame, 10);
  return (
    <AbsoluteFill
      style={{
        background: `rgba(15,18,24,${0.5 * dim})`,
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: FONT_FAMILY,
      }}
    >
      <div
        style={{
          opacity: dim,
          width: 1180,
          background: '#fff',
          borderRadius: 18,
          borderTop: `14px solid ${COLORS.after}`,
          padding: '40px 56px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        }}
      >
        <div style={{fontSize: 46, fontWeight: 700, color: COLORS.after, marginBottom: 28}}>
          {title}
        </div>
        {rows.map((r, i) => (
          <ActionRow
            key={r.label}
            label={r.label}
            value={r.value}
            startFrame={startFrame + Math.round((0.6 + i * 0.8) * fps)}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};

const ActionRow: React.FC<{label: string; value: string; startFrame: number}> = ({
  label,
  value,
  startFrame,
}) => {
  const opacity = useFadeIn(startFrame, 8);
  return (
    <div
      style={{
        opacity,
        display: 'flex',
        alignItems: 'center',
        gap: 28,
        padding: '14px 0',
        borderBottom: '1px solid #e6e9ee',
      }}
    >
      <div
        style={{
          width: 130,
          textAlign: 'center',
          background: COLORS.afterBg,
          color: COLORS.after,
          fontSize: 32,
          fontWeight: 700,
          borderRadius: 8,
          padding: '6px 0',
        }}
      >
        {label}
      </div>
      <div style={{fontSize: 42, fontWeight: 500, color: COLORS.ink}}>{value}</div>
    </div>
  );
};
