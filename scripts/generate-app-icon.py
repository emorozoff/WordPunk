#!/usr/bin/env python3
"""
Generate WordPunk app icon (1024x1024) and splash (2732x2732) for Capacitor Assets.

Style: dark cyberpunk background with neon-green letter W and underscore cursor.
Output: resources/icon-only.png, resources/splash.png, resources/splash-dark.png
"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'resources')
os.makedirs(OUT, exist_ok=True)

BG = (13, 13, 13)        # #0d0d0d
ACCENT = (0, 255, 136)   # #00ff88
DIM = (0, 180, 95)       # darker green for shadow

FONT_CANDIDATES = [
    '/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf',
    '/System/Library/Fonts/Menlo.ttc',
    '/usr/share/fonts/truetype/freefont/FreeMonoBold.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf',
]

def find_font(size):
    for path in FONT_CANDIDATES:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def make_icon(size=1024, save_path=None):
    img = Image.new('RGB', (size, size), BG)
    draw = ImageDraw.Draw(img)

    # subtle vignette / inner shadow ring
    ring = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    rdraw = ImageDraw.Draw(ring)
    margin = int(size * 0.06)
    rdraw.rectangle([margin, margin, size - margin, size - margin],
                    outline=(0, 255, 136, 38), width=int(size * 0.012))
    ring = ring.filter(ImageFilter.GaussianBlur(radius=size * 0.008))
    img.paste(ring, (0, 0), ring)

    # main "W_" text
    text = 'W_'
    font_size = int(size * 0.62)
    font = find_font(font_size)
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = (size - tw) / 2 - bbox[0]
    ty = (size - th) / 2 - bbox[1] - int(size * 0.02)

    # neon glow (multiple blurred layers)
    glow = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    gdraw.text((tx, ty), text, font=font, fill=(0, 255, 136, 200))
    glow_blurred = glow.filter(ImageFilter.GaussianBlur(radius=size * 0.025))
    img.paste(glow_blurred, (0, 0), glow_blurred)

    glow2 = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    g2draw = ImageDraw.Draw(glow2)
    g2draw.text((tx, ty), text, font=font, fill=(0, 255, 136, 255))
    glow2_blurred = glow2.filter(ImageFilter.GaussianBlur(radius=size * 0.008))
    img.paste(glow2_blurred, (0, 0), glow2_blurred)

    # crisp top text
    draw.text((tx, ty), text, font=font, fill=ACCENT)

    if save_path:
        img.save(save_path, 'PNG', optimize=True)
    return img


def make_splash(size=2732, save_path=None):
    img = Image.new('RGB', (size, size), BG)
    draw = ImageDraw.Draw(img)

    # main "WordPunk_" text
    text = 'WordPunk_'
    # smaller font so the wordmark fits comfortably
    font_size = int(size * 0.075)
    font = find_font(font_size)
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = (size - tw) / 2 - bbox[0]
    ty = (size - th) / 2 - bbox[1]

    # glow
    glow = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    gdraw.text((tx, ty), text, font=font, fill=(0, 255, 136, 180))
    glow_blurred = glow.filter(ImageFilter.GaussianBlur(radius=size * 0.012))
    img.paste(glow_blurred, (0, 0), glow_blurred)

    draw.text((tx, ty), text, font=font, fill=ACCENT)

    if save_path:
        img.save(save_path, 'PNG', optimize=True)
    return img


if __name__ == '__main__':
    icon_path = os.path.join(OUT, 'icon-only.png')
    icon_bg_path = os.path.join(OUT, 'icon-background.png')
    icon_fg_path = os.path.join(OUT, 'icon-foreground.png')
    splash_path = os.path.join(OUT, 'splash.png')
    splash_dark_path = os.path.join(OUT, 'splash-dark.png')

    make_icon(1024, icon_path)
    print(f'wrote {icon_path}')

    # Adaptive icon (Android-style, also works for iOS as a backup)
    bg = Image.new('RGB', (1024, 1024), BG)
    bg.save(icon_bg_path, 'PNG', optimize=True)
    print(f'wrote {icon_bg_path}')

    make_splash(2732, splash_path)
    print(f'wrote {splash_path}')
    make_splash(2732, splash_dark_path)
    print(f'wrote {splash_dark_path}')
