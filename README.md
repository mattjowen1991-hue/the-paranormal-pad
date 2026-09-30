# The Paranormal Pad

*Echoes of the past.* First-hand accounts of the unexplained — Incident Reports and Incident Tapes, collected and retold by The Reporter. Built to replace the WordPress site at theparanormalpad.com.

## Structure

```
the-paranormal-pad/
├── index.html              # Entry point — loads all partials, data and scripts
├── css/
│   └── styles.css          # All styles (parchment case-file look, cassettes, phone layout)
├── js/
│   ├── data.js             # Every report & tape, the featured case, subject tags, comment settings  ← edit this
│   ├── email.js            # Sends the Contact form + new-comment alerts via Web3Forms
│   ├── comments.js         # "Witness statements" comments + the private moderation desk (#moderate)
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
    └── tapes/004/cover.jpg …             # Cassette cover, one folder per tape
```

Pages are switched with the address hash, so every page has its own link:
`#archive` (Featured Case), `#reports`, `#tapes`, `#reporter`, `#contact`, `#file-008` (a report), `#tape-002` (a tape).

## Adding a new report

1. **Write it** in `content/reports/009.html` as plain HTML: `<p>` paragraphs, `<h2>` for main sections (◆ divider), `<h3>` for sub-sections (red heading with a dashed line), `<h4>` for small bold-italic titles, `<figure><img …><figcaption>…</figcaption></figure>` for photos (they're shown as paper-clipped prints automatically).
   A YouTube video inside a report: `<div class="evidence" data-yt="VIDEO_ID"><span class="label">Video evidence</span><p>Caption</p><a href="https://www.youtube.com/watch?v=VIDEO_ID">Watch on YouTube ↗</a></div>`
2. **Add the pictures** to `images/reports/009/` (`cover.jpg` for the card, `01.jpg`, `02.jpg` … for the report itself).
3. **List it** at the top of `REPORTS` in `js/data.js`:

```js
{
  kind: 'report',
  no: '009',
  title: 'The Title',
  date: '2026-11-01',              // filed date, YYYY-MM-DD
  img: 'reports/009/cover.jpg',
  loc: 'Bromsgrove, UK',           // shown as "Origin"
  tags: ['Hauntings'],             // use names from SUBJECTS so the filters pick it up
  excerpt: 'First couple of sentences, shown on the card…'
},
```

The counts, the "Latest dispatch" bar, the stats and the archive order all update themselves.
To make it the **featured case**, change `FEATURED` in `js/data.js` (the report number plus the field statement, witness quote and details shown on the homepage).

## Adding a new tape

1. **Describe it** in `content/tapes/005.html` (copy one of the existing tape files — the first `evidence` block becomes the big video at the top; `data-start` / `data-end` are the seconds where your story starts and ends).
2. **Cover image**: save the video's thumbnail as `images/tapes/005/cover.jpg`
   (`https://i.ytimg.com/vi/VIDEO_ID/maxresdefault.jpg`).
3. **List it** in `TAPES` in `js/data.js`:

```js
{
  kind: 'tape',
  no: '005',
  title: 'The Title',
  date: '2026-11-01',
  img: 'tapes/005/cover.jpg',
  loc: 'Channel Name (YouTube)',
  tags: ['Hauntings'],
  excerpt: 'Report 00X: The Title, narrated by Channel Name.',
  url: 'https://www.youtube.com/watch?v=VIDEO_ID',
  narrator: 'Channel Name',
  dur: 1510,                        // running time in seconds (end − start)
  sides: [
    { side: 'A', report: '001', title: 'The Title', start: 315, end: 1825 }
  ]
},
```

- **Two stories in one video?** Add a second entry to `sides` (`side: 'B'`) and the cassette becomes double-sided with a Side A / Side B switch.
- **Tapes page order:** the tape with `pinned: true` (the Black Country radio interview) always sits at the top; the rest follow from the highest number down, so Tape 001 is always last.
- The cassette's play button plays the video inside the page, starting and stopping at your story. Where YouTube can't load, it opens YouTube instead.

## Comments ("Witness statements")

Every report and tape page ends with a **Witness statements** section. Readers leave a name and a statement; nothing appears until it's approved. Comments are stored in Google Firebase (free plan).

**Moderating:** type the secret word into the site's search box (or go to `/#moderate`), enter the PIN, then sign in with Google as `mattjowen1991@gmail.com`, then for each statement: **Approve** (optionally with a reply shown as "The Reporter replies"), or **Delete**. Approved ones can later have their reply changed, be hidden again, or deleted. The secret word and PIN are in the private repo **mattjowen1991-hue/the-paranormal-pad-notes** (only stored as hashes in this public code; they hide the desk, but the real protection is the Google sign-in). Only that one account can moderate — change `moderator` in `js/data.js` *and* the email in `firestore.rules` if that ever changes.

### One-time setup

1. Go to [console.firebase.google.com](https://console.firebase.google.com) → **Create a project** → name it `the-paranormal-pad` (Google Analytics: off).
2. **Build → Firestore Database → Create database** → *Standard edition*, location **europe-west2 (London)**, start in **production mode**.
3. In Firestore, open the **Rules** tab, replace everything with the contents of `firestore.rules`, and click **Publish**.
4. **Build → Authentication → Get started → Sign-in method → Google → Enable** (pick your email as the support email) → Save.
5. **Authentication → Settings → Authorized domains → Add domain:** `mattjowen1991-hue.github.io` (and later `theparanormalpad.com`).
6. **Project settings** (cog icon) **→ Your apps → Web (`</>`)** → nickname "The Paranormal Pad" (no Firebase Hosting) → **Register app**. Copy the `firebaseConfig` values into `js/data.js`:

```js
const COMMENTS = {
  firebase: {
    apiKey: '…',
    authDomain: 'the-paranormal-pad.firebaseapp.com',
    projectId: 'the-paranormal-pad',
    appId: '…'
  },
  moderator: 'mattjowen1991@gmail.com'
};
```

7. Bump the `?v=` numbers in `index.html`, commit and push. (These config values are meant to be public — the security rules are what protect the comments.)

Until step 6 is done, each page shows "The statements desk opens soon."

**Testing comments locally** (no Firebase account needed): run the Firebase emulator (`npx firebase-tools emulators:start --only firestore,auth --project demo-paranormal-pad`, needs Java 21), serve the site, and open `http://localhost:8080/?emulator=1#file-008`.

## Contact form & email alerts

The **Contact** page form emails each submission to The Reporter (reply goes straight to the sender; ticking "Keep my identity confidential" is flagged in the email). Every new witness statement also triggers an alert email with links to the report and the moderation desk. Both use [Web3Forms](https://web3forms.com) (free: 250 emails/month).

**Setup:** on web3forms.com enter `mattjowen1991@gmail.com` to get an access key by email, then paste it into `EMAIL.web3formsKey` in `js/data.js` (it's designed to be public). Set `commentAlerts: false` there to stop the comment emails. Until a key is added the form says it isn't connected yet.

## Local development

Open with a local server (partials and content use `fetch`, so they won't load from `file://`):

```bash
cd the-paranormal-pad
python3 -m http.server 8080
# then open http://localhost:8080
```

## After changing CSS or JavaScript

Bump the `?v=` number on the three links in `index.html` (`styles.css?v=3` → `?v=4`, same for `data.js` and `main.js`), so phones and browsers fetch the new files instead of an old saved copy. Partials and content files are always re-checked, so they don't need this.

## Publishing on GitHub Pages

1. Push the repo to GitHub.
2. **Settings → Pages → Build and deployment:** Source *Deploy from a branch*, branch `main`, folder `/ (root)`.
3. The site appears at `https://<username>.github.io/the-paranormal-pad/`.
4. **Custom domain (when ready to leave WordPress):** add `theparanormalpad.com` under Settings → Pages → Custom domain (this creates a `CNAME` file), then point the domain's DNS at GitHub Pages and turn on *Enforce HTTPS*.
