#!/usr/bin/env python3
"""Rebuild claude-project/knowledge/ - the files uploaded to the claude.ai Project that
drafts reports and tapes.

    python3 tools/claude_project_kit.py

Makes (from the live content, so it stays current as reports are added):
  knowledge/01-house-style.md      copy of HOUSE-STYLE.md
  knowledge/02-draft-format.md     copy of docs/DRAFT-FORMAT.md
  knowledge/03-site-facts.md       every report and tape: number, title, date, place, subjects
  knowledge/04-example-reports.md  every published report, converted back to the draft format
  knowledge/05-example-tapes.md    every tape page, in the draft format
Prints which files changed.

Keeping the claude.ai Project in step (claude.ai has no upload API, so the upload itself is manual):
    python3 tools/claude_project_kit.py --status          # which files differ from what's in the Project
    python3 tools/claude_project_kit.py --stage           # copy just those into claude-project/to-upload/ and open it
    python3 tools/claude_project_kit.py --mark-uploaded   # after uploading: record them as in the Project
The record lives in claude-project/uploaded.json (file -> fingerprint at last upload).
"""
import hashlib, html, json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'claude-project', 'knowledge')


def load(name, js):
    return json.loads(re.search(rf'const {name} = (\[.*?\]|\{{.*?\}});\n', js, re.S).group(1))


def clock(s):
    s = int(s or 0)
    return f'{s // 3600}:{s % 3600 // 60:02d}:{s % 60:02d}' if s >= 3600 else f'{s // 60:02d}:{s % 60:02d}'


def md_inline(h):
    h = re.sub(r'<a [^>]*href="([^"]+)"[^>]*>(.*?)</a>', lambda m: f'[{md_inline(m.group(2))}]({html.unescape(m.group(1))})', h, flags=re.S)
    h = re.sub(r'<(strong|b)>(.*?)</\1>', r'**\2**', h, flags=re.S)
    h = re.sub(r'<(em|i)>(.*?)</\1>', r'*\2*', h, flags=re.S)
    h = re.sub(r'<br\s*/?>', '\n', h)
    h = re.sub(r'<[^>]+>', '', h)
    return html.unescape(h).strip()


def to_draft_body(content):
    n = [0]
    def photo(m):
        n[0] += 1
        cap = re.search(r'<figcaption>(.*?)</figcaption>', m.group(0), re.S)
        return f'\n\n[PHOTO {n[0]}: {md_inline(cap.group(1)) if cap else ""}]\n\n'
    def video(m):
        block = m.group(0)
        vid = re.search(r'data-yt="([\w-]+)"', block)
        if not vid:
            link = re.search(r'href="([^"]+)"', block)
            return f'\n\n[{md_inline(re.search(r"<p>(.*?)</p>", block, re.S).group(1)) if "<p>" in block else "Link"}]({link.group(1) if link else ""})\n\n'
        st = re.search(r'data-start="(\d+)"', block); en = re.search(r'data-end="(\d+)"', block)
        cap = re.search(r'<p>(.*?)</p>', block, re.S)
        times = f' | {clock(st.group(1)) if st else "00:00"}-{clock(en.group(1)) if en else ""}' if (st or en) else ''
        return f'\n\n[VIDEO: https://youtu.be/{vid.group(1)} | {md_inline(cap.group(1)) if cap else ""}{times}]\n\n'
    s = re.sub(r'<div class="gallery">(.*?)</div>', r'\1', content, flags=re.S)
    s = re.sub(r'<figure.*?</figure>', photo, s, flags=re.S)
    s = re.sub(r'<div class="evidence".*?</div>', video, s, flags=re.S)
    s = re.sub(r'<div class="side-actions">.*?data-seek="(\d+)".*?</div>', '\n\n[PLAY SIDE]\n\n', s, flags=re.S)
    s = re.sub(r'<h([234])>(.*?)</h\1>', lambda m: f'\n\n{"#" * int(m.group(1))} {md_inline(m.group(2))}\n\n', s, flags=re.S)
    s = re.sub(r'<blockquote>(.*?)</blockquote>', lambda m: f'\n\n> {md_inline(m.group(1))}\n\n', s, flags=re.S)
    s = re.sub(r'<ul>(.*?)</ul>', lambda m: '\n\n' + '\n'.join('- ' + md_inline(li) for li in re.findall(r'<li>(.*?)</li>', m.group(1), re.S)) + '\n\n', s, flags=re.S)
    s = re.sub(r'<p>(.*?)</p>', lambda m: f'\n\n{md_inline(m.group(1))}\n\n', s, flags=re.S)
    s = re.sub(r'<[^>]+>', '', s)
    return re.sub(r'\n{3,}', '\n\n', s).strip()


def write(name, text, changed):
    path = os.path.join(OUT, name)
    old = open(path, encoding='utf-8').read() if os.path.exists(path) else None
    if old != text:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(text)
        changed.append(name)


def main():
    os.makedirs(OUT, exist_ok=True)
    js = open(os.path.join(ROOT, 'js', 'data.js'), encoding='utf-8').read()
    reports, tapes, featured = load('REPORTS', js), load('TAPES', js), load('FEATURED', js)
    subjects = re.findall(r'["\']([^"\']+)["\']', re.search(r'const SUBJECTS = \[(.*?)\];', js, re.S).group(1))
    changed = []

    write('01-house-style.md', open(os.path.join(ROOT, 'HOUSE-STYLE.md'), encoding='utf-8').read(), changed)
    write('02-draft-format.md', open(os.path.join(ROOT, 'docs', 'DRAFT-FORMAT.md'), encoding='utf-8').read(), changed)

    rows = '\n'.join(f'| {r["no"]} | {r["title"]} | {r["date"]} | {r["loc"]} | {", ".join(r["tags"])} |' for r in sorted(reports, key=lambda r: r['no']))
    trows = '\n'.join(f'| {t["no"]} | {t["title"]} | {t["date"]} | {t.get("narrator", "-")} | '
                      + ('; '.join(f'Side {s["side"]}: Report {s["report"]} {clock(s["start"])}-{clock(s["end"])}' for s in t.get("sides", [])) or '-')
                      + (' (pinned first)' if t.get('pinned') else '') + ' |' for t in sorted(tapes, key=lambda t: t['no']))
    nxt_r = f'{max(int(r["no"]) for r in reports) + 1:03d}'
    nxt_t = f'{max(int(t["no"]) for t in tapes) + 1:03d}'
    facts = f"""# Site facts - The Paranormal Pad

Generated from the live site by tools/claude_project_kit.py. Use it for continuity: report
numbers, what has already been published, and the allowed subjects.

- Site: https://theparanormalpad.com - Matt is "The Reporter".
- Next report number: **{nxt_r}** (don't put it in the draft - it's assigned automatically). Next tape: **{nxt_t}**.
- Current Featured Case: Report {featured.get("no")}.
- Allowed subjects: {", ".join(subjects)}. A new subject needs adding to the site first - say so.
- Comments on the site are called **witness statements**.

## Published reports

| No | Title | Filed | Origin | Subjects |
|---|---|---|---|---|
{rows}

## Published tapes

| No | Title | Published | Narrator | Sides |
|---|---|---|---|---|
{trows}

## People who appear in reports (keep names and pseudonyms consistent)

Check the example reports before reusing a name. Pseudonyms already in use include "Fran" and
"John" (Report 008). Real names used with permission include Lou (007), Talita Klaass (005) and
Josh English (006). Matt's Nan and Grandad, partner and daughter appear in 001 and 002.
"""
    write('03-site-facts.md', facts, changed)

    parts = ['# Example reports - every published Incident Report, in the draft format\n\n'
             'These are Matt\'s real published reports: the best guide to his voice. They were written before\n'
             'HOUSE-STYLE.md, so where they differ (dashes, "comments below", AI-sounding phrases, typos),\n'
             'follow HOUSE-STYLE.md. Photo numbers here are only illustrative.\n']
    for r in sorted(reports, key=lambda r: r['no']):
        body = to_draft_body(open(os.path.join(ROOT, 'content', 'reports', r['no'] + '.html'), encoding='utf-8').read())
        parts.append(f'\n\n==================== REPORT {r["no"]} ====================\n\n---\nkind: report\ntitle: {r["title"]}\n'
                     f'date: {r["date"]}\nlocation: {r["loc"]}\nsubjects: {", ".join(r["tags"])}\n---\n{body}\n')
    write('04-example-reports.md', ''.join(parts), changed)

    parts = ['# Example tapes - every published Incident Tape page, in the draft format\n\n'
             'Tape 004 (the radio interview) predates the tape format and is written differently; follow 001-003.\n']
    for t in sorted(tapes, key=lambda t: t['no']):
        raw = open(os.path.join(ROOT, 'content', 'tapes', t['no'] + '.html'), encoding='utf-8').read()
        raw = re.sub(r'^\s*<div class="evidence".*?</div>', '', raw, count=1, flags=re.S)   # the engine adds the video itself
        body = to_draft_body(raw)
        letters = iter('ABCDEFGH')
        body = re.sub(r'\[PLAY SIDE\]', lambda m: f'[PLAY SIDE {next(letters)}]', body)
        sides = ''.join(f'\n  - {s["side"]} | {s["report"]} | {s["title"]} | {clock(s["start"])} | {clock(s["end"])}' for s in t.get('sides', []))
        parts.append(f'\n\n==================== TAPE {t["no"]} ====================\n\n---\nkind: tape\ntitle: {t["title"]}\ndate: {t["date"]}\n'
                     f'narrator: {t.get("narrator", "")}\nvideo: {t.get("url", "")}\nsubjects: {", ".join(t["tags"])}\n'
                     + (f'sides:{sides}\n' if sides else '') + f'---\n{body}\n')
    write('05-example-tapes.md', ''.join(parts), changed)

    print('Rebuilt from the site - these files changed:' if changed else 'Kit rebuilt - no files changed.')
    for c in changed:
        print('  claude-project/knowledge/' + c)


# ---------------------------------------------------------------- keeping the Project in step
KIT = os.path.join(ROOT, 'claude-project')
RECORD = os.path.join(KIT, 'uploaded.json')
STAGE = os.path.join(KIT, 'to-upload')


def fingerprint(path):
    return hashlib.sha256(open(path, 'rb').read()).hexdigest()[:16]


def tracked():
    """(name shown to Matt, path, how it goes into the Project)"""
    files = [('INSTRUCTIONS.md', os.path.join(KIT, 'INSTRUCTIONS.md'), 'paste into Instructions')]
    for name in sorted(os.listdir(OUT)):
        if name.endswith('.md'):
            files.append((name, os.path.join(OUT, name), 'upload to Files'))
    return files


def out_of_date():
    record = json.load(open(RECORD)) if os.path.exists(RECORD) else {}
    return [(n, p, how) for n, p, how in tracked() if record.get(n) != fingerprint(p)], record


def status():
    stale, record = out_of_date()
    if not record:
        print('No upload has been recorded yet, so everything is treated as needing uploading.')
    if not stale:
        print('The Claude Project is up to date. Nothing to upload.')
        return
    print('Out of date in the Claude Project:')
    for n, _, how in stale:
        print(f'  {n:28} {how}')


def stage():
    import shutil, subprocess
    stale, _ = out_of_date()
    shutil.rmtree(STAGE, ignore_errors=True)
    if not stale:
        print('The Claude Project is up to date. Nothing to upload.')
        return
    os.makedirs(STAGE)
    for n, p, how in stale:
        shutil.copy2(p, os.path.join(STAGE, n))
        print(f'  {n:28} {how}')
    instr = next((p for n, p, _ in stale if n == 'INSTRUCTIONS.md'), None)
    if instr:
        subprocess.run(['pbcopy'], input=open(instr, 'rb').read())
        print('INSTRUCTIONS.md is on the clipboard, ready to paste.')
    subprocess.run(['open', STAGE])
    print(f'Opened {STAGE} in Finder.')


def mark_uploaded():
    import shutil
    record = {n: fingerprint(p) for n, p, _ in tracked()}
    with open(RECORD, 'w') as f:
        json.dump(record, f, indent=2)
        f.write('\n')
    shutil.rmtree(STAGE, ignore_errors=True)
    print('Recorded: the Claude Project now matches claude-project/.')


if __name__ == '__main__':
    import sys
    arg = sys.argv[1] if len(sys.argv) > 1 else ''
    if arg == '--status':
        main(); status()
    elif arg == '--stage':
        main(); stage()
    elif arg == '--mark-uploaded':
        mark_uploaded()
    else:
        main()
