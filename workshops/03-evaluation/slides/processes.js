/* Process animations for the W3 deck: every drawing acts out the process it explains.
 *
 * Builds on explainers.js (Kit, Player). Actors are Excalidraw library icons exported as
 * sprites (assets/sprites.json, made by diagrams/tools/export_sprites.js), so the look matches
 * the libraries.excalidraw.com drawings. One phase per click; phase 0 plays when the slide opens.
 */
(() => {
"use strict";
const { Kit, SCENES, P, el } = window.W3Anim;
const SPR = window.W3_SPRITES || {};
const W = 1440, H = 640;

/* ------------------------------------------------------------------ extra kit helpers */
Object.assign(Kit.prototype, {
  sprite(name, cx, cy, h, parent) {
    const s = SPR[name], g = this.g(parent); g.c = [cx, cy];
    if (!s) { this.text(cx, cy, name, { size: 16, color: P.muted }, g); return g; }
    const w = s.w * h / s.h;
    const inner = el("svg", { x: cx - w / 2, y: cy - h / 2, width: w, height: h, viewBox: `0 0 ${s.w} ${s.h}`, overflow: "visible" }, g);
    inner.innerHTML = s.svg;
    return g;
  },
  card(cx, cy, w, h, text, o = {}, parent) {
    const g = this.g(parent); g.c = [cx, cy];
    this.box(cx - w / 2, cy - h / 2, w, h, { fill: o.fill ?? P.white, fillStyle: o.fillStyle, stroke: o.stroke ?? P.ink, dash: o.dash, r: o.r ?? 10, strokeWidth: o.sw ?? 1.8, hachureGap: o.gap ?? 9 }, g);
    if (text !== undefined && text !== "") g.t = this.text(o.left ? cx - w / 2 + 14 : cx, cy, text, { size: o.size ?? 20, color: o.color, anchor: o.left ? "start" : "middle", mono: o.mono }, g);
    return g;
  },
  chip(cx, cy, text, o = {}, parent) {
    const size = o.size ?? 19, longest = Math.max(...String(text).split("\n").map(l => l.length));
    const w = o.w ?? Math.max(50, longest * size * 1.1 * (o.mono ? .62 : .53) + 28), lines = String(text).split("\n").length;
    return this.card(cx, cy, w, o.h ?? (size * 1.1 * 1.35 * lines + 18), text, { ...o, size, r: o.r ?? 18 }, parent);
  },
  flyTo(node, x, y, dur = 650) { return this.move(node, x - node.c[0], y - node.c[1], dur); },
  flyAlong(node, pts, dur = 900) { return this.along(node, pts.map(([x, y]) => [x - node.c[0], y - node.c[1]]), dur); },
  async out(node, dur = 300) { if (!node || !node.parentNode) return; await this.fade(node, 0, dur); node.remove(); },
  async gone(list, dur = 300) { await Promise.all(list.filter(Boolean).map(n => this.out(n, dur))); },
  async type(textNode, str, dur = 900) { const ts = textNode.querySelector("tspan") || textNode; await this.tween(dur, k => { ts.textContent = str.slice(0, Math.round(str.length * k)); }); },
  async count(textNode, from, to, fmt, dur = 900) { const ts = textNode.querySelector("tspan") || textNode; await this.tween(dur, k => { ts.textContent = fmt(from + (to - from) * k); }); },
  tint(node, color) { node.querySelectorAll("path").forEach(p => { const s = p.getAttribute("stroke"); if (s && s !== "none") p.setAttribute("stroke", color); }); },
  setText(textNode, str) { const ts = textNode.querySelector("tspan") || textNode; ts.textContent = str; },
  async think(x, y, dur = 900) {
    const g = this.g(); [0, 1, 2].forEach(i => el("circle", { cx: x + i * 18, cy: y, r: 5, fill: P.ink }, g));
    await this.tween(dur, k => { [...g.children].forEach((c, i) => { c.style.opacity = .25 + .75 * Math.abs(Math.sin((k * 3 + i * .33) * Math.PI)); }); });
    g.remove();
  },
  async shake(node, dur = 450) { const x0 = node._x || 0, y0 = node._y || 0; await this.tween(dur, k => this.pos(node, x0 + Math.sin(k * Math.PI * 6) * 7 * (1 - k), y0)); this.pos(node, x0, y0); },
  async spin(node, cx, cy, turns = 1, dur = 900) { await this.tween(dur, k => node.setAttribute("transform", `rotate(${k * 360 * turns} ${cx} ${cy})`)); node.removeAttribute("transform"); },
  async scan(x, y, w, h, color = P.fYellow, dur = 900, vertical = false) {
    const r = el("rect", vertical ? { x, y, width: w, height: 18, rx: 6, fill: color, opacity: .75 } : { x, y, width: 18, height: h, rx: 6, fill: color, opacity: .75 }, this.layer);
    await this.tween(dur, k => vertical ? r.setAttribute("y", y + k * (h - 18)) : r.setAttribute("x", x + k * (w - 18))); r.remove();
  },
  stamp(cx, cy, text, color, rot = -6, size = 26) {
    const g = this.g(); g.c = [cx, cy];
    const w = text.length * size * .55 + 30;
    this.box(cx - w / 2, cy - size * .9, w, size * 1.8, { stroke: color, strokeWidth: 3, r: 8 }, g);
    this.text(cx, cy, text, { size, color }, g);
    g.setAttribute("transform", `rotate(${rot} ${cx} ${cy})`);
    return g;
  },
});

/* ------------------------------------------------------------------ the RAG system, reused in several scenes */
function drawSystem(k, x, y, w = 440, h = 290, o = {}) {
  const S = { x, y, w, h, g: k.g() };
  k.box(x, y, w, h, { stroke: P.ink, dash: true, strokeWidth: 1.6 }, S.g);
  k.text(x + w / 2, y + 22, o.title ?? "our RAG system (W2)", { size: 20, color: P.muted }, S.g);
  S.mag = [x + 90, y + h / 2 + 10]; S.bot = [x + w - 100, y + h / 2 + 10];
  S.db = [x + 90, y + h + 95];
  k.sprite("magnifier", S.mag[0], S.mag[1], 78, S.g); k.text(S.mag[0], S.mag[1] + 62, "retrieve", { size: 18, color: P.muted }, S.g);
  k.sprite("robot", S.bot[0], S.bot[1], 140, S.g); k.text(S.bot[0], S.bot[1] + 88, "LLM writes", { size: 18, color: P.muted }, S.g);
  k.sprite("db", S.db[0], S.db[1], 82, S.g); k.text(S.db[0] + 58, S.db[1] + 10, "Civil Code\narticles", { size: 18, color: P.muted, anchor: "start" }, S.g);
  k.line([[S.db[0], y + h], [S.db[0], S.db[1] - 45]], { stroke: P.muted, dash: true, strokeWidth: 1.4 }, S.g);
  S.in = [x, y + h / 2]; S.out = [x + w, y + h / 2];
  return S;
}
async function ask(k, S, q, a, o = {}) {
  // a question enters, the retriever fetches articles, the LLM writes, the answer leaves
  const fast = o.fast ? .45 : 1;
  const qc = k.chip(o.from[0], o.from[1], q, { fill: P.fYellow, size: 18 }); await k.draw(qc, 250 * fast);
  await k.flyTo(qc, S.mag[0] + 10, S.mag[1] - 70, 650 * fast);
  const lens = k.sprite("magnifier", S.mag[0], S.mag[1], 78); await k.flyTo(lens, S.db[0], S.db[1] - 20, 450 * fast);
  const arts = (o.arts ?? ["Art. 44", "Art. 45", "Art. 46"]).map((t, i) => k.chip(S.db[0], S.db[1] - 20, t, { fill: P.fBlue, size: 16 }));
  arts.forEach(c => k.draw(c, 150));
  await k.flyTo(lens, S.mag[0], S.mag[1], 450 * fast); lens.remove();
  const mid = (S.mag[0] + S.bot[0]) / 2;
  await Promise.all(arts.map((c, i) => k.flyTo(c, mid, S.y + 80 + i * 44, 500 * fast)));
  await Promise.all([k.flyTo(qc, mid, S.y + 80 + 3 * 44 + 10, 450 * fast), ...arts.map(c => k.wait(1))]);
  await Promise.all([...arts, qc].map(c => k.flyTo(c, S.bot[0] - 10, S.bot[1] - 20, 450 * fast)));
  await k.gone([...arts, qc], 150);
  await k.think(S.bot[0] - 18, S.bot[1] - 95, 700 * fast);
  const ac = k.chip(S.bot[0], S.bot[1] - 10, a, { fill: o.ansFill ?? P.fGreen, size: 18 }); await k.draw(ac, 250 * fast);
  await k.flyTo(ac, o.to[0], o.to[1], 650 * fast);
  return ac;
}

/* ------------------------------------------------------------------ 2 · the day, as data moving between workshops */
SCENES.day = { w: W, h: H, label: "The data moving through the five workshops", phases: [
  async (k, st) => {
    k.caption("One day, one system: follow the data", P.muted);
    st.xs = [130, 420, 710, 1000, 1290];
    const icons = [["pdf", 140], ["db", 145], ["robotHappy", 170], ["server", 145], ["dial", 135]];
    const titles = ["W1 · Corpus", "W2 · Hybrid RAG", "W3 · Evaluation", "W4 · Serving", "W5 · Observe + Gate"];
    for (let i = 0; i < 5; i++) {
      const g = k.g(); k.sprite(icons[i][0], st.xs[i], 170, icons[i][1], g); k.text(st.xs[i], 290, titles[i], { size: 28 }, g);
      if (i < 4) k.arrow(st.xs[i] + 88, 170, st.xs[i + 1] - 88, 170, { stroke: P.muted, strokeWidth: 1.6 }, g);
      await k.draw(g, 300);
    }
  },
  async (k, st) => {
    k.caption("W1 turns the bilingual PDF into one validated record per article");
    const cards = ["Art. 147", "Art. 148", "Art. 149"].map((t, i) => k.chip(st.xs[0], 160, t, { fill: P.fYellow, size: 18 }));
    await Promise.all(cards.map((c, i) => k.draw(c, 200).then(() => k.flyTo(c, st.xs[0] - 80 + i * 80, 390 + (i % 2) * 40, 600))));
    await k.wait(300);
    await Promise.all(cards.map(c => k.flyTo(c, st.xs[0], 400, 450))); await k.gone(cards, 120);
    st.json = k.chip(st.xs[0], 400, "articles.json", { fill: P.fYellow, mono: true, size: 17 }); await k.draw(st.json, 300);
  },
  async (k, st) => {
    k.caption("W2 indexes the articles and answers questions with citations");
    await k.flyAlong(st.json, [[st.xs[0], 400], [st.xs[0] + 140, 400], [st.xs[1], 210]], 900); await k.out(st.json, 200);
    const q = k.chip(st.xs[1] - 10, 400, "What is the age of majority?", { fill: P.fYellow, size: 17 }); await k.draw(q, 250);
    await k.flyTo(q, st.xs[1], 210, 600); await k.out(q, 150);
    st.ans = k.chip(st.xs[1], 400, "21 years · Art. 44", { fill: P.fGreen, size: 18 }); await k.draw(st.ans, 300);
  },
  async (k, st) => {
    k.caption("W3 (today): measure every answer, not just this one", P.orange);
    st.here = k.box(st.xs[2] - 140, 70, 280, 260, { stroke: P.orange, dash: true, fill: P.fYellow, fillStyle: "hachure", gap: 12 }); await k.draw(st.here, 400);
    await k.flyAlong(st.ans, [[st.xs[1], 400], [st.xs[1] + 140, 400], [st.xs[2], 210]], 900); await k.out(st.ans, 200);
    st.score = k.card(st.xs[2], 410, 250, 90, "faithfulness 0.86\nhit@5 0.90", { size: 19 }); await k.draw(st.score, 350);
  },
  async (k, st) => {
    k.caption("W4 ships it fast and cheap · W5 watches it and guards every merge");
    const sys = k.chip(st.xs[2], 500, "the RAG system", { fill: P.fBlue, size: 18 }); await k.draw(sys, 250);
    await k.flyAlong(sys, [[st.xs[2], 500], [st.xs[3], 500], [st.xs[3], 210]], 900);
    const box = k.box(st.xs[3] - 100, 80, 200, 175, { stroke: P.blue, strokeWidth: 2.4 }); await k.draw(box, 300);
    await k.draw(k.text(st.xs[3], 335, "container · p95 2.9 s", { size: 19, color: P.blue }), 250);
    await k.flyAlong(sys, [[st.xs[3], 210], [st.xs[3] + 140, 360], [st.xs[4], 210]], 800); await k.out(sys, 200);
    await k.draw(k.text(st.xs[4], 335, "traces · CI gate ✓", { size: 19, color: P.green }), 250);
  },
  async (k, st) => {
    k.caption("…and both reuse today's eval", P.orange);
    for (const [i, label] of [[3, "every speed-up\nis re-scored"], [4, "every pull request\nruns this eval"]]) {
      const c = k.card(st.xs[2], 410, 250, 90, "faithfulness 0.86\nhit@5 0.90", { size: 19 });
      await k.flyAlong(c, [[st.xs[2], 410], [st.xs[2] + 60, 560], [st.xs[i] - 40, 560], [st.xs[i], 440]], 1100);
      await k.draw(k.text(st.xs[i], 545, label, { size: 19, color: P.orange }), 250);
    }
  },
]};

/* ------------------------------------------------------------------ 5 · evaluation vs observability vs guardrails */
SCENES.jobs = { w: W, h: H, label: "Evaluation, observability and guardrails acted out on the RAG system", phases: [
  async (k, st) => {
    k.caption("Evaluation: the exam, before release", P.orange);
    st.S = drawSystem(k, 390, 120); await k.draw(st.S.g, 700);
    st.ev = k.g(); k.sprite("guy", 80, 270, 150, st.ev); k.text(80, 370, "you, before\nrelease", { size: 18, color: P.muted }, st.ev);
    k.sprite("clipboard", 230, 300, 105, st.ev); k.text(230, 385, "golden set\n20 questions", { size: 18, color: P.muted }, st.ev);
    await k.draw(st.ev, 450);
    st.right = k.g(); k.sprite("robotJudge", 1170, 300, 150, st.right); k.text(1170, 400, "judge", { size: 19, color: P.muted }, st.right);
    st.board = k.card(1340, 290, 175, 230, "", { fill: P.white }, st.right); k.text(1340, 195, "scoreboard", { size: 18, color: P.muted }, st.right);
    await k.draw(st.right, 450);
  },
  async (k, st) => {
    k.caption("1 · Take one golden question and ask the system", P.orange);
    st.ans = await ask(k, st.S, "What is the age of majority?", "Majority is 21 (Art. 44)", { from: [230, 250], to: [960, 330] });
  },
  async (k, st) => {
    k.caption("2 · Compare with the reference answer and let the judge score it", P.orange);
    st.ref = k.chip(230, 250, "reference: 21 years, Art. 44", { fill: P.fViolet, size: 18 }); await k.draw(st.ref, 250);
    await k.flyAlong(st.ref, [[230, 250], [230, 80], [960, 80], [960, 230]], 1100);
    const l1 = k.line([[1080, 230], [1120, 280]], { stroke: P.muted, dash: true }), l2 = k.line([[1080, 330], [1120, 300]], { stroke: P.muted, dash: true });
    await Promise.all([k.draw(l1, 250), k.draw(l2, 250)]);
    await k.think(1150, 205, 700);
    st.rows = [];
    for (const [i, s] of ["right article ✓", "faithful ✓", "cites Art. 44 ✓"].entries()) { const t = k.text(1265, 230 + i * 40, s, { size: 18, color: P.green, anchor: "start" }); st.rows.push(t); await k.draw(t, 220); }
    st.links = [l1, l2];
  },
  async (k, st) => {
    k.caption("3 · Repeat for all 20 questions, then decide", P.orange);
    await k.gone([st.ans, st.ref, ...st.links, ...st.rows], 250);
    const ctr = k.text(160, 470, "question 1 / 20", { size: 22, anchor: "middle" }); await k.draw(ctr, 200);
    const stream = [];
    for (let i = 2; i <= 20; i++) {
      k.setText(ctr, `question ${i} / 20`);
      const t = k.token(i % 6 === 0 ? P.fRed : P.fGreen, 8); k.pos(t, 230, 300); stream.push(k.along(t, [[230, 300], [390, 265], [830, 265], [1170, 300]], 650).then(() => t.remove()));
      await k.wait(110);
    }
    await Promise.all(stream);
    st.rows = [];
    for (const [i, [s, c]] of [["hit@5 0.85", P.ink], ["faithful 0.86", P.ink], ["citations 0.78", P.red]].entries()) { const t = k.text(1265, 230 + i * 40, s, { size: 18, color: c, anchor: "start" }); st.rows.push(t); await k.draw(t, 220); }
    st.verdict = k.text(1340, 440, "below the floor:\nfix before release", { size: 18, color: P.red }); await k.draw(st.verdict, 300);
    st.ctr = ctr;
  },
  async (k, st) => {
    k.caption("Observability: the dashcam, after release", P.blue);
    await k.gone([st.ev, st.right, st.ctr, st.verdict, ...st.rows], 300);
    st.users = k.g(); k.sprite("users", 110, 280, 100, st.users); k.text(110, 350, "real users", { size: 19, color: P.muted }, st.users); await k.draw(st.users, 300);
    st.cam = k.sprite("camera", 800, 108, 60); await k.draw(st.cam, 300);
    const reqs = [];
    for (let i = 0; i < 5; i++) { const t = k.token(P.fYellow, 8); k.pos(t, 170, 265); reqs.push(k.along(t, [[170, 265], [390, 265], [830, 265], [830, 300], [390, 300], [170, 300]], 1400).then(() => t.remove())); await k.wait(220); }
    st.trace = k.g(); k.card(1125, 160, 560, 150, "", { fill: P.white }, st.trace); k.text(860, 100, "trace of one request", { size: 18, color: P.muted, anchor: "start" }, st.trace);
    await k.draw(st.trace, 300);
    const spans = [["embed 40 ms", 60], ["retrieve 120 ms", 100], ["rerank 80 ms", 80], ["generate 1900 ms", 270]];
    let x = 870;
    for (const [i, [name, w]] of spans.entries()) {
      const y = 124 + i * 26;
      const bar = el("rect", { x, y, width: 0, height: 20, rx: 5, fill: [P.fBlue, P.fBlue, P.fViolet, P.fGreen][i], stroke: P.ink, "stroke-width": 1 }, st.trace);
      await k.tween(300, kk => bar.setAttribute("width", w * kk));
      if (i < 3) k.text(x + w + 8, y + 10, name, { size: 15, anchor: "start" }, st.trace); else k.text(x + 10, y + 10, name, { size: 15, anchor: "start" }, st.trace);
      x += w;
    }
    await Promise.all(reqs);
    st.dash = k.g(); k.card(1125, 440, 560, 200, "", { fill: P.white }, st.dash); k.text(860, 352, "faithfulness on live traffic, sampled", { size: 18, color: P.muted, anchor: "start" }, st.dash);
    k.line([[870, 470], [1390, 470]], { stroke: P.red, dash: true, strokeWidth: 1.4 }, st.dash); k.text(1395, 470, "0.80", { size: 15, color: P.red, anchor: "start" }, st.dash);
    await k.draw(st.dash, 300);
    const pts = [[870, 420], [940, 410], [1010, 430], [1080, 415], [1150, 440], [1220, 455], [1290, 485], [1350, 505]];
    const path = el("polyline", { points: "", fill: "none", stroke: P.blue, "stroke-width": 3 }, st.dash);
    await k.tween(1500, kk => { const n = Math.max(2, Math.round(pts.length * kk)); path.setAttribute("points", pts.slice(0, n).map(p => p.join(",")).join(" ")); });
    st.bell = k.sprite("bell", 1395, 380, 55); await k.draw(st.bell, 200); await k.shake(st.bell);
    st.alert = k.text(1125, 520, "alert: faithfulness 0.74. It tells you afterwards.", { size: 18, color: P.red }); await k.draw(st.alert, 250);
  },
  async (k, st) => {
    k.caption("Guardrails: the brakes, inside every request", P.red);
    await k.gone([st.users, st.cam, st.trace, st.dash, st.bell, st.alert], 300);
    st.user = k.g(); k.sprite("talker", 100, 280, 140, st.user); k.text(100, 370, "a user", { size: 19, color: P.muted }, st.user); await k.draw(st.user, 300);
    const a = await ask(k, st.S, "Who signed contract 1182?", "Ahmed H., national ID 29801011234567", { from: [190, 230], to: [1010, 330], fast: true, ansFill: P.fYellow, arts: ["contract 1182"] });
    st.shield = k.sprite("shield", 1250, 330, 110); await k.draw(st.shield, 300);
    await k.flyTo(a, 1140, 330, 500);
    await k.scan(a.c[0] + (a._x || 0) - 170, 300, 340, 60, P.fRed, 700);
    await k.draw(k.text(1250, 420, "national ID found", { size: 19, color: P.red }), 200);
    k.setText(a.t, "Ahmed H., national ID ██████████");
    await k.flyAlong(a, [[1140, 330], [1140, 75], [200, 75], [200, 140]], 1300);
    await k.draw(k.text(260, 470, "it stops this one answer", { size: 22, color: P.red }), 250);
  },
  async (k) => {
    k.caption("Three jobs, three moments", P.ink);
    const items = [["exam · before release → stops a bad release", P.orange], ["dashcam · after release → tells you afterwards", P.blue], ["brakes · every request → stops one bad answer", P.red]];
    for (const [i, [s, c]] of items.entries()) await k.draw(k.chip(240 + i * 480, 605, s, { stroke: c, color: c, size: 18 }), 300);
  },
]};

/* ------------------------------------------------------------------ 7 · where a RAG system breaks, with a zoom on each mechanism */
SCENES.failures = { w: W, h: H, label: "One question through the pipeline, and how each stage can fail", phases: [
  async (k, st) => {
    k.caption("Follow one question through the pipeline", P.muted);
    st.x = { db: 110, mag: 360, top: 610, bot: 860, ans: 1110, user: 1330 };
    const row = k.g(), Y = 150;
    k.sprite("db", st.x.db, Y, 95, row); k.text(st.x.db, 222, "corpus (W1)", { size: 20 }, row);
    k.sprite("magnifier", st.x.mag, Y, 85, row); k.text(st.x.mag, 222, "retrieve + rerank", { size: 20 }, row);
    k.sprite("docs", st.x.top, Y, 90, row); k.text(st.x.top, 222, "top-k articles", { size: 20 }, row);
    k.sprite("robot", st.x.bot, Y, 120, row); k.text(st.x.bot, 222, "LLM writes", { size: 20 }, row);
    k.sprite("paper", st.x.ans, Y, 95, row); k.text(st.x.ans, 222, "answer", { size: 20 }, row);
    k.sprite("talker", st.x.user, Y, 110, row); k.text(st.x.user, 222, "user", { size: 20 }, row);
    [["db", "mag"], ["mag", "top"], ["top", "bot"], ["bot", "ans"], ["ans", "user"]].forEach(([a, b]) => k.arrow(st.x[a] + 62, Y, st.x[b] - 62, Y, { stroke: P.muted, strokeWidth: 1.6 }, row));
    await k.draw(row, 700);
    st.panel = k.box(30, 265, 1380, 365, { stroke: P.muted, dash: true, strokeWidth: 1.2 }); await k.draw(st.panel, 300);
    const t = k.token(P.fGreen, 12); k.pos(t, st.x.user, 95);
    await k.along(t, [[st.x.user, 95], [st.x.mag, 70], [st.x.mag, 150], [st.x.top, 150], [st.x.bot, 150], [st.x.ans, 150], [st.x.user, 150]], 2400);
    await k.burst(st.x.user, 150, P.green); t.remove();
    await k.draw(k.text(720, 445, "the happy path: right articles, faithful answer, correct citation", { size: 22, color: P.green }), 300);
  },
  async (k, st) => {
    await clearPanel(k, st); k.caption("1 · Parsing (W1): the article split goes wrong", P.red);
    const zoom = k.line([[st.x.db, 225], [130, 300]], { stroke: P.red, dash: true }); await k.draw(zoom, 200);
    const pdf = k.sprite("pdf", 140, 440, 140), gear = k.g(); k.sprite("gear", 360, 440, 90, gear);
    await k.draw(pdf, 300); await k.draw(gear, 250);
    await k.draw(k.arrow(210, 440, 310, 440, { stroke: P.muted }), 200);
    await k.spin(gear, 360, 440, 1, 900);
    await k.draw(k.arrow(410, 440, 500, 440, { stroke: P.muted }), 200);
    const g1 = k.chip(600, 395, "Art. 147", { dash: true, color: P.muted, size: 18 }), g2 = k.chip(600, 485, "Art. 148", { dash: true, color: P.muted, size: 18 });
    await k.draw(g1, 200); await k.draw(g2, 200);
    await k.draw(k.text(600, 540, "expected: two records", { size: 17, color: P.muted }), 200);
    const bad = k.chip(860, 440, "Art. 147 + Art. 148\n(one record)", { fill: P.fRed, stroke: P.red, size: 18 }); await k.draw(bad, 350);
    await k.draw(k.text(860, 520, "what the parser produced", { size: 17, color: P.red }), 200);
    const note = k.text(1180, 440, "retrieval can never\nreturn Art. 147 alone", { size: 22, color: P.red }); await k.draw(note, 300);
  },
  async (k, st) => {
    await clearPanel(k, st); k.caption("2 · Retrieval: the question lands next to the wrong article", P.red);
    const zoom = k.line([[st.x.mag, 225], [380, 300]], { stroke: P.red, dash: true }); await k.draw(zoom, 200);
    const sp = k.box(80, 300, 640, 300, { stroke: P.muted, dash: true, strokeWidth: 1 }); await k.draw(sp, 200);
    k.text(95, 320, "embedding space", { size: 16, color: P.muted, anchor: "start" });
    const dots = [[330, 400, "Art. 44 · age of majority"], [500, 500, "Art. 45 · no discernment"], [600, 380, "Art. 46 · limited capacity"], [180, 540, "Art. 89"]];
    for (const [x, y, s] of dots) { const g = k.g(); k.circle(x, y, 20, { fill: P.fBlue }, g); k.text(x + 16, y - 20, s, { size: 16, anchor: "start" }, g); await k.draw(g, 150); }
    const q = k.token(P.fYellow, 11); k.pos(q, 380, 300); await k.along(q, [[380, 300], [470, 470]], 700);
    const ring = k.circle(470, 470, 110, { stroke: P.red, dash: true }); await k.draw(ring, 300);
    await k.draw(k.line([[470, 470], [500, 500]], { stroke: P.red, strokeWidth: 3 }), 200);
    await k.draw(k.text(1060, 430, "picked Art. 45 (no discernment)\ninstead of Art. 44 (majority)", { size: 22, color: P.red }), 300);
    await k.draw(k.text(1060, 520, "the Arabic question was embedded badly", { size: 18, color: P.muted }), 250);
  },
  async (k, st) => {
    await clearPanel(k, st); k.caption("3 · Ranking: the right article is 9th, and top_k keeps only 5", P.red);
    const nums = [151, 89, 12, 163, 90, 418, 176, 120, "147(2)", 200], chips = [];
    for (let i = 0; i < 10; i++) {
      const c = k.chip(110 + i * 132, 400, `#${i + 1}\nArt. ${nums[i]}`, { size: 18, w: 112, fill: i === 8 ? P.fGreen : P.white, stroke: i === 8 ? P.green : P.ink }); chips.push(c); await k.draw(c, 120);
    }
    const cut = el("line", { x1: 1380, y1: 330, x2: 1380, y2: 470, stroke: P.blue, "stroke-width": 4, "stroke-dasharray": "10 8" }, k.layer);
    const lab = k.text(1380, 315, "top_k cut", { size: 18, color: P.blue });
    await k.tween(1200, kk => { const x = 1380 - kk * (1380 - 702); cut.setAttribute("x1", x); cut.setAttribute("x2", x); lab.setAttribute("x", x); lab.querySelector("tspan").setAttribute("x", x); });
    await Promise.all(chips.slice(5).map(c => k.fade(c, .25, 400)));
    await k.draw(k.mark(1166, 470, false, null, 1.3), 250);
    await k.draw(k.text(720, 545, "Art. 147(2) is dropped before the LLM ever sees it", { size: 22, color: P.red }), 300);
  },
  async (k, st) => {
    await clearPanel(k, st); k.caption("4 · Generation: the LLM writes a ruling that is in no article", P.red);
    const art = k.card(330, 440, 560, 200, "", { fill: P.fBlue, fillStyle: "hachure", stroke: P.blue }); await k.draw(art, 300);
    k.text(70, 365, "retrieved · Art. 147(2)", { size: 17, color: P.blue, anchor: "start" });
    await k.draw(k.text(70, 445, "If exceptional, unforeseeable events make\nperformance excessively onerous, the judge\nmay reduce the obligation to a reasonable limit.", { size: 19, anchor: "start" }), 300);
    k.text(700, 365, "the answer, as the LLM writes it", { size: 17, color: P.muted, anchor: "start" });
    const l1 = k.text(700, 420, "", { size: 21, anchor: "start" }), l2 = k.text(700, 460, "", { size: 21, anchor: "start" }), l3 = k.text(700, 500, "", { size: 21, anchor: "start", color: P.red });
    await k.type(l1, "The judge may reduce the obligation", 900); await k.type(l2, "to a reasonable limit,", 600); await k.type(l3, "and must cancel the contract if the loss is over a third.", 1300);
    await k.draw(k.line([[700, 520], [1340, 520]], { stroke: P.red, strokeWidth: 3 }), 300);
    await k.draw(k.text(1020, 570, "no sentence in the article says this: invented law", { size: 19, color: P.red }), 300);
  },
  async (k, st) => {
    await clearPanel(k, st); k.caption("5 · Citation: it cites an article it never retrieved", P.red);
    const set = k.card(380, 440, 520, 170, "", { stroke: P.blue }); await k.draw(set, 250);
    k.text(140, 375, "retrieved", { size: 18, color: P.blue, anchor: "start" });
    const have = [[230, 147], [380, 148], [530, 151]].map(([x, n]) => k.chip(x, 450, `Art. ${n}`, { fill: P.fBlue, size: 19 })); for (const c of have) await k.draw(c, 120);
    k.text(1000, 375, "citations in the answer", { size: 18, color: P.muted });
    const c1 = k.chip(920, 450, "Art. 147", { fill: P.fYellow, size: 19 }), c2 = k.chip(1080, 450, "Art. 375", { fill: P.fYellow, size: 19 });
    await k.draw(c1, 200); await k.draw(c2, 200);
    await k.flyTo(c1, 230, 520, 800); await k.draw(k.mark(290, 520, true), 200);
    await k.flyTo(c2, 640, 520, 800); await k.shake(c2); await k.flyTo(c2, 1080, 450, 600);
    c2.querySelector("path").setAttribute("fill", P.fRed);
    await k.draw(k.text(1080, 530, "phantom citation:\nit came from the model's memory", { size: 20, color: P.red }), 300);
  },
  async (k, st) => {
    await clearPanel(k, st); k.caption("Two kinds of failure, two kinds of test", P.ink);
    await k.draw(k.card(380, 445, 640, 200, "1–3  retrieval failures\n\nmeasure with plain code, for free:\nwe know the right article numbers", { stroke: P.blue, size: 22, color: P.blue }), 400);
    await k.draw(k.card(1060, 445, 640, 200, "4–5  generation failures\n\nneed a judge (or a citation check):\nthe text has to be read", { stroke: P.green, size: 22, color: P.green }), 400);
  },
]};
async function clearPanel(k, st) {
  // everything drawn after the panel belongs to the previous phase: remove it
  const kids = [...k.layer.children]; const i = kids.indexOf(st.panel);
  const old = kids.slice(i + 1).filter(n => n !== k._cap);
  await k.gone(old, 250);
}

/* ------------------------------------------------------------------ 8 · building the golden set */
SCENES.golden = { w: W, h: H, label: "Questions flowing into the golden set from four sources", phases: [
  async (k, st) => {
    k.caption("Building the golden set", P.muted);
    const src = k.g();
    k.sprite("docs", 90, 120, 85, src); k.text(150, 120, "reference benchmark", { size: 21, anchor: "start" }, src);
    k.sprite("lawyer", 90, 265, 115, src); k.text(150, 265, "lawyers", { size: 21, anchor: "start" }, src);
    k.sprite("robot", 90, 420, 115, src); k.text(150, 400, "an LLM drafts", { size: 21, anchor: "start" }, src);
    k.sprite("guy", 400, 420, 105, src); k.text(400, 492, "a human checks", { size: 18, color: P.muted }, src);
    k.sprite("users", 90, 575, 70, src); k.text(150, 575, "failed real questions (W5)", { size: 21, anchor: "start" }, src);
    await k.draw(src, 700);
    st.file = k.g(); k.card(800, 320, 300, 420, "", { fill: P.fYellow, fillStyle: "hachure", stroke: P.orange }, st.file);
    k.card(800, 340, 260, 340, "", { fill: P.white, stroke: "none" }, st.file);
    k.text(800, 135, "golden_set.jsonl", { size: 24, mono: true }, st.file);
    st.ctr = k.text(800, 520, "0 questions", { size: 22 }, st.file);
    await k.draw(st.file, 450);
    st.n = 0; st.lines = [];
  },
  async (k, st) => { k.caption("1 · Start from the reference benchmark"); await addCards(k, st, [90, 120], 10, P.fBlue); },
  async (k, st) => {
    k.caption("2 · Lawyers write questions and approve reference answers");
    const pad = k.card(300, 265, 150, 100, "", { fill: P.white }); await k.draw(pad, 200);
    const ink = []; for (let i = 0; i < 3; i++) { const l = k.line([[240, 240 + i * 22], [360, 240 + i * 22]], { stroke: P.muted, strokeWidth: 1.4 }, pad); ink.push(l); await k.draw(l, 220); }
    await k.out(pad, 200);
    await addCards(k, st, [300, 265], 4, P.fViolet);
  },
  async (k, st) => {
    k.caption("3 · An LLM drafts questions; a human checks every single one");
    const drafts = [];
    for (let i = 0; i < 6; i++) { const c = k.chip(90, 420, `Q?`, { fill: P.fGreen, size: 17 }); await k.draw(c, 80); drafts.push(c); await k.flyTo(c, 300, 340 + (i % 3) * 32, 350); }
    for (const [i, c] of drafts.entries()) {
      await k.flyTo(c, 400, 350, 300);
      if (i === 1 || i === 4) { await k.draw(k.mark(440, 350, false), 120); await Promise.all([k.flyTo(c, 400, 620, 450), k.fade(c, 0, 450)]); c.remove(); }
      else { await k.out(c, 120); await addCards(k, st, [400, 350], 1, P.fGreen, true); }
    }
  },
  async (k, st) => { k.caption("4 · Real questions that failed in production"); await addCards(k, st, [90, 575], 2, P.fRed); },
  async (k, st) => {
    k.caption("5 · Version it, and compare runs only on the same exam");
    st.stamp = k.stamp(800, 590, "v1 · hash 3f9a1c", P.orange); await k.draw(st.stamp, 300);
    for (const [i, [name, sc]] of [["run A · dense", "hit@5 0.74"], ["run B · hybrid", "hit@5 0.90"]].entries()) {
      const y = 170 + i * 150; await k.draw(k.arrow(960, 300, 1110, y, { stroke: P.muted }), 250);
      await k.draw(k.card(1260, y, 280, 100, `${name}\n${sc}`, { size: 21 }), 300);
    }
    await k.draw(k.text(1260, 410, "same exam → comparable ✓", { size: 21, color: P.green }), 300);
  },
  async (k, st) => {
    k.caption("6 · Edit one question: new hash, and old scores stop meaning anything", P.red);
    const hl = k.hl(690, st.lines[7] - 6, 220, 12, P.orange); await k.fade(hl, 1, 300);
    await k.out(st.stamp, 200); st.stamp = k.stamp(800, 590, "v2 · hash 7b21e0", P.red); await k.draw(st.stamp, 300);
    await k.draw(k.arrow(960, 340, 1110, 520, { stroke: P.red }), 250);
    await k.draw(k.card(1260, 520, 280, 100, "run C · hybrid\nhit@5 0.93", { size: 21, stroke: P.red }), 300);
    await k.draw(k.text(1260, 600, "≠ not comparable with A or B", { size: 21, color: P.red }), 300);
  },
]};
async function addCards(k, st, from, n, fill, quick = false) {
  for (let i = 0; i < n; i++) {
    const c = k.chip(from[0], from[1], "Q", { fill, size: 15, w: 40 }); if (!quick) await k.draw(c, 80);
    const y = 190 + st.n * 15; await k.flyTo(c, 800, y, quick ? 350 : 420); await k.out(c, 100);
    const ln = k.line([[690, y], [910, y]], { stroke: fill === P.fRed ? P.red : P.ink, strokeWidth: 2, roughness: .6 }, st.file); await k.draw(ln, 100);
    st.lines.push(y); st.n++; k.setText(st.ctr, `${st.n} questions`);
  }
}

/* ------------------------------------------------------------------ 11 · four arrows: the pipeline produces artifacts, a judge compares pairs */
SCENES.triad = { w: W, h: H, label: "The RAG pipeline producing its artifacts and a judge scoring each pair", phases: [
  async (k, st) => {
    k.caption("The pipeline produces three things; each metric compares two of them", P.muted);
    k.text(930, 80, "question", { size: 18, color: P.muted });
    st.Q = k.card(930, 150, 460, 110, "Can a judge reduce an obligation\nmade onerous by exceptional events?", { fill: P.fYellow, size: 20 }); await k.draw(st.Q, 350);
    const lens = k.sprite("magnifier", 930, 270, 70); await k.draw(lens, 200);
    await k.flyTo(lens, 300, 360, 800);
    k.text(300, 382, "retrieved articles", { size: 18, color: P.blue });
    st.C = k.card(300, 480, 460, 150, "Art. 148 · good faith\nArt. 151 · obligations of parties\nArt. 89 · conclusion of contract", { fill: P.fBlue, size: 20 }); await k.draw(st.C, 400);
    await k.out(lens, 200);
    const bot = k.sprite("robot", 725, 480, 120); await k.draw(bot, 250);
    const tok = k.token(P.fBlue, 10); k.pos(tok, 535, 480); await k.along(tok, [[535, 480], [670, 480]], 600); tok.remove();
    await k.think(705, 400, 700);
    k.text(1150, 382, "answer", { size: 18, color: P.green });
    st.A = k.card(1150, 480, 460, 150, "“Contracts must be performed\nin good faith (Art. 148).”", { fill: P.fGreen, size: 20 }); await k.draw(st.A, 400);
    await k.out(bot, 300);
  },
  async (k) => {
    k.caption("context precision: are the retrieved articles relevant to the question?", P.blue);
    await judgeBetween(k, [640, 290], [[800, 210], [420, 400]], [840, 300], "1 of 3 useful → 0.33", P.blue);
    await k.draw(k.arrow(800, 210, 440, 400, { stroke: P.blue, strokeWidth: 2.5 }), 300);
  },
  async (k) => {
    k.caption("faithfulness: is every claim in the answer backed by the articles?", P.green);
    await judgeBetween(k, [725, 470], [[535, 480], [915, 480]], [725, 585], "every claim is in Art. 148 → 1.0", P.green);
    await k.draw(k.arrow(535, 480, 915, 480, { stroke: P.green, strokeWidth: 2.5 }), 300);
  },
  async (k) => {
    k.caption("answer relevancy: does the answer address the question?", P.green);
    await judgeBetween(k, [1050, 290], [[1030, 210], [1110, 400]], [1260, 300], "never says yes or no → 0.6", P.green);
    await k.draw(k.arrow(1110, 400, 1030, 210, { stroke: P.green, strokeWidth: 2.5 }), 300);
  },
  async (k) => {
    k.caption("context recall: did we retrieve what the reference answer needs?", P.violet);
    const law = k.sprite("lawyer", 55, 150, 110); await k.draw(law, 250);
    k.text(330, 80, "reference answer · written by a lawyer", { size: 18, color: P.violet });
    const R = k.card(330, 150, 420, 110, "Yes: Art. 147(2) lets the judge\nreduce it to a reasonable limit.", { fill: P.fViolet, dash: true, size: 20 }); await k.draw(R, 400);
    await judgeBetween(k, [300, 290], [[300, 210], [300, 400]], [150, 300], "Art. 147 missing → 0.0", P.blue);
    await k.draw(k.arrow(300, 210, 300, 400, { stroke: P.blue, strokeWidth: 2.5, dash: true }), 300);
  },
  async (k) => {
    k.caption("faithfulness 1.0, recall 0.0: faithful, and still wrong", P.red);
    await k.draw(k.chip(1150, 610, "only context recall catches this one", { stroke: P.red, color: P.red, fill: P.fRed, fillStyle: "hachure", size: 20 }), 400);
  },
]};
async function judgeBetween(k, at, targets, vpos, verdict, color) {
  const j = k.sprite("robotJudge", at[0], at[1], 90); await k.draw(j, 250);
  const ls = targets.map(([x, y]) => k.line([at, [x, y]], { stroke: P.muted, dash: true, strokeWidth: 1.4 }));
  await Promise.all(ls.map(l => k.draw(l, 300)));
  await k.think(at[0] - 18, at[1] - 62, 700);
  const v = k.chip(at[0], at[1], verdict, { stroke: color, color, size: 17, mono: true, fill: P.white }); await k.draw(v, 250);
  await k.gone([j, ...ls], 300); await k.flyTo(v, vpos[0], vpos[1], 450);
}

/* ------------------------------------------------------------------ 13 · LLM-as-judge: prompt in, JSON out, number logged */
SCENES.judge = { w: W, h: H, label: "How an LLM judge turns three inputs into a score", phases: [
  async (k, st) => {
    k.caption("LLM-as-judge: how one score is produced", P.muted);
    st.inp = [["question", "When can a judge reduce\nan onerous obligation?", P.fBlue], ["retrieved article", "Art. 147(2): the judge may\nreduce it to a reasonable limit", P.fYellow], ["answer under test", "…the judge may reduce it, and\nmust cancel if the loss > 1/3", P.fGreen]]
      .map(([t, b, f], i) => { const c = k.card(175, 145 + i * 175, 320, 130, b, { fill: f, size: 17 }); k.text(170, 64 + i * 175, t, { size: 17, color: P.muted }); return c; });
    for (const c of st.inp) await k.draw(c, 250);
    st.tpl = k.g(); k.card(640, 300, 440, 500, "", { fill: P.white }, st.tpl);
    k.text(440, 75, "judge prompt (template)", { size: 18, color: P.violet, anchor: "start" }, st.tpl);
    const lines = ["You grade legal answers strictly.", "", "Question:", "", "Context:", "", "Answer:", "", "1. Split the answer into claims.", "2. Mark each claim 1 if the context", "   supports it, otherwise 0.", "3. Reply with JSON only."];
    lines.forEach((s, i) => s && k.text(440, 115 + i * 34, s, { size: 18, anchor: "start" }, st.tpl));
    st.slots = [[0, 183], [1, 251], [2, 319]].map(([i, y]) => { const r = k.box(540, y - 15, 300, 30, { stroke: P.violet, dash: true, strokeWidth: 1.2, r: 6 }, st.tpl); return { y, r }; });
    await k.draw(st.tpl, 500);
    st.botG = k.sprite("robotJudge", 960, 330, 190); await k.draw(st.botG, 300); k.text(960, 450, "judge model", { size: 18, color: P.muted });
  },
  async (k, st) => {
    k.caption("1 · Fill the template with the three inputs", P.violet);
    const short = ["When can a judge reduce…?", "Art. 147(2): may reduce…", "…may reduce it, must cancel…"];
    for (let i = 0; i < 3; i++) {
      const tok = k.chip(170, 145 + i * 175, short[i], { fill: [P.fBlue, P.fYellow, P.fGreen][i], size: 16 }); await k.draw(tok, 150);
      await k.flyTo(tok, 700, st.slots[i].y, 700);
    }
  },
  async (k, st) => {
    k.caption("2 · Send the filled prompt to the judge model", P.violet);
    const env = k.chip(640, 300, "prompt", { fill: P.fViolet, size: 20 }); await k.draw(env, 200);
    await k.flyTo(env, 950, 300, 800); await k.out(env, 200);
    await k.think(940, 215, 1200);
  },
  async (k, st) => {
    k.caption("3 · It answers in structured JSON", P.violet);
    st.out = k.card(1255, 280, 340, 340, "", { fill: P.fGray }); await k.draw(st.out, 250);
    const js = ['{', '  "claims": [', '    "judge may reduce it",', '    "must cancel if > 1/3"', '  ],', '  "verdicts": [1, 0],', '  "reason": "claim 2 is', '     not in Art. 147"', '}'];
    for (const [i, s] of js.entries()) { const t = k.text(1100, 135 + i * 33, "", { size: 16, anchor: "start", mono: true }); await k.type(t, s, 200 + s.length * 12); }
  },
  async (k, st) => {
    k.caption("4 · Code parses it into a number and logs it", P.ink);
    const v1 = k.chip(1225, 300, "1", { fill: P.fGreen, mono: true, size: 20 }), v0 = k.chip(1275, 300, "0", { fill: P.fRed, mono: true, size: 20 });
    await Promise.all([k.draw(v1, 150), k.draw(v0, 150)]);
    await Promise.all([k.flyTo(v1, 1110, 520, 700), k.flyTo(v0, 1160, 520, 700)]);
    await k.draw(k.text(1195, 520, "→  1 ÷ 2  =  0.5", { size: 26, anchor: "start" }), 300);
    await k.draw(k.chip(1150, 595, "per_question.csv: q006-en, faithfulness 0.5", { mono: true, size: 14 }), 300);
  },
]};

/* ------------------------------------------------------------------ 14 · judge biases as four small experiments */
SCENES.biases = { w: W, h: H, label: "Four experiments that show an LLM judge's biases", phases: [
  async (k, st) => {
    k.caption("A judge is an instrument: four experiments show its biases", P.muted);
    st.j = k.sprite("robotJudge", 720, 290, 230); await k.draw(st.j, 400); k.text(720, 435, "the judge", { size: 19, color: P.muted });
    st.tags = ["verbosity", "self-preference", "language", "noise"].map((s, i) => k.chip(330 + i * 260, 610, s, { size: 19, color: P.muted, stroke: P.muted }));
    for (const t of st.tags) await k.draw(t, 150);
    st.parts = [];
  },
  async (k, st) => experiment(k, st, 0, [["Yes: Art. 147(2) lets the judge reduce it.", P.white, 70], ["Yes. It is important to note that, within the long\ntradition of Egyptian civil law and its careful\nbalance of interests, Article 147(2) provides\nthat the judge may reduce it to a reasonable limit.", P.white, 150]],
    ["0.72", "0.91"], "same facts, the longer one scores higher", "fix: score claims, not style (like faithfulness does)"),
  async (k, st) => experiment(k, st, 1, [["“Majority is 21 (Art. 44).”\nwritten by model family X", P.fViolet, 90], ["“Majority is 21 (Art. 44).”\nwritten by model family Y", P.fYellow, 90]],
    ["0.90", "0.76"], "the judge is family X: it prefers its own family", "fix: pick a judge from a different family than the generator"),
  async (k, st) => experiment(k, st, 2, [["“Majority is 21 years (Art. 44).”", P.white, 80], ["«سن الرشد إحدى وعشرون سنة (المادة 44)»", P.white, 80]],
    ["0.88", "0.71"], "same answer in Arabic scores lower", "fix: hand-check 20 Arabic judgments against a lawyer"),
  async (k, st) => experiment(k, st, 3, [["“Majority is 21 (Art. 44).”", P.white, 80], ["the same answer, again", P.white, 70], ["and once more", P.white, 70]],
    ["0.78", "0.84", "0.80"], "same input, three different scores", "fix: temperature 0, run 3× and measure the spread"),
]};
async function experiment(k, st, tag, inputs, scores, finding, fix) {
  await k.gone(st.parts, 250); st.parts = [];
  st.tags.forEach((t, i) => { k.tint(t, i === tag ? P.red : P.muted); t.t.setAttribute("fill", i === tag ? P.red : P.muted); });
  k.caption(`${["Verbosity", "Self-preference", "Language", "Noise"][tag]}: ${finding}`, P.red);
  const n = inputs.length, ys = n === 2 ? [190, 400] : [150, 300, 450];
  for (const [i, [text, fill, h]] of inputs.entries()) {
    const c = k.card(280, ys[i], 520, h, text, { fill, size: text.length > 120 ? 16 : 18 }); st.parts.push(c); await k.draw(c, 250);
    const tok = k.token(fill === P.white ? P.fBlue : fill, 10); k.pos(tok, 540, ys[i]); await k.along(tok, [[540, ys[i]], [650, 290]], 500); tok.remove();
    await k.think(705, 160, 500);
    const s = k.chip(1000, ys[i], `score ${scores[i]}`, { size: 22, mono: true }); st.parts.push(s); await k.draw(s, 200);
    const tok2 = k.token(P.fGray, 8); k.pos(tok2, 800, 300); await k.along(tok2, [[800, 300], [900, ys[i]]], 350); tok2.remove();
  }
  const f = k.chip(1180, 540, fix, { fill: P.fGreen, stroke: P.green, size: 19 }); st.parts.push(f); await k.draw(f, 300);
}

/* ------------------------------------------------------------------ 20 · legal checks in plain code */
SCENES.legal = { w: W, h: H, label: "Plain-code citation checks applied to one answer", phases: [
  async (k, st) => {
    k.caption("Legal checks: plain code reads the citations, no judge needed", P.muted);
    st.ans = k.card(480, 120, 900, 110, "", { fill: P.white }); await k.draw(st.ans, 300);
    k.text(40, 50, "answer under test", { size: 17, color: P.muted, anchor: "start" });
    st.seg = runText(k, 60, 105, [["Under ", P.ink], ["Art. ١٤٧", P.ink], [" the judge may reduce the obligation;", P.ink]], 22);
    st.seg2 = runText(k, 60, 145, [["see also ", P.ink], ["Article 375", P.ink], [".", P.ink]], 22);
    st.ret = k.card(1210, 120, 400, 110, "", { stroke: P.blue }); await k.draw(st.ret, 250);
    k.text(1030, 50, "retrieved", { size: 17, color: P.blue, anchor: "start" });
    st.have = { 147: k.chip(1090, 120, "147", { fill: P.fBlue, mono: true }), 148: k.chip(1210, 120, "148", { fill: P.fBlue, mono: true }), 151: k.chip(1330, 120, "151", { fill: P.fBlue, mono: true }) };
    st.gold = k.chip(1210, 245, "gold: 147", { fill: P.fViolet, mono: true }); k.text(1030, 245, "golden set", { size: 17, color: P.violet, anchor: "start" });
    for (const c of [...Object.values(st.have), st.gold]) await k.draw(c, 120);
  },
  async (k, st) => {
    k.caption("1 · A regex finds every citation, in Arabic or English");
    await k.draw(k.text(60, 330, '_CITATION.findall(answer)', { size: 20, anchor: "start", mono: true, color: P.muted }), 200);
    await k.scan(40, 80, 900, 90, P.fYellow, 900);
    const m1 = st.seg[1], m2 = st.seg2[1];
    for (const m of [m1, m2]) { const h = k.hl(m.x - 4, m.y - 18, m.w + 8, 34, P.fYellow); m.node.parentNode.insertBefore(h, m.node); await k.fade(h, .8, 200); }
    st.a = k.chip(m1.x + m1.w / 2, m1.y, "١٤٧", { fill: P.fYellow, mono: true, size: 22 }); st.b = k.chip(m2.x + m2.w / 2, m2.y, "375", { fill: P.fYellow, mono: true, size: 22 });
    await Promise.all([k.draw(st.a, 150), k.draw(st.b, 150)]);
    await Promise.all([k.flyTo(st.a, 300, 420, 700), k.flyTo(st.b, 480, 420, 700)]);
    await k.draw(k.text(60, 470, "matches Art. or Article (or the Arabic word) + a number", { size: 17, color: P.muted, anchor: "start" }), 250);
  },
  async (k, st) => {
    k.caption("2 · Arabic-Indic digits become Western digits");
    const map = k.text(390, 530, "١ → 1     ٤ → 4     ٧ → 7", { size: 26, color: P.muted }); await k.draw(map, 300);
    await k.fade(st.a.t, 0, 250); k.setText(st.a.t, "147"); await k.fade(st.a.t, 1, 250);
    await k.draw(k.text(700, 420, "cited = {147, 375}", { size: 26, anchor: "start", mono: true }), 300);
    st.map = map;
  },
  async (k, st) => {
    k.caption("3 · citation_grounded: is every cited article in what was retrieved?", P.blue);
    await k.flyTo(st.a, 1090, 185, 700); await k.draw(k.mark(1090, 210, true), 150);
    await k.flyTo(st.b, 1270, 185, 700); await k.shake(st.b); await k.flyTo(st.b, 480, 420, 600);
    st.b.querySelector("path").setAttribute("fill", P.fRed);
    await k.draw(k.text(700, 490, "citation_grounded = 0   (375 is a phantom)", { size: 24, anchor: "start", mono: true, color: P.red }), 300);
  },
  async (k, st) => {
    k.caption("4 · citation_correct: did it cite at least one gold article?", P.violet);
    await k.flyTo(st.a, 1330, 245, 600); await k.draw(k.mark(1385, 245, true), 150);
    await k.draw(k.text(700, 545, "citation_correct = 1", { size: 24, anchor: "start", mono: true, color: P.green }), 300);
  },
  async (k, st) => {
    k.caption("5 · Repealed articles: the only right answer says so", P.red);
    const kids = [...k.layer.children].filter(n => n !== k._cap); await k.gone(kids, 300);
    await k.draw(k.text(40, 115, "another answer · question about Art. 60 (Articles 54–80 are repealed)", { size: 18, color: P.muted, anchor: "start" }), 250);
    const a = k.card(480, 190, 900, 90, "Article 60 regulates how associations are founded.", { size: 22 }); await k.draw(a, 300);
    await k.draw(k.text(60, 300, "_REPEALED.search(answer)   looks for:", { size: 20, anchor: "start", mono: true, color: P.muted }), 250);
    for (const [i, w] of ["repealed", "ملغاة", "ألغيت"].entries()) await k.draw(k.chip(640 + i * 140, 300, w, { size: 19, stroke: P.muted }), 150);
    await k.scan(40, 150, 900, 80, P.fRed, 1100);
    await k.draw(k.text(480, 380, "no match → repeal_flagged = 0", { size: 30, color: P.red, mono: true }), 300);
    await k.draw(k.text(480, 450, "a fluent, confident answer about a law that no longer exists", { size: 22, color: P.red }), 300);
  },
]};
function runText(k, x, y, parts, size) {
  // lay out left-to-right text segments using their real rendered widths
  let cx = x; return parts.map(([s, color]) => {
    const t = k.text(cx, y, s, { size, color, anchor: "start" });
    t.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve"); t.style.whiteSpace = "pre";
    t.querySelectorAll("tspan").forEach(ts => { ts.removeAttribute("direction"); ts.setAttribute("font-family", 'Excalifont, "Segoe Print", sans-serif'); });
    let w = s.length * size * .5; try { w = t.getComputedTextLength() || w; } catch {}
    const seg = { node: t, x: cx, y, w }; cx += w; return seg;
  });
}

/* ------------------------------------------------------------------ 22 · the eval module, running */
SCENES.pipeline = { w: W, h: H, label: "The evaluation module filling a records table and reaching the CI gate", phases: [
  async (k, st) => {
    k.caption("Running the eval module: what happens, step by step", P.muted);
    const top = k.g();
    k.sprite("table", 90, 110, 80, top); k.text(90, 168, "golden_set.jsonl", { size: 15, mono: true }, top);
    k.card(330, 105, 210, 70, "runner.py", { mono: true, size: 19 }, top);
    k.sprite("server", 600, 105, 80, top); k.text(600, 165, "W2 POST /ask", { size: 15, mono: true }, top);
    await k.draw(top, 500);
    st.cols = [50, 165, 560, 690, 800, 905]; st.rowY = i => 265 + i * 48;
    const hdr = ["id", "answer", "contexts", "hit@5", "cite ok", "faithful"];
    st.tbl = k.g(); k.card(515, 380, 990, 360, "", { fill: P.white }, st.tbl);
    hdr.forEach((h, i) => k.text(st.cols[i], 222, h, { size: 17, mono: true, color: P.muted, anchor: "start" }, st.tbl));
    k.line([[30, 240], [1000, 240]], { stroke: P.muted, strokeWidth: 1 }, st.tbl); k.line([[30, 500], [1000, 500]], { stroke: P.muted, strokeWidth: 1 }, st.tbl);
    k.text(st.cols[0], 527, "mean", { size: 17, mono: true, color: P.muted, anchor: "start" }, st.tbl);
    await k.draw(st.tbl, 400);
    st.home = [[1225, 90], [1225, 145], [1225, 200]];
    st.sc = [["retrieval_metrics.py", P.fGreen], ["legal_checks.py", P.fGreen], ["ragas_eval.py", P.fViolet]].map(([s, f], i) => k.chip(st.home[i][0], st.home[i][1], s, { fill: f, mono: true, size: 16 }));
    for (const c of st.sc) await k.draw(c, 150);
    st.rows = [["q001-ar", "Art. 147: contract is the law…", "147,12,90", 1, 1, "1.0"], ["q003-en", "Yes, the one at fault pays…", "12,90,151", 0, 0, "0.9"],
               ["q005-ar", "Majority is 18 (Art. 45)", "45,46,12", 0, 1, "0.6"], ["q006-en", "…performed in good faith", "148,12,90", 1, 1, "1.0"], ["q008-en", "15 years (Art. 375)", "374,12,90", 1, 0, "0.8"]];
  },
  async (k, st) => {
    k.caption("1 · runner.py asks the API every golden question and keeps what comes back");
    for (const [i, r] of st.rows.entries()) {
      const t = k.token(P.fYellow, 9); k.pos(t, 130, 110);
      await k.along(t, [[130, 110], [225, 105], [435, 105], [560, 105]], 420); await k.along(t, [[560, 125], [330, 145], [330, st.rowY(i)]], 380); t.remove();
      [0, 1, 2].forEach(c => k.draw(k.text(st.cols[c], st.rowY(i), r[c], { size: c === 1 ? 17 : 16, mono: c !== 1, anchor: "start" }), 150));
      await k.wait(80);
    }
  },
  async (k, st) => {
    k.caption("2 · The free scorers fill their columns: plain code, no tokens", P.green);
    for (const [c, col, fmt] of [[0, 3, v => String(v)], [1, 4, v => v ? "✓" : "✗"]]) {
      const chip = st.sc[c]; await k.flyTo(chip, st.cols[col] + 30, 222, 600);
      for (const [i, r] of st.rows.entries()) await k.draw(k.text(st.cols[col] + 20, st.rowY(i), fmt(r[col]), { size: 19, mono: true, color: r[col] ? P.green : P.red }), 120);
      await k.flyTo(chip, st.home[c][0], st.home[c][1], 500);
    }
  },
  async (k, st) => {
    k.caption("3 · The judge fills faithfulness (each cell costs LLM calls)", P.violet);
    const chip = st.sc[2]; await k.flyTo(chip, st.cols[5] + 40, 222, 600);
    for (const [i, r] of st.rows.entries()) {
      const coin = k.chip(st.cols[5] + 120, st.rowY(i), "$", { fill: P.fYellow, size: 14, w: 30 }); await k.draw(coin, 80);
      await k.draw(k.text(st.cols[5] + 10, st.rowY(i), r[5], { size: 19, mono: true, color: +r[5] >= .8 ? P.green : P.red, anchor: "start" }), 120); await k.out(coin, 80);
    }
    await k.flyTo(chip, st.home[2][0], st.home[2][1], 500);
  },
  async (k, st) => {
    k.caption("4 · Average the columns → report.json → one MLflow run");
    for (const [c, v] of [[3, "0.60"], [4, "0.60"], [5, "0.86"]]) await k.draw(k.text(st.cols[c] + 10, 527, v, { size: 19, mono: true, anchor: "start" }), 150);
    st.rep = k.card(1120, 330, 190, 66, "report.json", { mono: true, size: 18 }); await k.draw(st.rep, 250);
    const m = k.chip(800, 527, "0.60 · 0.60 · 0.86", { mono: true, size: 15, fill: P.fGray }); await k.flyTo(m, 1120, 330, 700); await k.out(m, 150);
    await k.draw(k.arrow(1218, 330, 1248, 330), 150);
    await k.draw(k.card(1340, 330, 175, 120, "MLflow run\nk=10 · hybrid\n3 metrics\ngit a1b2c3", { fill: P.fBlue, size: 15 }), 300);
  },
  async (k, st) => {
    k.caption("5 · The gate compares with the floors and decides", P.red);
    await k.draw(k.arrow(1120, 365, 1120, 430), 150);
    const g = k.card(1120, 470, 190, 70, "gate.py", { mono: true, size: 18, fill: P.fYellow }); await k.draw(g, 250);
    await k.think(1100, 520, 600);
    await k.draw(k.text(1120, 530, "cite ok 0.60 < 0.95", { size: 16, mono: true, color: P.red }), 200);
    await k.draw(k.arrow(1218, 470, 1248, 470, { stroke: P.red }), 150);
    const pr = k.card(1340, 480, 175, 110, "PR #42\nexit 1\nmerge blocked", { stroke: P.red, color: P.red, size: 17 }); await k.draw(pr, 300); await k.shake(pr);
  },
]};

/* ------------------------------------------------------------------ 25 · MLflow: knobs → eval → run card → experiment table */
SCENES.mlflow = { w: W, h: H, label: "Three evaluation runs logged to MLflow and compared", phases: [
  async (k, st) => {
    k.caption("MLflow: every evaluation becomes a run you can compare", P.muted);
    st.knobs = {}; const rows = [["chunking", ["per-article", "512-token"]], ["retrieval", ["hybrid", "dense"]], ["reranker", ["on", "off"]]];
    const panel = k.g(); k.card(200, 300, 360, 380, "", { fill: P.white }, panel); k.text(200, 90, "system config", { size: 18, color: P.muted }, panel);
    rows.forEach(([name, opts], i) => {
      const y = 155 + i * 110; k.text(40, y, name, { size: 20, anchor: "start" }, panel);
      st.knobs[name] = opts.map((o, j) => k.chip(115 + j * 165, y + 44, o, { size: 17, w: 150, stroke: P.muted, color: P.muted }, panel));
    });
    await k.draw(panel, 500);
    st.eng = k.g(); k.sprite("clipboard", 490, 270, 110, st.eng); k.sprite("robotJudge", 600, 270, 130, st.eng); k.text(545, 370, "eval on the\ngolden set", { size: 18, color: P.muted }, st.eng);
    await k.draw(st.eng, 300);
    st.tbl = k.g(); k.card(1060, 290, 740, 380, "", { fill: P.white }, st.tbl); k.text(700, 120, "MLflow · experiment legal-rag-eval", { size: 19, color: P.blue, anchor: "start" }, st.tbl);
    ["run", "chunking", "retrieval", "rerank", "hit@5", "faithful"].forEach((h, i) => k.text(705 + [0, 70, 225, 350, 460, 570][i], 170, h, { size: 17, mono: true, color: P.muted, anchor: "start" }, st.tbl));
    await k.draw(st.tbl, 400); st.n = 0;
  },
  async (k, st) => run(k, st, ["per-article", "hybrid", "on"], "0.90", "0.86", P.green),
  async (k, st) => run(k, st, ["512-token", "hybrid", "on"], "0.71", "0.84", P.red),
  async (k, st) => run(k, st, ["per-article", "dense", "on"], "0.74", "0.85", P.red),
  async (k, st) => {
    k.caption("Compare: one change at a time shows which knob moved which number");
    await k.draw(k.box(695, 199, 730, 44, { stroke: P.green, strokeWidth: 2.5 }), 300);
    await k.draw(k.text(1060, 410, "512-token chunks: hit@5 −0.19 (chunks no longer match articles)\ndense only: hit@5 −0.16 (BM25 finds the exact terms)", { size: 19, color: P.ink }), 400);
  },
]};
async function run(k, st, cfg, hit, faith, color) {
  st.n++; k.caption(`Run ${st.n} · ${["the baseline", "512-token chunks", "dense retrieval only"][st.n - 1]}`);
  const names = ["chunking", "retrieval", "reranker"];
  names.forEach((nm, i) => st.knobs[nm].forEach(c => { const on = c.t.textContent === cfg[i]; k.tint(c, on ? P.blue : P.muted); c.t.setAttribute("fill", on ? P.blue : P.muted); }));
  await k.wait(500);
  const cfgCard = k.chip(200, 540, cfg.join(" · "), { fill: P.fBlue, size: 16 }); await k.draw(cfgCard, 200);
  await k.flyTo(cfgCard, 545, 270, 600); await k.out(cfgCard, 150); await k.think(530, 180, 700);
  const rc = k.card(545, 530, 270, 150, `params: ${cfg[0]}, ${cfg[1]}\nmetrics: hit@5 ${hit} · faithful ${faith}\nartifacts: per_question.csv\ntags: git a1b2c3 · golden 3f9a1c`, { fill: P.fGray, size: 13 }); await k.draw(rc, 300);
  const y = 170 + st.n * 52; await k.flyTo(rc, 1060, y, 700); await k.out(rc, 150);
  [String(st.n), cfg[0], cfg[1], cfg[2], hit, faith].forEach((v, i) => k.draw(k.text(705 + [0, 70, 225, 350, 460, 570][i], y, v, { size: 18, mono: true, anchor: "start", color: i === 4 ? color : P.ink }), 150));
  await k.wait(300);
}

/* ------------------------------------------------------------------ 28 · the loop */
SCENES.loop = { w: W, h: H, label: "One change going round the eval-driven development loop", phases: [
  async (k, st) => {
    k.caption("Evaluation is a loop: follow one change around it", P.muted);
    const cx = 720, cy = 360;
    st.pos = [...Array(6)].map((_, i) => [cx + 500 * Math.cos(-Math.PI / 2 + i * Math.PI / 3), cy + 225 * Math.sin(-Math.PI / 2 + i * Math.PI / 3)]);
    const st6 = [["change something", "gear", P.fGray], ["run the eval", "clipboard", P.fYellow], ["compare in MLflow", "barChart", P.fBlue], ["CI gate", "actions", P.fRed], ["ship + observe", "users", P.fGreen], ["new golden question", "paper", P.fViolet]];
    st.cards = [];
    for (const [i, [t, sp, f]] of st6.entries()) {
      const [x, y] = st.pos[i], g = k.g(); k.card(x, y, 400, 104, "", { fill: f, fillStyle: "hachure", gap: 12 }, g);
      k.sprite(sp, x - 155, y, 62, g); k.text(x + 30, y - 20, t, { size: 21 }, g); g.sub = k.text(x + 30, y + 22, "", { size: 16, color: P.muted }, g);
      st.cards.push(g); await k.draw(g, 220);
    }
    for (let i = 0; i < 6; i++) {
      const [x1, y1] = st.pos[i], [x2, y2] = st.pos[(i + 1) % 6];
      const sx = x1 + (x2 - x1) * .3, sy = y1 + (y2 - y1) * .3 + (y2 === y1 ? 0 : 0), ex = x1 + (x2 - x1) * .7, ey = y1 + (y2 - y1) * .7;
      await k.draw(k.arrow(sx, sy + (Math.abs(y2 - y1) < 5 ? (y1 < 360 ? -60 : 60) : 0), ex, ey + (Math.abs(y2 - y1) < 5 ? (y1 < 360 ? -60 : 60) : 0), { stroke: P.muted, strokeWidth: 1.6 }), 120);
    }
    st.ctr = k.text(cx, cy + 10, "golden set: 20 questions", { size: 26 }); await k.draw(st.ctr, 300);
    st.tok = k.token(P.orange, 13); k.pos(st.tok, st.pos[0][0], st.pos[0][1] + 62); await k.draw(st.tok, 200);
  },
  ...[["top_k 10 → 5", P.ink], ["faithful 0.87 · recall 0.74", P.ink], ["vs main: recall −0.08", P.orange], ["recall 0.74 ≥ 0.70 → pass ✓", P.green], ["a user asks about Art. 60: wrong", P.red]].map(([sub, col], i) => async (k, st) => {
    k.caption(["1 · Change: lower top_k to save tokens", "2 · Run the eval on the same golden set", "3 · Compare with the main branch in MLflow", "4 · The CI gate checks the floors", "5 · Ship it and watch real traffic"][i]);
    if (i > 0) await moveTok(k, st, i);
    k.setText(st.cards[i].sub, sub); st.cards[i].sub.setAttribute("fill", col); await k.draw(st.cards[i].sub, 300);
  }),
  async (k, st) => {
    k.caption("6 · The failure becomes golden question 21", P.violet);
    await moveTok(k, st, 5);
    k.setText(st.cards[5].sub, "“What does Art. 60 say?” → repealed"); await k.draw(st.cards[5].sub, 300);
    const c = k.chip(st.pos[5][0], st.pos[5][1], "Q21", { fill: P.fViolet, size: 18 }); await k.draw(c, 150);
    await k.flyTo(c, 720, 370, 800); await k.out(c, 150);
    k.setText(st.ctr, "golden set: 21 questions"); await k.shake(st.ctr);
    await moveTok(k, st, 0); await k.draw(k.text(720, 410, "the exam keeps growing, so the system can't quietly regress", { size: 20, color: P.muted }), 300);
  },
]};
async function moveTok(k, st, i) {
  const [x, y] = st.pos[i], prev = st.pos[(i + 5) % 6];
  await k.along(st.tok, [[prev[0], prev[1] + 62], [(prev[0] + x) / 2, (prev[1] + y) / 2], [x, y + 62]], 800);
}
})();
