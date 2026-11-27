"""Assembles the Workshop 3 deck into one self-contained HTML file.

    python build.py            -> index.html          (open in any browser, works offline)

Inlines: the Excalidraw SVGs (../diagrams/svg), the real evaluation code (../code/evaluation)
with its click-to-explain notes (annotations.json), and the captured run output.
Fails loudly if a note's anchor no longer matches the code, so edit annotations.json after code changes.
"""
from __future__ import annotations

import base64
import html
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).parent
CODE = HERE.parent / "code"
SVG_DIR = HERE.parent / "diagrams" / "svg"


def svg(name: str) -> str:
    s = (SVG_DIR / f"{name}.svg").read_text(encoding="utf-8")
    s = re.sub(r"<\?xml[^>]*>", "", s)
    # each export embeds its own font subset: give it a private family name so subsets never collide
    s = s.replace("Excalifont", f"Excalifont-{name}").replace("Cascadia", f"Cascadia-{name}")
    s = re.sub(r'(<svg[^>]*?)\s(width|height)="[^"]*"', r"\1", s, count=1)
    s = re.sub(r'(<svg[^>]*?)\s(width|height)="[^"]*"', r"\1", s, count=1)
    return s.replace("<svg ", f'<svg data-name="{name}" role="img" aria-label="{name.replace("-", " ")} diagram" ', 1)


def check_notes(label: str, code: str, notes: list[dict]) -> list[str]:
    lines, problems = code.split("\n"), []
    for n in notes:
        start = next((i for i, l in enumerate(lines) if n["anchor"] in l), None)
        if start is None:
            problems.append(f"{label}: anchor not found: {n['anchor']!r}")
        elif not any(n["until"] in l for l in lines[start:]):
            problems.append(f"{label}: 'until' not found after anchor: {n['until']!r}")
    return problems


def code_data(ann: dict) -> tuple[list[dict], list[str]]:
    files, problems = [], []
    for f in ann["files"]:
        code = (CODE / f["path"]).read_text(encoding="utf-8")
        problems += check_notes(f["label"], code, f["notes"])
        files.append({**f, "code": code, "lang": "python"})
    return files, problems


def record_data(ann: dict) -> tuple[dict, list[str]]:
    rows = [json.loads(l) for l in (CODE / "data/golden_set.seed.jsonl").read_text(encoding="utf-8").splitlines() if l]
    rec = next(r for r in rows if r["id"] == "q007-ar")
    order = ["id", "question", "language", "type", "reference_answer", "gold_articles", "pair_id"]
    text = json.dumps({k: rec[k] for k in order}, ensure_ascii=False, indent=2)
    return ({"label": "golden_set.seed.jsonl · q007-ar", "tag": "", "lang": "json", "code": text,
             "summary": "One line of the golden set, pretty-printed. Every field earns its place.",
             "notes": ann["record"]["notes"]}, check_notes("record", text, ann["record"]["notes"]))


def terminal(text: str) -> str:
    out = []
    for line in html.escape(text.rstrip()).split("\n"):
        if line.startswith("#"):
            line = f'<span class="c">{line}</span>'
        elif line.startswith("$ ") or line.startswith("uv "):
            line = f'<span class="p">{line}</span>'
        elif line.startswith("FAIL") or "GATE FAILED" in line:
            line = f'<span class="f">{line}</span>'
        elif "GATE PASSED" in line:
            line = f'<span class="ok">{line}</span>'
        out.append(line)
    return "\n".join(out)


def as_json_script(obj) -> str:
    return json.dumps(obj, ensure_ascii=False).replace("</", "<\\/")


def main() -> int:
    ann = json.loads((HERE / "annotations.json").read_text(encoding="utf-8"))
    files, p1 = code_data(ann)
    record, p2 = record_data(ann)
    if p1 + p2:
        print("Annotation anchors out of date:\n  " + "\n  ".join(p1 + p2), file=sys.stderr)
        return 1

    src = (HERE / "deck.src.html").read_text(encoding="utf-8")
    font = base64.b64encode((HERE / "assets/excalifont-latin.woff2").read_bytes()).decode()
    out = (src.replace("{{FONT_EXCALIFONT}}", font)
              .replace("{{CODE_DATA}}", as_json_script(files))
              .replace("{{RECORD_DATA}}", as_json_script(record))
              .replace("{{RUN_COMMANDS}}", terminal((HERE / "run_commands.txt").read_text(encoding="utf-8")))
              .replace("{{RUN_OUTPUT}}", terminal((HERE / "run_output.txt").read_text(encoding="utf-8")))
              .replace("{{ROUGH_JS}}", (HERE / "assets/rough-4.6.6.min.js").read_text(encoding="utf-8").replace("</script", "<\\/script"))
              .replace("{{EXPLAINERS_JS}}", (HERE / "explainers.js").read_text(encoding="utf-8").replace("</script", "<\\/script")))
    out = re.sub(r"\{\{svg:([\w-]+)\}\}", lambda m: svg(m.group(1)), out)
    left = re.findall(r"\{\{[^}]+\}\}", out)
    if left:
        print(f"unfilled placeholders: {left}", file=sys.stderr)
        return 1

    full = re.sub(r"<!--/?HEAD-->\n?", "", out)
    (HERE / "index.html").write_text(full, encoding="utf-8")
    if "--artifact" in sys.argv:   # page body only: the claude.ai artifact host adds its own <html>/<head>
        body = re.sub(r"<!--HEAD-->.*?<!--/HEAD-->\n?", "", out, flags=re.S)
        Path(sys.argv[sys.argv.index("--artifact") + 1]).write_text(body, encoding="utf-8")
    print(f"index.html  {len(full) / 1024:.0f} KB · {len(files)} code files · "
          f"{sum(len(f['notes']) for f in files)} code notes")
    return 0


if __name__ == "__main__":
    sys.exit(main())
