"""Builds the Workshop 3 diagrams as editable .excalidraw files.

Icons come from community libraries on https://libraries.excalidraw.com (copied into ./libraries).
Run:  python build_diagrams.py         -> src/*.excalidraw   (open/edit them on excalidraw.com)
Then: node tools/export_svg.js         -> svg/*.svg          (what the slides embed)
"""
from __future__ import annotations

import copy
import json
import random
from pathlib import Path

HERE = Path(__file__).parent
random.seed(7)

INK, MUTED = "#1e1e1e", "#868e96"
BLUE, BLUE_BG = "#1971c2", "#a5d8ff"
GREEN, GREEN_BG = "#2f9e44", "#b2f2bb"
RED, RED_BG = "#e03131", "#ffc9c9"
ORANGE, YELLOW_BG = "#f08c00", "#ffec99"
VIOLET, VIOLET_BG = "#6741d9", "#d0bfff"
FONT_HAND, FONT_CODE = 5, 3   # Excalifont, Cascadia

_LIBS: dict[str, list] = {}


def _lib(name: str) -> list:
    if name not in _LIBS:
        data = json.loads((HERE / "libraries" / f"{name}.excalidrawlib").read_text())
        _LIBS[name] = [i["elements"] for i in data["libraryItems"]] if "libraryItems" in data else data["library"]
    return _LIBS[name]


def _uid() -> str:
    return "".join(random.choice("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789") for _ in range(20))


def _bbox(els: list) -> tuple[float, float, float, float]:
    xs, ys = [], []
    for e in els:
        if e.get("points"):
            xs += [e["x"] + p[0] for p in e["points"]]
            ys += [e["y"] + p[1] for p in e["points"]]
        else:
            xs += [e["x"], e["x"] + e["width"]]
            ys += [e["y"], e["y"] + e["height"]]
    return min(xs), min(ys), max(xs), max(ys)


class Scene:
    def __init__(self, name: str):
        self.name, self.els, self.cur = name, [], 0

    def step(self, n: int | None = None) -> "Scene":
        """Everything drawn after this appears on the next click in the deck (step 0 = on slide entry)."""
        self.cur = self.cur + 1 if n is None else n
        return self

    def _base(self, kind: str, x: float, y: float, w: float, h: float, **kw) -> dict:
        e = {"id": _uid(), "type": kind, "x": x, "y": y, "width": w, "height": h, "angle": 0,
             "strokeColor": kw.get("stroke", INK), "backgroundColor": kw.get("bg", "transparent"),
             "fillStyle": kw.get("fill", "hachure"), "strokeWidth": kw.get("sw", 2),
             "strokeStyle": kw.get("style", "solid"), "roughness": kw.get("rough", 1), "opacity": 100,
             "groupIds": kw.get("groups", []), "frameId": None, "roundness": kw.get("roundness"),
             "seed": random.randint(1, 2**31), "version": 1, "versionNonce": random.randint(1, 2**31),
             "isDeleted": False, "boundElements": None, "updated": 1, "link": None, "locked": False, "customData": {"step": self.cur}}
        self.els.append(e)
        return e

    # ---- primitives -------------------------------------------------------------------------
    def text(self, cx: float, cy: float, s: str, size: int = 22, color: str = INK, align: str = "center",
             font: int = FONT_HAND, groups=None) -> dict:
        lines = s.split("\n")
        w = max(len(l) for l in lines) * size * 0.55
        h = len(lines) * size * 1.25
        x = {"center": cx - w / 2, "left": cx, "right": cx - w}[align]
        e = self._base("text", x, cy - h / 2, w, h, stroke=color, groups=groups or [])
        e.update({"text": s, "originalText": s, "fontSize": size, "fontFamily": font, "textAlign": align,
                  "verticalAlign": "middle", "containerId": None, "lineHeight": 1.25, "autoResize": True})
        return e

    def sticky(self, x, y, w, h, title: str, body: str, bg=YELLOW_BG, angle=0.0, tsize=24, bsize=20,
               tcolor=INK, font=FONT_HAND):
        """A sticky note: coloured card, title, body. Rect and texts share a centre, so they rotate together."""
        r = self._base("rectangle", x, y, w, h, stroke=INK, bg=bg, fill="solid", sw=1.5, roundness={"type": 3})
        r["angle"] = angle
        cx, cy = x + w / 2, y + h / 2
        lines = body.count("\n") + 1
        t1 = self.text(cx, y + 30, title, tsize, tcolor)
        t2 = self.text(cx, y + 30 + tsize * 0.8 + lines * bsize * 0.66, body, bsize, INK, font=font)
        for t in (t1, t2):   # rotate each text about the card centre
            import math
            tx, ty = t["x"] + t["width"] / 2 - cx, t["y"] + t["height"] / 2 - cy
            c, s = math.cos(angle), math.sin(angle)
            t["x"] += (tx * c - ty * s) - tx
            t["y"] += (tx * s + ty * c) - ty
            t["angle"] = angle
        return (x, y, w, h)

    def box(self, x, y, w, h, label: str = "", stroke=INK, bg="transparent", fill="solid", size=22,
            shape="rectangle", style="solid", label_color=None, sw=2, rough=1):
        self._base(shape, x, y, w, h, stroke=stroke, bg=bg, fill=fill, style=style, sw=sw, rough=rough,
                   roundness={"type": 3} if shape == "rectangle" else None)
        if label:
            self.text(x + w / 2, y + h / 2, label, size, label_color or INK)
        return (x, y, w, h)

    def arrow(self, x1, y1, x2, y2, color=INK, style="solid", label="", label_size=18, bend=0.0,
              head="arrow", sw=2, label_dy=-16):
        mx, my = (x2 - x1) / 2, (y2 - y1) / 2
        pts = [[0, 0], [mx - bend * (y2 - y1) / 4, my + bend * (x2 - x1) / 4], [x2 - x1, y2 - y1]] if bend \
            else [[0, 0], [x2 - x1, y2 - y1]]
        e = self._base("arrow", x1, y1, abs(x2 - x1), abs(y2 - y1), stroke=color, style=style, sw=sw,
                       roundness={"type": 2})
        e.update({"points": pts, "lastCommittedPoint": None, "startBinding": None, "endBinding": None,
                  "startArrowhead": None, "endArrowhead": head, "elbowed": False})
        if label:
            lx, ly = x1 + pts[1][0] if bend else (x1 + x2) / 2, y1 + pts[1][1] if bend else (y1 + y2) / 2
            self.text(lx, ly + label_dy, label, label_size, color)
        return e

    def line(self, pts: list, color=INK, sw=2, style="solid"):
        x0, y0 = pts[0]
        e = self._base("line", x0, y0, 1, 1, stroke=color, sw=sw, style=style)
        e.update({"points": [[px - x0, py - y0] for px, py in pts], "lastCommittedPoint": None,
                  "startBinding": None, "endBinding": None, "startArrowhead": None, "endArrowhead": None})
        return e

    def icon(self, lib: str, idx: int, cx: float, cy: float, w: float | None = None, h: float | None = None,
             drop_text: bool = False):
        """Place a library item centred on (cx, cy), scaled to width w or height h (whichever fits)."""
        src = copy.deepcopy(_lib(lib)[idx])
        if drop_text:
            src = [e for e in src if e["type"] != "text"]
        x0, y0, x1, y1 = _bbox(src)
        sw, sh = (w / (x1 - x0)) if w else None, (h / (y1 - y0)) if h else None
        s = min(v for v in (sw, sh) if v) if (sw or sh) else 1.0
        x, y = cx - (x1 - x0) * s / 2, cy - (y1 - y0) * s / 2
        ids = {e["id"]: _uid() for e in src}
        groups = {g: _uid() for e in src for g in e.get("groupIds", [])}
        top = _uid()
        for e in src:
            if e["type"] == "draw":
                e["type"] = "line"
            e["id"] = ids[e["id"]]
            e["x"], e["y"] = x + (e["x"] - x0) * s, y + (e["y"] - y0) * s
            e["width"], e["height"] = e["width"] * s, e["height"] * s
            if e.get("points"):
                e["points"] = [[p[0] * s, p[1] * s] + p[2:] for p in e["points"]]
            if e["type"] == "text":
                e["fontSize"] = max(10, e["fontSize"] * s)
            if e.get("containerId"):
                e["containerId"] = ids.get(e["containerId"])
            if e.get("boundElements"):
                e["boundElements"] = [{**b, "id": ids.get(b["id"], b["id"])} for b in e["boundElements"]]
            for k in ("startBinding", "endBinding"):
                if e.get(k):
                    e[k] = None
            e["groupIds"] = [groups[g] for g in e.get("groupIds", [])] + [top]
            e["frameId"] = None
            e["link"] = None
            e["customData"] = {"step": self.cur}
            e["strokeWidth"] = max(1, e.get("strokeWidth", 1) * min(1.0, max(s, 0.6)))
            self.els.append(e)
        return (x, y, (x1 - x0) * s, (y1 - y0) * s)

    def save(self):
        doc = {"type": "excalidraw", "version": 2, "source": "https://excalidraw.com",
               "elements": self.els, "appState": {"viewBackgroundColor": "#ffffff", "gridSize": None},
               "files": {}}
        (HERE / "src" / f"{self.name}.excalidraw").write_text(json.dumps(doc, ensure_ascii=False, indent=1))


# ---- the diagrams ---------------------------------------------------------------------------------
# Drawn at slide scale (~1440 px wide), so 24 px text here is 24 px on the projector.
# s.step() marks what appears on the next click.

def title_art():
    s = Scene("title-art")
    s.icon("youritjang_software-architecture", 4, 80, 290, h=170)
    s.text(80, 400, "articles", 24, MUTED)
    s.arrow(155, 290, 225, 290, MUTED)
    s.icon("kaligule_robots", 4, 320, 280, h=280)
    s.text(320, 450, "the judge", 24, MUTED)
    s.arrow(410, 290, 475, 290, MUTED)
    s.box(485, 60, 440, 450, "", stroke=INK, bg="#f8f9fa", fill="solid")
    s.text(705, 110, "scorecard", 34, INK)
    rows = [(3, "faithfulness", "0.86"), (3, "context recall", "0.82"), (3, "hit@5", "0.90"), (1, "citation grounded", "0.78")]
    for i, (idx, name, val) in enumerate(rows):
        cy = 195 + i * 85
        s.icon("toman_checkmarks", idx, 535, cy, h=54)
        s.text(578, cy, name, 28, INK, align="left")
        s.text(900, cy, val, 28, RED if idx == 1 else GREEN, align="right", font=FONT_CODE)
    return s


def day_map():
    s = Scene("day-map")
    st = [("xxxdeveloper_icons", 35, "W1 · Corpus", "articles.json"),
          ("youritjang_software-architecture", 1, "W2 · Hybrid RAG", "/ask + citations"),
          ("kaligule_robots", 1, "W3 · Evaluation", "scores + MLflow runs"),
          ("mateuszbaransanok_it-icons", 20, "W4 · Serving", "docker compose + p95"),
          ("devdaejungyoon_github-actions", 0, "W5 · Observe + Gate", "traces + CI gate")]
    xs = [150, 435, 720, 1005, 1290]

    def station(i):
        lib, idx, title, sub = st[i]
        s.icon(lib, idx, xs[i], 130, w=130, h=135, drop_text=True)
        s.text(xs[i], 252, title, 30, INK)
        s.text(xs[i], 294, sub, 22, MUTED)

    station(0); s.arrow(230, 130, 355, 130); station(1)
    s.step()
    s.box(xs[2] - 140, 30, 280, 300, stroke=ORANGE, bg=YELLOW_BG, fill="hachure", style="dashed")
    s.text(xs[2], 4, "you are here", 26, ORANGE)
    s.arrow(515, 130, 640, 130); station(2)
    s.step()
    s.arrow(800, 130, 925, 130); station(3); s.arrow(1085, 130, 1210, 130); station(4)
    s.step()
    s.arrow(790, 335, 858, 380, ORANGE, "dashed", bend=0.3)
    s.text(1005, 385, "every speed-up is\nre-scored with this eval", 21, ORANGE)
    s.arrow(760, 345, 1148, 405, ORANGE, "dashed", bend=0.75)
    s.text(1290, 400, "the CI gate runs this\neval on every PR", 21, ORANGE)
    return s


def exam_dashcam_brakes():
    s = Scene("exam-dashcam-brakes")
    panels = [
        ("Evaluation", "the exam", ORANGE, [("youritjang_stick-figures", 2, -70, 130), ("xxxdeveloper_icons", 4, 75, 110)],
         "Is it good enough to ship?", "before release · on every PR", "fixed golden set → scores",
         "20 golden questions →\nfaithfulness 0.86", "stops a bad release"),
        ("Observability", "the dashcam", BLUE, [("mateuszbaransanok_it-icons", 7, -70, 110), ("g-script_charts", 2, 80, 110)],
         "What is it doing, and why?", "after release · live traffic", "traces · dashboards · alerts",
         "trace shows: retrieval\nreturned Art. 45, not 44", "tells you afterwards"),
        ("Guardrails", "the brakes", RED, [("mateuszbaransanok_it-icons", 16, -70, 110), ("toman_checkmarks", 1, 75, 95)],
         "Should this answer go out?", "inside every request", "allow · block · redact",
         "blocks an answer that\nleaks a national ID", "stops a bad answer"),
    ]
    for i, (title, sub, col, icons, q, l1, l2, ex, pill) in enumerate(panels):
        if i:
            s.step()
            s.line([[i * 480, 0], [i * 480, 600]], MUTED, 1, "dashed")
        cx = 240 + i * 480
        s.text(cx, 30, title, 40, INK)
        s.text(cx, 80, sub, 30, col)
        for lib, idx, dx, size in icons:
            s.icon(lib, idx, cx + dx, 195, w=size, h=size, drop_text=True)
        s.text(cx, 310, q, 27, INK)
        s.text(cx, 352, l1, 22, MUTED)
        s.text(cx, 386, l2, 22, MUTED)
        s.box(cx - 200, 420, 400, 100, "", stroke=col, bg="#ffffff", fill="solid", style="dashed")
        s.text(cx, 440, "in our system", 17, col)
        s.text(cx, 482, ex, 22, INK)
        s.box(cx - 170, 545, 340, 56, pill, stroke=col, size=24, label_color=col)
    return s


def rag_failure_points():
    s = Scene("rag-failure-points")
    y = 210
    nodes = [(130, "xxxdeveloper_icons", 1, "corpus (W1)"), (420, "ferminrp_awesome-icons", 2, "retrieve + rerank"),
             (710, "youritjang_software-architecture", 4, "top-k articles"), (1000, "kaligule_robots", 2, "LLM writes"),
             (1290, "xxxdeveloper_icons", 0, "answer + citations")]
    for cx, lib, idx, label in nodes:
        s.icon(lib, idx, cx, y, w=110, h=110, drop_text=True)
        s.text(cx, y + 88, label, 25, INK)
    for a, b in zip(nodes, nodes[1:]):
        s.arrow(a[0] + 75, y, b[0] - 75, y)
    s.icon("dhtoran_stick-people", 1, 420, 40, h=95)
    s.text(470, 30, "“What is the age of majority?”", 22, MUTED, align="left")
    s.arrow(420, 92, 420, 150, MUTED)
    fails = [("parsing broke it", "Art. 147 glued to 148\nby the PDF parser"),
             ("wrong article", "age of majority →\nArt. 45, not Art. 44"),
             ("cut by top_k", "Art. 147(2) ranked #9,\nbut top_k = 5"),
             ("invented a ruling", "“must cancel if the loss\nis over a third”: no article"),
             ("phantom citation", "cites Art. 375,\nwhich it never retrieved")]
    for i, ((cx, *_), (head, ex)) in enumerate(zip(nodes, fails)):
        s.step()
        s.box(cx - 138, 350, 276, 140, "", stroke=RED, bg=RED_BG, fill="hachure")
        s.icon("toman_checkmarks", 0, cx - 128, 352, h=44)
        s.text(cx + 120, 368, str(i + 1), 24, RED)
        s.text(cx, 388, head, 25, INK)
        s.text(cx, 445, ex, 19, INK)
    s.step()
    s.line([[10, 520], [858, 520]], BLUE, 3)
    s.text(434, 556, "retrieval failures → measure with plain code, for free", 24, BLUE)
    s.line([[880, 520], [1430, 520]], GREEN, 3)
    s.text(1155, 556, "generation failures → need an LLM judge", 24, GREEN)
    return s


def rag_triad():
    s = Scene("rag-triad")

    def node(x, y, w, h, title, body, col, bg, style="solid"):
        s.box(x, y, w, h, "", stroke=col, bg=bg, fill="solid", style=style)
        s.text(x + w / 2, y + 26, title, 20, col)
        s.text(x + w / 2, y + h / 2 + 14, body, 21, INK)

    node(520, 20, 400, 120, "question", "Can a judge reduce an obligation\nmade onerous by exceptional events?", INK, YELLOW_BG)
    node(20, 450, 440, 160, "retrieved articles", "Art. 148 · good faith\nArt. 151 · obligations of parties\nArt. 89 · conclusion of contract", BLUE, BLUE_BG)
    node(980, 450, 440, 160, "answer", "“Contracts must be performed\nin good faith (Art. 148).”", GREEN, GREEN_BG)
    s.icon("dhtoran_stick-people", 4, 975, 80, h=100)
    s.step()
    s.arrow(590, 145, 400, 445, BLUE, sw=2.5)
    s.text(545, 255, "context precision", 26, BLUE, align="left")
    s.text(545, 295, "are the retrieved\narticles relevant?", 20, INK, align="left")
    s.text(545, 350, "1 of 3 useful → 0.33", 20, BLUE, align="left", font=FONT_CODE)
    s.step()
    s.arrow(465, 530, 975, 530, GREEN, sw=2.5)
    s.text(720, 462, "faithfulness", 26, GREEN)
    s.text(720, 497, "is every claim backed by the articles?", 20, INK)
    s.text(720, 568, "every claim is in Art. 148 → 1.0", 20, GREEN, font=FONT_CODE)
    s.step()
    s.arrow(1040, 445, 850, 145, GREEN, sw=2.5)
    s.text(1000, 250, "answer relevancy", 26, GREEN, align="left")
    s.text(1000, 290, "does it answer\nthe question?", 20, INK, align="left")
    s.text(1000, 345, "never says yes or no → 0.6", 20, GREEN, align="left", font=FONT_CODE)
    s.step()
    node(20, 20, 400, 120, "reference answer · written by a lawyer", "Yes: Art. 147(2) lets the judge\nreduce it to a reasonable limit.", VIOLET, VIOLET_BG, "dashed")
    s.arrow(220, 145, 220, 445, BLUE, "dashed", sw=2.5)
    s.text(242, 245, "context recall", 26, BLUE, align="left")
    s.text(242, 285, "did we retrieve what\nthe reference needs?", 20, INK, align="left")
    s.text(242, 342, "Art. 147 missing\n→ 0.0", 20, BLUE, align="left", font=FONT_CODE)
    s.step()
    s.box(330, 625, 780, 56, "faithfulness 1.0 · recall 0.0 → faithful, and still wrong", stroke=RED, bg=RED_BG,
          fill="hachure", size=26)
    return s


def golden_set_sources():
    s = Scene("golden-set-sources")
    sources = [("xxxdeveloper_icons", 1, "reference benchmark", "civil_code_rag_qa_benchmark.json", FONT_CODE),
               ("youritjang_stick-figures", 1, "lawyers write + approve", "the only real authority on the answer", FONT_HAND),
               ("kaligule_robots", 0, "an LLM drafts from an article", "a human checks every single one", FONT_HAND),
               ("ferminrp_awesome-icons", 14, "real questions that failed", "from Langfuse traces (W5)", FONT_HAND)]
    for i, (lib, idx, title, sub, font) in enumerate(sources):
        if i:
            s.step()
        cy = 70 + i * 150
        s.icon(lib, idx, 55, cy, w=90, h=95, drop_text=True)
        s.text(125, cy - 18, title, 27, INK, align="left")
        s.text(125, cy + 22, sub, 20 if font == FONT_HAND else 17, MUTED, align="left", font=font)
        s.arrow(590, cy, 745, 300, MUTED)
    s.step()
    s.box(760, 110, 420, 380, "", stroke=ORANGE, bg=YELLOW_BG, fill="hachure")
    s.text(970, 150, "golden_set.jsonl", 28, INK, font=FONT_CODE)
    s.box(785, 185, 370, 150, "", stroke=MUTED, bg="#ffffff", fill="solid", sw=1)
    s.text(800, 260, '{"id": "q007-ar",\n "type": "repealed",\n "gold_articles": [60],\n "pair_id": "p07", ...}', 19, INK,
           align="left", font=FONT_CODE)
    s.text(970, 415, "lookup · concept · multi-article\nrepealed · out of scope\nevery question in AR + EN", 21, INK)
    s.step()
    s.arrow(1190, 300, 1255, 300, INK)
    s.text(1265, 250, "versioned (DVC)", 23, INK, align="left")
    s.text(1265, 300, "hash in every run", 23, INK, align="left")
    s.text(1265, 350, "20 → 50 → 200+", 23, INK, align="left")
    return s


def llm_judge():
    s = Scene("llm-judge")
    s.sticky(30, 10, 360, 150, "question", "When can a judge reduce\nan onerous obligation?", BLUE_BG, -0.03)
    s.sticky(30, 185, 360, 160, "retrieved article", "Art. 147(2): exceptional events\n→ the judge may reduce it\nto a reasonable limit", YELLOW_BG, 0.025)
    s.sticky(30, 370, 360, 170, "answer under test", "“…the judge may reduce it,\nand must cancel the contract\nif a party lost over a third.”", GREEN_BG, -0.02)
    for cy in (85, 265, 455):
        s.arrow(400, cy, 470, 270, MUTED)
    s.step()
    s.icon("kaligule_robots", 4, 560, 270, h=260)
    s.box(660, 150, 270, 220, "", stroke=VIOLET, bg="#ffffff", fill="solid")
    s.text(795, 180, "rubric", 24, VIOLET)
    s.text(680, 265, "1  split into claims\n2  check each claim\n    against the article\n3  supported ÷ all", 20, INK, align="left")
    s.text(700, 440, "judge LLM", 28, INK)
    s.text(700, 478, "temperature 0 · structured output", 20, MUTED)
    s.step()
    s.arrow(940, 260, 1000, 260, INK)
    s.box(1010, 90, 420, 340, "", stroke=VIOLET, bg="#f3f0ff", fill="solid")
    s.text(1032, 260, '{\n "claims": [\n  "judge may reduce",\n  "must cancel if > 1/3"\n ],\n "verdicts": [1, 0],\n "reason": "claim 2 is not\n   in Art. 147",\n "score": 0.5\n}', 20, INK, align="left", font=FONT_CODE)
    return s


def eval_pipeline():
    s = Scene("eval-pipeline")
    # row 1: ask
    s.icon("xxxdeveloper_icons", 6, 90, 95, h=100, drop_text=True)
    s.text(90, 168, "golden_set.jsonl", 19, INK, font=FONT_CODE)
    s.arrow(150, 95, 245, 95)
    s.box(255, 50, 260, 95, "", stroke=INK, bg="#f8f9fa")
    s.text(385, 82, "runner.py", 24, INK, font=FONT_CODE)
    s.text(385, 117, "asks every question", 19, MUTED)
    s.arrow(520, 78, 690, 78, MUTED)
    s.text(605, 55, "question", 18, MUTED)
    s.arrow(690, 115, 520, 115, MUTED)
    s.text(605, 140, "answer + contexts", 18, MUTED)
    s.icon("mateuszbaransanok_it-icons", 20, 760, 95, h=110, drop_text=True)
    s.text(950, 80, "W2 API", 24, INK, align="left")
    s.text(950, 115, "POST /ask", 20, MUTED, align="left", font=FONT_CODE)
    # row 2: score
    s.step()
    scorers = [(240, "retrieval_metrics.py", "hit@k · MRR · nDCG", "free · deterministic", GREEN, GREEN_BG),
               (720, "legal_checks.py\nbilingual.py", "citations · repeal · AR = EN", "free · deterministic", GREEN, GREEN_BG)]
    for cx, name, sub, cost, col, bg in scorers:
        s.box(cx - 210, 250, 420, 160, "", stroke=col, bg=bg, fill="hachure")
        s.text(cx, 292 if "\n" not in name else 300, name, 22, INK, font=FONT_CODE)
        s.text(cx, 352, sub, 21, INK)
        s.text(cx, 388, cost, 18, col)
        s.arrow(385, 150, cx, 245, MUTED)
    s.step()
    s.box(990, 250, 420, 160, "", stroke=VIOLET, bg=VIOLET_BG, fill="hachure")
    s.text(1200, 292, "ragas_eval.py", 22, INK, font=FONT_CODE)
    s.text(1200, 352, "4 RAGAS metrics", 21, INK)
    s.text(1200, 388, "LLM judge · costs tokens", 18, VIOLET)
    s.arrow(385, 150, 1200, 245, MUTED)
    s.icon("kaligule_robots", 3, 1380, 225, h=70)
    # row 3: record + decide
    s.step()
    s.box(540, 500, 360, 110, "", stroke=INK, bg="#f8f9fa")
    s.text(720, 535, "report.json", 22, INK, font=FONT_CODE)
    s.text(720, 575, "+ per_question.csv", 19, MUTED, font=FONT_CODE)
    for cx in (240, 720, 1200):
        s.arrow(cx, 415, 720 + (cx - 720) * 0.25, 495, MUTED)
    s.arrow(535, 555, 445, 555)
    s.box(40, 505, 400, 100, "", stroke=BLUE, bg=BLUE_BG, fill="hachure")
    s.text(240, 538, "tracking.py", 22, INK, font=FONT_CODE)
    s.text(240, 575, "→ one MLflow run", 20, BLUE)
    s.step()
    s.arrow(905, 555, 985, 555)
    s.box(995, 505, 290, 100, "", stroke=ORANGE, bg=YELLOW_BG, fill="hachure")
    s.text(1140, 538, "gate.py", 22, INK, font=FONT_CODE)
    s.text(1140, 575, "exit 0 / exit 1", 20, ORANGE)
    s.arrow(1290, 555, 1330, 555)
    s.icon("devdaejungyoon_github-actions", 2, 1385, 548, h=90, drop_text=True)
    s.text(1385, 615, "CI (W5)", 20, INK)
    return s


def bilingual():
    s = Scene("bilingual")
    s.box(10, 30, 440, 100, "", stroke=INK, bg=YELLOW_BG)
    s.text(230, 80, "ما هي سن الرشد؟", 32, INK)
    s.box(10, 300, 440, 100, "", stroke=INK, bg=YELLOW_BG)
    s.text(230, 350, "What is the age of majority?", 26, INK)
    s.text(230, 215, "same question,\ntwo languages", 23, MUTED)
    s.step()
    s.arrow(460, 80, 580, 190, INK)
    s.arrow(460, 350, 580, 240, INK)
    s.icon("ferminrp_awesome-icons", 2, 650, 215, h=130, drop_text=True)
    s.text(650, 322, "same retriever", 22, MUTED)
    s.arrow(720, 190, 830, 80, INK)
    s.arrow(720, 240, 830, 350, INK)
    s.box(840, 30, 470, 100, "", stroke=RED, bg=RED_BG, fill="hachure")
    s.text(1075, 80, "top-5:  45 · 46 · 12 · 90 · 151", 23, INK, font=FONT_CODE)
    s.text(1075, 155, "first article is wrong", 21, RED)
    s.box(840, 300, 470, 100, "", stroke=GREEN, bg=GREEN_BG, fill="hachure")
    s.text(1075, 350, "top-5:  44 · 12 · 90 · 151 · 176", 23, INK, font=FONT_CODE)
    s.text(1075, 425, "Art. 44 first: correct", 21, GREEN)
    s.step()
    s.icon("toman_checkmarks", 1, 1385, 215, h=80)
    s.text(1385, 290, "45 ≠ 44", 24, RED, font=FONT_CODE)
    s.box(120, 470, 1200, 70, "over 10 pairs:  top-1 agreement 0.90  ·  hit@5 (AR − EN) = −0.10  →  Arabic retrieval is weaker",
          stroke=INK, bg="#f8f9fa", size=24)
    return s


def flywheel():
    import math
    s = Scene("flywheel")
    cx, cy = 720, 320
    steps = [("change something", "chunking · prompt · model", INK, "#f8f9fa"),
             ("run the eval", "the same golden set", ORANGE, YELLOW_BG),
             ("compare in MLflow", "params ↔ metrics", BLUE, BLUE_BG),
             ("CI gate", "below the floor? blocked", RED, RED_BG),
             ("ship + observe", "Langfuse traces (W5)", GREEN, GREEN_BG),
             ("failures become\nnew golden questions", "the exam keeps growing", VIOLET, VIOLET_BG)]
    s.icon("kaligule_robots", 1, cx, cy - 25, h=150)
    s.text(cx, cy + 80, "eval-driven development", 28, INK)
    pos = [(cx + 520 * math.cos(-math.pi / 2 + i * math.pi / 3), cy + 250 * math.sin(-math.pi / 2 + i * math.pi / 3))
           for i in range(6)]
    for i, ((title, sub, col, bg), (x, y)) in enumerate(zip(steps, pos)):
        if i:
            s.step()
            (px, py) = pos[i - 1]
            dx, dy = x - px, y - py
            d = math.hypot(dx, dy)
            s.arrow(px + dx / d * 170, py + dy / d * 60, x - dx / d * 170, y - dy / d * 60, MUTED, bend=0.25)
        s.box(x - 165, y - 55, 330, 110, "", stroke=col, bg=bg, fill="hachure")
        two = "\n" in title
        s.text(x, y - (22 if two else 14), title, 26, INK)
        s.text(x, y + (36 if two else 28), sub, 19, MUTED)
    s.step()
    (px, py), (x, y) = pos[5], pos[0]
    dx, dy = x - px, y - py
    d = math.hypot(dx, dy)
    s.arrow(px + dx / d * 170, py + dy / d * 60, x - dx / d * 170, y - dy / d * 60, MUTED, bend=0.25)
    return s


def build_all():
    for fn in DIAGRAMS:
        sc = fn()
        sc.save()
        print(f"wrote {fn.__name__:22s} steps: {sc.cur + 1}")


DIAGRAMS = [title_art, day_map, exam_dashcam_brakes, rag_failure_points, rag_triad, golden_set_sources,
            llm_judge, eval_pipeline, bilingual, flywheel]

if __name__ == "__main__":
    build_all()
