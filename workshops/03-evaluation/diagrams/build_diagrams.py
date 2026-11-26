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
        self.name, self.els = name, []

    def _base(self, kind: str, x: float, y: float, w: float, h: float, **kw) -> dict:
        e = {"id": _uid(), "type": kind, "x": x, "y": y, "width": w, "height": h, "angle": 0,
             "strokeColor": kw.get("stroke", INK), "backgroundColor": kw.get("bg", "transparent"),
             "fillStyle": kw.get("fill", "hachure"), "strokeWidth": kw.get("sw", 2),
             "strokeStyle": kw.get("style", "solid"), "roughness": kw.get("rough", 1), "opacity": 100,
             "groupIds": kw.get("groups", []), "frameId": None, "roundness": kw.get("roundness"),
             "seed": random.randint(1, 2**31), "version": 1, "versionNonce": random.randint(1, 2**31),
             "isDeleted": False, "boundElements": None, "updated": 1, "link": None, "locked": False}
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
            e["strokeWidth"] = max(1, e.get("strokeWidth", 1) * min(1.0, max(s, 0.6)))
            self.els.append(e)
        return (x, y, (x1 - x0) * s, (y1 - y0) * s)

    def save(self):
        doc = {"type": "excalidraw", "version": 2, "source": "https://excalidraw.com",
               "elements": self.els, "appState": {"viewBackgroundColor": "#ffffff", "gridSize": None},
               "files": {}}
        (HERE / "src" / f"{self.name}.excalidraw").write_text(json.dumps(doc, ensure_ascii=False, indent=1))


# ---- the diagrams ---------------------------------------------------------------------------------

def day_map():
    s = Scene("day-map")
    stations = [
        ("xxxdeveloper_icons", 35, "W1 · Corpus", "PDF → articles.json"),
        ("youritjang_software-architecture", 1, "W2 · Hybrid RAG", "/ask + citations"),
        ("kaligule_robots", 1, "W3 · Evaluation", "scores, not vibes"),
        ("mateuszbaransanok_it-icons", 20, "W4 · Serving", "p95 · cache · cost"),
        ("devdaejungyoon_github-actions", 0, "W5 · Observe + Gate", "traces · guardrails · CI"),
    ]
    gap = 300
    for i, (lib, idx, title, sub) in enumerate(stations):
        cx = 140 + i * gap
        if i == 2:
            s.box(cx - 135, -10, 270, 280, stroke=ORANGE, bg=YELLOW_BG, fill="hachure", style="dashed")
            s.text(cx, -36, "you are here", 22, ORANGE)
        s.icon(lib, idx, cx, 75, w=110, h=115, drop_text=True)
        s.text(cx, 180, title, 26, INK)
        s.text(cx, 218, sub, 19, MUTED)
        if i < 4:
            s.arrow(cx + 85, 75, cx + gap - 85, 75, INK)
    s.arrow(700, 280, 1030, 250, ORANGE, "dashed", "every optimization re-scored", 18, bend=0.45, label_dy=22)
    s.arrow(740, 275, 1330, 250, ORANGE, "dashed", "CI gate = this eval on every PR", 18, bend=0.6, label_dy=26)
    return s


def exam_dashcam_brakes():
    s = Scene("exam-dashcam-brakes")
    panels = [
        ("Evaluation", "the exam", ORANGE, [("youritjang_stick-figures", 2, -60, 120), ("xxxdeveloper_icons", 4, 70, 95)],
         ["Is it good enough to ship?", "before release, on every PR", "fixed golden set → scores", "stops a bad release"]),
        ("Observability", "the dashcam", BLUE, [("mateuszbaransanok_it-icons", 7, -60, 95), ("g-script_charts", 2, 75, 95)],
         ["What is it doing, and why?", "after release, live traffic", "traces · dashboards · alerts", "tells you afterwards"]),
        ("Guardrails", "the brakes", RED, [("mateuszbaransanok_it-icons", 16, -60, 95), ("toman_checkmarks", 1, 70, 80)],
         ["Should this answer go out?", "inside every request", "allow · block · redact", "stops a bad answer"]),
    ]
    for i, (title, sub, color, icons, lines) in enumerate(panels):
        cx = 220 + i * 470
        s.text(cx, 0, title, 36, INK)
        s.text(cx, 44, sub, 26, color)
        for lib, idx, dx, size in icons:
            s.icon(lib, idx, cx + dx, 170, w=size, h=size, drop_text=True)
        s.text(cx, 280, lines[0], 22, INK)
        s.text(cx, 320, lines[1], 19, MUTED)
        s.text(cx, 352, lines[2], 19, MUTED)
        s.box(cx - 150, 392, 300, 50, lines[3], stroke=color, bg="transparent", size=20, label_color=color)
        if i < 2:
            s.line([[cx + 235, -10], [cx + 235, 440]], MUTED, 1, "dashed")
    return s


def rag_failure_points():
    s = Scene("rag-failure-points")
    y = 200
    nodes = [(150, "xxxdeveloper_icons", 1, "corpus (W1)"), (450, "ferminrp_awesome-icons", 2, "retrieve + rerank"),
             (750, "youritjang_software-architecture", 4, "top-k articles"), (1050, "kaligule_robots", 2, "LLM generates"),
             (1350, "xxxdeveloper_icons", 0, "answer + citations")]
    for cx, lib, idx, label in nodes:
        s.icon(lib, idx, cx, y, w=100, h=100, drop_text=True)
        s.text(cx, y + 75, label, 21, INK)
    for a, b in zip(nodes, nodes[1:]):
        s.arrow(a[0] + 70, y, b[0] - 70, y)
    s.icon("dhtoran_stick-people", 1, 450, 10, h=90)
    s.text(530, 0, "question", 20, MUTED, align="left")
    s.arrow(450, 62, 450, 140, MUTED)
    fails = ["article split wrong,\ntext reversed", "right article\nnever retrieved", "found it, ranked 9th,\ncut by top_k",
             "invents a ruling\nnot in the context", "cites an article\nit never saw"]
    for i, ((cx, *_), f) in enumerate(zip(nodes, fails)):
        s.box(cx - 125, 330, 250, 92, "", stroke=RED, bg=RED_BG, fill="hachure")
        s.text(cx, 376, f, 20, INK)
        s.icon("toman_checkmarks", 0, cx - 118, 332, h=40)
        s.text(cx + 112, 344, str(i + 1), 22, RED)
    s.line([[30, 450], [880, 450]], BLUE, 3)
    s.text(455, 478, "retrieval failures: measure without an LLM", 21, BLUE)
    s.line([[920, 450], [1480, 450]], GREEN, 3)
    s.text(1200, 478, "generation failures: need a judge", 21, GREEN)
    return s


def rag_triad():
    s = Scene("rag-triad")
    Q, C, A, R = (640, 60), (200, 470), (1080, 470), (200, 60)
    s.box(Q[0] - 130, Q[1] - 40, 260, 80, "question", stroke=INK, bg=YELLOW_BG, size=26)
    s.box(C[0] - 150, C[1] - 40, 300, 80, "retrieved articles", stroke=BLUE, bg=BLUE_BG, size=24)
    s.box(A[0] - 130, A[1] - 40, 260, 80, "answer", stroke=GREEN, bg=GREEN_BG, size=26)
    s.box(R[0] - 150, R[1] - 40, 300, 80, "reference answer", stroke=VIOLET, bg=VIOLET_BG, size=24, style="dashed")
    s.icon("dhtoran_stick-people", 4, Q[0] + 175, Q[1] - 5, h=95)
    s.icon("youritjang_stick-figures", 1, R[0] - 210, R[1] - 5, h=95, drop_text=True)
    s.text(R[0], R[1] - 62, "written by a human, once", 17, VIOLET)
    s.icon("kaligule_robots", 2, A[0] + 180, A[1], h=95)
    s.icon("youritjang_software-architecture", 4, C[0] - 205, C[1], h=80)
    s.arrow(Q[0] - 60, Q[1] + 45, C[0] + 60, C[1] - 45, BLUE, label="")
    s.text(310, 255, "context precision\nare the retrieved\narticles relevant?", 21, BLUE)
    s.arrow(C[0] + 155, C[1], A[0] - 135, A[1], GREEN)
    s.text(640, 520, "faithfulness  ·  is every claim backed by the articles?", 21, GREEN)
    s.arrow(A[0] - 60, A[1] - 45, Q[0] + 60, Q[1] + 45, GREEN)
    s.text(975, 255, "answer relevancy\ndoes it answer\nthe question?", 21, GREEN)
    s.arrow(R[0], R[1] + 45, C[0], C[1] - 45, BLUE, "dashed")
    s.text(75, 265, "context recall\ndid we retrieve\neverything needed?", 21, BLUE)
    return s


def golden_set_sources():
    s = Scene("golden-set-sources")
    sources = [("xxxdeveloper_icons", 1, "reference benchmark", "civil_code_rag_qa_benchmark.json"),
               ("youritjang_stick-figures", 1, "lawyers write + review", "the only source of real authority"),
               ("kaligule_robots", 0, "LLM drafts from an article", "a human checks every one"),
               ("ferminrp_awesome-icons", 14, "real questions that failed", "from Langfuse traces (W5)")]
    for i, (lib, idx, title, sub) in enumerate(sources):
        cy = 40 + i * 150
        s.icon(lib, idx, 50, cy, w=80, h=85, drop_text=True)
        s.text(120, cy - 14, title, 23, INK, align="left")
        s.text(120, cy + 20, sub, 18, MUTED, align="left", font=FONT_CODE if i == 0 else FONT_HAND)
        s.arrow(530, cy, 760, 265, MUTED)
    s.box(780, 140, 380, 250, "", stroke=ORANGE, bg=YELLOW_BG, fill="hachure")
    s.text(970, 175, "golden_set.jsonl", 26, INK, font=FONT_CODE)
    s.text(970, 290, "lookup · concept\nmulti-article · repealed\nout-of-scope\nevery question in AR + EN", 21, INK)
    s.arrow(1170, 265, 1290, 265, INK)
    s.text(1300, 230, "versioned with DVC", 21, INK, align="left")
    s.text(1300, 265, "hash logged with", 21, INK, align="left")
    s.text(1300, 297, "every run", 21, INK, align="left")
    return s


def llm_judge():
    s = Scene("llm-judge")
    notes = [("ferminrp_post-it", 7, "question"), ("ferminrp_post-it", 11, "retrieved\narticles"),
             ("ferminrp_post-it", 9, "answer")]
    for i, (lib, idx, label) in enumerate(notes):
        cy = 70 + i * 165
        s.icon(lib, idx, 90, cy, w=150, h=140)
        s.text(85, cy - 5, label, 24, INK)
        s.arrow(180, cy, 400, 235, MUTED)
    s.icon("kaligule_robots", 4, 520, 230, h=230)
    s.icon("xxxdeveloper_icons", 4, 650, 270, h=120, drop_text=True)
    s.text(560, 400, "judge LLM + fixed rubric", 23, INK)
    s.text(560, 434, "structured output, temperature 0", 19, MUTED)
    s.arrow(720, 235, 850, 235, INK)
    s.box(860, 95, 470, 280, "", stroke=VIOLET, bg="#f3f0ff", fill="solid")
    s.text(885, 235, '{\n  "claims":  ["...", "...", "..."],\n  "verdicts": [1, 1, 0],\n  "reason": "claim 3 is not\n     in Article 147",\n  "score": 0.67\n}', 21, INK, align="left", font=FONT_CODE)
    return s


def eval_pipeline():
    s = Scene("eval-pipeline")
    s.icon("xxxdeveloper_icons", 6, 70, 260, h=95, drop_text=True)
    s.text(70, 335, "golden_set.jsonl", 18, INK, font=FONT_CODE)
    s.arrow(130, 260, 215, 260)
    s.box(220, 220, 200, 80, "", stroke=INK, bg="#f8f9fa")
    s.text(320, 260, "runner.py", 20, INK, font=FONT_CODE)
    s.icon("mateuszbaransanok_it-icons", 20, 320, 65, h=90, drop_text=True)
    s.text(320, 2, "W2 API · POST /ask", 18, INK, font=FONT_CODE)
    s.arrow(300, 215, 300, 120, MUTED)
    s.arrow(340, 120, 340, 215, MUTED)
    s.text(285, 168, "question", 16, MUTED, align="right")
    s.text(355, 168, "answer +\ncontexts", 16, MUTED, align="left")
    scorers = [(90, "retrieval_metrics.py", "hit@k · MRR · nDCG", GREEN, GREEN_BG, "free · deterministic"),
               (260, "legal_checks.py · bilingual.py", "citations · repeal · AR = EN", GREEN, GREEN_BG, "free · deterministic"),
               (430, "ragas_eval.py", "4 RAGAS metrics", VIOLET, VIOLET_BG, "LLM judge · costs tokens")]
    for cy, name, sub, col, bg, cost in scorers:
        s.box(600, cy - 62, 340, 124, "", stroke=col, bg=bg, fill="hachure")
        s.text(770, cy - 30, name, 18, INK, font=FONT_CODE)
        s.text(770, cy + 5, sub, 18, INK)
        s.text(770, cy + 37, cost, 16, col)
        s.arrow(425, 260, 595, cy, MUTED)
        s.arrow(945, cy, 1035, 260, MUTED)
    s.text(500, 236, "records", 16, MUTED)
    s.box(1040, 210, 230, 100, "", stroke=INK, bg="#f8f9fa")
    s.text(1155, 245, "report.json", 19, INK, font=FONT_CODE)
    s.text(1155, 280, "per_question.csv", 17, MUTED, font=FONT_CODE)
    s.arrow(1275, 240, 1355, 150)
    s.arrow(1275, 280, 1355, 370)
    s.box(1360, 100, 230, 90, "", stroke=BLUE, bg=BLUE_BG, fill="hachure")
    s.text(1475, 132, "tracking.py", 19, INK, font=FONT_CODE)
    s.text(1475, 164, "→ MLflow run", 18, BLUE)
    s.box(1360, 330, 230, 90, "", stroke=ORANGE, bg=YELLOW_BG, fill="hachure")
    s.text(1475, 362, "gate.py", 19, INK, font=FONT_CODE)
    s.text(1475, 394, "exit 0 / exit 1", 18, ORANGE)
    s.arrow(1595, 375, 1665, 375)
    s.icon("devdaejungyoon_github-actions", 2, 1735, 370, h=95, drop_text=True)
    s.text(1735, 445, "CI (W5)", 19, INK)
    return s


def bilingual():
    s = Scene("bilingual")
    s.box(0, 20, 380, 80, "", stroke=INK, bg=YELLOW_BG)
    s.text(190, 60, "ما هي سن الرشد؟", 28, INK)
    s.box(0, 260, 380, 80, "", stroke=INK, bg=YELLOW_BG)
    s.text(190, 300, "What is the age of majority?", 23, INK)
    s.text(190, 180, "same question", 20, MUTED)
    s.arrow(390, 60, 540, 160, INK)
    s.arrow(390, 300, 540, 200, INK)
    s.icon("ferminrp_awesome-icons", 2, 610, 180, h=110, drop_text=True)
    s.text(610, 290, "same retriever", 19, MUTED)
    s.arrow(680, 160, 820, 60, INK)
    s.arrow(680, 200, 820, 300, INK)
    s.box(820, 20, 450, 80, "", stroke=RED, bg=RED_BG, fill="hachure")
    s.text(1045, 60, "top-5:  45 · 46 · 12 · 90 · 151", 21, INK, font=FONT_CODE)
    s.box(820, 260, 450, 80, "", stroke=GREEN, bg=GREEN_BG, fill="hachure")
    s.text(1045, 300, "top-5:  44 · 12 · 90 · 151 · 176", 21, INK, font=FONT_CODE)
    s.icon("toman_checkmarks", 1, 1380, 180, h=80)
    s.text(1380, 255, "top-1 differs", 21, RED)
    s.text(1380, 285, "45 ≠ 44", 21, RED, font=FONT_CODE)
    s.arrow(1280, 60, 1340, 150, RED)
    s.arrow(1280, 300, 1340, 210, RED)
    return s


def flywheel():
    import math
    s = Scene("flywheel")
    cx, cy, r = 560, 330, 280
    steps = [("change something", "chunking · prompt · model", INK, "#f8f9fa"),
             ("run the eval", "same golden set", ORANGE, YELLOW_BG),
             ("compare in MLflow", "params ↔ metrics", BLUE, BLUE_BG),
             ("CI gate", "below the floor? blocked", RED, RED_BG),
             ("ship + observe", "Langfuse, W5", GREEN, GREEN_BG),
             ("failures → new\ngolden questions", "the set keeps growing", VIOLET, VIOLET_BG)]
    pos = []
    for i, (title, sub, col, bg) in enumerate(steps):
        a = -math.pi / 2 + i * 2 * math.pi / len(steps)
        x, y = cx + r * 1.25 * math.cos(a), cy + r * math.sin(a)
        pos.append((x, y))
        s.box(x - 130, y - 48, 260, 96, "", stroke=col, bg=bg, fill="hachure")
        s.text(x, y - 12 if "\n" not in title else y - 18, title, 23, INK)
        s.text(x, y + 26 if "\n" not in title else y + 33, sub, 17, MUTED)
    for i in range(len(pos)):
        (x1, y1), (x2, y2) = pos[i], pos[(i + 1) % len(pos)]
        dx, dy = x2 - x1, y2 - y1
        d = math.hypot(dx, dy)
        sx, sy = x1 + dx / d * 125, y1 + dy / d * 70
        ex, ey = x2 - dx / d * 125, y2 - dy / d * 70
        s.arrow(sx, sy, ex, ey, MUTED, bend=0.25)
    s.icon("kaligule_robots", 1, cx, cy - 20, h=120)
    s.text(cx, cy + 70, "eval-driven development", 22, INK)
    return s



def title_art():
    s = Scene("title-art")
    s.icon("youritjang_software-architecture", 4, 70, 250, h=150)
    s.text(70, 350, "articles", 20, MUTED)
    s.arrow(140, 250, 215, 250, MUTED)
    s.icon("kaligule_robots", 4, 300, 240, h=260)
    s.text(300, 395, "the judge", 20, MUTED)
    s.arrow(385, 250, 455, 250, MUTED)
    s.box(470, 70, 400, 360, "", stroke=INK, bg="#f8f9fa", fill="solid")
    s.text(670, 110, "scorecard", 26, INK)
    rows = [("toman_checkmarks", 3, "faithfulness", "0.86"), ("toman_checkmarks", 3, "context recall", "0.82"),
            ("toman_checkmarks", 3, "hit@5", "0.90"), ("toman_checkmarks", 1, "citation grounded", "0.78")]
    for i, (lib, idx, name, val) in enumerate(rows):
        cy = 175 + i * 66
        s.icon(lib, idx, 515, cy, h=44)
        s.text(555, cy, name, 22, INK, align="left")
        s.text(845, cy, val, 22, RED if idx == 1 else GREEN, align="right", font=FONT_CODE)
    return s


def build_all():
    for fn in DIAGRAMS:
        fn().save()
        print("wrote", fn.__name__)


DIAGRAMS = [title_art, day_map, exam_dashcam_brakes, rag_failure_points, rag_triad, golden_set_sources,
            llm_judge, eval_pipeline, bilingual, flywheel]

if __name__ == "__main__":
    build_all()
