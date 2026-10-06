// 光電センサの原理図（センサ解説Scene用・動く線画）。
// 光はフローする破線で描き、action（モノが光をさえぎる／黒いモノに変わる／判定ラインを出す）で状態が変わる。
import React from 'react';
import {interpolate} from 'remotion';
import type {SensorDiagramKind} from '../types';
import {C} from '../theme';
import {progress} from './anim';

const BEAM = C.red;
const MID = 220;

const Head: React.FC<{x: number; label: string; sub?: string; lensRight?: boolean; lampOn?: boolean}> = ({
  x,
  label,
  sub,
  lensRight = true,
  lampOn,
}) => (
  <g>
    <rect x={x} y={MID - 55} width={90} height={110} rx={10} fill="#3A3D44" />
    <rect x={x + 12} y={MID - 42} width={66} height={8} rx={3} fill="rgba(255,255,255,0.3)" />
    <circle cx={lensRight ? x + 90 : x} cy={MID} r={11} fill={C.red} />
    {lampOn !== undefined ? (
      <circle cx={x + 45} cy={MID + 34} r={7} fill={lampOn ? '#3CCB6B' : '#6B6F76'} />
    ) : null}
    <text x={x + 45} y={MID + 90} textAnchor="middle" fontSize={22} fontWeight={700} fill={C.ink}>
      {label}
    </text>
    {sub ? (
      <text x={x + 45} y={MID + 118} textAnchor="middle" fontSize={17} fill={C.gray}>
        {sub}
      </text>
    ) : null}
  </g>
);

// 流れる光（frame で破線が進む）。p で描画の伸び、dir で向き
const Beam: React.FC<{x1: number; x2: number; y: number; frame: number; p?: number; opacity?: number; dashed?: boolean}> = ({
  x1,
  x2,
  y,
  frame,
  p = 1,
  opacity = 1,
  dashed = true,
}) => {
  const dir = Math.sign(x2 - x1);
  const xe = x1 + (x2 - x1) * p;
  return (
    <g opacity={opacity}>
      <line
        x1={x1}
        y1={y}
        x2={xe - dir * 10}
        y2={y}
        stroke={BEAM}
        strokeWidth={5}
        strokeDasharray={dashed ? '16 10' : undefined}
        strokeDashoffset={-frame * 2 * dir}
      />
      {p > 0.98 ? <path d={`M ${xe} ${y} L ${xe - dir * 16} ${y - 9} L ${xe - dir * 16} ${y + 9} Z`} fill={BEAM} /> : null}
    </g>
  );
};

const Reflector: React.FC<{x: number}> = ({x}) => (
  <g>
    <rect x={x} y={MID - 70} width={28} height={140} fill={C.white} stroke={C.ink} strokeWidth={3} />
    {Array.from({length: 7}, (_, i) => (
      <path key={i} d={`M ${x + 4} ${MID - 62 + i * 19} l 12 8 l -12 8`} fill="none" stroke={C.gray} strokeWidth={2} />
    ))}
    <text x={x + 14} y={MID + 100} textAnchor="middle" fontSize={20} fontWeight={700} fill={C.ink}>
      反射板
    </text>
  </g>
);

const Box: React.FC<{x: number; y: number; fill?: string; label?: string}> = ({x, y, fill = '#E9EAEC', label = '検出物'}) => (
  <g>
    <rect x={x} y={y} width={80} height={120} rx={4} fill={fill} stroke={C.ink2} strokeWidth={3} />
    <text x={x + 40} y={y - 12} textAnchor="middle" fontSize={18} fontWeight={700} fill={C.ink2}>
      {label}
    </text>
  </g>
);

const BOTTLE =
  'M -12 -150 L -12 -132 C -12 -118 -34 -112 -34 -92 L -34 -8 Q -34 0 -26 0 L 26 0 Q 34 0 34 -8 L 34 -92 C 34 -112 12 -118 12 -132 L 12 -150 Z';

export const SensorStage: React.FC<{kind: SensorDiagramKind; frame: number; start: number; action: number | null}> = ({
  kind,
  frame,
  start,
  action,
}) => {
  const enter = progress(frame, start + 4, 20);
  const act = action === null ? 0 : progress(frame, action, 16);

  return (
    <svg viewBox="0 0 1000 440" width="100%" height="100%">
      <line x1={20} y1={MID + 62} x2={980} y2={MID + 62} stroke={C.line} strokeWidth={2} />

      {kind === 'basic' || kind === 'through' ? (
        <>
          <Head x={80} label="投光器" sub="光を出す" />
          <Head x={830} label="受光器" sub="光を受ける" lensRight={false} lampOn={act < 0.8} />
          {kind === 'basic' ? (
            <Beam x1={175} x2={825} y={MID} frame={frame} p={enter} />
          ) : (
            <>
              <Beam x1={175} x2={460} y={MID} frame={frame} p={Math.min(1, enter * 1.6)} />
              <Beam x1={540} x2={825} y={MID} frame={frame} p={enter} opacity={1 - act * 0.88} />
              <Box x={460} y={interpolate(act, [0, 1], [-170, MID - 60])} />
            </>
          )}
        </>
      ) : null}

      {kind === 'retro' ? (
        <>
          <Head x={80} label="投光／受光器" />
          <Reflector x={850} />
          <Beam x1={175} x2={460} y={MID - 18} frame={frame} p={Math.min(1, enter * 1.6)} />
          <Beam x1={540} x2={846} y={MID - 18} frame={frame} p={enter} opacity={1 - act * 0.88} />
          <Beam x1={846} x2={178} y={MID + 18} frame={frame} p={enter} opacity={1 - act * 0.88} />
          <Box x={460} y={interpolate(act, [0, 1], [-170, MID - 60])} />
        </>
      ) : null}

      {kind === 'retroClear' ? (
        <>
          <Head x={60} label="投光／受光器" />
          <Reflector x={640} />
          <Beam x1={155} x2={636} y={MID - 18} frame={frame} p={enter} />
          {/* 透明ボトルを通ると戻る光がわずかに弱まる */}
          <Beam x1={636} x2={430} y={MID + 18} frame={frame} p={enter} />
          <Beam x1={350} x2={158} y={MID + 18} frame={frame} p={enter} opacity={0.6} />
          <g transform={`translate(390, ${MID + 62})`} opacity={enter}>
            <path d={BOTTLE} fill="rgba(140,200,235,0.25)" stroke={C.ink2} strokeWidth={3} />
            <text x={0} y={-168} textAnchor="middle" fontSize={18} fontWeight={700} fill={C.ink2}>
              ペットボトル
            </text>
          </g>
          {/* 受光量のバー */}
          <g opacity={enter}>
            <text x={900} y={50} textAnchor="middle" fontSize={18} fontWeight={700} fill={C.ink}>
              受光量
            </text>
            <rect x={875} y={70} width={50} height={260} fill="#F4F4F2" stroke={C.ink2} strokeWidth={2} />
            <rect x={875} y={70 + 260 * 0.15} width={50} height={260 * 0.85} fill={C.red} opacity={0.85} />
            <text x={900} y={360} textAnchor="middle" fontSize={20} fontWeight={900} fill={C.red}>
              85%
            </text>
            {/* 一般タイプの判定ライン（50%）→ 見逃し */}
            <line x1={760} y1={70 + 130} x2={935} y2={70 + 130} stroke={C.gray} strokeWidth={3} strokeDasharray="8 6" />
            <text x={865} y={70 + 122} textAnchor="end" fontSize={15} fill={C.gray}>
              一般タイプの判定
            </text>
            <rect x={770} y={70 + 138} width={70} height={26} rx={4} fill={C.gray} />
            <text x={805} y={70 + 157} textAnchor="middle" fontSize={15} fontWeight={700} fill={C.white}>
              見逃し
            </text>
          </g>
          {/* 透明体専用の判定ライン（95%）→ 検出 */}
          <g opacity={act}>
            <line x1={760} y1={70 + 13} x2={935} y2={70 + 13} stroke={C.red} strokeWidth={4} />
            <text x={865} y={70 + 5} textAnchor="end" fontSize={15} fontWeight={700} fill={C.red}>
              透明体専用の判定
            </text>
            <rect x={770} y={70 + 21} width={70} height={26} rx={4} fill={C.red} />
            <text x={805} y={70 + 40} textAnchor="middle" fontSize={15} fontWeight={700} fill={C.white}>
              検出
            </text>
          </g>
        </>
      ) : null}

      {kind === 'diffuse' ? (
        <>
          <Head x={80} label="投光／受光器" />
          <Box x={600} y={MID - 60} fill={act > 0.5 ? '#1C1D20' : '#E9EAEC'} label={act > 0.5 ? '黒いモノ' : '検出物'} />
          <Beam x1={175} x2={596} y={MID - 18} frame={frame} p={enter} />
          <Beam x1={596} x2={178} y={MID + 18} frame={frame} p={enter} opacity={1 - act * 0.75} />
        </>
      ) : null}

      {kind === 'bgs' ? (
        <>
          <Head x={80} label="投光／受光器" />
          {/* 受光素子：近い位置／遠い位置 */}
          <g>
            <rect x={50} y={MID + 125} width={80} height={22} fill={act > 0.5 ? C.red : '#D9DBDF'} stroke={C.ink2} strokeWidth={2} />
            <rect x={130} y={MID + 125} width={80} height={22} fill="#D9DBDF" stroke={C.ink2} strokeWidth={2} />
            <text x={90} y={MID + 170} textAnchor="middle" fontSize={15} fontWeight={700} fill={act > 0.5 ? C.red : C.gray}>
              近い＝検出
            </text>
            <text x={170} y={MID + 170} textAnchor="middle" fontSize={15} fill={C.gray}>
              遠い＝無視
            </text>
            <text x={225} y={MID + 142} fontSize={16} fill={C.gray}>
              ← 受光素子：光が戻った位置で距離がわかる
            </text>
          </g>
          <Box x={470} y={MID - 60} />
          {/* 背景 */}
          <rect x={870} y={MID - 120} width={30} height={240} fill="url(#hatch)" stroke={C.grayLight} strokeWidth={2} />
          <defs>
            <pattern id="hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="10" stroke={C.grayLight} strokeWidth="3" />
            </pattern>
          </defs>
          <text x={885} y={MID + 150} textAnchor="middle" fontSize={20} fontWeight={700} fill={C.gray}>
            背景
          </text>
          {/* 設定距離 */}
          <line x1={680} y1={MID - 140} x2={680} y2={MID + 60} stroke={C.ink2} strokeWidth={2} strokeDasharray="8 6" />
          <text x={680} y={MID - 150} textAnchor="middle" fontSize={18} fontWeight={700} fill={C.ink2}>
            設定距離
          </text>
          <Beam x1={175} x2={466} y={MID - 18} frame={frame} p={enter} />
          {/* 戻り光：モノからは素子の手前側へ、背景からは奥側へ（三角測距） */}
          <g opacity={enter}>
            <line x1={466} y1={MID} x2={90} y2={MID + 122} stroke={BEAM} strokeWidth={4} strokeDasharray="14 9" strokeDashoffset={frame * 2} />
            <line x1={866} y1={MID + 10} x2={170} y2={MID + 122} stroke={C.grayLight} strokeWidth={3} strokeDasharray="6 8" opacity={0.8} />
          </g>
        </>
      ) : null}
    </svg>
  );
};
