#!/usr/bin/env python3
"""Keep the pinned prompt cards on the board identical to docs/prompts/*.md.

    python3 tools/sync_prompts.py            # create missing cards, update changed ones
    python3 tools/sync_prompts.py --check    # only report differences

Each docs/prompts/NAME.md becomes an issue titled "PROMPT: NAME" (label session-prompt) sitting
in the board's Session Prompts column. The files are the originals; edit those, then run this.
"""
import glob, json, os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = 'mattjowen1991-hue/the-paranormal-pad'
ORDER = ['publish-report', 'publish-tape', 'go-live', 'create-ticket', 'open-ticket', 'close-ticket', 'site-health-check']


def gh(*args):
    r = subprocess.run(['gh', *args], capture_output=True, text=True)
    if r.returncode:
        sys.exit(f'gh {" ".join(args[:3])}... failed: {r.stderr.strip()}')
    return r.stdout


def main():
    check = '--check' in sys.argv
    existing = {i['title']: i for i in json.loads(gh('issue', 'list', '--repo', REPO, '--label', 'session-prompt',
                                                       '--state', 'all', '--limit', '100', '--json', 'number,title,body,state'))}
    files = sorted(glob.glob(os.path.join(ROOT, 'docs', 'prompts', '*.md')))
    names = [os.path.basename(f)[:-3] for f in files if not f.endswith('README.md')]
    names.sort(key=lambda n: ORDER.index(n) if n in ORDER else 99)
    for name in names:
        body = open(os.path.join(ROOT, 'docs', 'prompts', name + '.md'), encoding='utf-8').read().strip()
        title = f'PROMPT: {name}'
        issue = existing.get(title)
        if issue and issue['body'].strip() == body and issue['state'] == 'OPEN':
            print(f'same     {title} (#{issue["number"]})'); continue
        if check:
            print(f'{"DIFFERS" if issue else "MISSING"}  {title}'); continue
        tmp = os.path.join('/tmp', f'prompt-{name}.md')
        open(tmp, 'w', encoding='utf-8').write(body + '\n')
        if issue:
            gh('issue', 'edit', str(issue['number']), '--repo', REPO, '--body-file', tmp)
            if issue['state'] != 'OPEN':
                gh('issue', 'reopen', str(issue['number']), '--repo', REPO)
            num = issue['number']; print(f'updated  {title} (#{num})')
        else:
            url = gh('issue', 'create', '--repo', REPO, '--title', title, '--body-file', tmp, '--label', 'session-prompt').strip()
            num = int(url.rsplit('/', 1)[-1]); print(f'created  {title} (#{num})')
        subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'board.py'), 'add', str(num), '--status', 'Session Prompts'],
                       check=True, capture_output=True)


if __name__ == '__main__':
    main()
