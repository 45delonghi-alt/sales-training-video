// 写真の上に重ねる情報（ショットごとの overlay）。文字・グラフ・光の線は、画像生成ではなくここで描く。
import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile} from 'remotion';
import {BrandMark} from '../../../consulting/components/BrandMark';
import {X} from '../theme';
import {Card, ap, useSec} from './Frame';
import {FrontView, LayoutCard, TopView} from './Layout';

export const WEEKS = [
  {week: '第1週', actual: 10000, count: 10060},
  {week: '第2週', actual: 10000, count: 10300},
  {week: '第3週', actual: 10000, count: 10050},
  {week: '第4週', actual: 10000, count: 10080},
];
const pct = (w: (typeof WEEKS)[number]) => ((w.count - w.actual) / w.actual) * 100;

const Big: React.FC<{children: React.ReactNode; color?: string; size?: number}> = ({children, color = X.ink, size = 40}) => (
  <div style={{fontSize: size, fontWeight: 900, color, lineHeight: 1.3}}>{children}</div>
);
const Small: React.FC<{children: React.ReactNode; color?: string}> = ({children, color = X.gray}) => (
  <div style={{fontSize: 22, color, marginTop: 8, lineHeight: 1.5}}>{children}</div>
);
const Red: React.FC<{children: React.ReactNode}> = ({children}) => <span style={{color: X.red}}>{children}</span>;

// ------------------------------------------------------------------ 01 誤カウント
const Miscount: React.FC = () => {
  const {frame, fps} = useSec();
  const n = Math.floor(frame / (0.7 * fps));
  const extra = [3, 9, 13].filter((k) => k <= n).length; // ときどき（不規則に）＋1
  const errAt = [3, 9, 13].map((k) => k * 0.7 * fps).filter((f) => f <= frame).pop();
  const pulse = errAt === undefined ? 0 : interpolate(frame - errAt, [0, 6, 24], [0, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const a = ap(frame, 0.6 * fps);
  const b = ap(frame, 1.4 * fps);
  return (
    <>
      <Card style={{right: 60, top: 150, width: 430, padding: '20px 28px', ...a}}>
        <div style={{fontSize: 17, fontWeight: 800, letterSpacing: 2, color: X.gray}}>LINE 03 ｜ PET BOTTLE COUNT</div>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 12}}>
          <span style={{fontSize: 24}}>実際の本数</span>
          <span style={{fontSize: 46, fontWeight: 900}}>{(1240 + n).toLocaleString('en-US')}</span>
        </div>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 6}}>
          <span style={{fontSize: 24}}>センサのカウント</span>
          <span style={{fontSize: 46, fontWeight: 900, color: extra ? X.red : X.ink, transform: `scale(${1 + pulse * 0.15})`, display: 'inline-block'}}>
            {(1240 + n + extra).toLocaleString('en-US')}
          </span>
        </div>
        <div style={{marginTop: 10, background: extra ? X.red : '#EEF1F4', color: extra ? X.white : X.gray, fontWeight: 800, fontSize: 21, padding: '6px 14px', borderRadius: 6}}>
          {extra ? `⚠ 誤カウント　+${extra}` : 'STATUS NORMAL'}
        </div>
      </Card>
      <div style={{position: 'absolute', left: 60, top: 560, ...b}}>
        <div style={{fontSize: 92, fontWeight: 900, color: X.white, lineHeight: 1.12, textShadow: `0 0 24px ${X.red}, 0 4px 18px rgba(0,0,0,0.6)`}}>
          実際よりも
          <br />
          多くカウントされる…
        </div>
        <div style={{fontSize: 40, fontWeight: 800, color: X.white, marginTop: 14, textShadow: '0 2px 10px rgba(0,0,0,0.7)'}}>何が起きているのでしょうか？</div>
      </div>
    </>
  );
};

// ------------------------------------------------------------------ 03 数字・グラフ
const Figures: React.FC = () => {
  const {frame, fps} = useSec();
  const a = ap(frame, 0.4 * fps);
  const b = ap(frame, 1.4 * fps);
  return (
    <>
      <Card accent style={{right: 70, top: 190, width: 520, ...a}}>
        <Small>実際の1万本に対して（通常）</Small>
        <Big size={64}>
          <Red>＋0.5〜0.8%</Red>
        </Big>
        <Small>10,050〜10,080本と数える</Small>
      </Card>
      <Card accent style={{right: 70, top: 470, width: 520, ...b}}>
        <Small>多い週だけ（最大）</Small>
        <Big size={64}>
          <Red>＋3.0%</Red>
        </Big>
        <Small>10,300本。毎週ではない</Small>
      </Card>
    </>
  );
};

const Chart: React.FC = () => {
  const {frame, fps} = useSec();
  const a = ap(frame, 0.4 * fps);
  const w = 760;
  const h = 360;
  const px = (i: number) => 90 + i * ((w - 140) / 3);
  const py = (v: number) => h - 50 - (v / 4) * (h - 90);
  const draw = interpolate(frame, [0.8 * fps, 3.0 * fps], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const pts = WEEKS.map((wk, i) => [px(i), py(pct(wk))] as const);
  const len = pts.slice(1).reduce((n, p, i) => n + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
  return (
    <Card style={{right: 60, top: 150, width: w + 64, ...a}}>
      <div style={{fontSize: 30, fontWeight: 900, color: '#1E5AA8'}}>カウント誤差の推移（1か月）</div>
      <svg width={w} height={h}>
        {[0, 1, 2, 3, 4].map((v) => (
          <g key={v}>
            <line x1={70} x2={w - 30} y1={py(v)} y2={py(v)} stroke="#E1E5EA" strokeWidth={2} />
            <text x={56} y={py(v) + 7} textAnchor="end" fontSize={20} fill={X.gray}>{v}%</text>
          </g>
        ))}
        <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={X.red} strokeWidth={5} strokeDasharray={len} strokeDashoffset={len * (1 - draw)} />
        {pts.map((p, i) => (
          <g key={i} opacity={draw >= i / 3 - 0.001 ? 1 : 0}>
            <circle cx={p[0]} cy={p[1]} r={10} fill={X.red} />
            <text x={p[0]} y={p[1] - 20} textAnchor="middle" fontSize={22} fontWeight={800} fill={i === 1 ? X.red : X.ink}>
              +{pct(WEEKS[i]).toFixed(1)}%
            </text>
            <text x={p[0]} y={h - 14} textAnchor="middle" fontSize={20} fill={X.gray}>{WEEKS[i].week}</text>
          </g>
        ))}
      </svg>
      <div style={{display: 'flex', gap: 14, marginTop: 4, ...ap(frame, 3.2 * fps)}}>
        <span style={{background: X.red, color: X.white, fontWeight: 900, fontSize: 24, padding: '4px 14px', borderRadius: 6}}>通常は +0.5〜0.8%</span>
        <span style={{fontSize: 24, fontWeight: 800}}>
          毎週3%ではない。<Red>多い週だけ最大 +3.0%</Red>
        </span>
      </div>
    </Card>
  );
};

// ------------------------------------------------------------------ 04 センサ
const SensorExisting: React.FC<{beam?: boolean}> = ({beam}) => {
  const {frame, fps} = useSec();
  const a = ap(frame, 0.4 * fps);
  return (
    <>
      <Card style={{right: 56, top: 140, width: 640, padding: '22px 28px', ...a}}>
        <div style={{fontSize: 18, fontWeight: 800, color: X.red, letterSpacing: 1}}>既設センサ</div>
        <div style={{fontSize: 30, fontWeight: 900, marginBottom: 10}}>他社製の回帰反射型 光電センサ</div>
        <LayoutCard frame={beam ? frame : 0} compact />
      </Card>
    </>
  );
};

const SensorCheck: React.FC = () => {
  const {frame, fps} = useSec();
  const items = ['センサの高さ（ボトルの下部か）', '反射板の角度（正対しているか）', 'センサ・反射板の汚れ', '光が安定して戻っているか'];
  return (
    <Card accent style={{right: 70, top: 170, width: 600}}>
      <Big size={34}>確認すること</Big>
      {items.map((t, i) => (
        <div key={t} style={{display: 'flex', gap: 14, alignItems: 'center', fontSize: 28, fontWeight: 800, marginTop: 16, ...ap(frame, (0.6 + i * 0.6) * fps)}}>
          <span style={{width: 34, height: 34, borderRadius: 17, border: `4px solid ${X.red}`, color: X.red, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 22}}>✓</span>
          {t}
        </div>
      ))}
      <Small>※ 光の線は説明用の表現です</Small>
    </Card>
  );
};

const LineWalk: React.FC = () => {
  const {frame, fps} = useSec();
  return (
    <Card style={{right: 60, top: 170, width: 520, ...ap(frame, 0.6 * fps)}}>
      <Big size={28}>センサは、ボトルの下のほうを横から見ている</Big>
      <FrontView w={456} h={260} frame={frame} />
    </Card>
  );
};

// ------------------------------------------------------------------ 05〜08 原因の候補
const Cause: React.FC<{no: string; title: string; text: string; children?: React.ReactNode}> = ({no, title, text, children}) => {
  const {frame, fps} = useSec();
  return (
    <>
      {children}
      <Card style={{left: 60, bottom: 200, width: 900, ...ap(frame, 0.6 * fps)}}>
        <div style={{fontSize: 22, fontWeight: 900, color: X.red}}>原因の候補{no}</div>
        <Big size={38}>{title}</Big>
        <div style={{fontSize: 26, marginTop: 8, lineHeight: 1.5}}>{text}</div>
      </Card>
    </>
  );
};

const Arrow: React.FC<{x: number; y: number; w: number; bend?: number; frame: number}> = ({x, y, w, bend = 0, frame}) => {
  const k = Math.sin(frame / 7) * 6;
  return (
    <svg style={{position: 'absolute', left: x - 20, top: y - 60, overflow: 'visible'}} width={w + 40} height={120}>
      <defs>
        <marker id="arR" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill={X.red} />
        </marker>
      </defs>
      <path d={`M 20 ${60 + k} Q ${20 + w / 2} ${60 - bend + k} ${20 + w} ${60 + k}`} stroke={X.red} strokeWidth={9} fill="none" markerStart="url(#arR)" markerEnd="url(#arR)" />
    </svg>
  );
};

const Control: React.FC<{table?: boolean}> = ({table}) => {
  const {frame, fps} = useSec();
  const a = ap(frame, 0.5 * fps);
  if (table) {
    const rows: [string, string, string, string][] = [
      ['1本目', '1回', '1', ''],
      ['2本目', '1回', '1', ''],
      ['3本目', '2回', '2', 'センサ側？'],
      ['4本目', '1回', '1', ''],
      ['5本目', '1回', '2', 'PLC側？'],
    ];
    return (
      <Card accent style={{right: 60, top: 150, width: 820, ...a}}>
        <Big size={32}>センサの出力と、PLCのカウントを同時に記録</Big>
        <div style={{fontSize: 18, color: X.red, fontWeight: 800, marginTop: 4}}>例：記録の見方（実測ではありません）</div>
        <table style={{width: '100%', borderCollapse: 'collapse', marginTop: 12, fontSize: 25}}>
          <thead>
            <tr style={{color: X.gray, fontSize: 20}}>
              {['ボトル', 'センサの出力', 'PLCのカウント', '読み取れること'].map((h) => (
                <th key={h} style={{textAlign: 'left', borderBottom: `2px solid ${X.ink}`, padding: '6px 8px'}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r[0]} style={{background: r[3] ? '#FDECEC' : undefined, ...ap(frame, (0.8 + i * 0.35) * fps)}}>
                {r.map((c, j) => (
                  <td key={j} style={{padding: '7px 8px', borderBottom: '1px solid #E1E5EA', fontWeight: j === 3 ? 900 : 600, color: j === 3 || (r[3] && j > 0) ? X.red : X.ink}}>{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    );
  }
  // 画面：センサの出力（パルス）と PLC のカウント
  const w = 700;
  const pulses = [0.12, 0.38, 0.62, 0.86];
  const x = (frame / fps) * 0.12;
  return (
    <Card style={{right: 70, top: 170, width: w + 60, background: 'rgba(16,18,22,0.94)', color: X.white, ...a}}>
      <div style={{fontSize: 24, fontWeight: 800}}>センサの出力（イメージ）</div>
      <svg width={w} height={130}>
        <polyline
          fill="none"
          stroke={X.redOnDark}
          strokeWidth={4}
          points={Array.from({length: 141}, (_, i) => {
            const p = i / 140;
            const on = pulses.some((c) => Math.abs(((p + x) % 1) - c) < 0.045);
            return `${p * w},${on ? 22 : 110}`;
          }).join(' ')}
        />
      </svg>
      <div style={{fontSize: 24, fontWeight: 800, marginTop: 6}}>PLC のカウント</div>
      <div style={{fontSize: 56, fontWeight: 900, fontVariantNumeric: 'tabular-nums'}}>{1240 + Math.floor((frame / fps) * 1.4)}</div>
      <div style={{fontSize: 18, color: 'rgba(255,255,255,0.65)'}}>※ 模式図です。数え方の設定はPLC側にあります</div>
    </Card>
  );
};

// 07 光の変化：1本の通過中に出力が2回変化する（研修用の仮想検証）
const SignalDouble: React.FC = () => {
  const {frame, fps} = useSec();
  const w = 980;
  const h = 300;
  const T = 9 * fps;
  const p = Math.min(1, frame / T);
  // ボトル通過区間 0.3〜0.62。出力：0.33〜0.43 と 0.49〜0.6 の2回 ON
  const onAt = (q: number) => (q > 0.33 && q < 0.43) || (q > 0.49 && q < 0.6);
  const count = [0.33, 0.49].filter((q) => p > q).length;
  return (
    <>
      <Card style={{left: 60, top: 170, width: 520, ...ap(frame, 0.4 * fps)}}>
        <div style={{fontSize: 20, fontWeight: 900, color: X.red}}>透明ボトル下部の光の変化（仮説）</div>
        <div style={{fontSize: 26, fontWeight: 800, marginTop: 8, lineHeight: 1.5}}>
          底の形・水・揺れで、戻ってくる光の量が
          <br />
          <Red>不安定になる可能性</Red>
        </div>
        <FrontView w={456} h={250} frame={frame} wobble={1} />
      </Card>
      <Card style={{right: 60, top: 170, width: w + 60 - 420, ...ap(frame, 1.2 * fps)}}>
        <div style={{fontSize: 24, fontWeight: 900}}>ボトル1本が通るあいだのセンサ出力</div>
        <svg width={w - 420} height={h}>
          <rect x={(w - 420) * 0.3} y={10} width={(w - 420) * 0.32} height={h - 70} fill="rgba(94,143,176,0.15)" />
          <text x={(w - 420) * 0.46} y={34} textAnchor="middle" fontSize={20} fill="#3D6E8F" fontWeight={800}>ボトル1本が通過</text>
          <polyline
            fill="none"
            stroke={X.red}
            strokeWidth={5}
            points={Array.from({length: 201}, (_, i) => {
              const q = i / 200;
              if (q > p) return null;
              return `${q * (w - 420)},${onAt(q) ? 70 : h - 80}`;
            })
              .filter(Boolean)
              .join(' ')}
          />
          <text x={0} y={h - 40} fontSize={20} fill={X.gray}>OFF</text>
          <text x={0} y={64} fontSize={20} fill={X.gray}>ON</text>
          <text x={(w - 420) * 0.98} y={h - 20} textAnchor="end" fontSize={34} fontWeight={900} fill={count === 2 ? X.red : X.ink}>
            カウント：{count}
          </text>
        </svg>
        <div style={{fontSize: 30, fontWeight: 900, color: X.red, opacity: count === 2 ? 1 : 0}}>1本なのに、2回 ON → 2本と数える</div>
        <div style={{fontSize: 18, color: X.gray, marginTop: 4}}>研修用の仮想検証（シミュレーション）。実測ではありません</div>
      </Card>
    </>
  );
};

// 原因の候補を整理（4枚）
const Isolation: React.FC = () => {
  const {frame, fps} = useSec();
  const items = [
    ['①', 'ボトルの揺れ', '揺れると、光の受け方が変わる可能性'],
    ['②', 'ボトルの接近', '間隔が詰まると、1本ずつ区別しにくい可能性'],
    ['③', '透明ボトルの光の変化', '底の形や水で、戻る光が不安定になる可能性'],
    ['④', '制御側の条件', 'PLCの数え方の設定・ノイズの可能性'],
  ];
  return (
    <AbsoluteFill style={{padding: '190px 80px 220px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 26}}>
      {items.map(([no, t, d], i) => (
        <div key={t} style={{background: 'rgba(255,255,255,0.96)', borderRadius: 16, padding: '24px 30px', boxShadow: '0 12px 30px rgba(0,0,0,0.22)', ...ap(frame, (0.4 + i * 0.7) * fps)}}>
          <div style={{fontSize: 24, fontWeight: 900, color: X.red}}>原因の候補{no}</div>
          <div style={{fontSize: 40, fontWeight: 900}}>{t}</div>
          <div style={{fontSize: 24, color: X.ink2, marginTop: 6}}>{d}</div>
        </div>
      ))}
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ 課題
const Steps: React.FC<{items: string[]; title?: string; strong?: number}> = ({items, title, strong}) => {
  const {frame, fps} = useSec();
  return (
    <Card accent style={{right: 70, top: 160, width: 600}}>
      {title ? <Big size={32}>{title}</Big> : null}
      {items.map((t, i) => (
        <div key={t} style={{...ap(frame, (0.5 + i * 0.8) * fps)}}>
          {i ? <div style={{textAlign: 'center', color: X.red, fontSize: 26, lineHeight: 1}}>▼</div> : null}
          <div style={{fontSize: 30, fontWeight: 900, padding: '12px 18px', marginTop: 6, borderRadius: 10, background: i === strong ? X.red : '#F1F3F6', color: i === strong ? X.white : X.ink}}>{t}</div>
        </div>
      ))}
    </Card>
  );
};

const Issues3: React.FC = () => {
  const {frame, fps} = useSec();
  const items = ['正確な本数管理', '数量確認の手戻りを減らす', '安定した生産'];
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', paddingBottom: 120}}>
      <div style={{display: 'flex', gap: 30}}>
        {items.map((t, i) => (
          <div key={t} style={{width: 470, background: 'rgba(255,255,255,0.96)', borderRadius: 16, padding: '30px 30px', borderTop: `10px solid ${X.red}`, boxShadow: '0 12px 30px rgba(0,0,0,0.25)', ...ap(frame, (0.5 + i * 0.9) * fps)}}>
            <div style={{fontSize: 30, fontWeight: 900, color: X.red}}>課題 {i + 1}</div>
            <div style={{fontSize: 42, fontWeight: 900, marginTop: 6}}>{t}</div>
          </div>
        ))}
      </div>
      <div style={{marginTop: 40, fontSize: 46, fontWeight: 900, color: X.white, background: X.red, padding: '14px 36px', borderRadius: 10, ...ap(frame, 4.2 * fps)}}>
        欲しいのは、新しいセンサではなく「安定した生産」
      </div>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ 09 製品（公式画像のみ）
const Product: React.FC<{imagePath?: string}> = ({imagePath}) => {
  const {frame, fps} = useSec();
  return (
    <Card style={{right: 60, top: 140, width: 820, ...ap(frame, 0.4 * fps)}}>
      <div style={{fontSize: 30, fontWeight: 900, color: X.red}}>OPTEX-FA</div>
      <div style={{fontSize: 64, fontWeight: 900, lineHeight: 1.1}}>KR-Qシリーズ</div>
      <div style={{fontSize: 28, fontWeight: 800, marginTop: 6}}>透明体検出タイプ ／ 回帰反射型（反射ミラー使用）</div>
      <div style={{display: 'flex', gap: 24, marginTop: 18}}>
        <div style={{width: 300, height: 220, borderRadius: 10, border: imagePath ? '1px solid #DDE1E6' : '3px dashed #B3BAC2', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAFBFC', flex: 'none'}}>
          {imagePath ? (
            <Img src={staticFile(imagePath)} style={{maxWidth: '92%', maxHeight: '92%', objectFit: 'contain'}} />
          ) : (
            <div style={{textAlign: 'center', color: X.gray, fontSize: 20, fontWeight: 700, lineHeight: 1.5}}>
              公式製品画像
              <br />
              （許諾確認後に配置）
            </div>
          )}
        </div>
        <div style={{fontSize: 25, fontWeight: 700, lineHeight: 1.55}}>
          {['センサと反射板を向かい合わせて、ボトル下部を横から検出', '今のセンサとの違いは、公式の仕様で確認', '性能は、お客様のボトルで確かめる'].map((t, i) => (
            <div key={t} style={{display: 'flex', gap: 10, marginBottom: 10, ...ap(frame, (1.2 + i * 0.8) * fps)}}>
              <span style={{color: X.red, fontWeight: 900}}>✓</span>
              {t}
            </div>
          ))}
        </div>
      </div>
      <div style={{fontSize: 17, color: X.gray, marginTop: 8}}>型式（例：KR-Q50N・KR-Q150NW・KR-Q300NW）と仕様は、メーカー公式資料で確認してから表示します</div>
    </Card>
  );
};

// ------------------------------------------------------------------ 10 設置・比較デモ
const Setup: React.FC = () => {
  const {frame, fps} = useSec();
  const list = (title: string, items: string[], at: number) => (
    <div style={{marginTop: 14, ...ap(frame, at * fps)}}>
      <div style={{fontSize: 22, fontWeight: 900, color: X.red}}>{title}</div>
      <div style={{fontSize: 26, fontWeight: 800}}>{items.join('・')}</div>
    </div>
  );
  return (
    <>
      <Card style={{left: 56, top: 150, width: 640, ...ap(frame, 0.4 * fps)}}>
        <LayoutCard frame={frame} compact />
      </Card>
      <Card accent style={{right: 56, top: 150, width: 640}}>
        <Big size={32}>既設センサ と KR-Qシリーズ を、同じ条件で比べる</Big>
        {list('同じにする', ['ボトル', '搬送速度', '設置の高さ（ボトル下部）'], 1.2)}
        {list('それぞれに合わせる', ['反射板', '設定（各メーカーの使用条件）'], 2.2)}
        {list('測るもの', ['通過本数', 'センサの出力回数', 'PLCのカウント値'], 3.2)}
      </Card>
    </>
  );
};

const Criteria: React.FC = () => {
  const {frame, fps} = useSec();
  return (
    <Card accent style={{right: 70, top: 170, width: 720}}>
      <Big size={34}>合格の基準（試す前に決める）</Big>
      <div style={{fontSize: 32, fontWeight: 900, marginTop: 18, ...ap(frame, 0.8 * fps)}}>① ボトル1本につき、出力は1回</div>
      <div style={{fontSize: 32, fontWeight: 900, marginTop: 14, ...ap(frame, 1.8 * fps)}}>
        ② 通過本数 ＝ 出力回数 ＝ <Red>PLCのカウント</Red>
      </div>
    </Card>
  );
};

const DEMO: Record<string, {title: string; wobble?: boolean; gap?: boolean; height?: boolean}> = {
  'demo-normal': {title: '通常搬送'},
  'demo-wobble': {title: 'ボトルの揺れ', wobble: true},
  'demo-gap': {title: '間隔の変化', gap: true},
  'demo-height': {title: '検出高さの比較', height: true},
};

// 比較デモのシミュレーション：見方の説明だけ。結果は実機で記録する（ここでは結果を描かない）
const Demo: React.FC<{variant: string}> = ({variant}) => {
  const {frame, fps} = useSec();
  const d = DEMO[variant];
  const w = 560;
  const xs = [0, 1, 2, 3, 4].map((i) => ((frame * 3 + i * (d.gap ? 70 + (i % 2) * 50 : 130)) % (w + 120)) - 60);
  const tilt = xs.map((_, i) => (d.wobble ? Math.sin(frame / 5 + i) : 0));
  const box = (name: string) => (
    <div style={{flex: 1, background: '#F1F3F6', borderRadius: 10, padding: '12px 16px'}}>
      <div style={{fontSize: 22, fontWeight: 900}}>{name}</div>
      <div style={{fontSize: 19, color: X.gray, marginTop: 4}}>通過本数／出力回数／PLCカウント</div>
      <div style={{fontSize: 28, fontWeight: 900, color: X.red, marginTop: 6}}>実機で記録</div>
    </div>
  );
  return (
    <>
      <Card style={{left: 56, top: 150, width: 640, ...ap(frame, 0.3 * fps)}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
          <span style={{background: X.red, color: X.white, fontWeight: 900, fontSize: 20, padding: '3px 12px', borderRadius: 4}}>シミュレーション</span>
          <span style={{fontSize: 20, color: X.gray, fontWeight: 700}}>見方の説明です（実測結果ではありません）</span>
        </div>
        <div style={{fontSize: 34, fontWeight: 900, marginTop: 10}}>条件：{d.title}</div>
        {d.height ? (
          <div style={{display: 'flex', gap: 8}}>
            {[0.12, 0.2, 0.35].map((r) => (
              <div key={r} style={{textAlign: 'center'}}>
                <FrontView w={186} h={230} frame={frame} showLabels={false} heightRatio={r} />
                <div style={{fontSize: 18, fontWeight: 800, color: r === 0.2 ? X.red : X.ink}}>{r === 0.2 ? '基準：ボトル下部' : r < 0.2 ? 'より低い' : 'より高い'}</div>
              </div>
            ))}
          </div>
        ) : (
          <TopView w={w} h={220} frame={frame} bottlesX={xs} tilt={tilt} />
        )}
      </Card>
      <Card accent style={{right: 56, top: 150, width: 640, ...ap(frame, 1.2 * fps)}}>
        <Big size={30}>同じ条件で、2つのセンサを記録する</Big>
        <div style={{display: 'flex', gap: 14, marginTop: 14}}>
          {box('既設センサ（他社製）')}
          {box('KR-Qシリーズ')}
        </div>
        <Small>結果は、アプリの実機デモ画面に記録します。記録した値だけを比べます</Small>
      </Card>
    </>
  );
};

// ------------------------------------------------------------------ 11 結果の比較（改善後は実測が得られるまで未確定）
const Result: React.FC = () => {
  const {frame, fps} = useSec();
  const w = 520;
  const h = 220;
  const px = (i: number) => 50 + i * ((w - 80) / 3);
  const py = (v: number) => h - 34 - (v / 4) * (h - 60);
  return (
    <AbsoluteFill style={{padding: '170px 70px 210px', display: 'flex', flexDirection: 'row', gap: 30}}>
      <div style={{flex: 1, background: 'rgba(255,255,255,0.96)', borderRadius: 16, padding: '22px 28px', ...ap(frame, 0.3 * fps)}}>
        <div style={{fontSize: 30, fontWeight: 900, color: '#1E5AA8'}}>改善前（現状・既設センサ）</div>
        <svg width={w} height={h}>
          {[0, 2, 4].map((v) => (
            <line key={v} x1={40} x2={w - 20} y1={py(v)} y2={py(v)} stroke="#E1E5EA" strokeWidth={2} />
          ))}
          <polyline points={WEEKS.map((wk, i) => `${px(i)},${py(pct(wk))}`).join(' ')} fill="none" stroke={X.red} strokeWidth={4} />
          {WEEKS.map((wk, i) => (
            <circle key={i} cx={px(i)} cy={py(pct(wk))} r={7} fill={X.red} />
          ))}
        </svg>
        <div style={{fontSize: 26, fontWeight: 800}}>
          通常 <Red>+0.5〜0.8%</Red>／最大 <Red>+3.0%</Red>
        </div>
        <div style={{fontSize: 17, color: X.gray}}>研修用の架空データ</div>
      </div>
      <div style={{flex: 1, background: 'rgba(255,255,255,0.96)', borderRadius: 16, padding: '22px 28px', ...ap(frame, 1.0 * fps)}}>
        <div style={{fontSize: 30, fontWeight: 900, color: '#1E5AA8'}}>KR-Qシリーズでの検証</div>
        <div style={{height: h, border: '3px dashed #B3BAC2', borderRadius: 10, marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center'}}>
          <div style={{fontSize: 30, fontWeight: 900, lineHeight: 1.5}}>
            実測値が得られるまで
            <br />
            <Red>未確定</Red>
          </div>
        </div>
        <div style={{fontSize: 22, fontWeight: 700, marginTop: 8}}>改善後の数値は、実機・実ラインで測ってから示します</div>
      </div>
      <div style={{width: 420, background: 'rgba(14,15,17,0.9)', color: X.white, borderRadius: 16, padding: '22px 26px', ...ap(frame, 2.0 * fps)}}>
        <div style={{fontSize: 26, fontWeight: 900}}>結果は3つに分けて扱う</div>
        {[
          ['1', '実測データ', '実機・実ラインで記録した値'],
          ['2', '研修用シミュレーション', '見方の説明。結果ではない'],
          ['3', '期待する改善効果', '確かめる前の見込み'],
        ].map(([n, t, d]) => (
          <div key={n} style={{marginTop: 16}}>
            <div style={{fontSize: 26, fontWeight: 900}}>
              <span style={{color: X.redOnDark}}>{n}.</span> {t}
            </div>
            <div style={{fontSize: 19, color: 'rgba(255,255,255,0.75)'}}>{d}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const Checklist: React.FC<{title: string; items: string[]}> = ({title, items}) => {
  const {frame, fps} = useSec();
  return (
    <Card style={{right: 60, top: 150, width: 680}}>
      <Big size={32}>{title}</Big>
      {items.map((t, i) => (
        <div key={t} style={{display: 'flex', gap: 14, alignItems: 'center', fontSize: 29, fontWeight: 800, marginTop: 16, ...ap(frame, (0.6 + i * 0.7) * fps)}}>
          <span style={{width: 38, height: 38, borderRadius: 19, border: `4px solid ${X.red}`, color: X.red, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flex: 'none'}}>✓</span>
          {t}
        </div>
      ))}
    </Card>
  );
};

const Grid4: React.FC<{items: [string, string][]}> = ({items}) => {
  const {frame, fps} = useSec();
  return (
    <AbsoluteFill style={{padding: '190px 80px 220px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24}}>
      {items.map(([t, d], i) => (
        <div key={t} style={{background: 'rgba(255,255,255,0.96)', borderRadius: 16, padding: '24px 30px', borderLeft: `10px solid ${X.red}`, ...ap(frame, (0.4 + i * 0.6) * fps)}}>
          <div style={{fontSize: 38, fontWeight: 900}}>{t}</div>
          <div style={{fontSize: 24, color: X.ink2, marginTop: 6}}>{d}</div>
        </div>
      ))}
    </AbsoluteFill>
  );
};

const Center: React.FC<{lines: React.ReactNode[]; at?: number[]}> = ({lines, at = []}) => {
  const {frame, fps} = useSec();
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: X.white, paddingBottom: 120}}>
      {lines.map((l, i) => (
        <div key={i} style={{...ap(frame, (at[i] ?? i * 1.2) * fps), marginTop: i ? 18 : 0}}>
          {l}
        </div>
      ))}
    </AbsoluteFill>
  );
};

const Title: React.FC = () => (
  <Center
    at={[0.2, 0.6, 1.2]}
    lines={[
      <div style={{fontSize: 30, letterSpacing: 10, fontWeight: 700, color: 'rgba(255,255,255,0.8)'}}>OPTEX-FA CONSULTING SALES EXPERIENCE</div>,
      <div style={{fontSize: 140, fontWeight: 900, letterSpacing: 10, color: X.redOnDark, lineHeight: 1.1}}>YOUR MISSION</div>,
      <div style={{fontSize: 66, fontWeight: 900}}>ペットボトルの誤カウントを解決せよ！</div>,
    ]}
  />
);

const Ending: React.FC = () => {
  const {frame, fps} = useSec();
  const words = ['聞く。', '考える。', '課題を見つける。', '提案する。'];
  const phase = frame < 3 * fps ? 0 : frame < 11 * fps ? 1 : 2;
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', color: X.white}}>
      {phase === 0 ? <div style={{fontSize: 92, fontWeight: 900, ...ap(frame, 0.3 * fps)}}>売るだけでは、終わらない。</div> : null}
      {phase === 1 ? (
        <div style={{textAlign: 'center'}}>
          <div style={{display: 'flex', gap: 36, justifyContent: 'center'}}>
            {words.map((w, i) => (
              <div key={w} style={{fontSize: 70, fontWeight: 900, ...ap(frame, (3.2 + i * 1.1) * fps)}}>{w}</div>
            ))}
          </div>
          <div style={{fontSize: 96, fontWeight: 900, color: X.redOnDark, marginTop: 40, ...ap(frame, 8 * fps)}}>そして、確かめる。</div>
        </div>
      ) : null}
      {phase === 2 ? (
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30, ...ap(frame, 11.2 * fps)}}>
          <BrandMark size={110} color={X.white} />
          <div style={{fontSize: 34, letterSpacing: 12, fontWeight: 700}}>CONSULTING SALES EXPERIENCE</div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

// 暗くするショット（文字を読みやすく）
export const DIM: Record<string, number> = {title: 0.55, isolation: 0.35, issues3: 0.4, result: 0.35, followup: 0.35, message: 0.45, closing: 0.5, ending: 0.6};

export const Overlay: React.FC<{overlay: string; card?: string; imagePath?: string}> = ({overlay, card, imagePath}) => {
  const {frame, fps} = useSec();
  switch (overlay) {
    case 'title':
      return <Title />;
    case 'miscount':
      return <Miscount />;
    case 'figures':
      return <Figures />;
    case 'chart':
      return <Chart />;
    case 'sensor-existing':
      return <SensorExisting />;
    case 'beam':
      return <SensorExisting beam />;
    case 'sensor-check':
      return <SensorCheck />;
    case 'line-walk':
      return <LineWalk />;
    case 'cause-wobble':
      return (
        <Cause no="①" title="ボトルの揺れ" text="搬送中にボトルが揺れると、光の受け方が途中で変わる可能性があります。">
          <Arrow x={1080} y={360} w={260} bend={70} frame={frame} />
        </Cause>
      );
    case 'cause-gap':
      return (
        <Cause no="②" title="ボトルの接近" text="ボトルどうしの間隔が詰まると、1本ずつ区別しにくくなる可能性があります。">
          <Arrow x={760} y={600} w={300} frame={frame} />
        </Cause>
      );
    case 'control':
      return <Control />;
    case 'compare-plc':
      return <Control table />;
    case 'signal-double':
      return <SignalDouble />;
    case 'isolation':
      return <Isolation />;
    case 'burden':
      return <Steps title="数が合わないと…" items={['本数を確認し直す', 'ときにはラインを止める', '生産・品質管理の負担']} strong={2} />;
    case 'chain':
      return <Steps items={['表面の問題：カウントが多い', '業務への影響：確認・ライン停止', '実現したいこと：安定した生産']} strong={2} />;
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
            <div style={{fontSize: 34, fontWeight: 700}}>実機デモは</div>,
            <div style={{fontSize: 80, fontWeight: 900}}>
              お客様と<span style={{color: X.redOnDark}}>一緒に確かめる</span>
            </div>,
            <div style={{fontSize: 30, fontWeight: 700, color: 'rgba(255,255,255,0.85)'}}>次は、実際のラインで</div>,
          ]}
        />
      );
    case 'closing':
      return (
        <Center
          at={[0.4, 3.5, 7]}
          lines={[
            <div style={{fontSize: 58, fontWeight: 900}}>営業は、商品を売るだけの仕事ではない。</div>,
            <div style={{fontSize: 46, fontWeight: 800}}>
              課題を見つけ、<span style={{color: X.redOnDark}}>技術を活かして</span>、一緒に解決を目指す。
            </div>,
            <div style={{fontSize: 34, fontWeight: 700, color: 'rgba(255,255,255,0.85)'}}>OPTEX-FAのセンシング技術は、ものづくりの現場を支えています。</div>,
          ]}
        />
      );
    case 'ending':
      return <Ending />;
    case 'talk-card':
      return card ? (
        <Card accent style={{right: 70, top: 200, width: 560, ...ap(frame, 1.0 * fps)}}>
          <Big size={36}>{card}</Big>
        </Card>
      ) : null;
    default:
      return null; // talk：写真と字幕だけ
  }
};
