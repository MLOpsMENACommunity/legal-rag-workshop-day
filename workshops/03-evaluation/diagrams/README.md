# Workshop 3 — diagrams

Hand-drawn diagrams for the deck, built as real `.excalidraw` files from community icon libraries.

| Folder | What |
|---|---|
| `build_diagrams.py` | Draws every diagram in code: shapes, arrows, text and library icons |
| `src/*.excalidraw` | The output. Open any of them on [excalidraw.com](https://excalidraw.com) (File → Open) to edit by hand |
| `svg/*.svg` | Exported with Excalidraw's own renderer; the deck inlines these |
| `libraries/` | The `.excalidrawlib` files used, from [libraries.excalidraw.com](https://libraries.excalidraw.com) |
| `tools/export_svg.js` | Headless export (Playwright + `@excalidraw/excalidraw` `exportToSvg`) |

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
