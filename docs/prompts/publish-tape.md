> **Pinned session prompt.** Copy the block below into Claude Code started in `~/projects/the-paranormal-pad` and replace `ISSUE_NUMBER` with the tape's card number.
> Canonical copy: `docs/prompts/publish-tape.md` (the board card is kept in step by `tools/sync_prompts.py`).

```
I want to build the Incident Tape on card #ISSUE_NUMBER and get it ready for my review.
Repo: mattjowen1991-hue/the-paranormal-pad

1. PREFLIGHT
   - Confirm `pwd` is the repo; `git status` clean; `git checkout main && git pull`.
   - Read CLAUDE.md, PROJECT.md, HOUSE-STYLE.md (section 11: Incident Tapes) and docs/DRAFT-FORMAT.md.
   - gh issue view ISSUE_NUMBER --repo mattjowen1991-hue/the-paranormal-pad --json title,body,comments
   - python3 tools/board.py move ISSUE_NUMBER "In Progress"

2. GATHER THE FACTS - from the video itself, never guessed
   - oEmbed for title and channel: https://www.youtube.com/oembed?url=VIDEO_URL&format=json
   - The watch page for publish date, length, view count and the description (timestamps/chapters,
     credits such as artists, and how I'm credited, e.g. u/MattJowen).
   - Check my start/end times against the chapters. If they disagree by more than a few seconds,
     show both and ask.
   - Cover: download https://i.ytimg.com/vi/VIDEO_ID/maxresdefault.jpg (fall back to hqdefault.jpg)
     to /tmp/pad-ISSUE_NUMBER/media/cover.jpg and look at it.
   - Spotify episode instead of YouTube: title from https://open.spotify.com/oembed?url=EPISODE_URL;
     show, publish date and length from the __NEXT_DATA__ JSON in https://open.spotify.com/embed/episode/ID;
     the description and chapters from the podcast host if the embed links one (e.g. Spreaker's API).
     Cover: the episode artwork (prefer the host's original 16:9 image). Spotify rarely has chapters,
     so check my times by listening: a few seconds of transcript around each start/end (faster-whisper
     on the episode audio) shows exactly where each story is announced.
   - Confirm each story's report number exists in js/data.js.

3. WRITE THE TAPE DRAFT (unless the card already has one - then use it, tidy only)
   - Follow HOUSE-STYLE.md section 11 and match the existing tapes in content/tapes/.
   - Save to /tmp/pad-ISSUE_NUMBER/draft.md in the draft format: kind: tape, title (the report's
     title, or "A & B" for two sides), date = video publish date, narrator, video, video_title,
     subjects (from the reports), sides lines, then the body with [PLAY SIDE A] etc.
   - No em dashes. Credit the narrator and artists exactly as the video does. Say it's shared with
     their permission only if the card confirms permission; otherwise ask me.

4. NUMBER AND PLACE
   - Default: next free tape number. The pinned radio tape (Tape 006) stays at the top of the
     Tapes page whatever its number. If I've asked for a different number or order, confirm how
     before building (renumbering an existing tape also moves its comments and share link).

5. BUILD ON A BRANCH
   - Dry run first: python3 tools/new_file.py /tmp/pad-ISSUE_NUMBER/draft.md --media /tmp/pad-ISSUE_NUMBER/media --dry-run
   - git checkout -b tape/NNN-short-title
   - python3 tools/new_file.py /tmp/pad-ISSUE_NUMBER/draft.md --media /tmp/pad-ISSUE_NUMBER/media
   - Commit: content/tapes/NNN.html, images/tapes/NNN/, js/data.js, tapes/NNN/. Message "Add Incident Tape NNN: Title (#ISSUE_NUMBER)".

6. PREVIEW - play it, don't assume
   - python3 -m http.server 8080; open http://localhost:8080/#tapes at 1280px and 390px.
   - Press Play on the new cassette (headless Chrome with a normal Chrome user agent - YouTube
     blocks the "HeadlessChrome" one): it must start at the side's start time, the counter must
     match the video time, and a two-sided tape must switch sides correctly (Spotify: also while
     playing, and it must stop at the side's end).
   - Check the tape page (#tape-NNN) and the share page (/tapes/NNN/).
   - Open each report the tape tells (#file-NNN): its "Listen instead" player now defaults to this
     narration (newest first). Press Listen and check it starts at the story. Not a narration
     (interview, revisit)? The draft needs `narration: no`, and the report shows "Also on tape".

7. PULL REQUEST AND REVIEW
   - Push, open a PR ("Closes #ISSUE_NUMBER"), comment on the card with the facts you found,
     preview links and any questions, then: python3 tools/board.py move ISSUE_NUMBER "Review"

8. HANDOFF - then stop. Don't merge; PROMPT: go-live does that.
```
