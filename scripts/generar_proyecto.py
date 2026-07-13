#!/usr/bin/env python3
"""
Proyecto: CASA MODERNA DE 3 NIVELES  (~12.00 x 11.00 m)
Basado en imagen de referencia (fachada). Distribucion = propuesta.

Genera 4 laminas (DXF editable + SVG de vista previa):
  01  Planta Baja            (arq-planta-baja)
  02  Primer Piso            (arq-primer-piso)
  03  Segundo Piso           (arq-segundo-piso)
  04  Planta de Cimentacion  (planta-cimentacion)
"""
import math
from lib_cad import Sheet, write_dxf, write_svg

# --------------------------------------------------------------------------
# Malla estructural (comun a todas las plantas)
# --------------------------------------------------------------------------
EJES_X = {"1": 0.00, "2": 4.00, "3": 8.00, "4": 12.00}
EJES_Y = {"A": 0.00, "B": 3.50, "C": 7.00, "D": 11.00}
XS = list(EJES_X.values()); YS = list(EJES_Y.values())
X0, X1 = min(XS), max(XS)
Y0, Y1 = min(YS), max(YS)

TE = 0.20     # espesor muro exterior
TI = 0.12     # espesor muro interior
COL = 0.30    # columna
PLINTO = 1.00
RIOSTRA = 0.20
EXT = 0.90    # extension de ejes

MEMBRETE_BASE = dict(dib="John Ariel Martinez", asg="Planos Digitales",
                     par="Segundo Parcial", car="Ingenieria Civil", fecha="2026-07-13")
REF_LINK = "https://drive.google.com/file/d/1zfL9muo_BWWw2PnaNCiBtKRWGQREuz5W/view"

# ==========================================================================
# Componentes reutilizables
# ==========================================================================
def ejes_y_columnas(s, con_columnas=True):
    def burbuja(cx, cy, t):
        s.circle('EJES', cx, cy, 0.30)
        s.text('EJES', cx, cy - 0.10, 0.24, t, 0, 'middle')
    for n, x in EJES_X.items():
        s.line('EJES', x, Y0 - EXT, x, Y1 + EXT)
        burbuja(x, Y0 - EXT - 0.32, n)
    for n, y in EJES_Y.items():
        s.line('EJES', X0 - EXT, y, X1 + EXT, y)
        burbuja(X0 - EXT - 0.32, y, n)
    if con_columnas:
        for x in XS:
            for y in YS:
                s.rect('COLUMNAS', x - COL/2, y - COL/2, x + COL/2, y + COL/2, fill=True)

def env(s):
    """Muro exterior (poche) como 4 bandas."""
    s.rect('MUROS', X0, Y0, X0 + TE, Y1, fill=True)          # izq
    s.rect('MUROS', X1 - TE, Y0, X1, Y1, fill=True)          # der
    s.rect('MUROS', X0, Y0, X1, Y0 + TE, fill=True)          # frente
    s.rect('MUROS', X0, Y1 - TE, X1, Y1, fill=True)          # fondo

def part(s, x1, y1, x2, y2):
    s.band('MUROS', x1, y1, x2, y2, TI, fill=True)

def window(s, cx, cy, w, orient, t=TE):
    if orient == 'h':
        s.erase(cx - w/2, cy - t/2, cx + w/2, cy + t/2)
        for dy in (-t/3, 0, t/3):
            s.line('VENTANAS', cx - w/2, cy + dy, cx + w/2, cy + dy)
        s.line('VENTANAS', cx - w/2, cy - t/2, cx - w/2, cy + t/2)
        s.line('VENTANAS', cx + w/2, cy - t/2, cx + w/2, cy + t/2)
    else:
        s.erase(cx - t/2, cy - w/2, cx + t/2, cy + w/2)
        for dx in (-t/3, 0, t/3):
            s.line('VENTANAS', cx + dx, cy - w/2, cx + dx, cy + w/2)
        s.line('VENTANAS', cx - t/2, cy - w/2, cx + t/2, cy - w/2)
        s.line('VENTANAS', cx - t/2, cy + w/2, cx + t/2, cy + w/2)

def door(s, cx, cy, w, orient, hinge, swing, t=TI):
    if orient == 'h':
        s.erase(cx - w/2, cy - t/2, cx + w/2, cy + t/2)
        hx = cx - w/2 if hinge == 'left' else cx + w/2
        to = 1 if hinge == 'left' else -1
        sg = 1 if swing == 'up' else -1
        s.line('PUERTAS', hx, cy, hx, cy + sg*w)
        a = {(1, 1): (0, 90), (-1, 1): (90, 180),
             (1, -1): (270, 360), (-1, -1): (180, 270)}[(to, sg)]
        s.arc('PUERTAS', hx, cy, w, a[0], a[1])
    else:
        s.erase(cx - t/2, cy - w/2, cx + t/2, cy + w/2)
        hy = cy - w/2 if hinge == 'bottom' else cy + w/2
        to = 1 if hinge == 'bottom' else -1
        sg = 1 if swing == 'right' else -1
        s.line('PUERTAS', cx, hy, cx + sg*w, hy)
        a = {(1, 1): (0, 90), (1, -1): (90, 180),
             (-1, 1): (270, 360), (-1, -1): (180, 270)}[(to, sg)]
        s.arc('PUERTAS', cx, hy, w, a[0], a[1])

def stairs(s, x0, y0, x1, y1, n=11, travel='up', label="SUBE"):
    s.rect('ESCALERA', x0, y0, x1, y1)
    if travel in ('up', 'down'):
        for i in range(1, n):
            yy = y0 + (y1 - y0) * i / n
            s.line('ESCALERA', x0, yy, x1, yy)
        cx = (x0 + x1) / 2
        s.line('ESCALERA', cx, y0 + 0.15, cx, y1 - 0.15)
        ay = y1 - 0.15 if travel == 'up' else y0 + 0.15
        d = -0.25 if travel == 'up' else 0.25
        s.line('ESCALERA', cx, ay, cx - 0.12, ay + d)
        s.line('ESCALERA', cx, ay, cx + 0.12, ay + d)
    else:
        for i in range(1, n):
            xx = x0 + (x1 - x0) * i / n
            s.line('ESCALERA', xx, y0, xx, y1)
    s.text('TEXTOS', (x0+x1)/2, (y0+y1)/2, 0.16, label, 0, 'middle')

def room(s, x0, y0, x1, y1, name, area=True):
    cx, cy = (x0+x1)/2, (y0+y1)/2
    s.text('TEXTOS', cx, cy, 0.24, name, 0, 'middle')
    if area:
        a = abs((x1-x0)*(y1-y0))
        s.text('TEXTOS', cx, cy - 0.32, 0.16, f"{a:.1f} m2", 0, 'middle')

def bed(s, x0, y0, w, h, orient='v'):
    s.rect('MOBILIARIO', x0, y0, x0+w, y0+h)
    if orient == 'v':
        s.line('MOBILIARIO', x0, y0+h-0.45, x0+w, y0+h-0.45)   # almohada
    else:
        s.line('MOBILIARIO', x0+0.45, y0, x0+0.45, y0+h)

def sofa(s, x0, y0, w, h):
    s.rect('MOBILIARIO', x0, y0, x0+w, y0+h)
    s.line('MOBILIARIO', x0, y0+h-0.18, x0+w, y0+h-0.18)

def table(s, x0, y0, w, h):
    s.rect('MOBILIARIO', x0, y0, x0+w, y0+h)

def car(s, x0, y0):
    w, h = 4.5, 1.85
    s.rect('MOBILIARIO', x0, y0, x0+w, y0+h)
    s.rect('MOBILIARIO', x0+1.1, y0+0.25, x0+3.4, y0+h-0.25)

def kitchen(s, x0, y0, x1, y1):
    s.rect('MOBILIARIO', x0, y0, x1, y0+0.6)      # mesón
    s.rect('MOBILIARIO', x0, y0, x0+0.6, y1)

def railing(s, x0, y0, x1, y1):
    s.rect('MOBILIARIO', x0, y0, x1, y1)

# ---- cotas ----
def cota_h(s, xa, xb, y, txt):
    s.line('COTAS', xa, y, xb, y)
    s.line('COTAS', xa, y-0.1, xa, y+0.1); s.line('COTAS', xb, y-0.1, xb, y+0.1)
    s.text('COTAS', (xa+xb)/2, y+0.12, 0.18, txt, 0, 'middle')

def cota_v(s, ya, yb, x, txt):
    s.line('COTAS', x, ya, x, yb)
    s.line('COTAS', x-0.1, ya, x+0.1, ya); s.line('COTAS', x-0.1, yb, x+0.1, yb)
    s.text('COTAS', x+0.14, (ya+yb)/2-0.09, 0.18, txt, 0, 'start')

def cotas_generales(s):
    yb = Y0 - EXT - 1.0
    sx = sorted(XS)
    for i in range(len(sx)-1):
        cota_h(s, sx[i], sx[i+1], yb, f"{sx[i+1]-sx[i]:.2f}")
    cota_h(s, X0, X1, yb - 0.6, f"{X1-X0:.2f}")
    xr = X1 + EXT + 1.0
    sy = sorted(YS)
    for i in range(len(sy)-1):
        cota_v(s, sy[i], sy[i+1], xr, f"{sy[i+1]-sy[i]:.2f}")
    cota_v(s, Y0, Y1, xr + 0.6, f"{Y1-Y0:.2f}")

# ---- membrete + marco ----
def membrete(s, titulo, lamina):
    dxmin, dxmax, dymin, dymax = s.bounds()
    TW, TH = 6.4, 2.55
    mb_r = dxmax + 0.9
    mb_l = mb_r - TW
    mb_t = dymin - 0.6
    mb_b = mb_t - TH
    pad = 0.14
    s.rect('MEMBRETE', mb_l, mb_b, mb_r, mb_t)
    tit_y = mb_t - 0.55
    rows = [mb_t-1.05, mb_t-1.55, mb_t-2.05]
    s.line('MEMBRETE', mb_l, tit_y, mb_r, tit_y)
    for ry in rows:
        s.line('MEMBRETE', mb_l, ry, mb_r, ry)
    midx = mb_l + TW/2
    s.line('MEMBRETE', midx, rows[1], midx, mb_b)
    t3 = mb_l + TW/3
    s.line('MEMBRETE', t3, rows[2], t3, mb_b)
    s.line('MEMBRETE', mb_l + 2*TW/3, rows[2], mb_l + 2*TW/3, mb_b)

    def rt(x, yt, yb, txt, h=0.17):
        s.text('MEMBRETE', x+pad, yb + (yt-yb-h)/2, h, txt, 0, 'start')

    m = MEMBRETE_BASE
    s.text('MEMBRETE', midx, tit_y + (0.55-0.22)/2, 0.22, titulo, 0, 'middle')
    rt(mb_l, tit_y, rows[0], f"DIBUJANTE:  {m['dib']}")
    rt(mb_l, rows[0], rows[1], f"ASIGNATURA:  {m['asg']}")
    rt(mb_l, rows[1], rows[2], m['par'])
    rt(midx, rows[1], rows[2], f"CARRERA:  {m['car']}")
    rt(mb_l, rows[2], mb_b, f"FECHA: {m['fecha']}")
    rt(t3,  rows[2], mb_b, "ESC: indicada")
    rt(mb_l + 2*TW/3, rows[2], mb_b, lamina)

    if REF_LINK:
        s.text('MEMBRETE', mb_l, mb_t + 0.20, 0.13,
               f"REF. ARCHIVO ORIGINAL:  {REF_LINK}", 0, 'start')

    bx1, by2 = dxmin - 0.9, dymax + 0.9
    bx2, by1 = mb_r, mb_b - 0.3
    s.rect('MARCO', bx1, by1, bx2, by2)
    s.rect('MARCO', bx1+0.1, by1+0.1, bx2-0.1, by2-0.1)

# ==========================================================================
# LAMINA 01 - PLANTA BAJA
# ==========================================================================
def build_planta_baja():
    s = Sheet()
    ejes_y_columnas(s)
    env(s)
    # particiones principales
    part(s, 5.0, Y0, 5.0, Y1)            # vertical izq
    part(s, 7.4, Y0, 7.4, Y1)            # vertical der
    part(s, X0, 5.6, 5.0, 5.6)          # garaje / cocina
    part(s, 7.4, 5.4, X1, 5.4)          # sala / comedor
    part(s, 5.0, 3.4, 7.4, 3.4)         # hall / escalera
    part(s, 5.0, 8.4, 7.4, 8.4)         # bano / despensa
    # ambientes
    room(s, 0.2, 0.2, 5.0, 5.6, "GARAJE")
    room(s, 0.2, 5.6, 5.0, 10.8, "COCINA")
    room(s, 5.0, 0.2, 7.4, 3.4, "HALL")
    room(s, 5.0, 8.4, 7.4, 10.8, "DESPENSA", area=False)
    room(s, 5.05, 6.7, 7.35, 8.4, "BANO", area=False)
    room(s, 7.4, 0.2, 12.0, 5.4, "SALA")
    room(s, 7.4, 5.4, 12.0, 10.8, "COMEDOR")
    # escalera
    stairs(s, 5.15, 3.55, 7.25, 6.5, n=11, travel='up', label="SUBE")
    # aberturas exteriores
    window(s, 2.6, Y0, 3.6, 'h')                    # porton garaje (frente)
    s.text('TEXTOS', 2.6, Y0-0.55, 0.15, "PORTON GARAJE", 0, 'middle')
    door(s, 6.2, Y0, 1.0, 'h', 'left', 'up', t=TE)  # puerta principal
    window(s, 9.8, Y0, 3.0, 'h')                    # ventanal sala (arco)
    s.text('TEXTOS', 9.8, Y0-0.55, 0.15, "VENTANAL", 0, 'middle')
    window(s, X1, 2.7, 2.0, 'v'); window(s, X1, 8.0, 2.4, 'v')   # der
    window(s, X0, 8.0, 2.4, 'v')                                 # izq cocina
    window(s, 2.6, Y1, 2.4, 'h'); window(s, 9.7, Y1, 2.4, 'h')   # fondo
    # puertas interiores
    door(s, 5.0, 2.0, 0.9, 'v', 'bottom', 'right')   # hall-garaje
    door(s, 7.4, 2.0, 0.9, 'v', 'bottom', 'left')    # hall-sala
    door(s, 6.2, 3.4, 0.9, 'h', 'left', 'up')        # hall-escalera
    door(s, 3.0, 5.6, 0.9, 'h', 'left', 'up')        # garaje-cocina
    door(s, 5.0, 8.9, 0.8, 'v', 'bottom', 'left')    # despensa
    # mobiliario
    car(s, 0.6, 1.4)
    sofa(s, 8.0, 0.6, 2.6, 0.9); table(s, 9.2, 2.2, 1.2, 0.7)
    table(s, 9.0, 6.8, 1.8, 1.1)                     # comedor
    kitchen(s, 0.4, 6.0, 4.6, 10.4)
    cotas_generales(s)
    s.text('TEXTOS', (X0+X1)/2, Y1+EXT+0.6, 0.34, "01 - PLANTA BAJA", 0, 'middle')
    return s

# ==========================================================================
# LAMINA 02 - PRIMER PISO
# ==========================================================================
def build_primer_piso():
    s = Sheet()
    ejes_y_columnas(s)
    env(s)
    part(s, 5.0, 1.8, 5.0, Y1)
    part(s, 7.4, 1.8, 7.4, Y1)
    part(s, X0, 1.8, X1, 1.8)           # frente balcon
    part(s, X0, 6.5, 5.0, 6.5)          # sala / dorm2
    part(s, 7.4, 6.0, X1, 6.0)          # comedor / dorm3
    part(s, 5.0, 3.4, 7.4, 3.4)
    part(s, 5.0, 8.4, 7.4, 8.4)
    room(s, 0.2, 1.8, 5.0, 6.5, "SALA")
    room(s, 0.2, 6.5, 5.0, 10.8, "DORMITORIO 2")
    room(s, 7.4, 1.8, 12.0, 6.0, "COMEDOR")
    room(s, 7.4, 6.0, 12.0, 10.8, "DORMITORIO 3")
    room(s, 5.05, 1.9, 7.35, 3.4, "HALL", area=False)
    room(s, 5.05, 6.7, 7.35, 8.4, "BANO", area=False)
    room(s, 5.05, 8.4, 7.35, 10.8, "CLOSET", area=False)
    railing(s, 0.5, 0.3, 11.5, 1.4)
    s.text('TEXTOS', 6.0, 0.85, 0.2, "BALCON", 0, 'middle')
    stairs(s, 5.15, 3.55, 7.25, 6.5, n=11, travel='down', label="BAJA")
    # ventanas exteriores (a balcon y laterales)
    for cx in (2.6, 6.0, 9.7):
        window(s, cx, Y0, 2.2, 'h')
    window(s, X0, 4.0, 2.2, 'v'); window(s, X0, 8.5, 2.4, 'v')
    window(s, X1, 3.8, 2.2, 'v'); window(s, X1, 8.4, 2.4, 'v')
    window(s, 2.6, Y1, 2.4, 'h'); window(s, 9.7, Y1, 2.4, 'h')
    # puertas
    door(s, 3.0, 1.8, 1.0, 'h', 'left', 'up')       # sala-balcon
    door(s, 9.5, 1.8, 1.0, 'h', 'right', 'up')      # comedor-balcon
    door(s, 5.0, 2.6, 0.9, 'v', 'bottom', 'right')
    door(s, 7.4, 2.6, 0.9, 'v', 'bottom', 'left')
    door(s, 3.2, 6.5, 0.9, 'h', 'left', 'up')       # dorm2
    door(s, 9.0, 6.0, 0.9, 'h', 'left', 'up')       # dorm3
    door(s, 6.0, 6.7, 0.8, 'h', 'left', 'up')       # bano
    # mobiliario
    sofa(s, 0.6, 2.0, 3.0, 1.0); table(s, 2.0, 3.6, 1.3, 0.8)
    bed(s, 0.6, 8.8, 1.7, 1.9, 'v')
    bed(s, 9.9, 6.4, 1.7, 1.9, 'v')
    table(s, 8.6, 2.4, 1.8, 1.1)
    cotas_generales(s)
    s.text('TEXTOS', (X0+X1)/2, Y1+EXT+0.6, 0.34, "02 - PRIMER PISO", 0, 'middle')
    return s

# ==========================================================================
# LAMINA 03 - SEGUNDO PISO
# ==========================================================================
def build_segundo_piso():
    s = Sheet()
    ejes_y_columnas(s)
    env(s)
    part(s, X0, 1.8, 8.0, 1.8)          # frente (balcon parcial + muro)
    part(s, 6.0, 1.8, 6.0, 6.5)         # dorm ppal / distribuidor
    part(s, 7.4, 1.8, 7.4, Y1)
    part(s, X0, 6.5, 7.4, 6.5)          # dorm ppal / estudio
    part(s, 7.4, 6.0, X1, 6.0)          # dorm4 / terraza
    room(s, 0.2, 1.8, 6.0, 6.5, "DORMITORIO PRINCIPAL", area=False)
    s.text('TEXTOS', 3.0, 3.9, 0.16, "27.0 m2", 0, 'middle')
    room(s, 0.2, 6.5, 7.4, 10.8, "ESTUDIO / SALA TV", area=False)
    room(s, 7.4, 1.8, 12.0, 6.0, "DORMITORIO 4")
    room(s, 6.05, 3.6, 7.35, 6.5, "BANO", area=False)
    room(s, 6.05, 1.9, 7.35, 3.6, "VESTIDOR", area=False)
    # terraza (fondo derecha, abierta)
    railing(s, 7.4, 6.0, 12.0, 10.8)
    s.text('TEXTOS', 9.7, 8.4, 0.24, "TERRAZA", 0, 'middle')
    # balcon frontal (centrado, mas pequeno)
    railing(s, 3.0, 0.3, 8.0, 1.4)
    s.text('TEXTOS', 5.5, 0.85, 0.2, "BALCON", 0, 'middle')
    stairs(s, 5.15, 3.55, 6.0, 6.5, n=11, travel='down', label="BAJA")
    # ventanas
    window(s, 4.2, Y0, 2.2, 'h')
    window(s, 6.6, Y0, 1.0, 'h')
    window(s, X0, 4.0, 2.4, 'v'); window(s, X0, 8.6, 2.4, 'v')
    window(s, X1, 3.8, 2.2, 'v')
    window(s, 3.5, Y1, 2.6, 'h')
    # puertas
    door(s, 4.5, 1.8, 1.0, 'h', 'left', 'up')       # dorm ppal - balcon
    door(s, 6.0, 5.6, 0.9, 'v', 'top', 'left')      # a bano/vestidor
    door(s, 3.0, 6.5, 1.0, 'h', 'left', 'up')       # estudio
    door(s, 9.0, 6.0, 1.0, 'h', 'left', 'up')       # dorm4 - terraza
    door(s, 7.4, 3.0, 0.9, 'v', 'bottom', 'left')   # dorm4 acceso
    # mobiliario
    bed(s, 0.6, 4.3, 2.0, 2.1, 'v')                 # cama matrimonial
    bed(s, 9.6, 2.2, 1.7, 1.9, 'v')
    sofa(s, 0.6, 9.4, 3.0, 1.0)
    cotas_generales(s)
    s.text('TEXTOS', (X0+X1)/2, Y1+EXT+0.6, 0.34, "03 - SEGUNDO PISO", 0, 'middle')
    return s

# ==========================================================================
# LAMINA 04 - PLANTA DE CIMENTACION
# ==========================================================================
def build_cimentacion():
    s = Sheet()
    ejes_y_columnas(s, con_columnas=False)
    # riostras (entre caras de plinto)
    t = PLINTO/2
    sx = sorted(XS); sy = sorted(YS)
    for y in YS:
        for i in range(len(sx)-1):
            s.band('RIOSTRAS', sx[i]+t, y, sx[i+1]-t, y, RIOSTRA, fill=True)
    for x in XS:
        for i in range(len(sy)-1):
            s.band('RIOSTRAS', x, sy[i]+t, x, sy[i+1]-t, RIOSTRA, fill=True)
    # plintos + columnas
    for x in XS:
        for y in YS:
            s.rect('PLINTOS', x-PLINTO/2, y-PLINTO/2, x+PLINTO/2, y+PLINTO/2, fill=True)
    for x in XS:
        for y in YS:
            s.rect('COLUMNAS', x-COL/2, y-COL/2, x+COL/2, y+COL/2, fill=True)
    s.text('TEXTOS', XS[0], YS[-1]+0.72, 0.16, "PLINTO 1.00x1.00", 0, 'middle')
    s.text('TEXTOS', (sx[0]+sx[1])/2, YS[0]-0.02, 0.15, "RIOSTRA e=0.20", 0, 'middle')
    cotas_generales(s)
    s.text('TEXTOS', (X0+X1)/2, Y1+EXT+0.6, 0.34, "PLANTA DE CIMENTACION", 0, 'middle')
    return s

# ==========================================================================
# Emision de laminas individuales y lamina general combinada
# ==========================================================================
def emit(build, titulo, lamina, name):
    s = build()
    membrete(s, titulo, lamina)
    write_dxf(s, f"planos/{name}.dxf")
    write_svg(s, f"planos/{name}.svg")

def translate(master, s, ox, oy):
    for p in s.prims:
        k = p[0]
        if k == 'line':
            master.prims.append((k, p[1], p[2]+ox, p[3]+oy, p[4]+ox, p[5]+oy))
        elif k == 'circle':
            master.prims.append((k, p[1], p[2]+ox, p[3]+oy, p[4]))
        elif k == 'arc':
            master.prims.append((k, p[1], p[2]+ox, p[3]+oy, p[4], p[5], p[6]))
        elif k == 'poly':
            master.prims.append((k, p[1], [(x+ox, y+oy) for x, y in p[2]], p[3]))
        elif k == 'text':
            master.prims.append((k, p[1], p[2]+ox, p[3]+oy, p[4], p[5], p[6], p[7]))
        elif k == 'erase':
            master.prims.append((k, p[1], p[2]+ox, p[3]+oy, p[4]+ox, p[5]+oy))

def place(master, s, dx, dy):
    b = s.bounds()
    translate(master, s, dx - b[0], dy - b[2])

def emit_combinado():
    sheets = [build_planta_baja(), build_primer_piso(),
              build_segundo_piso(), build_cimentacion()]
    bnds = [s.bounds() for s in sheets]
    W = max(b[1]-b[0] for b in bnds)
    H = max(b[3]-b[2] for b in bnds)
    gap = 2.5
    pos = [(0, H+gap), (W+gap, H+gap), (0, 0), (W+gap, 0)]   # 2x2
    master = Sheet()
    for s, (dx, dy) in zip(sheets, pos):
        place(master, s, dx, dy)
    membrete(master, "PROYECTO: CASA 3 NIVELES", "LAMINA: 00")
    write_dxf(master, "planos/proyecto-completo.dxf")
    write_svg(master, "planos/proyecto-completo.svg", sc=30.0)

# ==========================================================================
if __name__ == "__main__":
    emit(build_planta_baja, "PLANTA BAJA", "LAMINA: 01", "arq-planta-baja")
    emit(build_primer_piso, "PRIMER PISO", "LAMINA: 02", "arq-primer-piso")
    emit(build_segundo_piso, "SEGUNDO PISO", "LAMINA: 03", "arq-segundo-piso")
    emit(build_cimentacion, "PLANTA DE CIMENTACION", "LAMINA: 01", "planta-cimentacion")
    emit_combinado()
    print("OK - 4 laminas individuales + 1 lamina general (proyecto-completo)")
    print(f"Casa {X1-X0:.2f} x {Y1-Y0:.2f} m | {len(XS)*len(YS)} columnas/plintos")
