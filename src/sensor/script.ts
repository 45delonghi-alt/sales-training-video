// 光電センサ入門（2分以内）の台本。ナレーションを書き換えれば尺も自動で変わる。
// 音声ファイル public/audio/sensor/{行ID}.mp3 があればその長さ、なければ文字数から仮の長さを出す。

export type VisualKind =
  | 'title'
  | 'basics'
  | 'thru'
  | 'retro'
  | 'transparent'
  | 'diffuse'
  | 'bgs'
  | 'summary';

/** text は字幕。say は音声合成に渡す読み（読み間違えやすい語をかなで指定）。省略時は text */
export type NarrationLine = {id: string; text: string; say?: string};

export type SensorScene = {
  id: string;
  visual: VisualKind;
  /** 画面左上の見出し（タイトル場面では使わない） */
  heading?: string;
  /** 見出しの分類ラベル（例：方式1） */
  tag?: string;
  lines: NarrationLine[];
};

export const SENSOR_META = {
  fps: 30,
  width: 1920,
  height: 1080,
  /** 音声がないときの仮の長さ：1文字あたりの秒数 */
  secondsPerChar: 0.16,
  /** 1行の最短表示秒数 */
  minLineSeconds: 2,
  /** 行と行の間の余白 */
  lineGapSeconds: 0.3,
  /** 場面の頭と終わりの余白 */
  leadSeconds: 0.3,
  tailSeconds: 0.4,
  fadeFrames: 12,
  /** 尺の上限（これを超えたら scripts/sensor-durations.ts が警告） */
  maxSeconds: 120,
};

export const SENSOR_SCENES: SensorScene[] = [
  {
    id: 'S1',
    visual: 'title',
    lines: [{id: 'S1_1', text: '光電センサの3つの検出方式を、2分で学びましょう。', say: '光電センサの、みっつの検出方式を、にふんで学びましょう。'}],
  },
  {
    id: 'S2',
    visual: 'basics',
    heading: '光電センサとは？',
    lines: [
      {id: 'S2_1', text: '光電センサは、光を出し、その光の変化でモノの有無を見分けるセンサです。'},
      {id: 'S2_2', text: '光を出す側を「投光器」、受ける側を「受光器」と呼びます。'},
      {id: 'S2_3', text: '光の当て方の違いで、大きく3つの方式に分かれます。', say: '光の当て方の違いで、大きく、みっつの方式に分かれます。'},
    ],
  },
  {
    id: 'S3',
    visual: 'thru',
    tag: '方式 1',
    heading: '透過型',
    lines: [
      {id: 'S3_1', text: '1つめは「透過型」。投光器と受光器が、別々の筐体です。', say: 'ひとつめは「透過型」。投光器と受光器が、別々のきょうたいです。'},
      {id: 'S3_2', text: 'モノが光を遮ったら「ある」と判断します。', say: 'モノが光をさえぎったら「ある」と判断します。'},
      {id: 'S3_3', text: '色や形に左右されにくく、長い距離でも安定して検出できます。'},
      {id: 'S3_4', text: 'ただし、両側に配線が必要です。'},
    ],
  },
  {
    id: 'S4',
    visual: 'retro',
    tag: '方式 2',
    heading: '回帰反射型',
    lines: [
      {id: 'S4_1', text: '2つめは「回帰反射型」。投光と受光が1つの筐体です。', say: 'ふたつめは「回帰反射型」。投光と受光が、ひとつのきょうたいです。'},
      {id: 'S4_2', text: '反射板で折り返した光が、遮られたら検出します。', say: '反射板で折り返した光が、さえぎられたら検出します。'},
      {id: 'S4_3', text: '配線は片側だけ。透過型に近い安定性で、設置がラクです。'},
      {id: 'S4_4', text: '鏡のように光るモノは、偏光フィルタ付きで対策します。'},
    ],
  },
  {
    id: 'S5',
    visual: 'transparent',
    tag: '方式 2 の応用',
    heading: '回帰反射型（透明体専用）',
    lines: [
      {id: 'S5_1', text: '回帰反射型には「透明体専用」タイプもあります。'},
      {id: 'S5_2', text: 'ペットボトルやガラスは光をほとんど通すので、見逃しがちです。'},
      {id: 'S5_3', text: '透明体専用は、光がわずかに減る変化をとらえて検出します。'},
    ],
  },
  {
    id: 'S6',
    visual: 'diffuse',
    tag: '方式 3',
    heading: '反射型',
    lines: [
      {id: 'S6_1', text: '3つめは「反射型」。モノに当たって返ってきた光で検出します。', say: 'みっつめは「反射型」。モノに当たって返ってきた光で検出します。'},
      {id: 'S6_2', text: '反射板が要らず、センサ1台で済むのが強みです。', say: '反射板がいらず、センサいちだいで済むのが強みです。'},
      {id: 'S6_3', text: 'ただ、黒いモノは光が返りにくく、不安定になりがちです。'},
    ],
  },
  {
    id: 'S7',
    visual: 'bgs',
    tag: '方式 3 の応用',
    heading: '反射型（距離設定型＝BGS）',
    lines: [
      {id: 'S7_1', text: 'そこで「距離設定型（BGS）」です。', say: 'そこで、「距離設定型」、ビージーエスです。'},
      {id: 'S7_2', text: '普通の反射型は、光の「量」で判断します。'},
      {id: 'S7_3', text: 'BGSは三角測距で、光が受光素子の「どの位置」に戻ったかから距離を判別します。', say: 'ビージーエスは、さんかくそっきょで、光が受光素子の「どの位置」に戻ったかから、距離を判別します。'},
      {id: 'S7_4', text: '手前だけを検出するので、黒いモノや背景に強くなります。'},
    ],
  },
  {
    id: 'S8',
    visual: 'summary',
    heading: 'まとめ：どれを選ぶ？',
    lines: [
      {id: 'S8_1', text: '確実さなら透過型、配線をラクにするなら回帰反射型。'},
      {id: 'S8_2', text: '透明なモノは透明体専用、色や背景が気になるなら距離設定型。'},
      {id: 'S8_3', text: '検出したいモノと場所から、方式を選びましょう。'},
    ],
  },
];
