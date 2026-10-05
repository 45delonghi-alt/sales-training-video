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

export type NarrationLine = {id: string; text: string};

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
  leadSeconds: 0.4,
  tailSeconds: 0.6,
  fadeFrames: 12,
  /** 尺の上限（これを超えたら scripts/sensor-durations.ts が警告） */
  maxSeconds: 120,
};

export const SENSOR_SCENES: SensorScene[] = [
  {
    id: 'S1',
    visual: 'title',
    lines: [{id: 'S1_1', text: '光電センサの3つの検出方式を、2分で学びましょう。'}],
  },
  {
    id: 'S2',
    visual: 'basics',
    heading: '光電センサとは？',
    lines: [
      {id: 'S2_1', text: '光電センサは、光を出し、その光の変化でモノの有無を見分けるセンサです。'},
      {id: 'S2_2', text: '光を出す側を「投光器」、受ける側を「受光器」と呼びます。'},
      {id: 'S2_3', text: '光の当て方の違いで、大きく3つの方式に分かれます。'},
    ],
  },
  {
    id: 'S3',
    visual: 'thru',
    tag: '方式 1',
    heading: '透過型',
    lines: [
      {id: 'S3_1', text: '1つめは「透過型」。投光器と受光器が、別々の筐体です。'},
      {id: 'S3_2', text: '向かい合わせに置き、モノが光を遮ったら「ある」と判断します。'},
      {id: 'S3_3', text: '色や形に左右されにくく、長い距離でも安定して検出できます。'},
      {id: 'S3_4', text: 'その代わり、両側に設置と配線が必要です。'},
    ],
  },
  {
    id: 'S4',
    visual: 'retro',
    tag: '方式 2',
    heading: '回帰反射型',
    lines: [
      {id: 'S4_1', text: '2つめは「回帰反射型」。投光と受光が1つの筐体に入っています。'},
      {id: 'S4_2', text: '反射板で折り返した光が、遮られたら検出します。'},
      {id: 'S4_3', text: '配線は片側だけ。透過型に近い安定性で、設置がラクです。'},
      {id: 'S4_4', text: '鏡のように光るモノは光を返してしまうため、偏光フィルタ付きで対策します。'},
    ],
  },
  {
    id: 'S5',
    visual: 'transparent',
    tag: '方式 2 の応用',
    heading: '回帰反射型（透明体専用）',
    lines: [
      {id: 'S5_1', text: '回帰反射型には「透明体専用」タイプもあります。'},
      {id: 'S5_2', text: 'ペットボトルやガラスは光をほとんど通すため、普通のセンサでは見逃しがちです。'},
      {id: 'S5_3', text: '透明体専用は、光がわずかに減る変化をとらえて検出します。'},
    ],
  },
  {
    id: 'S6',
    visual: 'diffuse',
    tag: '方式 3',
    heading: '反射型',
    lines: [
      {id: 'S6_1', text: '3つめは「反射型」。モノに当たって返ってきた光で検出します。'},
      {id: 'S6_2', text: '反射板が要らず、センサ1台で済むのが強みです。'},
      {id: 'S6_3', text: 'ただ、黒いモノは光が返りにくいなど、色や形で検出が不安定になることがあります。'},
    ],
  },
  {
    id: 'S7',
    visual: 'bgs',
    tag: '方式 3 の応用',
    heading: '反射型（距離設定型）',
    lines: [
      {id: 'S7_1', text: 'そこで生まれたのが「距離設定型」。反射型の一種です。'},
      {id: 'S7_2', text: '光の「量」ではなく、返ってくる光の「角度」で距離を判断します。'},
      {id: 'S7_3', text: '設定した距離より手前のモノだけを検出するので、色や背景の影響を受けにくくなります。'},
    ],
  },
  {
    id: 'S8',
    visual: 'summary',
    heading: 'まとめ：どれを選ぶ？',
    lines: [
      {id: 'S8_1', text: 'まとめです。確実さなら透過型、配線をラクにするなら回帰反射型。'},
      {id: 'S8_2', text: '透明なモノは透明体専用、色や背景が気になるなら距離設定型。'},
      {id: 'S8_3', text: '「何を・どこで・どう検出したいか」から、方式を選びましょう。'},
    ],
  },
];
