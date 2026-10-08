// コンサルティング営業体験（60分）の進行アプリ。
//   学生画面：投影する画面。問い → 考える → 選ぶ → 映像 → お客様の回答 → 分かったこと
//   進行役：右側のパネルで解説・比較・結果記録・場面移動・時間管理。投影用ウィンドウを別に開ける（?view=projector）
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {phases, sceneById, scenes} from '../data';
import type {DemoScene, PitchScene, QuestionScene, ReflectionScene, Scene} from '../types';
import {ClipPlayer, pauseFrames, type PlayerControl} from './ClipPlayer';
import {demoGate, discoveries, judge, phaseOf, useExperience, type Action, type ChoiceId, type DemoResult, type State} from './state';

const role: 'control' | 'projector' = new URLSearchParams(location.search).get('view') === 'projector' ? 'projector' : 'control';

const fmt = (ms: number) => {
  const s = Math.max(0, Math.floor(Math.abs(ms) / 1000));
  return `${ms < 0 ? '-' : ''}${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const useNow = (ms = 1000) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
};

const useAvailable = () => {
  const [set, setSet] = useState<Set<string>>(new Set());
  useEffect(() => {
    fetch('available.json')
      .then((r) => (r.ok ? r.json() : []))
      .then((list: string[]) => setSet(new Set(list)))
      .catch(() => setSet(new Set()));
  }, []);
  return set;
};

type Ctx = {
  state: State;
  dispatch: React.Dispatch<Action>;
  available: Set<string>;
  facilitator: boolean;
  projector: boolean;
  controlRef: React.MutableRefObject<PlayerControl | null>;
  demoFiles: Record<string, string>;
  setDemoFile: (sceneId: string, url: string) => void;
  projectorOpen: boolean;
  sendCmd: (c: 'play' | 'pause') => void;
};

export const App: React.FC = () => {
  const {state, dispatch, sendCmd, onCmd} = useExperience(role);
  const available = useAvailable();
  const [facilitator, setFacilitator] = useState(() => {
    try {
      return localStorage.getItem('optexfa-xp-mode') === 'facilitator';
    } catch {
      return false;
    }
  });
  const [projectorOpen, setProjectorOpen] = useState(false);
  const [demoFiles, setDemoFiles] = useState<Record<string, string>>({});
  const controlRef = useRef<PlayerControl | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [unlocked, setUnlocked] = useState(role === 'control');

  useEffect(() => {
    try {
      localStorage.setItem('optexfa-xp-mode', facilitator ? 'facilitator' : 'student');
    } catch {
      // 保存できなくても動く
    }
  }, [facilitator]);

  // 投影用ウィンドウ：進行役からの再生・一時停止
  useEffect(() => (role === 'projector' ? onCmd((c) => (c === 'play' ? controlRef.current?.play() : controlRef.current?.pause())) : undefined), [onCmd]);

  // キーボード：→ 次へ／← 戻る（入力欄では無効）
  useEffect(() => {
    if (role !== 'control') return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'ArrowRight' && e.altKey) dispatch({type: 'next'});
      if (e.key === 'ArrowLeft' && e.altKey) dispatch({type: 'back'});
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch]);

  const scene = sceneById.get(state.sceneId)!;
  const ctx: Ctx = {
    state,
    dispatch,
    available,
    facilitator: facilitator && role === 'control',
    projector: role === 'projector',
    controlRef,
    demoFiles,
    setDemoFile: (id, url) => setDemoFiles((f) => ({...f, [id]: url})),
    projectorOpen,
    sendCmd,
  };

  const fullscreen = () => {
    const el = stageRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    else el.requestFullscreen?.().catch(() => undefined);
  };

  return (
    <div className={`app ${role === 'projector' ? 'is-projector' : ''}`}>
      <TopBar ctx={ctx} onFullscreen={fullscreen} onToggleMode={() => setFacilitator((f) => !f)} facilitatorMode={facilitator} />
      <div className="body">
        <main className="stage-col">
          <div className="stage" ref={stageRef}>
            {!unlocked ? (
              <button className="unlock" onClick={() => setUnlocked(true)}>
                クリックして投影を開始
                <small>音声を再生するために、最初に一度クリックしてください</small>
              </button>
            ) : (
              <SceneView key={state.sceneId} scene={scene} ctx={ctx} />
            )}
          </div>
          {role === 'control' ? <NavBar ctx={ctx} /> : null}
        </main>
        {role === 'control' ? (
          <aside className="side">
            {facilitator ? (
              <FacilitatorPanel
                ctx={ctx}
                onOpenProjector={() => {
                  window.open(`${location.pathname}?view=projector`, 'optexfa-xp-projector');
                  setProjectorOpen(true);
                }}
                sendCmd={sendCmd}
              />
            ) : (
              <Discoveries state={state} />
            )}
          </aside>
        ) : null}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- 上部バー
const TopBar: React.FC<{ctx: Ctx; onFullscreen: () => void; onToggleMode: () => void; facilitatorMode: boolean}> = ({ctx, onFullscreen, onToggleMode, facilitatorMode}) => {
  const {state, dispatch} = ctx;
  const now = useNow();
  const current = phaseOf(state.sceneId);
  const total = state.startedAt ? now - state.startedAt : 0;
  const phaseStart = state.phaseEnteredAt[current.phaseId];
  const phaseLeft = phaseStart ? current.minutes * 60000 - (now - phaseStart) : current.minutes * 60000;
  return (
    <header className="top">
      <div className="brand">
        <span className="slash" />
        <span className="brand-name">OPTEX-FA</span>
        <span className="brand-sub">コンサルティング営業体験</span>
      </div>
      <ol className="phases" aria-label="フェーズ">
        {phases.map((p) => {
          const idx = phases.findIndex((x) => x.phaseId === current.phaseId);
          const i = phases.indexOf(p);
          return (
            <li key={p.phaseId} className={i === idx ? 'on' : i < idx ? 'done' : ''}>
              <button
                disabled={!ctx.facilitator}
                onClick={() => {
                  const first = scenes.find((s) => s.phaseId === p.phaseId);
                  if (first) dispatch({type: 'go', sceneId: first.sceneId});
                }}
                title={p.goal}
              >
                <span className="ph-title">{p.short}</span>
                <span className="ph-min">{p.minutes}分</span>
              </button>
            </li>
          );
        })}
      </ol>
      <div className="timers">
        <div>
          <span className="t-label">経過</span>
          <span className="t-val">{fmt(total)} / 60:00</span>
        </div>
        <div className={phaseLeft < 0 ? 'over' : ''}>
          <span className="t-label">このフェーズ残り</span>
          <span className="t-val">{fmt(phaseLeft)}</span>
        </div>
      </div>
      {ctx.projector ? null : (
        <div className="tools">
          <label className="vol" title="音量">
            🔈
            <input type="range" min={0} max={1} step={0.05} value={state.volume} onChange={(e) => dispatch({type: 'volume', value: Number(e.target.value)})} aria-label="音量" />
          </label>
          <button className={state.showSubtitles ? 'on' : ''} onClick={() => dispatch({type: 'toggle', key: 'showSubtitles'})}>
            字幕 {state.showSubtitles ? 'ON' : 'OFF'}
          </button>
          <button onClick={onFullscreen}>全画面</button>
          <button className={facilitatorMode ? 'on accent' : ''} onClick={onToggleMode}>
            {facilitatorMode ? '進行役モード' : '学生画面'}
          </button>
        </div>
      )}
    </header>
  );
};

// ---------------------------------------------------------------- 下部の操作
const NavBar: React.FC<{ctx: Ctx}> = ({ctx}) => {
  const {state, dispatch} = ctx;
  const scene = sceneById.get(state.sceneId)!;
  const idx = scenes.findIndex((s) => s.sceneId === scene.sceneId);
  const canNext = scene.nextSceneId !== null && !(scene.type === 'question' && state.step !== 'result');
  return (
    <div className="nav">
      <button onClick={() => dispatch({type: 'back'})} disabled={!state.stack.length && !(scene.type === 'question' && state.step !== 'think')}>
        ← 戻る
      </button>
      <div className="nav-title">
        <span className="nav-phase">{phaseOf(scene.sceneId).title}</span>
        <span>{scene.title}</span>
        <span className="nav-count">
          {idx + 1} / {scenes.length}
        </span>
      </div>
      <button className="primary" onClick={() => dispatch({type: 'next'})} disabled={!canNext}>
        次へ →
      </button>
    </div>
  );
};

// ---------------------------------------------------------------- 場面
const SceneView: React.FC<{scene: Scene; ctx: Ctx}> = ({scene, ctx}) => {
  switch (scene.type) {
    case 'video':
      return <ClipView ctx={ctx} assetId="intro" title={scene.title} sceneId={scene.sceneId} />;
    case 'clip':
      return <ClipView ctx={ctx} assetId={scene.assetId} title={scene.title} sceneId={scene.sceneId} />;
    case 'question':
      return <QuestionView q={scene} ctx={ctx} />;
    case 'pitch':
      return <PitchView p={scene} ctx={ctx} />;
    case 'demo':
      return <DemoView d={scene} ctx={ctx} />;
    case 'reflection':
      return <ReflectionView r={scene} ctx={ctx} />;
    default:
      return null;
  }
};

const playerProps = (ctx: Ctx) => ({
  volume: ctx.state.volume,
  showSubtitles: ctx.state.showSubtitles,
  showStatus: ctx.state.showStatus,
  available: ctx.available,
  // 投影用ウィンドウが開いていれば、手元は音を出さない
  muted: ctx.projectorOpen && !ctx.projector,
  controlRef: ctx.controlRef,
});

const ClipView: React.FC<{ctx: Ctx; assetId: string; title: string; sceneId: string}> = ({ctx, assetId, title, sceneId}) => {
  const {state, dispatch} = ctx;
  const pauses = useMemo(() => pauseFrames(sceneId, assetId), [sceneId, assetId]);
  return (
    <div className="clip-view">
      <ClipPlayer
        assetId={assetId}
        autoPlay={state.step === 'playing'}
        playToken={state.playToken}
        onEnded={() => !ctx.projector && dispatch({type: 'step', step: 'done'})}
        pauses={pauses}
        readOnly={ctx.projector}
        onResume={() => ctx.projectorOpen && ctx.sendCmd('play')}
        {...playerProps(ctx)}
      />
      {state.step === 'ready' && !ctx.projector ? (
        <button className="play-overlay big" onClick={() => dispatch({type: 'step', step: 'playing'})}>
          ▶ {title}
        </button>
      ) : null}
    </div>
  );
};

// ---------------------------------------------------------------- 問い
const QuestionView: React.FC<{q: QuestionScene; ctx: Ctx}> = ({q, ctx}) => {
  const {state, dispatch} = ctx;
  const answer = state.answers[q.sceneId];
  const chosen = answer ? q.choices.find((c) => c.choiceId === answer.choiceId) : undefined;
  const revealed = !!state.revealed[q.sceneId];

  if (q.requiresDemoPass) {
    const gate = demoGate(q, state.demo);
    if (gate.status !== 'pass') return <DemoGate q={q} ctx={ctx} gate={gate} />;
  }

  if (state.step === 'playing' && chosen) {
    return (
      <div className="clip-view">
        <ClipPlayer assetId={chosen.assetId} autoPlay playToken={state.playToken} onEnded={() => !ctx.projector && dispatch({type: 'step', step: 'result'})} {...playerProps(ctx)} />
        {ctx.projector ? null : (
          <button className="skip" onClick={() => dispatch({type: 'step', step: 'result'})}>
            回答へ進む ⏭
          </button>
        )}
      </div>
    );
  }

  if (state.step === 'result' && chosen) {
    return (
      <div className="result">
        <div className="result-main">
          <div className="pill">あなたの質問 {chosen.choiceId}</div>
          <div className="your-q">{chosen.choiceText}</div>
          <div className="bubble">
            <span className="who">お客様</span>
            <span>{chosen.customerResponse}</span>
          </div>
          <div className="found">
            <div className="found-label">新しく分かったこと</div>
            <div className="found-text">{chosen.discovered}</div>
          </div>
          <div className="lp">
            <span className="lp-label">ポイント</span>
            {chosen.learningPoint}
          </div>
          {revealed ? (
            <div className="reveal">
              <div className="reveal-label">解説</div>
              <div className="reveal-text">{q.learningPoint}</div>
              {q.technicalInsight ? <div className="reveal-tech">技術の視点：{q.technicalInsight}</div> : null}
            </div>
          ) : null}
          {ctx.projector ? null : (
            <div className="result-actions">
              <label className="reason">
                この質問を選んだ理由（メモ）
                <textarea value={answer?.reason ?? ''} onChange={(e) => dispatch({type: 'reason', text: e.target.value})} rows={2} placeholder="例：いつ起きるかが分かれば、原因を絞れると思ったから" />
              </label>
              <div className="row">
                <button onClick={() => dispatch({type: 'compare', on: !state.compare})}>{state.compare ? '比較を閉じる' : '他の選択肢と比較する'}</button>
                <button onClick={() => dispatch({type: 'replay'})}>映像をもう一度</button>
                <button onClick={() => dispatch({type: 'back'})}>選び直す</button>
              </div>
            </div>
          )}
        </div>
        {state.compare ? <Compare q={q} chosen={chosen.choiceId} revealed={revealed} /> : null}
      </div>
    );
  }

  // 考える → 選ぶ
  return (
    <div className="question">
      <div className="q-backdrop">
        <ClipPlayer assetId={q.backdropAssetId} autoPlay loop muted controls={false} playToken={state.playToken} volume={0} showSubtitles={false} showStatus={false} available={ctx.available} />
      </div>
      <div className="q-card">
        <div className="q-phase">{phaseOf(q.sceneId).title}</div>
        {q.situationLine ? (
          <div className="q-situation">
            <span className="who">お客様</span>「{q.situationLine}」
          </div>
        ) : null}
        <h1 className="q-text">{q.questionText}</h1>
        {state.step === 'think' ? (
          <ThinkTimer seconds={q.thinkSeconds} ctx={ctx} />
        ) : (
          <div className="choices">
            {q.choices.map((c) => (
              <button key={c.choiceId} className={`choice ${answer?.tries.includes(c.choiceId) ? 'tried' : ''}`} disabled={ctx.projector} onClick={() => dispatch({type: 'choose', choiceId: c.choiceId as ChoiceId})}>
                <span className="choice-id">{c.choiceId}</span>
                <span className="choice-text">{c.choiceText}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const ThinkTimer: React.FC<{seconds: number; ctx: Ctx}> = ({seconds, ctx}) => {
  const [start] = useState(Date.now());
  const now = useNow(250);
  const left = Math.max(0, seconds - (now - start) / 1000);
  const p = left / seconds;
  return (
    <div className="think">
      <svg width={120} height={120} viewBox="0 0 120 120" aria-hidden>
        <circle cx={60} cy={60} r={52} fill="none" stroke="var(--line)" strokeWidth={8} />
        <circle cx={60} cy={60} r={52} fill="none" stroke="var(--red)" strokeWidth={8} strokeDasharray={2 * Math.PI * 52} strokeDashoffset={2 * Math.PI * 52 * (1 - p)} transform="rotate(-90 60 60)" />
        <text x={60} y={70} textAnchor="middle" fontSize={30} fontWeight={700} fill="currentColor">
          {Math.ceil(left)}
        </text>
      </svg>
      <div>
        <div className="think-title">まず、自分ならどうするかを考えよう</div>
        <div className="think-sub">ワークシートに書いてから、選択肢を見ます</div>
        {ctx.projector ? null : (
          <button className="primary" onClick={() => ctx.dispatch({type: 'step', step: 'choose'})}>
            選択肢を表示する
          </button>
        )}
      </div>
    </div>
  );
};

const Compare: React.FC<{q: QuestionScene; chosen: string; revealed: boolean}> = ({q, chosen, revealed}) => (
  <div className="compare">
    <div className="compare-title">ほかの質問なら、何が分かった？</div>
    {q.choices.map((c) => (
      <div key={c.choiceId} className={`cmp ${c.choiceId === chosen ? 'mine' : ''}`}>
        <div className="cmp-head">
          <span className="choice-id">{c.choiceId}</span>
          {c.choiceId === chosen ? <span className="tag">あなたの選択</span> : null}
          {revealed && q.recommendedChoice === c.choiceId ? <span className="tag red">おすすめ</span> : null}
        </div>
        <div className="cmp-q">{c.choiceText}</div>
        <div className="cmp-a">お客様：「{c.customerResponse}」</div>
        <div className="cmp-f">分かること：{c.discovered}</div>
      </div>
    ))}
  </div>
);

const DemoGate: React.FC<{q: QuestionScene; ctx: Ctx; gate: ReturnType<typeof demoGate>}> = ({q, ctx, gate}) => {
  const {dispatch} = ctx;
  if (ctx.projector || !ctx.facilitator) {
    return (
      <div className="gate">
        <div className="gate-title">実機デモの結果を確認しています</div>
        <div className="gate-sub">進行役が結果を記録するまで、お待ちください</div>
      </div>
    );
  }
  const name = (id: string) => sceneById.get(id)?.title ?? id;
  return (
    <div className="gate">
      <div className="gate-title">{gate.status === 'fail' ? '基準を満たさない結果がありました' : '実測結果が未記録です'}</div>
      <ul className="gate-list">
        {gate.results.map((r) => (
          <li key={r.id}>
            {name(r.id)}：<b className={r.ok === true ? 'ok' : r.ok === false ? 'ng' : ''}>{r.ok === true ? '基準を満たした' : r.ok === false ? '基準を満たさない' : '未記録'}</b>
          </li>
        ))}
      </ul>
      <div className="gate-sub">この問い（{q.title}）は、結果が基準を満たしたときだけ出します。結果を作ったり、成功したように言い換えたりしないでください。</div>
      <div className="row">
        {gate.status === 'missing' ? (
          <button onClick={() => dispatch({type: 'go', sceneId: gate.results.find((r) => r.ok === null)!.id})}>結果を記録する</button>
        ) : null}
        <button className="primary" onClick={() => q.fallbackSceneId && dispatch({type: 'go', sceneId: q.fallbackSceneId})}>
          追加調査の場面へ進む
        </button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- 提案トーク
const PitchView: React.FC<{p: PitchScene; ctx: Ctx}> = ({p, ctx}) => {
  const {state, dispatch} = ctx;
  const [running, setRunning] = useState<number | null>(null);
  const now = useNow(200);
  const left = running ? Math.max(0, p.seconds - (now - running) / 1000) : p.seconds;
  const revealed = !!state.revealed[p.sceneId];
  return (
    <div className="pitch">
      <div className="pitch-head">
        <h1>{p.title}</h1>
        <div className="pitch-timer">
          <span className={left === 0 ? 'over' : ''}>{Math.ceil(left)}秒</span>
          {ctx.projector ? null : (
            <button onClick={() => setRunning(running ? null : Date.now())}>{running ? 'リセット' : '30秒を計る'}</button>
          )}
        </div>
      </div>
      <div className="pitch-grid">
        {p.parts.map((part) => (
          <label key={part.label} className="pitch-part">
            <span className="pp-label">{part.label}</span>
            <span className="pp-hint">{part.hint}</span>
            <textarea rows={3} value={state.pitch[part.label] ?? ''} readOnly={ctx.projector} onChange={(e) => dispatch({type: 'pitch', key: part.label, text: e.target.value})} />
          </label>
        ))}
      </div>
      {revealed ? (
        <div className="pitch-example">
          <div className="reveal-label">例</div>
          {p.example.map((l) => (
            <p key={l}>{l}</p>
          ))}
        </div>
      ) : null}
    </div>
  );
};

// ---------------------------------------------------------------- 実機デモ
const DemoView: React.FC<{d: DemoScene; ctx: Ctx}> = ({d, ctx}) => {
  const {state, dispatch} = ctx;
  const r = state.demo[d.sceneId];
  const source = r?.source ?? 'simulation';
  const ok = judge(r);
  const fileUrl = ctx.demoFiles[d.sceneId];
  return (
    <div className="demo">
      <div className="demo-stage">
        {source === 'live' ? (
          <div className="live">
            <div className="live-badge">● LIVE 実機デモ</div>
            <div className="live-cond">{d.condition}</div>
            <div className="live-counts">
              <div>
                <span>通過した本数</span>
                <b>{r?.passed || '—'}</b>
              </div>
              <div>
                <span>カウント値</span>
                <b>{r?.counted || '—'}</b>
              </div>
              <div>
                <span>判定</span>
                <b className={ok === true ? 'ok' : ok === false ? 'ng' : ''}>{ok === null ? '測定中' : ok ? '基準を満たした' : '基準を満たさない'}</b>
              </div>
            </div>
          </div>
        ) : (
          <ClipPlayer assetId={d.assetId} autoPlay={state.step === 'playing'} playToken={state.playToken} overrideVideoUrl={source === 'video' ? fileUrl : undefined} {...playerProps(ctx)} />
        )}
        {source !== 'live' && state.step === 'ready' && !ctx.projector ? (
          <button className="play-overlay big" onClick={() => dispatch({type: 'step', step: 'playing'})}>
            ▶ {source === 'video' ? '実機デモ映像' : 'シミュレーション'}を再生
          </button>
        ) : null}
      </div>
      <div className="demo-side">
        <h2>{d.title}</h2>
        <div className="demo-cond">{d.condition}</div>
        <div className="demo-checks-label">確かめること</div>
        <ul className="demo-checks">
          {d.checks.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        {ctx.projector ? null : <DemoRecord d={d} ctx={ctx} />}
      </div>
    </div>
  );
};

const DemoRecord: React.FC<{d: DemoScene; ctx: Ctx}> = ({d, ctx}) => {
  const {state, dispatch} = ctx;
  const r = state.demo[d.sceneId];
  const set = (result: Partial<DemoResult>) => dispatch({type: 'demo', sceneId: d.sceneId, result});
  const ok = judge(r);
  return (
    <div className="record">
      <div className="seg" role="group" aria-label="映像の切り替え">
        {(
          [
            ['simulation', 'シミュレーション'],
            ['live', '実機（ライブ）'],
            ['video', '実機の動画'],
          ] as const
        ).map(([k, label]) => (
          <button key={k} className={(r?.source ?? 'simulation') === k ? 'on' : ''} onClick={() => set({source: k})}>
            {label}
          </button>
        ))}
      </div>
      {(r?.source ?? 'simulation') === 'video' ? (
        <label className="file">
          実機デモの動画ファイルを選ぶ
          <input
            type="file"
            accept="video/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) ctx.setDemoFile(d.sceneId, URL.createObjectURL(f));
            }}
          />
          <small>このブラウザでだけ再生します（投影用ウィンドウには、そちらで選び直してください）</small>
        </label>
      ) : null}
      <div className="record-title">実測を記録</div>
      <div className="record-grid">
        <label>
          通過させた本数
          <input inputMode="numeric" value={r?.passed ?? ''} onChange={(e) => set({passed: e.target.value.replace(/[^0-9]/g, '')})} />
        </label>
        <label>
          カウント値
          <input inputMode="numeric" value={r?.counted ?? ''} onChange={(e) => set({counted: e.target.value.replace(/[^0-9]/g, '')})} />
        </label>
      </div>
      <div className="record-q">1本の通過中に、出力が何度も切り替わった？</div>
      <div className="seg">
        <button className={r?.chatter === 'no' ? 'on' : ''} onClick={() => set({chatter: 'no'})}>なかった</button>
        <button className={r?.chatter === 'yes' ? 'on' : ''} onClick={() => set({chatter: 'yes'})}>あった</button>
      </div>
      <label className="record-note">
        メモ（条件・気づいたこと）
        <textarea rows={2} value={r?.note ?? ''} onChange={(e) => set({note: e.target.value})} />
      </label>
      <div className={`verdict ${ok === true ? 'ok' : ok === false ? 'ng' : ''}`}>
        判定：{ok === null ? '未記録（本数・カウント値・出力の切り替わりを入力）' : ok ? '基準を満たした' : '基準を満たさない → 追加調査へ'}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- 振り返り
const ReflectionView: React.FC<{r: ReflectionScene; ctx: Ctx}> = ({r, ctx}) => {
  const {state, dispatch} = ctx;
  const [start, setStart] = useState<number | null>(null);
  const now = useNow();
  const left = start ? r.minutes * 60000 - (now - start) : r.minutes * 60000;
  return (
    <div className={`reflection ${r.assetId ? 'with-media' : ''}`}>
      <div className="refl-main">
        <div className="q-phase">振り返り</div>
        <h1 className="q-text">{r.question}</h1>
        {r.examples ? (
          <ul className="refl-examples">
            {r.examples.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        ) : null}
        <div className="refl-timer">
          <span className={left < 0 ? 'over' : ''}>{fmt(left)}</span>
          {ctx.projector ? null : <button onClick={() => setStart(start ? null : Date.now())}>{start ? 'リセット' : `${r.minutes}分を計る`}</button>}
        </div>
        <label className="refl-note">
          出てきた意見（進行役がメモ）
          <textarea rows={3} readOnly={ctx.projector} value={state.notes[r.sceneId] ?? ''} onChange={(e) => dispatch({type: 'note', sceneId: r.sceneId, text: e.target.value})} />
        </label>
      </div>
      {r.assetId ? (
        <div className="refl-media">
          <ClipPlayer assetId={r.assetId} autoPlay={state.step === 'playing'} playToken={state.playToken} {...playerProps(ctx)} />
          {state.step === 'ready' && !ctx.projector ? (
            <button className="play-overlay" onClick={() => dispatch({type: 'step', step: 'playing'})}>
              ▶ 現場の例を見る
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

// ---------------------------------------------------------------- 学生画面の右：分かったこと
const Discoveries: React.FC<{state: State}> = ({state}) => {
  const list = discoveries(state.answers);
  const cur = phaseOf(state.sceneId);
  return (
    <div className="disc">
      <div className="disc-goal">
        <div className="disc-label">このフェーズの目的</div>
        <div>{cur.goal}</div>
      </div>
      <div className="disc-label">これまでに分かったこと</div>
      {list.length ? (
        <ol className="disc-list">
          {list.map((d) => (
            <li key={d.sceneId}>
              <span className="disc-ph">{phases.find((p) => p.phaseId === d.phaseId)?.title.replace(/ .*/, '')}</span>
              {d.text}
            </li>
          ))}
        </ol>
      ) : (
        <div className="disc-empty">質問して分かったことが、ここにたまっていきます。</div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------- 進行役パネル
const FacilitatorPanel: React.FC<{ctx: Ctx; onOpenProjector: () => void; sendCmd: (c: 'play' | 'pause') => void}> = ({ctx, onOpenProjector, sendCmd}) => {
  const {state, dispatch} = ctx;
  const scene = sceneById.get(state.sceneId)!;
  const [confirmReset, setConfirmReset] = useState(false);
  const [copied, setCopied] = useState('');
  const record = useMemo(() => buildRecord(state), [state]);
  const revealed = !!state.revealed[scene.sceneId];
  const json = JSON.stringify(record, null, 2);
  return (
    <div className="fac">
      <section>
        <div className="fac-label">いまの場面</div>
        <div className="fac-scene">{scene.title}</div>
        {scene.facilitatorNote ? <div className="fac-note">{scene.facilitatorNote}</div> : null}
        {scene.type === 'question' ? (
          <div className="fac-q">
            <div>
              推奨：<b>{scene.recommendedChoice}</b>（学生には「解説を表示」まで出ません）
            </div>
            <div className="fac-lp">{scene.learningPoint}</div>
          </div>
        ) : null}
        {scene.type === 'question' || scene.type === 'pitch' ? (
          <button className={revealed ? 'on' : ''} onClick={() => dispatch({type: 'reveal', on: !revealed})}>
            {revealed ? '解説を隠す' : scene.type === 'pitch' ? '例を表示' : '解説を表示'}
          </button>
        ) : null}
      </section>

      <section>
        <div className="fac-label">投影・再生</div>
        <div className="row">
          <button onClick={onOpenProjector}>投影用ウィンドウを開く</button>
          <button onClick={() => (ctx.projectorOpen ? sendCmd('pause') : ctx.controlRef.current?.pause())}>⏸ 一時停止</button>
          <button onClick={() => (ctx.projectorOpen ? sendCmd('play') : ctx.controlRef.current?.play())}>▶ 再生</button>
        </div>
        <label className="chk">
          <input type="checkbox" checked={state.showStatus} onChange={() => dispatch({type: 'toggle', key: 'showStatus'})} />
          映像に素材の状態（仮映像・CGなど）を表示
        </label>
      </section>

      <section>
        <div className="fac-label">選択結果</div>
        <table className="fac-table">
          <tbody>
            {scenes
              .filter((s): s is QuestionScene => s.type === 'question')
              .map((q) => {
                const a = state.answers[q.sceneId];
                return (
                  <tr key={q.sceneId}>
                    <td>{q.title}</td>
                    <td className={a ? (a.choiceId === q.recommendedChoice ? 'ok' : 'ng') : ''}>{a ? a.tries.join('→') : '—'}</td>
                  </tr>
                );
              })}
            {scenes
              .filter((s): s is DemoScene => s.type === 'demo')
              .map((d) => {
                const ok = judge(state.demo[d.sceneId]);
                return (
                  <tr key={d.sceneId}>
                    <td>{d.title}</td>
                    <td className={ok === true ? 'ok' : ok === false ? 'ng' : ''}>{ok === null ? '未記録' : ok ? '基準OK' : '基準NG'}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </section>

      <section>
        <div className="fac-label">場面へ移動</div>
        <select value={state.sceneId} onChange={(e) => dispatch({type: 'go', sceneId: e.target.value})} aria-label="場面へ移動">
          {phases.map((p) => (
            <optgroup key={p.phaseId} label={`${p.title}（${p.minutes}分）`}>
              {scenes
                .filter((s) => s.phaseId === p.phaseId)
                .map((s) => (
                  <option key={s.sceneId} value={s.sceneId}>
                    {s.title}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </section>

      <section>
        <div className="fac-label">記録</div>
        <div className="row">
          <button
            onClick={() => {
              const blob = new Blob([json], {type: 'application/json'});
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = `consulting-experience-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '')}.json`;
              a.click();
            }}
          >
            記録を保存（JSON）
          </button>
          <button
            onClick={() =>
              navigator.clipboard
                .writeText(json)
                .then(() => setCopied('コピーしました'))
                .catch(() => setCopied('コピーできませんでした'))
            }
          >
            記録をコピー
          </button>
        </div>
        {copied ? <div className="fac-small">{copied}</div> : null}
        {confirmReset ? (
          <div className="confirm">
            記録を消して最初からやり直しますか？
            <div className="row">
              <button className="danger" onClick={() => (dispatch({type: 'reset'}), setConfirmReset(false))}>
                最初からやり直す
              </button>
              <button onClick={() => setConfirmReset(false)}>やめる</button>
            </div>
          </div>
        ) : (
          <button className="danger-ghost" onClick={() => setConfirmReset(true)}>
            最初からやり直す…
          </button>
        )}
      </section>
      <div className="fac-small">ショートカット：Alt + → 次へ ／ Alt + ← 戻る ／ Space 再生・一時停止</div>
    </div>
  );
};

const buildRecord = (s: State) => ({
  savedAt: new Date().toISOString(),
  startedAt: s.startedAt ? new Date(s.startedAt).toISOString() : null,
  answers: scenes
    .filter((x): x is QuestionScene => x.type === 'question')
    .map((q) => {
      const a = s.answers[q.sceneId];
      return {
        questionId: q.sceneId,
        question: q.questionText,
        choices: a?.tries ?? [],
        final: a?.choiceId ?? null,
        recommended: q.recommendedChoice,
        reason: a?.reason ?? '',
      };
    }),
  demo: scenes
    .filter((x): x is DemoScene => x.type === 'demo')
    .map((d) => ({sceneId: d.sceneId, condition: d.condition, ...s.demo[d.sceneId], judged: judge(s.demo[d.sceneId])})),
  pitch: s.pitch,
  reflection: s.notes,
});
