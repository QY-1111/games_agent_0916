import importlib.util
import pathlib
import unittest

spec = importlib.util.spec_from_file_location("preview", pathlib.Path(__file__).parents[1] / "__init__.py")
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


class PreviewTests(unittest.TestCase):
    def test_html_with_explanation(self):
        self.assertEqual(mod.extract_code('说明\n```html\n<html></html>\n```\n说明'), ('<html></html>', 'html'))

    def test_js(self):
        self.assertEqual(mod.extract_code('```javascript\nconst x=1;\n```'), ('const x=1;', 'javascript'))

    def test_plain_html(self):
        self.assertEqual(mod.extract_code('<!doctype html><html></html>')[1], 'html')

    def test_empty_and_oversize(self):
        for value in (' ', 'x' * (mod.MAX_CHARS + 1), None):
            with self.assertRaises(ValueError): mod.extract_code(value)

    def test_multiple_files_and_unsupported(self):
        for value in ('```js\na\n```\n```js\nb\n```', '```tsx\n<div/>\n```'):
            with self.assertRaises(ValueError): mod.extract_code(value)

    def test_ui_contract(self):
        result = mod.ThreeJSPreview().preview('const x=1;', 99999)
        self.assertEqual(result['result'], ('const x=1;',))
        self.assertEqual(result['ui']['threejs_height'], [1200])
        self.assertTrue(mod.ThreeJSPreview.OUTPUT_NODE)


if __name__ == '__main__': unittest.main()
