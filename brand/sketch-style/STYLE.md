# Sketch Style - ink drawings in a witness's account

The standard for the small ink sketches that sit beside a witness's own words. It is read by
Matt when he makes a sketch in ChatGPT, and by the Claude Project when it suggests sketches for
a draft (it gets this file as `14-sketch-style.md`).

The reference image is [`master.png`](master.png) (Report 008, Fran's second nightmare).

---

## 1. The idea

Photos are **evidence**: real places and objects, shown as paperclipped prints. Sketches are
**memory**: what the witness saw, drawn straight onto the page as if the investigator sketched it
while they talked. That difference is the point, so the two never mix: a sketch is never passed
off as a photo. A clipped pair (section 8) puts the two side by side on purpose, each labelled for
what it is.

## 2. Where sketches go

- **Only inside the witness's own account** - the section where they tell it in their own first
  person ("## Fran's Story"). Never in the introduction, the place, the follow-up or My Thoughts.
  When the witness is Matt himself, only in the parts where he describes what happened.
- **One moment per sketch.** Never two scenes in one picture.
- **One to four per account.** Choose the moments the witness describes most clearly and
  visually. Fewer, stronger sketches beat one on every paragraph.
- Each sketch belongs to one paragraph: the one that describes that moment. In the draft, its
  `[SKETCH n: what it shows]` marker goes on its own line just **before** that paragraph. The text
  after the colon is what screen readers say and what the photo viewer shows under the sketch.
  Write it as the memory the sketch shows, in the report's own words, not as a description of the
  drawing: *a recurring nightmare Fran would have of being chased up a hill*, not *a small girl
  running up a hill*. The site puts "Ink sketch:" in front of it.
- On every screen a sketch sits centred between paragraphs, just before the one it belongs to,
  so the reader meets the picture as they reach the moment (up to 520px wide on desktop, full
  width on phones). Two sketches on back-to-back paragraphs are fine; never three in a row.

## 3. Honesty rules (non-negotiable)

- **Draw only what the witness said.** Who is there, where they are, how they are positioned,
  what they are doing, where the light is. If it isn't in their words, leave it out or keep it vague.
- **If they didn't see something, don't draw it.** "Being chased by something. I had no idea what
  it was" means nothing is drawn behind them: only darker hatching.
- **Never change who is who.** If the witness was floating, the floating figure is the witness,
  not someone else watching them.
- **Faces are never shown.** In shadow, turned away, hidden by hair, or featureless. A figure the
  witness describes as featureless stays featureless: no eyes, no mouth.
- **Background is neutral.** Plain furniture, wallpaper, a picture frame or a door are fine.
  Nothing that adds to the story (no extra figures, objects that move, symbols, marks).
- **No caption or label on the page.** A sketch is plainly a drawing, not evidence, so unlike the
  photo-like AI recreations elsewhere on the site it carries no "AI recreation" caption. That makes
  the rules above matter more: the drawing itself must never claim more than the witness said.
  (A sketch clipped over a photo is the exception: as a print it carries an "Ink sketch:" caption,
  section 8.)

## 4. Making one in ChatGPT

**Once only:** in ChatGPT, create a Project called **Paranormal Pad sketches**. Paste the style
block (section 5) into its instructions and upload `master.png` to its files.

1. Open the **Paranormal Pad sketches** Project. Start a **new chat for each sketch**.
2. **Attach `master.png`** to the message, even though it's in the Project files (attaching it is
   the reliable way to make ChatGPT copy it). Always the original master, never a later sketch,
   or the style drifts a little with every copy.
3. Paste the **style block** (section 5) word for word, then the **scene block** for that moment,
   then: *Match the style of the attached image exactly.*
4. Check the result against section 7. Ask for a fix or regenerate; don't settle.
5. Download it as PNG, any size, and name it to match its marker: `sketch-1.png` for
   `[SKETCH 1]`, and so on. Drop it on the report's card with the other pictures.

## 5. The style block (paste word for word)

```
Create a single illustration in this exact style:

A loose, scratchy pen-and-ink sketch, as if drawn from memory for an old case file. Dense, nervous cross-hatching in sepia and brown-black ink only, no other colours. Drawn on plain white paper. The drawing fades out unevenly and irregularly towards the edges into blank white paper, with stray hatching lines trailing off, as if the artist simply stopped: never a square or rectangular shape, no border, no frame, no hard edge. Plenty of empty space. Darkness is built from layered hatching, not solid black fills. Faces are never clearly shown: in shadow, turned away, or featureless. Quiet and unsettling rather than gory or dramatic. Setting feels like working-class Britain in the 1970s to 1990s: a small house, plain furniture, simple wallpaper.

Do not include: text, letters, numbers, signatures, borders, frames, paper texture, stains, colour, glowing eyes, monsters, blood, photorealism, cartoon or anime styling.

Square image, 1:1.
```

**The setting sentence is the one part to swap.** The last sentence of the first paragraph
("Setting feels like working-class Britain...") suits most reports. When a report is set somewhere
else, replace that sentence with a setting line for that report and add *Ignore any British
setting in the project instructions.* (the ChatGPT Project's instructions carry the British one).
Keep everything else word for word. Examples:

- Report 002 (Nan's house): `Setting: a council-estate house near Birmingham, England, from the late 1990s to the early 2010s: plain furniture, simple wallpaper.`
- Report 007 (the Medford apartment): `Setting: a modest American apartment in 2009.`
- Report 007's Addendum: `Setting: an ordinary American family home in Arizona, built in 1970.`

## 6. Writing a scene block

Start with `Scene:` and describe one moment in plain sentences:

- **Who** is there and roughly how old or tall, using the witness's own details.
- **Where** they are and **how they are positioned** (sitting up, standing at the foot of the bed).
- **The light**: where it comes from, or that there is none.
- **The viewpoint**: whose eyes, or from the side, so the important detail is clear.
- If the witness says they didn't see something, end with a line such as
  *Do not draw any creature or figure behind her.*

Keep it to what is in the account. If a detail would help the picture but the witness never said
it, leave it out rather than guess. That includes the time of day: don't say "at night" unless
they did.

### Examples (Report 008, Fran's Story)

The master. Beside "The second nightmare was different...":
```
Scene: A girl of about five or six floats in mid-air above her own bed in a small, dark box room. She is sitting upright with her legs straight out in front of her, as if sitting on an invisible floor. The bed beneath her is empty, the quilt rumpled. The room is very dark around her, only faint shapes of the bed and walls. Seen from the side, so the gap between her and the bed is clear.
```

Beside "In the first, I was running up a hill...":
```
Scene: Seen from behind, a girl of about five or six runs up a steep hill towards a road of houses at the top. Behind her there is nothing visible, only deeper, heavier hatching, as if something is there that cannot be seen. Do not draw any creature, figure or shadow shape behind her.
```

Beside "It was a small figure, no taller than an eight-year-old child...":
```
Scene: Viewed from just behind a girl's head as she lies in bed, looking down the bed towards an open bedroom door. At the foot of the bed stands a small figure, the height of an eight-year-old child, completely black like a shadow, with no features at all and nothing to show whether it is a boy or a girl, holding the bottom edge of the quilt. Do not give it eyes, a face, hair or clothing. Through the open door, a strange soft glow lights the landing as if a lamp had been switched on, and at the far end of the landing is a closed bathroom door.
```

## 7. Checking a result

- [ ] It matches the witness's words: right person, right position, nothing added to the story.
- [ ] One moment only.
- [ ] No face, no eyes, no glowing anything.
- [ ] The darkness thins out unevenly into white paper. No square edge, border or frame.
- [ ] No text, letters or signature anywhere in the picture.
- [ ] Sepia and brown-black only.
- [ ] It looks like it came from the same hand as `master.png`.

## 8. Clipped pairs: a sketch over the real photo

When the report has a real photo taken from where the moment happened (the swings they sat on,
the view from where they saw it), the sketch can be clipped over that photo instead of standing
alone. The reader sees the sketch first and can switch to the photo: the memory, then the place
as it is now. Report 003 has two; Report 002 has several, one of them a stack.

- **Only with a real photo of the same spot, from the same viewpoint.** Never an AI image, a map
  or a photo of somewhere nearby. The honesty rules above still apply in full.
- **The sketch copies the photo's layout** and draws the moment over it: same viewpoint, same
  fixed things (swing frame, fence, building), at the time of day the witness gave.
- **Draw the place as it was then.** The photo shows it now. Where the witness says something has
  changed since (Report 002: a second single bed, since got rid of; a kitchen island, since
  taken out), the scene block puts it back. Things added since (a flat-screen TV, aids for an
  older person) are left out by name. Only what the witness says was there goes back in.
- **Two moments in the same spot can share one photo** as a stack: both sketches over it, in the
  order they happened, and the switch names each one (Report 002's living room:
  Incident 1 / Incident 2 / Photo). Never more than two sketches.
- **One photo can carry two pairs** when two moments far apart in the report happened in the
  same room (Report 002's kitchen). Use it again rather than a photo of somewhere nearby.
- **It's a print, not a drawing on the page.** It sits where the photo would, under the photo's
  paperclip, with no ink fade-in, and it does carry a caption: "Ink sketch: " and then the memory
  it shows, in the report's own words. The photo keeps its own caption.
- **In ChatGPT:** attach `master.png` first, then the photo. Use the style block with a setting
  line for the place and swap the last line for
  `Portrait image, 3:4, the same shape as the attached photo.` (or `Landscape image, 4:3, ...`).
  After the scene block, end with
  *Match the style of the first attached image exactly; use the photo only for the layout.*
  Then check it against section 7, and that it matches the photo's layout.
- In the draft, a pair is one marker in place of the photo's:
  `[PAIR: SKETCH 1: the memory it shows | PHOTO 5: the photo's caption]`, and a stack names
  each sketch for the switch:
  `[PAIR: SKETCH 1 (Incident 1): ... | SKETCH 2 (Incident 2): ... | PHOTO 5: ...]`
  (`docs/DRAFT-FORMAT.md`).

## 9. The master

`master.png` was made in ChatGPT on 13 October 2026 from the first example above. (The edges
sentence in the style block was written after the first attempt came out too square.) Replace it
only on purpose: once it changes, older sketches stop matching new ones.
