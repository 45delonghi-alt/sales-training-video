// 実機デモ（検証台）。実機の映像が届くまでは CG のシミュレーションで「何を見るか」を示す。
// 悪条件の結果は作らない（「実機で測定」と表示し、実測は進行役がアプリに記録する）。
import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {X} from '../theme';
import {scenes} from '../../data';
import {FactoryLine, bottlesAt, passTimes, project, type Flow, type View} from '../FactoryLine';
import {appear, progress} from '../../../consulting/components/anim';

const SENSOR_X = 620;
const SPEED = 200;
const SP = 260;

const FLOWS: Record<string, Flow> = {
  bench: (t, i) => ({x: 180 + i * 0 - i * SP + 600, z: 86}),
  // 1本目のあとに間を空け、見方を説明する時間をつくる
  normal: (t, i) => ({x: -200 + SPEED * t - i * SP - (i >= 1 ? 420 : 0), z: 86}),
  gap: (t, i) => ({x: 120 + SPEED * t - i * 96 - Math.floor(i / 3) * 260, z: 86}),
  orientation: (t, i) => ({x: 120 + SPEED * t - i * SP, z: 86, turn: [-1, 0.2, 1, -0.4, 0.7][((i % 5) + 5) % 5]}),
};

const demoScene = (assetId: string) => scenes.find((s) => s.type === 'demo' && s.assetId === assetId);

export const DemoScene: React.FC<{variant: string}> = ({variant}) => {
  if (variant === 'offset') return <OffsetPlan />;
  if (variant === 'setup-conditions') return <SetupConditions />;
  return <Bench variant={variant} />;
};

const Bench: React.FC<{variant: string}> = ({variant}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const v: View = variant === 'bench' ? {ox: 110, oy: 790, s: 0.95} : {ox: 70, oy: 800, s: 0.82};
  const flow = FLOWS[variant] ?? FLOWS.normal;
  const range: [number, number] = variant === 'bench' ? [0, 0] : variant === 'normal' ? [0, 14] : [-1, 14];
  const bottles = variant === 'bench' ? [{key: 0, x: 380, z: 86}, {key: 1, x: 900, z: 86}] : bottlesAt(flow, t, range, SENSOR_X);
  const passes = variant === 'bench' ? [] : passTimes(flow, t, range, SENSOR_X, fps).filter((p) => p.t <= t);
  const hit = bottles.some((b) => 'state' in b && b.state === 'hit');
  const sim = variant === 'normal';
  const scene = demoScene(`p5-demo-${variant}`);
  return (
    <AbsoluteFill>
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
        <FactoryLine v={v} length={variant === 'bench' ? 1150 : 1260} sensorX={SENSOR_X} bottles={bottles} frame={frame} speed={variant === 'bench' ? 0 : 5} beam={hit ? 'hit' : 'on'} labels sensorLabel="OPTEX-FA センサ（実機）" />
        {variant === 'bench' ? <BenchLabels v={v} frame={frame} /> : null}
      </svg>
      {variant === 'bench' ? null : sim ? (
        <SimPanel passes={passes.length} t={t} passTimes={passes.map((p) => p.t)} frame={frame} hit={hit} />
      ) : (
        <ObservePanel condition={scene && scene.type === 'demo' ? scene.condition : ''} checks={scene && scene.type === 'demo' ? scene.checks : []} frame={frame} fps={fps} />
      )}
    </AbsoluteFill>
  );
};

const BenchLabels: React.FC<{v: View; frame: number}> = ({v, frame}) => {
  const items = [
    {x: 380, y: 250, label: '透明PETボトル（お客様の実物）'},
    {x: 1000, y: -40, label: 'カウンター／PLC'},
  ];
  return (
    <g opacity={progress(frame, 10, 14)}>
      {items.map((it) => {
        const [x, y] = project(v, it.x, it.y, 86);
        return (
          <text key={it.label} x={x} y={y} fill="rgba(255,255,255,0.8)" fontSize={24} fontWeight={700} textAnchor="middle">
            {it.label}
          </text>
        );
      })}
      <rect x={1330} y={640} width={300} height={170} fill="#1D2024" stroke="rgba(255,255,255,0.6)" strokeWidth={2} />
      <text x={1480} y={700} fill="rgba(255,255,255,0.7)" fontSize={22} textAnchor="middle">検出表示 ／ カウンター</text>
      <circle cx={1400} cy={760} r={14} fill="#FFB020" opacity={0.4} />
      <text x={1520} y={772} fill="rgba(255,255,255,0.9)" fontSize={40} fontWeight={900} textAnchor="middle">— —</text>
    </g>
  );
};

// 見方の説明：最初の1本だけで「1本 → 出力ON 1回 → カウント +1」を示す。
// 2本目以降の結果は見せない（実機デモの前に結果をネタバレしない）
const SimPanel: React.FC<{passes: number; t: number; passTimes: number[]; frame: number; hit: boolean}> = ({passes, t, passTimes: times, frame, hit}) => {
  const W = 520;
  const first = times[0];
  const explained = passes >= 1;
  const handover = times.length >= 2 && t >= times[1] - 0.3;
  const span = 4;
  const pts: string[] = [];
  for (let k = 0; k <= 160; k++) {
    const tt = t - span + (k / 160) * span;
    const on = first !== undefined && tt >= first && tt < first + 0.42 && !handover;
    pts.push(`${(k / 160) * W},${on ? 10 : 60}`);
  }
  const val = (n: number) => (handover ? '—' : String(n));
  return (
    <div style={{position: 'absolute', right: 72, top: 150, width: W + 56, background: 'rgba(16,17,19,0.85)', border: '2px solid rgba(255,255,255,0.3)', padding: '20px 28px 24px', color: X.white, fontVariantNumeric: 'tabular-nums', opacity: progress(frame, 6, 14)}}>
      <div style={{fontSize: 18, letterSpacing: 2, color: '#FFB020', fontWeight: 700}}>見方の説明（1本目）</div>
      <div style={{display: 'flex', alignItems: 'center', gap: 14, marginTop: 10}}>
        <div style={{width: 26, height: 26, borderRadius: 13, background: hit && !handover ? '#FFB020' : 'rgba(255,255,255,0.18)', boxShadow: hit && !handover ? '0 0 18px #FFB020' : 'none'}} />
        <div style={{fontSize: 24, fontWeight: 700}}>検出表示 {hit && !handover ? 'ON' : 'OFF'}</div>
      </div>
      {[
        ['通過した本数', explained ? 1 : 0],
        ['出力がONになった回数', explained ? 1 : 0],
        ['カウント値', explained ? 1 : 0],
      ].map(([l, n]) => (
        <div key={l as string} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 12}}>
          <span style={{fontSize: 24, color: 'rgba(255,255,255,0.75)'}}>{l}</span>
          <span style={{fontSize: 46, fontWeight: 900}}>{val(n as number)}</span>
        </div>
      ))}
      <div style={{fontSize: 18, color: 'rgba(255,255,255,0.6)', marginTop: 14}}>センサの出力</div>
      <svg width={W} height={70} style={{marginTop: 6}}>
        <polyline points={pts.join(' ')} fill="none" stroke="#FFB020" strokeWidth={3} />
      </svg>
      <div style={{fontSize: 21, marginTop: 10, color: handover ? '#FFB020' : 'rgba(255,255,255,0.8)', fontWeight: handover ? 900 : 500}}>
        {handover ? 'この先は、実機で確かめる' : '合格の動き：1本 → ON 1回 → カウント +1'}
      </div>
    </div>
  );
};

const ObservePanel: React.FC<{condition: string; checks: string[]; frame: number; fps: number}> = ({condition, checks, frame, fps}) => (
  <div style={{position: 'absolute', right: 72, top: 150, width: 600, background: 'rgba(16,17,19,0.88)', border: '2px solid rgba(255,255,255,0.3)', padding: '22px 28px 26px', color: X.white, ...appear(frame, 6, {dx: 30, dy: 0})}}>
    <div style={{fontSize: 18, letterSpacing: 2, color: 'rgba(255,255,255,0.6)', fontWeight: 700}}>条件</div>
    <div style={{fontSize: 30, fontWeight: 900, marginTop: 4, lineHeight: 1.4}}>{condition}</div>
    <div style={{fontSize: 18, letterSpacing: 2, color: 'rgba(255,255,255,0.6)', fontWeight: 700, marginTop: 20}}>観察すること</div>
    {checks.map((c, i) => (
      <div key={c} style={{fontSize: 24, marginTop: 10, lineHeight: 1.45, ...appear(frame, (1 + i * 0.6) * fps, {dy: 10})}}>・{c}</div>
    ))}
    <div style={{marginTop: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.08)', padding: '12px 16px', ...appear(frame, 3 * fps)}}>
      <span style={{fontSize: 24, fontWeight: 700}}>結果</span>
      <span style={{fontSize: 26, fontWeight: 900, color: '#FFB020'}}>実機で測定する</span>
    </div>
  </div>
);

// 位置ずれ（真上から）
const OffsetPlan: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const y0 = 380;
  const y1 = 700;
  const sx = 640;
  const zs = [0, -70, 60, -30, 80, -80, 20];
  const scene = demoScene('p5-demo-offset');
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: 72, top: 150, fontSize: 26, fontWeight: 700, color: 'rgba(255,255,255,0.75)'}}>真上から見た図</div>
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
        <rect x={0} y={y0} width={1240} height={y1 - y0} fill="#1C1F24" stroke="rgba(255,255,255,0.4)" strokeWidth={2} />
        <rect x={sx - 50} y={y1 + 40} width={100} height={70} rx={8} fill="#2C2F35" stroke="rgba(255,255,255,0.85)" strokeWidth={3} />
        <rect x={sx - 60} y={y0 - 80} width={120} height={34} fill="#2A2D33" stroke="rgba(255,255,255,0.6)" strokeWidth={2} />
        <line x1={sx} y1={y1 + 40} x2={sx} y2={y0 - 46} stroke={X.beam} strokeWidth={4} strokeDasharray="14 10" strokeDashoffset={-frame * 4} />
        {zs.map((z, i) => {
          const x = -200 + (t * 200 + i * 230) % 1600 - 100;
          const near = Math.abs(x - sx) < 70;
          return (
            <g key={i}>
              <circle cx={x} cy={(y0 + y1) / 2 + z} r={60} fill="rgba(150,205,240,0.12)" stroke={near ? X.redOnDark : 'rgba(255,255,255,0.85)'} strokeWidth={near ? 4 : 2.5} />
              <circle cx={x} cy={(y0 + y1) / 2 + z} r={20} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={2} />
            </g>
          );
        })}
        <text x={sx + 80} y={y1 + 84} fill="rgba(255,255,255,0.8)" fontSize={24}>センサ（手前）</text>
        <text x={sx + 80} y={y0 - 56} fill="rgba(255,255,255,0.8)" fontSize={24}>反射板（奥）</text>
      </svg>
      <ObservePanel condition={scene && scene.type === 'demo' ? scene.condition : ''} checks={scene && scene.type === 'demo' ? scene.checks : []} frame={frame} fps={fps} />
    </AbsoluteFill>
  );
};

const SetupConditions: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const cards = [
    {t: '位置ずれ', d: '手前・奥にずらして流す'},
    {t: '間隔が詰まる', d: 'ボトルどうしを近づける'},
    {t: '向きの違い', d: 'ラベル・凹凸の向きを変える'},
  ];
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: 120, top: 160, color: X.white, fontSize: 44, fontWeight: 900, ...appear(frame, 0)}}>
        問題が起きていた条件を<span style={{color: X.redOnDark}}>再現</span>する
      </div>
      <div style={{position: 'absolute', left: 120, right: 120, top: 300, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 30}}>
        {cards.map((c, i) => (
          <div key={c.t} style={{border: '2px solid rgba(255,255,255,0.35)', background: 'rgba(16,17,19,0.8)', padding: '30px 30px 34px', color: X.white, ...appear(frame, (0.6 + i * 0.6) * fps)}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
              <div style={{width: 34, height: 34, border: '3px solid rgba(255,255,255,0.8)'}} />
              <div style={{fontSize: 38, fontWeight: 900}}>{c.t}</div>
            </div>
            <div style={{fontSize: 26, color: 'rgba(255,255,255,0.7)', marginTop: 14}}>{c.d}</div>
            <div style={{fontSize: 20, color: '#FFB020', marginTop: 18}}>範囲は設備担当者と決める</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
