import { app } from '../../scripts/app.js';
const VERSION = '0.170.0';
const IMPORTS = {imports: {
  three: `https://cdn.jsdelivr.net/npm/three@${VERSION}/build/three.module.js`,
  'three/addons/': `https://cdn.jsdelivr.net/npm/three@${VERSION}/examples/jsm/`
}};

function buildDocument(source, kind, token) {
  const parser = new DOMParser();
  let html = source;
  if (kind === 'javascript') {
    let prefix = '';
    if (!/\bimport\s+(?:\*\s+as\s+THREE|[^;\n]*\bTHREE\b)/.test(source) && !/\b(?:const|let|var)\s+THREE\b/.test(source))
      prefix += 'import * as THREE from "three";\n';
    if (/\bOrbitControls\b/.test(source) && !/\bimport\s*\{[^}]*\bOrbitControls\b/.test(source) && !/\b(?:class|const|let|var)\s+OrbitControls\b/.test(source))
      prefix += 'import { OrbitControls } from "three/addons/controls/OrbitControls.js";\n';
    html = '<!doctype html><html><head></head><body><div id="container"></div></body></html>';
    const doc = parser.parseFromString(html, 'text/html');
    const script = doc.createElement('script');
    script.type = 'module';
    script.textContent = (prefix + source).replace(/<\/script/gi, '<\\/script');
    doc.body.append(script);
    html = doc.documentElement.outerHTML;
  }
  const doc = parser.parseFromString(html, 'text/html');
  // Keep generated pages inside an opaque-origin iframe. No access to ComfyUI APIs.
  doc.querySelectorAll('base, meta[http-equiv]').forEach(el => el.remove());
  const policy = doc.createElement('meta');
  policy.httpEquiv = 'Content-Security-Policy';
  policy.content = "default-src 'none'; script-src 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com https://esm.sh; style-src 'unsafe-inline' https://fonts.googleapis.com; img-src data: blob: https:; font-src data: https://fonts.gstatic.com; connect-src https://cdn.jsdelivr.net https://unpkg.com https://esm.sh; media-src blob: data:; worker-src blob:; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
  const style = doc.createElement('style');
  style.textContent = 'html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#111827;color:#e5e7eb}canvas{display:block}#container{width:100%;height:100%}';
  const bridge = doc.createElement('script');
  bridge.textContent = `(() => {
    const send = (type, message) => parent.postMessage({channel:'threejs-preview',token:${JSON.stringify(token)},type,message:String(message).slice(0,1500)}, '*');
    addEventListener('error', e => send('error', e.message || '资源加载失败，请检查 CDN / 资源地址'), true);
    addEventListener('unhandledrejection', e => send('error', e.reason?.message || e.reason));
    addEventListener('securitypolicyviolation', e => send('error', '资源被预览策略阻止：' + e.blockedURI));
    addEventListener('load', () => send('loaded', '页面已加载；若画面为空，请检查代码或 WebGL'));
  })();`;
  if (!doc.querySelector('script[type="importmap"]')) {
    const map = doc.createElement('script'); map.type = 'importmap'; map.textContent = JSON.stringify(IMPORTS);
    doc.head.prepend(map);
  }
  doc.head.prepend(policy, style, bridge);
  return '<!doctype html>\n' + doc.documentElement.outerHTML;
}



function attachPreview(node) {
  if (node._threePreview) return;
  if (typeof node.addDOMWidget !== 'function') {
    console.error('[ThreeJSPreview] This frontend does not expose addDOMWidget.', node);
    return;
  }
  const root = document.createElement('div');
  root.style.cssText = 'display:flex;flex-direction:column;width:100%;height:420px;min-height:420px;background:#111827;border:1px solid #374151;border-radius:8px;overflow:hidden;box-sizing:border-box';
  const toolbar = document.createElement('div');
  toolbar.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;padding:8px;flex-shrink:0';
  const status = document.createElement('div');
  status.style.cssText = 'color:#b7c6db;font:12px sans-serif;padding:6px 10px;max-height:54px;overflow:auto;white-space:pre-wrap;flex-shrink:0';
  status.textContent = '预览组件已就绪 · 连接模型 STRING 输出，执行后在此显示 3D 场景。';
  const holder = document.createElement('div');
  holder.style.cssText = 'flex:1;min-height:220px;position:relative';
  let frame, source = '', kind = 'html', token = '', currentHTML = '', modal;
  let failed = false;
  function stop() {
    frame?.remove(); frame = null; token = '';
    status.textContent = '预览已停止，点击重新运行恢复。';
  }
  function render() {
    if (!source) return;
    frame?.remove();
    token = globalThis.crypto?.randomUUID?.() || Array.from(crypto.getRandomValues(new Uint32Array(4)), n => n.toString(16)).join('-'); failed = false;
    currentHTML = buildDocument(source, kind, token);
    frame = document.createElement('iframe');
    frame.title = 'Three.js interactive preview';
    frame.setAttribute('sandbox', 'allow-scripts allow-pointer-lock');
    frame.referrerPolicy = 'no-referrer';
    frame.style.cssText = 'width:100%;height:100%;position:absolute;inset:0;border:0;background:#111827';
    frame.srcdoc = currentHTML;
    holder.append(frame);
    status.textContent = '正在加载场景…';
  }
  function closeModal() {
    if (!modal) return;
    root.append(holder); modal.remove(); modal = null;
    render(); // Moving an iframe resets its browsing context.
  }
  function button(label, action) {
    const b = document.createElement('button'); b.textContent = label;
    b.style.cssText = 'background:#25334b;color:#e5e7eb;border:1px solid #465572;border-radius:5px;padding:5px 9px;cursor:pointer;font:12px sans-serif';
    b.onclick = e => { e.stopPropagation(); action(); };
    toolbar.append(b);
  }
  button('重新运行', render);
  button('停止', stop);
  button('放大', () => {
    if (modal) return;
    modal = document.createElement('dialog');
    modal.style.cssText = 'width:90vw;height:85vh;background:#111827;color:white;border:1px solid #465572;padding:12px;';
    const content = document.createElement('div');
    content.style.cssText = 'display:flex;flex-direction:column;height:100%;gap:8px';
    const close = document.createElement('button'); close.textContent = '关闭放大预览'; close.onclick = closeModal;
    content.append(close, holder); modal.append(content); document.body.append(modal);
    modal.addEventListener('cancel', e => { e.preventDefault(); closeModal(); });
    modal.showModal(); render();
  });
  button('下载 HTML', () => {
    if (!source) return;
    const url = URL.createObjectURL(new Blob([currentHTML], {type:'text/html;charset=utf-8'}));
    const a = document.createElement('a'); a.href = url; a.download = 'threejs-scene.html'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  const receive = e => {
    if (!frame || e.source !== frame.contentWindow || e.data?.channel !== 'threejs-preview' || e.data.token !== token) return;
    if (e.data.type === 'error') { failed = true; status.textContent = '错误：' + String(e.data.message).slice(0,1500); }
    else if (!failed) status.textContent = String(e.data.message).slice(0,1500);
  };
  window.addEventListener('message', receive);
  root.append(toolbar, status, holder);
  let previewHeight = 420;
  root.style.setProperty('--comfy-widget-min-height', '420px');
  root.style.setProperty('--comfy-widget-height', '420px');
  const widget = node.addDOMWidget('threejs_preview', 'custom', root, {
    serialize:false, hideOnZoom:false,
    getMinHeight: () => previewHeight,
    getHeight: () => previewHeight,
  });
  widget.serialize = false;
  widget.computeSize = width => [width, previewHeight];
  node._threePreview = data => {
    source = data.threejs_code?.[0] || '';
    kind = data.threejs_kind?.[0] || 'html';
    previewHeight = Math.max(240, Math.min(1200, Number(data.threejs_height?.[0]) || 420));
    root.style.height = `${previewHeight}px`;
    root.style.minHeight = `${previewHeight}px`;
    root.style.setProperty('--comfy-widget-min-height', `${previewHeight}px`);
    root.style.setProperty('--comfy-widget-height', `${previewHeight}px`);
    render();
    node.setSize([Math.max(node.size[0], 540), Math.max(node.size[1], node.computeSize()[1])]);
    (node.graph || app.graph)?.setDirtyCanvas?.(true, true);
  };
  const removed = node.onRemoved;
  node.onRemoved = function () {
    window.removeEventListener('message', receive);
    stop(); modal?.remove(); root.remove();
    delete node._threePreview;
    return removed?.apply(this, arguments);
  };
  node.setSize([560, Math.max(500, node.computeSize()[1])]);
}

app.registerExtension({
  name: 'threejs.preview.sandbox',
  nodeCreated(node) {
    if (node.comfyClass === 'ThreeJSPreview' || node.type === 'ThreeJSPreview') attachPreview(node);
  },
  loadedGraphNode(node) {
    if (node.comfyClass === 'ThreeJSPreview' || node.type === 'ThreeJSPreview') attachPreview(node);
  },
  async beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData.name !== 'ThreeJSPreview') return;
    const executed = nodeType.prototype.onExecuted;
    nodeType.prototype.onExecuted = function(message) {
      executed?.apply(this, arguments);
      attachPreview(this);
      this._threePreview?.(message);
    };
  }
});
