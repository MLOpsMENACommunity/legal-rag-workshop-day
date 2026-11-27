/* Explainer animations for the W3 deck.
 *
 * Each scene is a list of phases. Phase 0 plays when the slide opens; every → plays the next phase.
 * ← shows the finished state. Drawn with rough.js so it matches the Excalidraw diagrams.
 * Coordinates are in a fixed viewBox per scene. Flows (FLOWS) draw on top of an existing
 * Excalidraw diagram, in the same coordinates as build_diagrams.py, one phase per diagram step.
 *
 * Inlined into index.html by build.py. Exposes window.W3Anim = { Player, SCENES, FLOWS }.
 */
(() => {
"use strict";
const REDUCE = matchMedia("(prefers-reduced-motion: reduce)").matches;
const P = { ink: "#1e1e1e", muted: "#868e96", blue: "#1971c2", green: "#2f9e44", red: "#e03131", orange: "#f08c00", violet: "#6741d9",
  fBlue: "#a5d8ff", fGreen: "#b2f2bb", fRed: "#ffc9c9", fYellow: "#ffec99", fViolet: "#d0bfff", fGray: "#f1f3f5", white: "#ffffff" };
const NS = "http://www.w3.org/2000/svg";
const HAND = 'Excalifont, "Segoe Print", "Comic Sans MS", sans-serif';
const MONO = '"JetBrains Mono", ui-monospace, Menlo, monospace';
const ARAB = '"IBM Plex Sans Arabic", "Geeza Pro", "Segoe UI", Tahoma, sans-serif';
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
function el(tag, attrs = {}, parent) { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; }

/* ------------------------------------------------------------------ drawing + timing kit */
class Kit {
  constructor(svg, layer) { this.svg = svg; this.layer = layer; this.rc = rough.svg(svg); this.rush = false; this.seed = 11; }
  o(x = {}) { return Object.assign({ roughness: 1.1, bowing: 1, stroke: P.ink, strokeWidth: 1.8, fillStyle: "hachure", hachureGap: 7, fillWeight: 1.3, seed: this.seed++ }, x); }
  put(n, parent) { (parent || this.layer).appendChild(n); return n; }
  g(parent) { return el("g", {}, parent || this.layer); }
  rr(x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); return `M${x + r} ${y} L${x + w - r} ${y} Q${x + w} ${y} ${x + w} ${y + r} L${x + w} ${y + h - r} Q${x + w} ${y + h} ${x + w - r} ${y + h} L${x + r} ${y + h} Q${x} ${y + h} ${x} ${y + h - r} L${x} ${y + r} Q${x} ${y} ${x + r} ${y} Z`; }
  box(x, y, w, h, o = {}, parent) { const opts = this.o(o); if (o.fill && !o.fillStyle) opts.fillStyle = "solid"; if (o.dash) opts.strokeLineDash = [9, 7]; return this.put(this.rc.path(this.rr(x, y, w, h, o.r ?? 12), opts), parent); }
  line(pts, o = {}, parent) { const opts = this.o(o); if (o.dash) opts.strokeLineDash = [9, 7]; return this.put(this.rc.linearPath(pts, opts), parent); }
  curve(pts, o = {}, parent) { const opts = this.o(o); if (o.dash) opts.strokeLineDash = [9, 7]; return this.put(this.rc.curve(pts, opts), parent); }
  circle(cx, cy, d, o = {}, parent) { const opts = this.o(o); if (o.fill && !o.fillStyle) opts.fillStyle = "solid"; if (o.dash) opts.strokeLineDash = [8, 7]; return this.put(this.rc.circle(cx, cy, d, opts), parent); }
  arc(cx, cy, r, a0, a1, o = {}, parent) { return this.put(this.rc.arc(cx, cy, r * 2, r * 2, a0, a1, false, this.o(o)), parent); }
  arrow(x1, y1, x2, y2, o = {}, parent) {
    const g = this.g(parent), a = Math.atan2(y2 - y1, x2 - x1), L = o.head ?? 15;
    const opts = this.o(o); if (o.dash) opts.strokeLineDash = [9, 7];
    g.appendChild(this.rc.line(x1, y1, x2, y2, opts));
    g.appendChild(this.rc.linearPath([[x2 - L * Math.cos(a - .45), y2 - L * Math.sin(a - .45)], [x2, y2], [x2 - L * Math.cos(a + .45), y2 - L * Math.sin(a + .45)]], this.o({ ...o, roughness: .6 })));
    return g;
  }
  text(x, y, str, o = {}, parent) {
    const size = o.size ?? 22, lh = o.lh ?? 1.3, lines = String(str).split("\n");
    const t = el("text", { x, y, "font-size": size, fill: o.color ?? P.ink, "text-anchor": o.anchor ?? "middle", "dominant-baseline": "middle", "font-family": o.mono ? MONO : HAND }, parent || this.layer);
    if (o.weight) t.setAttribute("font-weight", o.weight);
    const y0 = y - (lines.length - 1) * size * lh / 2;
    lines.forEach((ln, i) => {
      const s = el("tspan", { x, y: y0 + i * size * lh }, t); s.textContent = ln;
      if (/[؀-ۿ]/.test(ln)) { s.setAttribute("font-family", ARAB); s.setAttribute("direction", "rtl"); }
    });
    return t;
  }
  hl(x, y, w, h, fill, parent) { return el("rect", { x, y, width: w, height: h, rx: 6, fill, opacity: .6 }, parent || this.layer); }
  token(color = P.orange, r = 10, parent) { const g = this.g(parent); el("circle", { cx: 0, cy: 0, r, fill: color, stroke: P.ink, "stroke-width": 1.6 }, g); return g; }
  mark(x, y, ok, parent, s = 1) {
    const g = this.g(parent), w = 3.5 * Math.max(1, s * .8);
    if (ok) g.appendChild(this.rc.linearPath([[x - 12 * s, y], [x - 3 * s, y + 10 * s], [x + 14 * s, y - 13 * s]], this.o({ stroke: P.green, strokeWidth: w, roughness: .6 })));
    else { g.appendChild(this.rc.line(x - 11 * s, y - 11 * s, x + 11 * s, y + 11 * s, this.o({ stroke: P.red, strokeWidth: w, roughness: .6 }))); g.appendChild(this.rc.line(x + 11 * s, y - 11 * s, x - 11 * s, y + 11 * s, this.o({ stroke: P.red, strokeWidth: w, roughness: .6 }))); }
    return g;
  }
  bot(x, y, s = 1, parent) { // small judge robot
    const g = this.g(parent);
    g.appendChild(this.rc.line(x, y - 34 * s, x, y - 22 * s, this.o()));
    g.appendChild(this.rc.circle(x, y - 38 * s, 10 * s, this.o({ fill: P.fYellow, fillStyle: "solid" })));
    g.appendChild(this.rc.path(this.rr(x - 32 * s, y - 22 * s, 64 * s, 50 * s, 12 * s), this.o({ fill: P.fViolet, fillStyle: "solid" })));
    g.appendChild(this.rc.circle(x - 12 * s, y, 10 * s, this.o({ fill: P.ink, fillStyle: "solid" })));
    g.appendChild(this.rc.circle(x + 12 * s, y, 10 * s, this.o({ fill: P.ink, fillStyle: "solid" })));
    g.appendChild(this.rc.line(x - 10 * s, y + 15 * s, x + 10 * s, y + 15 * s, this.o()));
    return g;
  }
  /* ---- time ---- */
  tween(dur, fn) {
    if (this.rush || REDUCE || dur <= 0) { fn(1); return Promise.resolve(); }
    return new Promise(res => {
      const t0 = performance.now();
      const tick = now => { if (this.rush) { fn(1); return res(); } const k = Math.min(1, (now - t0) / dur); fn(ease(k)); if (k < 1) requestAnimationFrame(tick); else res(); };
      requestAnimationFrame(tick);
    });
  }
  wait(ms) { return this.tween(ms, () => {}); }
  async draw(node, dur = 550) { // strokes trace in, fills and text fade in
    const paths = node.tagName === "path" ? [node] : [...node.querySelectorAll("path")];
    const items = paths.map(p => {
      const f = p.getAttribute("fill"), s = p.getAttribute("stroke"), stroke = s && s !== "none" && (!f || f === "none") && !p.getAttribute("stroke-dasharray");
      let len = 0; if (stroke) { try { len = p.getTotalLength(); } catch {} }
      return { p, stroke: stroke && len > 0, len };
    });
    const texts = node.tagName === "text" ? [node] : [...node.querySelectorAll("text, circle, rect")];
    items.forEach(it => { if (it.stroke) { it.p.style.strokeDasharray = `${it.len} ${it.len}`; it.p.style.strokeDashoffset = it.len; } else it.p.style.opacity = 0; });
    texts.forEach(t => { t.style.opacity = 0; });
    await this.tween(dur, k => {
      items.forEach(it => { if (it.stroke) it.p.style.strokeDashoffset = it.len * (1 - k); else it.p.style.opacity = Math.max(0, k * 1.7 - .7); });
      texts.forEach(t => { t.style.opacity = k; });
    });
    items.forEach(it => { it.p.style.strokeDasharray = ""; it.p.style.strokeDashoffset = ""; it.p.style.opacity = ""; });
    texts.forEach(t => { t.style.opacity = ""; });
    return node;
  }
  fade(node, to = 1, dur = 400) { const from = node.style.opacity === "" ? (to ? 0 : 1) : +node.style.opacity; return this.tween(dur, k => { node.style.opacity = from + (to - from) * k; }); }
  pos(node, x, y) { node._x = x; node._y = y; node.setAttribute("transform", `translate(${x} ${y})`); return node; }
  move(node, x, y, dur = 650) { const x0 = node._x || 0, y0 = node._y || 0; return this.tween(dur, k => this.pos(node, x0 + (x - x0) * k, y0 + (y - y0) * k)); }
  along(node, pts, dur = 900) {
    const seg = []; let L = 0;
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); L += d; }
    return this.tween(dur, k => {
      let t = k * L, i = 0; while (i < seg.length - 1 && t > seg[i]) { t -= seg[i]; i++; }
      const f = seg[i] ? Math.min(1, t / seg[i]) : 1;
      this.pos(node, pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f);
    });
  }
  async burst(x, y, color = P.red) { // a ring that expands and fades: "something went wrong here"
    const c = el("circle", { cx: x, cy: y, r: 10, fill: "none", stroke: color, "stroke-width": 4 }, this.layer);
    await this.tween(550, k => { c.setAttribute("r", 10 + 40 * k); c.style.opacity = 1 - k; }); c.remove();
  }
  caption(str, color = P.blue) { // the phase title, top-left of the scene
    if (this._cap) this._cap.remove();
    this._cap = this.text(18, 24, str, { size: 26, color, anchor: "start" });
    return this.draw(this._cap, 300);
  }
}

/* ------------------------------------------------------------------ player: phases, rush, reset */
class Player {
  constructor(host, def, opts = {}) {
    this.def = def;
    this.svg = opts.svg || el("svg", { viewBox: `0 0 ${def.w} ${def.h}`, preserveAspectRatio: "xMidYMid meet", role: "img", "aria-label": def.label || "" }, host);
    this.ox = opts.ox || 0; this.oy = opts.oy || 0;
    this.reset();
  }
  get steps() { return this.def.phases.length; }
  reset() {
    if (this.kit) this.kit.rush = true;
    if (this.layer) this.layer.remove();
    this.layer = el("g", { class: "anim-layer", transform: `translate(${this.ox} ${this.oy})` }, this.svg);
    this.kit = new Kit(this.svg, this.layer); this.st = {};
    this.i = -1; this.target = -1; this.instant = false; this.running = false; this.chain = Promise.resolve(); this.gen = (this.gen || 0) + 1;
  }
  go(i, instant = false) {
    this.target = Math.max(this.target, Math.min(i, this.steps - 1));
    if (instant) this.instant = true;
    if (this.running) this.kit.rush = true;          // finish the phase in progress at once, then play the next
    return (this.chain = this.chain.then(() => this.run()));
  }
  async run() {
    const gen = this.gen, kit = this.kit;
    while (this.i < this.target && gen === this.gen) {
      this.i++; this.running = true; kit.rush = this.instant;
      try { await this.def.phases[this.i](kit, this.st); } catch (e) { console.error(e); }
      this.running = false;
    }
  }
  finish() { return this.go(this.steps - 1, true); }
}

/* ------------------------------------------------------------------ scenes */
const SCENES = {};

/* Reading 3 answers by eye vs scoring all 20 */
SCENES.sampling = { w: 1440, h: 640, label: "Reading 3 of 20 answers by eye versus scoring all 20", phases: [
  async (k, st) => {
    k.caption("20 answers from this morning's system", P.muted);
    const fails = { 3: "wrong\narticle", 8: "repealed law\nas live", 13: "half the\narticles", 17: "phantom\ncitation" };
    st.cards = [];
    for (let i = 0; i < 20; i++) {
      const x = 40 + (i % 5) * 140, y = 70 + Math.floor(i / 5) * 132, g = k.g();
      k.box(x, y, 120, 100, { fill: P.white }, g);
      k.text(x + 60, y + 28, `Q${i + 1}`, { size: 22 }, g);
      const l1 = k.line([[x + 22, y + 58], [x + 98, y + 58]], { stroke: P.muted, strokeWidth: 1.4 }, g);
      const l2 = k.line([[x + 22, y + 75], [x + 80, y + 75]], { stroke: P.muted, strokeWidth: 1.4 }, g);
      st.cards.push({ g, x, y, fail: fails[i], lines: [l1, l2] });
    }
    await Promise.all(st.cards.map((c, i) => k.wait(i * 35).then(() => k.draw(c.g, 380))));
  },
  async (k, st) => {
    k.caption("You read 3 of them by eye");
    const mag = k.g(); k.circle(0, 0, 70, { strokeWidth: 3, fill: "#ffffff", fillStyle: "solid" }, mag); k.line([[24, 24], [58, 58]], { strokeWidth: 6 }, mag);
    mag.style.opacity = .85; k.pos(mag, 900, 520);
    st.panel = [];
    const lines = [["read by eye:  3 / 20", P.ink, 34], ["problems found:  0", P.green, 34], ["“Looks great. Ship it?”", P.ink, 32]];
    for (const idx of [1, 10, 16]) {
      const c = st.cards[idx];
      await k.move(mag, c.x + 55, c.y + 48, 650); await k.wait(120);
      const t = k.box(c.x, c.y, 120, 100, { fill: P.fGreen, fillStyle: "hachure", stroke: P.green, hachureGap: 9 }); c.g.insertBefore(t, c.g.firstChild.nextSibling);
      k.draw(k.mark(c.x + 98, c.y + 22, true, c.g), 250); c.done = true;
    }
    await k.fade(mag, 0, 300); mag.remove();
    for (let i = 0; i < lines.length; i++) { const [s, col, size] = lines[i]; const t = k.text(810, 180 + i * 70, s, { size, color: col, anchor: "start" }); st.panel.push(t); await k.draw(t, 380); }
  },
  async (k, st) => {
    k.caption("The eval scores all 20, the same way, every run");
    st.panel.forEach(t => k.fade(t, 0, 250).then(() => t.remove()));
    const bar = el("rect", { x: 30, y: 58, width: 10, height: 540, rx: 5, fill: P.blue, opacity: .55 }, k.layer);
    const mark = c => {
      if (c.done) return; c.done = true;
      const bad = !!c.fail;
      const t = k.box(c.x, c.y, 120, 100, { fill: bad ? P.fRed : P.fGreen, fillStyle: "hachure", stroke: bad ? P.red : P.green, hachureGap: 9 });
      c.g.insertBefore(t, c.g.firstChild.nextSibling);
      if (bad) { c.lines.forEach(l => l.remove()); k.text(c.x + 60, c.y + 68, c.fail, { size: 17, color: P.red }, c.g); }
      k.draw(k.mark(c.x + 98, c.y + 22, !bad, c.g), 200);
    };
    await k.tween(2400, t => { const bx = 30 + t * 700; bar.setAttribute("x", bx); st.cards.forEach(c => { if (c.x + 60 < bx) mark(c); }); });
    st.cards.forEach(mark);
    await k.fade(bar, 0, 250); bar.remove();
    st.panel = [];
    const out = [["scored:  20 / 20", P.ink, 34], ["failures found:  4", P.red, 34], ["score  16 / 20 = 0.80", P.ink, 44]];
    for (let i = 0; i < out.length; i++) { const [s, col, size] = out[i]; const t = k.text(810, 180 + i * 75, s, { size, color: col, anchor: "start" }); st.panel.push(t); await k.draw(t, 380); }
  },
  async (k, st) => {
    k.caption("Why reading 3 missed all 4");
    st.panel.slice(0, 2).forEach(t => k.fade(t, 0, 250).then(() => t.remove()));
    await k.move(st.panel[2], 0, -150, 500);
    const a = k.text(810, 290, "chance that 3 random answers\nmiss all 4 failures:", { size: 28, anchor: "start" }); await k.draw(a, 400);
    const b = k.text(810, 385, "C(16,3) ÷ C(20,3) = 560 ÷ 1140", { size: 24, anchor: "start", mono: true, color: P.muted }); await k.draw(b, 400);
    const c = k.text(810, 475, "≈ 49 %", { size: 76, anchor: "start", color: P.red }); await k.draw(c, 450);
    const d = k.text(810, 555, "about a coin flip", { size: 32, anchor: "start" }); await k.draw(d, 350);
  },
]};

/* Faithfulness: split into claims, check each against the article */
SCENES.faithfulness = { w: 1440, h: 640, label: "How faithfulness is computed", phases: [
  async (k, st) => {
    k.caption("Faithfulness: is every claim in the answer backed by the retrieved article?");
    st.ans = ["A contract binds both parties; only mutual agreement can change it.",
              "A judge may reduce an onerous obligation after exceptional events,",
              "and must cancel the contract if a party lost over a third of its value."];
    st.art = ["The contract makes the law of the parties.", "It may only be revoked or amended by mutual",
              "agreement or for reasons provided by law.", "(2) If exceptional, unforeseeable public events",
              "make performance excessively onerous, the judge", "may reduce the obligation to a reasonable limit."];
    const a = k.g(); k.box(30, 60, 820, 170, { fill: P.white }, a);
    k.text(50, 88, "answer under test", { size: 18, color: P.muted, anchor: "start" }, a);
    st.ans.forEach((s, i) => k.text(50, 125 + i * 34, s, { size: 21, anchor: "start" }, a));
    const r = k.g(); st.r = r; k.box(900, 60, 515, 300, { fill: P.fBlue, fillStyle: "hachure", stroke: P.blue, hachureGap: 10 }, r);
    k.box(912, 72, 491, 276, { fill: P.white, stroke: "none" }, r);
    k.text(925, 92, "retrieved context · Article 147", { size: 18, color: P.blue, anchor: "start" }, r);
    st.artY = st.art.map((s, i) => { k.text(925, 132 + i * 36, s, { size: 20, anchor: "start" }, r); return 132 + i * 36; });
    await k.draw(a, 500); await k.draw(r, 500);
  },
  async (k, st) => {
    k.caption("1 · The judge splits the answer into separate claims");
    const lbl = ["c1 · a contract binds both parties; changes need mutual agreement",
                 "c2 · a judge may reduce an onerous obligation after exceptional events",
                 "c3 · the judge must cancel if a party lost over a third"];
    st.cards = [];
    for (let i = 0; i < 3; i++) {
      const y = 270 + i * 100, ly = 125 + i * 34;
      const u = k.line([[50, ly + 15], [50 + st.ans[i].length * 10.3, ly + 15]], { stroke: [P.green, P.green, P.orange][i], strokeWidth: 3, roughness: .8 });
      await k.draw(u, 250);
      const g = k.g(); k.box(30, y, 820, 78, { fill: P.white }, g);
      const t = k.text(50, y + 39, lbl[i], { size: 21, anchor: "start" }, g);
      k.pos(t, 0, ly - (y + 39)); k.draw(g.firstChild, 450);
      await k.move(t, 0, 0, 600);
      st.cards.push({ g, y });
    }
  },
  async (k, st) => {
    k.caption("2 · Each claim is checked against the article text");
    const spans = [[0, 2], [3, 5]];
    for (let i = 0; i < 2; i++) {
      const c = st.cards[i], [a, b] = spans[i], my = (st.artY[a] + st.artY[b]) / 2;
      await k.draw(k.curve([[850, c.y + 39], [875, c.y + 39], [880, my], [905, my]], { stroke: P.green, strokeWidth: 2.2 }), 450);
      for (let j = a; j <= b; j++) { const h = k.hl(918, st.artY[j] - 15, 480, 30, P.fGreen, st.r); st.r.insertBefore(h, st.r.childNodes[2]); await k.fade(h, .6, 180); }
      await k.draw(k.mark(815, c.y + 39, true), 250);
    }
    const c = st.cards[2];
    await k.draw(k.curve([[850, c.y + 39], [875, c.y + 39], [880, 250], [905, 250]], { stroke: P.red, strokeWidth: 2.2, dash: true }), 450);
    const scan = el("rect", { x: 914, y: 110, width: 486, height: 26, rx: 6, fill: P.fRed, opacity: .7 }, k.layer);
    await k.tween(1200, t => scan.setAttribute("y", 110 + t * 210)); await k.fade(scan, 0, 200); scan.remove();
    await k.draw(k.mark(815, c.y + 39, false), 250);
    const tbg = k.box(30, c.y, 820, 78, { fill: P.fRed, fillStyle: "hachure", stroke: P.red, hachureGap: 10 }); c.g.insertBefore(tbg, c.g.childNodes[1]);
    await k.draw(k.text(440, c.y + 100, "no sentence in Article 147 says this: invented law", { size: 19, color: P.red }), 350);
  },
  async (k, st) => {
    k.caption("3 · Score = supported claims ÷ all claims");
    const slots = [960, 1030, 1100], v = [true, true, false];
    for (let i = 0; i < 3; i++) {
      const tok = k.g(); el("circle", { cx: 0, cy: 0, r: 26, fill: v[i] ? P.fGreen : P.fRed, stroke: P.ink, "stroke-width": 1.6 }, tok); k.mark(0, 0, v[i], tok, .9);
      k.pos(tok, 815, st.cards[i].y + 39); await k.move(tok, slots[i], 450, 550);
    }
    await k.draw(k.text(1140, 450, "2 supported\n÷ 3 claims", { size: 24, anchor: "start" }), 350);
    await k.draw(k.text(960, 545, "faithfulness = 0.67", { size: 46, anchor: "start" }), 450);
  },
]};

/* Answer relevancy: generated questions as vectors next to the real one */
SCENES.relevancy = { w: 1440, h: 640, label: "How answer relevancy is computed", phases: [
  async (k, st) => {
    k.caption("Answer relevancy: does the answer address the question?");
    st.O = [910, 590]; st.R = 400; st.qa = 40;
    const q = k.g(); k.box(30, 60, 560, 70, { fill: P.fYellow }, q); k.text(50, 95, "Q:  Can a judge reduce an onerous obligation?", { size: 22, anchor: "start" }, q);
    await k.draw(q, 450);
    const ax = k.g(); k.line([[st.O[0], st.O[1]], [st.O[0] + 490, st.O[1]]], { stroke: P.muted }, ax); k.line([[st.O[0], st.O[1]], [st.O[0], st.O[1] - 470]], { stroke: P.muted }, ax);
    k.arc(st.O[0], st.O[1], st.R, -Math.PI * .7, -Math.PI * .02, { stroke: P.muted, strokeWidth: 1, dash: true }, ax);
    k.text(st.O[0] + 490, st.O[1] + 28, "embedding space (2-D sketch)", { size: 18, color: P.muted, anchor: "end" }, ax);
    await k.draw(ax, 500);
    st.qv = await SCENES.relevancy.vec(k, st, st.qa, P.ink, "question", 4);
  },
  async (k, st) => {
    k.caption("1 · A good answer: the judge writes 3 questions it would answer");
    st.items = await SCENES.relevancy.round(k, st,
      "Yes. Under Art. 147(2) the judge may\nreduce it to a reasonable limit.",
      ["Can a judge reduce an obligation?", "When may a judge lower an onerous obligation?", "What can a judge do about an onerous obligation?"],
      [28, 50, 58], P.green);
  },
  async (k, st) => {
    k.caption("Relevancy = average cosine between the question and the 3 generated ones");
    st.score = k.text(1405, 110, "relevancy ≈ 0.97", { size: 44, color: P.green, anchor: "end" }); await k.draw(st.score, 450);
  },
  async (k, st) => {
    k.caption("2 · An answer that pastes the article instead of answering", P.red);
    await Promise.all(st.items.map(n => k.fade(n, 0, 300))); st.items.forEach(n => n.remove()); st.score.remove();
    st.items = await SCENES.relevancy.round(k, st,
      "Article 157: In bilateral contracts, if one\nparty fails to perform, the other may…",
      ["What does Article 157 say?", "What happens if a party fails to perform?", "What is rescission?"],
      [95, 106, 118], P.red);
    st.score = k.text(1405, 110, "relevancy ≈ 0.40", { size: 44, color: P.red, anchor: "end" }); await k.draw(st.score, 450);
  },
]};
SCENES.relevancy.vec = async (k, st, deg, color, label, sw = 2.5, frac = 1) => {
  const a = deg * Math.PI / 180, x = st.O[0] + st.R * Math.cos(a), y = st.O[1] - st.R * Math.sin(a);
  const g = k.g(); k.arrow(st.O[0], st.O[1], x, y, { stroke: color, strokeWidth: sw }, g);
  const lr = st.R * frac + 14, side = deg > 90 ? -1 : 1;
  k.text(st.O[0] + lr * Math.cos(a) + side * 10, st.O[1] - lr * Math.sin(a), label, { size: 20, color, anchor: side < 0 ? "end" : "start" }, g);
  await k.draw(g, 450); return g;
};
SCENES.relevancy.round = async (k, st, answer, qs, degs, color) => {
  const items = [];
  const a = k.g(); k.box(30, 160, 560, 92, { fill: P.white }, a); k.text(50, 206, answer, { size: 20, anchor: "start" }, a); items.push(a); await k.draw(a, 400);
  const robot = k.bot(650, 110, .75); items.push(robot); await k.draw(robot, 300);
  for (let i = 0; i < 3; i++) {
    const y = 290 + i * 92, b = k.g(); k.box(30, y, 560, 70, { fill: color === P.green ? P.fGreen : P.fRed, fillStyle: "hachure", stroke: color, hachureGap: 10 }, b);
    k.text(50, y + 35, qs[i], { size: 20, anchor: "start" }, b); items.push(b); await k.draw(b, 350);
    const tok = k.token(color === P.green ? P.fGreen : P.fRed, 9); k.pos(tok, 590, y + 35); await k.move(tok, st.O[0], st.O[1], 450); tok.remove();
    const diff = Math.abs(degs[i] - st.qa), cos = Math.cos(diff * Math.PI / 180);
    const v = await SCENES.relevancy.vec(k, st, degs[i], color, `cos ${cos.toFixed(2)}`, 2.5, [1, .8, .6][i]); items.push(v);
    const lo = Math.min(degs[i], st.qa) * Math.PI / 180, hi = Math.max(degs[i], st.qa) * Math.PI / 180, r = 90 + i * 40;
    const arc = k.arc(st.O[0], st.O[1], r, -hi, -lo, { stroke: color, strokeWidth: 1.5 }); items.push(arc); await k.draw(arc, 250);
  }
  return items;
};

/* Context precision: precision at each useful rank, then the reranker */
SCENES.precision = { w: 1440, h: 640, label: "How context precision is computed", phases: [
  async (k, st) => {
    k.caption("Context precision: are the useful articles near the top?");
    const items = [[151, "obligations of the parties", false], [89, "conclusion of a contract", false], [147, "contract is the law of the parties", true], [418, "definition of sale", false], [148, "performance in good faith", true]];
    st.rows = [];
    for (let i = 0; i < 5; i++) { const t = k.text(60, 120 + i * 100, `#${i + 1}`, { size: 26, mono: true, color: P.muted }); k.draw(t, 300); }
    for (let i = 0; i < 5; i++) {
      const [n, topic, ok] = items[i], y = 80 + i * 100, g = k.g();
      k.box(110, y, 570, 80, { fill: P.white }, g); k.text(135, y + 40, `Art. ${n} · ${topic}`, { size: 22, anchor: "start" }, g);
      st.rows.push({ g, ok, n }); await k.draw(g, 280);
    }
    const ref = k.g(); k.box(760, 70, 650, 80, { fill: P.fViolet, fillStyle: "hachure", stroke: P.violet, dash: true }, ref);
    k.text(1085, 110, "the reference answer needs Art. 147 and Art. 148", { size: 22 }, ref); await k.draw(ref, 400);
  },
  async (k, st) => {
    k.caption("1 · The judge marks each retrieved article: useful or not");
    for (const r of st.rows) {
      const y = 80 + st.rows.indexOf(r) * 100;
      const tint = k.box(110, y, 570, 80, { fill: r.ok ? P.fGreen : P.fRed, fillStyle: "hachure", stroke: r.ok ? P.green : P.red, hachureGap: 10 }); r.g.insertBefore(tint, r.g.childNodes[1]);
      const m = k.mark(650, y + 40, r.ok, r.g); await Promise.all([k.draw(tint, 300), k.draw(m, 300)]);
    }
  },
  async (k, st) => {
    k.caption("2 · Precision at every useful rank, then the average");
    st.calc = await SCENES.precision.walk(k, st, [[3, "rank 3:  1 useful of 3  →  0.33"], [5, "rank 5:  2 useful of 5  →  0.40"]], "average  (0.33 + 0.40) ÷ 2  =  0.37", P.red);
  },
  async (k, st) => {
    k.caption("3 · Add a reranker: same articles, better order");
    await Promise.all(st.calc.map(n => k.fade(n, 0, 250))); st.calc.forEach(n => n.remove());
    const order = [2, 4, 0, 1, 3];                            // new position -> old index
    await Promise.all(order.map((old, pos) => k.move(st.rows[old].g, 0, (pos - old) * 100, 900)));
    st.calc = await SCENES.precision.walk(k, st, [[1, "rank 1:  1 useful of 1  →  1.00"], [2, "rank 2:  2 useful of 2  →  1.00"]], "average  =  1.00     (was 0.37)", P.green);
  },
]};
SCENES.precision.walk = async (k, st, stops, result, color) => {
  const out = [], cur = k.g(); k.arrow(34, 0, 0, 0, { stroke: P.blue, strokeWidth: 3 }, cur); k.pos(cur, 692, 120); out.push(cur); await k.draw(cur, 200);
  let line = 0;
  for (let rank = 1; rank <= 5; rank++) {
    await k.move(cur, 692, 120 + (rank - 1) * 100, 380);
    const stop = stops.find(s => s[0] === rank);
    if (stop) { const t = k.text(760, 230 + line * 70, stop[1], { size: 26, anchor: "start", mono: true }); out.push(t); line++; await k.draw(t, 380); }
  }
  const r = k.text(760, 230 + line * 70 + 30, result, { size: 30, anchor: "start", color }); out.push(r); await k.draw(r, 450);
  return out;
};

/* Context recall: can each reference claim be found in what we retrieved? */
SCENES.recall = { w: 1440, h: 640, label: "How context recall is computed", phases: [
  async (k, st) => {
    k.caption("Context recall: did we retrieve everything the reference answer needs?");
    const ref = k.g(); k.box(30, 55, 1385, 100, { fill: P.fViolet, fillStyle: "hachure", stroke: P.violet, dash: true }, ref);
    k.text(50, 80, "reference answer · written by a lawyer", { size: 18, color: P.violet, anchor: "start" }, ref);
    k.text(50, 118, "Yes: under Art. 147(2) the judge may reduce an onerous obligation, only to a reasonable limit;\nthe contract must still be performed in good faith (Art. 148).", { size: 21, anchor: "start" }, ref);
    await k.draw(ref, 500);
    st.arts = [];
    const arts = [[148, "performance in good faith", true], [151, "obligations of the parties", false], [89, "conclusion of a contract", false]];
    for (let i = 0; i < 3; i++) {
      const x = 60 + i * 470, g = k.g(); k.box(x, 450, 400, 90, { fill: P.fBlue }, g);
      k.text(x + 200, 480, `Art. ${arts[i][0]}`, { size: 24 }, g); k.text(x + 200, 515, arts[i][1], { size: 19 }, g);
      st.arts.push({ g, x }); await k.draw(g, 300);
    }
    await k.draw(k.text(30, 590, "retrieved", { size: 20, color: P.blue, anchor: "start" }), 250);
  },
  async (k, st) => {
    k.caption("1 · Split the reference answer into claims");
    const cl = ["the judge may reduce an\nonerous obligation", "only to a\nreasonable limit", "perform in good faith"];
    st.claims = [];
    for (let i = 0; i < 3; i++) {
      const x = 60 + i * 470, g = k.g(); k.box(x, 230, 400, 100, { fill: P.white }, g);
      const t = k.text(x + 190, 280, `c${i + 1} · ${cl[i]}`, { size: 23 }, g);
      k.pos(t, 0, -150); k.draw(g.firstChild, 400); await k.move(t, 0, 0, 550);
      st.claims.push({ g, x });
    }
  },
  async (k, st) => {
    k.caption("2 · Can each claim be found in a retrieved article?");
    st.rec = [];
    await SCENES.recall.link(k, st, 2, 0, true);
    for (const i of [0, 1]) {
      const tok = k.token(P.fRed, 10); k.pos(tok, st.claims[i].x + 200, 335);
      await k.along(tok, [[st.claims[i].x + 200, 335], [260, 440], [730, 440], [1200, 440]], 1100); tok.remove();
      st.rec.push(await (async () => { const m = k.mark(st.claims[i].x + 400, 232, false); await k.draw(m, 220); return m; })());
    }
    st.score = k.text(1405, 600, "1 of 3 claims found  →  recall 0.33", { size: 30, color: P.red, anchor: "end" }); await k.draw(st.score, 400);
  },
  async (k, st) => {
    k.caption("3 · Retrieve Art. 147 as well");
    const old = st.arts[2]; await Promise.all([k.move(old.g, 0, 60, 450), k.fade(old.g, 0, 450)]); old.g.remove();
    const g = k.g(); k.box(old.x, 450, 400, 90, { fill: P.fGreen }, g); k.text(old.x + 200, 480, "Art. 147", { size: 24 }, g); k.text(old.x + 200, 515, "(2) the judge may reduce it", { size: 19 }, g);
    k.pos(g, 300, 0); await k.draw(g, 300); await k.move(g, 0, 0, 600); st.arts[2] = { g, x: old.x };
    st.rec.forEach(m => m.remove()); st.score.remove();
    await SCENES.recall.link(k, st, 0, 2, true); await SCENES.recall.link(k, st, 1, 2, true);
    await k.draw(k.text(1405, 600, "3 of 3 claims found  →  recall 1.00", { size: 30, color: P.green, anchor: "end" }), 400);
  },
]};
SCENES.recall.link = async (k, st, ci, ai, ok) => {
  const c = st.claims[ci], a = st.arts[ai];
  await k.draw(k.curve([[c.x + 200, 332], [c.x + 200, 390], [a.x + 200, 400], [a.x + 200, 448]], { stroke: ok ? P.green : P.red, strokeWidth: 2.4 }), 450);
  await k.draw(k.mark(c.x + 400, 232, ok), 220);
};

/* Bilingual: two languages, two places in embedding space */
SCENES.bilingual = { w: 1440, h: 600, label: "Arabic and English versions of one question in embedding space", phases: [
  async (k, st) => {
    k.caption("Same question in two languages: where does each one land?");
    const qa = k.g(); k.box(20, 70, 400, 90, { fill: P.fYellow }, qa); k.text(220, 115, "ما هي سن الرشد؟", { size: 32 }, qa);
    const qe = k.g(); k.box(20, 320, 400, 90, { fill: P.fYellow }, qe); k.text(220, 365, "What is the age of majority?", { size: 24 }, qe);
    await k.draw(qa, 350); await k.draw(qe, 350);
    const sp = k.g(); k.box(480, 50, 940, 530, { stroke: P.muted, strokeWidth: 1.2, dash: true }, sp);
    k.text(500, 75, "embedding space", { size: 20, color: P.muted, anchor: "start" }, sp); await k.draw(sp, 400);
    st.A = { 44: [880, 250, "Art. 44 · age of majority (21)"], 45: [1080, 380, "Art. 45 · no discernment (under 7)"], 46: [1170, 215, "Art. 46 · limited capacity"],
             89: [640, 150, "Art. 89 · contracts"], 418: [600, 470, "Art. 418 · sale"], 163: [1230, 520, "Art. 163 · fault"], 147: [800, 520, "Art. 147"] };
    for (const [n, [x, y, lab]] of Object.entries(st.A)) {
      const g = k.g(); k.circle(x, y, 22, { fill: P.fBlue }, g); k.text(x + 18, y - 22, lab, { size: 18, anchor: "start", color: P.ink }, g); await k.draw(g, 160);
    }
  },
  async (k, st) => {
    k.caption("English question → lands next to Art. 44");
    st.E = await SCENES.bilingual.land(k, st, [420, 365], [860, 290], 44, P.green);
    await k.draw(k.text(220, 455, "top-1: Art. 44  ✓", { size: 26, color: P.green }), 300);
  },
  async (k, st) => {
    k.caption("Arabic question → lands somewhere else", P.red);
    st.R = await SCENES.bilingual.land(k, st, [420, 115], [1050, 350], 45, P.red);
    st.arRes = k.text(220, 205, "top-1: Art. 45  ✗", { size: 26, color: P.red }); await k.draw(st.arRes, 300);
    st.gap = k.g(); k.line([[860, 290], [1050, 350]], { stroke: P.muted, dash: true, strokeWidth: 1.5 }, st.gap);
    k.text(985, 108, "dashed line: same meaning, so it should be ~0 long", { size: 19, color: P.muted }, st.gap); await k.draw(st.gap, 400);
  },
  async (k, st) => {
    k.caption("A better multilingual embedder puts them together", P.green);
    st.gap.remove(); st.R.link.remove();
    await Promise.all([k.move(st.R.tok, 885, 300, 900), k.move(st.R.ring, -165, -50, 900)]);
    st.R.link = k.line([[885, 300], [880, 250]], { stroke: P.green, strokeWidth: 3 }); await k.draw(st.R.link, 250);
    st.arRes.remove(); await k.draw(k.text(220, 205, "top-1: Art. 44  ✓", { size: 26, color: P.green }), 300);
    await k.draw(k.text(220, 545, "top-1 agreement 0.90 → 1.00", { size: 26 }), 350);
  },
]};
SCENES.bilingual.land = async (k, st, from, to, art, color) => {
  const tok = k.token(color === P.green ? P.fGreen : P.fRed, 12); k.pos(tok, from[0], from[1]);
  await k.along(tok, [from, [from[0] + 60, from[1]], to], 900);
  const ring = k.g(); k.circle(to[0], to[1], 230, { stroke: color, strokeWidth: 2, dash: true }, ring); await k.draw(ring, 450);
  const [ax, ay] = st.A[art]; const link = k.line([to, [ax, ay]], { stroke: color, strokeWidth: 3 }); await k.draw(link, 250);
  return { tok, ring, link };
};

/* ------------------------------------------------------------------ flows on top of the Excalidraw diagrams */
// coordinates are build_diagrams.py coordinates; phase i plays after diagram step i is drawn
const FLOWS = {};
const send = async (k, pts, color, dur = 900, r = 10) => { const t = k.token(color, r); k.pos(t, pts[0][0], pts[0][1]); await k.along(t, pts, dur); return t; };

FLOWS["rag-failure-points"] = { phases: [
  async k => { // happy path: one question flows all the way through
    await k.wait(1400);
    const t = await send(k, [[420, 100], [420, 150], [420, 210], [710, 210], [1000, 210], [1290, 210]], P.fGreen, 2200, 12);
    await k.burst(1290, 210, P.green); await k.fade(t, 0, 300); t.remove();
  },
  ...[0, 1, 2, 3, 4].map(i => async k => {
    await k.wait(900);
    const xs = [130, 420, 710, 1000, 1290];
    const path = i === 0 ? [[130, 210], [275, 210]] : [[420, 100], [420, 150], [420, 210], ...xs.slice(2, i + 1).map(x => [x, 210])];
    const t = await send(k, path, P.fYellow, 700 + i * 350, 12);
    t.firstChild.setAttribute("fill", P.fRed); await k.burst(t._x, t._y); await k.wait(400); await k.fade(t, 0, 400); t.remove();
  }),
  async () => {},
]};

FLOWS["llm-judge"] = { phases: [
  async () => {},
  async k => { await k.wait(1200); await Promise.all([85, 265, 455].map((y, i) => k.wait(i * 200).then(() => send(k, [[400, y], [470, 270]], [P.fBlue, P.fYellow, P.fGreen][i], 700, 11)).then(t => k.fade(t, 0, 250)))); },
  async k => {
    await k.wait(1000);
    const a = await send(k, [[600, 260], [1000, 260]], P.fGreen, 700, 12); const b = await send(k, [[600, 260], [1000, 260]], P.fRed, 700, 12);
    await Promise.all([k.fade(a, 0, 300), k.fade(b, 0, 300)]);
  },
]};

FLOWS["eval-pipeline"] = { phases: [
  async k => { // 5 records leave the golden set; each asks the API and comes back
    await k.wait(1500);
    for (let i = 0; i < 3; i++) {
      const t = await send(k, [[150, 95], [255, 95]], P.fYellow, 450, 10);
      await k.along(t, [[520, 78], [690, 78]], 450); await k.along(t, [[690, 115], [520, 115]], 450); t.remove();
    }
  },
  async k => { await k.wait(1200); await Promise.all([240, 720].map((x, i) => k.wait(i * 250).then(() => send(k, [[385, 150], [x, 245]], P.fGreen, 700)).then(t => k.fade(t, 0, 300)))); },
  async k => { await k.wait(1100); const t = await send(k, [[385, 150], [1200, 245]], P.fViolet, 1000); await k.fade(t, 0, 300); },
  async k => {
    await k.wait(1200);
    const ts = await Promise.all([240, 720, 1200].map(x => send(k, [[x, 415], [720 + (x - 720) * .25, 495]], P.fGray, 650)));
    ts.forEach(t => t.remove());
    const t = await send(k, [[535, 555], [445, 555]], P.fBlue, 450); await k.fade(t, 0, 300);
  },
  async k => {
    await k.wait(1200);
    const t = await send(k, [[905, 555], [1140, 555]], P.fGray, 650);
    t.firstChild.setAttribute("fill", P.fRed); await k.burst(1140, 555);
    await k.draw(k.text(1430, 482, "exit 1: citation_grounded 0.78 < 0.95", { size: 20, color: P.red, anchor: "end" }), 350);
  },
]};

FLOWS["golden-set-sources"] = { phases: [
  async () => {}, async () => {}, async () => {}, async () => {},
  async k => { await k.wait(1100); await Promise.all([70, 220, 370, 520].map((y, i) => k.wait(i * 150).then(() => send(k, [[590, y], [745, 300]], P.fYellow, 650)).then(t => k.fade(t, 0, 250)))); },
  async () => {},
]};

window.W3Anim = { Player, SCENES, FLOWS };
})();
