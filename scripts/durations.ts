// 各場面の尺（秒）の一覧を出力する。npm run durations
import {buildTimeline} from '../src/timeline';
import {loadAudioDurations, loadScript} from './load';

const script = loadScript();
const audio = loadAudioDurations(script);
const timeline = buildTimeline(script, audio);
const sec = (frames: number) => (frames / timeline.fps).toFixed(1);

const rows = timeline.scenes.map(({scene, durationInFrames, segments}) => {
  const lines = segments.filter((s) => s.kind === 'line');
  const estimated = lines.filter((s) => s.estimated).length;
  const pause = segments
    .filter((s) => s.kind === 'pause')
    .reduce((sum, s) => sum + s.durationInFrames, 0);
  const actual = durationInFrames / timeline.fps;
  return {
    場面: scene.name,
    '目安(秒)': scene.targetSeconds,
    '算出(秒)': Number(actual.toFixed(1)),
    '差(秒)': Number((actual - scene.targetSeconds).toFixed(1)),
    台詞数: lines.length,
    '仮の長さ': lines.length ? `${estimated}/${lines.length}` : '-',
    '間(秒)': pause ? Number(sec(pause)) : '-',
  };
});

console.table(rows);
const total = timeline.totalFrames / timeline.fps;
const target = script.scenes.reduce((s, x) => s + x.targetSeconds, 0);
console.log(
  `合計：${Math.floor(total / 60)}分${(total % 60).toFixed(1)}秒（${timeline.totalFrames}フレーム、場面転換のフェード重なり分を差し引き済み）／目安 ${Math.floor(target / 60)}分${target % 60}秒`,
);
console.log(
  `音声ファイル：${Object.keys(audio).length}件。音声が無い台詞は「文字数 × ${script.meta.secondsPerChar}秒 + 余白${script.meta.lineGapSeconds}秒」で仮算出しています。`,
);
