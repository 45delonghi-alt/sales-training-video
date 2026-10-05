// 各場面の図解（左）と右パネル。at[i] は i 行目のナレーションが始まるフレーム（場面内）
import React from 'react';
import {interpolate} from 'remotion';
import {FONT_FAMILY} from '../theme';
import {Badge, Beam, ObjectBox, PointCard, Reflector, SC, SensorBody, SvgText, ramp, useSpringIn} from './parts';

export type VisualProps = {frame: number; at: number[]};
export type Visual = {diagram: React.ReactNode; panel?: React.ReactNode};

const Panel: React.FC<{children: React.ReactNode}> = ({children}) => (
  <div style={{display: 'flex', flexDirection: 'column', gap: 22}}>{children}</div>
);

// ───────── 光電センサとは ─────────
const TypeChip: React.FC<{start: number; no: string; name: string; note: string}> = ({start, no, name, note}) => {
  const s = useSpringIn(start);
  return (
    <div
      style={{
        opacity: s,
        transform: `translateX(${(1 - s) * 60}px)`,
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        background: SC.panel,
        borderRadius: 14,
        padding: '18px 24px',
        boxShadow: '0 4px 14px rgba(0,0,0,0.10)',
        fontFamily: FONT_FAMILY,
      }}
    >
      <div style={{fontSize: 34, fontWeight: 700, color: '#fff', background: SC.beam, borderRadius: 10, padding: '4px 16px'}}>{no}</div>
      <div>
        <div style={{fontSize: 40, fontWeight: 700, color: SC.ink}}>{name}</div>
        <div style={{fontSize: 26, color: SC.subInk}}>{note}</div>
      </div>
    </div>
  );
};

export const basics = ({frame, at}: VisualProps): Visual => {
  const beam = ramp(frame, at[0] + 10, 12);
  const names = ramp(frame, at[1], 10);
  return {
    diagram: (
      <g>
        <SensorBody x={120} y={230} face="right" />
        <SensorBody x={880} y={230} face="left" led="#2fb36b" />
        <Beam x1={250} y1={305} x2={250 + 615 * beam} y2={305} opacity={beam} />
        <SvgText x={180} y={190} size={34} opacity={names}>
          投光器
        </SvgText>
        <SvgText x={180} y={470} size={24} color={SC.subInk} weight={500} opacity={names}>
          光を出す
        </SvgText>
        <SvgText x={940} y={190} size={34} opacity={names}>
          受光器
        </SvgText>
        <SvgText x={940} y={470} size={24} color={SC.subInk} weight={500} opacity={names}>
          光を受ける
        </SvgText>
        <SvgText x={560} y={580} size={36} color={SC.good} opacity={ramp(frame, at[0] + 30)}>
          光の変化 ＝ モノの有無
        </SvgText>
      </g>
    ),
    panel: (
      <Panel>
        <TypeChip start={at[2] + 8} no="1" name="透過型" note="向かい合わせて、遮られたら検出" />
        <TypeChip start={at[2] + 18} no="2" name="回帰反射型" note="反射板で折り返し、遮られたら検出" />
        <TypeChip start={at[2] + 28} no="3" name="反射型" note="モノからの反射光で検出" />
      </Panel>
    ),
  };
};

// ───────── 透過型 ─────────
export const thru = ({frame, at}: VisualProps): Visual => {
  const beam = ramp(frame, at[0] + 10, 14);
  const drop = ramp(frame, at[1] + 10, 14);
  const blocked = drop >= 1;
  const beamEnd = blocked ? 518 : 190 + 740 * beam;
  return {
    diagram: (
      <g>
        <SvgText x={120} y={175} size={30}>
          投光器
        </SvgText>
        <SvgText x={1000} y={175} size={30}>
          受光器
        </SvgText>
        <SensorBody x={60} y={220} face="right" />
        <SensorBody x={940} y={220} face="left" led="#2fb36b" ledOn={!blocked} />
        <Beam x1={190} y1={295} x2={beamEnd} y2={295} opacity={beam} />
        <ObjectBox x={520} y={210} dropIn={drop} />
        <SvgText x={560} y={520} size={24} color={SC.subInk} weight={500} opacity={beam}>
          別々の筐体を向かい合わせに設置
        </SvgText>
        {blocked ? (
          <Badge x={560} y={590} text="光が遮られた → あり" color={SC.beam} scale={ramp(frame, at[1] + 24, 8)} />
        ) : (
          <Badge x={560} y={590} text="光が届く → なし" color="#8a8f99" scale={ramp(frame, at[0] + 24, 8)} />
        )}
      </g>
    ),
    panel: (
      <Panel>
        <PointCard start={at[2] + 4} kind="good" text="色・形に左右されにくい" />
        <PointCard start={at[2] + 16} kind="good" text="長い距離でも安定して検出" />
        <PointCard start={at[3] + 4} kind="warn" text="両側に設置・配線が必要" />
      </Panel>
    ),
  };
};

// ───────── 回帰反射型 ─────────
export const retro = ({frame, at}: VisualProps): Visual => {
  const out = ramp(frame, at[0] + 10, 14);
  const back = ramp(frame, at[0] + 24, 14);
  const drop = ramp(frame, at[1] + 6, 14);
  const blocked = drop >= 1;
  const shiny = frame >= at[3];
  const polarized = frame >= at[3] + 60;
  const outEnd = blocked ? 548 : 190 + 780 * out;
  return {
    diagram: (
      <g>
        <SvgText x={120} y={160} size={30}>
          投光／受光器
        </SvgText>
        <SensorBody x={60} y={205} face="right" />
        <Reflector x={980} y={180} />
        <Beam x1={190} y1={262} x2={outEnd} y2={262} opacity={out} />
        {!blocked ? <Beam x1={970} y1={318} x2={970 - 770 * back} y2={318} opacity={back} /> : null}
        {shiny ? (
          <Beam x1={548} y1={318} x2={200} y2={318} opacity={polarized ? 0.25 : ramp(frame, at[3] + 8)} color={SC.warn} />
        ) : null}
        <ObjectBox x={550} y={200} dropIn={drop} shiny={shiny} caption={shiny ? '光沢のあるモノ' : '検出物'} />
        {polarized ? (
          <g opacity={ramp(frame, at[3] + 60)}>
            <SvgText x={370} y={335} size={64} color={SC.warn}>
              ✕
            </SvgText>
            <Badge x={560} y={590} text="偏光フィルタで反射板の光だけ受ける" color={SC.good} />
          </g>
        ) : shiny ? (
          <Badge x={560} y={590} text="光が返ってきて → 見逃し" color={SC.warn} scale={ramp(frame, at[3] + 14, 8)} />
        ) : blocked ? (
          <Badge x={560} y={590} text="光が遮られた → あり" color={SC.beam} scale={ramp(frame, at[1] + 20, 8)} />
        ) : (
          <Badge x={560} y={590} text="光が戻ってくる → なし" color="#8a8f99" scale={ramp(frame, at[0] + 36, 8)} />
        )}
        <SvgText x={560} y={505} size={24} color={SC.subInk} weight={500} opacity={out}>
          投光と受光が1つの筐体。反対側は反射板だけ
        </SvgText>
      </g>
    ),
    panel: (
      <Panel>
        <PointCard start={at[2] + 4} kind="good" text="配線は片側だけでOK" />
        <PointCard start={at[2] + 16} kind="good" text="透過型に近い安定性" />
        <PointCard start={at[3] + 4} kind="warn" text="光沢物は偏光フィルタ付きで対策" />
      </Panel>
    ),
  };
};

// ───────── 透明体専用 ─────────
const Gauge: React.FC<{frame: number; at: number[]}> = ({frame, at}) => {
  const level = interpolate(frame, [at[1] + 10, at[1] + 30], [100, 85], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const normal = ramp(frame, at[1] + 34);
  const special = ramp(frame, at[2] + 6);
  const H = 360;
  const Marker: React.FC<{pct: number; name: string; result: string; ok: boolean; opacity: number}> = ({
    pct,
    name,
    result,
    ok,
    opacity,
  }) => (
    <div style={{position: 'absolute', left: 0, right: 0, top: H * (1 - pct / 100), opacity}}>
      <div style={{position: 'absolute', left: 120, width: 140, borderTop: `4px dashed ${ok ? SC.good : SC.subInk}`}} />
      <div style={{position: 'absolute', left: 280, top: -26, fontSize: 26, fontWeight: 700, color: SC.ink, whiteSpace: 'nowrap'}}>
        {name}
        <span style={{marginLeft: 12, color: '#fff', background: ok ? SC.good : SC.warn, borderRadius: 8, padding: '2px 12px'}}>
          {result}
        </span>
      </div>
    </div>
  );
  return (
    <div style={{fontFamily: FONT_FAMILY, background: SC.panel, borderRadius: 16, padding: '24px 28px', boxShadow: '0 4px 14px rgba(0,0,0,0.10)'}}>
      <div style={{fontSize: 30, fontWeight: 700, color: SC.ink, marginBottom: 20}}>受光量（光の届いた量）</div>
      <div style={{position: 'relative', height: H}}>
        <div style={{position: 'absolute', left: 150, width: 80, top: 0, height: H, background: '#e4e7ee', borderRadius: 8}} />
        <div
          style={{position: 'absolute', left: 150, width: 80, bottom: 0, height: (H * level) / 100, background: SC.beam, borderRadius: 8}}
        />
        <div style={{position: 'absolute', left: 0, top: H * (1 - level / 100) - 18, fontSize: 30, fontWeight: 700, color: SC.beam}}>
          {Math.round(level)}%
        </div>
        <Marker pct={50} name="一般タイプの判定ライン" result="見逃し" ok={false} opacity={normal} />
        <Marker pct={93} name="透明体専用の判定ライン" result="検出" ok opacity={special} />
      </div>
      <div style={{fontSize: 22, color: SC.subInk, marginTop: 14}}>※ 数値はイメージです</div>
    </div>
  );
};

export const transparent = ({frame, at}: VisualProps): Visual => {
  const out = ramp(frame, at[0] + 6, 12);
  const drop = ramp(frame, at[1] + 6, 14);
  const dy = (1 - drop) * -260;
  // ボトルの奥では光が少し弱まる
  const after = drop >= 1 ? 0.6 : 1;
  return {
    diagram: (
      <g>
        <SvgText x={120} y={160} size={30}>
          投光／受光器
        </SvgText>
        <SensorBody x={60} y={205} face="right" />
        <Reflector x={980} y={180} />
        <Beam x1={190} y1={262} x2={545} y2={262} opacity={out} dashed={false} />
        <Beam x1={630} y1={262} x2={970} y2={262} opacity={out * after} dashed={false} />
        <Beam x1={970} y1={318} x2={630} y2={318} opacity={out * after} dashed={false} />
        <Beam x1={545} y1={318} x2={200} y2={318} opacity={out * after} dashed={false} />
        {drop > 0 ? (
          <g transform={`translate(0 ${dy})`} opacity={Math.min(1, drop * 2)}>
            <rect x={570} y={150} width={30} height={34} rx={4} fill="rgba(120,180,230,0.45)" stroke="#4d8fc9" strokeWidth={3} />
            <path
              d="M572 184 Q545 200 545 225 L545 380 Q545 392 557 392 L613 392 Q625 392 625 380 L625 225 Q625 200 598 184 Z"
              fill="rgba(150,205,245,0.35)"
              stroke="#4d8fc9"
              strokeWidth={3}
            />
            <SvgText x={585} y={130} size={24}>
              ペットボトル
            </SvgText>
          </g>
        ) : null}
        <SvgText x={560} y={505} size={26} color={SC.subInk} weight={500} opacity={ramp(frame, at[1] + 30)}>
          光はほとんど通り抜け、わずかに弱まるだけ
        </SvgText>
        <Badge x={560} y={590} text="わずかな変化をとらえて → あり" color={SC.good} scale={ramp(frame, at[2] + 20, 8)} />
      </g>
    ),
    panel: <Gauge frame={frame} at={at} />,
  };
};

// ───────── 反射型 ─────────
export const diffuse = ({frame, at}: VisualProps): Visual => {
  const out = ramp(frame, at[0] + 10, 12);
  const back = ramp(frame, at[0] + 22, 12);
  const dark = frame >= at[2];
  return {
    diagram: (
      <g>
        <SvgText x={120} y={160} size={30}>
          投光／受光器
        </SvgText>
        <SensorBody x={60} y={205} face="right" />
        <Beam x1={190} y1={262} x2={190 + 480 * out} y2={262} opacity={out} />
        <Beam
          x1={670}
          y1={318}
          x2={670 - 470 * back}
          y2={318}
          opacity={dark ? 0.25 : back}
          width={dark ? 5 : 8}
          color="#f5a35e"
        />
        <ObjectBox
          x={680}
          y={180}
          w={80}
          h={200}
          fill={dark ? '#2b2d33' : SC.object}
          stroke={dark ? '#000' : SC.objectEdge}
          caption={dark ? '黒いモノ' : '検出物'}
        />
        <SvgText x={560} y={505} size={24} color={SC.subInk} weight={500} opacity={out}>
          反射板はなし。モノ自体が光を返す
        </SvgText>
        {dark ? (
          <Badge x={560} y={590} text="返る光が弱い → 不安定" color={SC.warn} scale={ramp(frame, at[2] + 10, 8)} />
        ) : (
          <Badge x={560} y={590} text="光が返ってきた → あり" color={SC.beam} scale={ramp(frame, at[0] + 36, 8)} />
        )}
      </g>
    ),
    panel: (
      <Panel>
        <PointCard start={at[1] + 4} kind="good" text="反射板不要・センサ1台" />
        <PointCard start={at[1] + 16} kind="good" text="省スペースで設置しやすい" />
        <PointCard start={at[2] + 4} kind="warn" text="色・形・背景で不安定になることも" />
      </Panel>
    ),
  };
};

// ───────── 距離設定型（BGS） ─────────
// 拡散反射型は「受光量の増減」、BGS は三角測距で「受光素子のどの位置に戻ったか＝距離」で判断する
const MethodCompare: React.FC<{at: number[]}> = ({at}) => {
  const a = useSpringIn(at[1] + 6);
  const b = useSpringIn(at[2] + 6);
  const box = useSpringIn(at[1]);
  const row = (s: number, color: string, name: string, how: string, note: string) => (
    <div style={{opacity: s, transform: `translateX(${(1 - s) * 60}px)`, borderLeft: `10px solid ${color}`, padding: '10px 0 10px 20px'}}>
      <div style={{fontSize: 26, fontWeight: 700, color}}>{name}</div>
      <div style={{fontSize: 34, fontWeight: 700, color: SC.ink}}>{how}</div>
      <div style={{fontSize: 24, color: SC.subInk}}>{note}</div>
    </div>
  );
  return (
    <div style={{opacity: box, fontFamily: FONT_FAMILY, background: SC.panel, borderRadius: 16, padding: '22px 26px', boxShadow: '0 4px 14px rgba(0,0,0,0.10)', display: 'flex', flexDirection: 'column', gap: 16}}>
      <div style={{fontSize: 28, fontWeight: 700, color: SC.ink}}>何で判断する？</div>
      {row(a, '#8a8f99', '反射型（拡散反射）', '受光量の増減', '黒いモノは光が弱く、見逃しやすい')}
      {row(b, SC.ok, '距離設定型（BGS）', '戻った位置 ＝ 距離', '三角測距。光の強さに左右されにくい')}
    </div>
  );
};

export const bgs = ({frame, at}: VisualProps): Visual => {
  const drop = ramp(frame, at[1] + 6, 14);
  const hasObj = drop >= 1;
  const tri = ramp(frame, at[2] + 10, 12); // 三角測距の説明が始まる
  const lens = {x: 190, y: 262};
  const recv = {x: 196, y: 340};
  // 受光素子上の光点：背景（遠い）→ 右側、手前のモノ（近い）→ 左側
  const spotX = interpolate(drop, [0, 1], [500, 290]);
  const spotOn = hasObj ? tri : ramp(frame, at[0] + 20);
  return {
    diagram: (
      <g>
        <SvgText x={120} y={160} size={30}>
          投光／受光器
        </SvgText>
        <SensorBody x={60} y={205} face="right" />
        {/* 受光窓（投光レンズから離れた位置にあり、戻る角度の違いが位置の違いになる） */}
        <rect x={173} y={325} width={14} height={30} rx={4} fill="#3a3f4a" />
        {/* 背景 */}
        <rect x={980} y={150} width={50} height={260} fill="#b9bdc7" />
        <SvgText x={1005} y={130} size={24}>
          背景
        </SvgText>
        {/* 設定距離 */}
        <line x1={720} y1={150} x2={720} y2={410} stroke={SC.good} strokeWidth={4} strokeDasharray="12 10" />
        <SvgText x={720} y={130} size={24} color={SC.good}>
          設定距離
        </SvgText>
        {/* 光：モノがなければ背景へ、あれば手前のモノへ */}
        <Beam x1={lens.x} y1={lens.y} x2={hasObj ? 448 : 975} y2={lens.y} />
        <Beam x1={975} y1={lens.y} x2={recv.x} y2={recv.y} color="#9aa0aa" width={6} opacity={hasObj ? 0.3 : 1} dashed={false} />
        {hasObj ? (
          <Beam x1={450} y1={lens.y} x2={recv.x} y2={recv.y} color={tri > 0 ? SC.ok : '#f5a35e'} width={tri > 0 ? 8 : 4} />
        ) : null}
        <ObjectBox x={450} y={190} w={70} h={180} dropIn={drop} fill="#2b2d33" stroke="#000" caption="黒いモノ" />
        {hasObj && tri <= 0 ? (
          <SvgText x={320} y={385} size={22} color={SC.warn} opacity={ramp(frame, at[1] + 24)}>
            返る光は弱い
          </SvgText>
        ) : null}
        {/* 受光素子（拡大図） */}
        <g opacity={ramp(frame, at[0] + 14)}>
          <line x1={186} y1={356} x2={240} y2={440} stroke={SC.subInk} strokeWidth={2} strokeDasharray="4 6" />
          <rect x={200} y={410} width={380} height={130} rx={12} fill="#f7f8fb" stroke="#c4cad6" strokeWidth={2} />
          <SvgText x={220} y={440} size={22} anchor="start">
            受光素子（拡大）
          </SvgText>
          <rect x={230} y={462} width={150} height={34} fill="#d6f0e1" />
          <rect x={380} y={462} width={170} height={34} fill="#e4e7ee" />
          <rect x={230} y={462} width={320} height={34} fill="none" stroke="#9aa0aa" strokeWidth={2} />
          <line x1={380} y1={452} x2={380} y2={506} stroke={SC.good} strokeWidth={3} strokeDasharray="6 5" />
          <SvgText x={305} y={528} size={22} color={SC.ok}>
            近い（検出）
          </SvgText>
          <SvgText x={465} y={528} size={22} color={SC.subInk}>
            遠い（無視）
          </SvgText>
          <circle cx={spotX} cy={479} r={20} fill={hasObj ? SC.ok : '#8a8f99'} opacity={0.3 * spotOn} />
          <circle cx={spotX} cy={479} r={11} fill={hasObj ? SC.ok : '#8a8f99'} opacity={spotOn} />
        </g>
        {hasObj && tri > 0 ? (
          <SvgText x={850} y={490} size={24} color={SC.ok} opacity={tri}>
            戻る角度 → 素子上の位置
          </SvgText>
        ) : null}
        {frame >= at[3] ? (
          <Badge x={560} y={600} text="手前のモノだけ検出・背景は無視" color={SC.good} scale={ramp(frame, at[3] + 6, 8)} />
        ) : hasObj && tri > 0 ? (
          <Badge x={560} y={600} text="近い位置に戻った → 検出" color={SC.ok} scale={ramp(frame, at[2] + 30, 8)} />
        ) : !hasObj ? (
          <Badge x={560} y={600} text="背景は遠い位置に戻る → 無視" color="#8a8f99" scale={ramp(frame, at[0] + 30, 8)} />
        ) : null}
      </g>
    ),
    panel: (
      <Panel>
        <MethodCompare at={at} />
        <PointCard start={at[3] + 10} kind="good" text="黒いモノ・色違いも安定" />
        <PointCard start={at[3] + 22} kind="good" text="背景の影響を受けにくい" />
      </Panel>
    ),
  };
};

export const VISUALS = {basics, thru, retro, transparent, diffuse, bgs};
