# 顔タグ（ワイプ）の画像：お客様から受領した5名のバッジ画像（assets-src/characters/source-badges-v2.webp・黒背景）を、
# 1人ずつ背景透過の PNG に切り分ける。絵柄は変えない。
#   python3 scripts/web-experience/badges.py
# 黒い背景を外側から塗りつぶして背景を求め、隣のバッジと接しているところは、円（顔）と名前の帯の形で切り分ける。
# 出力：public/experience/people/<id>-badge.png（背景透過）
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'assets-src' / 'characters' / 'source-badges-v2.webp'
OUT = ROOT / 'public' / 'experience' / 'people'
# 左から：あなた・森・中田・佐藤・高橋。バッジの左右の端（隣と接するところ）
EDGES = [8, 344, 671, 994, 1321, 1657]
IDS = ['sales', 'mori', 'nakata', 'sato', 'takahashi']
TOP, BOTTOM = 244, 698  # 円の上端・名前の帯の下端
BOX_TOP, BOX_HALF = 538, 160  # 名前の帯（役割＋名前）の上端・半分の幅


def main() -> None:
    rgb = Image.open(SRC).convert('RGB')
    w, h = rgb.size
    a = np.array(rgb).astype(int)
    # 黒い背景（外側から続く暗いところ）
    dark = Image.fromarray(np.where(a.max(axis=2) < 40, 255, 0).astype(np.uint8))
    ImageDraw.floodfill(dark, (0, 0), 128)
    bg = np.array(dark) == 128
    for i, pid in enumerate(IDS):
        x0, x1 = EDGES[i], EDGES[i + 1]
        cx = (x0 + x1) / 2
        r = (x1 - x0) / 2
        cy = TOP + r
        geom = Image.new('L', (w, h), 0)
        d = ImageDraw.Draw(geom)
        d.ellipse((cx - r - 2, cy - r - 2, cx + r + 2, cy + r + 2), fill=255)
        d.rounded_rectangle((cx - BOX_HALF, BOX_TOP, cx + BOX_HALF, BOTTOM), radius=26, fill=255)
        alpha = np.where(bg, 0, np.array(geom)).astype(np.uint8)
        alpha = np.array(Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(0.8)))
        out = np.dstack([a.astype(np.uint8), alpha])
        crop = out[TOP - 4 : BOTTOM + 4, max(0, int(cx - r) - 4) : min(w, int(cx + r) + 5)]
        Image.fromarray(crop, 'RGBA').save(OUT / f'{pid}-badge.png')
        print(pid, crop.shape[1], crop.shape[0])


if __name__ == '__main__':
    main()
