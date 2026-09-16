# ComfyUI Three.js 代码预览

GitHub 仓库：`QY-1111/games_agent_0916`。

将模型返回的 STRING 文本变成节点内可交互的 Three.js 场景。提供重新运行、停止、放大和下载 HTML。Python 端无额外依赖，不执行模型代码。

## 安装

可在 ComfyUI 的 `custom_nodes` 目录打开终端并运行：

```bash
git clone https://github.com/QY-1111/games_agent_0916.git ComfyUI-ThreeJS-Preview
```

或者按以下方式手动安装。

将整个 `ComfyUI-ThreeJS-Preview` 文件夹放入正在运行的 ComfyUI 的 `custom_nodes` 目录，确保结构为：

```
ComfyUI/custom_nodes/ComfyUI-ThreeJS-Preview/__init__.py
ComfyUI/custom_nodes/ComfyUI-ThreeJS-Preview/web/preview.js
```

重启 ComfyUI 后刷新浏览器（必要时 Ctrl+F5）。搜索 `ThreeJSPreview` 或 `Three.js 代码预览`，分类为 `Three.js`。添加节点后，应立即看到预览工具栏与“预览组件已就绪”提示；执行工作流后，模型输出会自动渲染在节点内部，不需要连接 `extracted_code` 输出口。支持 Python V1 自定义节点接口和 `addDOMWidget` 前端接口，已补充当前前端使用的 DOM 高度参数；尚未在你的实际 ComfyUI 版本上验证。

### 更新已有安装

在插件目录运行 `git pull`，重启 ComfyUI 并 Ctrl+F5 刷新页面。此版改为单个前端 JS 文件，移除额外 `.mjs` 模块加载，使用 `nodeCreated` / `loadedGraphNode` 挂载预览并在执行时补挂载，显式声明 DOM 预览高度，并兼容通过局域网 HTTP 访问时缺少 `crypto.randomUUID` 的浏览器环境。

## 接入模型

1. 将 `MODEL_PROMPT.txt` 作为模型的系统提示词，在用户提示词中填写场景需求。
2. 添加模型文本输出节点和 `Three.js 代码预览` 节点。
3. 把模型的 STRING 输出直接连接到预览节点的 `code` 输入口。预览节点不再显示代码编辑框，主体区域用于交互场景。
4. 执行工作流。场景出现在预览节点内部；鼠标操作由场景代码实现，示例支持拖动旋转、滚轮缩放。

连接结构：`模型节点的 STRING 输出 → Three.js 代码预览.code`

模型输出协议是单个 HTML Markdown 代码块，具体见 `MODEL_PROMPT.txt`。将模型节点的文本字段（常见名称为 `text`、`content` 或 `response`，以实际节点为准）作为 STRING 连接到 `code`；如果上游返回整个 API JSON，先提取其中的文本，不要直接传入包含 `choices`、`usage` 等字段的完整响应。

也可将 `examples/demo-workflow.json` 拖入 ComfyUI 加载示例，或添加 `Three.js 代码输入` 节点，把 `examples/demo.html` 粘贴进去后连接预览节点，无需模型。已有 Text Input 或模型文本节点时直接连接即可，无需额外添加代码输入节点。输出端 `extracted_code` 是提取后的文本，可继续接其他文本节点；本插件不输出 IMAGE 张量。

紧凑布局版本更新后，请重新添加预览节点并连接原来的文本输出；旧工作流可能保留旧版代码控件和节点尺寸。若旧节点中有手动输入的代码，请先复制到独立文本节点再替换。ByteArtist 的定制 `/next` 画布未显示此 DOM 预览控件；在已检查的实例中，通过「更多 → 切换至 ComfyUI 原生」可显示工具栏与预览区域。

## 接受的格式

- 完整单文件 HTML，或带说明文字的一个 HTML Markdown 代码块（推荐）。合并已有 import map 并移到 module 脚本前；自动修复 `three` / `three/addons/` 的 null、相对路径和不支持地址，缺失时补齐映射。优先从有效 CDN 映射保留明确的 Three.js 版本，否则使用 0.170.0。
- 单个 JavaScript / js 代码块，或原始 JavaScript。自动提供默认 import map，并尝试补齐 THREE / OrbitControls 导入。复杂导入请使用完整 HTML。
- 有 HTML 代码块时优先采用 HTML，其他代码块视为说明；不负责把多文件 HTML/CSS/JS 项目合并。多个 HTML 或多个 JS 代码块会给出错误。
- 不支持直接运行 JSX、TSX、Python、需要 Vite/npm 的项目或自动解析模型供应商 JSON。请先用对应节点提取 JSON 中的文本为 STRING。

## 预览行为与限制

Three.js 在浏览器 GPU 上执行，不依赖 ComfyUI 的 CUDA。默认补齐的版本为固定的 0.170.0；完整 HTML 可自带一致版本的 import map。首次加载需要浏览器能联网访问 CDN。预览刷新、重新运行和放大/关闭放大会重建场景，交互状态随之重置。停止或删除节点会销毁 iframe；保存工作流不保存实时渲染状态，重新打开后执行即可恢复。

预览使用独立来源的 sandbox iframe，不开放 same-origin、弹窗或父页面 API 权限。CSP 允许 jsDelivr、unpkg、esm.sh 的脚本与 fetch，以及 HTTPS 图片；不支持本地 API、任意资源服务器、eval 或内嵌子页面。隔离并非 CPU/GPU 配额限制，无限循环仍可能卡住页面；只预览可信来源的代码。需要其他资源域名时应明确评估并修改 `web/preview.js` 内的策略。

下载得到经预览处理的 HTML，包含导入映射、限制策略和错误桥接，建议通过本地 HTTP 服务打开；不会自动写入 ComfyUI output 目录。无自定义服务端路由，无自动安装依赖，无模型 API 密钥需求。

## 排查

- 找不到节点：检查是否多套了一层文件夹、后端启动日志是否有导入错误，并确认装到了当前运行实例的 custom_nodes。
- 有节点但无预览区域：强制刷新，查看浏览器 Console 中扩展加载错误，并检查前端 DOM 控件兼容性。
- 区域为空或出现错误：查看节点内错误消息、浏览器 Console/Network，检查 CDN 连通性、WebGL、import map、资源跨域和相机位置。
- 模型输出未更新：执行工作流才会传递上游新文本；“重新运行”仅重新加载最近一次成功接收的代码。

开发接口参考：https://docs.comfy.org/custom-nodes/js/javascript_overview 和 https://docs.comfy.org/custom-nodes/backend/server_overview
