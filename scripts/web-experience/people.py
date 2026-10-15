# 登場人物5名の画像（お客様から受領した一覧画像 assets-src/characters/source-lineup.webp）から、
# 動画・アプリで使う人物画像を切り出す。顔立ち・服装は描き変えない（切り抜き・拡大・色味の軽い統一だけ）。
#   python3 scripts/web-experience/people.py
# 出力：public/experience/people/<id>.jpg（胸から上・636×716）と <id>-face.jpg（顔タグ用・360×360）
from pathlib import Path
from PIL import Image, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'assets-src' / 'characters' / 'source-lineup.webp'
OUT = ROOT / 'public' / 'experience' / 'people'
# 一覧画像の中の写真の位置（左上x）。写真は 318×358（y=108〜466）
CARDS = {'sales': 18, 'mori': 352, 'nakata': 683, 'sato': 1014, 'takahashi': 1346}
# 顔タグの切り抜き（写真の中の、顔が中央に来る正方形：左・上・一辺）
FACE = {'sales': (24, 12, 270), 'mori': (24, 12, 270), 'nakata': (22, 22, 270), 'sato': (24, 8, 270), 'takahashi': (22, 8, 270)}


def finish(im: Image.Image, size: tuple[int, int]) -> Image.Image:
    im = im.resize(size, Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=1.4, percent=60, threshold=2))
    return ImageEnhance.Contrast(im).enhance(1.03)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    src = Image.open(SRC).convert('RGB')
    for pid, x in CARDS.items():
        photo = src.crop((x, 108, x + 318, 466))
        finish(photo, (636, 716)).save(OUT / f'{pid}.jpg', quality=92)
        fx, fy, fs = FACE[pid]
        finish(photo.crop((fx, fy, fx + fs, fy + fs)), (360, 360)).save(OUT / f'{pid}-face.jpg', quality=92)
        print(pid)


if __name__ == '__main__':
    main()
