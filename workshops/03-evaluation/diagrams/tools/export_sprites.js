// Exports chosen Excalidraw library icons as small SVG "sprites" the deck's animations can move around.
// node export_sprites.js  ->  ../../slides/assets/sprites.json   { name: { w, h, svg } }
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), http = require('http');
const LIB = path.join(__dirname, '..', 'libraries');
const SPRITES = {
  person: ['youritjang_stick-figures', 0], lawyer: ['youritjang_stick-figures', 1], girl: ['youritjang_stick-figures', 2],
  guy: ['youritjang_stick-figures', 3], happy: ['youritjang_stick-figures', 7], sad: ['youritjang_stick-figures', 8],
  talker: ['dhtoran_stick-people', 1], thinker: ['dhtoran_stick-people', 4],
  robot: ['kaligule_robots', 2], robotHappy: ['kaligule_robots', 1], robotJudge: ['kaligule_robots', 4], robotSad: ['kaligule_robots', 3],
  docs: ['youritjang_software-architecture', 4], db: ['youritjang_software-architecture', 1],
  pdf: ['xxxdeveloper_icons', 35], paper: ['xxxdeveloper_icons', 0], clipboard: ['xxxdeveloper_icons', 4], table: ['xxxdeveloper_icons', 6],
  json: ['xxxdeveloper_icons', 15],
  magnifier: ['ferminrp_awesome-icons', 2], users: ['ferminrp_awesome-icons', 14], bell: ['ferminrp_awesome-icons', 21],
  server: ['mateuszbaransanok_it-icons', 20], camera: ['mateuszbaransanok_it-icons', 7], shield: ['mateuszbaransanok_it-icons', 16],
  gear: ['artem-anufrij-live-de_artem-s-icons', 1],
  yes: ['toman_checkmarks', 3], no: ['toman_checkmarks', 1], warn: ['toman_checkmarks', 0],
  actions: ['devdaejungyoon_github-actions', 2], dial: ['devdaejungyoon_github-actions', 0],
  lineChart: ['g-script_charts', 2], barChart: ['g-script_charts', 1],
  flag: ['artem-anufrij-live-de_artem-s-icons', 13],
};
const types = { '.js': 'application/javascript', '.html': 'text/html', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const p = path.join(__dirname, decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
}).listen(8768);
(async () => {
  const b = await chromium.launch(); const page = await b.newPage();
  await page.goto('http://localhost:8768/page.html'); await page.waitForFunction(() => window.__ready);
  const out = {};
  for (const [name, [lib, idx]] of Object.entries(SPRITES)) {
    const data = JSON.parse(fs.readFileSync(path.join(LIB, lib + '.excalidrawlib'), 'utf8'));
    const items = data.libraryItems ? data.libraryItems.map(i => i.elements) : data.library;
    const els = items[idx].filter(e => e.type !== 'text').map(e => (e.type === 'draw' ? { ...e, type: 'line' } : e));
    out[name] = await page.evaluate(async (els) => {
      const svg = await window.exportToSvg({ elements: els, files: {}, appState: { exportBackground: false, exportPadding: 4 } });
      svg.querySelectorAll('style, metadata').forEach(n => n.remove());
      const vb = svg.getAttribute('viewBox').split(' ').map(Number);
      return { w: +vb[2].toFixed(1), h: +vb[3].toFixed(1), svg: svg.innerHTML.replace(/\s+/g, ' ').replace(/(\d+\.\d)\d+/g, '$1') };
    }, els);
  }
  const dest = path.join(__dirname, '..', '..', 'slides', 'assets', 'sprites.json');
  fs.writeFileSync(dest, JSON.stringify(out));
  console.log(Object.keys(out).length, 'sprites', (fs.statSync(dest).size / 1024).toFixed(0) + ' KB');
  await b.close(); server.close();
})();
