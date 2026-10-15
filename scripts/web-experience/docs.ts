// 台本・選択肢一覧・分岐設計を、シナリオデータ（src/experience/data）から書き出す（手で書かない＝データとずれない）。
// 使い方：npx tsx scripts/web-experience/docs.ts
import {readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {assetById, characterById, lineIdOf, linesForAsset, phases, salesLineOf, scenes, speechOf} from '../../src/experience/data';
import type {Scene} from '../../src/experience/types';

const ROOT = join(__dirname, '..', '..');
const OUT = join(ROOT, 'docs', 'web-experience');
const timing: Record<string, number> = JSON.parse(readFileSync(join(ROOT, 'src/experience/data/audioTiming.json'), 'utf8'));
const who = (s: string) => characterById.get(s as never)?.name ?? s;
const rec = (id: string) => (id in timing ? '録音済み' : '**要録音**');
const esc = (t: string) => t.replace(/\|/g, '｜').replace(/\n/g, ' ');

// ───── 03 全シーンのセリフ台本
const script: string[] = ['# 03　全シーンのセリフ台本', '', '> `npx tsx scripts/web-experience/docs.ts` で `src/experience/data` から自動生成。', '> 「要録音」の文は、音声が届くまで字幕だけで流れる（映像の長さは文字数から仮に決まる）。', ''];
let need = 0;
for (const p of phases) {
  script.push(`## ${p.phaseTitle}（${p.minutes}分）`, '', `ねらい：${p.goal}`, '');
  for (const s of scenes.filter((x) => x.phaseId === p.phaseId)) {
    script.push(`### ${s.title}（${s.sceneId}・${kind(s)}）`, '');
    if (s.facilitatorNote) script.push(`進行メモ：${s.facilitatorNote}`, '');
    const assetIds = s.type === 'question' ? [`q-${s.questionId}`, ...(s.hint ? [`hint-${s.questionId}`] : []), ...s.choices.map((c) => c.videoAsset)] : 'videoAsset' in s ? [s.videoAsset] : [];
    if (s.type === 'video') script.push('導入動画（intro-fixed.mp4・3分58秒）を再生。台本は intro-slides.pptx のノートと docs/reference/sales_storyboard.html。', '');
    if (s.type === 'pitch') script.push(`学生が入力：${s.prompt}`, '', ...s.parts.map((x, i) => `${i + 1}. ${x.label}（例：${x.placeholder.replace('例：', '')}）`), '');
    if (s.type === 'reflection') script.push(`問い：${s.question}（学生が各自入力）`, '');
    for (const aid of assetIds) {
      const lines = linesForAsset(aid);
      if (!lines.length) continue;
      script.push(`| 映像 | # | 話者 | セリフ | 音声 |`, '|---|---|---|---|---|');
      lines.forEach((l, i) => {
        const id = lineIdOf(aid, i);
        if (!(id in timing)) need++;
        script.push(`| ${aid} | ${i + 1} | ${who(l.speaker)} | ${esc(l.text)} | ${rec(id)}（\`${id}\`） |`);
      });
      script.push('');
    }
  }
}
script.splice(4, 0, `録音が必要な文：${need}文（一覧は 12-open-issues.md）`, '');
writeFileSync(join(OUT, '03-script.md'), script.join('\n'));

// ───── 04 学生の選択肢・顧客回答一覧
const qs = scenes.filter((s): s is Extract<Scene, {type: 'question'}> => s.type === 'question');
const choices: string[] = ['# 04　学生の選択肢・顧客回答一覧', '', '> 自動生成。回答前の画面には「推奨」「解説」「ほかの人の回答」を出さない。締め切り後に、自分が選んだ選択肢の映像が流れる。', ''];
for (const q of qs) {
  const p = phases.find((x) => x.phaseId === q.phaseId)!;
  choices.push(`## ${p.phaseTitle}　${q.questionId}「${q.questionText}」`, '');
  if (q.situation) choices.push(`直前の言葉：${who(q.situation.speaker)}「${q.situation.text}」`, '');
  choices.push('| 選択肢 | 営業（あなた）の言葉 | 答える人 | お客様の回答 | 分かったこと | まだ分からないこと |', '|---|---|---|---|---|---|');
  for (const c of q.choices) choices.push(`| ${c.choiceId}${c.choiceId === q.recommendedChoice ? '（推奨）' : ''}　${esc(c.choiceText)} | ${esc(salesLineOf(c))} | ${who(c.responder)} | ${esc(c.customerResponse)}${c.extraLines?.length ? ' ／ ' + c.extraLines.map((l) => `${who(l.speaker)}「${esc(l.text)}」`).join(' ') : ''} | ${esc(c.gained)} | ${esc(c.missing)} |`);
  choices.push('', `推奨の理由（解説で表示）：${q.recommendReason}`, '', `学び：${q.learningPoint}`, '', q.hint ? `先輩のヒント（学生が押すと表示）：${who(q.hint.speaker)}「${q.hint.text}」` : '', '');
}
writeFileSync(join(OUT, '04-choices.md'), choices.join('\n'));

// ───── 05 4フェーズの分岐設計
const br: string[] = ['# 05　4フェーズの分岐設計', '', '> 自動生成。すべての分岐は、次の共通の場面へ合流する（進行役が進める）。', '', '```', '導入動画（intro-fixed.mp4）'];
for (const p of phases.filter((x) => x.phaseId !== 'intro')) {
  br.push(`│`, `├─ ${p.phaseTitle}（${p.minutes}分）`);
  for (const s of scenes.filter((x) => x.phaseId === p.phaseId)) {
    if (s.type === 'question') {
      br.push(`│   ├─ ${s.questionId} ${s.questionText}`);
      for (const c of s.choices) br.push(`│   │    ${c.choiceId}${c.choiceId === s.recommendedChoice ? '★' : ' '} ${c.choiceText} → 映像 ${c.videoAsset}`);
      br.push(`│   │    └→ 合流：${s.nextSceneId}`);
    } else br.push(`│   ├─ ${s.title}${s.sceneId === 'p4-followup' ? '（基準に届かなかったときだけ）' : ''}`);
  }
}
br.push('```', '', '★＝推奨（解説の段階で初めて表示）。', '', '## 学生ごとの画面の流れ（1問あたり）', '', '1. 回答を受付（考える時間のカウントダウン・A/B/C・理由・先輩のヒント）', '2. 締め切り → **自分の選択肢の映像**とお客様の回答・分かったこと・まだ分からないこと（未回答の人は好きな選択肢を見られる）', '3. 解説 → 推奨と理由・学び。2名以上なら「A 1名／B 3名／C 1名」と理由（名前なし）。ほかの選択肢の映像も見られる', '');
writeFileSync(join(OUT, '05-branches.md'), br.join('\n'));

function kind(s: Scene) {
  return {video: '動画', clip: '映像', question: '問い', demo: '比較デモ', result: '結果', reflection: '振り返り', pitch: '提案入力'}[s.type];
}
console.log(`03・04・05 を書き出しました（要録音 ${need}文）`);
void assetById;

// ───── 録音が必要な文（音読さんで1文ずつ作る）
{
  const VOICE: Record<string, string> = {narration: 'Yann', sales: 'Kai', sato: 'Misa', takahashi: 'Tina', mori: 'Lena', nakata: 'Reid'};
  const rows: string[] = ['# 録音が必要な文（台本変更による録り直し・新規）', '', '> 自動生成。声の設定は docs/consulting-experience/talk-script.md の「話者と声」と同じ（音読さん Beta）。', '> 作った音声は、ファイル名どおりに `audio_import/experience/` に置き、`npm run experience:import-audio` → `npm run experience:render`。', '', '| # | ファイル名 | 話者 | 声 | 読み上げ文（読み方に直したもの） | 字幕の表記 |', '|---|---|---|---|---|---|'];
  let k = 0;
  for (const s of scenes) {
    const ids = s.type === 'question' ? [`q-${s.questionId}`, ...(s.hint ? [`hint-${s.questionId}`] : []), ...s.choices.map((c) => c.videoAsset)] : 'videoAsset' in s ? [s.videoAsset] : [];
    for (const aid of ids)
      linesForAsset(aid).forEach((l, i) => {
        const id = lineIdOf(aid, i);
        if (id in timing) return;
        rows.push(`| ${++k} | \`${id}.mp3\` | ${who(l.speaker)} | ${VOICE[l.speaker] ?? ''} | ${esc(speechOf(l.text))} | ${esc(l.text)} |`);
      });
  }
  writeFileSync(join(OUT, '12b-recording-list.md'), rows.join('\n') + '\n');
  console.log(`録音リスト：${k}文`);
}
