# The Claude Project for drafting reports

A **Project** on claude.ai that knows Matt's voice, the house style and the draft format, so
every new Incident Report (or tape page) starts from a draft that already sounds right and can
be built straight onto the site.

## One-time setup (about 5 minutes)

1. On **claude.ai**, go to **Projects -> Create project**. Name it *The Paranormal Pad - Reports*.
2. Open **Set project instructions** (or "Instructions") and paste in the whole of
   [`INSTRUCTIONS.md`](INSTRUCTIONS.md).
3. Under **Project knowledge**, upload the five files in [`knowledge/`](knowledge/):
   `01-house-style.md`, `02-draft-format.md`, `03-site-facts.md`, `04-example-reports.md`,
   `05-example-tapes.md`.

## Keeping it current

After each new report or tape goes live, **PROMPT: go-live** runs
`python3 tools/claude_project_kit.py`, which rebuilds `knowledge/` from the site and tells you
which files changed. Delete the old copies of those in the Project and upload the new ones
(usually `03-site-facts.md` and `04-example-reports.md`). If `HOUSE-STYLE.md` or
`docs/DRAFT-FORMAT.md` change, re-upload those too, and re-paste `INSTRUCTIONS.md` if it changes.

## Writing a report, start to finish

1. **Start a chat in the Project.** Paste everything you have: interview notes, a voice-memo
   transcript, the witness's messages, your own memories, photos you plan to use (describe them).
2. **Answer its questions.** It asks only what it needs (names/anonymity, where/when, pictures).
3. **Read the draft and tweak.** Either ask for changes ("make the introduction shorter", "Fran
   says it was the landing, not the stairs"), or copy the draft into Notes / Google Docs / any
   editor, change it yourself, and paste it back with "here's my version - check it". Your edits
   always win. Anything it isn't sure of is marked `[CHECK: ...]` - answer those.
4. **Say "final".** You get the clean draft, the picture checklist (`cover.jpg`, `1.jpg`, ...)
   and a cover-image prompt if you want one.
5. **Get the pictures ready.** Your photos, Google Maps screenshots, AI recreations - named to
   match the checklist. Videos go on YouTube (unlisted is fine) and the link goes in the draft.
6. **File it on the board.** Open the **New report** form
   (https://github.com/mattjowen1991-hue/the-paranormal-pad/issues/new?template=new-report.yml),
   paste the draft, drop in the pictures, submit. It appears on the board; drag it to **Ready**.
   (You can still tweak the text on the card itself before it's built.)
7. **Build it.** In Claude Code (started in `~/projects/the-paranormal-pad`) run
   **PROMPT: publish-report** with the card number. It builds it on a branch, shows you a local
   preview and moves the card to **Review**.
8. **Publish.** Happy with the preview? Run **PROMPT: go-live**. It's on the site, the card
   moves to **Live**, and you get the share link for WhatsApp.

## Tapes

Usually skip the Project: fill in the **New tape** form (YouTube link, which story, start and
end times, how permission was given), move it to **Ready**, run **PROMPT: publish-tape**.
