// OPTEX-FA 製品の紹介。製品の外観は公式画像（許諾済み）だけを使い、届くまでは「画像待ち」の枠を出す。
// 架空のセンサの絵で代用しない。型式・仕様は公式情報で確認できたものだけを書く。
import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {X} from '../theme';
import {assetById, linesForAsset} from '../../data';
import {lineSchedule} from '../ClipShell';
import {appear, progress} from '../../../consulting/components/anim';

export const ProductScene: React.FC<{variant: string; imagePath?: string}> = ({variant, imagePath}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const a = assetById.get(variant === 'intro' ? 'p4-product' : 'p4-q4-b');
  const steps = lineSchedule(linesForAsset(a?.assetId ?? ''), a?.dialogAt ?? 0.8).map((l) => Math.round(l.from * fps));
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: 120, top: 190, width: 700, ...appear(frame, 0, {dx: -40, dy: 0, dur: 16})}}>
        <div style={{fontSize: 22, fontWeight: 700, color: X.red, letterSpacing: 2}}>OPTEX-FA</div>
        <div style={{fontSize: 46, fontWeight: 900, color: X.ink, marginTop: 4}}>透明体検出センサ</div>
        <div style={{fontSize: 22, color: X.gray, marginTop: 6}}>回帰反射型 ／ 候補：KR-Qシリーズ ほか（型式は公式情報で確認中）</div>
        <div style={{marginTop: 26, height: 470, background: X.white, border: imagePath ? `1px solid ${X.line}` : `3px dashed ${X.grayLight}`, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          {imagePath ? (
            <Img src={staticFile(imagePath)} style={{maxWidth: '90%', maxHeight: '90%', objectFit: 'contain'}} />
          ) : (
            <div style={{textAlign: 'center', color: X.gray}}>
              <svg width={90} height={70} viewBox="0 0 90 70">
                <rect x={4} y={14} width={82} height={52} rx={8} fill="none" stroke={X.grayLight} strokeWidth={4} />
                <circle cx={45} cy={40} r={16} fill="none" stroke={X.grayLight} strokeWidth={4} />
                <rect x={30} y={4} width={30} height={12} rx={3} fill={X.grayLight} />
              </svg>
              <div style={{fontSize: 30, fontWeight: 700, marginTop: 14}}>公式製品画像</div>
              <div style={{fontSize: 22, marginTop: 6}}>許諾を確認後に配置</div>
              <div style={{fontSize: 18, marginTop: 4}}>public/experience/products/optex-fa/</div>
            </div>
          )}
        </div>
      </div>
      {variant === 'intro' ? <IntroFacts frame={frame} steps={steps} fps={fps} /> : <Proposal frame={frame} fps={fps} />}
    </AbsoluteFill>
  );
};

const Fact: React.FC<{label: string; text: string; frame: number; at: number; accent?: boolean}> = ({label, text, frame, at, accent}) => (
  <div style={{display: 'flex', gap: 24, alignItems: 'baseline', borderBottom: `1px solid ${X.line}`, padding: '20px 0', ...appear(frame, at, {dx: 30, dy: 0})}}>
    <div style={{width: 220, flex: 'none', fontSize: 24, fontWeight: 700, color: accent ? X.red : X.gray}}>{label}</div>
    <div style={{fontSize: 32, fontWeight: 700, color: X.ink, lineHeight: 1.45}}>{text}</div>
  </div>
);

const IntroFacts: React.FC<{frame: number; steps: number[]; fps: number}> = ({frame, steps, fps}) => (
  <div style={{position: 'absolute', left: 900, top: 230, width: 900}}>
    <Fact label="用途" text="PETボトルなど、透明なモノの検出" frame={frame} at={steps[0]} />
    <Fact label="方式" text="回帰反射型（センサと反射板）" frame={frame} at={steps[0] + 0.8 * fps} />
    <Fact label="考え方" text="通過したときの、わずかな光の変化をとらえる" frame={frame} at={steps[1]} />
    <Fact label="期待できること" text="誤カウントを減らせる可能性（検証で確かめる）" frame={frame} at={steps[2]} accent />
    <Fact label="検証が必要な条件" text="ボトルの形・位置・間隔、設置、設定" frame={frame} at={steps[2] + 1.0 * fps} accent />
  </div>
);

const Proposal: React.FC<{frame: number; fps: number}> = ({frame, fps}) => (
  <div style={{position: 'absolute', left: 900, top: 230, width: 900}}>
    <div style={{fontSize: 26, fontWeight: 700, color: X.gray, ...appear(frame, 1.2 * fps)}}>お客様のボトル</div>
    <div style={{display: 'flex', gap: 18, marginTop: 12, ...appear(frame, 1.4 * fps)}}>
      {['透明', '曲面・凹凸', '流れが乱れることがある'].map((t) => (
        <div key={t} style={{fontSize: 30, fontWeight: 700, color: X.ink, border: `2px solid ${X.ink}`, padding: '8px 18px'}}>{t}</div>
      ))}
    </div>
    <div style={{fontSize: 26, fontWeight: 700, color: X.gray, marginTop: 50, ...appear(frame, 2.6 * fps)}}>考え方</div>
    <svg width={900} height={220} style={{marginTop: 10, opacity: progress(frame, 2.8 * fps, 14)}}>
      <rect x={20} y={70} width={80} height={60} rx={8} fill={X.white} stroke={X.ink} strokeWidth={3} />
      <line x1={100} y1={92} x2={760} y2={92} stroke={X.beam} strokeWidth={4} strokeDasharray="14 10" strokeDashoffset={-frame * 4} />
      <line x1={760} y1={110} x2={100} y2={110} stroke={X.beam} strokeWidth={4} strokeDasharray="14 10" strokeDashoffset={-frame * 4} opacity={0.6} />
      <rect x={760} y={55} width={30} height={90} fill={X.ink2} />
      <circle cx={430} cy={100} r={56} fill="rgba(120,180,220,0.18)" stroke={X.red} strokeWidth={3} />
      <text x={430} y={196} textAnchor="middle" fontSize={26} fontWeight={700} fill={X.ink}>ボトルを通った、わずかな光の変化をとらえる</text>
    </svg>
    <div style={{fontSize: 34, fontWeight: 900, color: X.ink, marginTop: 30, ...appear(frame, 4.4 * fps)}}>
      <span style={{color: X.red}}>実際のボトル</span>で確かめる
    </div>
  </div>
);
