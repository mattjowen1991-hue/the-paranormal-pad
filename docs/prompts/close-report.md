> **Pinned session prompt.** Run this after **go-live**, every time a report or tape goes live (same Claude Code chat is fine). Replace `ISSUE_NUMBER` with the card number.
> Canonical copy: `docs/prompts/close-report.md` (the board card is kept in step by `tools/sync_prompts.py`).

```
Report/tape card #ISSUE_NUMBER is live. Close it off and bring my Claude Project up to date.
Repo: mattjowen1991-hue/the-paranormal-pad

1. CHECK IT'S REALLY LIVE
   - gh issue view ISSUE_NUMBER --repo mattjowen1991-hue/the-paranormal-pad --json state,title
   - The card should be closed and in Live: python3 tools/board.py list Live
   - If it isn't live yet, stop and tell me to run PROMPT: go-live first.
   - git checkout main && git pull

2. REBUILD THE CLAUDE PROJECT KIT
   - python3 tools/claude_project_kit.py
   - If any files in claude-project/knowledge/ changed, commit and push them:
     "Refresh Claude Project kit after #ISSUE_NUMBER"

3. WORK OUT WHAT MY PROJECT IS MISSING
   - python3 tools/claude_project_kit.py --status
     (compares against claude-project/uploaded.json - what's actually been uploaded - so
     anything missed after an earlier report is caught too)
   - If it says up to date, skip to step 6.

4. HAND ME THE FILES
   - python3 tools/claude_project_kit.py --stage
     This copies only the out-of-date files into claude-project/to-upload/, opens that folder in
     Finder, and puts INSTRUCTIONS.md on my clipboard if it changed.
   - Give me the exact steps, naming each file:
     1. claude.ai -> Projects -> "The Paranormal Pad - Reports"
     2. For each file listed: in the Files panel, hover the old copy -> ... -> Remove
     3. Click + -> Upload from device -> select the files in the Finder window that just opened
     4. (Only if INSTRUCTIONS.md is listed) Instructions -> Edit -> select all -> Cmd+V -> Save
     5. Reply "uploaded" here
   - Then WAIT for me to say "uploaded". Don't mark anything until I do.

5. RECORD IT
   - python3 tools/claude_project_kit.py --mark-uploaded
   - Commit and push claude-project/uploaded.json: "Claude Project synced after #ISSUE_NUMBER"
   - Suggest a one-line check to paste into the Project, e.g.
     "What's the most recent report, and what's the next report number?" - the answer should
     name the report that just went live and the next number.

6. SIGN-OFF
   - The live link and share link for #ISSUE_NUMBER
   - Claude Project: up to date (and which files were refreshed), or "nothing to upload"
   - Anything left open on the card (questions from publish-report that were never answered)
```

**Tips**
- Skipped this after a report? No problem: next time it runs, `--status` catches everything that's out of date, not just the latest change.
- claude.ai doesn't let Claude Code upload to a Project, so step 4 is the one manual bit.
