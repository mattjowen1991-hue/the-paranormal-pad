# The Paranormal Pad - Project Brief

The brief every Claude Code session reads first. Day-to-day running (contact form, approving
comments) is in `GUIDE.md`; setup and reference is in `README.md`.

## 1. What this is

**theparanormalpad.com** - Matt Owen's ("The Reporter") collection of first-hand paranormal
accounts, in the style of a 1920s case archive.

- **Incident Reports** - written accounts: Matt's own experiences, and stories told to him by
  family, friends and colleagues, researched and written up in his voice.
- **Incident Tapes** - YouTube narrations of those reports by other channels (Mortis Media,
  Paranormal M, Midnight Narrative) plus Matt's radio interview, shown as playable cassettes.
- **Witness statements** - moderated comments under every report and tape.

## 2. Tech in one paragraph

A static site on **GitHub Pages** (repo `mattjowen1991-hue/the-paranormal-pad`, branch `main`
goes live automatically). No build step, no framework, no npm. `index.html` loads HTML
partials and each report's text with `fetch`, so test through a local server
(`python3 -m http.server 8080`), never `file://`. Comments use **Firebase Firestore**; the
contact form and comment alerts use **Web3Forms**; videos are YouTube embeds. The domain is
registered at **WordPress.com** (DNS points at GitHub Pages).

## 3. File structure

```
index.html              page shell: loads partials, data.js, then the scripts (note the ?v= numbers)
css/styles.css          all styles
js/data.js              REPORTS, TAPES, FEATURED, COMMENTS, EMAIL, SUBJECTS   <- the data
js/main.js              loader, archive, search, report pages, cassettes, share buttons
js/comments.js          witness statements + #moderate desk (secret word / PIN hashes)
js/email.js             Web3Forms sending
js/lightbox.js          full-screen photo viewer
partials/*.html         header, archive (home), file, tapes, reporter, contact, moderate, footer
content/reports/NNN.html, content/tapes/NNN.html     the text of each report / tape
images/reports/NNN/     cover.jpg + 01.jpg, 02.jpg ... (in-report photos)
images/tapes/NNN/       cover.jpg
reports/NNN/, tapes/NNN/  share pages (generated - never edit by hand)
404.html                forwards old WordPress links to the new pages
tools/new_file.py       draft (+ pictures) -> content, images, data.js entry, share page
tools/share_pages.py    rebuilds reports/NNN/ and tapes/NNN/ share pages
tools/board.py          moves cards on the project board
tools/share-card.html   source of images/share.jpg (site-wide share preview)
PUBLISHING.md           step-by-step guide for Matt: Claude Project setup, writing, filing, building, going live
HOUSE-STYLE.md          how reports and tapes are written - the editorial standard
docs/DRAFT-FORMAT.md    the exact draft format the Claude Project produces and new_file.py reads
docs/prompts/           the session prompts (also pinned on the board)
claude-project/         the kit for the claude.ai Project that drafts reports
firestore.rules         comment security rules (paste into Firebase when changed)
_config.yml             keeps these working files off the public website
tools/claude_project_kit.py, tools/sync_prompts.py   refresh the Claude Project files / the prompt cards
```

## 4. Data model

`js/data.js` holds plain JSON arrays. Report entry:
```
{ "kind": "report", "no": "008", "title": "...", "date": "2026-09-28",
  "img": "reports/008/cover.jpg", "loc": "Smethwick, Birmingham",
  "tags": ["Hauntings", "Shadow People"], "excerpt": "First lines for cards and share previews..." }
```
Tape entry adds `"url"` (YouTube), `"narrator"`, `"dur"` (seconds), `"sides"`:
`[{ "side": "A", "report": "002", "title": "...", "start": 1775, "end": 3470 }]`, and
optionally `"pinned": true` (only the radio interview, Tape 005 - always shown first).
`tags` must come from `SUBJECTS`. `FEATURED` picks the homepage case.

Numbering: reports and tapes each count up (009, 010 ...). New tapes take the next free
number; the pinned radio tape stays at the top of the Tapes page whatever its number.

## 5. Conventions (important)

- **No em dashes in anything new** - Matt dislikes them. Use a plain hyphen, a comma, or two sentences.
- British English (sceptic, colour, realise, Nan, Grandad, council estate).
- **Bump the `?v=` number** on the CSS/JS links in `index.html` whenever CSS or JS changes, or
  phones keep the old files. Content and partials don't need it.
- After adding/changing a report or tape, run `python3 tools/share_pages.py` (new_file.py does this).
- Never invent facts, dates, sources or quotes in a report. Mark AI-generated images as
  "AI recreation" in the caption. Keep people's anonymity exactly as the draft says.
- Keep the look: case-file parchment, typewriter headings, stamps, paperclipped photos. No new
  fonts or colours without a ticket saying so.
- Test on phone width (390px) as well as desktop - most readers are on mobile.
- The secret word and PIN live only in the private repo `the-paranormal-pad-notes`. Never write
  them into this public repo.
- Everything on `main` goes live. Build on a branch; merge only when Matt approves.

## 6. How work is organised - the board

GitHub project **"The Paranormal Pad"** (users/mattjowen1991-hue/projects/5). Columns:

| Column | Meaning |
|---|---|
| Session Prompts | Pinned copy-and-paste prompts. Never real work. |
| Ideas & Backlog | Story ideas, submissions to follow up, site work not started. |
| Drafting | Being written/tweaked in the Claude Project. |
| Ready | Final draft attached (story) or ticket scoped (site). Ready for Claude Code. |
| In Progress | Claude Code is building it on a branch. |
| Review | Built; waiting for Matt to check the preview. |
| Live | Published / merged. |

After go-live, **close-report** refreshes the Claude Project kit and records the upload
(`claude-project/uploaded.json`).

The **Category** field is Report, Tape or Site. Move cards with `python3 tools/board.py`.
New cards come from the issue forms: **New report**, **New tape**, **Site change**.

### The story flow
1. Draft in the Claude Project (claude.ai) and tweak until happy.
2. Open a **New report** / **New tape** issue: paste the draft, drop in the pictures. It lands on the board.
3. Move it to **Ready**. Run **PROMPT: publish-report** (or publish-tape) in Claude Code.
4. Claude builds it on a branch, previews it locally, opens a PR, moves the card to **Review**.
5. Matt checks the preview. Run **PROMPT: go-live** - merges, checks the live page, card to **Live**.

### The site-work flow
create-ticket -> open-ticket -> (review) -> close-ticket, as on Matt's other projects.
**PROMPT: site-health-check** is the periodic maintenance sweep.

## 7. Ticket types and definition of done

- **Report / Tape** - page renders on desktop and 390px; photos and videos work; share page
  exists with the right title and picture; excerpt reads well; no em dashes; nothing invented;
  counts and archive updated; merged and live-checked.
- **Feature / Fix** - acceptance criteria met; checked at 390px and desktop; `?v=` bumped if
  CSS/JS changed; README/PROJECT/GUIDE updated if behaviour changed.
- **Chore / Maintenance** - the check done and its result recorded on the issue.

## 8. Start Claude Code in the repo

Project memory is tied to the folder Claude Code starts in. Start it from this folder
(`cd ~/projects/the-paranormal-pad && claude`, or an alias such as `pad`), not from home.
