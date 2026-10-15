// 進行役の画面。セッションを作り、参加URL・QRコードを配り、場面を進める。
// 学生の画面は進行役の操作に合わせて切り替わる（回答の受付・締め切り・解説・共有）。
import qrcode from 'qrcode-generator';
import React, {useEffect, useMemo, useState} from 'react';
import {ClipPlayer} from '../app/ClipPlayer';
import {phases, sceneById, scenes} from '../data';
import type {DemoScene, QuestionScene, Scene} from '../types';
import {api, demoOf, firstStage, type HostState, mainOrder, pass, rate, type Stage, thinkLeft, thinkStart, useAvailable, useLiveState, useNow} from './client';
import {PhaseNavigation} from './PhaseNavigation';

const KEY = 'optexfa-live-host';
type Saved = {sessionId: string; hostKey: string};
const loadSaved = (): Saved | null => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || 'null');
  } catch {
    return null;
  }
};

export const HostApp: React.FC = () => {
  const [saved, setSaved] = useState<Saved | null>(loadSaved);
  const url = saved ? `api/live/${saved.sessionId}/events?role=host&key=${saved.hostKey}` : null;
  const {state, online, gone} = useLiveState<HostState>(url);
  const create = () =>
    api.create().then((r) => {
      const s = {sessionId: r.sessionId, hostKey: r.hostKey};
      try {
        localStorage.setItem(KEY, JSON.stringify(s));
      } catch {
        // 保存できなくても続けられる（再読み込みすると新しいセッションになる）
      }
      setSaved(s);
    });
  if (!saved || gone)
    return (
      <div className="lv-center">
        <div className="lv-brand">
          <span className="lv-slash">/</span> OPTEX FA　進行役
        </div>
        <h1>WEB参加型 コンサルティング営業体験</h1>
        <p>{gone ? '前のセッションは終了しています。' : ''}セッションを作ると、学生（1〜5名）に配る参加URLとQRコードが出ます。</p>
        <button className="lv-primary" onClick={() => void create()}>
          セッションを作成する
        </button>
      </div>
    );
  if (!state) return <div className="lv-center"><h1>接続しています…</h1></div>;
  return <Host s={state} saved={saved} online={online} onNew={() => void create()} />;
};

const order = mainOrder();
const allIds = scenes.map((s) => s.sceneId);

const Host: React.FC<{s: HostState; saved: Saved; online: boolean; onNew: () => void}> = ({s, saved, online, onNew}) => {
  const scene = sceneById.get(s.sceneId);
  const [history, setHistory] = useState<string[]>([]);
  const send = (body: Record<string, unknown>) => api.host(saved.sessionId, saved.hostKey, body).catch(() => alert('送れませんでした。通信を確認してください。'));
  const go = (sceneId: string, back = false) => {
    if (!back) setHistory((h) => [...h, s.sceneId]);
    const sc = sceneById.get(sceneId);
    void send({action: 'go', sceneId, stage: firstStage(sc), thinkSeconds: sc?.type === 'question' ? sc.thinkSeconds : 0});
  };
  const next = scene?.nextSceneId;
  const joinUrl = `${location.origin}${location.pathname}?view=join&session=${s.sessionId}`;
  return (
    <div className="lv lv-host">
      <header className="lv-top">
        <div className="lv-brand">
          <span className="lv-slash">/</span> OPTEX FA　進行役
        </div>
        <div className="lv-code">
          参加コード <b>{s.sessionId}</b>
        </div>
        <Clock s={s} />
        <div className={`lv-conn ${online ? 'on' : ''}`}>{online ? '接続中' : '再接続しています…'}</div>
      </header>
      {/* 学生の画面と同じフェーズ表示（セッションの場面から決まる） */}
      <PhaseNavigation sceneId={s.sceneId} compact />
      <div className="lv-hgrid">
        <aside className="lv-list">
          {phases.map((p) => (
            <div key={p.phaseId}>
              <div className="lv-ph">
                {p.phaseTitle}（{p.minutes}分）
              </div>
              {scenes
                .filter((x) => x.phaseId === p.phaseId)
                .map((x) => (
                  <button key={x.sceneId} className={`lv-item ${x.sceneId === s.sceneId ? 'now' : ''} ${order.includes(x.sceneId) ? '' : 'branch'}`} onClick={() => go(x.sceneId)}>
                    {label(x)}
                  </button>
                ))}
            </div>
          ))}
        </aside>
        <main className="lv-hmain">
          {scene ? <Control s={s} scene={scene} send={send} /> : null}
          <div className="lv-nav">
            <button className="lv-ghost" disabled={!history.length} onClick={() => (go(history[history.length - 1], true), setHistory((h) => h.slice(0, -1)))}>
              ◀ 前へ
            </button>
            {scene?.sceneId === 'p4-q3' ? (
              <button className="lv-ghost" onClick={() => go('p4-followup')}>
                基準に届かなかったとき
              </button>
            ) : null}
            <button className="lv-primary" disabled={!next} onClick={() => next && go(next)}>
              次へ ▶ {next ? label(sceneById.get(next)!) : '（終了）'}
            </button>
          </div>
          {scene?.facilitatorNote ? <p className="lv-memo">進行メモ：{scene.facilitatorNote}</p> : null}
        </main>
        <aside className="lv-side">
          <Join url={joinUrl} />
          <People s={s} send={send} />
          <details className="lv-danger">
            <summary>セッションの操作</summary>
            <button className="lv-ghost" onClick={() => confirm('回答・入力をすべて消して、最初の場面に戻しますか？') && void send({action: 'reset'})}>
              回答を消して最初から
            </button>
            <button className="lv-ghost" onClick={() => confirm('新しいセッションを作りますか？（学生は新しいURLから入り直します）') && onNew()}>
              新しいセッションを作る
            </button>
          </details>
        </aside>
      </div>
      <span hidden>{allIds.length}</span>
    </div>
  );
};

const label = (x: Scene) => (x.type === 'question' ? `Q ${x.title}` : x.type === 'pitch' ? `✎ ${x.title}` : x.type === 'reflection' ? `✎ ${x.title}` : x.title);

const Clock: React.FC<{s: HostState}> = ({s}) => {
  const now = useNow(1000);
  const [start] = useState(Date.now());
  const m = Math.floor((now - start) / 60000);
  const sec = Math.floor((now - s.stageAt) / 1000);
  return (
    <div className="lv-clock">
      経過 {m}分　／　この場面 {Math.floor(sec / 60)}:{String(sec % 60).padStart(2, '0')}
    </div>
  );
};

const Join: React.FC<{url: string}> = ({url}) => {
  const svg = useMemo(() => {
    const q = qrcode(0, 'M');
    q.addData(url);
    q.make();
    return q.createSvgTag({cellSize: 4, margin: 2, scalable: true});
  }, [url]);
  const [copied, setCopied] = useState(false);
  return (
    <div className="lv-join">
      <div className="lv-tag">学生の参加URL</div>
      <div className="lv-qr" dangerouslySetInnerHTML={{__html: svg}} />
      <input readOnly value={url} onFocus={(e) => e.target.select()} />
      <button className="lv-ghost" onClick={() => navigator.clipboard?.writeText(url).then(() => setCopied(true))}>
        {copied ? 'コピーしました' : 'URLをコピー'}
      </button>
    </div>
  );
};

const People: React.FC<{s: HostState; send: (b: Record<string, unknown>) => Promise<unknown>}> = ({s, send}) => {
  const sc = sceneById.get(s.sceneId);
  const ans = s.answers[s.sceneId] ?? {};
  const txt = s.texts[s.sceneId] ?? {};
  return (
    <div className="lv-people">
      <div className="lv-tag">参加者 {s.students.length}/5名</div>
      {s.students.length === 0 ? <p className="lv-note">まだ参加者がいません。</p> : null}
      <ul>
        {s.students.map((p) => (
          <li key={p.pid} className={p.online ? 'on' : 'off'}>
            <span className="dot" />
            <b>{p.name}</b>
            <span className="st">
              {sc?.type === 'question' ? (ans[p.pid] ? `回答 ${ans[p.pid].choiceId}` : '未回答') : sc?.type === 'pitch' || sc?.type === 'reflection' ? (txt[p.pid] ? '提出済み' : '未提出') : p.done ? '視聴済み' : ''}
              {p.online ? '' : '（切断中）'}
            </span>
            <button className="lv-x" title="参加を取り消す" onClick={() => confirm(`${p.name} さんの参加を取り消しますか？`) && void send({action: 'remove', pid: p.pid})}>
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

// 場面ごとの操作
const Control: React.FC<{s: HostState; scene: Scene; send: (b: Record<string, unknown>) => Promise<unknown>}> = ({s, scene, send}) => {
  const stage = (st: Stage) => void send({action: 'stage', stage: st});
  const head = (
    <div className="lv-scene">
      <div className="lv-tag">{phases.find((p) => p.phaseId === scene.phaseId)?.phaseTitle}</div>
      <h2>{scene.title}</h2>
    </div>
  );
  if (scene.type === 'question') return (
    <>
      {head}
      <QuestionControl s={s} q={scene} stage={stage} />
    </>
  );
  if (scene.type === 'pitch' || scene.type === 'reflection') {
    const t = s.texts[scene.sceneId] ?? {};
    return (
      <>
        {head}
        <p className="lv-q2">{scene.type === 'pitch' ? scene.prompt : scene.question}</p>
        <Steps now={s.stage} steps={[['write', '入力中'], ['share', '全員に共有']]} onPick={stage} />
        <div className="lv-texts">
          {s.students.map((p) => (
            <div key={p.pid} className="lv-card">
              <b>{p.name}</b>
              {t[p.pid] ? Object.entries(t[p.pid]).map(([k, v]) => (v ? <p key={k}>{scene.type === 'pitch' ? `${scene.parts.find((x) => x.key === k)?.label}：` : ''}{v}</p> : null)) : <p className="lv-note">未提出</p>}
            </div>
          ))}
        </div>
        {scene.type === 'pitch' ? <p className="lv-note">1〜2名に、30秒で声に出して提案してもらう。「必ず直る」と言い切った提案には「実機で確かめる」を足すよう返す。</p> : null}
      </>
    );
  }
  return (
    <>
      {head}
      <Preview s={s} scene={scene} />
      {scene.type === 'demo' ? <DemoRecord s={s} d={scene} send={send} /> : null}
    </>
  );
};

const Steps: React.FC<{now: Stage; steps: [Stage, string][]; onPick: (s: Stage) => void}> = ({now, steps, onPick}) => {
  const idx = steps.findIndex(([k]) => k === now);
  return (
    <div className="lv-steps2">
      {steps.map(([k, l], i) => (
        <button key={k} className={`${k === now ? 'now' : ''} ${i < idx ? 'done' : ''}`} onClick={() => onPick(k)}>
          {i + 1}. {l}
        </button>
      ))}
    </div>
  );
};

const QuestionControl: React.FC<{s: HostState; q: QuestionScene; stage: (s: Stage) => void}> = ({s, q, stage}) => {
  const ans = s.answers[q.sceneId] ?? {};
  const names = Object.fromEntries(s.students.map((p) => [p.pid, p.name]));
  const counts = {A: 0, B: 0, C: 0} as Record<string, number>;
  Object.values(ans).forEach((a) => counts[a.choiceId]++);
  const n = Object.keys(ans).length;
  const now = useNow();
  const left = thinkLeft(s.stageAt, q, s.thinkSeconds, now);
  const watching = now < thinkStart(s.stageAt, q);
  return (
    <div>
      <p className="lv-q2">{q.questionText}</p>
      <Steps now={s.stage} steps={[['answer', '回答を受付'], ['branch', '締め切り → 各自の選択の映像'], ['explain', '解説・全員の回答を表示']]} onPick={stage} />
      {s.stage === 'answer' ? (
        <p className="lv-note">
          {watching ? '学生が問いの映像を見ています（問いと選択肢が出そろうと自動で止まり、THINK TIME になります）。' : `THINK TIME：残り ${left}秒（目安60秒）`}（{n}/{s.students.length}名が回答）。いつでも締め切れます。締め切ると各自の選択の映像に進みます。
        </p>
      ) : null}
      <table className="lv-htable">
        <tbody>
          {q.choices.map((c) => (
            <tr key={c.choiceId} className={s.stage === 'explain' && c.choiceId === q.recommendedChoice ? 'rec' : ''}>
              <td>
                <b>{c.choiceId}</b> {c.choiceText}
              </td>
              <td className="num">{counts[c.choiceId]}名</td>
              <td>
                {Object.entries(ans)
                  .filter(([, a]) => a.choiceId === c.choiceId)
                  .map(([pid, a]) => (
                    <div key={pid}>
                      {names[pid] ?? '（退出）'}：{a.reason || '（理由なし）'}
                    </div>
                  ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="lv-note">
        推奨：{q.recommendedChoice ?? 'なし（どれも必要）'}　／　{q.recommendReason}
      </p>
      <p className="lv-note">学生の画面には、解説の段階になるまで推奨も他の人の回答も出ません。2名以上のときだけ、人数と理由（名前なし）を共有します。</p>
    </div>
  );
};

const Preview: React.FC<{s: HostState; scene: Scene}> = ({s, scene}) => {
  const available = useAvailable();
  const [show, setShow] = useState(false);
  useEffect(() => setShow(false), [scene.sceneId]);
  const assetId = scene.type === 'video' ? 'intro' : 'videoAsset' in scene ? scene.videoAsset : '';
  const rendered = `experience/rendered/${assetId}.mp4`;
  const file = scene.type === 'video' ? scene.videoFile : available.has(rendered) ? rendered : undefined;
  const done = s.students.filter((p) => p.done).length;
  return (
    <div className="lv-preview">
      <p className="lv-note">
        学生の端末で再生しています（{done}/{s.students.length}名が視聴済み）。
      </p>
      {show && assetId ? (
        <ClipPlayer assetId={assetId} autoPlay={false} playToken={0} volume={0.6} muted showSubtitles showStatus available={available} overrideVideoUrl={file} />
      ) : (
        <button className="lv-ghost" onClick={() => setShow(true)}>
          手元で映像を確認する（音なし）
        </button>
      )}
    </div>
  );
};

const DemoRecord: React.FC<{s: HostState; d: DemoScene; send: (b: Record<string, unknown>) => Promise<unknown>}> = ({s, d, send}) => {
  const cur = demoOf(s.demo, d.sceneId);
  const [v, setV] = useState(() => JSON.parse(JSON.stringify(s.demo[d.sceneId] ?? {existing: {passed: '', outputs: '', counted: ''}, optex: {passed: '', outputs: '', counted: ''}, source: 'live', note: ''})));
  const field = (sensor: 'existing' | 'optex', k: 'passed' | 'outputs' | 'counted') => (
    <input inputMode="numeric" value={v[sensor][k]} onChange={(e) => setV((x: typeof v) => ({...x, [sensor]: {...x[sensor], [k]: e.target.value.replace(/[^0-9]/g, '')}}))} />
  );
  return (
    <div className="lv-record">
      <div className="lv-tag">実機デモの記録（{d.condition}）</div>
      <table className="lv-htable">
        <thead>
          <tr>
            <th />
            <th>通過本数</th>
            <th>センサ出力の回数</th>
            <th>PLCのカウント</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>既設（他社製・回帰反射型）</td>
            <td>{field('existing', 'passed')}</td>
            <td>{field('existing', 'outputs')}</td>
            <td>{field('existing', 'counted')}</td>
          </tr>
          <tr>
            <td>OPTEX-FA KR-Qシリーズ</td>
            <td>{field('optex', 'passed')}</td>
            <td>{field('optex', 'outputs')}</td>
            <td>{field('optex', 'counted')}</td>
          </tr>
        </tbody>
      </table>
      <button className="lv-primary" onClick={() => void send({action: 'demo', sceneId: d.sceneId, demo: {...v, source: 'live'}})}>
        実測として学生に表示する
      </button>
      <p className="lv-note">
        いま学生に見えている値：{cur?.source === 'live' ? '実測' : '仮想データ（教育用）'}　既設 {rate(cur?.existing)}{pass(cur?.existing) ? '（一致）' : ''}／KR-Q {rate(cur?.optex)}
        {pass(cur?.optex) ? '（一致）' : ''}。記録しない場合は、仮想データと明記して表示されます。
      </p>
    </div>
  );
};
