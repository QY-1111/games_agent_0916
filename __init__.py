"""Three.js browser previews. Model code is never executed by Python."""
import re

MAX_CHARS = 2_000_000


def extract_code(text):
    if not isinstance(text, str) or not text.strip():
        raise ValueError("请输入 HTML/JavaScript，或连接模型的 STRING 输出。")
    if len(text) > MAX_CHARS:
        raise ValueError("代码超过 2,000,000 字符限制。")
    blocks = re.findall(r"^[ \t]*```([^\n`]*)\n(.*?)^[ \t]*```[ \t]*$", text, re.M | re.S)
    if blocks:
        html = [body for lang, body in blocks if lang.strip().lower() in ("html", "htm")]
        if len(html) > 1:
            raise ValueError("发现多个 HTML 文件，请让模型输出一个完整 index.html。")
        if html:
            return html[0].strip(), "html"
        js = [body for lang, body in blocks if lang.strip().lower() in ("js", "javascript", "mjs")]
        if len(js) > 1:
            raise ValueError("发现多个 JavaScript 文件，请合并为单文件 HTML。")
        if js:
            return js[0].strip(), "javascript"
        if len(blocks) == 1 and not blocks[0][0].strip():
            text = blocks[0][1]
        else:
            raise ValueError("未找到 HTML/JavaScript 代码块；不支持 JSX、TSX 或 Python。")
    text = text.strip()
    is_html = bool(re.match(r"(?:<!doctype\s+html|<!--|<(?:html|head|body|div|canvas|script|style)\b)", text, re.I))
    return text, "html" if is_html else "javascript"


class ThreeJSPreview:
    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {
            "code": ("STRING", {"multiline": True, "default": "", "tooltip": "粘贴单文件 HTML / JS，或将此控件转换为输入后连接模型 STRING 输出。"}),
            "height": ("INT", {"default": 420, "min": 240, "max": 1200, "step": 20}),
        }}

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("extracted_code",)
    FUNCTION = "preview"
    CATEGORY = "Three.js"
    OUTPUT_NODE = True
    DESCRIPTION = "接收 LLM 的 HTML / JavaScript 字符串，在节点内交互预览 Three.js。"

    def preview(self, code, height=420):
        source, kind = extract_code(code)
        return {"ui": {"threejs_code": [source], "threejs_kind": [kind],
                       "threejs_height": [max(240, min(1200, int(height)))]},
                "result": (source,)}


NODE_CLASS_MAPPINGS = {"ThreeJSPreview": ThreeJSPreview}
NODE_DISPLAY_NAME_MAPPINGS = {"ThreeJSPreview": "Three.js 代码预览"}
WEB_DIRECTORY = "./web"
__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]
