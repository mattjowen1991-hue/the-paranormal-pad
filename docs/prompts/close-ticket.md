> **Pinned session prompt.** Copy the block below into Claude Code started in `~/projects/the-paranormal-pad` and replace `ISSUE_NUMBER`.
> Canonical copy: `docs/prompts/close-ticket.md` (the board card is kept in step by `tools/sync_prompts.py`).

```
Site ticket #ISSUE_NUMBER is approved. Ship it and close it properly.

1. SHIP
   - Find the PR: gh pr list --repo mattjowen1991-hue/the-paranormal-pad --search "ISSUE_NUMBER in:body"
   - Merge it: gh pr merge PR_NUMBER --squash --delete-branch; git checkout main; git pull
   - Wait for GitHub Pages: gh api repos/mattjowen1991-hue/the-paranormal-pad/pages/builds/latest
     until "built" with the merge commit.

2. LIVE CHECK
   - Check the change on https://theparanormalpad.com at 390px and 1280px (use a fresh browser
     profile so nothing cached hides a problem).

3. DRIFT CHECK
   - Compare what shipped with the acceptance criteria. List anything partly done or deferred.

4. DOCS AUDIT - make the edits, don't just suggest them
   - PROJECT.md / CLAUDE.md: new files, new conventions, changed structure, anything now wrong.
   - README.md (setup/reference) and GUIDE.md (day-to-day running) if behaviour changed.
   - If a prompt in docs/prompts/ changed: python3 tools/sync_prompts.py to update the board cards.

5. MEMORY AUDIT
   - Anything a future session would be surprised by (a quirk, a dead end, a gotcha not in the
     docs)? If so, save it to this project's memory. Otherwise skip.

6. FOLLOW-UPS
   - List deferred scope or bugs found. Ask whether to create tickets for them (create-ticket).

7. CLOSE
   - gh issue close ISSUE_NUMBER --repo mattjowen1991-hue/the-paranormal-pad --comment "Live: ..."
   - python3 tools/board.py move ISSUE_NUMBER "Live"

8. SIGN-OFF: what shipped, files changed, docs updated (yes/no + what), memory written, follow-ups.
```
