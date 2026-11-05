"""Nettoie et optimise la photo de la page d'accueil.

Usage : python3 scripts/preparer-photo.py <photo-source> [public/img/mobilisation.jpg]
- recadre légèrement les bords (bandes, coins abîmés), au format paysage 16:9 ;
- corrige l'exposition (contraste automatique doux), réduit le bruit, accentue légèrement la netteté ;
- redimensionne à 1920 px de large, enregistre en JPEG progressif ;
- supprime toutes les métadonnées (EXIF, GPS, appareil).
"""
import sys
from PIL import Image, ImageFilter, ImageOps, ImageEnhance

src = sys.argv[1]
dst = sys.argv[2] if len(sys.argv) > 2 else 'public/img/mobilisation.jpg'
img = ImageOps.exif_transpose(Image.open(src)).convert('RGB')
w, h = img.size
m = int(min(w, h) * 0.02)                       # 2 % de marge retirée sur chaque bord
img = img.crop((m, m, w - m, h - m))
w, h = img.size
cible = 16 / 9
if w / h > cible:                              # trop large : on recadre au centre
    nw = int(h * cible); img = img.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
else:                                          # trop haut : on garde le haut (visages)
    nh = int(w / cible); top = int((h - nh) * 0.3); img = img.crop((0, top, w, top + nh))
img = img.filter(ImageFilter.MedianFilter(3)) if min(img.size) < 900 else img
img = ImageOps.autocontrast(img, cutoff=1)
img = ImageEnhance.Color(img).enhance(1.05)
if img.width > 1920:
    img = img.resize((1920, round(1920 * img.height / img.width)), Image.LANCZOS)
img = img.filter(ImageFilter.UnsharpMask(radius=1.2, percent=60, threshold=3))
img.save(dst, 'JPEG', quality=82, optimize=True, progressive=True)   # aucun EXIF n'est recopié
print(f'{dst} : {img.width}×{img.height}')
