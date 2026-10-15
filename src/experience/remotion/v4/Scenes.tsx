// 体験パート（後半）の場面。導入動画と同じ作り：白・黒の背景、線で描いたライン・センサ、白いパネル、赤の強調。
// 数値・図の中身は研修用の架空データ／説明用の表現（光の線）で、実測ではない。
import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile} from 'remotion';
import {RedSlash} from '../../../consulting/components/Backdrop';
import {BrandMark} from '../../../consulting/components/BrandMark';
import {Conveyor} from '../../../consulting/components/Conveyor';
import {progress} from '../../../consulting/components/anim';
import {CountHud} from '../../../consulting/scenes/Scene03Mission';
import type {Scene as StoryScene, Speaker} from '../../types';
import {Bridge, Clear, type ClearInfo, IssuePhoto, WhyClear, photoFile} from './Connect';
import {FrontView, LayoutCard, TopView} from './Layout';
import {C, Emph, InkLabel, Panel, Red, RedLabel, type Tone, ap, useSec} from './Kit';

export const WEEKS = [
  {week: '第1週', actual: 10000, count: 10060},
  {week: '第2週', actual: 10000, count: 10300},
  {week: '第3週', actual: 10000, count: 10050},
  {week: '第4週', actual: 10000, count: 10080},
];
const pct = (w: (typeof WEEKS)[number]) => ((w.count - w.actual) / w.actual) * 100;

// 黒い背景の場面（それ以外は白）
const DARK = new Set(['bridge', 'clear', 'issue-photo', 'question', 'hint', 'reflection', 'title', 'miscount', 'talk', 'talk-card', 'sensor-existing', 'beam', 'line-walk', 'message', 'closing', 'ending']);
export const toneOf = (overlay: string): Tone => (DARK.has(overlay) ? 'dark' : 'light');
// 画面中央に大きくセリフを出す場面（下の字幕は出さない）
export const QUOTE = new Set(['talk', 'talk-card', 'question', 'hint', 'reflection']);

const HUD = {line: 'LINE 03 ｜ PET BOTTLE COUNT', actualLabel: '実際の本数', countLabel: 'センサのカウント', alert: '誤カウント発生'};

// ライン（導入動画と同じ線画）。faint で薄く背景に置く
const Line: React.FC<{error?: number | null; faint?: boolean}> = ({error = null, faint}) => {
  const {frame} = useSec();
  return (
    <AbsoluteFill style={{opacity: faint ? 0.16 : 1}}>
      <Conveyor frame={frame + 300} sensorStart={faint ? -100 : 300} errorStart={error === null ? null : error + 300} />
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ 表紙・導入
const Title: React.FC = () => {
  const {frame, fps} = useSec();
  return (
    <AbsoluteFill>
      <RedSlash progress={progress(frame, 0, 20)} left={1560} width={220} opacity={0.95} />
      <RedSlash progress={progress(frame, 4, 20)} left={1830} width={70} opacity={0.6} />
      <div style={{position: 'absolute', left: 160, top: 300}}>
        <div style={{fontSize: 30, letterSpacing: 8, fontWeight: 700, color: 'rgba(255,255,255,0.75)', ...ap(frame, 0.1, fps)}}>CASE｜飲料工場からの相談</div>
        <div style={{fontSize: 136, fontWeight: 900, letterSpacing: 12, color: C.red, lineHeight: 1.05, ...ap(frame, 0.2, fps, {dx: -60, dy: 0, dur: 18})}}>YOUR MISSION</div>
        <div style={{height: 4, background: C.white, width: 1100 * progress(frame, 10, 20), margin: '30px 0 28px'}} />
        <div style={{fontSize: 72, fontWeight: 900, color: C.white, ...ap(frame, 0.6, fps)}}>ペットボトルの誤カウントを解決せよ。</div>
      </div>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ 誤カウント（導入動画と同じライン）
const Miscount: React.FC = () => {
  const {frame, fps} = useSec();
  const err = Math.round(1.2 * fps);
  return (
    <AbsoluteFill>
      <Line error={err} />
      <CountHud frame={frame + 300} start={300} error={err + 300} hud={HUD} />
      <div style={{position: 'absolute', left: 72, top: 200, ...ap(frame, 3.2, fps)}}>
        <div style={{fontSize: 76, fontWeight: 900, color: C.white, lineHeight: 1.15}}>
          実際よりも<Red onDark>多く</Red>
          <br />
          カウントされる…
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ 会話：話者と、いま話しているセリフを大きく
export type QuoteLine = {speaker: Speaker; text: string; from: number};

const Talk: React.FC<{line?: QuoteLine; card?: string; photo?: boolean}> = ({line, card, photo}) => {
  const {frame, fps} = useSec();
  const at = line ? Math.round(line.from * fps) : 0;
  return (
    <AbsoluteFill>
      {photo ? null : <Line faint />}
      {line ? (
        <>
          {/* 名前・所属は顔タグ（SpeakerFace）で出す */}
          <div key={`q-${at}`} style={{position: 'absolute', left: 160, right: card ? 700 : 160, top: 320, ...ap(frame - at, 0, fps, {dy: 18, dur: 12})}}>
            <div style={{display: 'flex', gap: 24}}>
              <div style={{width: 8, background: C.red, flex: 'none'}} />
              <div style={{fontSize: 58, fontWeight: 800, color: C.white, lineHeight: 1.45}}>
                <Emph text={line.text} />
              </div>
            </div>
          </div>
        </>
      ) : null}
      {card ? (
        <div style={{position: 'absolute', right: 120, top: 330, width: 500, ...ap(frame, 1.0, fps, {dx: 30, dy: 0})}}>
          <div style={{fontSize: 24, fontWeight: 900, letterSpacing: 4, color: C.redOnDark, marginBottom: 10}}>POINT</div>
          <div style={{background: C.red, color: C.white, fontSize: 44, fontWeight: 900, lineHeight: 1.4, padding: '28px 34px'}}>{card}</div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ 数字・グラフ
const Figures: React.FC = () => {
  const {frame, fps} = useSec();
  const box = (label: string, value: string, note: string, left: number, at: number) => (
    <Panel accent="top" style={{left, top: 250, width: 780, padding: '36px 44px 48px', ...ap(frame, at, fps)}}>
      <InkLabel size={28}>{label}</InkLabel>
      <div style={{fontSize: 124, fontWeight: 900, color: C.red, lineHeight: 1.15, marginTop: 50, whiteSpace: 'nowrap', letterSpacing: -2, fontVariantNumeric: 'tabular-nums'}}>{value}</div>
      <div style={{fontSize: 38, fontWeight: 800, marginTop: 30, lineHeight: 1.5}}>{note}</div>
    </Panel>
  );
  return (
    <AbsoluteFill>
      {box('通常', '+0.5〜0.8%', '実際の1万本に対して、10,050〜10,080本と数える', 140, 0.3)}
      {box('多い週だけ（最大）', '+3.0%', '10,300本と数えた週がある。毎週ではない', 1000, 1.3)}
    </AbsoluteFill>
  );
};

const Chart: React.FC = () => {
  const {frame, fps} = useSec();
  const w = 1480;
  const h = 470;
  const px = (i: number) => 160 + i * ((w - 300) / 3);
  const py = (v: number) => h - 60 - (v / 4) * (h - 110);
  const draw = interpolate(frame, [0.8 * fps, 3.0 * fps], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const pts = WEEKS.map((wk, i) => [px(i), py(pct(wk))] as const);
  const len = pts.slice(1).reduce((n, p, i) => n + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
  return (
    <Panel style={{left: 140, right: 140, top: 200, height: 680, ...ap(frame, 0.3, fps)}}>
      <div style={{fontSize: 40, fontWeight: 900}}>カウントの誤差（1か月・週ごと）</div>
      <svg width={w} height={h}>
        {[0, 1, 2, 3, 4].map((v) => (
          <g key={v}>
            <line x1={110} x2={w - 40} y1={py(v)} y2={py(v)} stroke={C.line} strokeWidth={2} />
            <text x={92} y={py(v) + 9} textAnchor="end" fontSize={26} fill={C.gray}>
              {v}%
            </text>
          </g>
        ))}
        <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={C.red} strokeWidth={7} strokeDasharray={len} strokeDashoffset={len * (1 - draw)} />
        {pts.map((p, i) => (
          <g key={i} opacity={draw >= i / 3 - 0.001 ? 1 : 0}>
            <circle cx={p[0]} cy={p[1]} r={14} fill={C.red} />
            <text x={p[0]} y={p[1] - 28} textAnchor="middle" fontSize={36} fontWeight={900} fill={i === 1 ? C.red : C.ink}>
              +{pct(WEEKS[i]).toFixed(1)}%
            </text>
            <text x={p[0]} y={h - 14} textAnchor="middle" fontSize={28} fontWeight={700} fill={C.gray}>
              {WEEKS[i].week}
            </text>
          </g>
        ))}
      </svg>
      <div style={{display: 'flex', gap: 24, alignItems: 'center', ...ap(frame, 3.2, fps)}}>
        <RedLabel size={32}>通常は +0.5〜0.8%</RedLabel>
        <span style={{fontSize: 34, fontWeight: 800}}>
          毎週3%ではない。<Red>多い週だけ、最大 +3.0%</Red>
        </span>
      </div>
    </Panel>
  );
};

// ------------------------------------------------------------------ センサ（導入動画と同じライン）
const SensorScene: React.FC<{beam?: boolean}> = ({beam}) => {
  const {frame, fps} = useSec();
  return (
    <AbsoluteFill>
      <Line />
      <Panel tone="dark" style={{left: 72, top: 190, width: 900, ...ap(frame, 0.3, fps)}}>
        <RedLabel>既設センサ</RedLabel>
        <div style={{fontSize: 46, fontWeight: 900, marginTop: 14}}>他社製の回帰反射型 光電センサ</div>
        <div style={{fontSize: 30, fontWeight: 700, marginTop: 14, lineHeight: 1.6, color: 'rgba(255,255,255,0.9)'}}>
          {beam ? (
            <>
              行き：センサ → 反射板　／　戻り：反射板 → <Red onDark>同じセンサ</Red>
              <br />
              ボトルが光をさえぎると、戻る光が変わって1本と数える
            </>
          ) : (
            <>
              センサ（投光・受光）は手前、反射板は奥。
              <br />
              同じ高さで向かい合い、<Red onDark>ボトルの下部</Red>を横から見る
            </>
          )}
        </div>
      </Panel>
    </AbsoluteFill>
  );
};

const LineWalk: React.FC = () => {
  const {frame, fps} = useSec();
  return (
    <AbsoluteFill>
      <Line />
      <Panel tone="dark" style={{left: 72, top: 190, width: 980, ...ap(frame, 0.4, fps)}}>
        <RedLabel>現場で確かめる</RedLabel>
        <div style={{fontSize: 46, fontWeight: 900, marginTop: 14, lineHeight: 1.35}}>
          センサは、<Red onDark>ボトルの下のほう</Red>を
          <br />
          横から見ている
        </div>
      </Panel>
    </AbsoluteFill>
  );
};

const SensorCheck: React.FC = () => {
  const {frame, fps} = useSec();
  const items = ['センサの高さ（ボトルの下部か）', '反射板の角度（正対しているか）', 'センサ・反射板の汚れ', '光が安定して戻っているか'];
  return (
    <AbsoluteFill>
      <Panel style={{left: 140, top: 200, width: 760, height: 660, ...ap(frame, 0.3, fps)}}>
        <div style={{fontSize: 34, fontWeight: 900, marginBottom: 10}}>搬送方向から見たセンサと反射板</div>
        <FrontView w={680} h={520} frame={frame} />
      </Panel>
      <Panel accent="left" style={{left: 960, right: 140, top: 200, height: 660, ...ap(frame, 0.8, fps)}}>
        <div style={{fontSize: 44, fontWeight: 900}}>確認すること</div>
        {items.map((t, i) => (
          <div key={t} style={{display: 'flex', gap: 18, alignItems: 'center', fontSize: 36, fontWeight: 800, marginTop: 34, ...ap(frame, 1.2 + i * 0.6, fps)}}>
            <span style={{width: 48, height: 48, background: C.red, color: C.white, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, flex: 'none'}}>✓</span>
            {t}
          </div>
        ))}
      </Panel>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ 原因の候補
const Cause: React.FC<{no: string; title: string; text: string; wobble?: boolean; gap?: boolean}> = ({no, title, text, wobble, gap}) => {
  const {frame, fps} = useSec();
  const w = 900;
  const xs = [0, 1, 2, 3, 4, 5].map((i) => ((frame * 3 + (gap ? i * 120 + (i % 2) * 60 : i * 190)) % (w + 160)) - 80);
  const tilt = xs.map((_, i) => (wobble ? Math.sin(frame / 5 + i * 1.3) : 0));
  return (
    <AbsoluteFill>
      <Panel style={{left: 140, top: 200, width: 980, height: 660, ...ap(frame, 0.3, fps)}}>
        <div style={{fontSize: 34, fontWeight: 900}}>上から見たライン</div>
        <TopView w={w} h={330} frame={frame} bottlesX={xs} tilt={tilt} />
        {wobble ? (
          <div style={{display: 'flex', gap: 40, alignItems: 'center', marginTop: 6}}>
            <FrontView w={300} h={210} frame={frame} showLabels={false} wobble={1} />
            <div style={{fontSize: 30, fontWeight: 800, lineHeight: 1.5}}>
              横から見ると、
              <br />
              ボトルが<Red>傾いて</Red>光の通り方が変わる
            </div>
          </div>
        ) : (
          <div style={{fontSize: 30, fontWeight: 800, marginTop: 24, lineHeight: 1.5}}>
            間隔が<Red>詰まった</Red>ところで、2本の区切りが分かりにくくなる
          </div>
        )}
      </Panel>
      <Panel accent="left" style={{left: 1160, right: 140, top: 200, height: 660, ...ap(frame, 0.8, fps)}}>
        <RedLabel>原因の候補{no}</RedLabel>
        <div style={{fontSize: 60, fontWeight: 900, marginTop: 24, lineHeight: 1.25}}>{title}</div>
        <div style={{fontSize: 34, fontWeight: 700, marginTop: 24, lineHeight: 1.6, color: C.ink2}}>{text}</div>
        <div style={{fontSize: 26, fontWeight: 700, marginTop: 30, color: C.gray}}>※ まだ仮説。確かめるまで決めつけない</div>
      </Panel>
    </AbsoluteFill>
  );
};

// センサの出力（パルス）と PLC のカウント
const Control: React.FC = () => {
  const {frame, fps} = useSec();
  const w = 1500;
  const pulses = [0.12, 0.38, 0.62, 0.86];
  const x = (frame / fps) * 0.12;
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: 140, right: 140, top: 200, height: 660, background: C.dark, border: `2px solid ${C.ink}`, padding: '30px 40px', color: C.white, ...ap(frame, 0.3, fps)}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 20}}>
          <RedLabel>原因の候補④</RedLabel>
          <span style={{fontSize: 44, fontWeight: 900}}>制御側（PLC）の数え方</span>
        </div>
        <div style={{fontSize: 30, fontWeight: 800, marginTop: 30, color: 'rgba(255,255,255,0.8)'}}>センサの出力（イメージ）</div>
        <svg width={w - 80} height={170}>
          <polyline
            fill="none"
            stroke={C.redOnDark}
            strokeWidth={6}
            points={Array.from({length: 241}, (_, i) => {
              const p = i / 240;
              const on = pulses.some((c) => Math.abs(((p + x) % 1) - c) < 0.03);
              return `${p * (w - 80)},${on ? 24 : 150}`;
            }).join(' ')}
          />
        </svg>
        <div style={{display: 'flex', alignItems: 'baseline', gap: 30, marginTop: 20}}>
          <span style={{fontSize: 30, fontWeight: 800, color: 'rgba(255,255,255,0.8)'}}>PLC のカウント</span>
          <span style={{fontSize: 96, fontWeight: 900, fontVariantNumeric: 'tabular-nums'}}>{1240 + Math.floor((frame / fps) * 1.4)}</span>
          {/* 注記は右に置く（左下は話している人のワイプが出る） */}
          <span style={{marginLeft: 'auto', fontSize: 26, color: 'rgba(255,255,255,0.65)'}}>※ 模式図です。数え方の設定は PLC 側にあります</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const ComparePlc: React.FC = () => {
  const {frame, fps} = useSec();
  const rows: [string, string, string, string][] = [
    ['1本目', '1回', '1', ''],
    ['2本目', '1回', '1', ''],
    ['3本目', '2回', '2', 'センサ側で増えている？'],
    ['4本目', '1回', '1', ''],
    ['5本目', '1回', '2', 'PLC側で増えている？'],
  ];
  return (
    // 表は左下のワイプ（上端 y≈708）より上で終わるように詰める
    <Panel accent="top" style={{left: 140, right: 140, top: 190, height: 500, ...ap(frame, 0.3, fps)}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 20}}>
        <span style={{fontSize: 44, fontWeight: 900}}>センサの出力と、PLCのカウントを同時に記録</span>
        <InkLabel>例：記録の見方（実測ではありません）</InkLabel>
      </div>
      <table style={{width: '100%', borderCollapse: 'collapse', marginTop: 16, fontSize: 32}}>
        <thead>
          <tr style={{color: C.gray, fontSize: 28}}>
            {['ボトル', 'センサの出力', 'PLCのカウント', '読み取れること'].map((h) => (
              <th key={h} style={{textAlign: 'left', borderBottom: `3px solid ${C.ink}`, padding: '10px 14px'}}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r[0]} style={{background: r[3] ? '#FDE8EA' : undefined, ...ap(frame, 0.8 + i * 0.4, fps)}}>
              {r.map((c, j) => (
                <td key={j} style={{padding: '8px 14px', borderBottom: `1.5px solid ${C.line}`, fontWeight: j === 3 ? 900 : 700, color: j === 3 || (r[3] && j > 0) ? C.red : C.ink}}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
};

// 1本の通過中に出力が2回変化する（研修用の仮想検証）
const SignalDouble: React.FC = () => {
  const {frame, fps} = useSec();
  const w = 960;
  const h = 380;
  const p = Math.min(1, frame / (9 * fps));
  const onAt = (q: number) => (q > 0.33 && q < 0.43) || (q > 0.49 && q < 0.6);
  const count = [0.33, 0.49].filter((q) => p > q).length;
  return (
    <AbsoluteFill>
      <Panel style={{left: 140, top: 200, width: 600, height: 660, ...ap(frame, 0.3, fps)}}>
        <RedLabel>原因の候補③（仮説）</RedLabel>
        <div style={{fontSize: 40, fontWeight: 900, marginTop: 16, lineHeight: 1.35}}>透明ボトル下部の光の変化</div>
        <div style={{fontSize: 28, fontWeight: 700, marginTop: 10, lineHeight: 1.5}}>
          底の形・水・揺れで、戻る光の量が<Red>不安定になる可能性</Red>
        </div>
        <FrontView w={520} h={330} frame={frame} wobble={1} />
      </Panel>
      <Panel accent="top" style={{left: 780, right: 140, top: 200, height: 660, ...ap(frame, 1.0, fps)}}>
        <div style={{fontSize: 36, fontWeight: 900}}>ボトル1本が通るあいだのセンサ出力</div>
        <svg width={w} height={h}>
          <rect x={w * 0.3} y={10} width={w * 0.32} height={h - 80} fill="rgba(17,18,20,0.06)" />
          <text x={w * 0.46} y={44} textAnchor="middle" fontSize={28} fill={C.ink2} fontWeight={800}>
            ボトル1本が通過
          </text>
          <polyline
            fill="none"
            stroke={C.red}
            strokeWidth={7}
            points={Array.from({length: 241}, (_, i) => {
              const q = i / 240;
              if (q > p) return null;
              return `${q * w},${onAt(q) ? 80 : h - 90}`;
            })
              .filter(Boolean)
              .join(' ')}
          />
          <text x={0} y={h - 50} fontSize={26} fontWeight={700} fill={C.gray}>
            OFF
          </text>
          <text x={0} y={72} fontSize={26} fontWeight={700} fill={C.gray}>
            ON
          </text>
          <text x={w - 10} y={h - 20} textAnchor="end" fontSize={48} fontWeight={900} fill={count === 2 ? C.red : C.ink}>
            カウント：{count}
          </text>
        </svg>
        <div style={{fontSize: 44, fontWeight: 900, color: C.red, opacity: count === 2 ? 1 : 0}}>1本なのに 2回 ON → 2本と数える</div>
        <div style={{fontSize: 24, fontWeight: 700, color: C.gray, marginTop: 6}}>研修用の仮想検証（シミュレーション）。実測ではありません</div>
      </Panel>
    </AbsoluteFill>
  );
};

const Isolation: React.FC = () => {
  const {frame, fps} = useSec();
  const items = [
    ['①', 'ボトルの揺れ', '揺れると、光の受け方が変わる可能性'],
    ['②', 'ボトルの接近', '間隔が詰まると、1本ずつ区別しにくい可能性'],
    ['③', '透明ボトルの光の変化', '底の形や水で、戻る光が不安定になる可能性'],
    ['④', '制御側の条件', 'PLCの数え方の設定・ノイズの可能性'],
  ];
  return (
    <AbsoluteFill style={{padding: '200px 140px 200px', display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 30}}>
      {items.map(([no, t, d], i) => (
        <div key={t} style={{background: C.white, border: `2px solid ${C.line}`, borderLeft: `10px solid ${C.red}`, padding: '26px 36px', ...ap(frame, 0.4 + i * 0.7, fps)}}>
          <div style={{fontSize: 30, fontWeight: 900, color: C.red}}>原因の候補{no}</div>
          <div style={{fontSize: 50, fontWeight: 900, marginTop: 4}}>{t}</div>
          <div style={{fontSize: 30, fontWeight: 700, color: C.ink2, marginTop: 8}}>{d}</div>
        </div>
      ))}
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ 課題（導入動画の「影響の連鎖」と同じ形）
const Flow: React.FC<{items: string[]; title?: string; strong?: number}> = ({items, title, strong}) => {
  const {frame, fps} = useSec();
  return (
    <AbsoluteFill style={{alignItems: 'center', paddingTop: title ? 190 : 230}}>
      {title ? <div style={{fontSize: 48, fontWeight: 900, marginBottom: 20, ...ap(frame, 0.2, fps)}}>{title}</div> : null}
      {items.map((t, i) => (
        <div key={t} style={{display: 'flex', flexDirection: 'column', alignItems: 'center', ...ap(frame, 0.5 + i * 0.9, fps)}}>
          {i ? <div style={{color: C.red, fontSize: 40, lineHeight: 1.2}}>▼</div> : null}
          <div style={{width: 1100, textAlign: 'center', fontSize: 50, fontWeight: 900, padding: '24px 30px', background: i === strong ? C.red : i === 0 ? C.white : C.ink, color: i === 0 && i !== strong ? C.ink : C.white, border: i === 0 && i !== strong ? `3px solid ${C.ink}` : undefined}}>
            {t}
          </div>
        </div>
      ))}
    </AbsoluteFill>
  );
};

const Issues3: React.FC = () => {
  const {frame, fps} = useSec();
  const items = ['正確な本数管理', '数量確認の手戻りを減らす', '安定した生産'];
  return (
    <AbsoluteFill style={{alignItems: 'center', paddingTop: 220}}>
      <div style={{display: 'flex', gap: 36}}>
        {items.map((t, i) => (
          <div key={t} style={{width: 510, height: 300, background: i === 2 ? C.ink : C.white, color: i === 2 ? C.white : C.ink, border: `2px solid ${i === 2 ? C.ink : C.line}`, borderTop: `12px solid ${C.red}`, padding: '34px 36px', ...ap(frame, 0.5 + i * 0.9, fps)}}>
            <div style={{fontSize: 36, fontWeight: 900, color: i === 2 ? C.redOnDark : C.red}}>課題 {i + 1}</div>
            <div style={{fontSize: 56, fontWeight: 900, marginTop: 14, lineHeight: 1.3}}>{t}</div>
          </div>
        ))}
      </div>
      <div style={{marginTop: 60, fontSize: 56, fontWeight: 900, color: C.white, background: C.red, padding: '20px 50px', ...ap(frame, 4.2, fps)}}>
        欲しいのは、新しいセンサではなく「安定した生産」
      </div>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ 製品（公式画像のみ）
const Product: React.FC<{imagePath?: string}> = ({imagePath}) => {
  const {frame, fps} = useSec();
  return (
    <AbsoluteFill>
      <Panel style={{left: 140, top: 200, width: 640, height: 660, display: 'flex', alignItems: 'center', justifyContent: 'center', ...ap(frame, 0.3, fps)}}>
        {imagePath ? (
          <Img src={staticFile(imagePath)} style={{maxWidth: '90%', maxHeight: '90%', objectFit: 'contain'}} />
        ) : (
          <div style={{width: 520, height: 520, border: `3px dashed ${C.grayLight}`, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: 32, fontWeight: 800, color: C.gray, lineHeight: 1.6}}>
            公式製品画像
            <br />
            （許諾確認後に配置）
          </div>
        )}
      </Panel>
      <Panel accent="top" style={{left: 820, right: 140, top: 200, height: 660, ...ap(frame, 0.8, fps)}}>
        <div style={{fontSize: 34, fontWeight: 900, color: C.red, letterSpacing: 2}}>OPTEX-FA</div>
        <div style={{fontSize: 96, fontWeight: 900, lineHeight: 1.1}}>KR-Qシリーズ</div>
        <div style={{fontSize: 34, fontWeight: 800, marginTop: 10}}>透明体検出タイプ ／ 回帰反射型（反射ミラー使用）</div>
        <div style={{marginTop: 30}}>
          {['センサと反射板を向かい合わせて、ボトル下部を横から検出', '今のセンサとの違いは、公式の仕様で確認', '性能は、お客様のボトルで確かめる'].map((t, i) => (
            <div key={t} style={{display: 'flex', gap: 16, fontSize: 34, fontWeight: 800, marginBottom: 18, ...ap(frame, 1.4 + i * 0.8, fps)}}>
              <span style={{color: C.red, fontWeight: 900}}>✓</span>
              {t}
            </div>
          ))}
        </div>
        <div style={{fontSize: 22, fontWeight: 600, color: C.gray, marginTop: 10}}>型式と仕様は、メーカー公式資料で確認してから表示します</div>
      </Panel>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ 設置・比較デモ
const Setup: React.FC = () => {
  const {frame, fps} = useSec();
  const list = (title: string, items: string[], at: number) => (
    <div style={{marginTop: 30, ...ap(frame, at, fps)}}>
      <InkLabel size={26}>{title}</InkLabel>
      <div style={{fontSize: 36, fontWeight: 800, marginTop: 10}}>{items.join('・')}</div>
    </div>
  );
  return (
    <AbsoluteFill>
      <Panel style={{left: 140, top: 190, width: 640, height: 690, ...ap(frame, 0.3, fps)}}>
        <LayoutCard frame={frame} />
      </Panel>
      <Panel accent="top" style={{left: 820, right: 140, top: 190, height: 690, ...ap(frame, 0.8, fps)}}>
        <div style={{fontSize: 46, fontWeight: 900, lineHeight: 1.35}}>
          既設センサ と KR-Qシリーズ を、
          <br />
          <Red>同じ条件</Red>で比べる
        </div>
        {list('同じにする', ['ボトル', '搬送速度', '設置の高さ（ボトル下部）'], 1.4)}
        {list('それぞれに合わせる', ['反射板', '設定（各メーカーの使用条件）'], 2.4)}
        {list('測るもの', ['通過本数', 'センサの出力回数', 'PLCのカウント値'], 3.4)}
      </Panel>
    </AbsoluteFill>
  );
};

const Criteria: React.FC = () => {
  const {frame, fps} = useSec();
  return (
    <Panel accent="top" style={{left: 240, right: 240, top: 240, height: 560, ...ap(frame, 0.3, fps)}}>
      <div style={{fontSize: 52, fontWeight: 900}}>合格の基準（試す前に決める）</div>
      <div style={{fontSize: 52, fontWeight: 900, marginTop: 60, ...ap(frame, 0.9, fps)}}>
        <Red>①</Red> ボトル1本につき、出力は1回
      </div>
      <div style={{fontSize: 52, fontWeight: 900, marginTop: 40, ...ap(frame, 1.9, fps)}}>
        <Red>②</Red> 通過本数 ＝ 出力回数 ＝ <Red>PLCのカウント</Red>
      </div>
    </Panel>
  );
};

const DEMO: Record<string, {title: string; wobble?: boolean; gap?: boolean; height?: boolean}> = {
  'demo-normal': {title: '通常搬送'},
  'demo-wobble': {title: 'ボトルの揺れ', wobble: true},
  'demo-gap': {title: '間隔の変化', gap: true},
  'demo-height': {title: '検出高さの比較', height: true},
};

// 比較デモの見方（シミュレーション）。結果は実機で記録する（ここでは結果を描かない）
const Demo: React.FC<{variant: string}> = ({variant}) => {
  const {frame, fps} = useSec();
  const d = DEMO[variant];
  const w = 820;
  const xs = [0, 1, 2, 3, 4, 5].map((i) => ((frame * 3 + i * (d.gap ? 100 + (i % 2) * 70 : 170)) % (w + 160)) - 80);
  const tilt = xs.map((_, i) => (d.wobble ? Math.sin(frame / 5 + i) : 0));
  const box = (name: string) => (
    <div style={{flex: 1, border: `2px solid ${C.line}`, padding: '20px 24px'}}>
      <div style={{fontSize: 32, fontWeight: 900}}>{name}</div>
      <div style={{fontSize: 26, fontWeight: 700, color: C.gray, marginTop: 8, lineHeight: 1.5}}>通過本数／出力回数／PLCカウント</div>
      <div style={{fontSize: 40, fontWeight: 900, color: C.red, marginTop: 12}}>実機で記録</div>
    </div>
  );
  return (
    <AbsoluteFill>
      <Panel style={{left: 140, top: 190, width: 900, height: 690, ...ap(frame, 0.3, fps)}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
          <RedLabel>シミュレーション</RedLabel>
          <span style={{fontSize: 26, fontWeight: 700, color: C.gray}}>見方の説明です（実測結果ではありません）</span>
        </div>
        <div style={{fontSize: 52, fontWeight: 900, marginTop: 20}}>条件：{d.title}</div>
        {d.height ? (
          <div style={{display: 'flex', gap: 10, marginTop: 10}}>
            {[0.12, 0.2, 0.35].map((r) => (
              <div key={r} style={{textAlign: 'center'}}>
                <FrontView w={266} h={380} frame={frame} showLabels={false} heightRatio={r} />
                <div style={{fontSize: 28, fontWeight: 900, color: r === 0.2 ? C.red : C.ink}}>{r === 0.2 ? '基準：ボトル下部' : r < 0.2 ? 'より低い' : 'より高い'}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{marginTop: 30}}>
            <TopView w={w} h={380} frame={frame} bottlesX={xs} tilt={tilt} />
          </div>
        )}
      </Panel>
      <Panel accent="top" style={{left: 1080, right: 140, top: 190, height: 690, ...ap(frame, 1.0, fps)}}>
        <div style={{fontSize: 42, fontWeight: 900, lineHeight: 1.35}}>
          <Red>同じ条件</Red>で、
          <br />
          2つのセンサを記録する
        </div>
        <div style={{display: 'flex', flexDirection: 'column', gap: 20, marginTop: 30}}>
          {box('既設センサ（他社製）')}
          {box('KR-Qシリーズ')}
        </div>
      </Panel>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ 結果の比較（改善後は実測が得られるまで未確定）
const Result: React.FC = () => {
  const {frame, fps} = useSec();
  const w = 500;
  const h = 260;
  const px = (i: number) => 60 + i * ((w - 100) / 3);
  const py = (v: number) => h - 40 - (v / 4) * (h - 70);
  return (
    <AbsoluteFill style={{padding: '190px 140px 200px', display: 'flex', flexDirection: 'row', gap: 30}}>
      <div style={{flex: 1, background: C.white, border: `2px solid ${C.line}`, borderTop: `10px solid ${C.ink}`, padding: '26px 32px', ...ap(frame, 0.3, fps)}}>
        <div style={{fontSize: 36, fontWeight: 900}}>改善前（既設センサ）</div>
        <svg width={w} height={h}>
          {[0, 2, 4].map((v) => (
            <line key={v} x1={40} x2={w - 20} y1={py(v)} y2={py(v)} stroke={C.line} strokeWidth={2} />
          ))}
          <polyline points={WEEKS.map((wk, i) => `${px(i)},${py(pct(wk))}`).join(' ')} fill="none" stroke={C.red} strokeWidth={6} />
          {WEEKS.map((wk, i) => (
            <circle key={i} cx={px(i)} cy={py(pct(wk))} r={10} fill={C.red} />
          ))}
        </svg>
        <div style={{fontSize: 34, fontWeight: 900}}>
          通常 <Red>+0.5〜0.8%</Red>
          <br />
          最大 <Red>+3.0%</Red>
        </div>
        <div style={{fontSize: 22, fontWeight: 700, color: C.gray, marginTop: 6}}>研修用の架空データ</div>
      </div>
      <div style={{flex: 1, background: C.white, border: `2px solid ${C.line}`, borderTop: `10px solid ${C.red}`, padding: '26px 32px', ...ap(frame, 1.0, fps)}}>
        <div style={{fontSize: 36, fontWeight: 900}}>KR-Qシリーズでの検証</div>
        <div style={{height: 300, border: `3px dashed ${C.grayLight}`, marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center'}}>
          <div style={{fontSize: 44, fontWeight: 900, lineHeight: 1.5}}>
            実測値が得られるまで
            <br />
            <Red>未確定</Red>
          </div>
        </div>
        <div style={{fontSize: 28, fontWeight: 800, marginTop: 16, lineHeight: 1.5}}>改善後の数値は、実機・実ラインで測ってから示します</div>
      </div>
      <div style={{width: 500, background: C.dark, color: C.white, padding: '26px 32px', ...ap(frame, 2.0, fps)}}>
        <div style={{fontSize: 34, fontWeight: 900}}>結果は3つに分けて扱う</div>
        {[
          ['1', '実測データ', '実機・実ラインで記録した値'],
          ['2', '研修用シミュレーション', '見方の説明。結果ではない'],
          ['3', '期待する改善効果', '確かめる前の見込み'],
        ].map(([n, t, d]) => (
          <div key={n} style={{marginTop: 26}}>
            <div style={{fontSize: 34, fontWeight: 900}}>
              <span style={{color: C.redOnDark}}>{n}.</span> {t}
            </div>
            <div style={{fontSize: 26, fontWeight: 600, color: 'rgba(255,255,255,0.75)', marginTop: 4}}>{d}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const Checklist: React.FC<{title: string; items: string[]}> = ({title, items}) => {
  const {frame, fps} = useSec();
  return (
    <Panel accent="top" style={{left: 340, right: 340, top: 210, height: 640, ...ap(frame, 0.3, fps)}}>
      <div style={{fontSize: 52, fontWeight: 900}}>{title}</div>
      {items.map((t, i) => (
        <div key={t} style={{display: 'flex', gap: 22, alignItems: 'center', fontSize: 42, fontWeight: 800, marginTop: 38, ...ap(frame, 0.8 + i * 0.7, fps)}}>
          <span style={{width: 56, height: 56, background: i < 2 ? C.ink : C.red, color: C.white, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, flex: 'none'}}>{i < 2 ? '✓' : i + 1}</span>
          {t}
        </div>
      ))}
    </Panel>
  );
};

const Grid4: React.FC<{items: [string, string][]}> = ({items}) => {
  const {frame, fps} = useSec();
  return (
    <AbsoluteFill style={{padding: '200px 140px 200px', display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 30}}>
      {items.map(([t, d], i) => (
        <div key={t} style={{background: C.white, border: `2px solid ${C.line}`, borderLeft: `10px solid ${C.red}`, padding: '28px 36px', ...ap(frame, 0.4 + i * 0.6, fps)}}>
          <div style={{fontSize: 50, fontWeight: 900}}>{t}</div>
          <div style={{fontSize: 32, fontWeight: 700, color: C.ink2, marginTop: 10}}>{d}</div>
        </div>
      ))}
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ まとめ（黒＋赤い帯）
const Center: React.FC<{lines: React.ReactNode[]; at?: number[]}> = ({lines, at = []}) => {
  const {frame, fps} = useSec();
  return (
    <AbsoluteFill>
      <RedSlash progress={progress(frame, 0, 20)} left={1500} width={200} opacity={0.9} />
      <RedSlash progress={progress(frame, 4, 20)} left={1750} width={60} opacity={0.55} />
      <AbsoluteFill style={{alignItems: 'flex-start', justifyContent: 'center', paddingLeft: 160, paddingBottom: 100, color: C.white}}>
        {lines.map((l, i) => (
          <div key={i} style={{...ap(frame, at[i] ?? i * 1.2, fps, {dx: -40, dy: 0}), marginTop: i ? 26 : 0}}>
            {l}
          </div>
        ))}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Ending: React.FC = () => {
  const {frame, fps} = useSec();
  const words = ['聞く。', '考える。', '課題を見つける。', '提案する。'];
  const stage = frame < 3 * fps ? 0 : frame < 11 * fps ? 1 : 2;
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', color: C.white}}>
      {stage === 0 ? <div style={{fontSize: 100, fontWeight: 900, ...ap(frame, 0.3, fps)}}>売るだけでは、終わらない。</div> : null}
      {stage === 1 ? (
        <div style={{textAlign: 'center'}}>
          <div style={{display: 'flex', gap: 40, justifyContent: 'center'}}>
            {words.map((w, i) => (
              <div key={w} style={{fontSize: 76, fontWeight: 900, ...ap(frame, 3.2 + i * 1.1, fps)}}>
                {w}
              </div>
            ))}
          </div>
          <div style={{fontSize: 110, fontWeight: 900, color: C.red, marginTop: 44, ...ap(frame, 8, fps)}}>そして、確かめる。</div>
        </div>
      ) : null}
      {stage === 2 ? (
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 34, ...ap(frame, 11.2, fps)}}>
          <BrandMark size={120} color={C.white} />
          <div style={{fontSize: 36, letterSpacing: 12, fontWeight: 700}}>CONSULTING SALES EXPERIENCE</div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ 問い・先輩のヒント・振り返り（導入動画の「問い」と同じ形）
const Question: React.FC<{scene?: StoryScene; photo?: boolean}> = ({scene, photo}) => {
  const {frame, fps} = useSec();
  if (!scene || scene.type !== 'question') return null;
  return (
    <AbsoluteFill>
      {photo ? null : <Line faint />}
      <div style={{position: 'absolute', left: 160, right: 160, top: 220, textAlign: 'center', ...ap(frame, 0.2, fps)}}>
        <div style={{fontSize: 30, fontWeight: 900, letterSpacing: 6, color: C.redOnDark}}>QUESTION</div>
        <div style={{fontSize: 76, fontWeight: 900, color: C.white, lineHeight: 1.3, marginTop: 12}}>{scene.questionText}</div>
      </div>
      <div style={{position: 'absolute', left: 140, right: 140, top: 520, display: 'flex', gap: 30}}>
        {scene.choices.map((c, i) => (
          <div key={c.choiceId} style={{flex: 1, minHeight: 230, background: 'rgba(13,14,16,0.82)', border: '2px solid rgba(255,255,255,0.35)', padding: '24px 30px', color: C.white, ...ap(frame, 0.9 + i * 0.4, fps)}}>
            <RedLabel size={30}>{c.choiceId}</RedLabel>
            <div style={{fontSize: 40, fontWeight: 800, lineHeight: 1.4, marginTop: 18}}>{c.choiceText}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const Reflection: React.FC<{scene?: StoryScene}> = ({scene}) => {
  const {frame, fps} = useSec();
  if (!scene || scene.type !== 'reflection') return null;
  return (
    <AbsoluteFill>
      <RedSlash progress={progress(frame, 0, 20)} left={1560} width={200} opacity={0.9} />
      <RedSlash progress={progress(frame, 4, 20)} left={1800} width={60} opacity={0.55} />
      <div style={{position: 'absolute', left: 160, right: 520, top: 330}}>
        <div style={{fontSize: 30, fontWeight: 900, letterSpacing: 6, color: C.redOnDark, ...ap(frame, 0.1, fps)}}>REFLECTION</div>
        <div style={{fontSize: 84, fontWeight: 900, color: C.white, lineHeight: 1.3, marginTop: 16, ...ap(frame, 0.3, fps, {dx: -40, dy: 0})}}>{scene.question}</div>
        <div style={{fontSize: 36, fontWeight: 700, color: 'rgba(255,255,255,0.75)', marginTop: 30, ...ap(frame, 1.2, fps)}}>ワークシートに、自分の言葉で書いてみよう</div>
      </div>
    </AbsoluteFill>
  );
};

export const Scene: React.FC<{overlay: string; card?: string; imagePath?: string; quote?: QuoteLine; cardScene?: StoryScene; clear?: ClearInfo; photo?: string}> = ({overlay, card, imagePath, quote, cardScene, clear, photo}) => {
  const hasPhoto = !!photoFile(photo);
  switch (overlay) {
    case 'bridge':
      return <Bridge />;
    case 'clear':
      return <Clear info={clear} />;
    case 'why-clear':
      return <WhyClear />;
    case 'issue-photo':
      return <IssuePhoto photo={photo} />;
    case 'question':
      return <Question scene={cardScene} photo={hasPhoto} />;
    case 'hint':
      return <Talk line={quote} photo={hasPhoto} />;
    case 'reflection':
      return <Reflection scene={cardScene} />;
    case 'title':
      return <Title />;
    case 'miscount':
      return <Miscount />;
    case 'talk':
      return <Talk line={quote} photo={hasPhoto} />;
    case 'talk-card':
      return <Talk line={quote} card={card} photo={hasPhoto} />;
    case 'figures':
      return <Figures />;
    case 'chart':
      return <Chart />;
    case 'sensor-existing':
      return <SensorScene />;
    case 'beam':
      return <SensorScene beam />;
    case 'sensor-check':
      return <SensorCheck />;
    case 'line-walk':
      return <LineWalk />;
    case 'cause-wobble':
      return <Cause no="①" title="ボトルの揺れ" text="搬送中にボトルが揺れると、光の受け方が途中で変わる可能性があります。" wobble />;
    case 'cause-gap':
      return <Cause no="②" title="ボトルの接近" text="ボトルどうしの間隔が詰まると、1本ずつ区別しにくくなる可能性があります。" gap />;
    case 'control':
      return <Control />;
    case 'compare-plc':
      return <ComparePlc />;
    case 'signal-double':
      return <SignalDouble />;
    case 'isolation':
      return <Isolation />;
    case 'burden':
      return <Flow title="数が合わないと…" items={['本数を確認し直す', 'ときにはラインを止める', '生産・品質管理の負担']} strong={2} />;
    case 'chain':
      return <Flow items={['表面の問題：カウントが多い', '業務への影響：確認・ライン停止', '実現したいこと：安定した生産']} strong={2} />;
    case 'issues3':
      return <Issues3 />;
    case 'product':
      return <Product imagePath={imagePath} />;
    case 'setup':
      return <Setup />;
    case 'criteria':
      return <Criteria />;
    case 'demo-normal':
    case 'demo-wobble':
    case 'demo-gap':
    case 'demo-height':
      return <Demo variant={overlay} />;
    case 'result':
      return <Result />;
    case 'next-actions':
      return <Checklist title="次のアクション" items={['原因の候補を整理した', '記録した条件で、実機の比較をした', '残る条件を整理する', '実際のラインで、一緒に確かめる']} />;
    case 'followup':
      return (
        <Grid4
          items={[
            ['設置の位置・角度', 'センサと反射板の位置、向きを見直す'],
            ['感度の設定', '判定の基準・応答の設定を見直す'],
            ['PLC側の処理', '信号の取り込み・数え方を確認する'],
            ['別の検出方式', 'ほかの方式・製品で検証する'],
          ]}
        />
      );
    case 'message':
      return (
        <Center
          lines={[
            <div style={{fontSize: 40, fontWeight: 700, color: 'rgba(255,255,255,0.8)'}}>実機デモは</div>,
            <div style={{fontSize: 100, fontWeight: 900}}>
              お客様と<span style={{color: C.red}}>一緒に確かめる</span>
            </div>,
            <div style={{fontSize: 40, fontWeight: 700, color: 'rgba(255,255,255,0.8)'}}>次は、実際のラインで。</div>,
          ]}
        />
      );
    case 'closing':
      return (
        <Center
          at={[0.4, 3.5, 7]}
          lines={[
            <div style={{fontSize: 70, fontWeight: 900}}>営業は、商品を売るだけの仕事ではない。</div>,
            <div style={{fontSize: 56, fontWeight: 900}}>
              課題を見つけ、<span style={{color: C.red}}>技術を活かして</span>、一緒に解決を目指す。
            </div>,
            <div style={{fontSize: 38, fontWeight: 700, color: 'rgba(255,255,255,0.8)'}}>OPTEX-FAのセンシング技術は、ものづくりの現場を支えています。</div>,
          ]}
        />
      );
    case 'ending':
      return <Ending />;
    default:
      return null;
  }
};
