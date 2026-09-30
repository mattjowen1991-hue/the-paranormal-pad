#!/usr/bin/env python3
"""Turn a finished draft into a report or tape on the site.

    python3 tools/new_file.py DRAFT.md --media FOLDER [--no 009] [--dry-run]

DRAFT.md is written in the draft format (docs/DRAFT-FORMAT.md): a short header block
between --- lines, then the text in Markdown with [PHOTO n: caption] and
[VIDEO: url | caption | start-end] markers.

FOLDER holds the pictures: cover.jpg (the card/share picture) and 1.jpg, 2.png, ...
matching the [PHOTO n] markers. Any common image type works; they're resized to JPEG.

What it does:
  - writes content/reports/NNN.html (or content/tapes/NNN.html)
  - copies pictures to images/reports/NNN/ (cover.jpg, 01.jpg, ...)
  - adds the entry to REPORTS / TAPES in js/data.js (and FEATURED if asked)
  - rebuilds the share pages (tools/share_pages.py)
It never touches git. Standard library only (uses macOS `sips` for pictures).
"""
import argparse, html, json, os, re, shutil, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'js', 'data.js')
SUBJECT_ALIASES = {'haunted house': 'Hauntings', 'haunting': 'Hauntings', 'shadow person': 'Shadow People',
                   'poltergeists': 'Poltergeist', 'ouija': 'Ouija Board', 'dream': 'Dreams'}


class DraftError(Exception):
    pass


# ---------------------------------------------------------------- draft parsing
def parse_draft(text):
    m = re.match(r'\s*---\s*\n(.*?)\n---\s*\n(.*)\Z', text, re.S)
    if not m:
        raise DraftError('The draft must start with a header block between two --- lines (see docs/DRAFT-FORMAT.md).')
    meta, sides, key = {}, [], None
    for raw in m.group(1).splitlines():
        line = raw.split(' #', 1)[0].rstrip() if not raw.lstrip().startswith(('-', '"')) else raw.rstrip()
        if not line.strip():
            continue
        if line.lstrip().startswith('- ') and key == 'sides':
            sides.append(line.strip()[2:].strip())
            continue
        k, sep, v = line.partition(':')
        if not sep:
            raise DraftError(f'Header line not understood: "{raw.strip()}"')
        key = k.strip().lower().replace(' ', '_')
        v = v.strip()
        if len(v) >= 2 and v[0] == v[-1] == '"' and '"' not in v[1:-1]:
            v = v[1:-1].strip()          # "wrapped" values lose their wrapping quotes; quotes inside are kept
        meta[key] = v
    if sides:
        meta['sides'] = sides
    return meta, m.group(2).strip()


def to_seconds(t):
    parts = [int(p) for p in t.strip().split(':')]
    s = 0
    for p in parts:
        s = s * 60 + p
    return s


def esc(s):
    return html.escape(s, quote=False)


def inline(s):
    """Markdown inline: links, bold, italic. Input is raw text; output is safe HTML."""
    def emphasis(t):
        t = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', t)
        return re.sub(r'(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])', r'<em>\1</em>', t)
    out, links = esc(s), []
    def keep_link(m):
        url = html.unescape(m.group(2))
        external = '' if url.startswith('#') else ' rel="noopener" target="_blank"'   # #file-003 = a page on this site
        links.append(f'<a href="{html.escape(url, quote=True)}"{external}>{emphasis(m.group(1))}</a>')
        return f'\x00{len(links) - 1}\x00'
    out = re.sub(r'\[([^\]]+)\]\((https?://[^)\s]+|#[\w-]+)\)', keep_link, out)
    out = emphasis(out)
    out = re.sub(r'\x00(\d+)\x00', lambda m: links[int(m.group(1))], out)
    return out


def yt_id(url):
    m = re.search(r'(?:youtube\.com/(?:watch\?v=|embed/|shorts/|live/)|youtu\.be/)([\w-]{11})', url)
    if not m:
        raise DraftError(f'Not a YouTube link: {url}')
    return m.group(1)


def body_to_html(body, photos, kind, used):
    """photos: {n: 'images/reports/009/01.jpg'}; used: set of photo numbers seen."""
    blocks, para, lst = [], [], []
    def flush():
        if para:
            blocks.append('<p>' + '<br/>'.join(inline(l) for l in para) + '</p>')
            para.clear()
        if lst:
            blocks.append('<ul>' + ''.join(f'<li>{inline(i)}</li>' for i in lst) + '</ul>')
            lst.clear()
    for raw in body.splitlines():
        line = raw.strip()
        if not line:
            flush(); continue
        h = re.match(r'(#{2,4})\s+(.*)', line)
        pm = re.match(r'\[PHOTO\s+(\d+)\s*:?\s*(.*?)\]$', line, re.I)
        vm = re.match(r'\[VIDEO\s*:\s*(.*?)\]$', line, re.I)
        sm = re.match(r'\[PLAY SIDE\s+([AB])\]$', line, re.I)
        if h:
            flush(); lvl = len(h.group(1)); blocks.append(f'<h{lvl}>{inline(h.group(2))}</h{lvl}>')
        elif pm:
            flush()
            n = int(pm.group(1))
            if n not in photos:
                raise DraftError(f'[PHOTO {n}] is in the draft but there is no picture numbered {n} in the media folder.')
            used.add(n)
            cap = pm.group(2).strip()
            alt = html.escape(re.sub(r'\[([^\]]*)\]\([^)]*\)', r'\1', cap).replace('*', ''), quote=True)
            blocks.append(f'<figure><img alt="{alt}" loading="lazy" src="{photos[n]}"/>'
                          + (f'<figcaption>{inline(cap)}</figcaption>' if cap else '') + '</figure>')
        elif vm:
            flush()
            bits = [b.strip() for b in vm.group(1).split('|')]
            vid = yt_id(bits[0])
            cap = bits[1] if len(bits) > 1 else ''
            start = end = 0
            if len(bits) > 2 and bits[2]:
                se = bits[2].split('-')
                start = to_seconds(se[0]); end = to_seconds(se[1]) if len(se) > 1 and se[1].strip() else 0
            attrs = f' data-yt="{vid}"' + (f' data-start="{start}"' if start else '') + (f' data-end="{end}"' if end else '')
            t = f'&amp;t={start}s' if start else ''
            blocks.append(f'<div class="evidence"{attrs}><span class="label">Video evidence</span>'
                          + (f'<p>{inline(cap)}</p>' if cap else '')
                          + f'<a href="https://www.youtube.com/watch?v={vid}{t}" rel="noopener" target="_blank">Watch on YouTube ↗</a></div>')
        elif sm:
            flush(); blocks.append(f'\x01SIDE {sm.group(1).upper()}\x01')
        elif line.startswith('>'):
            flush(); blocks.append(f'<blockquote><p>{inline(line.lstrip("> ").strip())}</p></blockquote>')
        elif re.match(r'[-*]\s+', line):
            if para:
                flush()
            lst.append(re.sub(r'^[-*]\s+', '', line))
        else:
            if lst:
                flush()
            para.append(line)
    flush()
    return '\n'.join(blocks)


# ---------------------------------------------------------------- data.js
def load_data():
    js = open(DATA, encoding='utf-8').read()
    def grab(name):
        m = re.search(rf'const {name} = (\[.*?\]|\{{.*?\}});\n', js, re.S)
        return m, json.loads(m.group(1))
    return js, grab


def replace_const(js, name, value):
    m = re.search(rf'const {name} = (\[.*?\]|\{{.*?\}});\n', js, re.S)
    return js[:m.start(1)] + json.dumps(value, ensure_ascii=False, indent=2) + js[m.end(1):]


def subjects_list(js):
    raw = re.search(r'const SUBJECTS = \[(.*?)\];', js, re.S).group(1)
    return re.findall(r'["\']([^"\']+)["\']', raw)


def clean_subjects(raw, allowed):
    out = []
    for s in [x.strip() for x in raw.split(',') if x.strip()]:
        s = SUBJECT_ALIASES.get(s.lower(), s)
        match = next((a for a in allowed if a.lower() == s.lower()), None)
        if not match:
            raise DraftError(f'Subject "{s}" is not on the site. Use one of: {", ".join(allowed)} '
                             '(or add a new subject to SUBJECTS in js/data.js first).')
        if match not in out:
            out.append(match)
    return out


def excerpt_from(body_html, limit=210):
    first = re.search(r'<p>(.*?)</p>', body_html, re.S)
    text = html.unescape(re.sub(r'<[^>]+>', ' ', first.group(1) if first else '')).split()
    text = ' '.join(text)
    if len(text) <= limit:
        return text
    return text[:limit].rsplit(' ', 1)[0].rstrip(',.;:') + '…'


# ---------------------------------------------------------------- pictures
IMG_EXT = ('.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.gif', '.tif', '.tiff')


def find_media(folder):
    cover, photos = None, {}
    if not folder:
        return cover, photos
    for name in sorted(os.listdir(folder)):
        stem, ext = os.path.splitext(name)
        if ext.lower() not in IMG_EXT:
            continue
        if stem.lower() == 'cover':
            cover = os.path.join(folder, name)
        elif re.fullmatch(r'(?:photo[-_ ]?)?0*(\d+)', stem, re.I):
            photos[int(re.fullmatch(r'(?:photo[-_ ]?)?0*(\d+)', stem, re.I).group(1))] = os.path.join(folder, name)
    return cover, photos


def save_jpeg(src, dest, max_px):
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    r = subprocess.run(['sips', '-s', 'format', 'jpeg', '-s', 'formatOptions', '82', '-Z', str(max_px), src, '--out', dest],
                       capture_output=True, text=True)
    if r.returncode or not os.path.exists(dest):
        raise DraftError(f'Could not convert picture {src}: {r.stderr.strip()}')


# ---------------------------------------------------------------- main
def build(draft_path, media, number=None, dry=False):
    meta, body = parse_draft(open(draft_path, encoding='utf-8').read())
    checks = re.findall(r'\[CHECK:[^\]]*\]', body + '\n'.join(str(v) for v in meta.values()))
    if checks:
        raise DraftError('The draft still has notes to resolve: ' + '; '.join(checks[:5]))
    kind = meta.get('kind', 'report').lower()
    if kind not in ('report', 'tape'):
        raise DraftError('kind must be "report" or "tape".')
    for req in ('title', 'date'):
        if not meta.get(req):
            raise DraftError(f'The header is missing "{req}".')
    if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', meta['date']):
        raise DraftError('date must look like 2026-11-01.')

    js, grab = load_data()
    _, reports = grab('REPORTS')
    _, tapes = grab('TAPES')
    existing = reports if kind == 'report' else tapes
    no = (number or meta.get('no') or '').strip()
    no = f'{int(no):03d}' if no else f'{max(int(f["no"]) for f in existing) + 1:03d}'
    if any(f['no'] == no for f in existing):
        raise DraftError(f'{kind.title()} {no} already exists. Pick another number or leave "no" blank.')

    folder = 'reports' if kind == 'report' else 'tapes'
    cover, photo_files = find_media(media)
    if not cover:
        raise DraftError(f'No cover picture found. Put one in the media folder named cover.jpg (or .png).')
    photos = {n: f'images/{folder}/{no}/{n:02d}.jpg' for n in photo_files}
    used = set()
    body_html = body_to_html(body, photos, kind, used)
    unused = sorted(set(photo_files) - used)

    entry = {'kind': kind, 'no': no, 'title': meta['title'], 'date': meta['date'],
             'img': f'{folder}/{no}/cover.jpg', 'loc': meta.get('location', ''),
             'tags': clean_subjects(meta.get('subjects', ''), subjects_list(js)),
             'excerpt': meta.get('excerpt') or excerpt_from(body_html)}

    if kind == 'tape':
        for req in ('video', 'narrator'):
            if not meta.get(req):
                raise DraftError(f'A tape header needs "{req}".')
        vid = yt_id(meta['video'])
        sides = []
        for line in meta.get('sides', []):
            parts = [p.strip() for p in line.split('|')]
            if len(parts) != 5:
                raise DraftError(f'Side line should be "A | report number | title | start | end", got: {line}')
            side, rep, title, start, end = parts
            sides.append({'side': side.upper(), 'report': f'{int(rep):03d}' if rep else '', 'title': title,
                          'start': to_seconds(start), 'end': to_seconds(end) if end else 0})
        if not sides:
            sides = [{'side': 'A', 'report': '', 'title': meta['title'], 'start': 0, 'end': 0}]
        first = sides[0]
        hero = (f'<div class="evidence" data-yt="{vid}"' + (f' data-start="{first["start"]}"' if first['start'] else '')
                + (f' data-end="{first["end"]}"' if first['end'] and len(sides) == 1 else '')
                + f'><span class="label">Video evidence</span><p>{esc(meta.get("video_title", meta["title"]))}'
                + f', narrated by {esc(meta["narrator"])}.</p><a href="https://www.youtube.com/watch?v={vid}" rel="noopener" target="_blank">Watch on YouTube ↗</a></div>')
        def side_actions(m):
            sd = next((s for s in sides if s['side'] == m.group(1)), None)
            if not sd:
                raise DraftError(f'[PLAY SIDE {m.group(1)}] used but there is no side {m.group(1)} in the header.')
            read = f'<a class="btn light" href="#file-{sd["report"]}">Read Report {sd["report"]}</a>' if sd['report'] else ''
            return (f'<div class="side-actions"><a class="btn dark side-play" data-seek="{sd["start"]}" '
                    f'href="https://www.youtube.com/watch?v={vid}&amp;t={sd["start"]}s" rel="noopener" target="_blank">▶ Play '
                    + (f'Side {sd["side"]}' if len(sides) > 1 else f'from {sd["start"] // 60:02d}:{sd["start"] % 60:02d}') + f'</a>{read}</div>')
        body_html = hero + '\n' + re.sub(r'\x01SIDE ([AB])\x01', side_actions, body_html)
        dur = sum(max(0, (s['end'] or s['start']) - s['start']) for s in sides)
        entry.update({'loc': meta.get('location') or f'{meta["narrator"]} (YouTube)', 'url': f'https://www.youtube.com/watch?v={vid}',
                      'narrator': meta['narrator'], 'dur': dur or None, 'sides': sides})
        if not entry['dur']:
            entry.pop('dur')
        if not meta.get('excerpt'):
            entry['excerpt'] = excerpt_from(body_html.split('\n', 1)[-1])
    elif '\x01' in body_html:
        raise DraftError('[PLAY SIDE] markers only work in tapes.')

    featured = None
    if meta.get('featured', 'no').lower() in ('yes', 'true', 'y'):
        if kind != 'report':
            raise DraftError('Only reports can be the featured case.')
        featured = {'no': no, 'where': meta.get('featured_where') or entry['loc'], 'identity': meta.get('featured_identity', ''),
                    'stamp': meta.get('featured_stamp', ''), 'statement': meta.get('featured_statement') or entry['excerpt'],
                    'quote': meta.get('featured_quote', ''), 'witness': meta.get('featured_witness', ''),
                    'place': meta.get('featured_place') or entry['loc'], 'status': meta.get('featured_status', 'Unexplained')}

    report = {'kind': kind, 'no': no, 'entry': entry, 'photos_used': sorted(used), 'photos_unused': unused, 'featured': bool(featured),
              'content_file': f'content/{folder}/{no}.html', 'share_page': f'https://theparanormalpad.com/{folder}/{no}/',
              'page': f'https://theparanormalpad.com/#{"tape" if kind == "tape" else "file"}-{no}'}
    if dry:
        report['preview_html'] = body_html[:1500]
        return report

    # write everything
    save_jpeg(cover, os.path.join(ROOT, 'images', folder, no, 'cover.jpg'), 1400)
    for n in used:
        save_jpeg(photo_files[n], os.path.join(ROOT, photos[n]), 1600)
    with open(os.path.join(ROOT, report['content_file']), 'w', encoding='utf-8') as out:
        out.write(body_html + '\n')
    if kind == 'report':
        reports.insert(0, entry)
        js = replace_const(js, 'REPORTS', reports)
    else:
        tapes.insert(0, entry)
        tapes.sort(key=lambda t: t['no'], reverse=True)
        js = replace_const(js, 'TAPES', tapes)
    if featured:
        js = replace_const(js, 'FEATURED', featured)
    with open(DATA, 'w', encoding='utf-8') as out:
        out.write(js)
    subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'share_pages.py')], check=True, capture_output=True)
    return report


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('draft')
    ap.add_argument('--media', help='folder with cover.jpg and 1.jpg, 2.jpg ... (optional for tapes if you give a cover)')
    ap.add_argument('--no', help='force a number, e.g. 009')
    ap.add_argument('--dry-run', action='store_true', help='check the draft and show what would happen, change nothing')
    a = ap.parse_args()
    try:
        result = build(a.draft, a.media, a.no, a.dry_run)
    except DraftError as e:
        print(f'DRAFT PROBLEM: {e}', file=sys.stderr)
        sys.exit(2)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
