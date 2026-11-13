"""Buy Me a Coffee 封面圖 — 以 App 設計語言繪製（深墨綠＋薄荷綠）"""
from PIL import Image, ImageDraw, ImageFilter
import math, random, os

W, H = 2304, 768
S = 2
BG = (15, 21, 18)
MINT = (95, 211, 166)
CREAM = (239, 234, 224)
CORAL = (255, 122, 102)

img = Image.new("RGBA", (W * S, H * S), BG + (255,))
d = ImageDraw.Draw(img, "RGBA")


def sc(v):
    return int(v * S)


def ring(cx, cy, r_out, r_in, start, end, color, alpha=255):
    """annulus arc via pieslice difference"""
    bbox_o = [sc(cx - r_out), sc(cy - r_out), sc(cx + r_out), sc(cy + r_out)]
    bbox_i = [sc(cx - r_in), sc(cy - r_in), sc(cx + r_in), sc(cy + r_in)]
    d.pieslice(bbox_o, start, end, fill=color + (alpha,))
    d.ellipse(bbox_i, fill=BG + (255,))


def rrect(x, y, w, h, r, color, alpha=255):
    d.rounded_rectangle([sc(x), sc(y), sc(x + w), sc(y + h)], radius=sc(r), fill=color + (alpha,))


def dot(cx, cy, r, color, alpha=255):
    d.ellipse([sc(cx - r), sc(cy - r), sc(cx + r), sc(cy + r)], fill=color + (alpha,))


def line(pts, width, color, alpha=255):
    flat = []
    for p in pts:
        flat.extend([sc(p[0]), sc(p[1])])
    d.line(flat, fill=color + (alpha,), width=sc(width), joint="curve")
    for p in pts:
        dot(p[0], p[1], width / 2, color, alpha)


# ── 底部微光（右側） ─────────────────────────────
glow = Image.new("RGBA", img.size, (0, 0, 0, 0))
gd = ImageDraw.Draw(glow)
gd.ellipse([sc(1200), sc(200), sc(2400), sc(900)], fill=MINT + (26,))
glow = glow.filter(ImageFilter.GaussianBlur(sc(120)))
img.alpha_composite(glow)

# ── 趨勢線（先畫，從甜甜圈後方穿過） ─────────────
line([(760, 650), (1050, 560), (1280, 595), (1560, 420), (1830, 295), (2060, 235)], 10, MINT, 210)

# ── 主體甜甜圈（消費羅盤） ───────────────────────
cx, cy = 1520, 380
ring(cx, cy, 250, 168, 0, 360, (30, 42, 36))          # 底盤
ring(cx, cy, 250, 168, -90, 150, MINT, 255)           # 主弧
ring(cx, cy, 250, 168, 158, 210, CREAM, 46)           # 淡弧
dot(2060, 235, 13, CORAL, 220)                        # 趨勢線端點

# ── 外圈刻度 ─────────────────────────────────────
for i in range(24):
    a = math.radians(i * 15 - 90)
    r1, r2 = (268, 288) if i % 3 == 0 else (272, 288)
    d.line(
        [sc(cx + r1 * math.cos(a)), sc(cy + r1 * math.sin(a)),
         sc(cx + r2 * math.cos(a)), sc(cy + r2 * math.sin(a))],
        fill=CREAM + (60,), width=sc(3),
    )

# ── 上升柱狀（避開邊界） ─────────────────────────
base_y = 640
heights = [70, 120, 175, 235, 300]
for i, hgt in enumerate(heights):
    x = 1950 + i * 72
    alpha = 90 + i * 40
    rrect(x, base_y - hgt, 52, hgt, 16, MINT, min(255, alpha))

# ── 細節：小圓環 / 點 ────────────────────────────
ring(2210, 150, 42, 30, 0, 360, CREAM, 70)
dot(860, 300, 10, CREAM, 90)
ring(1060, 220, 26, 19, 0, 360, MINT, 120)

# ── 紙紋 ─────────────────────────────────────────
noise = Image.new("RGBA", (W, H), (0, 0, 0, 0))
nd = ImageDraw.Draw(noise)
random.seed(7)
for _ in range(2600):
    x, y = random.randint(0, W - 1), random.randint(0, H - 1)
    v = random.randint(0, 18)
    nd.point((x, y), fill=(255, 255, 255, v))
noise = noise.resize((W * S, H * S), Image.NEAREST)
img.alpha_composite(noise)

img = img.convert("RGB").resize((W, H), Image.LANCZOS)
out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "bmc-cover.png")
os.makedirs(os.path.dirname(out), exist_ok=True)
img.save(out)
print(out, img.size, os.path.getsize(out))
