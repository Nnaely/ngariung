"""Generate ikon PWA Ngariung: glyph api (emoji berwarna) + glow di atas dark bg."""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "icons"
OUT.mkdir(parents=True, exist_ok=True)

FONT = "C:/Windows/Fonts/seguiemj.ttf"
EMOJI = "\U0001F525"  # 🔥
BG = (11, 11, 15, 255)
GLOW = (255, 110, 30)


def render_emoji(canvas: int, target_h: int) -> Image.Image:
    """Render emoji ke kanvas transparan, tinggi ±target_h piksel."""
    layer = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)

    size = 64
    font = ImageFont.truetype(FONT, size)
    bb = draw.textbbox((0, 0), EMOJI, font=font)
    ratio = target_h / max(1, bb[3] - bb[1])
    size = max(16, int(size * ratio))

    font = ImageFont.truetype(FONT, size)
    bb = draw.textbbox((0, 0), EMOJI, font=font)
    w, h = bb[2] - bb[0], bb[3] - bb[1]
    x = (canvas - w) // 2 - bb[0]
    y = (canvas - h) // 2 - bb[1]

    draw.text((x, y), EMOJI, font=font, embedded_color=True)
    return layer


def build(size: int = 512, emoji_ratio: float = 0.62, rounded: bool = True) -> Image.Image:
    canvas = size * 2  # supersample
    base = Image.new("RGBA", (canvas, canvas), BG)

    flame = render_emoji(canvas, int(canvas * emoji_ratio))

    # glow lembut dari alpha api
    alpha = flame.getchannel("A")
    glow_alpha = alpha.filter(ImageFilter.GaussianBlur(canvas // 18)).point(
        lambda v: int(v * 0.5)
    )
    glow = Image.new("RGBA", (canvas, canvas), GLOW + (0,))
    glow.putalpha(glow_alpha)
    base = Image.alpha_composite(base, glow)
    base = Image.alpha_composite(base, flame)

    out = base.resize((size, size), Image.LANCZOS)

    if rounded:
        mask = Image.new("L", (size, size), 0)
        ImageDraw.Draw(mask).rounded_rectangle(
            (0, 0, size - 1, size - 1), radius=int(size * 0.225), fill=255
        )
        out.putalpha(mask)

    return out


def main() -> None:
    icon = build(size=512, emoji_ratio=0.62, rounded=True)
    icon.resize((192, 192), Image.LANCZOS).save(OUT / "icon-192.png")
    icon.save(OUT / "icon-512.png")

    build(size=512, emoji_ratio=0.44, rounded=False).save(OUT / "maskable-512.png")

    apple = build(size=180, emoji_ratio=0.60, rounded=False).convert("RGB")
    apple.save(OUT / "apple-touch-icon.png")

    fav = build(size=64, emoji_ratio=0.66, rounded=True)
    fav.save(ROOT / "app" / "favicon.ico", sizes=[(64, 64), (32, 32), (16, 16)])

    for p in sorted(OUT.glob("*.png")):
        print(f"  {p.name:24s} {p.stat().st_size:>7d} bytes")


if __name__ == "__main__":
    main()
