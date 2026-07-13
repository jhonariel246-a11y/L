#!/usr/bin/env python3
"""
Generador de la Planta de Cimentacion (propuesta) en formato SVG.

Grafica: ejes estructurales, columnas, plintos (1.00 x 1.00 m) y
riostras (e = 0.20 m). Las dimensiones estan a escala real controlada
por la constante ESCALA (px por metro), de modo que el dibujo puede
verificarse midiendo directamente sobre el archivo vectorial.
"""

# --------------------------------------------------------------------------
# Datos de entrada (geometria de la estructura, en metros)
# --------------------------------------------------------------------------
EJES_X = {"1": 0.00, "2": 4.00, "3": 8.00}          # ejes verticales
EJES_Y = {"A": 0.00, "B": 3.50, "C": 7.00}          # ejes horizontales

COL = 0.30          # lado de columna         (m)
PLINTO = 1.00       # lado de plinto          (m)
RIOSTRA = 0.20      # espesor de riostra      (m)

ESCALA = 60.0       # px por metro
MARGEN_L = 130.0    # margen izquierdo (px)
MARGEN_T = 100.0    # margen superior  (px)
MARGEN_R = 150.0
MARGEN_B = 150.0
EXT = 0.55          # extension de ejes fuera del edificio (m)

# --------------------------------------------------------------------------
def px(x):  # metro -> pixel en X
    return MARGEN_L + x * ESCALA

def py(y):  # metro -> pixel en Y
    return MARGEN_T + y * ESCALA

xs = list(EJES_X.values())
ys = list(EJES_Y.values())
xmin, xmax = min(xs), max(xs)
ymin, ymax = min(ys), max(ys)

ancho = px(xmax) + MARGEN_R
alto = py(ymax) + MARGEN_B

s = []
s.append(
    f'<svg xmlns="http://www.w3.org/2000/svg" width="{ancho:.0f}" '
    f'height="{alto:.0f}" viewBox="0 0 {ancho:.0f} {alto:.0f}" '
    f'font-family="Arial, Helvetica, sans-serif">'
)
# Fondo
s.append(f'<rect x="0" y="0" width="{ancho:.0f}" height="{alto:.0f}" fill="#ffffff"/>')

# --------------------------------------------------------------------------
# 1) Ejes estructurales (linea eje y compas con burbuja)
# --------------------------------------------------------------------------
s.append('<g stroke="#b23b3b" stroke-width="1" stroke-dasharray="10 4 2 4" fill="none">')
for x in xs:  # ejes verticales
    s.append(f'<line x1="{px(x):.1f}" y1="{py(ymin)-EXT*ESCALA:.1f}" '
             f'x2="{px(x):.1f}" y2="{py(ymax)+EXT*ESCALA:.1f}"/>')
for y in ys:  # ejes horizontales
    s.append(f'<line x1="{px(xmin)-EXT*ESCALA:.1f}" y1="{py(y):.1f}" '
             f'x2="{px(xmax)+EXT*ESCALA:.1f}" y2="{py(y):.1f}"/>')
s.append('</g>')

# Burbujas de ejes
def burbuja(cx, cy, txt):
    s.append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="14" fill="#ffffff" '
             f'stroke="#b23b3b" stroke-width="1.5"/>')
    s.append(f'<text x="{cx:.1f}" y="{cy+5:.1f}" text-anchor="middle" '
             f'font-size="15" font-weight="bold" fill="#b23b3b">{txt}</text>')

for nombre, x in EJES_X.items():
    burbuja(px(x), py(ymin) - EXT * ESCALA - 16, nombre)
for nombre, y in EJES_Y.items():
    burbuja(px(xmin) - EXT * ESCALA - 16, py(y), nombre)

# --------------------------------------------------------------------------
# 2) Riostras  (e = 0.20 m)  -> malla que conecta los plintos
# --------------------------------------------------------------------------
r = RIOSTRA / 2.0
s.append('<g fill="#c9d6e5" stroke="#5b7fa6" stroke-width="0.8">')
# riostras en direccion X (a lo largo de cada eje horizontal)
for y in ys:
    s.append(f'<rect x="{px(xmin):.1f}" y="{py(y)-r*ESCALA:.1f}" '
             f'width="{(xmax-xmin)*ESCALA:.1f}" height="{RIOSTRA*ESCALA:.1f}"/>')
# riostras en direccion Y (a lo largo de cada eje vertical)
for x in xs:
    s.append(f'<rect x="{px(x)-r*ESCALA:.1f}" y="{py(ymin):.1f}" '
             f'width="{RIOSTRA*ESCALA:.1f}" height="{(ymax-ymin)*ESCALA:.1f}"/>')
s.append('</g>')

# --------------------------------------------------------------------------
# 3) Plintos  (1.00 x 1.00 m)
# --------------------------------------------------------------------------
p = PLINTO / 2.0
s.append('<g fill="#f3ede0" stroke="#7a6c53" stroke-width="1.4">')
for x in xs:
    for y in ys:
        s.append(f'<rect x="{px(x)-p*ESCALA:.1f}" y="{py(y)-p*ESCALA:.1f}" '
                 f'width="{PLINTO*ESCALA:.1f}" height="{PLINTO*ESCALA:.1f}"/>')
s.append('</g>')

# --------------------------------------------------------------------------
# 4) Columnas  (0.30 x 0.30 m)
# --------------------------------------------------------------------------
c = COL / 2.0
s.append('<g fill="#3a3a3a" stroke="#000000" stroke-width="1">')
for x in xs:
    for y in ys:
        s.append(f'<rect x="{px(x)-c*ESCALA:.1f}" y="{py(y)-c*ESCALA:.1f}" '
                 f'width="{COL*ESCALA:.1f}" height="{COL*ESCALA:.1f}"/>')
s.append('</g>')

# --------------------------------------------------------------------------
# 5) Cotas de vanos (dimension lines)
# --------------------------------------------------------------------------
def cota_h(x1, x2, yline, texto):
    s.append(f'<line x1="{px(x1):.1f}" y1="{yline:.1f}" x2="{px(x2):.1f}" '
             f'y2="{yline:.1f}" stroke="#333" stroke-width="0.8"/>')
    for xx in (x1, x2):
        s.append(f'<line x1="{px(xx):.1f}" y1="{yline-5:.1f}" '
                 f'x2="{px(xx):.1f}" y2="{yline+5:.1f}" stroke="#333" stroke-width="0.8"/>')
    s.append(f'<text x="{(px(x1)+px(x2))/2:.1f}" y="{yline-6:.1f}" '
             f'text-anchor="middle" font-size="12" fill="#333">{texto}</text>')

def cota_v(y1, y2, xline, texto):
    s.append(f'<line x1="{xline:.1f}" y1="{py(y1):.1f}" x2="{xline:.1f}" '
             f'y2="{py(y2):.1f}" stroke="#333" stroke-width="0.8"/>')
    for yy in (y1, y2):
        s.append(f'<line x1="{xline-5:.1f}" y1="{py(yy):.1f}" '
                 f'x2="{xline+5:.1f}" y2="{py(yy):.1f}" stroke="#333" stroke-width="0.8"/>')
    s.append(f'<text x="{xline-8:.1f}" y="{(py(y1)+py(y2))/2+4:.1f}" '
             f'text-anchor="end" font-size="12" fill="#333">{texto}</text>')

yb = py(ymax) + 55
sorted_x = sorted(xs)
for i in range(len(sorted_x) - 1):
    d = sorted_x[i+1] - sorted_x[i]
    cota_h(sorted_x[i], sorted_x[i+1], yb, f"{d:.2f}")
xr = px(xmax) + 55
sorted_y = sorted(ys)
for i in range(len(sorted_y) - 1):
    d = sorted_y[i+1] - sorted_y[i]
    cota_v(sorted_y[i], sorted_y[i+1], xr, f"{d:.2f}")

# --------------------------------------------------------------------------
# 6) Titulo y leyenda
# --------------------------------------------------------------------------
s.append(f'<text x="{MARGEN_L:.0f}" y="34" font-size="20" font-weight="bold" '
         f'fill="#222">PLANTA DE CIMENTACION - PROPUESTA</text>')
s.append(f'<text x="{MARGEN_L:.0f}" y="54" font-size="12" fill="#666">'
         f'Ejes, columnas, plintos (1.00 x 1.00 m) y riostras (e = 0.20 m)</text>')

# Leyenda inferior
lx = MARGEN_L
ly = alto - 70
items = [
    ("#3a3a3a", "Columna 0.30 x 0.30 m"),
    ("#f3ede0", "Plinto 1.00 x 1.00 m"),
    ("#c9d6e5", "Riostra e = 0.20 m"),
]
s.append(f'<text x="{lx:.0f}" y="{ly-14:.0f}" font-size="12" font-weight="bold" '
         f'fill="#333">SIMBOLOGIA</text>')
for i, (color, txt) in enumerate(items):
    yy = ly + i * 22
    s.append(f'<rect x="{lx:.0f}" y="{yy-11:.0f}" width="18" height="14" '
             f'fill="{color}" stroke="#555" stroke-width="0.8"/>')
    s.append(f'<text x="{lx+26:.0f}" y="{yy:.0f}" font-size="12" fill="#333">{txt}</text>')

# Escala grafica (1 m)
ex = px(xmax) - ESCALA
ey = alto - 40
s.append(f'<line x1="{ex:.1f}" y1="{ey:.1f}" x2="{ex+ESCALA:.1f}" y2="{ey:.1f}" '
         f'stroke="#333" stroke-width="2"/>')
s.append(f'<line x1="{ex:.1f}" y1="{ey-4:.1f}" x2="{ex:.1f}" y2="{ey+4:.1f}" stroke="#333" stroke-width="2"/>')
s.append(f'<line x1="{ex+ESCALA:.1f}" y1="{ey-4:.1f}" x2="{ex+ESCALA:.1f}" y2="{ey+4:.1f}" stroke="#333" stroke-width="2"/>')
s.append(f'<text x="{ex+ESCALA/2:.1f}" y="{ey-8:.1f}" text-anchor="middle" '
         f'font-size="11" fill="#333">1.00 m</text>')

s.append('</svg>')

with open("planos/planta-cimentacion.svg", "w", encoding="utf-8") as f:
    f.write("\n".join(s))

print("OK -> planos/planta-cimentacion.svg")
print(f"Edificio: {xmax-xmin:.2f} x {ymax-ymin:.2f} m  |  {len(xs)*len(ys)} columnas/plintos")
