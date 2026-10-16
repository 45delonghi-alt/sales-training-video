# 修正前後のページ対応表（2026-10-16 修正指示「後半動画 P1〜P80」）。
#   python3 scripts/web-experience/page-map.py out/p80/before.pptx docs/web-experience/web-experience-scenes.pptx
# 修正前のページ番号（P）は、お客様の資料の番号に合わせる：
#   スライド3〜34 → P1〜P32（スライド番号−2）／スライド40〜85 → P36〜P81（スライド番号−4）
#   スライド35〜39（5枚）は P33〜P35（3つ）にあたり、1対1に決められない（要確認。修正の指定はない範囲）
# 内部ID：<映像ID>#<画面の番号>。扉は chapter-<フェーズ>、WEBアプリの画面は app-think／app-pitch
import json, re, sys
from pathlib import Path
from pptx import Presentation
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

ROOT = Path(__file__).resolve().parents[2]


def ids(path):
    out = []
    for i, s in enumerate(Presentation(path).slides, 1):
        n = s.notes_slide.notes_text_frame.text if s.has_notes_slide else ''
        m = re.search(r'映像 ([\w-]+)（', n)
        sh = re.search(r'（画面 (\d+)/(\d+)）', n)
        if m:
            iid = f"{m.group(1)}#{sh.group(1) if sh else 1}"
        elif '扉' in n[:60]:
            iid = 'chapter-' + next((p for k, p in [('PHASE 1', 'p1'), ('PHASE 2', 'p2'), ('PHASE 3', 'p3'), ('PHASE 4', 'p4')] if k in n[:40]), 'reflection')
        elif 'THINK TIME' in n[:80]:
            iid = 'app-think'
        elif '30秒で提案' in n[:80]:
            iid = 'app-pitch'
        elif '表紙' in n[:10]:
            iid = 'cover'
        elif '導入動画（intro-fixed' in n[:30]:
            iid = 'intro-p23'
        else:
            iid = '?'
        serif = n.split('\n')[1] if n.startswith('■ セリフ') else ''
        out.append({'slide': i, 'id': iid, 'serif': serif})
    return out


def old_p(slide):
    if 3 <= slide <= 34:
        return f'P{slide - 2}'
    if 35 <= slide <= 39:
        return 'P33〜P35（要確認）'
    if slide >= 40:
        return f'P{slide - 4}'
    return '—'


# 修正指示（修正前のページ番号ごと）
CHANGES = {
    'P3': 'チャプタータイトル（PHASE 01 聞く）の中央の文字を2倍',
    'P4': '最初の画面を3秒延長（2つめのセリフの前に3秒の間）',
    'P6': '先輩のヒント（修正前P8）を移設。「専門知識がなくても大丈夫。」の後で改行',
    'P8': 'ヒントを修正前P6へ移設し、この画面は削除（ほかの内容なし）',
    'P10': '「？」の後で改行',
    'P12': '「、」の後で改行',
    'P14': '先輩のヒント（修正前P15）を移設。問いの文は「、」の後で改行',
    'P15': 'ヒントを修正前P14へ移設し、この画面は削除',
    'P18': '「。」の後で改行',
    'P20': 'チャプタータイトル（PHASE 02 考える）の中央の文字を2倍',
    'P21': '「、」の後で改行',
    'P25': '「。」の後で改行',
    'P27': '上から見たボトルを重ならないように（接近は、わずかなすき間で表現）',
    'P29': '「PLCとは？」（外観のイメージ・正式名称・センサとPLCの関係）を追加。佐藤さんの「PLCで数えています」から表示',
    'P31': '先輩のヒント（修正前P32）を移設。ヒントは「、」の後で改行',
    'P32': 'ヒントを修正前P31へ移設し、この画面は削除',
    'P36': 'チャプタータイトル（PHASE 03 課題を見つける）の中央の文字を2倍',
    'P38': '先輩のヒント（修正前P39）を移設。ヒントは「、」の後で改行',
    'P39': 'ヒントを修正前P38へ移設し、この画面は削除',
    'P42': '「、」の後で改行（2つのセリフとも）',
    'P43': '「お客様が本当に解決したいことは」の後で改行',
    'P44': '「その先で困っていることを、」の後で改行（原文は「ことを、」）',
    'P45': '「、」の後で改行（2つのセリフとも）',
    'P46': '「減れば、」の後で改行',
    'P47': '「、」の後で改行（2つのセリフとも）',
    'P48': '「数え直しも、」の後で改行',
    'P51': 'チャプタータイトル（PHASE 04 提案する）の中央の文字を2倍',
    'P52': '「、」の後で改行',
    'P53': '先輩のヒント（修正前P54）を移設。ヒントは「、」の後で改行',
    'P54': 'ヒントを修正前P53へ移設し、この画面は削除',
    'P55': '指定「。以降を改行」：この画面の文に文中の「。」がないため変更なし（要確認）',
    'P60': '変更なし（製品画像の表示位置を確認）',
    'P64': 'ボトルの揺れ：大半は正常、ときどき1本だけ横にずれる（規則的な波をやめた）',
    'P65': 'ボトルの接近：間隔を狭く、重ならない（わずかなすき間）',
    'P67': '先輩のヒント（修正前P68）を移設。問いの文は語の途中で切れないよう「、」の後で改行',
    'P68': 'ヒントを修正前P67へ移設し、この画面は削除',
    'P69': '「、」の後で改行（2つのセリフとも）',
    'P79': '「か？」を上段に続けて1行で表示',
}
MERGED = {'hint-P1-Q1#1': 'q-P1-Q1#1', 'hint-P1-Q2#1': 'q-P1-Q2#1', 'hint-P2-Q2#1': 'q-P2-Q2#1', 'hint-P3-Q1#1': 'q-P3-Q1#1', 'hint-P4-Q1#1': 'q-P4-Q1#1', 'hint-P4-Q3#1': 'q-P4-Q3#1'}


def main():
    before, after = ids(sys.argv[1]), ids(sys.argv[2])
    new_slide = {r['id']: r['slide'] for r in after}
    new_p = lambda s: f'新P{s - 2}' if s and s >= 3 else '—'
    rows = []
    for r in before:
        if r['slide'] < 3:
            continue
        p = old_p(r['slide'])
        target = MERGED.get(r['id'], r['id'])
        ns = new_slide.get(target)
        extra = [x for x in after if x['id'].startswith(r['id'].split('#')[0] + '#') and x['id'] not in {y['id'] for y in before}]
        change = CHANGES.get(p.split('（')[0], '')
        result = '統合（削除）' if r['id'] in MERGED else ('修正' if change and '変更なし' not in change else '変更なし')
        rows.append({'old': p, 'oldSlide': r['slide'], 'id': r['id'], 'serif': r['serif'][:40], 'change': change or '—', 'new': new_p(ns) + (f'（{target} に統合）' if r['id'] in MERGED else ''), 'newSlide': ns or '', 'result': result, 'added': '、'.join(f"{x['id']}（新P{x['slide'] - 2}）" for x in extra)})
    json.dump(rows, open(ROOT / 'out' / 'p80' / 'page-map.json', 'w'), ensure_ascii=False, indent=1)
    md = ['# 14　修正前後のページ対応表（後半動画 P1〜P80・2026-10-16）', '',
          '> `python3 scripts/web-experience/page-map.py` で自動生成。Excel 版：`14-page-map.xlsx`。', '',
          '- 修正前のページ番号は、お客様の資料の番号（場面一覧スライドの番号−2。PHASE 3 の扉以降は−4）。',
          '- スライド35〜39（5枚：p2-q2-a・p2-q2-b・p2-q2-c・原因の仮説・PHASE 2 CLEAR）は P33〜P35 の3つにあたり、1対1に決められない。修正の指定はない範囲のため変更していない（要確認）。',
          '- 内部ID：<映像ID>#<画面の番号>。修正後の番号は、修正後の場面一覧スライドの番号−2（新P）。', '',
          '| 修正前 | 内部ID | 修正内容 | 修正後 | 結果 |', '|---|---|---|---|---|']
    for x in rows:
        md.append(f"| {x['old']} | `{x['id']}` | {x['change']} | {x['new']}{('／追加：' + x['added']) if x['added'] else ''} | {x['result']} |")
    (ROOT / 'docs' / 'web-experience' / '14-page-map.md').write_text('\n'.join(md) + '\n')
    wb = Workbook()
    ws = wb.active
    ws.title = '対応表'
    cols = [('old', '修正前ページ', 16), ('oldSlide', '修正前スライド', 8), ('id', '内部ID', 20), ('serif', '最初のセリフ', 40), ('change', '修正内容', 50), ('new', '修正後ページ', 26), ('added', '追加した画面', 22), ('result', '実施結果', 12)]
    ws.append([c[1] for c in cols])
    for x in rows:
        ws.append([x[k] for k, _, _ in cols])
    for i, (_, _, w) in enumerate(cols, 1):
        ws.column_dimensions[get_column_letter(i)].width = w
        c = ws.cell(row=1, column=i)
        c.font = Font(bold=True, color='FFFFFF')
        c.fill = PatternFill('solid', fgColor='0D0E10')
    for row in ws.iter_rows(min_row=2):
        for c in row:
            c.alignment = Alignment(wrap_text=True, vertical='top')
    ws.freeze_panes = 'A2'
    wb.save(ROOT / 'docs' / 'web-experience' / '14-page-map.xlsx')
    print(f'{len(rows)}画面：修正 {sum(r["result"] == "修正" for r in rows)}・統合 {sum(r["result"] == "統合（削除）" for r in rows)}')


if __name__ == '__main__':
    main()
