from pathlib import Path

from PIL import Image

folder = Path(__file__).resolve().parent.parent / "shots"
for f in sorted(folder.glob("*.png")):
    if f.stem.endswith("-crop"):
        continue
    im = Image.open(f)
    w, h = im.size
    left = (w - 440) // 2
    out = f.with_name(f.stem + "-crop.png")
    im.crop((left, 0, left + 440, h)).save(out)
    print(out.name, out.stat().st_size)
