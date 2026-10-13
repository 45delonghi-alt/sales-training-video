// コンサルティング営業体験（60分）の進行アプリ。
//   学生画面：投影する画面。問い → 考える → 選ぶ → 映像 → お客様の回答 → 分かったこと
//   進行役：右側のパネルで解説・比較・結果記録・場面移動・時間管理。投影用ウィンドウを別に開ける（?view=projector）
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {characterById, glossaryByKey, phases, questions, salesLineOf, sceneById, scenes} from '../data';
import type {Choice, DemoScene, Line, QuestionScene, ReflectionScene, Scene} from '../types';
import {ClipPlayer, pauseFrames, type PlayerControl} from './ClipPlayer';
import {demoGate, discoveries, judge, phaseOf, useExperience, type Action, type ChoiceId, type DemoResult, type State} from './state';
import {createSession, sendVote, serverInfo, setCurrent, useVoteStatus, voterId, type VoteStatus} from './vote';

const params = new URLSearchParams(location.search);
const view = params.get('view');
const role: 'control' | 'projector' = view === 'projector' ? 'projector' : 'control';

const nameOf = (speaker: Line['speaker']) => characterById.get(speaker)?.name ?? '';
const titleOf = (speaker: Line['speaker']) => {
  const c = characterById.get(speaker);
  return c ? c.title.replace(/（.*）/, '') : '';
};

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

export const App: React.FC = () => (view === 'vote' ? <VoteApp sessionId={(params.get('session') ?? '').toUpperCase()} /> : <Experience />);

const Experience: React.FC = () => {
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

  // スマートフォン回答：いまの問いをサーバーに知らせる（選択肢を表示している間だけ受け付ける）
  const voteSession = state.vote?.sessionId;
  const voteKey = scene.type === 'question' ? `${scene.sceneId}:${state.answers[scene.sceneId]?.tries.length ?? 0}` : '';
  const voteOpen = scene.type === 'question' && state.step === 'choose';
  useEffect(() => {
    if (role !== 'control' || !voteSession) return;
    const q = scene.type === 'question' ? scene : null;
    setCurrent(
      voteSession,
      q ? {key: voteKey, questionId: q.questionId, questionText: q.questionText, choices: q.choices.map((c) => ({choiceId: c.choiceId, choiceText: c.choiceText})), open: voteOpen} : null,
    ).catch(() => undefined);
  }, [voteSession, voteKey, voteOpen, scene]);

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
            {unlocked ? <VoteOverlay ctx={ctx} /> : null}
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
        <span className="nav-phase">{phaseOf(scene.sceneId).phaseTitle}</span>
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
      return <ClipView ctx={ctx} assetId={scene.videoAsset} title={scene.title} sceneId={scene.sceneId} last={scene.nextSceneId === null} />;
    case 'question':
      return <QuestionView q={scene} ctx={ctx} />;
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

const ClipView: React.FC<{ctx: Ctx; assetId: string; title: string; sceneId: string; last?: boolean}> = ({ctx, assetId, title, sceneId, last}) => {
  const {state, dispatch} = ctx;
  const pauses = useMemo(() => pauseFrames(sceneId, assetId), [sceneId, assetId]);
  if (last && state.step === 'done') return <EndScreen ctx={ctx} />;
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
// 流れ：お客様の言葉 → 問い → 考える → A/B/C → 選ぶ → 専用映像 → お客様の回答 → 分かったこと → 解説（推奨と理由） → 次へ
const QuestionView: React.FC<{q: QuestionScene; ctx: Ctx}> = ({q, ctx}) => {
  const {state, dispatch} = ctx;
  const answer = state.answers[q.sceneId];
  const chosen = answer ? q.choices.find((c) => c.choiceId === answer.choiceId) : undefined;

  if (q.requiresDemoPass) {
    const gate = demoGate(q, state.demo);
    if (gate.status !== 'pass') return <DemoGate q={q} ctx={ctx} gate={gate} />;
  }

  if (state.step === 'playing' && chosen) {
    return (
      <div className="clip-view">
        <ClipPlayer assetId={chosen.videoAsset} autoPlay playToken={state.playToken} onEnded={() => !ctx.projector && dispatch({type: 'step', step: 'result'})} {...playerProps(ctx)} />
        {ctx.projector ? null : (
          <button className="skip" onClick={() => dispatch({type: 'step', step: 'result'})}>
            回答へ進む ⏭
          </button>
        )}
      </div>
    );
  }

  if (state.step === 'result' && chosen) return <ResultView q={q} chosen={chosen} ctx={ctx} />;

  // 考える → 選ぶ
  const hintOn = !!state.hints[q.sceneId];
  return (
    <div className="question">
      <div className="q-backdrop">
        <ClipPlayer assetId={q.backdropAsset} autoPlay loop muted controls={false} playToken={state.playToken} volume={0} showSubtitles={false} showStatus={false} available={ctx.available} />
      </div>
      <div className="q-card">
        <div className="q-phase">
          {phaseOf(q.sceneId).phaseTitle}
          <span className="q-id">{q.questionId}</span>
        </div>
        {q.situation ? (
          <div className="q-situation">
            <span className="who">{nameOf(q.situation.speaker)}</span>「{q.situation.text}」
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
        <div className="q-aids">
          {q.hint ? (
            hintOn ? (
              <div className="hint">
                <span className="who">{nameOf(q.hint.speaker)}（{titleOf(q.hint.speaker)}）</span>
                {q.hint.text}
              </div>
            ) : ctx.projector ? null : (
              <button className="ghost" onClick={() => dispatch({type: 'hint', on: true})}>
                💡 先輩のヒントを見る
              </button>
            )
          ) : null}
          <Glossary keys={q.glossary} />
        </div>
      </div>
    </div>
  );
};

const Glossary: React.FC<{keys?: string[]}> = ({keys}) => {
  const items = (keys ?? []).map((k) => glossaryByKey.get(k)).filter((g): g is NonNullable<typeof g> => !!g);
  if (!items.length) return null;
  return (
    <div className="glossary">
      {items.map((g) => (
        <details key={g.key}>
          <summary>用語：{g.term}</summary>
          <div>{g.short}</div>
        </details>
      ))}
    </div>
  );
};

const ResultView: React.FC<{q: QuestionScene; chosen: Choice; ctx: Ctx}> = ({q, chosen, ctx}) => {
  const {state, dispatch} = ctx;
  const answer = state.answers[q.sceneId];
  const rec = q.recommendedChoice;
  const recChoice = rec ? q.choices.find((c) => c.choiceId === rec) : undefined;
  return (
    <div className="result">
      <div className="result-main">
        <div className="pill">あなたの選択 {chosen.choiceId}</div>
        <div className="your-q">
          <span className="who">あなた</span>「{salesLineOf(chosen)}」
        </div>
        <div className="bubble">
          <span className="who">{nameOf(chosen.responder)}</span>
          <span>「{chosen.customerResponse}」</span>
        </div>
        <div className="found-grid">
          <div className="found">
            <div className="found-label">分かったこと</div>
            <div className="found-text">{chosen.gained}</div>
          </div>
          <div className="found missing">
            <div className="found-label">まだ分からないこと</div>
            <div className="found-text">{chosen.missing}</div>
          </div>
        </div>
        <div className="lp">
          <span className="lp-label">ポイント</span>
          {chosen.learningPoint}
        </div>
        <div className="reveal">
          <div className="reveal-label">{rec ? `推奨：${rec}` : '推奨：なし（どれも大切な確認）'}</div>
          {recChoice && rec !== chosen.choiceId ? <div className="reveal-choice">{recChoice.choiceText}</div> : null}
          {rec === chosen.choiceId ? <div className="reveal-choice">あなたの選択と同じです</div> : null}
          <div className="reveal-text">{q.recommendReason}</div>
          <div className="reveal-sub">{q.learningPoint}</div>
          {chosen.technicalInsight ?? q.technicalInsight ? <div className="reveal-tech">技術の視点：{chosen.technicalInsight ?? q.technicalInsight}</div> : null}
          {rec && rec !== chosen.choiceId ? <div className="reveal-note">ほかの選択でも先へ進めます。違いを比べることが学びになります。</div> : null}
        </div>
        {ctx.projector ? null : (
          <div className="result-actions">
            <label className="reason">
              この選択肢を選んだ理由（メモ）
              <textarea value={answer?.reason ?? ''} onChange={(e) => dispatch({type: 'reason', text: e.target.value})} rows={2} placeholder="例：どれくらい多いかが分かれば、問題の大きさがつかめると思ったから" />
            </label>
            <div className="row">
              <button onClick={() => dispatch({type: 'replay'})}>映像をもう一度</button>
              <button onClick={() => dispatch({type: 'back'})}>選び直す</button>
            </div>
          </div>
        )}
      </div>
      {state.compare ? <Compare q={q} chosen={chosen.choiceId} /> : null}
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

// 進行役が表示する「ほかの選択肢なら、どうなった？」
const Compare: React.FC<{q: QuestionScene; chosen: string}> = ({q, chosen}) => (
  <div className="compare">
    <div className="compare-title">ほかの選択肢なら、どうなった？</div>
    {q.choices.map((c) => (
      <div key={c.choiceId} className={`cmp ${c.choiceId === chosen ? 'mine' : ''}`}>
        <div className="cmp-head">
          <span className="choice-id">{c.choiceId}</span>
          {c.choiceId === chosen ? <span className="tag">あなたの選択</span> : null}
          {q.recommendedChoice === c.choiceId ? <span className="tag red">推奨</span> : null}
        </div>
        <div className="cmp-q">{c.choiceText}</div>
        <div className="cmp-a">
          {nameOf(c.responder)}：「{c.customerResponse}」
        </div>
        <div className="cmp-f">分かる：{c.gained}</div>
        <div className="cmp-m">まだ分からない：{c.missing}</div>
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
                <span>センサの出力回数</span>
                <b>{r?.outputs || '—'}</b>
              </div>
              <div>
                <span>カウント値（PLC）</span>
                <b>{r?.counted || '—'}</b>
              </div>
              <div>
                <span>判定</span>
                <b className={ok === true ? 'ok' : ok === false ? 'ng' : ''}>{ok === null ? '測定中' : ok ? '基準を満たした' : '基準を満たさない'}</b>
              </div>
            </div>
          </div>
        ) : (
          <ClipPlayer assetId={d.videoAsset} autoPlay={state.step === 'playing'} playToken={state.playToken} overrideVideoUrl={source === 'video' ? fileUrl : undefined} {...playerProps(ctx)} />
        )}
        {source !== 'live' && state.step === 'ready' ? (
          <div className="predict-overlay">
            {d.predictPrompt ? (
              <div className="predict">
                <div className="predict-label">結果を見る前に、予想しよう</div>
                <div className="predict-q">{d.predictPrompt}</div>
              </div>
            ) : null}
            {ctx.projector ? null : (
              <button className="primary big" onClick={() => dispatch({type: 'step', step: 'playing'})}>
                ▶ {source === 'video' ? '実機デモ映像' : 'シミュレーション（見方の説明）'}を再生
              </button>
            )}
          </div>
        ) : null}
      </div>
      <div className="demo-side">
        <h2>{d.title}</h2>
        <div className="demo-cond">{d.condition}</div>
        {source === 'simulation' ? <div className="demo-sim-note">シミュレーションは見方の説明です。結果は実機で確かめます。</div> : null}
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
          センサの出力回数
          <input inputMode="numeric" value={r?.outputs ?? ''} onChange={(e) => set({outputs: e.target.value.replace(/[^0-9]/g, '')})} />
        </label>
        <label>
          カウント値（PLC）
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
        判定：{ok === null ? '未記録（本数・出力回数・カウント値・出力の切り替わりを入力）' : ok ? '基準を満たした' : '基準を満たさない → 追加調査へ'}
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
    <div className={`reflection ${r.videoAsset ? 'with-media' : ''}`}>
      <div className="refl-main">
        <div className="q-phase">振り返り</div>
        <h1 className="q-text">{r.question}</h1>
        <div className="refl-timer">
          <span className={left < 0 ? 'over' : ''}>{fmt(left)}</span>
          {ctx.projector ? null : <button onClick={() => setStart(start ? null : Date.now())}>{start ? 'リセット' : `${r.minutes}分を計る`}</button>}
        </div>
        <label className="refl-note">
          出てきた意見（進行役がメモ）
          <textarea rows={3} readOnly={ctx.projector} value={state.notes[r.sceneId] ?? ''} onChange={(e) => dispatch({type: 'note', sceneId: r.sceneId, text: e.target.value})} />
        </label>
      </div>
      {r.videoAsset ? (
        <div className="refl-media">
          <ClipPlayer assetId={r.videoAsset} autoPlay={state.step === 'playing'} playToken={state.playToken} {...playerProps(ctx)} />
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
  const last = list[list.length - 1];
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
              <span className="disc-ph">{phases.find((p) => p.phaseId === d.phaseId)?.short}</span>
              {d.text}
            </li>
          ))}
        </ol>
      ) : (
        <div className="disc-empty">質問して分かったことが、ここにたまっていきます。</div>
      )}
      {last ? (
        <div className="disc-missing">
          <div className="disc-label">まだ分からないこと</div>
          <div>{last.missing}</div>
        </div>
      ) : null}
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
              推奨：<b>{scene.recommendedChoice ?? 'なし'}</b>（学生には回答後に表示されます）
            </div>
            <div className="fac-lp">{scene.recommendReason}</div>
            <div className="row">
              {scene.hint ? (
                <button className={state.hints[scene.sceneId] ? 'on' : ''} onClick={() => dispatch({type: 'hint', on: !state.hints[scene.sceneId]})}>
                  {state.hints[scene.sceneId] ? 'ヒントを隠す' : 'ヒントを表示'}
                </button>
              ) : null}
              <button className={state.compare ? 'on' : ''} disabled={state.step !== 'result'} onClick={() => dispatch({type: 'compare', on: !state.compare})}>
                {state.compare ? '比較を閉じる' : 'ほかの選択肢の結果を表示'}
              </button>
            </div>
            <div className="fac-small">選択肢ごとの映像を見せるときは、「選び直す」でほかの選択肢を選んでください。</div>
          </div>
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

      <VotePanel ctx={ctx} />

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
                    <td>
                      {q.questionId} {q.title}
                    </td>
                    <td className={a ? (q.recommendedChoice === null || a.choiceId === q.recommendedChoice ? 'ok' : 'ng') : ''}>{a ? a.tries.join('→') : '—'}</td>
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
            <optgroup key={p.phaseId} label={`${p.phaseTitle}（${p.minutes}分）`}>
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
        questionId: q.questionId,
        sceneId: q.sceneId,
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
  reflection: s.notes,
});

// ---------------------------------------------------------------- 終了画面
const EndScreen: React.FC<{ctx: Ctx}> = ({ctx}) => {
  const {state} = ctx;
  return (
    <div className="end">
      <div className="end-brand">OPTEX-FA CONSULTING SALES EXPERIENCE</div>
      <h1>体験はここまでです</h1>
      <div className="end-steps">
        {['聞く', '考える', '課題を見つける', '提案する'].map((w, i) => (
          <span key={w}>
            <b>{i + 1}</b>
            {w}
          </span>
        ))}
        <span className="end-last">そして、確かめる</span>
      </div>
      <table className="end-table">
        <thead>
          <tr>
            <th>問い</th>
            <th>あなたの選択</th>
            <th>推奨</th>
          </tr>
        </thead>
        <tbody>
          {questions.map((q) => {
            const a = state.answers[q.sceneId];
            return (
              <tr key={q.sceneId}>
                <td>
                  <span className="q-id">{q.questionId}</span> {q.questionText}
                </td>
                <td>{a ? a.tries.join(' → ') : '—'}</td>
                <td>{q.recommendedChoice ?? 'なし'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// ---------------------------------------------------------------- スマートフォン回答（投影画面の表示）
const VoteBars: React.FC<{status: VoteStatus; recommended?: string | null}> = ({status, recommended}) => {
  const max = Math.max(1, ...['A', 'B', 'C'].map((k) => status.counts[k] ?? 0));
  return (
    <div className="vote-bars">
      {(['A', 'B', 'C'] as const).map((k) => {
        const n = status.counts[k] ?? 0;
        return (
          <div key={k} className="vb-row">
            <span className="choice-id">{k}</span>
            <span className="vb-track">
              <span className={`vb-bar ${recommended === k ? 'rec' : ''}`} style={{width: `${(n / max) * 100}%`}} />
            </span>
            <span className="vb-n">{n}人</span>
          </div>
        );
      })}
    </div>
  );
};

const VoteOverlay: React.FC<{ctx: Ctx}> = ({ctx}) => {
  const {state} = ctx;
  const scene = sceneById.get(state.sceneId)!;
  const {status} = useVoteStatus(state.vote?.sessionId);
  if (!state.vote || scene.type !== 'question') return null;
  const sameKey = status?.current?.key?.startsWith(`${scene.sceneId}:`);
  const total = sameKey ? status!.total : 0;
  if (state.vote.show && status && sameKey) {
    return (
      <div className="vote-overlay big">
        <div className="vo-title">みんなの回答（{total}人）</div>
        <VoteBars status={status} recommended={state.step === 'result' ? scene.recommendedChoice : undefined} />
      </div>
    );
  }
  if (state.step !== 'think' && state.step !== 'choose') return null;
  return (
    <div className="vote-overlay">
      <div className="vo-label">スマートフォンで回答</div>
      <div className="vo-url">{state.vote.joinUrl}</div>
      <div className="vo-code">
        コード <b>{state.vote.sessionId}</b>
      </div>
      <div className="vo-count">{state.step === 'choose' ? `回答 ${total}人` : '選択肢の表示後に回答できます'}</div>
    </div>
  );
};

// ---------------------------------------------------------------- スマートフォン回答（進行役パネル）
const VotePanel: React.FC<{ctx: Ctx}> = ({ctx}) => {
  const {state, dispatch} = ctx;
  const [msg, setMsg] = useState('');
  const {status, error} = useVoteStatus(state.vote?.sessionId);
  const scene = sceneById.get(state.sceneId)!;
  const start = async () => {
    try {
      const {sessionId} = await createSession();
      const info = await serverInfo().catch(() => ({lan: [] as string[], port: Number(location.port || 80)}));
      const local = ['localhost', '127.0.0.1'].includes(location.hostname);
      const host = local && info.lan[0] ? `${info.lan[0]}:${location.port || info.port}` : location.host;
      dispatch({type: 'vote', vote: {sessionId, joinUrl: `${location.protocol}//${host}${location.pathname}?view=vote&session=${sessionId}`, show: false}});
      setMsg(local && !info.lan[0] ? 'この PC のネットワーク上の住所（IP）が見つかりません。スマートフォンと同じネットワークにつないでください。' : '');
    } catch {
      setMsg('スマートフォン回答は、配信サーバー（npm run experience:serve）で開いたときだけ使えます。');
    }
  };
  if (!state.vote) {
    return (
      <section>
        <div className="fac-label">スマートフォン回答（任意）</div>
        <button onClick={start}>回答の受付を始める</button>
        <div className="fac-small">使わない場合は、進行役が会場の多数決などで選択肢を選びます。</div>
        {msg ? <div className="fac-warn">{msg}</div> : null}
      </section>
    );
  }
  const sameKey = scene.type === 'question' && status?.current?.key?.startsWith(`${scene.sceneId}:`);
  const counts = sameKey ? status!.counts : {};
  const top = (['A', 'B', 'C'] as const).reduce<ChoiceId | null>((best, k) => ((counts[k] ?? 0) > (best ? counts[best] ?? 0 : 0) ? k : best), null);
  return (
    <section>
      <div className="fac-label">スマートフォン回答</div>
      <div className="fac-small">
        コード <b>{state.vote.sessionId}</b> ／ {state.vote.joinUrl}
      </div>
      {error ? <div className="fac-warn">サーバーに接続できません（配信サーバーが止まっていませんか？）</div> : null}
      {scene.type === 'question' && status && sameKey ? (
        <>
          <div className="fac-small">
            {status.current?.open ? '受付中' : '受付終了'}：{status.total}人
          </div>
          <VoteBars status={status} />
          {status.reasons.length ? (
            <details className="fac-reasons">
              <summary>理由（{status.reasons.length}件）</summary>
              <ul>
                {status.reasons.map((r, i) => (
                  <li key={i}>
                    <b>{r.choiceId}</b> {r.reason}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
          <div className="row">
            <button className={state.vote.show ? 'on' : ''} onClick={() => dispatch({type: 'vote', vote: {...state.vote!, show: !state.vote!.show}})}>
              {state.vote.show ? '集計を隠す' : '集計を投影'}
            </button>
            <button disabled={state.step !== 'choose' || !top} onClick={() => top && dispatch({type: 'choose', choiceId: top})}>
              最多の{top ?? ''}で進める
            </button>
          </div>
        </>
      ) : (
        <div className="fac-small">問いの場面で、選択肢を表示している間だけ受け付けます。</div>
      )}
      <button className="danger-ghost" onClick={() => dispatch({type: 'vote', vote: null})}>
        回答の受付を終える
      </button>
    </section>
  );
};

// ---------------------------------------------------------------- スマートフォン回答（学生の端末）
const VoteApp: React.FC<{sessionId: string}> = ({sessionId}) => {
  const [code, setCode] = useState('');
  const {status, error} = useVoteStatus(sessionId || undefined, true);
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [reason, setReason] = useState('');
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState('');
  if (!sessionId) {
    return (
      <div className="vote-app">
        <h1>コンサルティング営業体験</h1>
        <p>スクリーンに表示されたコードを入力してください。</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            location.search = `?view=vote&session=${encodeURIComponent(code.trim().toUpperCase())}`;
          }}
        >
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="例：K7M2Q" autoCapitalize="characters" aria-label="コード" />
          <button className="primary">参加する</button>
        </form>
      </div>
    );
  }
  const cur = status?.current;
  const mine = cur ? picked[cur.key] : undefined;
  const send = async (choiceId: string) => {
    if (!cur) return;
    setSending(true);
    setMsg('');
    try {
      await sendVote(sessionId, {voterId: voterId(), key: cur.key, choiceId, reason});
      setPicked((p) => ({...p, [cur.key]: choiceId}));
    } catch {
      setMsg('送信できませんでした。受付が終わったか、通信が切れています。');
    } finally {
      setSending(false);
    }
  };
  return (
    <div className="vote-app">
      <div className="va-head">
        OPTEX-FA コンサルティング営業体験 <span>コード {sessionId}</span>
      </div>
      {error && !status ? <p className="va-wait">接続できません。コードとネットワークを確認してください。</p> : null}
      {cur && cur.open ? (
        <>
          <div className="va-qid">{cur.questionId}</div>
          <h1>{cur.questionText}</h1>
          <div className="va-choices">
            {cur.choices.map((c) => (
              <button key={c.choiceId} className={`choice ${mine === c.choiceId ? 'on' : ''}`} disabled={sending} onClick={() => send(c.choiceId)}>
                <span className="choice-id">{c.choiceId}</span>
                <span className="choice-text">{c.choiceText}</span>
              </button>
            ))}
          </div>
          <label className="va-reason">
            選んだ理由（任意・名前は書かないでください）
            <textarea rows={2} maxLength={120} value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          {mine ? <p className="va-done">{mine} で送信しました。受付中は選び直せます（理由を書き足したら、もう一度選んでください）。</p> : null}
          {msg ? <p className="va-err">{msg}</p> : null}
        </>
      ) : (
        <p className="va-wait">{cur ? `${cur.questionId} の受付は終わりました。スクリーンを見てください。` : 'スクリーンを見て、次の問いをお待ちください。'}</p>
      )}
    </div>
  );
};
