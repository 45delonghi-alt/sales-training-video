// 会話以外の場面：タイトル、解説（図解）、Before/After 比較、まとめ、エンド。

import React from 'react';
import {AbsoluteFill, Sequence, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import type {
  CompareScene,
  EndScene,
  ExplainBeat,
  ExplainScene,
  SummaryScene,
  TitleScene,
} from '../types';
import {COLORS, FONT_FAMILY} from '../theme';

const useAppear = (startSeconds: number, fadeSeconds = 0.4) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const start = startSeconds * fps;
  return interpolate(frame, [start, start + fadeSeconds * fps], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
};

const Appear: React.FC<{at: number; children: React.ReactNode; style?: React.CSSProperties}> = ({
  at,
  children,
  style,
}) => {
  const opacity = useAppear(at);
  return <div style={{opacity, ...style}}>{children}</div>;
};

// “ ” で囲んだ語を強調表示する
const Emphasize: React.FC<{text: string; color: string}> = ({text, color}) => (
  <>
    {text.split(/(“[^”]+”)/).map((part, i) =>
      part.startsWith('“') ? (
        <span key={i} style={{color}}>
          {part}
        </span>
      ) : (
        <React.Fragment key={i}>{part}</React.Fragment>
      ),
    )}
  </>
);

const Page: React.FC<{children: React.ReactNode; background?: string}> = ({
  children,
  background = COLORS.paper,
}) => (
  <AbsoluteFill
    style={{
      background,
      fontFamily: FONT_FAMILY,
      color: COLORS.ink,
      padding: '90px 120px',
    }}
  >
    {children}
  </AbsoluteFill>
);

const Heading: React.FC<{children: React.ReactNode; kicker?: string}> = ({children, kicker}) => (
  <div style={{marginBottom: 60}}>
    {kicker && (
      <div style={{fontSize: 30, color: COLORS.subInk, fontWeight: 700, marginBottom: 8}}>
        {kicker}
      </div>
    )}
    <div style={{fontSize: 60, fontWeight: 700}}>{children}</div>
  </div>
);

export const TitleSceneView: React.FC<{scene: TitleScene}> = ({scene}) => {
  const sub = useAppear(1);
  return (
    <AbsoluteFill
      style={{
        background: '#000',
        color: '#fff',
        fontFamily: FONT_FAMILY,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 36,
      }}
    >
      <div style={{fontSize: 104, fontWeight: 700, letterSpacing: '0.04em'}}>{scene.title}</div>
      <div style={{fontSize: 46, color: 'rgba(255,255,255,0.75)', opacity: sub}}>
        {scene.subtitle}
      </div>
    </AbsoluteFill>
  );
};

export const ExplainSceneView: React.FC<{scene: ExplainScene}> = ({scene}) => {
  const {fps} = useVideoConfig();
  let from = 0;
  return (
    <Page>
      <Heading kicker="解説">{scene.heading}</Heading>
      {scene.beats.map((beat, i) => {
        const start = from;
        from += beat.seconds;
        return (
          <Sequence
            key={i}
            from={Math.round(start * fps)}
            durationInFrames={Math.round(beat.seconds * fps)}
            layout="none"
          >
            <ExplainBeatView beat={beat} />
          </Sequence>
        );
      })}
    </Page>
  );
};

const ExplainBeatView: React.FC<{beat: ExplainBeat}> = ({beat}) => {
  if (beat.type === 'flow') {
    return (
      <div style={{display: 'flex', alignItems: 'center', gap: 28, marginTop: 160}}>
        {beat.nodes.map((node, i) => {
          const last = i === beat.nodes.length - 1;
          return (
            <React.Fragment key={node}>
              {i > 0 && (
                <Appear at={i * 2.5} style={{fontSize: 56, color: COLORS.before}}>
                  →
                </Appear>
              )}
              <Appear
                at={i * 2.5}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  fontSize: 46,
                  fontWeight: 700,
                  padding: '44px 16px',
                  borderRadius: 14,
                  background: last ? '#4a4d52' : COLORS.beforeBg,
                  color: last ? '#fff' : '#4a4d52',
                }}
              >
                {node}
              </Appear>
            </React.Fragment>
          );
        })}
      </div>
    );
  }
  if (beat.type === 'message') {
    return (
      <Appear
        at={0}
        style={{
          marginTop: 170,
          textAlign: 'center',
          fontSize: 80,
          fontWeight: 700,
        }}
      >
        <Emphasize text={beat.text} color={COLORS.warn} />
      </Appear>
    );
  }
  const per = beat.seconds / (beat.items.length + 0.75);
  return (
    <div>
      <div style={{fontSize: 40, fontWeight: 700, color: COLORS.after, marginBottom: 36}}>
        {beat.title}
      </div>
      {beat.items.map((it, i) => (
        <div
          key={it.after}
          style={{display: 'flex', alignItems: 'center', gap: 32, marginBottom: 34}}
        >
          <Appear
            at={i * per}
            style={{
              width: 560,
              fontSize: 40,
              padding: '26px 32px',
              borderRadius: 12,
              background: COLORS.beforeBg,
              color: '#6a6d72',
            }}
          >
            {it.before}
          </Appear>
          <Appear at={i * per + 2} style={{fontSize: 52, color: COLORS.after}}>
            →
          </Appear>
          <Appear
            at={i * per + 2}
            style={{
              flex: 1,
              fontSize: 44,
              fontWeight: 700,
              padding: '26px 36px',
              borderRadius: 12,
              background: COLORS.after,
              color: '#fff',
            }}
          >
            {it.after}
          </Appear>
        </div>
      ))}
    </div>
  );
};

export const CompareSceneView: React.FC<{scene: CompareScene}> = ({scene}) => {
  const per = (scene.seconds - 4) / scene.rows.length;
  const cell: React.CSSProperties = {padding: '26px 32px', fontSize: 40};
  return (
    <Page>
      <Heading kicker="比較">Before / After</Heading>
      <div style={{display: 'grid', gridTemplateColumns: '330px 1fr 1fr', rowGap: 14, columnGap: 14}}>
        <div />
        <div style={{...cell, background: COLORS.before, color: '#fff', fontWeight: 700, borderRadius: 10}}>
          Before
        </div>
        <div style={{...cell, background: COLORS.after, color: '#fff', fontWeight: 700, borderRadius: 10}}>
          After
        </div>
        {scene.rows.map((r, i) => (
          <React.Fragment key={r.label}>
            <Appear at={1 + i * per} style={{...cell, fontWeight: 700, color: COLORS.subInk, whiteSpace: 'nowrap', fontSize: 36}}>
              {r.label}
            </Appear>
            <Appear at={1 + i * per} style={{...cell, background: COLORS.beforeBg, color: '#5f6267', borderRadius: 10}}>
              {r.before}
            </Appear>
            <Appear
              at={1 + i * per + 1}
              style={{...cell, background: COLORS.afterBg, color: COLORS.after, fontWeight: 700, borderRadius: 10}}
            >
              {r.after}
            </Appear>
          </React.Fragment>
        ))}
      </div>
    </Page>
  );
};

export const SummarySceneView: React.FC<{scene: SummaryScene}> = ({scene}) => (
  <Page>
    <Heading kicker="まとめ">{scene.heading}</Heading>
    {scene.items.map((item, i) => (
      <Appear
        key={item}
        at={1 + i * 4}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 36,
          marginBottom: 40,
          background: '#fff',
          borderRadius: 14,
          padding: '30px 40px',
          boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
        }}
      >
        <div
          style={{
            width: 84,
            height: 84,
            flexShrink: 0,
            borderRadius: '50%',
            background: COLORS.after,
            color: '#fff',
            fontSize: 48,
            fontWeight: 700,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {i + 1}
        </div>
        <div style={{fontSize: 46, fontWeight: 700}}>{item}</div>
      </Appear>
    ))}
  </Page>
);

export const EndSceneView: React.FC<{scene: EndScene}> = ({scene}) => (
  <AbsoluteFill
    style={{
      background: '#14213d',
      color: '#fff',
      fontFamily: FONT_FAMILY,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 44,
      padding: 120,
    }}
  >
    <div
      style={{
        fontSize: 40,
        fontWeight: 700,
        background: '#fff',
        color: '#14213d',
        padding: '8px 40px',
        borderRadius: 8,
      }}
    >
      {scene.label}
    </div>
    <div style={{fontSize: 58, fontWeight: 700, textAlign: 'center', lineHeight: 1.5, whiteSpace: 'nowrap'}}>
      {scene.text}
    </div>
  </AbsoluteFill>
);
