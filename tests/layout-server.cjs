// Offline browser regression harness. Run: node tests/layout-server.cjs
// Open http://127.0.0.1:5180/ to compare the old and fixed widget layouts.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const original = execFileSync('git', ['show', 'cf1ebe3390d31c753c3bdce23c395dba05f33bcc:web/preview.js'], { cwd: root, encoding: 'utf8' });
const harness = `<!doctype html><meta charset="utf-8"><title>Preview layout regression</title>
<style>body{background:#20232b;color:white;font:14px sans-serif}#cases{display:flex;gap:16px;flex-wrap:wrap}.case{width:560px}pre{white-space:pre-wrap}</style>
<h1>预览布局回归：宿主将根元素 display 设为 block</h1><div id="cases"></div><pre id="results">运行中…</pre>
<script type="module">
const results = [];
const nextLayout = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
for (const variant of ['original', 'fixed']) {
  await import('/extensions/' + variant + '/preview.js');
  const section = document.createElement('section'); section.className = 'case';
  const title = document.createElement('h2'); title.textContent = variant; section.append(title);
  document.querySelector('#cases').append(section);
  class Node {
    constructor() { this.size = [560, 900]; this.comfyClass = 'ThreeJSPreview'; }
    addDOMWidget(name, type, el, options) {
      this.el = el; this.options = options;
      // Reproduce host visibility updates overwriting display:flex on the root.
      el.style.display = 'block'; section.append(el); return {};
    }
    setSize(size) { this.size = size; }
    computeSize() { return [560, 900]; }
  }
  const extension = window.extension;
  await extension.beforeRegisterNodeDef(Node, { name: 'ThreeJSPreview' });
  const node = new Node(); extension.nodeCreated(node); extension.loadedGraphNode(node);
  for (const height of [240, 420, 720, 1200, 420]) {
    node.onExecuted({ threejs_code: ['<body style="background:linear-gradient(#42b9df,#164c78)">LAYOUT TEST</body>'], threejs_kind: ['html'], threejs_height: [height] });
    await nextLayout();
    const frame = node.el.querySelector('iframe');
    const shell = variant === 'fixed' ? node.el.firstElementChild : node.el;
    const available = shell.clientHeight - shell.children[0].offsetHeight - shell.children[1].offsetHeight;
    const actual = frame.offsetHeight;
    const pass = Math.abs(actual - available) <= 2;
    results.push({ variant, height, available, actual, pass });
  }
  node.onExecuted({ threejs_code: ['<body style="background:linear-gradient(#42b9df,#164c78)">LAYOUT TEST</body>'], threejs_kind: ['html'], threejs_height: [720] });
}
document.querySelector('#results').textContent = JSON.stringify(results, null, 2);
</script>`;
http.createServer((req, res) => {
  let body, type = 'text/javascript';
  if (req.url === '/') { body = harness; type = 'text/html'; }
  else if (req.url === '/scripts/app.js') body = 'export const app={graph:{setDirtyCanvas(){}},registerExtension(ext){window.extension=ext;}};';
  else if (req.url === '/extensions/original/preview.js') body = original;
  else if (req.url === '/extensions/fixed/preview.js') body = fs.readFileSync(path.join(root, 'web/preview.js'));
  else { res.writeHead(404).end(); return; }
  res.setHeader('Content-Type', type + ';charset=utf-8'); res.end(body);
}).listen(5180, '127.0.0.1', () => console.log('Layout regression: http://127.0.0.1:5180/'));
