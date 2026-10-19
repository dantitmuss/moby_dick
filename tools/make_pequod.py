"""Make the Pequod from the prototype's generic whaler (static/images/sprites/ship.png).

Run from the repo root:  python tools/make_pequod.py   ->  static/images/sprites/pequod.png
What changes, after Chapter 16, The Ship:
  - bulwarks garnished with sperm-whale teeth (ivory pegs along the rail)
  - two whaleboats hung outboard from davits
  - an old hull, weather-stained and darkened
  - sun-worn, yellowed canvas
"""
import random
from PIL import Image

SRC = "static/images/sprites/ship.png"
OUT = "static/images/sprites/pequod.png"

IVORY, IVORY_D = (239, 230, 207, 255), (196, 186, 160, 255)
OUTLINE, DAVIT = (7, 9, 15, 255), (43, 29, 18, 255)
BOAT, BOAT_D = (214, 205, 182, 255), (150, 140, 118, 255)
REMAP = {  # old colour -> weathered colour
    (221, 212, 189): (214, 202, 170),   # sail light, yellowed
    (179, 170, 148): (168, 156, 128),   # sail shade
    (51, 35, 26):    (44, 31, 24),      # hull, darker
    (74, 50, 32):    (66, 46, 31),
}

im = Image.open(SRC).convert("RGBA")
px = im.load()
W, H = im.size

for y in range(H):
    for x in range(W):
        p = px[x, y]
        if p[3] and p[:3] in REMAP:
            px[x, y] = REMAP[p[:3]] + (255,)

# weather stains on the hull planking
rnd = random.Random(1851)
for _ in range(28):
    x, y = rnd.randint(8, 66), rnd.randint(44, 51)
    if px[x, y][:3] == (44, 31, 24):
        px[x, y] = (56, 42, 32, 255)

# a jaw of teeth along the rail (row 40), points sticking up into row 39
for x in range(18, 64, 2):
    px[x, 40] = IVORY
    if px[x, 39][3] == 0 or px[x, 39][:3] in ((7, 9, 15), (43, 29, 18)):
        px[x, 39] = IVORY_D

# whaleboats hung outboard on davits, over the hull's side
def whaleboat(x0, y0, w):
    for x in range(x0, x0 + w):
        px[x, y0] = OUTLINE
        px[x, y0 + 1] = BOAT if x0 < x < x0 + w - 1 else OUTLINE
    for x in range(x0 + 1, x0 + w - 1):
        px[x, y0 + 2] = BOAT_D if x0 + 1 < x < x0 + w - 2 else OUTLINE
    for x in range(x0 + 2, x0 + w - 2):
        px[x, y0 + 3] = OUTLINE
    # davit arms, curving up to the rail
    for dx in (1, w - 2):
        px[x0 + dx, y0 - 1] = DAVIT
        px[x0 + dx, y0 - 2] = DAVIT

whaleboat(25, 38, 10)
whaleboat(45, 38, 10)

im.save(OUT)
print("wrote", OUT, im.size)
