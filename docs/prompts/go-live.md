> **Pinned session prompt.** Copy the block below into Claude Code started in `~/projects/the-paranormal-pad` once you've checked the preview, and replace `ISSUE_NUMBER`.
> Canonical copy: `docs/prompts/go-live.md` (the board card is kept in step by `tools/sync_prompts.py`).

```
I've reviewed card #ISSUE_NUMBER and want it live on theparanormalpad.com.
Repo: mattjowen1991-hue/the-paranormal-pad

1. FIND THE WORK
   - gh issue view ISSUE_NUMBER --repo mattjowen1991-hue/the-paranormal-pad --json title,comments
   - Find its PR: gh pr list --repo mattjowen1991-hue/the-paranormal-pad --search "ISSUE_NUMBER in:body" --state open
   - If I've asked for last changes in this session, make them on the PR branch first and show me.
   - If there's no open PR, stop and say so.

2. MERGE
   - gh pr merge PR_NUMBER --squash --delete-branch
   - git checkout main && git pull

3. WAIT FOR THE SITE TO REBUILD
   - Poll: gh api repos/mattjowen1991-hue/the-paranormal-pad/pages/builds/latest --jq '.status + " " + .commit'
     until it says "built" with the merge commit (usually 1-2 minutes). If it errors, stop and tell me.

4. CHECK IT LIVE - the real site, not the branch
   - https://theparanormalpad.com/#file-NNN (or #tape-NNN) loads with its photos (headless Chrome, 390px and 1280px).
   - The share page carries the right preview:
     curl -s -A "WhatsApp/2.24" https://theparanormalpad.com/reports/NNN/ | grep og:
     and the og:image URL returns 200.
   - The homepage shows it (and as Featured Case if chosen).

5. TIDY UP
   - Refresh the Claude Project kit: python3 tools/claude_project_kit.py, commit and push the
     updated claude-project/ files, and tell me which files to re-upload to the Claude Project.
   - Comment on the card with the live link and the share link, close it, and:
     python3 tools/board.py move ISSUE_NUMBER "Live"

6. SIGN-OFF
   - Live link and share link (the one to post on WhatsApp / socials)
   - https://developers.facebook.com/tools/debug/?q=SHARE_LINK - in case an old preview is cached
   - Which Claude Project files to re-upload
```
