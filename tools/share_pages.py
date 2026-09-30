#!/usr/bin/env python3
"""Build the share pages: /reports/<no>/ and /tapes/<no>/.

WhatsApp, Facebook etc. only read a page's HTML, so they can't tell which report a
"#file-008" link points to. Each share page carries that report's title, opening
lines and cover image as preview tags, then sends the visitor straight to the report.

Run after adding or changing a report or tape:   python3 tools/share_pages.py
"""
import html, json, os, re, shutil, struct

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = 'https://theparanormalpad.com'


def image_size(path):
    """(width, height) of a JPEG or PNG without extra libraries."""
    with open(path, 'rb') as f:
        head = f.read(26)
        if head[:8] == b'\x89PNG\r\n\x1a\n':
            return struct.unpack('>II', head[16:24])
        f.seek(2)
        while True:
            marker, length = struct.unpack('>HH', f.read(4))
            if 0xFFC0 <= marker <= 0xFFCF and marker not in (0xFFC4, 0xFFC8, 0xFFCC):
                h, w = struct.unpack('>xHH', f.read(5))
                return w, h
            f.seek(length - 2, 1)


def load(name, js):
    return json.loads(re.search(rf'const {name} = (\[.*?\]);', js, re.S).group(1))


def page(f):
    is_tape = f['kind'] == 'tape'
    label = f"Incident {'Tape' if is_tape else 'Report'} {f['no']}"
    title = f"{label}: {f['title']}"
    route = f"#{'tape' if is_tape else 'file'}-{f['no']}"
    folder = f"{'tapes' if is_tape else 'reports'}/{f['no']}"
    url = f"{SITE}/{folder}/"
    img = f"{SITE}/images/{f['img']}"
    w, h = image_size(os.path.join(ROOT, 'images', f['img']))
    desc = f['excerpt']
    e = lambda s: html.escape(s, quote=True)
    return folder, f"""<!DOCTYPE html>
<!-- Made by tools/share_pages.py — edit data.js and re-run it rather than editing this file. -->
<html lang="en-GB">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{e(title)} - The Paranormal Pad</title>
  <meta name="description" content="{e(desc)}">
  <link rel="canonical" href="{url}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="The Paranormal Pad">
  <meta property="og:title" content="{e(title)}">
  <meta property="og:description" content="{e(desc)}">
  <meta property="og:url" content="{url}">
  <meta property="og:image" content="{img}">
  <meta property="og:image:width" content="{w}">
  <meta property="og:image:height" content="{h}">
  <meta property="og:image:alt" content="{e(title)}">
  <meta property="og:locale" content="en_GB">
  <meta name="twitter:card" content="summary_large_image">
  <meta http-equiv="refresh" content="0; url=/{route}">
  <script>location.replace('/{route}');</script>
  <style>body{{margin:0;background:#efe8dc;color:#1a1918;font-family:'Courier New',monospace;display:grid;place-items:center;min-height:100vh;text-align:center;padding:1rem}}a{{color:#8b1e19}}</style>
</head>
<body>
  <p>Opening {e(title)}…<br><a href="/{route}">Continue to The Paranormal Pad</a></p>
</body>
</html>
"""


def main():
    js = open(os.path.join(ROOT, 'js', 'data.js'), encoding='utf-8').read()
    files = load('REPORTS', js) + load('TAPES', js)
    for kind in ('reports', 'tapes'):             # start clean so removed files don't linger
        for entry in os.listdir(os.path.join(ROOT, kind)) if os.path.isdir(os.path.join(ROOT, kind)) else []:
            if re.fullmatch(r'\d{3}', entry):
                shutil.rmtree(os.path.join(ROOT, kind, entry))
    for f in files:
        folder, body = page(f)
        os.makedirs(os.path.join(ROOT, folder), exist_ok=True)
        with open(os.path.join(ROOT, folder, 'index.html'), 'w', encoding='utf-8') as out:
            out.write(body)
        print(f'{SITE}/{folder}/')


if __name__ == '__main__':
    main()
