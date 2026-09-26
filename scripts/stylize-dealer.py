#!/usr/bin/env python3
"""
Stilizza una fotografia nella palette del sito per lo sfondo della sezione Metodo.

    python scripts/stylize-dealer.py foto.jpg            # -> public/dealer/dealer.webp
    python scripts/stylize-dealer.py foto.jpg --cutout --mirror   # scontornata e specchiata

Cosa fa, senza ridisegnare nulla (la foto resta identica nella forma):
  1. contrasto locale e luminanza;
  2. contorni (Sobel) tracciati in aqua luminoso sopra la figura;
  3. mappa tonale verde acqua: nero vuoto #03070A -> #063730 -> #3FE9CC -> #DFFFF8;
  4. scontorno del soggetto (--cutout via rembg, oppure un PNG già scontornato):
     lo sfondo della foto sparisce, la sagoma riceve un contorno luminoso e si
     dissolve verso il basso, così la figura emerge dal fondo del sito.

Usa SOLO immagini di cui hai i diritti (tua foto, licenza stock, ecc.).
Dipendenze: pip install pillow numpy  (+ "rembg[cpu]" per --cutout)
"""
import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter, ImageOps

STOPS = [  # luminanza -> colore (palette ART-DIRECTION §1)
    (0.00, (3, 7, 10)),
    (0.30, (6, 55, 48)),
    (0.62, (15, 168, 143)),
    (0.84, (63, 233, 204)),
    (1.00, (223, 255, 248)),
]


def ramp(lum: np.ndarray) -> np.ndarray:
    out = np.zeros(lum.shape + (3,), np.float32)
    xs = [s[0] for s in STOPS]
    for c in range(3):
        out[..., c] = np.interp(lum, xs, [s[1][c] for s in STOPS])
    return out


def sobel(g: np.ndarray) -> np.ndarray:
    p = np.pad(g, 1, mode="edge")
    gx = (p[:-2, 2:] + 2 * p[1:-1, 2:] + p[2:, 2:]) - (p[:-2, :-2] + 2 * p[1:-1, :-2] + p[2:, :-2])
    gy = (p[2:, :-2] + 2 * p[2:, 1:-1] + p[2:, 2:]) - (p[:-2, :-2] + 2 * p[:-2, 1:-1] + p[:-2, 2:])
    m = np.hypot(gx, gy)
    return m / (np.percentile(m, 99.5) + 1e-6)


def cutout(im: Image.Image) -> Image.Image:
    """Scontorno automatico del soggetto (rembg, opzionale)."""
    from rembg import new_session, remove  # pip install "rembg[cpu]"
    return remove(im, session=new_session("isnet-general-use"))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("src", help="foto (RGB) o PNG già scontornato (RGBA)")
    ap.add_argument("--out", default=str(Path(__file__).resolve().parent.parent / "public/dealer/dealer.webp"))
    ap.add_argument("--mirror", action="store_true", help="specchia (mano verso destra)")
    ap.add_argument("--cutout", action="store_true", help="scontorna il soggetto con rembg")
    ap.add_argument("--height", type=int, default=1200)
    ap.add_argument("--edges", type=float, default=0.6, help="intensità dei contorni interni 0..1")
    ap.add_argument("--rim", type=float, default=0.9, help="intensità del contorno della sagoma 0..1")
    ap.add_argument("--floor", type=float, default=0.16, help="tono minimo dentro la sagoma")
    ap.add_argument("--gamma", type=float, default=0.85)
    ap.add_argument("--mode", choices=["outline", "tone"], default="outline",
                    help="outline: solo contorni su vetro scuro traslucido; tone: foto rimappata")
    ap.add_argument("--fill", type=float, default=0.42, help="opacità del vetro scuro dentro la sagoma (outline)")
    a = ap.parse_args()

    src = Image.open(a.src)
    if a.cutout:
        src = cutout(src.convert("RGB"))
    src = src.convert("RGBA")
    if a.mirror:
        src = ImageOps.mirror(src)
    w = round(src.width * a.height / src.height)
    src = src.resize((w, a.height), Image.LANCZOS)

    mask = np.asarray(src.getchannel("A"), np.float32) / 255.0
    gray = np.asarray(ImageOps.grayscale(src.convert("RGB")), np.float32) / 255.0

    # contrasto normalizzato SOLO sul soggetto: lo sfondo non sposta i livelli
    inside = gray[mask > 0.5] if (mask > 0.5).any() else gray.ravel()
    lo, hi = np.percentile(inside, 1), np.percentile(inside, 99.5)
    lum = np.clip((gray - lo) / max(hi - lo, 1e-6), 0, 1) ** a.gamma

    soft = np.asarray(Image.fromarray((lum * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.0)), np.float32) / 255.0
    edges = np.clip(sobel(soft), 0, 1) ** 1.3 * mask
    try:
        # Con OpenCV: contrasto locale (CLAHE) prima dei contorni, così anche le
        # zone scure — volto in ombra, capelli, jabot — danno linee, e Canny le
        # rende sottili come un ricalco a penna.
        import cv2
        g8 = (gray * 255).astype(np.uint8)
        eq = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8)).apply(g8)
        eq = cv2.bilateralFilter(eq, 7, 40, 7)
        can = cv2.Canny(eq, 55, 135).astype(np.float32) / 255.0
        can = cv2.GaussianBlur(can, (3, 3), 0.7)
        can = np.clip(can * 1.8, 0, 1)
        edges = np.clip(np.maximum(edges * 0.6, can * 0.85), 0, 1) * mask
    except ImportError:
        pass

    msoft = np.asarray(Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.6)), np.float32) / 255.0
    rim = np.clip(sobel(msoft) * 1.6, 0, 1)

    h, wd = lum.shape
    yy = np.mgrid[0:h, 0:wd][0].astype(np.float32)
    fade = np.clip((h - yy) / (h * 0.28), 0, 1)  # si dissolve verso il fondo

    if a.mode == "outline":
        # Disegno ricalcato: niente pelle né tessuti. Dentro la sagoma solo il
        # "nerino" traslucido del sito (vetro scuro con dominante aqua); sopra,
        # le linee dei contorni in aqua luminoso.
        line = np.clip(edges * a.edges * 1.6, 0, 1)
        line = np.where(line < 0.12, 0, line) ** 0.8          # via il rumore di texture
        line = np.clip(np.maximum(line, rim * a.rim), 0, 1)
        glass = np.array([8, 22, 26], np.float32)              # #081619 ~ raised + aqua
        col = ramp(0.55 + 0.45 * line)
        rgb = glass * (1 - line[..., None]) + col * line[..., None]
        alpha = np.clip(mask * a.fill + line * 0.95, 0, 1) * fade
        lines_only = np.dstack([col, np.clip(line, 0, 1) * fade * 255]).astype(np.uint8)
    else:
        lines_only = None
        tone = np.clip(a.floor + lum * (1 - a.floor) * 0.92 + edges * a.edges + rim * a.rim, 0, 1)
        rgb = ramp(tone)
        alpha = np.clip(np.maximum(mask, rim) * (0.55 + 0.45 * tone), 0, 1) * fade

    out = np.dstack([rgb, alpha * 255]).astype(np.uint8)
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    res = Image.fromarray(out, "RGBA")
    bbox = res.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
    if bbox:  # rifilato sulla sagoma: niente margini vuoti da posizionare
        res = res.crop(bbox)
        wd, h = res.size
    res.save(a.out, "WEBP", quality=88, method=6)
    if lines_only is not None:
        # solo le linee: il sito ci costruisce sopra alone sfocato e scintille
        ln = Image.fromarray(lines_only, "RGBA")
        if bbox:
            ln = ln.crop(bbox)
        lines_out = str(Path(a.out).with_name(Path(a.out).stem + "-lines.webp"))
        ln.save(lines_out, "WEBP", quality=85, method=6)
        print(f"ok -> {lines_out}")
    print(f"ok -> {a.out} ({wd}x{h})")


if __name__ == "__main__":
    main()
