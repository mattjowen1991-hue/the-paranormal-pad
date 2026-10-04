# How to publish on The Paranormal Pad

Everything you need to write, build and publish Incident Reports and Tapes, step by step.
(Approving comments and the contact form are in [GUIDE.md](GUIDE.md).)

**The short version:**
**Write** in the Claude Project → **file** it with the New report form → **build** it with
`publish-report` in Claude Code → **check** the preview → **publish** it with `go-live` →
**close** it with `close-report` (keeps the Claude Project up to date).

| You'll use | Where |
|---|---|
| The Claude Project (writing) | claude.ai → Projects → *The Paranormal Pad - Reports* |
| The board | https://github.com/users/mattjowen1991-hue/projects/5 |
| New report form | https://github.com/mattjowen1991-hue/the-paranormal-pad/issues/new?template=new-report.yml |
| New tape form | https://github.com/mattjowen1991-hue/the-paranormal-pad/issues/new?template=new-tape.yml |
| Claude Code | Terminal: `cd ~/projects/the-paranormal-pad && claude` |

---

## Part 1 - One-time setup: the Claude Project

Do this once. It takes about 5 minutes.

**Step 1 - Get the files ready.**
They're in `claude-project/` in this repo (on your Mac: `~/projects/the-paranormal-pad/claude-project`).
If you're on another computer, download them from GitHub: open each file below and use the
**Download raw file** button (top right of the file view).
- `claude-project/INSTRUCTIONS.md`
- `claude-project/knowledge/01-house-style.md`
- `claude-project/knowledge/02-draft-format.md`
- `claude-project/knowledge/03-site-facts.md`
- `claude-project/knowledge/04-example-reports.md`
- `claude-project/knowledge/05-example-tapes.md`

**Step 2 - Create the Project.**
1. Go to **claude.ai** and sign in.
2. In the left sidebar, click **Projects**.
3. Click **+ New project** (top right).
4. Name: `The Paranormal Pad - Reports`.
   Description: `Drafting Incident Reports and Tapes for theparanormalpad.com`.
5. Click **Create project**.

**Step 3 - Add the instructions.**
1. Inside the project, find **Instructions** in the panel on the right and click **Set project
   instructions** (or the pencil / **Edit** button).
2. Open `INSTRUCTIONS.md` on GitHub, click **Copy raw file** (the copy icon, top right of the file),
   paste it all into the box, and click **Save instructions**.

**Step 4 - Add the knowledge files.**
1. In the same right-hand panel, find **Files** / **Project knowledge** and click **+**.
2. Choose **Upload from device**.
3. Select the five files from `claude-project/knowledge/` (you can select them all at once) and upload.
4. Check all five appear in the list.

**Step 5 - Test it.**
Start a new chat in the project and type:
> What are the main rules of my house style, and what's the next report number?

It should answer with the house style points (first person, British, no em dashes, My Thoughts
ending with a question...) and the next free number. If it doesn't, check the five files uploaded.

**Keeping it up to date:** after each report or tape goes live, run **PROMPT: close-report**
(Part 5). It works out which files your Project is missing, opens just those in Finder, and walks
you through swapping them. You only do the drag-and-drop; it records when you're done.

---

## Part 2 - Writing a report (in the Claude Project)

1. **Start a new chat** in the project (one chat per report keeps things tidy).
2. **Paste everything you have**: interview notes, a voice-memo transcript, the witness's
   messages, your own memories, a rough draft. Say what pictures you have or want.
3. **Answer its questions.** It asks only what it needs: names or pseudonyms, where and when,
   what you've already checked, pictures.
4. **Read the draft.** Anything it couldn't be sure of is marked `[CHECK: ...]`. Answer those.
5. **Tweak it** until you're happy, either way:
   - ask for changes ("shorten the introduction", "she says it was the landing, not the stairs"), or
   - copy the draft into Notes / Google Docs / any editor, change it yourself, paste it back and
     say *"here's my version, check it"*. Your edits always win.
6. **Say "final".** You get:
   - the clean draft in one block (starts and ends with `---` lines at the top),
   - the **picture list**: `cover.jpg`, `1.jpg`, `2.jpg` ... with what each should show and its caption,
   - a **cover image prompt** in your cover style if you ask for one.
7. **Get the pictures ready** and name them to match the list (`cover.jpg`, `1.jpg`, `2.jpg` ...).
   Photos, Google Maps screenshots, old maps or AI recreations all work, any size.
   **Videos:** upload to YouTube (unlisted is fine) and make sure the link is in the draft as
   `[VIDEO: link | caption]`.

## Part 3 - Filing it on the board

1. Open the **New report** form (link at the top of this page, or on GitHub: **Issues → New issue → New report**).
2. **Title:** `Report: ` then the title, e.g. `Report: The Box Room`.
3. **Draft:** paste the whole final draft.
4. **Pictures:** drag all the pictures in (cover first, then 1, 2, 3...). Wait for each to finish uploading.
5. **Featured Case:** choose Yes if it should lead the homepage.
6. Click **Submit new issue**. It appears on the board. Note its number (e.g. **#12**).
7. On the board, drag the card to **Ready**.

You can still edit the draft on the card (the **...** menu on the issue → **Edit**) until it's built.

## Part 4 - Building it (Claude Code)

1. Open Terminal and start Claude Code in the site's folder:
   `cd ~/projects/the-paranormal-pad && claude`
2. On the board, open the pinned card **PROMPT: publish-report**, copy the block, paste it into
   Claude Code and change `ISSUE_NUMBER` to your card's number (e.g. `12`).
3. Claude will:
   - download the draft and pictures and show you how it matched them (**check this**),
   - fix only small things (typos, dashes) and list any questions,
   - build it on a separate branch, so nothing is live yet,
   - give you a **preview link** (`http://localhost:8080/#file-009`) and move the card to **Review**.
4. **Check the preview** on your Mac. For the phone view, make the browser window narrow.
   Want changes? Ask in the same Claude Code chat; it updates the preview.

## Part 5 - Going live

1. When you're happy, copy the pinned **PROMPT: go-live** card into the same Claude Code chat,
   with the card number.
2. Claude publishes it, waits for the site to update, checks the live page and the WhatsApp
   preview, closes the card and moves it to **Live**.
3. You get the **share link** (e.g. `https://theparanormalpad.com/reports/009/`). That's the one
   to post on WhatsApp and social media, because it shows the report's own picture and title.
4. **Close it off:** copy the pinned **PROMPT: close-report** card into the same chat, with the
   card number. It refreshes the Claude Project files, opens the ones your Project needs in
   Finder, and tells you exactly what to remove and upload on claude.ai. Reply "uploaded" when
   done and it records it. (Skipped it last time? It catches everything that's out of date.)

---

## Adding a tape

Usually you don't need the Claude Project for tapes.
1. Open the **New tape** form: paste the YouTube or Spotify episode link, write which of your stories it is and
   where it starts and ends (one line per story; two lines make a double-sided cassette), and
   say how the narrator gave permission. Submit.
2. Drag the card to **Ready**.
3. In Claude Code, run **PROMPT: publish-tape** with the card number. It fetches the video's
   details, writes the tape page, builds the cassette and gives you a preview where you can press Play.
4. Happy? Run **PROMPT: go-live**, then **PROMPT: close-report**.

## Changing the website

- Something small: **Issues → New issue → Site change**, describe it, submit.
- Something bigger: run **PROMPT: create-ticket** in Claude Code and describe it. Claude
  scopes it properly and adds it to the board.
- To do the work: **PROMPT: open-ticket** (builds it, preview, Review), then
  **PROMPT: close-ticket** once you've checked it (publishes, tidies up, moves to Live).

## Every month or two

Run **PROMPT: site-health-check** in Claude Code. It checks every page, video, share link,
the certificate and the domain, and offers tickets for anything wrong.

---

## If something goes wrong

- **"DRAFT PROBLEM: ..."** when building: the draft isn't quite in the right shape (a missing
  header line, a `[PHOTO 3]` with no picture 3, a leftover `[CHECK]`). Claude will usually fix it
  and tell you; if not, fix the card and run publish-report again.
- **Pictures matched to the wrong places:** tell Claude which picture should be which. Naming
  them `cover`, `1`, `2`... before uploading avoids this.
- **The preview link doesn't open:** it only works while that Claude Code chat is running. Ask
  Claude to start the preview again.
- **The new report doesn't show on your phone:** refresh. If it still doesn't, close the tab and open it again.
- **Claude seems not to know the project rules:** you probably started it from your home folder.
  Quit and start it with `cd ~/projects/the-paranormal-pad && claude`.

## Where everything lives

| Thing | Where |
|---|---|
| This guide | `PUBLISHING.md` |
| Day-to-day running (comments, contact form) | `GUIDE.md` |
| Writing style | `HOUSE-STYLE.md` |
| Draft format | `docs/DRAFT-FORMAT.md` |
| The prompts | pinned on the board, and in `docs/prompts/` |
| Claude Project files | `claude-project/` |
| Secret word and PIN for the moderation desk | private repo `the-paranormal-pad-notes` |
