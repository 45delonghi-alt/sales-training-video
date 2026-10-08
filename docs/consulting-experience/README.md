# OPTEX-FA 28卒向け コンサルティング営業体験（60分）

「聞く。考える。提案する。そして、確かめる。」
学生が OPTEX-FA の営業担当になり、飲料工場の誤カウントの相談に向き合います。質問 → 発見 → 提案 → 実機での検証までを体験する、インタラクティブなコンテンツです。

## まず動かす

```bash
npm run experience:validate   # 分岐・素材の対応を検査
npm run experience:build      # 体験アプリを dist/experience/ に書き出す
npm run experience:serve      # http://localhost:4173/ で配信（会場PC）
```

- 進行役：`http://localhost:4173/` を開き、右上で「進行役モード」に切り替える。
- 投影用：進行役パネルの「投影用ウィンドウを開く」（または `?view=projector`）。
- 操作の詳細：[facilitator-guide.md](facilitator-guide.md)

## 納品物と状態（2026-10-08 時点）

状態の区分：実装済み／テスト済み／仮素材使用中／実写素材待ち／許諾確認待ち／未完成

| # | 納品物 | 場所 | 状態 |
|---|---|---|---|
| 01 | 制作方針・全体構成・60分タイムテーブル・既存台本との差分 | [concept.md](concept.md)、[schedule.md](schedule.md) | 実装済み |
| 02 | 全体台本・セリフ・質問と選択肢・顧客回答・解説・実機デモ台本 | [script.md](script.md)（データから自動生成） | 実装済み |
| 03 | ストーリーボード（映像設計・カメラ・表示テキスト・タイミング） | [storyboard.md](storyboard.md)（自動生成）、[setting.md](setting.md) | 実装済み |
| 04 | 使用製品一覧・画像の置き場所・撮影素材一覧・CG制作指示・素材の取得状況 | [asset-license-check.md](asset-license-check.md)、[asset-manifest.csv](asset-manifest.csv) | 実装済み（素材は**実写素材待ち・許諾確認待ち**） |
| 05 | 体験アプリ（React/TypeScript）・進行役モード・分岐データ・実機動画の差し替え | `src/experience/app/`、`src/experience/data/` | **テスト済み**（全分岐 79項目合格） |
| 05 | Remotion（分岐クリップ39本） | `src/experience/remotion/` | 実装済み（**仮素材使用中**：線画CG） |
| 06 | 導入動画 | `out/consulting-sales.mp4`（既存） | 実装済み（既存のまま） |
| 06 | フェーズ別・選択肢別・実機デモ・エンディングの映像 | `out/experience/videos/*.mp4`（`npm run experience:render`） | 実装済み（CG版）／**実写素材待ち** |
| 07 | 進行役マニュアル・学生用ワークシート・実機デモ準備チェックリスト・検証結果記録シート | [facilitator-guide.md](facilitator-guide.md)、[worksheet.md](worksheet.md)、[demo-checklist.md](demo-checklist.md)、[demo-record-sheet.md](demo-record-sheet.md) | 実装済み |
| 07 | 再レンダリング手順・素材差し替え手順 | 下記 | 実装済み |
| 08 | 全分岐動作テスト・技術表現の確認・未取得素材と未解決事項 | [qa-report.md](qa-report.md)、[technical-review.md](technical-review.md) | テスト済み（技術表現は**公式ページとの直接照合が未了**） |

## ビジュアル演出強化の最終成果物（7点）

| # | 成果物 | 場所 | 状態 |
|---|---|---|---|
| 1 | シーン別映像台本（Scene 1〜8） | [scene-script.md](scene-script.md)（自動生成） | 実装済み |
| 2 | 選択肢別の映像素材一覧（phaseId・choiceId・visualSubject・cameraDirection・animationDirection・customerResponse・technicalInsight・assetPath・fallbackVisual） | [choice-visuals.md](choice-visuals.md)、`src/experience/data/visual-branches.json` | 実装済み・検証済み |
| 3 | 素材生成用プロンプト一覧 | [generation-prompts.md](generation-prompts.md)（自動生成） | 実装済み（**生成は未実行**：費用の承認待ち） |
| 4 | インタラクティブReact画面 | `src/experience/app/` | テスト済み（81項目） |
| 5 | Remotion動画コンポーネント | `src/experience/remotion/` | 実装済み（**CG・仮素材**） |
| 6 | 実機デモ映像の差し替え機能 | アプリの「実機の動画」／`public/experience/videos/<素材ID>.mp4` | テスト済み |
| 7 | フルHD動画と操作マニュアル | `out/experience/videos/*.mp4`（1920×1080・39本）、[facilitator-guide.md](facilitator-guide.md) | 実装済み（CG版） |

### 演出の強化点
- **カメラワーク**：誤カウントの瞬間にセンサへズームイン、流れの乱れはスローモーションで寄る、全景はクレーンで引く、作業者へパン、資料は手に取るように起こして寄る。
- **光の仕組みの3D CG**：手前にセンサ・奥に反射板の3D空間を、カメラが回り込みながら見せる。不透明なモノは光を遮り、透明ボトルは通す。その場の受光量と出力ON/OFFが連動する。
- **お客様の反応**：資料やラインの映像でお客様が話すときは、右下の小窓に表情（考え込む・不安・前向きなど、選択肢ごとに設定）を出す。音声ファイルを置けば声も流れる。
- **考える時間**：導入動画（3か所）と光の解説（1か所）で自動的に止まり、問いを出す。学生が見ているだけの時間は、最長でも約1分30秒。
- **実機デモのネタバレ防止**：シミュレーションは1本目だけで「見方」を説明し、2本目以降の結果は見せない（「この先は実機で確かめる」）。

## 仕組み

```
src/experience/
  data/        phases.json・scenes.json（場面・問い・選択肢・回答）・assets.json（映像素材）・branches.json（自動生成）
  remotion/    映像の部品（工場ライン・お客様・資料・技術解説・製品・実機デモ・エンディング）
  app/         体験アプリ（進行・分岐・記録・投影同期）
scripts/
  experience.ts          検証・書き出し（台本・ストーリーボード・素材管理表・音読さん用セリフ）
  experience-app.ts      アプリのビルド・配信
  experience-render.ts   クリップの静止画・MP4 の書き出し
tests/experience.e2e.mjs 全分岐の自動テスト（Playwright）
```

- **選択肢と映像の対応**は `scenes.json` の `choices[].assetId` だけで決まる。`npm run experience:validate` が、映像の使い回し・存在しない素材・行き止まりの場面・時間配分（60分／45分）を検査する。
- アプリは Remotion のクリップをその場で描画する（`@remotion/player`）。書き出した MP4 がなくても動く。

## 素材の差し替え

| 届いたもの | 置き場所 | 設定 |
|---|---|---|
| お客様の声・ナレーション | `public/experience/audio/<素材ID>.mp3` | 置くだけで再生（セリフの開始時刻から）。セリフは `out/experience/ondoku/` |
| 実写・実機の映像 | `public/experience/videos/<素材ID>.mp4` | 置くだけで切り替わる（別の名前にしたいときは `assets.json` の `videoPath` で指定） |
| OPTEX-FA 公式製品画像 | `public/experience/products/optex-fa/transparent-sensor.png` | 設定済み（置くだけで表示が切り替わる） |
| セリフ・選択肢の変更 | `src/experience/data/scenes.json` | 変更後に `npm run experience:export`（台本・ストーリーボードを更新） |
| 当日の実機デモ動画 | アプリの実機デモ画面 →「実機の動画」→ ファイルを選ぶ | 保存不要（その場で再生） |

差し替えたら `npm run experience:validate` → `npm run experience:build` を実行する。配置されていない素材は CG のまま表示され、存在しないファイルを読みにいくことはない。

## 再レンダリング

```bash
npm run experience:stills                      # 各クリップの静止画（確認用）→ out/experience/stills/
npm run experience:render                      # 全クリップの MP4 → out/experience/videos/
npx tsx scripts/experience-render.ts videos out/experience/videos p1-q1-b   # 1本だけ
```

Chrome を自動でダウンロードできない環境では、`REMOTION_BROWSER=<Chrome（headless shell）のパス>` を付けて実行する。

## テスト

```bash
npm run experience:build && npm run experience:serve   # 別のターミナルで
node tests/experience.e2e.mjs                          # 全分岐の自動テスト
```
