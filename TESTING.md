# 验证记录

- Python unittest：6 项通过，覆盖 HTML/JS 提取、Markdown 包装、空输入/超长输入、多文件/不支持语言拒绝和 ComfyUI UI 返回结构。
- Node.js 语法检查：单文件前端 preview.js 通过。
- 前端兼容回归：模拟 nodeCreated/loadedGraphNode 重复调用不重复挂载；缺少创建回调时在 onExecuted 补挂载；检查 getMinHeight/getHeight 及动态高度更新；禁用 crypto.randomUUID 后仍可渲染。
- Edge headless + Playwright：在模拟 ComfyUI 节点生命周期的页面中，真实 Three.js 场景渲染成功；验证沙箱无法读取父页面、放大/关闭、HTML 下载、停止/重新运行、错误展示、节点移除清理。
- 渲染采用固定版本 Three.js 0.170.0 与同版本 OrbitControls 官方 npm 文件。测试环境 CDN 网络受限，通过 Playwright 路由注入已下载的原始库文件；并非验证目标机器 CDN 连通性。
- examples/preview.png 来自上述浏览器验证页面，不是实际 ComfyUI 界面截图。
- 用户的 ComfyUI 在另一台机器；未进行实际 ComfyUI 安装、工作流导入或完整模型连接测试。demo-workflow.json 是按工作流 0.4 格式生成的单节点示例，需要目标实例验证。

前端回归脚本：`tests/test_frontend.cjs`，需要 Node.js、Playwright 和 Microsoft Edge。安装开发测试依赖 `npm install --no-save playwright` 后运行 `node tests/test_frontend.cjs`。默认访问 CDN；也可设置 `THREE_FIXTURE_DIR` 指向包含同版本 `three.module.js` 与 `OrbitControls.js` 的目录。测试故意触发一次 `TEST_ERROR` 以检查错误展示，预期会输出该错误。
