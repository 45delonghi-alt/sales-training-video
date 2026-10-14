// 音読さんの API で、全セリフの音声を1文ずつ作る。
//   npm run experience:ondoku            … 未作成の文だけ作る（途中で止まっても続きから）
//   npm run experience:ondoku -- --force … 全部作り直す
//   npm run experience:ondoku -- --only=sato … 話者を絞る
// 声は characters.json の ondokuVoice。できた音声は audio_import/experience/<セリフID>.mp3 に置き、
// そのあと npm run experience:import-audio で取り込む（速度・音量・映像の長さがそろう）。
// トークンはこの環境のネットワークシークレットとして登録しておく（プログラムからは扱わない）。
import {execFileSync} from 'node:child_process';
import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {characterById, speechOf} from '../src/experience/data';
import {talkLines} from './talk-script';

const API = 'https://ondoku3.com/ja/text_to_speech_api/';
const OUT = join(process.cwd(), 'audio_import', 'experience');
const force = process.argv.includes('--force');
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// 通信は curl で行う（この環境のプロキシ設定をそのまま使えるため）
const curl = (args: string[]) => execFileSync('curl', ['-sS', '--fail-with-body', '--max-time', '120', ...args], {maxBuffer: 64 * 1024 * 1024});

const tts = async (text: string, voice: string, pitch: number) => {
  let last = '';
  for (let i = 0; i < 4; i++) {
    try {
      const out = curl(['-X', 'POST', API, '-H', 'Content-Type: application/json', '-d', JSON.stringify({text, voice, speed: 1, pitch})]).toString();
      const body = JSON.parse(out) as {url?: string; error?: string};
      if (body.url) return curl([body.url]);
      last = body.error ?? out.slice(0, 200);
      if (/voice|token|credit|文字/i.test(last)) break;
    } catch (e) {
      last = String((e as {stdout?: Buffer}).stdout ?? e).slice(0, 200);
    }
    await sleep(2000 * 2 ** i);
  }
  throw new Error(`音読さんから音声を受け取れませんでした：${last}`);
};

const main = async () => {
  mkdirSync(OUT, {recursive: true});
  const lines = talkLines().filter((l) => !only || l.speaker === only);
  let made = 0;
  let chars = 0;
  for (const l of lines) {
    const c = characterById.get(l.speaker);
    if (!c?.ondokuVoice) throw new Error(`${l.speaker} の声（characters.json の ondokuVoice）が決まっていません`);
    const file = join(OUT, `${l.lineId}.mp3`);
    if (existsSync(file) && !force) continue;
    const text = speechOf(l.text);
    writeFileSync(file, await tts(text, c.ondokuVoice, c.ondokuPitch ?? 0));
    made++;
    chars += [...text].length;
    console.log(`${l.lineId}\t${c.name}\t${l.text}`);
    await sleep(400);
  }
  console.log(`作成：${made}文（${chars}文字）／全${lines.length}文。次は npm run experience:import-audio`);
};

main().catch((e) => {
  console.error(String(e?.message ?? e));
  process.exit(1);
});
