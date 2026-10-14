# 収録・画像の差し替えガイド（v3）

## 1. 声（音読さん）

手順と全セリフは [talk-script.md](talk-script.md)。

1. 話者ごとに音読さんの声を決める（同じ話者は最後まで同じ声。お客様と営業は必ず別の声）。
2. `ondoku/` の原稿（話者ごと・1回で貼れる450文字以内に区切った11ファイル。例：`sato_01.txt`）を貼って読み上げる。
3. 音声を同じ名前（例：`sato_01.mp3`）で `audio_import/experience/` に置く（mp3／wav／m4a）。1文だけ録り直すときは、セリフIDの名前（例：`p1-q1-b_02.mp3`）で置く。
4. `npm run experience:import-audio` → 無音で文ごとに分け、`public/experience/audio/<セリフID>.mp3` に保存。`src/experience/data/audioTiming.json` に各文の長さが入り、**映像の長さ・字幕・ショットの切り替えが音声に合わせて自動で調整**される。
   - 速さを変えるときは `SPEED=0.9 npm run experience:import-audio` のように指定する（ナレーションも音読さん側の速度1.0xのまま取り込む）。
   - 分け方がずれた文は、その文だけ単独の音声で置き直す。
5. `npm run experience:render` で動画を書き出す。アプリは書き出さなくても、そのまま声付きで再生できる。

問いの読み上げ（`q-…`）・先輩のヒント（`hint-…`）・振り返りの問い（`r-…`）も、収録すればアプリで再生される。

## 2. 映像の見た目

後半（体験パート）の映像は、導入動画と同じ部品（背景・線画のライン・字幕）で Remotion が描きます。写真や画像生成は使いません。

| 変えたいもの | 場所 |
|---|---|
| 場面の並び・見出し | `src/experience/data/assets.json`（`shots`） |
| 場面の中身（図・パネル） | `src/experience/remotion/v4/Scenes.tsx` |
| 枠・字幕・配色 | `src/experience/remotion/v4/Kit.tsx`（導入動画の `src/consulting/theme.ts` と同じ色） |

変えたら `npm run experience:validate` → `npm run experience:stills`（静止画で確認）→ `npm run experience:render`。

## 3. 実写・実機の映像

| 素材 | 置き場所 | 形式 |
|---|---|---|
| 映像（実写・実機） | `public/experience/videos/<素材ID>.mp4` | 1920×1080、30fps、H.264。字幕は焼き込まない |
| OPTEX-FA 製品画像（公式） | `public/experience/products/optex-fa/transparent-sensor.png` | 許諾済みのもの |
| 実機デモの当日映像 | アプリの実機デモ画面 →「実機の動画」 | 保存不要 |

実機デモを撮るときの決まり：既設センサと KR-Qシリーズを**同じボトル・同じ速度・同じ高さ**で撮る。撮影日・条件をメモし、記録シート（[demo-record-sheet.md](demo-record-sheet.md)）の実測値と対応させる。成功した部分だけを切り出さない。
