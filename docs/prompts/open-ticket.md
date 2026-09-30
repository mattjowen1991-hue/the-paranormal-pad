> **Pinned session prompt.** Copy the block below into Claude Code started in `~/projects/the-paranormal-pad` and replace `ISSUE_NUMBER`.
> Canonical copy: `docs/prompts/open-ticket.md` (the board card is kept in step by `tools/sync_prompts.py`).

```
I want to work on site ticket #ISSUE_NUMBER for The Paranormal Pad.

1. PREFLIGHT
   - Confirm `pwd` is the repo; `git status` clean; `git checkout main && git pull`.
   - gh issue view ISSUE_NUMBER --repo mattjowen1991-hue/the-paranormal-pad
   - Read CLAUDE.md, PROJECT.md and every file named in the ticket.
   - python3 tools/board.py move ISSUE_NUMBER "In Progress"

2. INVENTORY
   - List the files you'll change and why. If it's bigger than the ticket suggests, say so
     before starting.

3. EXECUTION RULES
   - Branch: feat/..., fix/... or chore/... matching the ticket.
   - One logical change per commit; the message says why and references #ISSUE_NUMBER.
   - Bump every ?v= number in index.html if any CSS or JS changed.
   - No em dashes in copy. Keep the case-file look. No new dependencies or build step.
   - Test through a local server (python3 -m http.server 8080), at 390px and 1280px, with
     headless Chrome screenshots you actually look at. If comments or email are involved, test
     against the Firebase emulator / faked Web3Forms - never post test data to the live services
     without asking.

4. MID-WORK DISCOVERIES
   - Fix small obvious things; raise bigger ones as a suggested new ticket instead of growing scope.

5. HANDOFF
   - Push the branch and open a PR ("Closes #ISSUE_NUMBER") with What / Why / Test plan.
   - python3 tools/board.py move ISSUE_NUMBER "Review"
   - Output: changes made, how I can check it (local link + what to look for), PR link, and
     either "ready to merge" or the decision you need from me.
```

**Tips**
- After I've looked, merge with **PROMPT: close-ticket**.
