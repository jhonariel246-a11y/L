#!/usr/bin/env python3
"""
Planta de Cimentacion RECTANGULAR (plano tradicional).

Genera una sola geometria y la escribe en dos formatos:
  - planos/planta-cimentacion.dxf   (CAD real, abrible en AutoCAD -> .dwg)
  - planos/planta-cimentacion.svg   (vista previa)

Elementos (segun especificaciones del arquitecto):
  - Ejes ortogonales (1-2-3 / A-B-C) con burbujas
  - Columnas          0.30 x 0.30 m
  - Plintos           1.00 x 1.00 m
  - Riostras          e = 0.20 m  (malla, entre caras de plinto)
  - Marco + membrete
"""
import math

# --------------------------------------------------------------------------
# PARAMETROS  (metros)
# --------------------------------------------------------------------------
EJES_X = {"1": 0.00, "2": 4.00, "3": 8.00}     # ejes verticales
EJES_Y = {"A": 0.00, "B": 3.50, "C": 7.00}     # ejes horizontales (A abajo)

COL     = 0.30        # lado de columna
PLINTO  = 1.00        # lado de plinto
RIOSTRA = 0.20        # espesor de riostra
EXT     = 1.00        # extension de ejes fuera del edificio (burbujas)

# --------------------------------------------------------------------------
# Primitivas  (coordenadas CAD: Y hacia arriba, unidades = m)
# --------------------------------------------------------------------------
prims = []

def line(lay, x1, y1, x2, y2):   prims.append(('line', lay, x1, y1, x2, y2))
def circle(lay, cx, cy, r):      prims.append(('circle', lay, cx, cy, r))
def poly(lay, pts):              prims.append(('poly', lay, pts))
def text(lay, x, y, h, s, rot=0, anchor='start'):
    prims.append(('text', lay, x, y, h, s, rot, anchor))

def rect_c(cx, cy, hx, hy):
    return [(cx-hx, cy-hy), (cx+hx, cy-hy), (cx+hx, cy+hy), (cx-hx, cy+hy)]

def riostra_rect(ax, ay, bx, by, trim_a, trim_b):
    dx, dy = bx-ax, by-ay
    L = math.hypot(dx, dy)
    ux, uy = dx/L, dy/L
    nx, ny = -uy, ux
    sx, sy = ax + ux*trim_a, ay + uy*trim_a
    ex, ey = bx - ux*trim_b, by - uy*trim_b
    w = RIOSTRA/2.0
    return [(sx+nx*w, sy+ny*w), (ex+nx*w, ey+ny*w),
            (ex-nx*w, ey-ny*w), (sx-nx*w, sy-ny*w)]

xs = list(EJES_X.values()); ys = list(EJES_Y.values())
xmin, xmax = min(xs), max(xs)
ymin, ymax = min(ys), max(ys)

# --------------------------------------------------------------------------
# 1) EJES + burbujas
# --------------------------------------------------------------------------
def burbuja(cx, cy, txt):
    circle('EJES', cx, cy, 0.28)
    text('EJES', cx, cy-0.09, 0.22, txt, 0, 'middle')

for n, x in EJES_X.items():                          # ejes verticales
    line('EJES', x, ymin-EXT, x, ymax+EXT)
    burbuja(x, ymin-EXT-0.30, n)
for n, y in EJES_Y.items():                          # ejes horizontales
    line('EJES', xmin-EXT, y, xmax+EXT, y)
    burbuja(xmin-EXT-0.30, y, n)

# --------------------------------------------------------------------------
# 2) RIOSTRAS  (e = 0.20)  malla entre caras de plinto
# --------------------------------------------------------------------------
t = PLINTO/2.0
sx = sorted(xs); sy = sorted(ys)
for y in ys:                                         # riostras en X
    for i in range(len(sx)-1):
        poly('RIOSTRAS', riostra_rect(sx[i], y, sx[i+1], y, t, t))
for x in xs:                                         # riostras en Y
    for i in range(len(sy)-1):
        poly('RIOSTRAS', riostra_rect(x, sy[i], x, sy[i+1], t, t))

# --------------------------------------------------------------------------
# 3) PLINTOS (1.00 x 1.00)   y   4) COLUMNAS (0.30 x 0.30)
# --------------------------------------------------------------------------
for x in xs:
    for y in ys:
        poly('PLINTOS', rect_c(x, y, PLINTO/2, PLINTO/2))
for x in xs:
    for y in ys:
        poly('COLUMNAS', rect_c(x, y, COL/2, COL/2))

# --------------------------------------------------------------------------
# 5) COTAS (cadena de vanos)
# --------------------------------------------------------------------------
def cota_h(x1, x2, y, s):
    line('COTAS', x1, y, x2, y)
    line('COTAS', x1, y-0.08, x1, y+0.08)
    line('COTAS', x2, y-0.08, x2, y+0.08)
    text('COTAS', (x1+x2)/2, y+0.10, 0.18, s, 0, 'middle')

def cota_v(y1, y2, x, s):
    line('COTAS', x, y1, x, y2)
    line('COTAS', x-0.08, y1, x+0.08, y1)
    line('COTAS', x-0.08, y2, x+0.08, y2)
    text('COTAS', x+0.12, (y1+y2)/2-0.09, 0.18, s, 0, 'start')

yb = ymin - EXT - 0.95
for i in range(len(sx)-1):
    cota_h(sx[i], sx[i+1], yb, f"{sx[i+1]-sx[i]:.2f}")
xr = xmax + EXT + 0.95
for i in range(len(sy)-1):
    cota_v(sy[i], sy[i+1], xr, f"{sy[i+1]-sy[i]:.2f}")

# rotulos de elementos
text('TEXTOS', xs[0], ys[-1]+0.72, 0.16, "PLINTO 1.00x1.00", 0, 'middle')
text('TEXTOS', (sx[0]+sx[1])/2, ys[0]-0.02, 0.15, "RIOSTRA e=0.20", 0, 'middle')

# --------------------------------------------------------------------------
# 6) MARCO + MEMBRETE
# --------------------------------------------------------------------------
def _bounds():
    ax, ay = [], []
    for pr in prims:
        if pr[0] == 'line':
            ax += [pr[2], pr[4]]; ay += [pr[3], pr[5]]
        elif pr[0] == 'circle':
            ax += [pr[2]-pr[4], pr[2]+pr[4]]; ay += [pr[3]-pr[4], pr[3]+pr[4]]
        elif pr[0] == 'poly':
            ax += [q[0] for q in pr[2]]; ay += [q[1] for q in pr[2]]
        elif pr[0] == 'text':
            ax.append(pr[2]); ay.append(pr[3])
    return min(ax), max(ax), min(ay), max(ay)

dxmin, dxmax, dymin, dymax = _bounds()

TW, TH = 6.00, 2.55
gap = 0.60
mb_r = dxmax + 0.90
mb_l = mb_r - TW
mb_t = dymin - gap
mb_b = mb_t - TH
pad = 0.14

def rect(lay, x1, y1, x2, y2):
    poly(lay, [(x1, y1), (x2, y1), (x2, y2), (x1, y2)])

rect('MEMBRETE', mb_l, mb_b, mb_r, mb_t)
tit_y = mb_t - 0.55
rows = [mb_t - 1.05, mb_t - 1.55, mb_t - 2.05]
line('MEMBRETE', mb_l, tit_y, mb_r, tit_y)
for ry in rows:
    line('MEMBRETE', mb_l, ry, mb_r, ry)
midx = mb_l + TW/2.0
line('MEMBRETE', midx, rows[1], midx, mb_b)
t3x = mb_l + TW/3.0
line('MEMBRETE', t3x, rows[2], t3x, mb_b)
line('MEMBRETE', mb_l + 2*TW/3.0, rows[2], mb_l + 2*TW/3.0, mb_b)

def rowtext(x, ytop, ybot, s, h=0.17):
    text('MEMBRETE', x + pad, ybot + (ytop - ybot - h)/2.0, h, s, 0, 'start')

text('MEMBRETE', midx, tit_y + (0.55 - 0.24)/2.0, 0.24,
     "PLANTA DE CIMENTACION", 0, 'middle')
rowtext(mb_l, tit_y, rows[0], "DIBUJANTE:  John Ariel Martinez")
rowtext(mb_l, rows[0], rows[1], "ASIGNATURA:  Planos Digitales")
rowtext(mb_l, rows[1], rows[2], "Segundo Parcial")
rowtext(midx, rows[1], rows[2], "CARRERA:  Ingenieria Civil")
rowtext(mb_l, rows[2], mb_b, "FECHA: 2026-07-13")
rowtext(t3x,  rows[2], mb_b, "ESC: indicada")
rowtext(mb_l + 2*TW/3.0, rows[2], mb_b, "LAMINA: 01")

bx1, by2 = dxmin - 0.90, dymax + 0.90
bx2, by1 = mb_r, mb_b - 0.30
rect('MARCO', bx1, by1, bx2, by2)
rect('MARCO', bx1 + 0.10, by1 + 0.10, bx2 - 0.10, by2 - 0.10)

# --------------------------------------------------------------------------
# ESCRITURA DXF (R12 ASCII)
# --------------------------------------------------------------------------
LAYERS = {
    'EJES': 1, 'COLUMNAS': 7, 'PLINTOS': 2, 'RIOSTRAS': 4,
    'COTAS': 8, 'TEXTOS': 3, 'MARCO': 7, 'MEMBRETE': 7,
}

def g(code, val):
    return f"{code}\n{val}\n"

def dxf():
    o = []
    o.append(g(0, "SECTION") + g(2, "HEADER"))
    o.append(g(9, "$ACADVER") + g(1, "AC1009"))
    o.append(g(9, "$INSUNITS") + g(70, 6))
    o.append(g(0, "ENDSEC"))
    o.append(g(0, "SECTION") + g(2, "TABLES"))
    o.append(g(0, "TABLE") + g(2, "LTYPE") + g(70, 1))
    o.append(g(0, "LTYPE") + g(2, "CONTINUOUS") + g(70, 0)
             + g(3, "Solid line") + g(72, 65) + g(73, 0) + g(40, 0.0))
    o.append(g(0, "ENDTAB"))
    o.append(g(0, "TABLE") + g(2, "LAYER") + g(70, len(LAYERS)))
    for name, col in LAYERS.items():
        o.append(g(0, "LAYER") + g(2, name) + g(70, 0)
                 + g(62, col) + g(6, "CONTINUOUS"))
    o.append(g(0, "ENDTAB"))
    o.append(g(0, "ENDSEC"))
    o.append(g(0, "SECTION") + g(2, "ENTITIES"))
    for pr in prims:
        kind, lay = pr[0], pr[1]
        if kind == 'line':
            _, _, x1, y1, x2, y2 = pr
            o.append(g(0, "LINE") + g(8, lay)
                     + g(10, f"{x1:.4f}") + g(20, f"{y1:.4f}") + g(30, 0.0)
                     + g(11, f"{x2:.4f}") + g(21, f"{y2:.4f}") + g(31, 0.0))
        elif kind == 'circle':
            _, _, cx, cy, r = pr
            o.append(g(0, "CIRCLE") + g(8, lay)
                     + g(10, f"{cx:.4f}") + g(20, f"{cy:.4f}") + g(30, 0.0)
                     + g(40, f"{r:.4f}"))
        elif kind == 'poly':
            pts = pr[2]; n = len(pts)
            for i in range(n):
                x1, y1 = pts[i]; x2, y2 = pts[(i+1) % n]
                o.append(g(0, "LINE") + g(8, lay)
                         + g(10, f"{x1:.4f}") + g(20, f"{y1:.4f}") + g(30, 0.0)
                         + g(11, f"{x2:.4f}") + g(21, f"{y2:.4f}") + g(31, 0.0))
        elif kind == 'text':
            _, _, x, y, h, sctr, rot, anchor = pr
            just = {'start': 0, 'middle': 1, 'end': 2}[anchor]
            e = g(0, "TEXT") + g(8, lay) \
                + g(10, f"{x:.4f}") + g(20, f"{y:.4f}") + g(30, 0.0) \
                + g(40, f"{h:.4f}") + g(1, sctr)
            if rot:
                e += g(50, f"{rot:.2f}")
            if just:
                e += g(72, just) + g(11, f"{x:.4f}") + g(21, f"{y:.4f}") + g(31, 0.0)
            o.append(e)
    o.append(g(0, "ENDSEC"))
    o.append(g(0, "EOF"))
    return "".join(o)

with open("planos/planta-cimentacion.dxf", "w", encoding="utf-8") as f:
    f.write(dxf())

# --------------------------------------------------------------------------
# ESCRITURA SVG (vista previa)
# --------------------------------------------------------------------------
SC = 46.0
bxmin, bxmax, bymin, bymax = _bounds()
M = 0.4
W = (bxmax - bxmin + 2*M) * SC
H = (bymax - bymin + 2*M) * SC
def X(x): return (x - bxmin + M) * SC
def Y(y): return (bymax - y + M) * SC

COLS = {'EJES': '#b23b3b', 'COLUMNAS': '#222222', 'PLINTOS': '#7a6c53',
        'RIOSTRAS': '#5b7fa6', 'COTAS': '#888888', 'TEXTOS': '#222222',
        'MARCO': '#333333', 'MEMBRETE': '#333333'}
FILL = {'PLINTOS': '#f3ede0', 'RIOSTRAS': '#c9d6e5', 'COLUMNAS': '#3a3a3a'}

o = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W:.0f}" height="{H:.0f}" '
     f'viewBox="0 0 {W:.0f} {H:.0f}" font-family="Arial, sans-serif">']
o.append(f'<rect width="{W:.0f}" height="{H:.0f}" fill="#ffffff"/>')
for pr in prims:
    kind, lay = pr[0], pr[1]; c = COLS[lay]
    if kind == 'line':
        _, _, x1, y1, x2, y2 = pr
        dash = ' stroke-dasharray="9 3 2 3"' if lay == 'EJES' else ''
        o.append(f'<line x1="{X(x1):.1f}" y1="{Y(y1):.1f}" x2="{X(x2):.1f}" '
                 f'y2="{Y(y2):.1f}" stroke="{c}" stroke-width="1"{dash}/>')
    elif kind == 'circle':
        _, _, cx, cy, r = pr
        o.append(f'<circle cx="{X(cx):.1f}" cy="{Y(cy):.1f}" r="{r*SC:.1f}" '
                 f'fill="#ffffff" stroke="{c}" stroke-width="1"/>')
    elif kind == 'poly':
        pts = " ".join(f"{X(x):.1f},{Y(y):.1f}" for x, y in pr[2])
        o.append(f'<polygon points="{pts}" fill="{FILL.get(lay,"none")}" '
                 f'stroke="{c}" stroke-width="1.2"/>')
    elif kind == 'text':
        _, _, x, y, h, s, rot, anchor = pr
        o.append(f'<text x="{X(x):.1f}" y="{Y(y):.1f}" font-size="{h*SC:.0f}" '
                 f'text-anchor="{anchor}" fill="{c}">{s}</text>')
o.append('</svg>')
with open("planos/planta-cimentacion.svg", "w", encoding="utf-8") as f:
    f.write("\n".join(o))

print("OK -> planos/planta-cimentacion.dxf")
print("OK -> planos/planta-cimentacion.svg")
print(f"Edificio {xmax-xmin:.2f} x {ymax-ymin:.2f} m  |  {len(xs)*len(ys)} columnas/plintos")
