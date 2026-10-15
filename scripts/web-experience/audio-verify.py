# 取り込んだ音声（文ごと）が台本の文と合っているかを、話す速さ（1秒あたりのモーラ数）で確かめる。
# 音声認識が使えない環境のための確認。区切りがずれると、隣り合う2文の速さが逆方向に大きく外れる。
#   python3 scripts/web-experience/audio-verify.py
import csv, json, re, statistics, sys
from pathlib import Path
import pykakasi

ROOT = Path(__file__).resolve().parents[2]
rows = list(csv.DictReader(open(ROOT / 'docs/consulting-experience/ondoku/index.tsv'), delimiter='\t'))
timing = json.load(open(ROOT / 'src/experience/data/audioTiming.json'))
kks = pykakasi.kakasi()
SMALL = set('ゃゅょぁぃぅぇぉゎ')


def mora(text: str) -> float:
    n = 0.0
    for part in kks.convert(text):
        for ch in part['hira']:
            if 'ぁ' <= ch <= 'ゟ' or ch == 'ー':
                n += 0 if ch in SMALL else 1
            elif ch.isascii() and ch.isalpha():
                n += 1.2
            elif ch.isdigit():
                n += 1.5
    return n


out = []
by_sp: dict[str, list[float]] = {}
for r in rows:
    d = timing.get(r['lineId'])
    m = mora(r['speech'])
    rate = m / d if d else 0
    out.append({**r, 'mora': m, 'sec': d, 'rate': rate})
    by_sp.setdefault(r['file'], []).append(rate)
bad = 0
for r in out:
    med = statistics.median(by_sp[r['file']])
    dev = r['rate'] / med - 1
    r['dev'] = dev
    flag = abs(dev) > 0.22
    bad += flag
    if flag or '-v' in sys.argv:
        print(f"{'!!' if flag else '  '} {r['file']:14} {r['lineId']:16} {r['sec']:5.2f}s mora {r['mora']:5.1f} rate {r['rate']:4.1f} ({dev:+.0%}) {r['text'][:30]}")
print(f'外れ値 {bad} / {len(out)} 文')
json.dump([{k: r[k] for k in ('file', 'lineId', 'speaker', 'text', 'mora', 'sec', 'rate', 'dev')} for r in out], open(ROOT / 'out' / 'audio-verify.json', 'w'), ensure_ascii=False, indent=1)
