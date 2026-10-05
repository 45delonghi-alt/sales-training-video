// 光電センサ入門動画の本体：場面の並びと、見出し・字幕・音声の共通レイアウト
import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Audio, Sequence, continueRender, delayRender, staticFile, useCurrentFrame} from 'remotion';
import {TransitionSeries, linearTiming} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {FONT_FAMILY} from '../theme';
import {SENSOR_SCENES} from './script';
import type {SensorSceneTiming, SensorTimeline} from './timeline';
import {SC, ramp, useSpringIn} from './parts';
import {VISUALS} from './visuals';

export type SensorProps = {timeline: SensorTimeline | null};

const useFonts = () => {
  const [handle] = useState(() => delayRender('Noto Sans JP の読み込み'));
  useEffect(() => {
    const text = JSON.stringify(SENSOR_SCENES) + '◎△✕→％0123456789投光受光器背景設定距離角度大小近遠';
    Promise.all([400, 500, 700].map((w) => document.fonts.load(`${w} 40px "Noto Sans JP"`, text))).finally(() =>
      continueRender(handle),
    );
  }, [handle]);
};

const Subtitle: React.FC<{text: string}> = ({text}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 44}}>
      <div
        style={{
          opacity: ramp(frame, 0, 4),
          maxWidth: 1820,
          background: 'rgba(255,255,255,0.97)',
          borderLeft: `12px solid ${SC.beam}`,
          borderRadius: 12,
          padding: '20px 40px',
          fontFamily: FONT_FAMILY,
          fontSize: 42,
          fontWeight: 500,
          lineHeight: 1.45,
          color: SC.ink,
          boxShadow: '0 6px 20px rgba(0,0,0,0.18)',
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

/** ナレーション字幕と音声（音声ファイルがある行だけ再生） */
const Narration: React.FC<{timing: SensorSceneTiming}> = ({timing}) => (
  <>
    {timing.lines.map(({line, from, durationInFrames, hasAudio}) => (
      <Sequence key={line.id} from={from} durationInFrames={durationInFrames} layout="none">
        <Subtitle text={line.text} />
        {hasAudio ? <Audio src={staticFile(`audio/sensor/${line.id}.mp3`)} /> : null}
      </Sequence>
    ))}
  </>
);

const Heading: React.FC<{tag?: string; text: string}> = ({tag, text}) => {
  const s = useSpringIn(0);
  return (
    <div
      style={{
        position: 'absolute',
        left: 70,
        top: 44,
        display: 'flex',
        alignItems: 'center',
        gap: 24,
        opacity: s,
        transform: `translateY(${(1 - s) * -20}px)`,
        fontFamily: FONT_FAMILY,
      }}
    >
      {tag ? (
        <div style={{fontSize: 30, fontWeight: 700, color: '#fff', background: SC.beam, borderRadius: 10, padding: '6px 18px'}}>
          {tag}
        </div>
      ) : null}
      <div style={{fontSize: 64, fontWeight: 700, color: SC.ink, borderBottom: `6px solid ${SC.good}`, paddingBottom: 4}}>
        {text}
      </div>
    </div>
  );
};

const DiagramScene: React.FC<{timing: SensorSceneTiming}> = ({timing}) => {
  const frame = useCurrentFrame();
  const {scene} = timing;
  const at = timing.lines.map((l) => l.from);
  const {diagram, panel} = VISUALS[scene.visual as keyof typeof VISUALS]({frame, at});
  return (
    <AbsoluteFill style={{background: SC.bg}}>
      <Heading tag={scene.tag} text={scene.heading ?? ''} />
      <svg viewBox="0 0 1120 640" style={{position: 'absolute', left: 50, top: 170, width: 1120, height: 640}}>
        <rect x={0} y={0} width={1120} height={640} rx={20} fill="#fff" stroke="#d3d8e3" strokeWidth={2} />
        {diagram}
      </svg>
      <div style={{position: 'absolute', left: 1210, top: 190, width: 660}}>{panel}</div>
      <Narration timing={timing} />
    </AbsoluteFill>
  );
};

const TitleScene: React.FC<{timing: SensorSceneTiming}> = ({timing}) => {
  const frame = useCurrentFrame();
  const s = useSpringIn(4);
  const chips = ['透過型', '回帰反射型', '反射型'];
  return (
    <AbsoluteFill style={{background: 'linear-gradient(135deg, #12306b 0%, #1f5fbf 100%)', fontFamily: FONT_FAMILY}}>
      <div
        style={{
          position: 'absolute',
          top: 230,
          left: 0,
          right: 0,
          textAlign: 'center',
          color: '#fff',
          opacity: s,
          transform: `translateY(${(1 - s) * 30}px)`,
        }}
      >
        <div style={{fontSize: 40, fontWeight: 500, opacity: 0.9}}>オプテックス・エフエー 光電センサ入門</div>
        <div style={{fontSize: 120, fontWeight: 700, marginTop: 20, letterSpacing: 4}}>光電センサ</div>
        <div style={{fontSize: 84, fontWeight: 700}}>
          <span style={{color: '#ffb066'}}>3つ</span>の検出方式
        </div>
      </div>
      <div style={{position: 'absolute', top: 640, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 36}}>
        {chips.map((c, i) => (
          <div
            key={c}
            style={{
              opacity: ramp(frame, 18 + i * 8),
              fontSize: 44,
              fontWeight: 700,
              color: SC.good,
              background: '#fff',
              borderRadius: 40,
              padding: '10px 40px',
            }}
          >
            {c}
          </div>
        ))}
      </div>
      <Narration timing={timing} />
    </AbsoluteFill>
  );
};

const SUMMARY_ROWS = [
  {name: '透過型', when: '確実に・長い距離で検出したい', care: '両側に設置・配線', sub: false, group: 0},
  {name: '回帰反射型', when: '配線を片側にまとめたい', care: '光沢物は偏光フィルタ付き', sub: false, group: 0},
  {name: '透明体専用', when: 'ペットボトル・ガラスを検出したい', care: '回帰反射型の一種', sub: true, group: 1},
  {name: '反射型', when: 'センサ1台・省スペースで', care: '色・形・背景で不安定に', sub: false, group: 1},
  {name: '距離設定型', when: '色のばらつきや背景がある', care: '反射型の一種（BGS）', sub: true, group: 1},
];

const SummaryScene: React.FC<{timing: SensorSceneTiming}> = ({timing}) => {
  const frame = useCurrentFrame();
  const at = timing.lines.map((l) => l.from);
  const cell: React.CSSProperties = {padding: '16px 24px', fontSize: 34, borderBottom: '2px solid #dde2ec'};
  const banner = useSpringIn(at[2] + 6);
  return (
    <AbsoluteFill style={{background: SC.bg, fontFamily: FONT_FAMILY}}>
      <Heading text={timing.scene.heading ?? ''} />
      <div style={{position: 'absolute', left: 70, top: 170, width: 1780, background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 14px rgba(0,0,0,0.08)'}}>
        <div style={{display: 'grid', gridTemplateColumns: '360px 1fr 560px', background: SC.good, color: '#fff', fontWeight: 700}}>
          <div style={{...cell, fontSize: 30, borderBottom: 'none'}}>方式</div>
          <div style={{...cell, fontSize: 30, borderBottom: 'none'}}>こんなときに</div>
          <div style={{...cell, fontSize: 30, borderBottom: 'none'}}>注意点</div>
        </div>
        {SUMMARY_ROWS.map((r, i) => {
          const start = at[r.group] + 10 + i * 6;
          return (
            <div
              key={r.name}
              style={{display: 'grid', gridTemplateColumns: '360px 1fr 560px', opacity: ramp(frame, start, 10), color: SC.ink}}
            >
              <div style={{...cell, fontWeight: 700, paddingLeft: r.sub ? 64 : 24}}>
                {r.sub ? <span style={{color: SC.subInk}}>└ </span> : null}
                {r.name}
              </div>
              <div style={{...cell, fontWeight: 500}}>{r.when}</div>
              <div style={{...cell, fontWeight: 500, color: SC.subInk, fontSize: 30}}>{r.care}</div>
            </div>
          );
        })}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 720,
          display: 'flex',
          justifyContent: 'center',
          opacity: banner,
          transform: `scale(${0.9 + banner * 0.1})`,
        }}
      >
        <div style={{fontSize: 46, fontWeight: 700, color: '#fff', background: SC.beam, borderRadius: 16, padding: '14px 48px'}}>
          何を・どこで・どう検出したいか で選ぶ
        </div>
      </div>
      <Narration timing={timing} />
    </AbsoluteFill>
  );
};

const SceneView: React.FC<{timing: SensorSceneTiming}> = ({timing}) => {
  switch (timing.scene.visual) {
    case 'title':
      return <TitleScene timing={timing} />;
    case 'summary':
      return <SummaryScene timing={timing} />;
    default:
      return <DiagramScene timing={timing} />;
  }
};

export const SensorVideo: React.FC<SensorProps> = ({timeline}) => {
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
          <TransitionSeries.Sequence key={timing.scene.id} durationInFrames={timing.durationInFrames}>
            <SceneView timing={timing} />
          </TransitionSeries.Sequence>,
        ])}
      </TransitionSeries>
    </AbsoluteFill>
  );
};
