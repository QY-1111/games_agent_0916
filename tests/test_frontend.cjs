const {chromium}=require('playwright');
const fs=require('fs'),http=require('http'),path=require('path');
const root=path.resolve(__dirname, '..');
const mock=`export const app={graph:{setDirtyCanvas(){}},registerExtension(ext){window.ext=ext;}};`;
const harness=`<!doctype html><html><body style="background:#161b24"><script type="module">
import '/extensions/threejs/preview.js';
class Node {constructor(){this.size=[560,740];this.comfyClass='ThreeJSPreview';}addDOMWidget(n,t,el,o){this.el=el;this.domOptions=o;el.style.width='560px';document.body.append(el);return {};}setSize(s){this.size=s;}computeSize(){return [560,740];}}
await window.ext.beforeRegisterNodeDef(Node,{name:'ThreeJSPreview'});
window.node=new Node();window.ext.nodeCreated(node);window.ext.loadedGraphNode(node);
const source=await (await fetch('/demo')).text();node.onExecuted({threejs_code:[source],threejs_kind:['html'],threejs_height:[420]});
</script></body></html>`;
const server=http.createServer((req,res)=>{let data,type='text/javascript';
if(req.url==='/') {data=harness;type='text/html';}
else if(req.url==='/scripts/app.js') data=mock;
else if(req.url==='/demo') {data=fs.readFileSync(path.join(root,'examples/demo.html'));type='text/html';}
else if(req.url==='/extensions/threejs/preview.js') data=fs.readFileSync(path.join(root,'web/preview.js'));
else {res.writeHead(404);res.end();return;}res.setHeader('Content-Type',type);res.end(data);});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1000,height:800}});const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message);});page.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text());});
await page.addInitScript(()=>Object.defineProperty(Crypto.prototype,'randomUUID',{value:undefined,configurable:true}));
page.on('requestfailed',r=>console.log('FAILED URL',r.url()));
if (process.env.THREE_FIXTURE_DIR) await page.route('https://cdn.jsdelivr.net/npm/three@0.170.0/**',route=>{const name=route.request().url().endsWith('OrbitControls.js')?'OrbitControls.js':'three.module.js';return route.fulfill({path:path.resolve(process.env.THREE_FIXTURE_DIR,name),contentType:'text/javascript',headers:{'Access-Control-Allow-Origin':'*'}});});
await page.goto('http://127.0.0.1:'+server.address().port);
await page.locator('iframe').waitFor();
await page.frameLocator('iframe').locator('canvas').waitFor({timeout:45000});
const layout = await page.evaluate(()=>({min:node.domOptions.getMinHeight(),height:node.domOptions.getHeight(),roots:document.querySelectorAll('iframe').length}));
if(layout.min!==420 || layout.height!==420 || layout.roots!==1)throw Error('DOM layout or duplicate lifecycle failed');
await page.frameLocator('iframe').locator('canvas').evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
if (process.env.PREVIEW_SCREENSHOT) await page.screenshot({path:process.env.PREVIEW_SCREENSHOT});
const isolation=await page.frames()[1].evaluate(()=>{try{return !!parent.document;}catch{return false;}});
if(isolation)throw Error('Sandbox isolation failed');
await page.getByRole('button',{name:'放大',exact:true}).click();
await page.locator('dialog').waitFor();await page.frameLocator('iframe').locator('canvas').waitFor();
await page.getByRole('button',{name:'关闭放大预览'}).click();
await page.frameLocator('iframe').locator('canvas').waitFor();
const downloadEvent=page.waitForEvent('download');await page.getByRole('button',{name:'下载 HTML'}).click();const download=await downloadEvent;
if(download.suggestedFilename()!=='threejs-scene.html')throw Error('Download failed');
await page.getByRole('button',{name:'停止',exact:true}).click();if(await page.locator('iframe').count())throw Error('Stop failed');
await page.getByRole('button',{name:'重新运行'}).click();await page.frameLocator('iframe').locator('canvas').waitFor();
await page.evaluate(()=>node.onExecuted({threejs_code:['throw new Error("TEST_ERROR")'],threejs_kind:['javascript'],threejs_height:[420]}));
await page.getByText('错误：Uncaught Error: TEST_ERROR',{exact:false}).waitFor();
await page.evaluate(()=>node.onRemoved());if(await page.locator('iframe').count())throw Error('Cleanup failed');
await page.evaluate(()=>{window.recovered=new node.constructor();recovered.onExecuted({threejs_code:['<h1>RECOVERED</h1>'],threejs_kind:['html'],threejs_height:[560]});});
await page.frameLocator('iframe').getByText('RECOVERED').waitFor();
if(await page.evaluate(()=>recovered.domOptions.getHeight())!==560)throw Error('Height update failed');
await page.evaluate(()=>recovered.onRemoved());
console.log(JSON.stringify({render:true,isolation:true,modal:true,download:true,stopRestart:true,errorDisplay:true,cleanup:true,pageErrors:errors}));
}finally{await browser?.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
