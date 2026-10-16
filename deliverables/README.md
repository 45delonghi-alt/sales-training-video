# 成果物の一覧（OPTEX-FA｜WEB参加型コンサルティング営業体験）

最終更新：2026-10-16（v6）

ブランチ `claude/tender-keller-7t32dz` に置いた成果物を、1か所から開けるようにまとめた一覧です。GitHub 上で各リンクを開き、「Download raw file」（↓）を押すと保存できます。

## 1. まず使うもの（最新版 v6）

| 用途 | ファイル | 長さ | 内容 |
|---|---|---|---|
| **会場で投影する** | [2026-10-16_v6_with-intro_1080p.mp4](videos/2026-10-16_v6_with-intro_1080p.mp4) | 14分49秒 | 導入動画＋後半（推奨ルート）。フェーズナビゲーション入り |
| 確認・共有用（軽い版） | [2026-10-16_v6_with-intro_720p.mp4](videos/2026-10-16_v6_with-intro_720p.mp4) | 14分49秒 | 同上の720p |
| 分岐の確認（A/B/C 全部） | [2026-10-16_v6_all-branches_1080p.mp4](videos/2026-10-16_v6_all-branches_1080p.mp4) | 13分59秒 | 後半の全分岐を順につないだもの（研修では使わない。内容確認用） |
| 分岐の確認（軽い版） | [2026-10-16_v6_all-branches_720p.mp4](videos/2026-10-16_v6_all-branches_720p.mp4) | 13分59秒 | 同上の720p |
| 導入動画のみ | [intro-fixed.mp4](../public/consulting/video/intro-fixed.mp4) | 3分58秒 | 導入P6のセンサ配置を直した版。本編（v6）・WEBアプリはこちらを使用 |
| 導入動画のみ（文の間＋1.3秒） | [2026-10-16_intro_pause1.3s_1080p.mp4](videos/2026-10-16_intro_pause1.3s_1080p.mp4) | 5分14秒 | intro-fixed.mp4 の文と文の間（58か所）に1.3秒の間を足した版。間のあいだは画面を止め、BGM は途切れさせない。作り方：`python3 scripts/program60/intro-pauses.py 1.3` |
| スライド（全体） | [web-experience-all.pptx](../docs/web-experience/web-experience-all.pptx) | 103枚 | 導入23枚＋後半の全場面。ノートの先頭にセリフ |
| スライド（導入のみ） | [intro-slides.pptx](../docs/intro-slides/intro-slides.pptx) | 23枚 | 導入動画のスライド版 |

研修の本番は、動画ファイルではなく **WEBアプリ**（問いで自動的に止まり、THINK TIME と学生の回答がある）で進めます。完成動画は、事前確認・共有・アプリが使えないときの予備です。

## 2. 版の履歴（動画）

| 版 | 日付 | ファイル | 長さ | この版の内容 |
|---|---|---|---|---|
| v6（最新） | 10/16 | 上の4本 | 14分49秒 | v5 に加えて：登場人物の紹介とワイプを受領した新しい画像に差し替え（架空の人物である旨を表示）、P29 の PLC を受領画像に、話す速さを1.0倍に戻した、スライドごとに1秒の間。音声の照合：全137文で問題なし |
| v5 | 10/16 | [with-intro_1080p](videos/2026-10-16_v5_with-intro_1080p.mp4)・[720p](videos/2026-10-16_v5_with-intro_720p.mp4)／[all-branches_1080p](videos/2026-10-16_v5_all-branches_1080p.mp4)・[720p](videos/2026-10-16_v5_all-branches_720p.mp4) | 15分27秒 | P1〜P80 総合修正（ヒント統合・改行・チャプター文字2倍・PLCの説明・ボトルの描写・KR-Qの資料画像）、話す速さ0.8倍 |
| v4 | 10/15 | [2026-10-15_v4_audio-integrated_720p.mp4](videos/2026-10-15_v4_audio-integrated_720p.mp4) | 14分31秒 | 受領した16本の音声を全137文に配置。フェーズナビゲーション、問いの画面+5秒、丸いバッジのワイプ |

- v3 以前の動画は、指示により削除しました（必要な場合は、その日のコミットから作り直せます）。
- 元の導入動画（受領版・センサ配置の修正前）は [intro-final.mp4](../public/consulting/video/intro-final.mp4) です。

## 3. 資料

| 資料 | ファイル |
|---|---|
| P1〜P80 修正の実施報告（10/16） | [15-p80-revision-report.md](../docs/web-experience/15-p80-revision-report.md) |
| 修正前後のページ対応表 | [14-page-map.md](../docs/web-experience/14-page-map.md)・[14-page-map.xlsx](../docs/web-experience/14-page-map.xlsx) |
| 優先16ページの確認画像 | [review/p80/](../docs/web-experience/review/p80/)（一覧は sheet-1.jpg・sheet-2.jpg） |
| 音声の配置一覧 | [13-audio-placement.md](../docs/web-experience/13-audio-placement.md)・[.xlsx](../docs/web-experience/13-audio-placement.xlsx) |
| 未解決事項 | [12-open-issues.md](../docs/web-experience/12-open-issues.md) |
| 変更履歴 | [11-change-log.md](../docs/web-experience/11-change-log.md) |
| 進行役マニュアル | [09-facilitator-manual.md](../docs/web-experience/09-facilitator-manual.md) |
| 接続の確認手順 | [10-connection-check.md](../docs/web-experience/10-connection-check.md) |
| 登場人物の一覧 | [character-sheet.png](../docs/web-experience/character-sheet.png) |
| 60分版の設計書・スライド | [program60-design.xlsx](../docs/program60/program60-design.xlsx)・[program60-slides.pptx](../docs/program60/program60-slides.pptx) |
| 設計資料一式（旧版を含む） | [docs/web-experience/](../docs/web-experience/README.md)・[docs/consulting-experience/](../docs/consulting-experience/README.md) |

※ [talk-script-by-slide.docx](../docs/consulting-experience/talk-script-by-slide.docx)（10/14）は v3 時点のトークスクリプトです。最新のセリフは web-experience-all.pptx のノートを使ってください。

## 4. 動画の作り直し方（制作担当向け）

ここに置いた動画は、作業用フォルダ `out/`（リポジトリに入らない）で作ったものの写しです。

```bash
npx tsx scripts/experience-render.ts videos out/experience/videos   # 場面ごとのクリップ
npx tsx scripts/experience-assemble.ts recommended                  # 導入＋推奨ルート
npx tsx scripts/experience-assemble.ts all                          # 全分岐
python3 scripts/experience-verify.py out/experience/final/experience-with-intro.manifest.json  # 音声の照合
```

新しい版を作ったら、`deliverables/videos/` に `日付_版_内容_画質.mp4` の名前で置き、この一覧に1行足してください。
