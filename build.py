#!/usr/bin/env python3
"""Bundle the game into ONE self-contained HTML file: luminara-single-file.html
Run:  python3 build.py
"""
import re, pathlib
root = pathlib.Path(__file__).parent
html = (root / 'index.html').read_text()
def inline(m):
    src = m.group(1)
    code = (root / src).read_text().replace('</script>', '<\\/script>')
    return f'<script>/* {src} */\n{code}\n</script>'
out = re.sub(r'<script src="([^"]+)"></script>', inline, html)
(root / 'luminara-single-file.html').write_text(out)
print('wrote luminara-single-file.html', len(out)//1024, 'KB')
