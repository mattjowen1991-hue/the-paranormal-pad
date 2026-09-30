> **Pinned session prompt.** Copy the block below into Claude Code started in `~/projects/the-paranormal-pad` and replace `ISSUE_NUMBER` with the report's card number.
> Canonical copy: `docs/prompts/publish-report.md` (the board card is kept in step by `tools/sync_prompts.py`).

```
I want to build the Incident Report on card #ISSUE_NUMBER and get it ready for my review.
Repo: mattjowen1991-hue/the-paranormal-pad

1. PREFLIGHT
   - Confirm `pwd` is the repo. If it's my home folder, say so first (project memory won't load).
   - `git status` must be clean and on main: `git checkout main && git pull`.
   - Read CLAUDE.md, PROJECT.md, HOUSE-STYLE.md and docs/DRAFT-FORMAT.md.
   - Fetch the card: gh issue view ISSUE_NUMBER --repo mattjowen1991-hue/the-paranormal-pad --json title,body,labels,comments
   - Move it: python3 tools/board.py move ISSUE_NUMBER "In Progress"

2. UNPACK THE CARD
   - Save the "Draft" section (the text inside its markdown code block) exactly as written to
     /tmp/pad-ISSUE_NUMBER/draft.md.
   - Download every picture in the "Pictures" section into /tmp/pad-ISSUE_NUMBER/media/:
     curl -sL -H "Authorization: Bearer $(gh auth token)" "URL" -o FILE
     Name each from its alt text / file name (cover, 1, 2, ...). If they're unnamed, the first is
     the cover and the rest are 1, 2, 3 in order. Keep the real extension (check with `file`).
   - Show me the mapping (picture -> cover / PHOTO n) and each [PHOTO n] caption. If the number of
     pictures doesn't match the [PHOTO n] markers, or there's no cover, stop and ask.
   - The "Featured Case" dropdown overrides the draft header unless it says "As the draft says".
   - Any links in "Videos" fill [VIDEO] markers that are missing a link.

3. EDITORIAL CHECK - this is my writing; don't rewrite it
   - Silently fix only mechanical things: em/en dashes used as dashes -> comma, full stop or plain
     hyphen; obvious typos and doubled words; "comments below" -> "witness statement below".
   - Everything else goes in a list of QUESTIONS for me, not into the text: anything that reads as
     invented or unverifiable, a real name that might need anonymising, a caption missing its
     source, an AI image not labelled, a subject that doesn't fit.
   - Check the opening works as the excerpt (it's what WhatsApp shows).
   - Dry run: python3 tools/new_file.py /tmp/pad-ISSUE_NUMBER/draft.md --media /tmp/pad-ISSUE_NUMBER/media --dry-run
     Fix any DRAFT PROBLEM it reports (tell me what you changed).

4. BUILD ON A BRANCH
   - git checkout -b report/NNN-short-title   (NNN = the number the dry run chose)
   - python3 tools/new_file.py /tmp/pad-ISSUE_NUMBER/draft.md --media /tmp/pad-ISSUE_NUMBER/media
   - Commit everything it created or changed: content/reports/NNN.html, images/reports/NNN/,
     js/data.js, reports/NNN/ (and any share pages it refreshed). Message: "Add Incident Report NNN: Title (#ISSUE_NUMBER)".

5. PREVIEW - look at it, don't assume
   - Serve locally: python3 -m http.server 8080 (in the background).
   - Check http://localhost:8080/#file-NNN at 1280px and 390px wide (headless Chrome screenshots):
     every photo loads and opens in the viewer, videos show a thumbnail, headings and dividers look
     right, the Share button is there, no sideways scrolling.
   - Check the homepage: counts, Latest dispatch, the new card first; Featured Case if chosen.
   - Check http://localhost:8080/reports/NNN/ forwards to the report and carries the right
     og:title, og:description and og:image.

6. PULL REQUEST AND REVIEW
   - git push -u origin HEAD
   - gh pr create --title "Add Incident Report NNN: Title" --body "Closes #ISSUE_NUMBER ..." with a short summary.
   - Comment on the card: number, title, excerpt, subjects, featured yes/no, word count, the
     preview links, and the QUESTIONS list.
   - python3 tools/board.py move ISSUE_NUMBER "Review"

7. HANDOFF - then stop. Do not merge; PROMPT: go-live does that after I've looked.
   Output:
   - Preview: http://localhost:8080/#file-NNN (and the homepage)
   - PR link
   - What you fixed silently
   - QUESTIONS for me (or "none")
```

**Tips**
- Want changes after looking? Say so in the same session - Claude edits the draft, re-runs `new_file.py` on the branch (delete the report's files first, or add `--no NNN`), and pushes again.
- The local preview only works while that Claude Code session is running its server.
