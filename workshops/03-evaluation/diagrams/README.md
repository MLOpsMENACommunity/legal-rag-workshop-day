# Workshop 3 — diagrams

> **How the deck uses this folder now:** the slides act out processes with animated scenes
> (`slides/processes.js`, `slides/explainers.js`). Their actors are icons from `libraries/`, exported as
> sprites with `node tools/export_sprites.js` → `slides/assets/sprites.json`. The static diagrams below
> are kept as editable references and as a non-animated fallback; only `title-art` is still on a slide.

Hand-drawn diagrams for the deck, built as real `.excalidraw` files from community icon libraries.

| Folder | What |
|---|---|
| `build_diagrams.py` | Draws every diagram in code: shapes, arrows, text and library icons |
| `src/*.excalidraw` | The output. Open any of them on [excalidraw.com](https://excalidraw.com) (File → Open) to edit by hand |
| `svg/*.svg` | Exported with Excalidraw's own renderer; the deck inlines these |
| `libraries/` | The `.excalidrawlib` files used, from [libraries.excalidraw.com](https://libraries.excalidraw.com) |
| `tools/export_svg.js` | Headless export (Playwright + `@excalidraw/excalidraw` `exportToSvg`) |

## Build steps

Each diagram is drawn at slide scale (about 1440 px wide, text 19–34 px) and split into steps with `s.step()` in
`build_diagrams.py`. Step 0 draws when the slide opens; each `→` draws the next step, stroke by stroke. The step is stored
in each element's `customData.step`, so it survives editing on excalidraw.com, and the exporter turns it into
`<g class="xs" data-step="N">` groups in the SVG.

## Rebuild

```bash
python build_diagrams.py                      # src/*.excalidraw
cd tools && npm install && npm run bundle     # once
node export_svg.js                            # svg/*.svg   (or: node export_svg.js flywheel)
cd ../../slides && python build.py            # refresh the deck
```

If you edit a diagram by hand on excalidraw.com, save it back into `src/` and skip `build_diagrams.py`
for that file (it would overwrite your edits), then run the export.

## Icon libraries used

All from [libraries.excalidraw.com](https://libraries.excalidraw.com), MIT-licensed through the
[excalidraw-libraries](https://github.com/excalidraw/excalidraw-libraries) repository. Thanks to the authors.

| Library | Used for |
|---|---|
| Robots (`kaligule/robots`) | the LLM and the LLM judge |
| Stick Figures (`youritjang/stick-figures`), Stick people (`dhtoran/stick-people`) | users, lawyers, the student sitting the exam |
| Software Architecture (`youritjang/software-architecture`) | database, document stacks |
| Icons (`xxxdeveloper/icons`) | PDF, documents, clipboard (rubric), table (golden set) |
| IT icons (`mateuszbaransanok/it-icons`) | server, camera (dashcam), shield (guardrails) |
| Awesome Icons (`ferminrp/awesome-icons`) | magnifier (retrieval), users |
| Checkmarks (`toman/checkmarks`) | pass / fail / warning marks |
| Sticky Notes (`ferminrp/post-it`) | judge inputs |
| GitHub Actions (`devdaejungyoon/github-actions`) | metrics dial, CI |
| Charts (`g-script/charts`) | dashboards |

Also in `libraries/` for future diagrams: Artem's icons, Emojis, Stick Figures Collaboration.
Fonts: Excalifont and Cascadia, embedded by Excalidraw's exporter (SIL Open Font License).
