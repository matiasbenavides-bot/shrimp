#!/usr/bin/env python3
"""Logo de Shrimp: un camarón low-poly construido con triángulos de colores.

Todo es paramétrico: la espina dorsal del cuerpo es un arco, y de ahí salen los
triángulos (cuerpo segmentado, abanico de la cola, patas, antenas, rostro y ojo).
Al final la geometría se ajusta a un recuadro, así que la composición queda
centrada sin depender de números mágicos.

Perfil del cuerpo: se define por puntos de control (grueso en la cabeza, fino en
la cola) en vez de una fórmula, para poder afinarlo a ojo.

Escribe los SVG de origen en design/. La rasterización a assets/ la hace
scripts/render-logo.sh con rsvg-convert.
"""

import math
import os

W = H = 1024
BG = "#0f172a"  # slate-950, el fondo de la app

# Del coral al violeta: los triángulos cambian de color a lo largo del cuerpo
PALETTE = [
    "#ff6b6b", "#ff8e53", "#ffb703", "#a3e635",
    "#2dd4bf", "#38bdf8", "#818cf8", "#c084fc",
]

# --- cuerpo ---
CX, CY, R = 505.0, 512.0, 224.0
TH_HEAD, TH_TAIL = -68.0, 130.0      # barrido ~200°: la cola se recoge bajo el cuerpo
SEGMENTS = 10
# semiancho del cuerpo en t = 0 (cabeza) … 1 (cola): cabeza gruesa, cola fina
WIDTHS = [(0.00, 112.0), (0.10, 126.0), (0.28, 112.0), (0.50, 92.0), (0.70, 66.0), (0.86, 44.0), (1.00, 52.0)]
# dónde nacen y acaban las patas (t): pocas y gruesas, para que no tapen la cola
LEG_FROM, LEG_TO, LEG_COUNT = 0.30, 0.74, 4


def shade(hex_color: str, factor: float) -> str:
    """Aclara (factor>1) u oscurece (factor<1) un color hex."""
    r = int(hex_color[1:3], 16)
    g = int(hex_color[3:5], 16)
    b = int(hex_color[5:7], 16)

    def f(v):
        return max(0, min(255, int(round(v * factor))))

    return f"#{f(r):02x}{f(g):02x}{f(b):02x}"


def arc_point(cx, cy, r, deg):
    a = math.radians(deg)
    return (cx + r * math.cos(a), cy + r * math.sin(a))


def unit(a):
    m = math.hypot(*a)
    return (a[0] / m, a[1] / m) if m else (0.0, 0.0)


def rot(v, deg):
    a = math.radians(deg)
    return (v[0] * math.cos(a) - v[1] * math.sin(a), v[0] * math.sin(a) + v[1] * math.cos(a))


def width_at(t: float) -> float:
    """Interpola el perfil de anchura del cuerpo."""
    if t <= WIDTHS[0][0]:
        return WIDTHS[0][1]
    for (t0, w0), (t1, w1) in zip(WIDTHS, WIDTHS[1:]):
        if t <= t1:
            k = (t - t0) / (t1 - t0)
            return w0 + (w1 - w0) * k
    return WIDTHS[-1][1]


class Tri:
    __slots__ = ("pts", "color", "opacity")

    def __init__(self, pts, color, opacity=1.0):
        self.pts = pts
        self.color = color
        self.opacity = opacity


class Dot:
    __slots__ = ("c", "r", "color")

    def __init__(self, c, r, color):
        self.c = c
        self.r = r
        self.color = color


# --------------------------------------------------------------------------
# geometría (espacio de diseño; luego se ajusta al lienzo)
# --------------------------------------------------------------------------
def build():
    tris, dots = [], []

    spine = [arc_point(CX, CY, R, TH_HEAD + (TH_TAIL - TH_HEAD) * (i / SEGMENTS))
             for i in range(SEGMENTS + 1)]

    # --- cuerpo: cada segmento es un cuadrilátero partido en 2 triángulos ---
    tail_edge = None      # borde final del cuerpo: de ahí nace el abanico de la cola
    for i in range(SEGMENTS):
        t = (i + 0.5) / SEGMENTS
        p0, p1 = spine[i], spine[i + 1]
        w0, w1 = width_at(i / SEGMENTS), width_at((i + 1) / SEGMENTS)
        rad0, rad1 = unit((p0[0] - CX, p0[1] - CY)), unit((p1[0] - CX, p1[1] - CY))
        out0 = (p0[0] + rad0[0] * w0, p0[1] + rad0[1] * w0)
        in0 = (p0[0] - rad0[0] * w0, p0[1] - rad0[1] * w0)
        out1 = (p1[0] + rad1[0] * w1, p1[1] + rad1[1] * w1)
        in1 = (p1[0] - rad1[0] * w1, p1[1] - rad1[1] * w1)
        base = PALETTE[i % len(PALETTE)]
        tris.append(Tri([out0, out1, in1], base))
        tris.append(Tri([out0, in1, in0], shade(base, 0.72)))
        if i == SEGMENTS - 1:
            tail_edge = (in1, out1)

    # --- patas: cortas y gruesas, hacia dentro del arco ---
    for k in range(LEG_COUNT):
        t = LEG_FROM + (LEG_TO - LEG_FROM) * (k / (LEG_COUNT - 1))
        idx = t * SEGMENTS
        i0 = min(SEGMENTS - 1, int(idx))
        f = idx - i0
        p0, p1 = spine[i0], spine[i0 + 1]
        center = (p0[0] + (p1[0] - p0[0]) * f, p0[1] + (p1[1] - p0[1]) * f)
        w = width_at(t)
        radial = unit((center[0] - CX, center[1] - CY))
        inward = (-radial[0], -radial[1])
        tang = unit((p1[0] - p0[0], p1[1] - p0[1]))
        anchor = (center[0] - radial[0] * w * 0.85, center[1] - radial[1] * w * 0.85)
        tip = (anchor[0] + inward[0] * 40, anchor[1] + inward[1] * 40)
        b1 = (anchor[0] + tang[0] * 18 + inward[0] * 5, anchor[1] + tang[1] * 18 + inward[1] * 5)
        b2 = (anchor[0] - tang[0] * 18 + inward[0] * 5, anchor[1] - tang[1] * 18 + inward[1] * 5)
        tris.append(Tri([b1, b2, tip], shade(PALETTE[(i0 + 3) % len(PALETTE)], 0.58)))

    # --- cola: abanico de placas que nace del propio borde final del cuerpo ---
    # Las placas se abren alrededor de la TANGENTE (la dirección en la que va el
    # cuerpo), no de la radial: si se abren en radial, media cola queda escondida
    # dentro del arco.
    tail = spine[-1]
    tangent = unit((tail[0] - spine[-2][0], tail[1] - spine[-2][1]))
    te_in, te_out = tail_edge
    n_blades = 4
    spread = (-48, -16, 16, 48)
    edges = [(te_in[0] + (te_out[0] - te_in[0]) * (k / n_blades),
              te_in[1] + (te_out[1] - te_in[1]) * (k / n_blades)) for k in range(n_blades + 1)]
    for k in range(n_blades):
        b1, b2 = edges[k], edges[k + 1]
        mid = ((b1[0] + b2[0]) / 2, (b1[1] + b2[1]) / 2)
        d = rot(tangent, spread[k])
        tip = (mid[0] + d[0] * 96, mid[1] + d[1] * 96)
        tris.append(Tri([b1, b2, tip], PALETTE[(3 + k * 2) % len(PALETTE)]))

    # --- cabeza ---
    head, nxt = spine[0], spine[1]
    head_dir = unit((head[0] - nxt[0], head[1] - nxt[1]))       # hacia fuera de la cabeza
    rad_h = unit((head[0] - CX, head[1] - CY))
    w_head = width_at(0.0)

    # antenas: dos, largas, saliendo del frente de la cabeza
    ant_colors = (PALETTE[2], PALETTE[6])  # ámbar y violeta: contrastan con la cabeza
    for k, ang in enumerate((-22, 16)):
        d = rot(head_dir, ang)
        base = (head[0] + head_dir[0] * 30, head[1] + head_dir[1] * 30)
        p = rot(d, 90)
        b1 = (base[0] + p[0] * 9, base[1] + p[1] * 9)
        b2 = (base[0] - p[0] * 9, base[1] - p[1] * 9)
        tip = (base[0] + d[0] * 232, base[1] + d[1] * 232)
        tris.append(Tri([b1, b2, tip], ant_colors[k]))

    # rostro: pico puntiagudo y bien visible en el frente de la cabeza
    ro_base = (head[0] + rad_h[0] * w_head * 0.42, head[1] + rad_h[1] * w_head * 0.42)
    d = unit((head_dir[0] * 0.9 + rad_h[0] * 0.45, head_dir[1] * 0.9 + rad_h[1] * 0.45))
    p = rot(d, 90)
    b1 = (ro_base[0] + p[0] * 24, ro_base[1] + p[1] * 24)
    b2 = (ro_base[0] - p[0] * 24, ro_base[1] - p[1] * 24)
    tip = (ro_base[0] + d[0] * 92, ro_base[1] + d[1] * 92)
    tris.append(Tri([b1, b2, tip], "#fcd34d"))

    # ojo: sobre el cuerpo de la cabeza, no en el borde
    eye = (head[0] + rad_h[0] * w_head * 0.10 + head_dir[0] * 30,
           head[1] + rad_h[1] * w_head * 0.10 + head_dir[1] * 30)
    dots.append(Dot(eye, 25, "#ffffff"))
    dots.append(Dot((eye[0] + head_dir[0] * 7, eye[1] + head_dir[1] * 7), 12, "#0f172a"))

    return tris, dots


def transform(tris, dots, canvas: int, fill: float, center=(0.5, 0.5)):
    xs, ys = [], []
    for t in tris:
        for x, y in t.pts:
            xs.append(x)
            ys.append(y)
    for d in dots:
        xs += [d.c[0] - d.r, d.c[0] + d.r]
        ys += [d.c[1] - d.r, d.c[1] + d.r]

    minx, maxx, miny, maxy = min(xs), max(xs), min(ys), max(ys)
    span = max(maxx - minx, maxy - miny)
    s = canvas * fill / span
    cx, cy = (minx + maxx) / 2, (miny + maxy) / 2
    tx, ty = canvas * center[0] - cx * s, canvas * center[1] - cy * s

    def f(p):
        return (p[0] * s + tx, p[1] * s + ty)

    return ([Tri([f(p) for p in t.pts], t.color, t.opacity) for t in tris],
            [Dot(f(d.c), d.r * s, d.color) for d in dots])


def emit(path: str, canvas: int, tris, dots, bg=None, radius=0):
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{canvas}" height="{canvas}" '
             f'viewBox="0 0 {canvas} {canvas}">']
    if bg:
        r = f'rx="{radius}" ' if radius else ""
        parts.append(f'  <rect width="{canvas}" height="{canvas}" {r}fill="{bg}"/>')
    for t in tris:
        pts = " ".join(f"{x:.1f},{y:.1f}" for x, y in t.pts)
        parts.append(f'  <polygon points="{pts}" fill="{t.color}" '
                     f'stroke="{shade(t.color, 0.60)}" stroke-width="2.5" stroke-linejoin="round"/>')
    for d in dots:
        parts.append(f'  <circle cx="{d.c[0]:.1f}" cy="{d.c[1]:.1f}" r="{d.r:.1f}" fill="{d.color}"/>')
    parts.append("</svg>")
    with open(path, "w", encoding="utf-8") as fh:
        fh.write("\n".join(parts) + "\n")
    print(f"escrito {path}  ({len(tris)} triángulos, {len(dots)} círculos)")


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    design = os.path.join(here, "..", "design")
    os.makedirs(design, exist_ok=True)
    tris, dots = build()

    t, d = transform(tris, dots, W, 0.76)
    emit(os.path.join(design, "icon.svg"), W, t, d, bg=BG, radius=180)

    t, d = transform(tris, dots, W, 0.60)
    emit(os.path.join(design, "icon-foreground.svg"), W, t, d)

    emit(os.path.join(design, "icon-background.svg"), W, [], [], bg=BG)

    t, d = transform(tris, dots, 2732, 0.42)
    emit(os.path.join(design, "splash.svg"), 2732, t, d, bg=BG)


if __name__ == "__main__":
    main()
