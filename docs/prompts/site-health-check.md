> **Pinned session prompt.** Copy the block below into Claude Code started in `~/projects/the-paranormal-pad`. Run it every month or two, or whenever something seems off.
> Canonical copy: `docs/prompts/site-health-check.md` (the board card is kept in step by `tools/sync_prompts.py`).

```
Run a health check on theparanormalpad.com. Look and report; don't change anything without asking.
Repo: mattjowen1991-hue/the-paranormal-pad (read CLAUDE.md and PROJECT.md first).

1. PAGES
   - Every report and tape page, the Tapes page, The Reporter and Contact load on the live site
     (headless Chrome at 390px and 1280px): no errors in the console, no sideways scrolling,
     photos load, the search box and the tab menu work.
   - Every share page (/reports/NNN/, /tapes/NNN/) has og:title and an og:image that returns 200.
   - A few old WordPress links still forward (e.g. /2026/09/28/incident-report-008-come-and-play-with-us/, /contact-us/).

2. VIDEOS
   - Every YouTube video in js/data.js and content/ still exists and allows embedding
     (oEmbed returns 200). List any that don't - a narrator may have removed one.

3. SERVICES
   - Comments: the public Firestore query for approved comments still works (REST runQuery with
     the apiKey from js/data.js). Remind me to check the moderation desk for waiting statements.
   - Email: remind me to check web3forms.com for the monthly count (free plan: 250).
   - HTTPS: gh api repos/mattjowen1991-hue/the-paranormal-pad/pages --jq .https_certificate
     (state approved, expiry date).
   - Domain: whois theparanormalpad.com - expiry date (auto-renews at WordPress.com each October).

4. HOUSEKEEPING
   - Anything on the board stuck in "In Progress" or "Review" for more than two weeks.
   - Open PRs or branches left behind.
   - Images over 1 MB that could be shrunk.
   - Are the ?v= numbers in index.html the same on every CSS/JS link?

5. REPORT
   - A short table: area - OK / problem - detail.
   - For each problem, offer to create a Site ticket (create-ticket) - ask first.
   - Comment the summary on the PROMPT: site-health-check card so there's a history.
```
