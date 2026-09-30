> **Pinned session prompt.** Copy the block below into Claude Code started in `~/projects/the-paranormal-pad` and replace the bracketed line with what you want.
> Canonical copy: `docs/prompts/create-ticket.md` (the board card is kept in step by `tools/sync_prompts.py`).

```
I want to create a new ticket for The Paranormal Pad website.

[DESCRIBE THE CHANGE IN 1-2 SENTENCES]

Please:

1. UNDERSTAND
   - Restate the goal in one sentence.
   - Say which kind it is: Feature, Fix, or Maintenance (see PROJECT.md section 7).
     A new report or tape is NOT a ticket - that's the New report / New tape form.

2. VERIFY GROUND TRUTH
   - Read CLAUDE.md and PROJECT.md, then the files the change would touch, to confirm how it
     works today. Look at the live site if it helps (https://theparanormalpad.com).
   - Note constraints: no build step, keep the case-file look, phones first (390px), bump ?v=
     for CSS/JS, no em dashes, never put the secret word/PIN in the repo.

3. DRAFT the ticket body:
   ## Goal
   ## Context
   ## Acceptance criteria
   ## Implementation notes   (files likely touched)
   ## Out of scope
   ## Test plan              (what to check at 390px and desktop)

4. SHOW me the draft and wait for my OK.

5. POST it:
   gh issue create --repo mattjowen1991-hue/the-paranormal-pad --title "TITLE" --body-file BODY.md --label site
   (add bug / enhancement / chore as fits)
   python3 tools/board.py add ISSUE_NUMBER --status "Ideas & Backlog" --category Site

6. SIGN OFF: issue URL, number, column, one sentence on what will be built.
```

**Tips**
- Quick things can go straight in with the **Site change** form instead.
- Never put real tickets in the Session Prompts column.
