# The Paranormal Pad

Static site for theparanormalpad.com (GitHub Pages, no build step). Read `PROJECT.md` first;
it has the file map, data model, conventions and the board workflow.

Key rules:
- Everything merged to `main` goes live. Work on a branch; merge only when Matt approves.
- No em dashes in anything new. British English.
- Bump the `?v=` numbers in `index.html` when CSS or JS changes.
- New reports/tapes go through `tools/new_file.py` (draft format: `docs/DRAFT-FORMAT.md`).
  Writing standard: `HOUSE-STYLE.md`. Never invent facts, quotes or sources.
- Serve locally to test (`python3 -m http.server 8080`); check 390px wide as well as desktop.
- Board cards: `python3 tools/board.py move ISSUE "Column"`.
- Session prompts live in `docs/prompts/` (copies are pinned on the board - keep both in step).
- Never put the moderation secret word or PIN in this repo.
