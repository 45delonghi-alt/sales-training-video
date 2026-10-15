// 導入動画（intro-slides.pptx）と本編をつなぐ場面と、実写風の写真の枠。
//   bridge     … 導入P23「YOUR MISSION／FIRST STEP」を受けて本編を始める
//   clear      … 各フェーズの終わり（PHASE n CLEAR → NEXT）
//   why-clear  … 導入P18（透明体専用）を想起させ、今回のお客様に合う理由だけを示す
//   issue-photo… P3の答え合わせ。導入P12の図は再掲せず、工場の写真とお客様の言葉で
//   cast       … 後半の最初。登場する5人の名前と役割（受領画像）を1人ずつ紹介
// 写真は data/photos.json の枠ごとに、ファイルを置いて ready にすると使われる（置くまでは導入動画と同じ線画で描く）。
import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile} from 'remotion';
import {RedSlash} from '../../../consulting/components/Backdrop';
import {Conveyor} from '../../../consulting/components/Conveyor';
import {progress} from '../../../consulting/components/anim';
import photosJson from '../../data/photos.json';
import {C, FONT, Panel, Red, RedLabel, ap, useSec} from './Kit';

type PhotoSlot = {slot: string; file: string; ready: boolean};
const PHOTOS = new Map((photosJson as {slots: PhotoSlot[]}).slots.map((p) => [p.slot, p]));
export const photoFile = (slot?: string) => {
  const p = slot ? PHOTOS.get(slot) : undefined;
  return p && p.ready ? p.file : undefined;
};

// 写真を画面いっぱいに。ゆっくり寄る。暗い場面は下に黒のグラデーションを重ねて文字を読みやすくする
export const PhotoLayer: React.FC<{slot?: string; tone: 'dark' | 'light'}> = ({slot, tone}) => {
  const {frame, fps} = useSec();
  const file = photoFile(slot);
  if (!file) return null;
  const s = interpolate(frame, [0, 8 * fps], [1.0, 1.06], {extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill>
      <Img src={staticFile(file)} style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${s})`}} />
      <AbsoluteFill
        style={{
          background:
            tone === 'dark'
              ? 'linear-gradient(90deg, rgba(10,11,13,0.92) 0%, rgba(10,11,13,0.78) 45%, rgba(10,11,13,0.25) 100%)'
              : 'linear-gradient(90deg, rgba(243,243,243,0.95) 0%, rgba(243,243,243,0.85) 50%, rgba(243,243,243,0.3) 100%)',
        }}
      />
    </AbsoluteFill>
  );
};

const STEPS = ['聞く', '考える', '課題を見つける', '提案する'];

export const Bridge: React.FC = () => {
  const {frame, fps} = useSec();
  return (
    <AbsoluteFill>
      <RedSlash progress={progress(frame, 0, 20)} left={1560} width={220} opacity={0.95} />
      <RedSlash progress={progress(frame, 4, 20)} left={1830} width={70} opacity={0.6} />
      <div style={{position: 'absolute', left: 140, top: 170}}>
        <div style={{fontSize: 120, fontWeight: 900, letterSpacing: 10, color: C.red, lineHeight: 1.05, ...ap(frame, 0.1, fps, {dx: -60, dy: 0, dur: 18})}}>YOUR MISSION</div>
        <div style={{fontSize: 66, fontWeight: 900, color: C.white, marginTop: 26, ...ap(frame, 0.6, fps)}}>ここからは、あなたが営業担当です。</div>
      </div>
      <div style={{position: 'absolute', left: 140, top: 560, display: 'flex', gap: 22}}>
        {STEPS.map((s, i) => (
          <div key={s} style={{width: 380, height: 170, padding: '20px 26px', background: i === 0 ? C.red : 'rgba(255,255,255,0.06)', border: `2px solid ${i === 0 ? C.red : 'rgba(255,255,255,0.25)'}`, color: C.white, ...ap(frame, 1.4 + i * 0.25, fps)}}>
            <div style={{fontSize: 40, fontWeight: 900}}>{i + 1}</div>
            <div style={{fontSize: 40, fontWeight: 900, marginTop: 10}}>{s}</div>
          </div>
        ))}
      </div>
      <div style={{position: 'absolute', left: 140, top: 770, display: 'flex', alignItems: 'center', gap: 22, background: C.white, padding: '14px 26px', ...ap(frame, 3, fps)}}>
        <RedLabel size={24}>FIRST STEP</RedLabel>
        <span style={{fontSize: 40, fontWeight: 900, color: C.ink}}>まずはお客様に現状を確認</span>
      </div>
    </AbsoluteFill>
  );
};

export type ClearInfo = {head: string; message: string; next: string};

export const Clear: React.FC<{info?: ClearInfo}> = ({info}) => {
  const {frame, fps} = useSec();
  if (!info) return null;
  const n = Number(info.head.match(/\d/)?.[0] ?? 0);
  return (
    <AbsoluteFill>
      <RedSlash progress={progress(frame, 0, 18)} left={1500} width={200} opacity={0.9} />
      <div style={{position: 'absolute', left: 140, top: 250}}>
        <div style={{fontSize: 34, fontWeight: 900, letterSpacing: 8, color: 'rgba(255,255,255,0.7)', ...ap(frame, 0.1, fps)}}>{info.head.replace(' CLEAR', '')}</div>
        <div style={{fontSize: 150, fontWeight: 900, letterSpacing: 14, color: C.red, lineHeight: 1.0, ...ap(frame, 0.25, fps, {dx: -60, dy: 0, dur: 16})}}>CLEAR</div>
        <div style={{fontSize: 70, fontWeight: 900, color: C.white, marginTop: 34, ...ap(frame, 0.8, fps)}}>{info.message}</div>
      </div>
      <div style={{position: 'absolute', left: 140, top: 760, display: 'flex', gap: 14, ...ap(frame, 1.4, fps)}}>
        {STEPS.map((s, i) => (
          <div key={s} style={{padding: '10px 22px', fontSize: 30, fontWeight: 900, color: i < n ? C.white : 'rgba(255,255,255,0.45)', background: i < n ? C.red : 'transparent', border: `2px solid ${i < n ? C.red : 'rgba(255,255,255,0.25)'}`}}>
            {i < n ? '✓ ' : ''}
            {s}
          </div>
        ))}
      </div>
      <div style={{position: 'absolute', right: 160, top: 860, fontSize: 40, fontWeight: 900, color: C.white, ...ap(frame, 2, fps, {dx: 30, dy: 0})}}>
        NEXT <span style={{color: C.redOnDark}}>▶</span> {info.next}
      </div>
    </AbsoluteFill>
  );
};

// 導入P18（透明体専用）のスライドを小さく見せて思い出させる
export const WhyClear: React.FC = () => {
  const {frame, fps} = useSec();
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: 120, top: 210, width: 760, ...ap(frame, 0.2, fps)}}>
        <RedLabel size={26}>導入動画で学んだこと</RedLabel>
        <div style={{marginTop: 16, border: `2px solid ${C.line}`, background: C.white, padding: 10, boxShadow: '0 18px 40px rgba(17,18,20,0.12)'}}>
          <Img src={staticFile('experience/intro/intro_16.jpg')} style={{width: '100%', display: 'block'}} />
        </div>
        <div style={{fontSize: 26, fontWeight: 700, color: C.gray, marginTop: 12}}>導入P18　回帰反射型（透明体専用）</div>
      </div>
      <Panel accent="top" style={{left: 1010, top: 230, width: 800, padding: '34px 42px'}}>
        <div style={{fontSize: 30, fontWeight: 900, color: C.gray, ...ap(frame, 0.6, fps)}}>今回のお客様は</div>
        <div style={{fontSize: 52, fontWeight: 900, lineHeight: 1.35, marginTop: 8, ...ap(frame, 0.9, fps)}}>
          <Red>透明なPETボトル</Red>を
          <br />
          ボトル下部で、横から検出
        </div>
        <div style={{height: 2, background: C.line, margin: '26px 0'}} />
        <div style={{fontSize: 38, fontWeight: 800, lineHeight: 1.5, ...ap(frame, 1.8, fps)}}>わずかな光の変化をとらえる仕組みが、合いそう</div>
      </Panel>
      <div style={{position: 'absolute', left: 1010, top: 630, width: 800, background: C.red, color: C.white, fontSize: 42, fontWeight: 900, padding: '24px 34px', lineHeight: 1.4, ...ap(frame, 3.2, fps)}}>
        ただし、現場で安定するかは
        <br />
        試して確かめる
      </div>
    </AbsoluteFill>
  );
};

export const IssuePhoto: React.FC<{photo?: string}> = ({photo}) => {
  const {frame, fps} = useSec();
  return (
    <AbsoluteFill>
      {photoFile(photo) ? null : (
        <AbsoluteFill style={{opacity: 0.16}}>
          <Conveyor frame={frame + 300} sensorStart={-100} errorStart={null} />
        </AbsoluteFill>
      )}
      <div style={{position: 'absolute', left: 140, top: 250, width: 1100}}>
        <div style={{fontSize: 32, fontWeight: 900, letterSpacing: 4, color: C.redOnDark, ...ap(frame, 0.2, fps)}}>お客様が解決したいこと</div>
        {['正確な数量管理', '数え直し・ライン停止をなくす'].map((t, i) => (
          <div key={t} style={{display: 'flex', alignItems: 'center', gap: 22, marginTop: 26, ...ap(frame, 0.6 + i * 0.6, fps, {dx: -40, dy: 0})}}>
            <div style={{width: 10, height: 76, background: C.red}} />
            <div style={{fontSize: 74, fontWeight: 900, color: C.white}}>{t}</div>
          </div>
        ))}
        <div style={{fontSize: 46, fontWeight: 800, color: 'rgba(255,255,255,0.85)', marginTop: 60, ...ap(frame, 3.5, fps)}}>
          その先に ―― <span style={{color: C.white, fontWeight: 900}}>安定した生産</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ───── 登場する名前と役割（後半の最初・5秒）。受領した一覧画像を出し、下の空いたところに
//   「皆さんは、一番左の『新入社員』になります。」（一番左のカードの下）と、架空の人物であることを表示する
const CAST_SCALE = 0.9;
export const Cast: React.FC = () => {
  const {frame, fps} = useSec();
  const fadeIn = interpolate(frame, [0, 0.4 * fps], [0, 1], {extrapolateRight: 'clamp'});
  const w = 1920 * CAST_SCALE;
  const h = 1080 * CAST_SCALE;
  const left = (1920 - w) / 2;
  // 一番左のカード（あなた）の中央。元画像の x=18〜336（1672幅）
  const youX = left + ((18 + 336) / 2 / 1672) * w;
  return (
    <AbsoluteFill style={{background: '#E9ECF0', opacity: fadeIn, fontFamily: FONT}}>
      <Img src={staticFile('experience/people/cast-intro.jpg')} style={{position: 'absolute', left, top: 0, width: w, height: h}} />
      <div style={{position: 'absolute', left: youX - 40, top: h + 14, display: 'flex', alignItems: 'center', gap: 14, ...ap(frame, 0.3, fps, {dy: 10})}}>
        <span style={{fontSize: 34, color: C.red, fontWeight: 900}}>▲</span>
        <span style={{fontSize: 36, fontWeight: 900, color: C.ink, whiteSpace: 'nowrap'}}>
          皆さんは、一番左の<span style={{color: C.red}}>「新入社員」</span>になります。
        </span>
      </div>
      <div style={{position: 'absolute', right: left, top: h + 34, fontSize: 24, fontWeight: 700, color: '#5B626B', whiteSpace: 'nowrap'}}>※ 登場人物はすべて架空の人物です（研修用）</div>
    </AbsoluteFill>
  );
};
