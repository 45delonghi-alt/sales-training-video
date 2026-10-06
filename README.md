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

# 新卒採用「コンサルティング営業体験」導入動画

学生の「営業＝商品を売る仕事」というイメージを、「聞く → 考える → 課題を見つける → 提案する仕事」へ変えるための導入動画（約3分10秒）。
上の1on1研修動画とは独立したCompositionです（`ConsultingSales`）。既存ファイルは `src/Root.tsx` に登録を1件足しただけです。

## 使い方

```bash
npm run dev                    # Remotion Studio で「ConsultingSales」を選ぶ
npm run consulting:durations   # Sceneごとの尺（音声の長さから自動算出）
npm run consulting:csv         # 音声合成用ナレーション一覧 consulting_narration.csv を出力
npm run render:consulting      # out/consulting-sales.mp4 を書き出し
```

## 構成

| ファイル | 役割 |
|---|---|
| `src/consulting/script.ts` | 台本。Sceneごとに narration（字幕つき）/ visual / animation / 尺の最低値 |
| `src/consulting/types.ts` | 台本の型 |
| `src/consulting/timeline.ts` | 音声の長さ → 各Scene・字幕・演出きっかけのフレームを算出 |
| `src/consulting/components/` | 背景、字幕、コンベア線画、センサ原理図など共通部品 |
| `src/consulting/scenes/` | Scene01Opening 〜 Scene09Ending |
| `public/consulting/` | 表紙画像、ナレーション音声、BGM |

## 尺の決まり方

- Scene の尺 ＝ 冒頭の余白（leadIn）＋ Σ（ナレーション＋文後の間 pauseAfter）＋ 末尾の余白（tail）。`minSeconds` に満たなければ末尾を延ばす
- ナレーション：`public/consulting/audio/narration/{ID}.mp3` があればその長さ、無ければ「文字数 × 0.15秒」の仮の長さ
- 演出は「どのナレーションの開始／終了か」（Cue）で指定しているため、音声を録り直しても画面とずれない
- 字幕は1文の音声時間を、字幕の文字数比で割り振る。重要語（聞く／考える／課題／提案／本当の課題）は自動で赤・太字

## 素材の差し替え

- ナレーション：同名のmp3を置き換えるだけ（下の「音読さんで作り直す」も参照）。読み間違い対策の読み（例：「10分」→「じゅっぷん」）は `speech` に書く
- BGM：`public/consulting/audio/bgm.mp3` を差し替え（現在はffmpegで合成した仮BGM）。音量は `bgmVolume`、ナレーション中の下げ幅は `bgmDuck`
- ロゴ：エンディングの「OPTEX FA」は文字で組んだ仮表記。正式ロゴを受領したら `Scene09Ending.tsx` を画像に差し替え

## 音読さん（など外部の読み上げソフト）で作り直す

1. `npm run consulting:ondoku` で `out/ondoku/` に原稿を出す（scene01〜09.txt と all.txt。1行＝1文、文の間は空行）
2. 音読さんで Scene ごとに読み上げ、`scene01.mp3` 〜 `scene09.mp3` の名前で `audio_import/` に保存
   - 声・話速は全Sceneで同じ設定にする。文の間に無音が入ることが分割の条件
   - 1文だけ録り直すときは `S04_07.mp3` のように文IDの名前で置けば、その文だけ差し替わる
3. `npm run consulting:import` で文ごとに自動分割し、前後の無音を詰めて音量をそろえ、`public/consulting/audio/narration/` に出力
4. `npm run consulting:durations` で尺を確認 → `npm run render:consulting`
5. `script.ts` の `meta.narrator` を音読さんの声の名前に書き換える（台本PDFに載る）
