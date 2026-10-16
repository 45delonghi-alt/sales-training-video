# 導入動画の文と文の間に、決まった秒数の「間」を足した版を作る（2026-10-16 指示：1.3秒）。
#   python3 scripts/program60/intro-pauses.py [秒数=1.3] [入力] [出力]
# 切れ目は scripts/program60/intro-pauses.json（58か所）。切れ目の真ん中（フレーム境界にそろえる）で、
#   映像：その画面を止めたまま秒数ぶん延ばす
#   音声：導入動画は BGM がずっと流れているので、無音にはしない。切れ目の区間（ナレーションのない BGM だけの部分）を
#         短いクロスフェードでつなぎ返して秒数ぶん延ばし、BGM が途切れないようにする
import json, subprocess, sys, tempfile
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
GAP = float(sys.argv[1]) if len(sys.argv) > 1 else 1.3
SRC = Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / 'public/consulting/video/intro-fixed.mp4'
OUT = Path(sys.argv[3]) if len(sys.argv) > 3 else ROOT / f'out/intro-pauses/intro-fixed_pause{GAP}s.mp4'
FPS, SR = 30, 48000
XF = int(0.02 * SR)  # クロスフェード 20ms

cuts = json.loads((Path(__file__).with_name('intro-pauses.json')).read_text())['cuts']
OUT.parent.mkdir(parents=True, exist_ok=True)

# 音声（48kHz・ステレオ）
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(SRC), '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
a = np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()

def fade(n):
    t = np.linspace(0, np.pi / 2, n)[:, None]
    return np.cos(t), np.sin(t)  # 等パワー

def join(x, y):
    fo, fi = fade(XF)
    return np.concatenate([x[:-XF], x[-XF:] * fo + y[:XF] * fi, y[XF:]])

points = []  # 切る位置（秒・フレーム境界）
pieces = []
prev = 0
for c in cuts:
    m = round((c['start'] + c['end']) / 2 * FPS) / FPS
    points.append(m)
    lo, hi = int((c['start'] + 0.03) * SR), int((c['end'] - 0.03) * SR)
    region = a[lo:hi]
    # 長さを正確に GAP 秒ふやす：A＝切れ目＋XF まで、つなぎ＝GAP＋XF、B＝切れ目から（つなぎ目ごとに XF 重ねる）
    need = int(round(GAP * SR)) + XF
    fill = region
    while len(fill) < need:
        fill = join(fill, region)
    fill = fill[:need]
    mi = int(round(m * SR))
    pieces.append(a[prev:mi + XF])
    pieces.append(fill)
    prev = mi
pieces.append(a[prev:])
audio = pieces[0]
for p in pieces[1:]:
    audio = join(audio, p)

tmp = Path(tempfile.mkdtemp())
(tmp / 'a.raw').write_bytes(audio.astype(np.float32).tobytes())

# 映像：1回の書き出しで、切れ目の直前のフレームを GAP 秒ぶん（GAP×30 フレーム）くり返す（loop フィルタを順に重ねる）
REP = int(round(GAP * FPS))
loops = [f'loop=loop={REP}:size=1:start={int(round(p * FPS)) - 1 + REP * k}' for k, p in enumerate(points)]
(tmp / 'vf.txt').write_text(','.join(loops) + ',setpts=N/(' + str(FPS) + '*TB)')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(SRC), '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-i', str(tmp / 'a.raw'),
                '-filter_script:v', str(tmp / 'vf.txt'), '-map', '0:v', '-map', '1:a', '-r', str(FPS),
                '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', str(OUT)], check=True)

# 元の時刻 → 新しい時刻（体験アプリの止める位置などの換算用）
def shift(t):
    return t + GAP * sum(1 for p in points if p <= t)
info = {'gap': GAP, 'cuts': len(points), 'source': str(SRC.relative_to(ROOT)) if SRC.is_relative_to(ROOT) else str(SRC),
        'points': points, 'stops_old': [54.9, 83.8, 212.8], 'stops_new': [round(shift(t), 2) for t in (54.9, 83.8, 212.8)]}
OUT.with_suffix('.json').write_text(json.dumps(info, ensure_ascii=False, indent=1))
dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(OUT)], capture_output=True, text=True).stdout)
print(f'{OUT}：{len(points)}か所に{GAP}秒・長さ {dur:.2f}秒（元 {len(a) / SR:.2f}秒）・止める位置 {info["stops_old"]} → {info["stops_new"]}')
