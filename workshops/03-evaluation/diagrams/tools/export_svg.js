// Renders every ../src/*.excalidraw with Excalidraw's exportToSvg (headless Chromium via Playwright).
// Setup once:  npm install && npm run bundle      Then:  node export_svg.js [--png]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), http = require('http');

const SRC = path.join(__dirname, '..', 'src'), OUT = path.join(__dirname, '..', 'svg');
const types = { '.js': 'application/javascript', '.html': 'text/html', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const p = path.join(__dirname, decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(p, (err, data) => {
    if (err) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(8766);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:8766/page.html');
  await page.waitForFunction(() => window.__ready);
  fs.mkdirSync(OUT, { recursive: true });
  const files = fs.readdirSync(SRC).filter(f => f.endsWith('.excalidraw'))
    .filter(f => process.argv.length <= 2 || process.argv.slice(2).some(a => f.includes(a)));
  for (const f of files) {
    const scene = JSON.parse(fs.readFileSync(path.join(SRC, f), 'utf8'));
    const svg = await page.evaluate(async (scene) => {
      const el = await window.exportToSvg({
        elements: scene.elements, files: scene.files || {},
        appState: { exportBackground: false, exportPadding: 16, viewBackgroundColor: '#ffffff' },
      });
      return el.outerHTML;
    }, scene);
    const name = f.replace('.excalidraw', '.svg');
    fs.writeFileSync(path.join(OUT, name), svg);
    if (process.env.PNG_DIR) {
      const p2 = await browser.newPage({ viewport: { width: 1600, height: 900 } });
      await p2.setContent(`<body style="margin:0;background:#fff">${svg}</body>`);
      await p2.locator('svg').screenshot({ path: path.join(process.env.PNG_DIR, name.replace('.svg', '.png')) });
      await p2.close();
    }
    console.log(name, (svg.length / 1024).toFixed(0) + ' KB');
  }
  await browser.close(); server.close();
})();
