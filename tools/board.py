#!/usr/bin/env python3
"""Move cards on "The Paranormal Pad" GitHub project board.

    python3 tools/board.py add  ISSUE [--status "Ideas & Backlog"] [--category Report|Tape|Site]
    python3 tools/board.py move ISSUE "Review"
    python3 tools/board.py list [STATUS]
    python3 tools/board.py columns

ISSUE is an issue number in mattjowen1991-hue/the-paranormal-pad.
Uses the GitHub CLI (gh) and GraphQL, because `gh project item-add` alone leaves a card
with no Status, which hides it from the board view.
Note: GitHub's board listing can lag a minute behind; a card can be on the board before
`list` shows it. Check the issue itself if in doubt.
"""
import json, subprocess, sys

OWNER = 'mattjowen1991-hue'
REPO = 'the-paranormal-pad'
BOARD_TITLE = 'The Paranormal Pad'
COLUMNS = ['Session Prompts', 'Ideas & Backlog', 'Drafting', 'Ready', 'In Progress', 'Review', 'Live']
TYPES = ['Report', 'Tape', 'Site']


def gql(query, **variables):
    args = ['gh', 'api', 'graphql', '-f', f'query={query}']
    for k, v in variables.items():
        args += ['-F' if isinstance(v, int) else '-f', f'{k}={v}']
    r = subprocess.run(args, capture_output=True, text=True)
    if r.returncode:
        sys.exit(f'GitHub error: {r.stderr.strip() or r.stdout.strip()}')
    data = json.loads(r.stdout)
    if data.get('errors'):
        sys.exit('GitHub error: ' + '; '.join(e['message'] for e in data['errors']))
    return data['data']


def board():
    d = gql("""query($login:String!){ user(login:$login){ projectsV2(first:30){ nodes{ id number title
              fields(first:40){ nodes{ ... on ProjectV2SingleSelectField { id name options{ id name } } } } } } } }""", login=OWNER)
    for p in d['user']['projectsV2']['nodes']:
        if p['title'] == BOARD_TITLE:
            fields = {f['name']: f for f in p['fields']['nodes'] if f}
            return p, fields
    sys.exit(f'No project called "{BOARD_TITLE}" found for {OWNER}.')


def issue_node(number):
    d = gql("""query($o:String!,$r:String!,$n:Int!){ repository(owner:$o,name:$r){ issue(number:$n){ id title url
              projectItems(first:10){ nodes{ id project{ title } } } } } }""", o=OWNER, r=REPO, n=int(number))
    issue = d['repository']['issue']
    if not issue:
        sys.exit(f'Issue #{number} not found in {OWNER}/{REPO}.')
    return issue


def option(fields, field, name):
    f = fields.get(field)
    if not f:
        sys.exit(f'The board has no "{field}" field.')
    for o in f['options']:
        if o['name'].lower() == name.lower():
            return f['id'], o['id']
    sys.exit(f'"{name}" is not a {field} on the board. Choose from: {", ".join(o["name"] for o in f["options"])}')


def set_field(project, item_id, fields, field, value):
    fid, oid = option(fields, field, value)
    gql("""mutation($p:ID!,$i:ID!,$f:ID!,$o:String!){ updateProjectV2ItemFieldValue(input:{projectId:$p,itemId:$i,fieldId:$f,
          value:{singleSelectOptionId:$o}}){ projectV2Item{ id } } }""", p=project['id'], i=item_id, f=fid, o=oid)


def item_for(project, issue, create=False):
    for n in issue['projectItems']['nodes']:
        if n['project']['title'] == BOARD_TITLE:
            return n['id']
    if not create:
        sys.exit(f'Issue is not on the board yet. Run: python3 tools/board.py add {issue["url"].rsplit("/", 1)[-1]}')
    d = gql('mutation($p:ID!,$c:ID!){ addProjectV2ItemById(input:{projectId:$p,contentId:$c}){ item{ id } } }',
            p=project['id'], c=issue['id'])
    return d['addProjectV2ItemById']['item']['id']


def main(argv):
    if not argv or argv[0] in ('-h', '--help'):
        print(__doc__); return
    cmd = argv[0]
    project, fields = board()
    if cmd == 'columns':
        print('Status:', ' | '.join(o['name'] for o in fields['Status']['options']))
        if 'Category' in fields:
            print('Category:', ' | '.join(o['name'] for o in fields['Category']['options']))
        return
    if cmd == 'list':
        want = ' '.join(argv[1:]).lower()
        d = gql("""query($id:ID!){ node(id:$id){ ... on ProjectV2 { items(first:100){ nodes{
                  status: fieldValueByName(name:"Status"){ ... on ProjectV2ItemFieldSingleSelectValue { name } }
                  type: fieldValueByName(name:"Category"){ ... on ProjectV2ItemFieldSingleSelectValue { name } }
                  content{ ... on Issue { number title state } } } } } } }""", id=project['id'])
        for it in d['node']['items']['nodes']:
            st = (it['status'] or {}).get('name', '(no status)')
            if want and st.lower() != want:
                continue
            c = it['content'] or {}
            print(f"{st:16} {(it['type'] or {}).get('name', ''):7} #{c.get('number', '?'):<4} {c.get('title', '')}")
        return
    if cmd in ('add', 'move'):
        if len(argv) < 2:
            sys.exit('Give an issue number.')
        issue = issue_node(argv[1].lstrip('#'))
        status, typ = None, None
        rest = argv[2:]
        if cmd == 'move':
            if not rest:
                sys.exit(f'Say which column: {", ".join(COLUMNS)}')
            status = ' '.join(rest)
        else:
            status = 'Ideas & Backlog'
            while rest:
                flag = rest.pop(0)
                if flag == '--status':
                    status = rest.pop(0)
                elif flag in ('--category', '--type'):
                    typ = rest.pop(0)
        item = item_for(project, issue, create=(cmd == 'add'))
        set_field(project, item, fields, 'Status', status)
        if typ:
            set_field(project, item, fields, 'Category', typ)
        print(f'#{argv[1].lstrip("#")} "{issue["title"]}" -> {status}' + (f' ({typ})' if typ else ''))
        return
    sys.exit(f'Unknown command "{cmd}". Use add, move, list or columns.')


if __name__ == '__main__':
    main(sys.argv[1:])
