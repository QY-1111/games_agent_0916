export const VERSION = '0.170.0';
export const IMPORTS = {imports: {
  three: `https://cdn.jsdelivr.net/npm/three@${VERSION}/build/three.module.js`,
  'three/addons/': `https://cdn.jsdelivr.net/npm/three@${VERSION}/examples/jsm/`
}};

export function buildDocument(source, kind, token) {
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
