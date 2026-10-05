# 研修動画「その1on1、続いていますか？」

営業部の上長向け 1on1 研修動画を Remotion（TypeScript）で作るプロジェクトです。
1920×1080 / 30fps / MP4。台本は `src/script.json` にデータとして入っており、**台本を書き換えれば動画が変わります**。

## 使い方

```bash
npm install
npm run dev        # プレビュー（Remotion Studio がブラウザで開く）
npm run durations  # 各場面の尺（秒）の一覧を表示
npm run csv        # 音声合成用の台詞一覧 audio_lines.csv を出力
npm run render     # out/one-on-one.mp4 を書き出し
```

## 構成

| ファイル | 役割 |
|---|---|
| `src/script.json` | 台本（場面・台詞・話者・間・心の声・テロップ）と各種設定 |
| `src/timeline.ts` | 台本と音声の長さから、各台詞の表示フレームを算出 |
| `src/components/Stage.tsx` | 会議室と人物（素材なし版は図形、素材あり版は画像） |
| `src/components/Overlays.tsx` | 字幕、心の声、評価シートUI、テロップ、行動カード |
| `src/scenes/` | 各場面の描画 |
| `scripts/` | 尺一覧・CSV出力（Node で実行） |

## 尺の決まり方

- 尺の目安（`targetSeconds`）は、台本の量に合わせて Before 56秒／After 152秒に見直し済み（全体 約5分25秒）。
  Before の短さは「話が広がらないまま終わる」演出として活かす判断です
- 台詞：音声ファイル（`public/audio/{台詞ID}.mp3`）があればその長さ、なければ「文字数 × 0.15秒」
  - さらに台詞の後に余白 0.3秒（`lineGapSeconds`）
  - 「はい。」など短い台詞も字幕が読めるよう、最低 1.2秒（`minLineSeconds`）
- 「…」の間：音声合成に任せず動画側で 0.7秒（`ellipsisPauseSeconds`）の無音を入れる
  - 先頭の「…」（例：「…はい。」）→ 音声の前に無音
  - 途中の「…」（B02・A03・A04）→ 音声を `B02_1.mp3` と `B02_2.mp3` に分け、間に無音。1ファイル（`B02.mp3`）でも動く
- `[間○秒]`：`{"type": "pause", "seconds": 3}` で無音のまま再現（カメラは直前の人物に寄り続ける）
- 心の声：音声なし。文字数 × 0.15秒（最低 2.5秒）
- 場面転換：0.5秒のフェード（前後の場面が重なる分、合計は短くなる）

## 素材の差し替え

### 音声
`public/audio/` に台詞IDの名前で置くだけで、表示時間が自動で音声の長さに変わります。

- 台詞：ファイル名・読み上げるテキスト・声の指示・注意は `audio_lines.csv`（`npm run csv` で再出力）を参照
  - 「読み上げるテキスト」列には、動画側で間を入れる「…」を除いた文を入れてある
- 環境音（空調音など）：`ambient.mp3`（あれば会話場面で小さくループ再生。音量は `ambientVolume`）
- BGM は会話中に流しません

音声が無い台詞は 404 のログが出ますが、仮の長さで動くので問題ありません。

### 画像
`public/images/` に以下を置き、`src/script.json` の `meta.useImages` を `true` にします。

- 背景：`background.png`（人物が写っていない会議室）
- 人物（背景透過PNG）：`tanaka_front.png` / `tanaka_side.png` / `tanaka_down.png` / `tanaka_smile.png`、`sato_` も同様
- どの台詞でどの表情を使うかは、台本の `"pose"`（front / side / down / smile）で指定

## 注意

- 登場人物・社名・評価シートはすべて架空です。実在の社員・取引先の名前や顔は使わないでください。
- 評価シートUIの「行動計画」「社内連携」は画面の見た目を整えるための架空項目です（本人・上長とも同点）。

---

# 研修動画「光電センサ 3つの検出方式」（約1分53秒）

オプテックス・エフエーの光電センサの検出方式（透過型／回帰反射型・透明体専用／反射型・距離設定型）を、大学生でも分かるように図解する動画です。
同じプロジェクト内の別コンポジション `PhotoSensor` として作っています。

```bash
npm run sensor:report   # 場面ごとの尺と合計（上限120秒）を表示し、sensor_narration.csv を出力
npm run sensor:render   # out/photo-sensor.mp4 を書き出し
```

| ファイル | 役割 |
|---|---|
| `src/sensor/script.ts` | 台本（場面・ナレーション）と尺の設定 |
| `src/sensor/visuals.tsx` | 各方式の図解アニメーションと右側のポイント |
| `src/sensor/parts.tsx` | センサ本体・光の矢印・検出物などの部品 |
| `src/sensor/SensorVideo.tsx` | 見出し・字幕・タイトル・まとめ表の共通レイアウト |
| `deliverables/photo-sensor_draft.mp4` | 書き出し済みの試作版（字幕のみ・無音） |

- 図解の動きはナレーションの行に合わせて出る（例：「遮ったら」の行で検出物が落ちてくる）
- 音声：`public/audio/sensor/{行ID}.mp3`（例 `S3_2.mp3`）を置くと、その長さに合わせて尺が自動で伸び縮みする。読み上げ原稿は `sensor_narration.csv`
- 音声がない場合は「読み上げる文字数 × 0.16秒」で仮の尺を出している
