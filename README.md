# The Paranormal Pad

> **How to write and publish a report or tape, step by step** (including setting up the Claude Project): see **[PUBLISHING.md](PUBLISHING.md)**.
>
> **Looking after the site day to day** (contact form emails, approving comments, which services run what): see **[GUIDE.md](GUIDE.md)**.

**Live at https://theparanormalpad.com**

*Echoes of the past.* First-hand accounts of the unexplained — Incident Reports and Incident Tapes, collected and retold by The Reporter. Built to replace the WordPress site at theparanormalpad.com.

## Structure

```
the-paranormal-pad/
├── index.html              # Entry point — loads all partials, data and scripts
├── css/
│   └── styles.css          # All styles (parchment case-file look, cassettes, phone layout)
├── js/
│   ├── data.js             # Every report & tape, the featured case, subject tags, comment settings
│   ├── email.js            # Sends the Contact form + new-comment alerts via Web3Forms
│   ├── comments.js         # witness statements, contact-form copies ("Incident submissions") + the private moderation desk (#moderate)
│   └── main.js             # Partial + content loader, archive, search, report pages, cassette players
├── partials/
│   ├── header.html         # Title, search box, tab navigation
│   ├── archive.html        # Featured Case tab: latest dispatch, stats, featured case, archive list, sidebar
│   ├── file.html           # Report / tape page (filled in by main.js)
│   ├── tapes.html          # Incident Tapes tab (cassettes filled in by main.js)
│   ├── reporter.html       # The Reporter tab
│   ├── contact.html        # Submission form
│   ├── moderate.html       # Moderation desk (private page, not in the menu)
│   └── footer.html         # Footer
├── content/
│   ├── reports/001.html …  # Full text of each Incident Report
│   └── tapes/001.html …    # Description of each Incident Tape
├── firestore.rules         # Security rules for comments (pasted into Firebase)
├── firebase.json           # Firebase CLI settings (only needed for local testing)
└── images/
    ├── reporter.jpg
    ├── reports/008/cover.jpg, 01.png …   # Cover + in-report photos, one folder per report
    └── tapes/005/cover.jpg …             # Cassette cover, one folder per tape
```

Pages are switched with the address hash, so every page has its own link:
`#archive` (Featured Case), `#reports`, `#tapes`, `#reporter`, `#contact`, `#file-008` (a report), `#tape-002` (a tape).

## Adding reports and tapes (the publishing engine)

New reports and tapes go through the board, not by hand:

1. **Draft** in the claude.ai Project (setup: `claude-project/README.md`), tweak, say "final".
2. **File** it with the **New report** / **New tape** form (Issues -> New issue): paste the draft,
   drop in the pictures. It lands on the board (https://github.com/users/mattjowen1991-hue/projects/5).
3. Move the card to **Ready** and run **PROMPT: publish-report** / **publish-tape** in Claude Code.
4. Check the preview, then run **PROMPT: go-live**.

Under the hood, `tools/new_file.py DRAFT.md --media FOLDER` does the building: it writes
`content/reports/NNN.html`, resizes the pictures into `images/reports/NNN/`, adds the entry to
`js/data.js` (and `FEATURED` if asked) and makes the share page. The draft format is in
`docs/DRAFT-FORMAT.md`; the writing standard is `HOUSE-STYLE.md`. Try a draft safely with
`--dry-run`.

Other tools: `tools/board.py` (move cards), `tools/sync_prompts.py` (update the pinned prompt
cards from `docs/prompts/`), `tools/claude_project_kit.py` (refresh the Claude Project files),
`tools/share_pages.py` (rebuild share pages).

- **Two stories in one video?** Give the tape two `sides` lines - it becomes a double-sided
  cassette with a Side A / Side B switch.
- **Tapes page order:** the tape with `pinned: true` (the Black Country radio interview) always
  sits at the top; the rest follow from the highest number down.

## Comments ("Witness statements")

Every report and tape page ends with a **Witness statements** section. Readers leave a name and a statement; nothing appears until it's approved. Comments are stored in Google Firebase (free plan).

**Moderating:** type the secret word into the site's search box (or go to `/#moderate`), enter the PIN, then sign in with Google as `theparanormalpad@gmail.com`, then for each statement: **Approve** (optionally with a reply shown as "The Reporter replies"), or **Delete**. Approved ones can later have their reply changed, be hidden again, or deleted. The secret word and PIN are in the private repo **mattjowen1991-hue/the-paranormal-pad-notes** (only stored as hashes in this public code; they hide the desk, but the real protection is the Google sign-in). Only that one account can moderate — change `moderator` in `js/data.js` *and* the email in `firestore.rules` if that ever changes.

### One-time setup

1. Go to [console.firebase.google.com](https://console.firebase.google.com) → **Create a project** → name it `the-paranormal-pad` (Google Analytics: off).
2. **Build → Firestore Database → Create database** → *Standard edition*, location **europe-west2 (London)**, start in **production mode**.
3. In Firestore, open the **Rules** tab, replace everything with the contents of `firestore.rules`, and click **Publish**.
4. **Build → Authentication → Get started → Sign-in method → Google → Enable** (pick your email as the support email) → Save.
5. **Authentication → Settings → Authorized domains → Add domain:** `theparanormalpad.com`, `www.theparanormalpad.com` and `mattjowen1991-hue.github.io`.
6. **Project settings** (cog icon) **→ Your apps → Web (`</>`)** → nickname "The Paranormal Pad" (no Firebase Hosting) → **Register app**. Copy the `firebaseConfig` values into `js/data.js`:

```js
const COMMENTS = {
  firebase: {
    apiKey: '…',
    authDomain: 'the-paranormal-pad.firebaseapp.com',
    projectId: 'the-paranormal-pad',
    appId: '…'
  },
  moderator: 'theparanormalpad@gmail.com'
};
```

7. Bump the `?v=` numbers in `index.html`, commit and push. (These config values are meant to be public — the security rules are what protect the comments.)

Until step 6 is done, each page shows "The statements desk opens soon."

**Testing comments locally** (no Firebase account needed): run the Firebase emulator (`npx firebase-tools emulators:start --only firestore,auth --project demo-paranormal-pad`, needs Java 21), serve the site, and open `http://localhost:8080/?emulator=1#file-008`.

## Contact form & email alerts

The **Contact** page form saves each submission to the moderation desk (Incident submissions tab, moderator-only) and emails it to The Reporter (reply goes straight to the sender; ticking "Keep my identity confidential" is flagged in the email). Every new witness statement also triggers an alert email with links to the report and the moderation desk. Both use [Web3Forms](https://web3forms.com) (free: 250 emails/month).

**Setup:** on web3forms.com, signed in as `theparanormalpad@gmail.com` (the inbox submissions go to), create a form to get an access key by email, then paste it into `EMAIL.web3formsKey` in `js/data.js` (it's designed to be public). Set `commentAlerts: false` there to stop the comment emails. Until a key is added the form says it isn't connected yet.

## Share preview (WhatsApp, Facebook, etc.)

Every report and tape has a **Share** button. It shares a link like `theparanormalpad.com/reports/008/`: a small page (made by `tools/share_pages.py`) whose preview shows that report's title, opening lines and cover picture, and which opens the report straight away. Links copied from the address bar (`/#file-008`) show the general site preview instead.

When someone shares theparanormalpad.com itself, apps show the title, description and `images/share.jpg` (1200×630) set by the `og:` tags in `index.html`. To change the picture, edit `tools/share-card.html`, open it through the local server at 1200×630 and screenshot it over `images/share.jpg`. Apps cache previews, so a link that was already shared may keep its old card for a while; to refresh it on Facebook/WhatsApp, paste the address into [Facebook's Sharing Debugger](https://developers.facebook.com/tools/debug/) and click *Scrape Again*.

## Local development

Open with a local server (partials and content use `fetch`, so they won't load from `file://`):

```bash
cd the-paranormal-pad
python3 -m http.server 8080
# then open http://localhost:8080
```

## After changing CSS or JavaScript

Bump the `?v=` number on the three links in `index.html` (`styles.css?v=3` → `?v=4`, same for `data.js` and `main.js`), so phones and browsers fetch the new files instead of an old saved copy. Partials and content files are always re-checked, so they don't need this.

## Publishing (GitHub Pages + theparanormalpad.com)

Every push to `main` goes live automatically within a minute or two (Settings → Pages: deploy from branch `main`, folder `/ (root)`).

- **Domain:** `theparanormalpad.com` is registered with **WordPress.com** (auto-renews each October) — only the domain is used there now, not the WordPress site.
- **DNS** (WordPress.com → Domains → theparanormalpad.com → DNS records): four `A` records `185.199.108.153` / `109` / `110` / `111`, four `AAAA` records `2606:50c0:8000::153` … `8003::153`, and `www` → `CNAME mattjowen1991-hue.github.io`.
- **`CNAME` file** in this repo holds the domain — don't delete it. The old address `mattjowen1991-hue.github.io/the-paranormal-pad/` redirects to the domain.
- **Old WordPress links** (e.g. `/2026/09/28/incident-report-008-…/`, `/contact-us/`) are forwarded to the matching page by `404.html`. When a new report is added, nothing needs changing there.
