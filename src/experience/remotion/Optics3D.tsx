// 光の仕組みの3D CG（CSS の3D変換で描く。追加ライブラリなし）。
// LINE 03 と同じ配置：手前にセンサ、奥に反射板（回帰反射型）。光はコンベアを横切って往復する。
// 透明ボトルは光を通す（少し弱まる）。不透明なモノは光を遮る。
import React from 'react';
import {X} from './theme';
import {BOTTLE_PATH} from './FactoryLine';

const L = 900; // コンベアの長さ（x）
const WD = 300; // コンベアの幅（y）
const BEAM_Z = 92; // 光の高さ
const SENSOR_Y = WD / 2 + 70;
const REFL_Y = -(WD / 2 + 70);

type BoxProps = {x: number; y: number; z: number; w: number; d: number; h: number; color: string; edge: string};

// 直方体（中心 x,y・底面 z）
const Box: React.FC<BoxProps> = ({x, y, z, w, d, h, color, edge}) => {
  const face = (t: string, fw: number, fh: number, shade = 1): React.ReactNode => (
    <div style={{position: 'absolute', width: fw, height: fh, left: -fw / 2, top: -fh / 2, transform: t, background: color, filter: `brightness(${shade})`, border: `2px solid ${edge}`, boxSizing: 'border-box'}} />
  );
  return (
    <div style={{position: 'absolute', transformStyle: 'preserve-3d', transform: `translate3d(${x}px, ${y}px, ${z + h / 2}px)`}}>
      {face(`translateZ(${h / 2}px)`, w, d, 1.25)}
      {face(`rotateX(90deg) translateZ(${d / 2}px)`, w, h, 0.9)}
      {face(`rotateX(-90deg) translateZ(${d / 2}px)`, w, h, 1.0)}
      {face(`rotateY(90deg) translateZ(${w / 2}px)`, h, d, 0.8)}
      {face(`rotateY(-90deg) translateZ(${w / 2}px)`, h, d, 0.8)}
    </div>
  );
};

// 床に平行な光（y 方向に a → b）
const Beam: React.FC<{x: number; a: number; b: number; opacity: number; frame: number; dir: 1 | -1}> = ({x, a, b, opacity, frame, dir}) => {
  const from = Math.min(a, b);
  const len = Math.abs(b - a);
  if (len <= 0) return null;
  return (
    <div
      style={{
        position: 'absolute',
        width: 7,
        height: len,
        transform: `translate3d(${x - 3.5}px, ${from}px, ${BEAM_Z}px)`,
        background: `repeating-linear-gradient(${dir > 0 ? 180 : 0}deg, ${X.beam} 0 14px, transparent 14px 24px)`,
        backgroundPosition: `0 ${frame * 4 * dir}px`,
        opacity,
        boxShadow: `0 0 18px ${X.beam}`,
      }}
    />
  );
};

export type Optics3DProps = {frame: number; fps: number; mode: 'clear' | 'opaque'; width: number; height: number; orbit?: number};

// ボトル（モノ）の位置。周期的に左から右へ横切る
export const objectX = (frame: number, fps: number) => -L / 2 + 60 + (((frame / fps) * 150) % (L - 120));

export const Optics3D: React.FC<Optics3DProps> = ({frame, fps, mode, width, height, orbit = 0}) => {
  const t = frame / fps;
  const angle = -24 + Math.sin(t * 0.35) * 10 + orbit;
  const ox = objectX(frame, fps);
  const near = Math.abs(ox) < 46;
  const blocked = mode === 'opaque' && near;
  const passLight = mode === 'clear' && near;
  return (
    <div style={{position: 'relative', width, height, perspective: 1500, overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: '50%', top: '48%', transformStyle: 'preserve-3d', transform: `rotateX(60deg) rotateZ(${angle}deg)`}}>
        {/* 床 */}
        <div style={{position: 'absolute', width: 1500, height: 1100, left: -750, top: -550, transform: 'translateZ(-60px)', backgroundImage: 'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '60px 60px'}} />
        {/* コンベア */}
        <div
          style={{
            position: 'absolute',
            width: L,
            height: WD,
            left: -L / 2,
            top: -WD / 2,
            background: '#20242A',
            backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.08) 0 2px, transparent 2px 90px)',
            backgroundPosition: `${frame * 2.5}px 0`,
            border: '2px solid rgba(255,255,255,0.45)',
            boxSizing: 'border-box',
          }}
        />
        {/* ガイドレール */}
        <Box x={0} y={-WD / 2 + 8} z={0} w={L} d={6} h={34} color="#3A3F47" edge="rgba(255,255,255,0.35)" />
        <Box x={0} y={WD / 2 - 8} z={0} w={L} d={6} h={34} color="#3A3F47" edge="rgba(255,255,255,0.35)" />
        {/* 反射板（奥） */}
        <Box x={0} y={REFL_Y} z={0} w={14} d={14} h={BEAM_Z - 40} color="#2A2D33" edge="rgba(255,255,255,0.3)" />
        <Box x={0} y={REFL_Y} z={BEAM_Z - 46} w={96} d={10} h={92} color="#33363C" edge="rgba(255,255,255,0.7)" />
        {/* センサ（手前） */}
        <Box x={0} y={SENSOR_Y + 30} z={0} w={14} d={14} h={BEAM_Z - 30} color="#2A2D33" edge="rgba(255,255,255,0.3)" />
        <Box x={0} y={SENSOR_Y} z={BEAM_Z - 34} w={70} d={56} h={64} color="#3B3F46" edge="rgba(255,255,255,0.9)" />
        {/* 光：行き（センサ → 反射板）と帰り（反射板 → センサ） */}
        {blocked ? (
          <Beam x={-9} a={SENSOR_Y - 28} b={46} opacity={0.95} frame={frame} dir={-1} />
        ) : (
          <>
            <Beam x={-9} a={SENSOR_Y - 28} b={passLight ? 40 : REFL_Y + 6} opacity={0.95} frame={frame} dir={-1} />
            {passLight ? <Beam x={-9} a={40} b={REFL_Y + 6} opacity={0.6} frame={frame} dir={-1} /> : null}
            <Beam x={9} a={REFL_Y + 6} b={SENSOR_Y - 28} opacity={passLight ? 0.4 : 0.65} frame={frame} dir={1} />
          </>
        )}
        {/* 検出するモノ */}
        {mode === 'opaque' ? (
          <Box x={ox} y={0} z={0} w={84} d={84} h={180} color="#8E9299" edge={near ? X.redOnDark : 'rgba(255,255,255,0.8)'} />
        ) : (
          <div
            style={{
              position: 'absolute',
              width: 100,
              height: 260,
              transformOrigin: '50px 260px',
              transform: `translate3d(${ox - 50}px, -260px, 0px) rotateZ(${-angle}deg) rotateX(-90deg)`,
            }}
          >
            <svg width={100} height={260} viewBox="-50 -255 100 260">
              <path d={BOTTLE_PATH} fill="rgba(150,205,240,0.16)" stroke={near ? X.redOnDark : 'rgba(255,255,255,0.9)'} strokeWidth={3} />
              {[-120, -96, -72].map((y) => (
                <path key={y} d={`M -42 ${y} Q 0 ${y + 6} 42 ${y}`} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={2} />
              ))}
              <rect x={-16} y={-250} width={32} height={24} rx={3} fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth={3} />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};

// 受光量（0〜1）の模式値：モノが光を横切るあいだだけ変化する
export const receivedLight = (frame: number, fps: number, mode: 'clear' | 'opaque') => {
  const u = (objectX(frame, fps) + 60) / 120; // 光の手前60px〜奥60px を 0〜1
  if (u <= 0 || u >= 1) return 1;
  const bump = Math.sin(Math.PI * u) ** 2;
  if (mode === 'opaque') return 1 - 0.85 * bump;
  const dip = (c: number) => Math.exp(-(((u - c) / 0.1) ** 2));
  return 1 - 0.1 * bump - 0.16 * (dip(0.32) + dip(0.68));
};
