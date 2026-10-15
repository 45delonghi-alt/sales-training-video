# 顔タグ（ワイプ）の画像：お客様から受領した5名の丸いバッジ画像（assets-src/characters/source-badges.webp・背景透過）を1人ずつに切り分ける。
# 隣のバッジと縁が接しているので、円（中心・半径）と名前の帯の範囲で切り抜く。絵柄は変えない。
#   python3 scripts/web-experience/badges.py
# 出力：public/experience/people/<id>-badge.png（背景透過）
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'assets-src' / 'characters' / 'source-badges.webp'
OUT = ROOT / 'public' / 'experience' / 'people'
# 左から：あなた・森・中田・佐藤・高橋。バッジの左右の端（隣と接するところ）
EDGES = [26, 354, 676, 995, 1316, 1645]
IDS = ['sales', 'mori', 'nakata', 'sato', 'takahashi']
TOP, BOTTOM = 291, 656  # 円の上端・名前の帯の下端
PILL_TOP, PILL_HALF = 578, 136


def main() -> None:
    im = np.array(Image.open(SRC).convert('RGBA'))
    h, w = im.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    for i, pid in enumerate(IDS):
        cx = (EDGES[i] + EDGES[i + 1]) / 2
        r = (EDGES[i + 1] - EDGES[i]) / 2
        cy = TOP + r
        circle = (xx - cx) ** 2 + (yy - cy) ** 2 <= (r + 0.5) ** 2
        pill = (abs(xx - cx) <= PILL_HALF) & (yy >= PILL_TOP) & (yy <= BOTTOM)
        out = im.copy()
        out[..., 3] = np.where(circle | pill, out[..., 3], 0)
        x0, x1 = int(cx - r) - 2, int(cx + r) + 3
        Image.fromarray(out[TOP - 2 : BOTTOM + 2, max(0, x0) : min(w, x1)]).save(OUT / f'{pid}-badge.png')
        print(pid, round(cx), round(r))


if __name__ == '__main__':
    main()
