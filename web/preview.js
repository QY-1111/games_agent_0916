import { app } from '../../scripts/app.js';
import { buildDocument } from './lib/document.mjs';

app.registerExtension({
  name: 'threejs.preview.sandbox',
  async beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData.name !== 'ThreeJSPreview') return;
    const created = nodeType.prototype.onNodeCreated;
    nodeType.prototype.onNodeCreated = function () {
      const result = created?.apply(this, arguments);
      const node = this;
      const root = document.createElement('div');
      root.style.cssText = 'display:flex;flex-direction:column;width:100%;height:100%;min-height:280px;background:#111827;border:1px solid #374151;border-radius:8px;overflow:hidden;box-sizing:border-box';
      const toolbar = document.createElement('div');
      toolbar.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;padding:8px;flex-shrink:0';
      const status = document.createElement('div');
      status.style.cssText = 'color:#b7c6db;font:12px sans-serif;padding:6px 10px;max-height:54px;overflow:auto;white-space:pre-wrap;flex-shrink:0';
      status.textContent = '连接 STRING 或粘贴代码，然后执行工作流。';
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
        token = crypto.randomUUID(); failed = false;
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
      const widget = node.addDOMWidget('threejs_preview', 'threejs_preview', root, {serialize:false, hideOnZoom:false});
      let previewHeight = 420;
      widget.computeSize = width => [width, previewHeight];
      node._threePreview = data => {
        source = data.threejs_code?.[0] || '';
        kind = data.threejs_kind?.[0] || 'html';
        previewHeight = Number(data.threejs_height?.[0]) || 420;
        render();
        node.setSize([Math.max(node.size[0], 540), Math.max(node.size[1], node.computeSize()[1])]);
        app.graph.setDirtyCanvas(true, true);
      };
      const removed = node.onRemoved;
      node.onRemoved = function () {
        window.removeEventListener('message', receive);
        stop(); modal?.remove(); root.remove();
        return removed?.apply(this, arguments);
      };
      node.setSize([560, 740]);
      return result;
    };
    const executed = nodeType.prototype.onExecuted;
    nodeType.prototype.onExecuted = function (message) {
      executed?.apply(this, arguments);
      this._threePreview?.(message);
    };
  }
});
