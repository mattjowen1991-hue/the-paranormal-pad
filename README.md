# The Paranormal Pad

*Echoes of the past.* First-hand accounts of the unexplained — Incident Reports and Incident Tapes, collected and retold by The Reporter. Built to replace the WordPress site at theparanormalpad.com.

## Structure

```
the-paranormal-pad/
├── index.html              # Entry point — loads all partials, data and scripts
├── css/
│   └── styles.css          # All styles (parchment case-file look, cassettes, phone layout)
├── js/
│   ├── data.js             # Every report & tape, the featured case, subject tags  ← edit this
│   └── main.js             # Partial + content loader, archive, search, report pages, cassette players
├── partials/
│   ├── header.html         # Title, search box, tab navigation
│   ├── archive.html        # Featured Case tab: latest dispatch, stats, featured case, archive list, sidebar
│   ├── file.html           # Report / tape page (filled in by main.js)
│   ├── tapes.html          # Incident Tapes tab (cassettes filled in by main.js)
│   ├── reporter.html       # The Reporter tab
│   ├── contact.html        # Submission form
│   └── footer.html         # Footer
├── content/
│   ├── reports/001.html …  # Full text of each Incident Report
│   └── tapes/001.html …    # Description of each Incident Tape
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

## Local development

Open with a local server (partials and content use `fetch`, so they won't load from `file://`):

```bash
cd the-paranormal-pad
python3 -m http.server 8080
# then open http://localhost:8080
```

## Publishing on GitHub Pages

1. Push the repo to GitHub.
2. **Settings → Pages → Build and deployment:** Source *Deploy from a branch*, branch `main`, folder `/ (root)`.
3. The site appears at `https://<username>.github.io/the-paranormal-pad/`.
4. **Custom domain (when ready to leave WordPress):** add `theparanormalpad.com` under Settings → Pages → Custom domain (this creates a `CNAME` file), then point the domain's DNS at GitHub Pages and turn on *Enforce HTTPS*.

## Still to do

- **Contact form:** it doesn't send anywhere yet. A form service such as Formspree can be connected by pointing the form at its endpoint (see `partials/contact.html` and the submit handler in `js/main.js`).
- **Comments:** several reports end with "let me know in the comments" — there's no comment section yet.
