"""Generate Royal Chess Online branded assets (splash, icons, favicon)."""
from PIL import Image, ImageDraw, ImageFont, ImageFilter

GOLD = (212, 175, 55, 255)
GOLD_LIGHT = (240, 205, 90, 255)
BG = (11, 14, 20, 255)  # deep obsidian #0b0e14

SERIF = "/usr/share/fonts/truetype/freefont/FreeSerif.ttf"
SANS = "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf"

KNIGHT = "\u265E"  # black chess knight glyph

ASSETS = "/app/frontend/assets/images"


def draw_glow_knight(img, cx, cy, glyph_size, color=GOLD):
    """Draw a knight glyph with a soft gold glow centered at (cx, cy)."""
    font = ImageFont.truetype(SERIF, glyph_size)
    # Glow layer
    glow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    bbox = gd.textbbox((0, 0), KNIGHT, font=font)
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    pos = (cx - w / 2 - bbox[0], cy - h / 2 - bbox[1])
    gd.text(pos, KNIGHT, font=font, fill=(212, 175, 55, 160))
    glow = glow.filter(ImageFilter.GaussianBlur(glyph_size // 14))
    img.alpha_composite(glow)
    # Sharp layer
    d = ImageDraw.Draw(img)
    d.text(pos, KNIGHT, font=font, fill=color)


def text_centered(img, cx, cy, text, size, color, spacing=0, font_path=SANS):
    d = ImageDraw.Draw(img)
    font = ImageFont.truetype(font_path, size)
    if spacing:
        text = spacing.join(list(text))
    bbox = d.textbbox((0, 0), text, font=font)
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text((cx - w / 2 - bbox[0], cy - h / 2 - bbox[1]), text, font=font, fill=color)


# ---------- Splash image (shown by expo-splash-screen, bg #000000) ----------
splash = Image.new("RGBA", (1024, 1024), (0, 0, 0, 255))
draw_glow_knight(splash, 512, 400, 380)
text_centered(splash, 512, 660, "ROYAL CHESS", 86, GOLD)
text_centered(splash, 512, 750, "O N L I N E", 46, (170, 178, 194, 255))
splash.convert("RGB").save(f"{ASSETS}/splash-image.png")

# ---------- App icon 1024x1024 ----------
icon = Image.new("RGBA", (1024, 1024), BG)
d = ImageDraw.Draw(icon)
# subtle vertical gradient
for y in range(1024):
    t = y / 1024
    r = int(11 + 10 * t)
    g = int(14 + 10 * t)
    b = int(20 + 14 * t)
    d.line([(0, y), (1024, y)], fill=(r, g, b, 255))
# thin gold ring
d.ellipse([92, 92, 932, 932], outline=GOLD, width=14)
d.ellipse([116, 116, 908, 908], outline=(212, 175, 55, 90), width=4)
draw_glow_knight(icon, 512, 500, 560, color=GOLD_LIGHT)
icon.convert("RGB").save(f"{ASSETS}/icon.png")
icon.convert("RGB").save(f"{ASSETS}/app-image.png")

# ---------- Adaptive icon (foreground, transparent-safe margins) ----------
adaptive = Image.new("RGBA", (1024, 1024), BG)
d = ImageDraw.Draw(adaptive)
for y in range(1024):
    t = y / 1024
    d.line([(0, y), (1024, y)], fill=(int(11 + 10 * t), int(14 + 10 * t), int(20 + 14 * t), 255))
draw_glow_knight(adaptive, 512, 512, 430, color=GOLD_LIGHT)
adaptive.convert("RGB").save(f"{ASSETS}/adaptive-icon.png")

# ---------- Favicon ----------
fav = Image.new("RGBA", (196, 196), BG)
draw_glow_knight(fav, 98, 98, 140, color=GOLD_LIGHT)
fav.convert("RGB").save(f"{ASSETS}/favicon.png")

print("All branding assets generated.")
