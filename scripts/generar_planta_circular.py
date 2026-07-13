#!/usr/bin/env python3
"""
Planta de Cimentacion CIRCULAR (casa redonda).

Genera una sola geometria y la escribe en dos formatos:
  - planos/planta-cimentacion-circular.dxf   (CAD real, abrible en AutoCAD)
  - planos/planta-cimentacion-circular.svg   (vista previa)

Elementos (segun especificaciones del arquitecto):
  - Ejes radiales + circulo de ejes
  - Columnas          0.30 x 0.30 m
  - Plintos           1.00 x 1.00 m
  - Riostras          e = 0.20 m  (radiales y perimetrales, entre caras de plinto)
"""
import math

# --------------------------------------------------------------------------
# PARAMETROS  (metros / grados)
# --------------------------------------------------------------------------
R          = 4.50        # radio del anillo de columnas
N          = 8           # numero de columnas perimetrales
COL        = 0.30        # lado de columna
PLINTO     = 1.00        # lado de plinto
RIOSTRA    = 0.20        # espesor de riostra
R_MURO     = 4.95        # eje del muro/losa perimetral (referencia arquitectonica)
R_EJE_EXT  = R + 1.15    # extension de los ejes radiales (para burbujas)

# --------------------------------------------------------------------------
# Primitivas comunes  (coordenadas CAD: Y hacia arriba, unidades = m)
# --------------------------------------------------------------------------
prims = []   # ('line',lay,x1,y1,x2,y2) ('circle',lay,cx,cy,r)
             # ('poly',lay,[(x,y)..]) ('text',lay,x,y,h,s,rot,anchor)

def line(lay, x1, y1, x2, y2):   prims.append(('line', lay, x1, y1, x2, y2))
def circle(lay, cx, cy, r):      prims.append(('circle', lay, cx, cy, r))
def poly(lay, pts):              prims.append(('poly', lay, pts))
def text(lay, x, y, h, s, rot=0, anchor='start'):
    prims.append(('text', lay, x, y, h, s, rot, anchor))

def rect_rot(cx, cy, half_u, half_v, ang):
    """Rectangulo centrado en (cx,cy), orientado segun 'ang' (radial)."""
    u = (math.cos(ang), math.sin(ang))          # eje radial
    v = (-math.sin(ang), math.cos(ang))         # eje tangencial
    return [
        (cx + half_u*u[0] + half_v*v[0], cy + half_u*u[1] + half_v*v[1]),
        (cx + half_u*u[0] - half_v*v[0], cy + half_u*u[1] - half_v*v[1]),
        (cx - half_u*u[0] - half_v*v[0], cy - half_u*u[1] - half_v*v[1]),
        (cx - half_u*u[0] + half_v*v[0], cy - half_u*u[1] + half_v*v[1]),
    ]

def riostra_rect(ax, ay, bx, by, trim_a, trim_b):
    """Rectangulo de la riostra (ancho RIOSTRA) entre A y B, recortado en las caras."""
    dx, dy = bx-ax, by-ay
    L = math.hypot(dx, dy)
    ux, uy = dx/L, dy/L
    nx, ny = -uy, ux
    sx, sy = ax + ux*trim_a, ay + uy*trim_a
    ex, ey = bx - ux*trim_b, by - uy*trim_b
    w = RIOSTRA/2.0
    return [(sx+nx*w, sy+ny*w), (ex+nx*w, ey+ny*w),
            (ex-nx*w, ey-ny*w), (sx-nx*w, sy-ny*w)]

# --------------------------------------------------------------------------
# Posiciones de columnas
# --------------------------------------------------------------------------
ang = [i*(2*math.pi/N) for i in range(N)]
perim = [(R*math.cos(a), R*math.sin(a), a) for a in ang]
centro = (0.0, 0.0, 0.0)
todas = [centro] + perim

# --------------------------------------------------------------------------
# 1) EJES
# --------------------------------------------------------------------------
circle('EJES', 0, 0, R)                                   # circulo de ejes
for i, a in enumerate(ang):                               # ejes radiales
    x2, y2 = R_EJE_EXT*math.cos(a), R_EJE_EXT*math.sin(a)
    line('EJES', 0, 0, x2, y2)
    bx, by = (R_EJE_EXT+0.25)*math.cos(a), (R_EJE_EXT+0.25)*math.sin(a)
    circle('EJES', bx, by, 0.28)
    text('EJES', bx, by-0.09, 0.22, f"E{i+1}", 0, 'middle')
text('EJES', 0.28, 0.10, 0.20, "C", 0, 'start')           # eje central

# Muro / losa perimetral (referencia)
circle('MUROS', 0, 0, R_MURO)

# --------------------------------------------------------------------------
# 2) RIOSTRAS  (e = 0.20)  entre caras de plinto (recorte = medio plinto)
# --------------------------------------------------------------------------
t = PLINTO/2.0
for (px_, py_, a) in perim:                               # radiales C -> Ei
    poly('RIOSTRAS', riostra_rect(0, 0, px_, py_, t, t))
for i in range(N):                                        # perimetrales Ei -> Ei+1
    x1, y1, _ = perim[i]
    x2, y2, _ = perim[(i+1) % N]
    poly('RIOSTRAS', riostra_rect(x1, y1, x2, y2, t, t))

# --------------------------------------------------------------------------
# 3) PLINTOS  (1.00 x 1.00)
# --------------------------------------------------------------------------
for (cx, cy, a) in todas:
    poly('PLINTOS', rect_rot(cx, cy, PLINTO/2, PLINTO/2, a))

# --------------------------------------------------------------------------
# 4) COLUMNAS  (0.30 x 0.30)
# --------------------------------------------------------------------------
for (cx, cy, a) in todas:
    poly('COLUMNAS', rect_rot(cx, cy, COL/2, COL/2, a))

# --------------------------------------------------------------------------
# 5) COTAS / ROTULOS
# --------------------------------------------------------------------------
# radio
line('COTAS', 0, 0, R*math.cos(math.radians(22.5)), R*math.sin(math.radians(22.5)))
text('COTAS', 1.2, 1.05, 0.20, f"R = {R:.2f}", 0, 'start')
text('TEXTOS', perim[0][0]-0.5, perim[0][1]+0.75, 0.16, "PLINTO 1.00x1.00", 0, 'middle')
text('TEXTOS', (perim[0][0]+perim[1][0])/2+1.1,
     (perim[0][1]+perim[1][1])/2, 0.16, "RIOSTRA e=0.20", 0, 'middle')
# --------------------------------------------------------------------------
# 6) MARCO + MEMBRETE (rotulo)
# --------------------------------------------------------------------------
def _bounds():
    xs, ys = [], []
    for pr in prims:
        if pr[0] == 'line':
            xs += [pr[2], pr[4]]; ys += [pr[3], pr[5]]
        elif pr[0] == 'circle':
            xs += [pr[2]-pr[4], pr[2]+pr[4]]; ys += [pr[3]-pr[4], pr[3]+pr[4]]
        elif pr[0] == 'poly':
            xs += [q[0] for q in pr[2]]; ys += [q[1] for q in pr[2]]
        elif pr[0] == 'text':
            xs.append(pr[2]); ys.append(pr[3])
    return min(xs), max(xs), min(ys), max(ys)

dxmin, dxmax, dymin, dymax = _bounds()

# --- Membrete (tabla del rotulo) ---
TW, TH = 6.00, 2.55                       # ancho / alto del membrete
gap = 0.60
mb_r = dxmax + 0.90                        # borde derecho
mb_l = mb_r - TW
mb_t = dymin - gap                         # borde superior
mb_b = mb_t - TH
pad = 0.14

def rect(lay, x1, y1, x2, y2):
    poly(lay, [(x1, y1), (x2, y1), (x2, y2), (x1, y2)])

# caja y filas
rect('MEMBRETE', mb_l, mb_b, mb_r, mb_t)
tit_y = mb_t - 0.55                        # base de la barra de titulo
rows = [mb_t - 1.05, mb_t - 1.55, mb_t - 2.05]   # lineas horizontales internas
line('MEMBRETE', mb_l, tit_y, mb_r, tit_y)
for ry in rows:
    line('MEMBRETE', mb_l, ry, mb_r, ry)
midx = mb_l + TW/2.0
line('MEMBRETE', midx, rows[1], midx, mb_b)      # divisor filas inferiores
t3x = mb_l + TW/3.0
line('MEMBRETE', t3x, rows[2], t3x, mb_b)
line('MEMBRETE', mb_l + 2*TW/3.0, rows[2], mb_l + 2*TW/3.0, mb_b)

def rowtext(x, ytop, ybot, s, h=0.17):
    text('MEMBRETE', x + pad, ybot + (ytop - ybot - h)/2.0, h, s, 0, 'start')

# Titulo
text('MEMBRETE', midx, tit_y + (0.55 - 0.24)/2.0, 0.24,
     "PLANTA DE CIMENTACION - CASA CIRCULAR", 0, 'middle')
# Filas
rowtext(mb_l, tit_y, rows[0], "DIBUJANTE:  John Ariel Martinez")
rowtext(mb_l, rows[0], rows[1], "ASIGNATURA:  Planos Digitales")
rowtext(mb_l, rows[1], rows[2], "Segundo Parcial")
rowtext(midx, rows[1], rows[2], "CARRERA:  Ingenieria Civil")
rowtext(mb_l, rows[2], mb_b, "FECHA: 2026-07-13")
rowtext(t3x,  rows[2], mb_b, "ESC: indicada")
rowtext(mb_l + 2*TW/3.0, rows[2], mb_b, "LAMINA: 01")

# --- Marco de lamina ---
bx1, by2 = dxmin - 0.90, dymax + 0.90
bx2, by1 = mb_r, mb_b - 0.30
rect('MARCO', bx1, by1, bx2, by2)
rect('MARCO', bx1 + 0.10, by1 + 0.10, bx2 - 0.10, by2 - 0.10)

# --------------------------------------------------------------------------
# ESCRITURA DXF  (R12 ASCII - maxima compatibilidad)
# --------------------------------------------------------------------------
LAYERS = {   # nombre: color ACI
    'EJES': 1, 'COLUMNAS': 7, 'PLINTOS': 2,
    'RIOSTRAS': 4, 'COTAS': 8, 'TEXTOS': 3, 'MUROS': 9,
    'MARCO': 7, 'MEMBRETE': 7,
}

def g(code, val):        # par de grupo DXF
    return f"{code}\n{val}\n"

def dxf():
    o = []
    o.append(g(0, "SECTION") + g(2, "HEADER"))
    o.append(g(9, "$ACADVER") + g(1, "AC1009"))
    o.append(g(9, "$INSUNITS") + g(70, 6))          # 6 = metros
    o.append(g(0, "ENDSEC"))

    o.append(g(0, "SECTION") + g(2, "TABLES"))
    # LTYPE
    o.append(g(0, "TABLE") + g(2, "LTYPE") + g(70, 1))
    o.append(g(0, "LTYPE") + g(2, "CONTINUOUS") + g(70, 0)
             + g(3, "Solid line") + g(72, 65) + g(73, 0) + g(40, 0.0))
    o.append(g(0, "ENDTAB"))
    # LAYER
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
            pts = pr[2]
            n = len(pts)
            for i in range(n):
                x1, y1 = pts[i]
                x2, y2 = pts[(i+1) % n]
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

with open("planos/planta-cimentacion-circular.dxf", "w", encoding="utf-8") as f:
    f.write(dxf())

# --------------------------------------------------------------------------
# ESCRITURA SVG  (vista previa)
# --------------------------------------------------------------------------
SC = 46.0
xs = [p for pr in prims for p in ([pr[2], pr[4]] if pr[0] == 'line'
      else [pr[2]-pr[4], pr[2]+pr[4]] if pr[0] == 'circle'
      else [q[0] for q in pr[2]] if pr[0] == 'poly' else [pr[2]])]
ys = [p for pr in prims for p in ([pr[3], pr[5]] if pr[0] == 'line'
      else [pr[3]-pr[4], pr[3]+pr[4]] if pr[0] == 'circle'
      else [q[1] for q in pr[2]] if pr[0] == 'poly' else [pr[3]])]
xmin, xmax, ymin, ymax = min(xs), max(xs), min(ys), max(ys)
M = 0.6
W = (xmax - xmin + 2*M) * SC
H = (ymax - ymin + 2*M) * SC
def X(x): return (x - xmin + M) * SC
def Y(y): return (ymax - y + M) * SC     # flip

COLS = {'EJES': '#b23b3b', 'COLUMNAS': '#222222', 'PLINTOS': '#7a6c53',
        'RIOSTRAS': '#5b7fa6', 'COTAS': '#888888', 'TEXTOS': '#222222',
        'MUROS': '#c0c0c0', 'MARCO': '#333333', 'MEMBRETE': '#333333'}
FILL = {'PLINTOS': '#f3ede0', 'RIOSTRAS': '#c9d6e5', 'COLUMNAS': '#3a3a3a'}

o = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W:.0f}" height="{H:.0f}" '
     f'viewBox="0 0 {W:.0f} {H:.0f}" font-family="Arial, sans-serif">']
o.append(f'<rect width="{W:.0f}" height="{H:.0f}" fill="#ffffff"/>')
for pr in prims:
    kind, lay = pr[0], pr[1]
    c = COLS[lay]
    if kind == 'line':
        _, _, x1, y1, x2, y2 = pr
        dash = ' stroke-dasharray="9 3 2 3"' if lay == 'EJES' else ''
        o.append(f'<line x1="{X(x1):.1f}" y1="{Y(y1):.1f}" x2="{X(x2):.1f}" '
                 f'y2="{Y(y2):.1f}" stroke="{c}" stroke-width="1"{dash}/>')
    elif kind == 'circle':
        _, _, cx, cy, r = pr
        dash = ' stroke-dasharray="9 3 2 3"' if lay == 'EJES' else ''
        fill = '#ffffff' if (lay == 'EJES' and r < 0.4) else 'none'
        o.append(f'<circle cx="{X(cx):.1f}" cy="{Y(cy):.1f}" r="{r*SC:.1f}" '
                 f'fill="{fill}" stroke="{c}" stroke-width="1"{dash}/>')
    elif kind == 'poly':
        pts = " ".join(f"{X(x):.1f},{Y(y):.1f}" for x, y in pr[2])
        o.append(f'<polygon points="{pts}" fill="{FILL.get(lay,"none")}" '
                 f'stroke="{c}" stroke-width="1.2"/>')
    elif kind == 'text':
        _, _, x, y, h, s, rot, anchor = pr
        a = {'start': 'start', 'middle': 'middle', 'end': 'end'}[anchor]
        o.append(f'<text x="{X(x):.1f}" y="{Y(y):.1f}" font-size="{h*SC:.0f}" '
                 f'text-anchor="{a}" fill="{c}">{s}</text>')
o.append('</svg>')
with open("planos/planta-cimentacion-circular.svg", "w", encoding="utf-8") as f:
    f.write("\n".join(o))

print("OK -> planos/planta-cimentacion-circular.dxf")
print("OK -> planos/planta-cimentacion-circular.svg")
print(f"Casa circular  D = {2*R:.2f} m  |  {N} columnas perimetrales + 1 central")
