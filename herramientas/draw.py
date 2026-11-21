# Ilustraciones originales (SVG) para las preguntas con imagen.
import json

W, H = 320, 200
ASPH = "#5d6670"; LINE = "#ffffff"; GRASS = "#9bc58a"; WALK = "#d9d4c7"

def svg(body, w=W, h=H):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" role="img">{body}</svg>'

def bg(): return f'<rect width="{W}" height="{H}" fill="{GRASS}"/>'

def hroad(y0, y1, center="dash", x0=0, x1=W):
    s = f'<rect x="{x0}" y="{y0}" width="{x1-x0}" height="{y1-y0}" fill="{ASPH}"/>'
    m = (y0 + y1) / 2
    if center == "dash":
        s += f'<line x1="{x0}" y1="{m}" x2="{x1}" y2="{m}" stroke="{LINE}" stroke-width="3" stroke-dasharray="14 10"/>'
    elif center == "solid":
        s += f'<line x1="{x0}" y1="{m}" x2="{x1}" y2="{m}" stroke="{LINE}" stroke-width="3"/>'
    return s

def vroad(x0, x1, y0=0, y1=H, center="dash"):
    s = f'<rect x="{x0}" y="{y0}" width="{x1-x0}" height="{y1-y0}" fill="{ASPH}"/>'
    m = (x0 + x1) / 2
    if center == "dash":
        s += f'<line x1="{m}" y1="{y0}" x2="{m}" y2="{y1}" stroke="{LINE}" stroke-width="3" stroke-dasharray="14 10"/>'
    return s

def walk(x, y, w, h): return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{WALK}"/>'

def car(x, y, color="#2f6fb5", ang=0, L=40, Wd=22, label=None):
    # top-down car centred at x,y pointing right when ang=0
    s = (f'<g transform="translate({x} {y}) rotate({ang})">'
         f'<rect x="{-L/2}" y="{-Wd/2}" width="{L}" height="{Wd}" rx="6" fill="{color}" stroke="#1b1f24" stroke-width="1.5"/>'
         f'<rect x="{L*0.08}" y="{-Wd/2+3}" width="{L*0.22}" height="{Wd-6}" rx="2" fill="#cfe3f5"/>'
         f'<rect x="{-L*0.36}" y="{-Wd/2+3}" width="{L*0.16}" height="{Wd-6}" rx="2" fill="#cfe3f5"/>')
    s += '</g>'
    if label:
        s += f'<text x="{x}" y="{y+4}" font-size="11" font-weight="700" text-anchor="middle" fill="#fff">{label}</text>'
    return s

def truck(x, y, ang=0, color="#c8752b"):
    return (f'<g transform="translate({x} {y}) rotate({ang})">'
            f'<rect x="-40" y="-14" width="62" height="28" fill="#e9e3d6" stroke="#1b1f24" stroke-width="1.5"/>'
            f'<rect x="24" y="-13" width="18" height="26" rx="4" fill="{color}" stroke="#1b1f24" stroke-width="1.5"/>'
            f'</g>')

def bus(x, y, ang=0):
    return (f'<g transform="translate({x} {y}) rotate({ang})">'
            f'<rect x="-46" y="-13" width="92" height="26" rx="5" fill="#e3b23c" stroke="#1b1f24" stroke-width="1.5"/>'
            + ''.join(f'<rect x="{-38+i*16}" y="-9" width="10" height="18" fill="#cfe3f5"/>' for i in range(5)) +
            '</g>')

def person(x, y, color="#c0392b", r=6):
    return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{color}" stroke="#1b1f24" stroke-width="1.2"/><circle cx="{x}" cy="{y}" r="{r*0.45}" fill="#f2c9a0"/>'

def bike(x, y, ang=0):
    return (f'<g transform="translate({x} {y}) rotate({ang})"><rect x="-12" y="-2" width="24" height="4" fill="#1b1f24"/>'
            f'<circle cx="0" cy="0" r="5" fill="#2e8b57" stroke="#1b1f24"/></g>')

def arrow(x, y, ang=90, color="#e74c3c", size=1):
    # big pointer arrow, tip at x,y, pointing in direction ang (90 = down)
    return (f'<g transform="translate({x} {y}) rotate({ang-90}) scale({size})">'
            f'<path d="M0 0 L-10 -16 L-4 -16 L-4 -36 L4 -36 L4 -16 L10 -16 Z" fill="{color}" stroke="#fff" stroke-width="1.5"/></g>')

def label(x, y, t, size=12, color="#1b1f24", anchor="middle", bgc=None):
    s = ""
    if bgc:
        s += f'<rect x="{x-len(t)*size*0.32}" y="{y-size}" width="{len(t)*size*0.64}" height="{size+5}" rx="3" fill="{bgc}"/>'
    return s + f'<text x="{x}" y="{y}" font-family="Arial,Helvetica,sans-serif" font-size="{size}" font-weight="700" text-anchor="{anchor}" fill="{color}">{t}</text>'

def zebra(x0, y0, x1, y1, vertical=True, n=6):
    s = ""
    if vertical:  # stripes across a horizontal road, crossing runs vertically
        w = x1 - x0
        step = (y1 - y0) / (2 * n)
        for i in range(n):
            s += f'<rect x="{x0}" y="{y0 + (2*i+0.5)*step}" width="{w}" height="{step}" fill="#fff"/>'
    else:
        h = y1 - y0
        step = (x1 - x0) / (2 * n)
        for i in range(n):
            s += f'<rect x="{x0 + (2*i+0.5)*step}" y="{y0}" width="{step}" height="{h}" fill="#fff"/>'
    return s

def blinker(x, y): return f'<circle cx="{x}" cy="{y}" r="5" fill="#ffb000" stroke="#fff" stroke-width="1.5"/>'

# ---------- señales ----------
SW = 200
def sign_svg(body): return svg(body, SW, SW)

def rombo(inner):
    return sign_svg(f'<g transform="translate(100 100) rotate(45)"><rect x="-62" y="-62" width="124" height="124" rx="10" fill="#f7c600" stroke="#1b1f24" stroke-width="6"/></g>{inner}')

def circulo(inner, bar=False):
    s = f'<circle cx="100" cy="100" r="78" fill="#fff" stroke="#d0021b" stroke-width="16"/>{inner}'
    if bar:
        s += '<line x1="48" y1="152" x2="152" y2="48" stroke="#d0021b" stroke-width="14"/>'
    return sign_svg(s)

def ped_icon(x, y, s=1, c="#1b1f24"):
    return (f'<g transform="translate({x} {y}) scale({s})" fill="{c}"><circle cx="0" cy="-30" r="8"/>'
            f'<path d="M-6 -20 L6 -20 L10 4 L4 4 L8 30 L1 30 L-2 8 L-6 30 L-13 30 L-8 4 L-11 4 Z"/></g>')

def bike_icon(x, y, s=1):
    return (f'<g transform="translate({x} {y}) scale({s})" fill="none" stroke="#1b1f24" stroke-width="6">'
            f'<circle cx="-24" cy="12" r="16"/><circle cx="24" cy="12" r="16"/>'
            f'<path d="M-24 12 L-6 -12 L14 -12 L24 12 M-6 -12 L4 12 L-24 12 M14 -12 L10 -22 L2 -22"/></g>')

SIGNS = {
    "vel60": circulo(label(100, 125, "60", 70)),
    "vel50": circulo(label(100, 125, "50", 70)),
    "resbaladizo": rombo('<g transform="translate(100 92)"><rect x="-22" y="-26" width="44" height="34" rx="8" fill="#1b1f24"/>'
                         '<path d="M-34 30 q10 -14 0 -26 M0 30 q10 -14 0 -26 M34 30 q10 -14 0 -26" stroke="#1b1f24" stroke-width="5" fill="none"/></g>'),
    "noadelantar": circulo('<rect x="52" y="86" width="40" height="28" rx="6" fill="#1b1f24"/><rect x="108" y="86" width="40" height="28" rx="6" fill="#d0021b"/>'),
    "pare": sign_svg('<polygon points="58,10 142,10 190,58 190,142 142,190 58,190 10,142 10,58" fill="#d0021b" stroke="#fff" stroke-width="8"/>' + label(100, 120, "PARE", 52, "#fff")),
    "semaforo": rombo('<rect x="84" y="52" width="32" height="96" rx="8" fill="#1b1f24"/><circle cx="100" cy="72" r="10" fill="#e74c3c"/><circle cx="100" cy="100" r="10" fill="#f39c12"/><circle cx="100" cy="128" r="10" fill="#2ecc71"/>'),
    "dossentidos": rombo('<path d="M80 150 V70 H68 L84 46 L100 70 H88 V150 Z M120 50 V130 H132 L116 154 L100 130 H112 V50 Z" fill="#1b1f24"/>'),
    "peatones": rombo('<rect x="62" y="130" width="76" height="8" fill="#1b1f24"/><rect x="62" y="142" width="76" height="6" fill="#1b1f24"/>' + ped_icon(100, 98, 1.3)),
    "ciclistas": rombo(bike_icon(100, 100, 1.1)),
    "escolares": rombo(ped_icon(84, 106, 1.05) + ped_icon(118, 112, 0.85)),
    "curvas": rombo('<path d="M86 150 C 86 125, 118 120, 118 100 C 118 80, 86 75, 86 55 L 74 62 L 92 38 L 104 64 L 94 60 C 96 75, 128 80, 128 100 C 128 128, 96 128, 96 150 Z" fill="#1b1f24"/>'),
    "curva": rombo('<path d="M86 150 V95 C 86 70, 100 62, 118 62 V50 L140 70 L118 90 V76 C 106 76, 98 82, 98 96 V150 Z" fill="#1b1f24"/>'),
    "cedaelpaso": sign_svg('<polygon points="16,24 184,24 100,176" fill="#fff" stroke="#d0021b" stroke-width="14" stroke-linejoin="round"/>' + label(100, 70, "CEDA EL", 22, "#1b1f24") + label(100, 96, "PASO", 22, "#1b1f24")),
    "rect_azul": sign_svg('<rect x="20" y="40" width="160" height="120" rx="10" fill="#1f5fae" stroke="#fff" stroke-width="6"/>' + label(100, 112, "INFO", 34, "#fff")),
    "rect_verde": sign_svg('<rect x="10" y="50" width="180" height="100" rx="10" fill="#1d7f45" stroke="#fff" stroke-width="6"/>' + label(100, 112, "SANTIAGO →", 24, "#fff")),
    "prohibido": circulo('<rect x="60" y="88" width="80" height="24" fill="#1b1f24"/>', bar=True),
    "rombo_vacio": rombo(label(100, 118, "!", 64)),
}

# ---------- escenas ----------
def scene_99():
    s = bg() + walk(0, 36, W, 24) + hroad(60, 180) + walk(0, 180, W, 20)
    s += car(90, 166, "#7a7f86")
    s += label(90, 198, "auto estacionado", 10)
    s += f'<rect x="170" y="150" width="72" height="28" rx="5" fill="#f4f1ea" stroke="#1b1f24" stroke-width="1.5"/>' + label(206, 169, "HELADOS", 12, "#d0021b")
    s += person(262, 190, "#e67e22", 7) + label(276, 196, "niño", 10, anchor="start")
    s += car(30, 132, "#2f6fb5") + arrow(30, 117, 90, size=0.7)
    return svg(s)

def scene_107():
    s = bg() + walk(0, 30, W, 25) + hroad(55, 155, center="none") + walk(0, 155, W, 25)
    for x in range(30, 320, 60):
        s += car(x, 68, "#8e44ad" if x % 120 else "#7a7f86", 0, 40, 20)
        s += car(x + 20, 142, "#16a085" if x % 120 else "#7a7f86", 0, 40, 20)
    s += car(150, 105, "#2f6fb5") + arrow(150, 92, 90)
    return svg(s)

def scene_108():
    s = bg() + walk(0, 30, W, 30) + hroad(60, 160) + walk(0, 160, W, 30)
    s += zebra(200, 60, 240, 160, vertical=True, n=6)
    s += car(150, 135, "#2f6fb5") + arrow(150, 120, 90)
    s += person(220, 118, "#c0392b")
    s += person(212, 172, "#27ae60") + person(230, 176, "#8e44ad")
    return svg(s)

def scene_111():
    s = '<rect width="320" height="200" fill="#a9c7e3"/><rect y="120" width="320" height="80" fill="#5d6670"/>'
    s += '<rect x="90" y="40" width="140" height="110" fill="#e9e3d6" stroke="#1b1f24" stroke-width="2"/>'
    s += label(160, 95, "TRANSPORTES", 13)
    s += '<rect x="100" y="150" width="20" height="20" fill="#1b1f24"/><rect x="200" y="150" width="20" height="20" fill="#1b1f24"/>'
    s += '<rect x="96" y="132" width="16" height="10" fill="#7a1f1f"/>'
    s += '<rect x="208" y="132" width="16" height="10" fill="#ffb000" stroke="#fff"/>'
    s += '<path d="M228 126 l14 -8 M230 137 h16 M228 148 l14 8" stroke="#ffb000" stroke-width="3"/>'
    return svg(s)

def scene_114():
    s = bg() + walk(0, 30, 230, 25) + walk(0, 155, 230, 25) + hroad(55, 155, center="dash", x1=320)
    s += vroad(240, 300, 0, 200, center="none") + hroad(55, 155, center="dash", x0=230, x1=320)
    for x in (30, 90, 150):
        s += car(x, 142, "#7a7f86", 0, 40, 20)
    s += car(40, 118, "#2f6fb5") + arrow(40, 104, 90, size=0.8)
    s += bike(170, 80, 180) + person(170, 80, "#16a085", 5)
    return svg(s)

def scene_115():
    s = bg() + hroad(60, 160) + walk(0, 160, W, 30)
    s += bus(200, 142)
    s += f'<rect x="250" y="164" width="40" height="8" fill="#555"/>' + label(270, 192, "PARADA", 10)
    s += person(258, 178, "#27ae60") + person(278, 180, "#c0392b")
    s += car(50, 142, "#2f6fb5") + arrow(50, 126, 90, size=0.8)
    s += '<circle cx="30" cy="30" r="20" fill="#fff" stroke="#d0021b" stroke-width="5"/>' + label(30, 36, "70", 16)
    return svg(s)

def scene_116():
    s = bg() + hroad(60, 140)
    s += car(60, 120, "#2f6fb5") + arrow(60, 104, 90, size=0.8)
    s += person(170, 132, "#c0392b") + person(186, 134, "#8e44ad")
    s += car(250, 80, "#e67e22", 180)
    return svg(s)

def scene_138():
    s = bg() + vroad(110, 210, center="none") + hroad(30, 90, center="none")
    s += '<line x1="160" y1="90" x2="160" y2="200" stroke="#fff" stroke-width="3" stroke-dasharray="14 10"/>'
    s += '<path d="M150 190 v-26 h-6 l10 -14 l10 14 h-6 v26 z" fill="#fff"/><path d="M190 190 v-26 h-6 l10 -14 l10 14 h-6 v26 z" fill="#fff"/>'
    s += car(135, 125, "#2f6fb5", -90) + arrow(135, 106, 90, size=0.7)
    s += blinker(124, 108)
    s += label(60, 24, "calle de destino", 11)
    return svg(s)

def scene_146():
    s = '<rect width="320" height="200" fill="#20262e"/>'
    s += '<path d="M60 160 A100 100 0 0 1 260 160" fill="none" stroke="#e8edf3" stroke-width="6"/>'
    import math
    for i, v in enumerate([0, 20, 40, 60, 80, 100, 120, 140, 160, 180]):
        a = math.pi * (1 - i / 9)
        x1, y1 = 160 + 92 * math.cos(a), 160 - 92 * math.sin(a)
        x2, y2 = 160 + 80 * math.cos(a), 160 - 80 * math.sin(a)
        s += f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="#e8edf3" stroke-width="3"/>'
        s += label(160 + 66 * math.cos(a), 164 - 66 * math.sin(a), str(v), 11, "#e8edf3")
    a = math.pi * (1 - 90 / 180)
    s += f'<line x1="160" y1="160" x2="{160 + 85*math.cos(a):.1f}" y2="{160 - 85*math.sin(a):.1f}" stroke="#e74c3c" stroke-width="5"/><circle cx="160" cy="160" r="8" fill="#e74c3c"/>'
    s += label(160, 192, "km/h", 12, "#e8edf3")
    return svg(s)

def scene_148():
    s = bg() + hroad(55, 155, center="solid")
    s += truck(170, 130) + car(90, 130, "#2f6fb5") + arrow(90, 114, 90, size=0.8)
    s += car(270, 80, "#e67e22", 180)
    return svg(s)

def scene_149():
    s = bg() + hroad(55, 155)
    s += car(150, 130, "#7a7f86", 0, 40, 22, "A")
    s += car(170, 80, "#2f6fb5") + arrow(170, 64, 90, size=0.8)
    s += car(70, 130, "#e67e22")
    s += '<path d="M90 120 q20 -30 50 -38" stroke="#e67e22" stroke-width="3" fill="none" stroke-dasharray="6 5"/>'
    s += car(290, 80, "#8e44ad", 180)
    return svg(s)

def scene_169():
    s = bg() + walk(0, 30, W, 30) + hroad(60, 160) + walk(0, 160, W, 30)
    s += zebra(190, 60, 240, 160, vertical=True, n=6)
    s += person(215, 92, "#c0392b") + person(225, 104, "#e67e22", 5)
    s += car(110, 135, "#2f6fb5") + arrow(110, 120, 90, size=0.8)
    return svg(s)

def scene_262():
    s = bg() + hroad(50, 150, center="none")
    s += '<line x1="0" y1="97" x2="320" y2="97" stroke="#fff" stroke-width="3" stroke-dasharray="16 10"/>'
    s += '<line x1="0" y1="105" x2="320" y2="105" stroke="#fff" stroke-width="3"/>'
    s += label(30, 80, "A", 22, "#fff") + label(30, 138, "B", 22, "#fff")
    s += '<path d="M290 75 h-30 l8 -6 M260 75 l8 6" stroke="#fff" stroke-width="3" fill="none"/>'
    s += '<path d="M260 128 h30 l-8 -6 M290 128 l-8 6" stroke="#fff" stroke-width="3" fill="none"/>'
    return svg(s)

def scene_263():
    s = bg() + hroad(40, 160, center="none")
    s += '<rect x="80" y="88" width="160" height="24" fill="none" stroke="#fff" stroke-width="3"/>'
    s += ''.join(f'<line x1="{x}" y1="112" x2="{x+24}" y2="88" stroke="#fff" stroke-width="3"/>' for x in range(80, 230, 16))
    s += car(160, 100, "#2f6fb5", 0) + arrow(160, 86, 90, size=0.8)
    s += car(50, 140, "#7a7f86") + car(270, 60, "#e67e22", 180)
    return svg(s)

def scene_92():
    s = bg() + hroad(80, 150, center="none") + vroad(40, 90, 0, 80, center="none")
    s += car(65, 52, "#e67e22", 90)
    s += person(230, 142, "#c0392b")
    s += car(140, 132, "#2f6fb5") + arrow(140, 116, 90, size=0.8)
    return svg(s)

SCENES = {99: scene_99(), 107: scene_107(), 108: scene_108(), 111: scene_111(), 114: scene_114(),
          115: scene_115(), 116: scene_116(), 138: scene_138(), 146: scene_146(), 148: scene_148(),
          149: scene_149(), 169: scene_169(), 262: scene_262(), 263: scene_263(), 92: scene_92(),
          7: svg('<rect width="320" height="200" fill="#20262e"/><g transform="translate(160 108)">'
                 '<polygon points="0,-62 60,44 -60,44" fill="none" stroke="#e74c3c" stroke-width="10" stroke-linejoin="round"/>'
                 '<polygon points="0,-28 28,22 -28,22" fill="none" stroke="#e74c3c" stroke-width="8" stroke-linejoin="round"/></g>'),
          205: SIGNS["escolares"], 244: SIGNS["vel60"], 245: SIGNS["vel50"], 247: SIGNS["resbaladizo"],
          248: SIGNS["noadelantar"], 250: SIGNS["pare"], 251: SIGNS["semaforo"], 255: SIGNS["dossentidos"],
          256: SIGNS["peatones"], 258: SIGNS["ciclistas"], 265: SIGNS["cedaelpaso"]}

OPTION_IMGS = {
    249: [SIGNS["rombo_vacio"], SIGNS["rect_azul"], SIGNS["prohibido"], SIGNS["rect_verde"]],
    257: [SIGNS["curva"], SIGNS["curvas"], SIGNS["dossentidos"], SIGNS["resbaladizo"]],
    259: [SIGNS["peatones"], SIGNS["ciclistas"], SIGNS["semaforo"], SIGNS["escolares"]],
}

if __name__ == "__main__":
    import os
    os.makedirs("preview", exist_ok=True)
    for k, v in {**{str(k): v for k, v in SCENES.items()}, **{f"o{k}_{i}": s for k, l in OPTION_IMGS.items() for i, s in enumerate(l)}}.items():
        open(f"preview/{k}.svg", "w").write(v)
    print(len(SCENES), "scenes")
