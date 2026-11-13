from PIL import Image, ImageDraw
import os

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "icons")
os.makedirs(OUT, exist_ok=True)

BG = (15, 21, 18, 255)        # deep ink
SURFACE = (24, 33, 29, 255)
MINT = (95, 211, 166, 255)
CORAL = (255, 122, 102, 255)
CREAM = (239, 234, 224, 255)
LINE = (239, 234, 224, 60)


def draw_mark(size, maskable=False):
    S = 4
    W = size * S
    img = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    if maskable:
        d.rectangle([0, 0, W, W], fill=BG)
    else:
        r = int(W * 0.22)
        d.rounded_rectangle([0, 0, W, W], radius=r, fill=BG)

    cx = cy = W / 2.0
    R = W * 0.292
    stroke = max(2, int(W * 0.066))

    d.ellipse([cx - R, cy - R, cx + R, cy + R], outline=LINE, width=stroke)

    bbox = [cx - R, cy - R, cx + R, cy + R]
    d.arc(bbox, start=-90, end=45, fill=MINT, width=stroke)
    d.arc(bbox, start=150, end=255, fill=CORAL, width=stroke)

    r2 = W * 0.113
    d.ellipse([cx - r2, cy - r2, cx + r2, cy + r2], fill=CREAM)

    tw = W * 0.078
    th = W * 0.235
    d.rounded_rectangle(
        [cx - tw / 2, cy - th / 2, cx + tw / 2, cy + th / 2],
        radius=max(1, int(tw * 0.3)),
        fill=BG,
    )

    return img.resize((size, size), Image.LANCZOS)


def main():
    draw_mark(192).save(os.path.join(OUT, "icon-192.png"))
    draw_mark(512).save(os.path.join(OUT, "icon-512.png"))
    draw_mark(512, maskable=True).save(os.path.join(OUT, "icon-maskable-512.png"))
    draw_mark(180, maskable=True).save(os.path.join(OUT, "apple-touch-icon.png"))
    for name in ["icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png"]:
        p = os.path.join(OUT, name)
        print(name, Image.open(p).size, os.path.getsize(p))


if __name__ == "__main__":
    main()
