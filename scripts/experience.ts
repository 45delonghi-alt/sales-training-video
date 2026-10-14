// WEB参加型 コンサルティング営業体験（60分）のデータ検証と書き出し。
//   npm run experience:validate … 分岐・素材・時間・技術ルールを機械的に検査（エラーがあれば終了コード1）
//   npm run experience:export   … 台本・設問一覧・ストーリーボード・素材一覧・音声原稿などを書き出す
import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {
  assetById,
  assetSeconds,
  assets,
  branches,
  characterById,
  characters,
  glossaryByKey,
  lineSchedule,
  linesForAsset,
  phases,
  questions,
  salesLineOf,
  sceneById,
  scenes,
  videoPathFor,
} from '../src/experience/data';
import {OVERLAYS} from '../src/experience/remotion/v3/overlayNames';
import platesJson from '../src/experience/data/plates.json';
import {writeTalk} from './talk-script';
import type {Plate} from '../src/experience/types';
import {allLines} from '../src/consulting/timeline';
import {script as introScript} from '../src/consulting/script';
import type {Line} from '../src/experience/types';

const ROOT = join(__dirname, '..');
const plates = platesJson as Plate[];
const plateById = new Map(plates.map((p) => [p.plateId, p]));
const shotsOf = (a: (typeof assets)[number]) => a.shots.map((s) => `${s.plate}:${s.overlay}`).join(' → ');
const PUBLIC = join(ROOT, 'public');
const DOCS = join(ROOT, 'docs', 'consulting-experience');

type Issue = {level: 'error' | 'warn'; msg: string};

const assetOfScene = (s: (typeof scenes)[number]): string[] => {
  if (s.type === 'clip' || s.type === 'demo' || s.type === 'result') return [s.videoAsset];
  if (s.type === 'question') return [s.backdropAsset, ...s.choices.map((c) => c.videoAsset)];
  if (s.type === 'reflection' && s.videoAsset) return [s.videoAsset];
  return [];
};

export const validate = (): Issue[] => {
  const issues: Issue[] = [];
  const err = (msg: string) => issues.push({level: 'error', msg});
  const warn = (msg: string) => issues.push({level: 'warn', msg});

  // 場面
  const ids = new Set<string>();
  for (const s of scenes) {
    if (ids.has(s.sceneId)) err(`場面IDが重複：${s.sceneId}`);
    ids.add(s.sceneId);
    if (s.nextSceneId !== null && !sceneById.has(s.nextSceneId)) err(`${s.sceneId}：nextSceneId ${s.nextSceneId} がない`);
    for (const a of assetOfScene(s)) if (!assetById.has(a)) err(`${s.sceneId}：素材 ${a} が assets.json にない`);
    for (const g of s.glossary ?? []) if (!glossaryByKey.has(g)) err(`${s.sceneId}：用語 ${g} が glossary.json にない`);
    const lines: Line[] = s.type === 'clip' ? s.lines : [];
    for (const l of lines) if (!characterById.has(l.speaker)) err(`${s.sceneId}：話者 ${l.speaker} が characters.json にない`);
  }

  // 設問と選択肢
  const qids = new Set<string>();
  const used = new Map<string, string>();
  for (const q of questions) {
    if (qids.has(q.questionId)) err(`questionId が重複：${q.questionId}`);
    qids.add(q.questionId);
    const letters = q.choices.map((c) => c.choiceId).join('');
    if (letters !== 'ABC') err(`${q.questionId}：選択肢が A/B/C の3つではない（${letters}）`);
    if (q.recommendedChoice !== null && !q.choices.some((c) => c.choiceId === q.recommendedChoice)) err(`${q.questionId}：推奨 ${q.recommendedChoice} がない`);
    if (!q.recommendReason?.trim()) err(`${q.questionId}：推奨の理由（recommendReason）が空`);
    if (q.requiresDemoPass && !(q.fallbackSceneId && sceneById.has(q.fallbackSceneId))) err(`${q.questionId}：実測しだいの問いに、基準未達時の行き先がない`);
    if (q.hint && !characterById.has(q.hint.speaker)) err(`${q.questionId}：ヒントの話者 ${q.hint.speaker} がない`);
    for (const c of q.choices) {
      const key = `${q.questionId}-${c.choiceId}`;
      if (!assetById.has(c.videoAsset)) err(`${key}：映像 ${c.videoAsset} がない`);
      const prev = used.get(c.videoAsset);
      if (prev) err(`${key}：映像 ${c.videoAsset} が ${prev} と重複（選択肢ごとに専用の映像が必要）`);
      used.set(c.videoAsset, key);
      if (q.backdropAsset === c.videoAsset) err(`${key}：問いの背景と同じ映像を使っている`);
      for (const f of ['choiceText', 'customerResponse', 'gained', 'missing', 'learningPoint'] as const) if (!c[f]?.trim()) err(`${key}：${f} が空`);
      if (!characterById.has(c.responder)) err(`${key}：回答者 ${c.responder} がない`);
      for (const l of c.extraLines ?? []) if (!characterById.has(l.speaker)) err(`${key}：話者 ${l.speaker} がない`);
      if (!salesLineOf(c)) warn(`${key}：営業のセリフ（salesLine）がない`);
    }
    for (let i = 2; i < 4; i++) if (q.choices.filter((c) => c.choiceText === q.choices[i % 3].choiceText).length > 1) err(`${q.questionId}：同じ選択肢の文がある`);
  }

  // 映像素材
  const referenced = new Set(scenes.flatMap(assetOfScene));
  const paths = new Set<string>();
  for (const a of assets) {
    if (!referenced.has(a.assetId)) warn(`素材 ${a.assetId} はどの場面からも使われていない`);
    const nLines = linesForAsset(a.assetId).length;
    if (!a.shots.length) err(`素材 ${a.assetId}：ショットがない`);
    a.shots.forEach((sh, i) => {
      if (!(OVERLAYS as readonly string[]).includes(sh.overlay)) err(`素材 ${a.assetId}：描画できない overlay ${sh.overlay}`);
      if (!plateById.has(sh.plate)) err(`素材 ${a.assetId}：シーン画像 ${sh.plate} が plates.json にない`);
      if (i > 0 && (sh.atLine === undefined || sh.atLine >= nLines)) err(`素材 ${a.assetId}：${i + 1}つ目のショットの切り替え位置（atLine）が範囲外`);
    });
    const vp = videoPathFor(a.assetId);
    if (paths.has(vp)) err(`素材 ${a.assetId}：映像の置き場所 ${vp} が重複`);
    paths.add(vp);
    if (a.imagePath && !existsSync(join(PUBLIC, a.imagePath))) warn(`素材 ${a.assetId}：正式な製品写真 ${a.imagePath} が未配置（仮表示で代用中）`);
  }

  // シーン画像（写真）
  for (const p of plates) {
    const placed = existsSync(join(PUBLIC, p.file));
    if (p.status !== 'awaiting' && !placed) err(`シーン画像 ${p.plateId}：状態が ${p.status} なのに ${p.file} がない`);
    if (p.status === 'awaiting') warn(`シーン画像 ${p.plateId}（${p.description}）：未生成（仮画像で代用中）`);
    if (p.status === 'review') warn(`シーン画像 ${p.plateId}：要確認 — ${p.note ?? ''}`);
    if (/\b(text|logo)\b/i.test(p.prompt) && !/no text/i.test(p.prompt)) err(`シーン画像 ${p.plateId}：プロンプトに「文字なし」の指定がない`);
  }

  // 映像の途中で止めるポイント
  const introIds = new Set(allLines(introScript).map((l) => l.line.id));
  for (const s of scenes) {
    if (s.type !== 'clip' && s.type !== 'video') continue;
    for (const p of s.pauses ?? []) {
      if (s.type === 'video' && s.videoFile && !existsSync(join(PUBLIC, s.videoFile))) err(`${s.sceneId}：導入動画のファイル ${s.videoFile} がない`);
      if (p.atLineId && !introIds.has(p.atLineId)) err(`${s.sceneId}：止めるポイントの文ID ${p.atLineId} が導入動画にない`);
      if (p.beforeLine !== undefined && (s.type !== 'clip' || p.beforeLine >= s.lines.length)) err(`${s.sceneId}：止めるポイントが範囲外`);
    }
  }

  // 最初から最後までたどれるか（基準未達時の分岐も含む）
  const seen = new Set<string>();
  const stack = [scenes[0].sceneId];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const s = sceneById.get(id);
    if (!s) continue;
    if (s.nextSceneId) stack.push(s.nextSceneId);
    if (s.type === 'question' && s.fallbackSceneId) stack.push(s.fallbackSceneId);
  }
  for (const s of scenes) if (!seen.has(s.sceneId)) err(`場面 ${s.sceneId} に到達できない`);

  // 時間（60分：導入5・聞く10・考える10・課題を見つける10・提案する15・振り返り10）
  const total = phases.reduce((n, p) => n + p.minutes, 0);
  if (total !== 60) err(`合計が60分ではない（${total}分）`);
  for (const p of phases.filter((x) => x.step)) {
    const n = questions.filter((q) => q.phaseId === p.phaseId).length;
    if (n < 2 || n > 4) err(`${p.phaseTitle}：判断場面が ${n} 個（2〜3個、提案フェーズは最大4個）`);
  }

  // 技術・データのルール（第5・6章）
  const text = JSON.stringify(scenes);
  for (const bad of ['検出漏れが起き', '少なくカウント', 'カウントが少な']) if (text.includes(bad)) err(`過剰カウントと検出漏れを混同した表現：「${bad}」`);
  for (const bad of ['反射板が光を出', '反射板で受光', '反射板が受光']) if (text.includes(bad)) err(`反射板の説明が誤り：「${bad}」`);
  if (!/0\.5[～〜]0\.8%/.test(text) || !text.includes('3%')) err('通常 0.5〜0.8%・最大 3% の説明が見つからない');
  if (/改善後[^"]{0,20}\+?0\.[1-3]/.test(text)) err('改善後の数値を、実測前に示している');

  return issues;
};

// ------------------------------------------------------------------------------------------- 書き出し
const name = (sp: string) => {
  if (sp === 'sales') return 'あなた（営業）';
  if (sp === 'narration') return 'ナレーション';
  const c = characterById.get(sp as never);
  return c ? `${c.name}（${c.title.replace(/^飲料工場 /, '').replace(/（.*$/, '')}）` : sp;
};
const sec = (n: number) => `${n.toFixed(1)}秒`;
const phaseOf = (id: string) => phases.find((p) => p.phaseId === sceneById.get(id)?.phaseId);
const STATUS: Record<string, string> = {implemented: '実装済み', placeholder: '仮素材', 'awaiting-footage': '実写待ち', 'awaiting-license': '許諾待ち'};
const MOOD: Record<string, string> = {neutral: '普通', thinking: '考え込む', uneasy: '少し困る', worried: '心配', cool: '反応が薄い', positive: '前向き', request: '身を乗り出す'};
const HEAD = (title: string, src = 'src/experience/data/*.json') => [`# ${title}`, '', `> \`npm run experience:export\` で ${src} から自動生成。直接編集せず、データを直してから書き出してください。`, ''];

// 1. 完全版ストーリー
const completeStory = () => {
  const out = HEAD('完全版ストーリー');
  out.push(
    '## あらすじ',
    '',
    '飲料工場 LINE 03 で、透明PETボトルのカウントが「実際より多くなる」ことがある。学生は OPTEX-FA の新人営業として、設備課の佐藤さん・品質管理課の高橋さんの相談に向き合う。',
    '「聞く」で困りごとの大きさと起きる条件を、「考える」で原因の候補と確かめ方を、「課題を見つける」で現場の負担と本当に実現したいことを明らかにする。',
    '「提案する」では先輩社員（森さん・中田さん）の支えを受けながら、透明体検出用センサを実際のボトルで試し、問題が起きていた条件も再現して確かめる。最後に、実ラインでも一緒に確かめることをお客様と約束する。',
    '',
    '## 時間構成（60分）',
    '',
    '| フェーズ | 時間 | 目的 | 判断場面 |',
    '|---|---|---|---|',
    ...phases.map((p) => `| ${p.phaseTitle} | ${p.minutes}分 | ${p.goal} | ${questions.filter((q) => q.phaseId === p.phaseId).length || '—'} |`),
    '',
    '## 登場人物',
    '',
    '| 人物 | 役割 | 声のイメージ |',
    '|---|---|---|',
    ...characters.filter((c) => c.id !== 'narration').map((c) => `| ${c.name} | ${c.title} | ${c.voice} |`),
    '',
    '> 工場内では全員が清潔な作業服と衛生帽（髪・耳を覆う）を着用し、装飾品は着けない。OPTEX-FA の社員も工場の作業服と衛生帽を借用し、赤い来訪者バッジを付ける。',
    '',
  );
  for (const p of phases) {
    out.push(`## ${p.phaseTitle}（${p.minutes}分）`, '', `**目的**：${p.goal}`, '');
    for (const s of scenes.filter((x) => x.phaseId === p.phaseId)) {
      if (s.type === 'video') out.push(`- **${s.title}**：${s.description}`);
      if (s.type === 'clip') out.push(`- **${s.title}**：${s.lines.map((l) => `${name(l.speaker)}「${l.text}」`).join(' ') || '（タイトル）'}`);
      if (s.type === 'question') {
        const rec = s.choices.find((c) => c.choiceId === s.recommendedChoice);
        out.push(`- **${s.questionId} ${s.questionText}** → ${rec ? `推奨 ${rec.choiceId}：${rec.choiceText}` : '推奨なし（どれも必要な確認）'}。分かること：${rec?.gained ?? s.choices.map((c) => c.gained).join('／')}`);
      }
      if (s.type === 'demo') out.push(`- **${s.title}**：${s.condition}（結果は実機で記録）`);
      if (s.type === 'reflection') out.push(`- **${s.title}**：${s.question}`);
    }
    out.push('');
  }
  return out.join('\n');
};

// 2. 顧客と営業のセリフ台本（場面順・全分岐）
const dialogueScript = () => {
  const out = HEAD('セリフ台本（顧客・営業・先輩社員・ナレーション）');
  for (const p of phases) {
    out.push(`## ${p.phaseTitle}`, '');
    for (const s of scenes.filter((x) => x.phaseId === p.phaseId)) {
      if (s.type === 'clip') {
        out.push(`### ${s.title}`, '');
        s.lines.forEach((l) => out.push(`- **${name(l.speaker)}**：${l.text}`));
        if (!s.lines.length) out.push('- （セリフなし）');
        out.push('');
      }
      if (s.type === 'question') {
        out.push(`### ${s.questionId}　${s.questionText}`, '');
        if (s.situation) out.push(`- **${name(s.situation.speaker)}**：${s.situation.text}`);
        if (s.hint) out.push(`- **ヒント（${name(s.hint.speaker)}）**：${s.hint.text}`);
        out.push('');
        for (const c of s.choices) {
          out.push(`**選択肢 ${c.choiceId}：${c.choiceText}**`, '');
          linesForAsset(c.videoAsset).forEach((l) => out.push(`- **${name(l.speaker)}**：${l.text}`));
          out.push('');
        }
      }
    }
  }
  return out.join('\n');
};

// 3・4. 設問一覧と A/B/C の回答分岐
const questionList = () => {
  const out = HEAD('4フェーズの設問一覧と回答分岐');
  out.push('> 推奨の選択肢は、学生が選ぶまで画面に出しません。回答後に「推奨と理由」を示します。誤った選択でも進行は止めず、何が分かったかを説明します。', '');
  for (const q of questions) {
    out.push(`## ${q.questionId}　${q.questionText}（${phaseOf(q.sceneId)?.phaseTitle}）`, '');
    if (q.hint) out.push(`**ヒント（${name(q.hint.speaker)}）**：${q.hint.text}`, '');
    out.push('| 項目 | A | B | C |', '|---|---|---|---|');
    const row = (label: string, f: (c: (typeof q.choices)[number]) => string) => out.push(`| ${label} | ${q.choices.map(f).join(' | ')} |`);
    row('選択肢', (c) => c.choiceText);
    row('営業のセリフ', (c) => salesLineOf(c) ?? '—');
    row('専用の映像', (c) => `\`${c.videoAsset}\`：${assetById.get(c.videoAsset)?.visualDescription ?? ''}`);
    row('お客様の回答', (c) => `${name(c.responder)}「${c.customerResponse}」（${MOOD[c.mood]}）`);
    row('得られる情報', (c) => c.gained);
    row('不足している情報', (c) => c.missing);
    row('簡単な解説', (c) => c.learningPoint);
    row('次のシーン', () => `\`${q.nextSceneId}\``);
    out.push('', `**回答後に示す推奨**：${q.recommendedChoice ?? 'なし'}　理由：${q.recommendReason}`, '', `**この問いで伝えること**：${q.learningPoint}`);
    if (q.requiresDemoPass) out.push('', `**出す条件**：実測が基準を満たしたときだけ。満たさない・未記録なら \`${q.fallbackSceneId}\` へ。`);
    out.push('');
  }
  return out.join('\n');
};

// 5. シーン別ストーリーボード
const storyboard = () => {
  const out = HEAD('シーン別ストーリーボード');
  out.push(
    '## 設備配置（全シーン共通）',
    '',
    '- 飲料工場 LINE 03。透明PETボトルがコンベアを左から右へ流れる。',
    '- **検出方式**：透明体検出用・回帰反射型。コンベアを挟み、片側に投光・受光一体型のセンサ、反対側に反射板。高さを合わせて正対させる。',
    '- **検出位置**：ボトルの**下部**（底から少し上）を、コンベアの側面から横方向に検出する。キャップやボトル上部は検出位置にしない。',
    '- **光の向き**：センサ → ボトル下部 → 反射板 → 同じセンサに戻る。反射板は光を出さず、受光もしない。CGでは「行き」と「戻り」を区別する（光の線は説明用の表現）。',
    '- センサと反射板の左右・奥行きの位置関係は、全シーンで入れ替えない。',
    '',
  );
  for (const a of assets) {
    const lines = lineSchedule(linesForAsset(a.assetId), a.dialogAt ?? 0.8, a.assetId);
    const used = scenes.filter((s) => assetOfScene(s).includes(a.assetId)).map((s) => {
      if (s.type === 'question') {
        const c = s.choices.find((x) => x.videoAsset === a.assetId);
        return c ? `${s.questionId}-${c.choiceId}` : `${s.questionId}（背景）`;
      }
      return s.sceneId;
    });
    out.push(`## \`${a.assetId}\`　${shotsOf(a)}（約${sec(assetSeconds(a.assetId))}）`, '', `**使う場面**：${used.join('、') || '—'}`, '');
    out.push('| 項目 | 内容 |', '|---|---|', `| 映像 | ${a.visualDescription} |`, `| カメラ | ${a.cameraDirection} |`, `| 動き | ${a.animationDirection} |`, `| 状態 | ${a.status.map((x) => STATUS[x]).join('・')} |`);
    if (a.needs?.length) out.push(`| 不足素材 | ${a.needs.join('／')} |`);
    out.push('');
    if (lines.length) {
      out.push('| 秒 | 話者 | 字幕・音声 |', '|---|---|---|');
      lines.forEach((l) => out.push(`| ${l.from.toFixed(1)}–${l.to.toFixed(1)} | ${name(l.speaker)} | ${l.text} |`));
      out.push('');
    }
  }
  return out.join('\n');
};

// 6. 映像素材一覧＋14. 使用許諾（表）
const assetList = () => {
  const METHOD: Record<string, string> = {shoot: '実写撮影', 'ai-image': 'AI画像（実写風）', cg: 'CG（Remotion）', composite: '合成（背景＋実写・公式画像）'};
  const out = HEAD('映像素材一覧', 'src/experience/data/assets.json');
  out.push('| 素材ID | 種類 | 内容 | 作り方 | 状態 | 不足素材 | 置き場所 |', '|---|---|---|---|---|---|---|');
  for (const a of assets)
    out.push(`| \`${a.assetId}\` | ${shotsOf(a)} | ${a.visualDescription} | ${METHOD[a.production.method]} | ${a.status.map((x) => STATUS[x]).join('・')} | ${(a.needs ?? []).join('／') || '—'} | \`public/${videoPathFor(a.assetId)}\`${a.imagePath ? `<br>写真：\`public/${a.imagePath}\`` : ''} |`);
  return out.join('\n');
};

// 8. 実機デモ台本
const demoScript = () => {
  const out = HEAD('実機デモ台本（PHASE 4：既設センサと KR-Qシリーズの比較）');
  out.push(
    '> 結果は3つに分けて扱います：1. 実測データ（アプリの「実測を記録」に入力した値）／2. 研修用シミュレーション（映像。見方の説明だけで結果は出さない）／3. 期待する改善効果（確かめる前の見込み。数値は出さない）。',
    '> 比較は同じボトル・同じ搬送速度・同じ設置の高さ（ボトル下部）で行い、反射板と設定はそれぞれのセンサの使用条件に合わせます。',
    '',
  );
  const ids = scenes.filter((x) => x.phaseId === 'p4').map((x) => x.sceneId);
  for (const id of ids) {
    const s = sceneById.get(id)!;
    out.push(`## ${s.title}　\`${id}\``, '');
    if (s.type === 'clip' || s.type === 'result') s.lines.forEach((l) => out.push(`- **${name(l.speaker)}**：${l.text}`));
    if (s.type === 'question') {
      if (s.situation) out.push(`- **${name(s.situation.speaker)}**：${s.situation.text}`);
      out.push(`- **問い**：${s.questionText}（推奨は回答後に表示：${s.recommendedChoice}）`);
      s.choices.forEach((c) => out.push(`  - ${c.choiceId}：${c.choiceText} → ${name(c.responder)}「${c.customerResponse}」`));
      if (s.requiresDemoPass) out.push(`- **条件**：実測が基準を満たしたときだけ出す。満たさない・未記録なら「${sceneById.get(s.fallbackSceneId!)?.title}」へ。`);
    }
    if (s.type === 'demo') {
      out.push(`- **条件**：${s.condition}`, `- **予想させる問い**：${s.predictPrompt ?? '—'}`, `- **確かめること**：${s.checks.join('／')}`, '- **記録（既設センサ・KR-Qシリーズそれぞれ）**：通過させた本数・センサの出力回数・PLCのカウント値・1本の通過中に出力が何度も切り替わったか → 判定と過剰率');
    }
    if (s.facilitatorNote) out.push(`- **進行役メモ**：${s.facilitatorNote}`);
    out.push('');
  }
  return out.join('\n');
};

// 生成用プロンプト（素材の作り方）
const promptsMd = () => {
  const STATUS_P: Record<string, string> = {awaiting: '未生成', generated: '生成済み', review: '要確認', approved: '採用'};
  const out = HEAD('シーン画像の生成プロンプト', 'src/experience/data/plates.json');
  out.push(
    '画像生成（ElevenLabs の無料枠は1日3枚まで）で作れない分は、お手持ちの画像生成ツールで下のプロンプトを使って作り、`public/experience/plates/<画像ID>.jpg` に置いてください。',
    '置いたら `src/experience/data/plates.json` のその画像の `status` を `generated` にして、`npm run experience:validate` → `npm run experience:render`。届くまでは人物マスター（CAST）などの仮画像で動きます。',
    '',
    '## 共通のルール',
    '',
    '- **1920×1080（16:9）以上**。画像の中に**文字・ロゴ・名札・型式を入れない**（字幕・説明・グラフは動画側で重ねる）。',
    '- 人物は**人物マスター（CAST.jpg）を参照画像として渡し**、顔・衛生帽・服装をそろえる（森さん・中田さん＝淡いブルーグレーの作業ジャンパー、佐藤さん・高橋さん＝白い衛生作業服、全員が白い衛生帽）。',
    '- **センサ製品の外観を作らない。**写るセンサは、ロゴのない汎用の小さな箱（既設の他社製センサ、または比較用の汎用表現）に限る。OPTEX-FA 製品は公式画像だけを使う。',
    '- センサが写る画像は**配置ルール**を必ず確認する：センサはコンベアの片側で横向き、反射板は反対側の同じ高さで正対、検出位置はボトルの下部。光の線は描かせない（動画側で描く）。合わない画像は使わない。',
    '- 生成した画像は、生成元・日付を `plates.json` の `source` に書く。',
    '',
    '| 画像ID | 使う場面 | 内容 | 人物 | 状態 |',
    '|---|---|---|---|---|',
    ...plates.map((p) => `| ${p.plateId} | ${p.scene} | ${p.description} | ${p.people.join('・') || '—'} | ${STATUS_P[p.status]}${p.note ? `（${p.note}）` : ''} |`),
    '',
  );
  for (const p of plates.filter((x) => x.status === 'awaiting')) {
    out.push(`## ${p.plateId}　${p.description}`, '', `- 置き場所：\`public/${p.file}\``, `- 参照画像：${p.people.length ? 'CAST.jpg（人物マスター）' : 'なし'}${p.sensorLayout ? '／**センサ配置ルールを確認**' : ''}`, '', '```text', p.prompt, '```', '');
  }
  return out.join('\n');
};

const csvCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

const exportAll = () => {
  mkdirSync(DOCS, {recursive: true});
  const data = join(ROOT, 'src', 'experience', 'data');
  writeFileSync(join(data, 'visual-branches.json'), JSON.stringify(branches(), null, 2) + '\n');
  const files: [string, string][] = [
    ['complete-story.md', completeStory()],
    ['dialogue-script.md', dialogueScript()],
    ['question-list.md', questionList()],
    ['storyboard.md', storyboard()],
    ['asset-list.md', assetList()],
    ['demo-script.md', demoScript()],
    ['generation-prompts.md', promptsMd()],
  ];
  for (const [f, body] of files) writeFileSync(join(DOCS, f), body + '\n');
  writeTalk();
  const header = ['素材ID', 'ショット（シーン画像:重ねる情報）', '使う場面', '内容', 'カメラ', '動き', '作り方', '状態', '不足素材', '製品写真'];
  const rows = assets.map((a) => [
    a.assetId,
    shotsOf(a),
    scenes.filter((s) => assetOfScene(s).includes(a.assetId)).map((s) => s.sceneId).join(' / '),
    a.visualDescription,
    a.cameraDirection,
    a.animationDirection,
    a.production.method,
    a.status.map((x) => STATUS[x]).join('・'),
    (a.needs ?? []).join('／'),
    a.imagePath ?? '',
  ]);
  writeFileSync(join(DOCS, 'asset-manifest.csv'), '﻿' + [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n') + '\n');
  const total = assets.reduce((n, a) => n + assetSeconds(a.assetId), 0);
  console.log(`書き出し：${files.map((f) => f[0]).join('・')}・asset-manifest.csv・visual-branches.json（${branches().length}分岐）／映像 ${assets.length}本・合計約${Math.round(total)}秒`);
};

const cmd = process.argv[2];
if (cmd === 'validate' || cmd === 'export') {
  const issues = validate();
  for (const i of issues) console.log(`${i.level === 'error' ? '✖' : '△'} ${i.msg}`);
  const errors = issues.filter((i) => i.level === 'error').length;
  console.log(`検証：エラー ${errors}件／注意 ${issues.length - errors}件（場面${scenes.length}・設問${questions.length}・分岐${questions.length * 3}・素材${assets.length}）`);
  if (cmd === 'export') exportAll();
  if (errors) process.exit(1);
} else {
  console.error('usage: experience.ts validate|export');
}
