# まとめて読んだ音声を文に分ける位置を、モーラ数（読みの長さ）で求め直し、取り込み済みの区切り（文字数で求めたもの）と比べる。
# 2つの方法で区切りが一致すれば、その区切りは信頼できる。一致しない文を一覧にする。
# モーラ数で求めた区切りを audio_import/experience/split.json に書き、取り込み（npm run experience:import-audio）はそれを使う。
#   python3 scripts/web-experience/audio-align.py
import csv, json, re, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def mora_counter():
    import pykakasi
    k = pykakasi.kakasi()
    small = set('ゃゅょぁぃぅぇぉゎ')

    def mora(t):
        n = 0.0
        for p in k.convert(t):
            for ch in p['hira']:
                if 'ぁ' <= ch <= 'ゟ' or ch == 'ー':
                    n += 0 if ch in small else 1
                elif ch.isascii() and ch.isalpha():
                    n += 1.2
                elif ch.isdigit():
                    n += 1.5
        return n

    return mora


def silences(f, d=0.15):
    out = subprocess.run(['ffmpeg', '-i', f, '-af', f'silencedetect=noise=-40dB:d={d}', '-f', 'null', '-'], capture_output=True, text=True).stderr
    st = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', out)]
    en = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', out)]
    tot = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], capture_output=True, text=True).stdout)
    return list(zip(st, en)), tot


def align(f, weights):
    sil, total = silences(f)
    head = sil[0][1] if sil and sil[0][0] < 0.05 else 0
    tail = sil[-1][0] if sil and sil[-1][1] > total - 0.05 else total
    cand = [(a, b) for a, b in sil if a > head + 0.05 and b < tail - 0.05]
    n = len(weights)
    exp = [(tail - head) * w / sum(weights) for w in weights]
    INF = float('inf')
    cost = lambda k, a, b: (b - a - exp[k]) ** 2 / exp[k]
    mid = [(a + b) / 2 for a, b in cand]
    best = [[INF] * len(cand) for _ in range(n - 1)]
    prev = [[-1] * len(cand) for _ in range(n - 1)]
    for k in range(n - 1):
        for j in range(k, len(cand) - (n - 2 - k)):
            bonus = -2 * (cand[j][1] - cand[j][0])
            if k == 0:
                best[k][j] = cost(0, head, mid[j]) + bonus
                continue
            for i in range(k - 1, j):
                if best[k - 1][i] < INF:
                    c = best[k - 1][i] + cost(k, mid[i], mid[j]) + bonus
                    if c < best[k][j]:
                        best[k][j], prev[k][j] = c, i
    j = min(range(len(cand)), key=lambda x: best[n - 2][x] + cost(n - 1, mid[x], tail) if best[n - 2][x] < INF else INF)
    picked = []
    for k in range(n - 2, -1, -1):
        picked.insert(0, j)
        j = prev[k][j]
    gaps = [cand[i] for i in picked]
    # 取り込み（talk-script.ts の split）と同じ余裕の取り方：話し始め・語尾を切らない
    starts = [max(0, head - 0.05)] + [max(a, b - 0.08) for a, b in gaps]
    ends = [min(b, a + 0.12) for a, b in gaps] + [min(total, tail + 0.12)]
    return [(cand.index(g)) for g in gaps], gaps, head, tail, list(zip(starts, ends))


def main():
    rows = list(csv.DictReader(open(ROOT / 'docs/consulting-experience/ondoku/index.tsv'), delimiter='\t'))
    mora = mora_counter()
    groups = {}
    for r in rows:
        groups.setdefault(r['file'], []).append(r)
    report = {}
    split = {}
    diff = 0
    for g, ls in groups.items():
        f = str(ROOT / 'audio_import/experience' / f'{g}.mp3')
        chars = [len(re.sub(r'[「」『』\s]', '', r['speech'])) for r in ls]
        moras = [mora(r['speech']) for r in ls]
        ic, gc, *_ = align(f, chars)
        im, gm, head, tail, ranges = align(f, moras)
        split[g] = [{'start': round(a, 3), 'end': round(b, 3)} for a, b in ranges]
        same = ic == im
        diff += not same
        report[g] = {'same': same, 'byChars': [round((a + b) / 2, 2) for a, b in gc], 'byMora': [round((a + b) / 2, 2) for a, b in gm], 'lines': [r['lineId'] for r in ls]}
        print(g, '一致' if same else '不一致', '' if same else [(ls[k + 1]['lineId'], report[g]['byChars'][k], report[g]['byMora'][k]) for k in range(len(gc)) if gc[k] != gm[k]])
    json.dump(report, open(ROOT / 'out' / 'audio-align.json', 'w'), ensure_ascii=False, indent=1)
    print(f'不一致のファイル {diff} / {len(groups)}')
    # 取り込みはモーラ数で求めた区切りを使う（talk-script.ts import が読む）
    json.dump(split, open(ROOT / 'audio_import' / 'experience' / 'split.json', 'w'), indent=1)


if __name__ == '__main__':
    main()
