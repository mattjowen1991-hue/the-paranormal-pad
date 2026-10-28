# Draft format

The one format a report or tape draft is written in. The Claude Project produces it, Matt
tweaks it, it's pasted into a **New report** / **New tape** card, and `tools/new_file.py`
builds the page from it. Keep to it exactly and the build is automatic.

A draft is a **header** between two `---` lines, then the **text** in simple Markdown.

---

## Report

```
---
kind: report
title: Come and play with us
date: 2026-09-28
location: Smethwick, Birmingham
subjects: Hauntings, Shadow People, UAP
featured: no
---
## Report Introduction

This report comes from a family member. I remember how it all started quite clearly...

[PHOTO 1: Astbury Avenue, Smethwick. Image: Google Maps]

### The House

Our story takes place in a council house in Smethwick...

## Fran's Story

### Part 1: The Box Room

I was around five or six years old...

[SKETCH 1: a recurring nightmare Fran would have of being suspended above her bed]

The second nightmare was different. I was suspended in the air above my bed...

## My Thoughts

... What do you think? Leave your witness statement below.
```

### Header lines

| Line | Needed? | What it is |
|---|---|---|
| `kind` | yes | `report` |
| `title` | yes | The report's title (no "Incident Report 009:" - that's added automatically) |
| `date` | yes | The filed date, `YYYY-MM-DD` (normally the day it goes live) |
| `location` | yes | Shown as "Origin", e.g. `Bromsgrove, UK` |
| `subjects` | yes | Comma list from: Hauntings, Shadow People, Poltergeist, Sleep Paralysis, Dreams, Ouija Board, UAP (ask for a new one if none fit) |
| `no` | no | Leave out - the next free number is used |
| `excerpt` | no | Leave out - the first 1-2 sentences are used. Only set it if the opening doesn't work as a teaser. |
| `featured` | no | `yes` makes it the homepage Featured Case. Then also give: |
| `featured_where` | if featured | Street-level place for the case file, e.g. `Astbury Avenue, Smethwick, Birmingham` |
| `featured_statement` | if featured | 2-3 sentences summing up the account (Reporter's field statement) |
| `featured_quote` | if featured | One line of witness testimony, in quotes |
| `featured_witness` | if featured | e.g. `"Fran" (anonymised)` |
| `featured_stamp` | optional | A short red stamp, e.g. `Told by a sceptic` |
| `featured_identity` | optional | e.g. `Witness identity: withheld` |

## Tape

```
---
kind: tape
title: Letters on the Board
date: 2026-05-22
narrator: Midnight Narrative
video: https://www.youtube.com/watch?v=BxVILuS9Q-U
video_title: Midnight Narrative - Episode 5 - "Time and Shadows"
subjects: Ouija Board
sides:
  - A | 006 | Letters on the Board | 09:31 | 19:33
---
## Narrated by Midnight Narrative

Report 006: Letters on the Board was narrated by [Midnight Narrative Horror](https://www.youtube.com/@midnightnarrativehorror)...

My story starts at 09:31 and runs until 19:33. This tape plays just that part.

### Letters on the Board

A piece of family folklore from the 1940s...

[PLAY SIDE A]

## Credits

Narration by Midnight Narrative Horror. Story by The Reporter.
```

- `video` can be a YouTube link or a Spotify episode link (`https://open.spotify.com/episode/...`);
  Spotify tapes play in Spotify's own player on the cassette.
- `date` is the video's (or episode's) publish date. `sides`: one line per story in the video -
  `side | report number | title | start | end` (times as `mm:ss` or `h:mm:ss`). Two lines make a
  double-sided cassette with a Side A / Side B switch.
- `[PLAY SIDE A]` becomes the "Play" and "Read Report" buttons for that side.
- Every side's report gets a **Listen instead** player at the top, playing just that story (the
  newest narration is the default; older ones are listed as choices). For a tape that isn't a
  narration (an interview, a revisit, a discussion) add `narration: no`: its reports then show an
  "Also on tape" link instead. If it has no sides, name the reports with `about: 001` (comma list).

## Text rules (both)

| Write | Becomes |
|---|---|
| `## Heading` | Main section, with the diamond divider |
| `### Heading` | Part / Incident heading in red with a dashed line |
| `#### Heading` | Small bold italic title |
| Blank line | New paragraph |
| `*words*` / `**words**` | Italic / bold |
| `[text](https://...)` | A link (or `[text](#file-003)` for another report on the site) |
| `> "A line"` | Pull quote |
| `- item` | Bullet list |
| `[PHOTO 3: Caption. Image: Source]` | Photo number 3 as a paperclipped print with caption |
| `[SKETCH 1: What it shows]` | Sketch number 1, an ink drawing centred just before the paragraph after it, with no caption. The text after the colon is read out by screen readers and shown in the photo viewer, so name the memory it shows, not the drawing. Only inside the witness's own account (`brand/sketch-style/STYLE.md`). |
| `[PAIR: SKETCH 1: What it shows \| PHOTO 5: Caption]` | A clipped pair: sketch 1 on top of photo 5, with a Sketch / Photo switch. For a real photo taken from where the moment happened; the sketch copies its layout. Both prints show their caption. See `brand/sketch-style/STYLE.md` section 8. |
| `[VIDEO: https://youtu.be/xxxx \| Caption \| 0:05-1:30]` | Playable YouTube evidence (start-end optional) |

## Pictures

- Every draft needs a **cover** picture (used on the card, the tapes page and WhatsApp
  previews). Landscape or square works best.
- Photos in the text are numbered `[PHOTO 1]`, `[PHOTO 2]` ... in the order they appear.
- Sketches are numbered separately: `[SKETCH 1]`, `[SKETCH 2]` ... Put each marker on its own line
  just **before** the paragraph it belongs to.
- A `[PAIR: ...]` uses up one sketch number and one photo number, and goes where that photo would.
- On the card, upload the pictures **named** `cover.jpg`, `1.jpg`, `2.jpg` ... (any image type),
  or upload them in that order: cover first, then 1, 2, 3. Sketches are always named:
  `sketch-1.png`, `sketch-2.png` ...
- Any size is fine; they're resized automatically.

## Videos

Any YouTube link works in `[VIDEO: ...]`. For video that isn't on YouTube yet, upload it to
YouTube (it can be *unlisted*) and use that link - GitHub Pages isn't a good home for video files.
