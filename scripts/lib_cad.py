#!/usr/bin/env python3
"""
Mini-libreria CAD compartida: sistema de primitivas + escritura DXF (R12) y SVG.

Coordenadas en metros, Y hacia arriba (convencion CAD).
Primitivas:
  ('line', lay, x1,y1,x2,y2)
  ('circle', lay, cx,cy,r)
  ('arc', lay, cx,cy,r, a0,a1)          angulos en grados, CCW
  ('poly', lay, [(x,y)...], fill_bool)
  ('text', lay, x,y,h, s, rot, anchor)
  ('erase', None, x0,y0,x1,y1)          solo SVG (tapa poche en blanco)
"""
import math

# capa: (color ACI, color linea SVG, relleno SVG o None)
LAYERS = {
    'EJES':      (1, '#c0392b', None),
    'MUROS':     (7, '#1a1a1a', '#4a4a4a'),
    'PUERTAS':   (4, '#2c82c9', None),
    'VENTANAS':  (5, '#2c82c9', None),
    'ESCALERA':  (6, '#8e44ad', None),
    'MOBILIARIO':(9, '#8a8a8a', None),
    'COTAS':     (8, '#6a6a6a', None),
    'TEXTOS':    (3, '#111111', None),
    'COLUMNAS':  (7, '#111111', '#333333'),
    'PLINTOS':   (2, '#7a6c53', '#f3ede0'),
    'RIOSTRAS':  (4, '#5b7fa6', '#c9d6e5'),
    'MARCO':     (7, '#333333', None),
    'MEMBRETE':  (7, '#333333', None),
}


class Sheet:
    def __init__(self):
        self.prims = []

    # ---- primitivas ----
    def line(self, lay, x1, y1, x2, y2):
        self.prims.append(('line', lay, x1, y1, x2, y2))

    def circle(self, lay, cx, cy, r):
        self.prims.append(('circle', lay, cx, cy, r))

    def arc(self, lay, cx, cy, r, a0, a1):
        self.prims.append(('arc', lay, cx, cy, r, a0, a1))

    def poly(self, lay, pts, fill=False):
        self.prims.append(('poly', lay, pts, fill))

    def text(self, lay, x, y, h, s, rot=0, anchor='start'):
        self.prims.append(('text', lay, x, y, h, s, rot, anchor))

    def erase(self, x0, y0, x1, y1):
        self.prims.append(('erase', None, x0, y0, x1, y1))

    # ---- helpers geometricos ----
    def rect(self, lay, x0, y0, x1, y1, fill=False):
        self.poly(lay, [(x0, y0), (x1, y0), (x1, y1), (x0, y1)], fill)

    def band(self, lay, x1, y1, x2, y2, w, fill=True):
        """Banda (rectangulo) de ancho w centrada en el segmento A-B."""
        dx, dy = x2 - x1, y2 - y1
        L = math.hypot(dx, dy)
        ux, uy = dx / L, dy / L
        nx, ny = -uy, ux
        h = w / 2.0
        self.poly(lay, [(x1 + nx*h, y1 + ny*h), (x2 + nx*h, y2 + ny*h),
                        (x2 - nx*h, y2 - ny*h), (x1 - nx*h, y1 - ny*h)], fill)

    # ---- bounds ----
    def bounds(self):
        xs, ys = [], []
        for p in self.prims:
            k = p[0]
            if k == 'line':
                xs += [p[2], p[4]]; ys += [p[3], p[5]]
            elif k in ('circle', 'arc'):
                xs += [p[2]-p[4], p[2]+p[4]]; ys += [p[3]-p[4], p[3]+p[4]]
            elif k == 'poly':
                xs += [q[0] for q in p[2]]; ys += [q[1] for q in p[2]]
            elif k == 'text':
                xs.append(p[2]); ys.append(p[3])
            elif k == 'erase':
                xs += [p[2], p[4]]; ys += [p[3], p[5]]
        return min(xs), max(xs), min(ys), max(ys)


# ==========================================================================
# ESCRITURA DXF  (R12 ASCII, maxima compatibilidad)
# ==========================================================================
def _g(code, val):
    return f"{code}\n{val}\n"

def write_dxf(sheet, path):
    o = [_g(0, "SECTION") + _g(2, "HEADER") + _g(9, "$ACADVER") + _g(1, "AC1009")
         + _g(9, "$INSUNITS") + _g(70, 6) + _g(0, "ENDSEC")]
    o.append(_g(0, "SECTION") + _g(2, "TABLES"))
    o.append(_g(0, "TABLE") + _g(2, "LTYPE") + _g(70, 1)
             + _g(0, "LTYPE") + _g(2, "CONTINUOUS") + _g(70, 0)
             + _g(3, "Solid line") + _g(72, 65) + _g(73, 0) + _g(40, 0.0)
             + _g(0, "ENDTAB"))
    o.append(_g(0, "TABLE") + _g(2, "LAYER") + _g(70, len(LAYERS)))
    for name, (aci, _, _) in LAYERS.items():
        o.append(_g(0, "LAYER") + _g(2, name) + _g(70, 0) + _g(62, aci) + _g(6, "CONTINUOUS"))
    o.append(_g(0, "ENDTAB") + _g(0, "ENDSEC"))
    o.append(_g(0, "SECTION") + _g(2, "ENTITIES"))
    for p in sheet.prims:
        k, lay = p[0], p[1]
        if k == 'line':
            _, _, x1, y1, x2, y2 = p
            o.append(_g(0, "LINE") + _g(8, lay)
                     + _g(10, f"{x1:.4f}") + _g(20, f"{y1:.4f}") + _g(30, 0.0)
                     + _g(11, f"{x2:.4f}") + _g(21, f"{y2:.4f}") + _g(31, 0.0))
        elif k == 'circle':
            _, _, cx, cy, r = p
            o.append(_g(0, "CIRCLE") + _g(8, lay)
                     + _g(10, f"{cx:.4f}") + _g(20, f"{cy:.4f}") + _g(30, 0.0) + _g(40, f"{r:.4f}"))
        elif k == 'arc':
            _, _, cx, cy, r, a0, a1 = p
            o.append(_g(0, "ARC") + _g(8, lay)
                     + _g(10, f"{cx:.4f}") + _g(20, f"{cy:.4f}") + _g(30, 0.0)
                     + _g(40, f"{r:.4f}") + _g(50, f"{a0:.2f}") + _g(51, f"{a1:.2f}"))
        elif k == 'poly':
            pts = p[2]; n = len(pts)
            for i in range(n):
                x1, y1 = pts[i]; x2, y2 = pts[(i+1) % n]
                o.append(_g(0, "LINE") + _g(8, lay)
                         + _g(10, f"{x1:.4f}") + _g(20, f"{y1:.4f}") + _g(30, 0.0)
                         + _g(11, f"{x2:.4f}") + _g(21, f"{y2:.4f}") + _g(31, 0.0))
        elif k == 'text':
            _, _, x, y, h, s, rot, anchor = p
            just = {'start': 0, 'middle': 1, 'end': 2}[anchor]
            e = (_g(0, "TEXT") + _g(8, lay) + _g(10, f"{x:.4f}") + _g(20, f"{y:.4f}")
                 + _g(30, 0.0) + _g(40, f"{h:.4f}") + _g(1, s))
            if rot:
                e += _g(50, f"{rot:.2f}")
            if just:
                e += _g(72, just) + _g(11, f"{x:.4f}") + _g(21, f"{y:.4f}") + _g(31, 0.0)
            o.append(e)
        # 'erase' se ignora en DXF
    o.append(_g(0, "ENDSEC") + _g(0, "EOF"))
    with open(path, "w", encoding="utf-8") as f:
        f.write("".join(o))


# ==========================================================================
# ESCRITURA SVG  (vista previa)
# ==========================================================================
def write_svg(sheet, path, sc=40.0, margin=0.6):
    bx0, bx1, by0, by1 = sheet.bounds()
    W = (bx1 - bx0 + 2*margin) * sc
    H = (by1 - by0 + 2*margin) * sc
    X = lambda x: (x - bx0 + margin) * sc
    Y = lambda y: (by1 - y + margin) * sc     # flip Y

    o = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W:.0f}" height="{H:.0f}" '
         f'viewBox="0 0 {W:.0f} {H:.0f}" font-family="Arial, sans-serif">',
         f'<rect width="{W:.0f}" height="{H:.0f}" fill="#ffffff"/>']
    for p in sheet.prims:
        k, lay = p[0], p[1]
        col = LAYERS[lay][1] if lay else None
        if k == 'line':
            _, _, x1, y1, x2, y2 = p
            dash = ' stroke-dasharray="10 3 2 3"' if lay == 'EJES' else ''
            lw = 1.6 if lay == 'MUROS' else 1.0
            o.append(f'<line x1="{X(x1):.1f}" y1="{Y(y1):.1f}" x2="{X(x2):.1f}" '
                     f'y2="{Y(y2):.1f}" stroke="{col}" stroke-width="{lw}"{dash}/>')
        elif k == 'circle':
            _, _, cx, cy, r = p
            o.append(f'<circle cx="{X(cx):.1f}" cy="{Y(cy):.1f}" r="{r*sc:.1f}" '
                     f'fill="#ffffff" stroke="{col}" stroke-width="1"/>')
        elif k == 'arc':
            _, _, cx, cy, r, a0, a1 = p
            pts = []
            steps = 18
            for i in range(steps + 1):
                a = math.radians(a0 + (a1 - a0) * i / steps)
                pts.append(f"{X(cx + r*math.cos(a)):.1f},{Y(cy + r*math.sin(a)):.1f}")
            o.append(f'<polyline points="{" ".join(pts)}" fill="none" '
                     f'stroke="{col}" stroke-width="0.9"/>')
        elif k == 'poly':
            fill = LAYERS[lay][2] if (p[3] and LAYERS[lay][2]) else 'none'
            pts = " ".join(f"{X(x):.1f},{Y(y):.1f}" for x, y in p[2])
            lw = 1.5 if lay == 'MUROS' else 1.1
            o.append(f'<polygon points="{pts}" fill="{fill}" stroke="{col}" stroke-width="{lw}"/>')
        elif k == 'text':
            _, _, x, y, h, s, rot, anchor = p
            tr = f' transform="rotate({-rot} {X(x):.1f} {Y(y):.1f})"' if rot else ''
            o.append(f'<text x="{X(x):.1f}" y="{Y(y):.1f}" font-size="{h*sc:.0f}" '
                     f'text-anchor="{anchor}" fill="{col}"{tr}>{s}</text>')
        elif k == 'erase':
            _, _, x0, y0, x1, y1 = p
            o.append(f'<rect x="{X(min(x0,x1)):.1f}" y="{Y(max(y0,y1)):.1f}" '
                     f'width="{abs(x1-x0)*sc:.1f}" height="{abs(y1-y0)*sc:.1f}" fill="#ffffff"/>')
    o.append('</svg>')
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(o))
