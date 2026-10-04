// ─── The Paranormal Pad: site data ─────────────────────────────────
// Every Incident Report and Incident Tape on the site is listed here.
// Each one's full text lives in content/reports/<no>.html or content/tapes/<no>.html.
// See README.md → "Adding a new report" / "Adding a new tape".

// Incident Reports (newest first)
const REPORTS = [
  {
    "kind": "report",
    "no": "008",
    "title": "Come and play with us",
    "date": "2026-09-28",
    "img": "reports/008/cover.jpg",
    "loc": "Smethwick, Birmingham",
    "tags": [
      "Hauntings",
      "Shadow People",
      "UAP"
    ],
    "excerpt": "This report comes from a family member. I remember how it all started quite clearly, even though it was a long time ago now. I was around 13 or 14 (at the time of writing, I’m 35), sitting in the living room…"
  },
  {
    "kind": "report",
    "no": "007",
    "title": "The Medford Shadow",
    "date": "2026-06-26",
    "img": "reports/007/cover.png",
    "loc": "Medford, Oregon",
    "tags": [
      "Hauntings",
      "Shadow People"
    ],
    "excerpt": "I recently had a fascinating conversation with a colleague of mine, Lou, about an intense haunting he endured. If you were to meet him, Lou is the last person you’d expect to entertain a ghost story, let alone…"
  },
  {
    "kind": "report",
    "no": "006",
    "title": "Letters on the Board",
    "date": "2026-04-27",
    "img": "reports/006/cover.jpg",
    "loc": "Family account, 1940s",
    "tags": [
      "Ouija Board"
    ],
    "excerpt": "Those of us drawn to the paranormal often find ourselves in the kind of deep, unusual conversations that rarely happen in everyday life. As someone who seems to attract these interactions more than most, I’m…"
  },
  {
    "kind": "report",
    "no": "005",
    "title": "The Call from Show Village",
    "date": "2026-01-08",
    "img": "reports/005/cover.jpg",
    "loc": "Show Village, South Africa",
    "tags": [
      "Dreams"
    ],
    "excerpt": "As regular readers know, my previous reports have detailed the unsettling and often frightening events here in the UK. However, I want to switch it up for the latest entry. My colleague Talita Klaass, who is…"
  },
  {
    "kind": "report",
    "no": "004",
    "title": "Whispers from the Sleepless Realm",
    "date": "2025-09-01",
    "img": "reports/004/cover.jpg",
    "loc": "Bromsgrove, UK",
    "tags": [
      "Sleep Paralysis"
    ],
    "excerpt": "I’ve dealt with sleep paralysis since my teens. By now, I’m familiar with the routine. The frozen body, the weight on my chest, the looming sense that I’m not alone. But there was one incident about two years…"
  },
  {
    "kind": "report",
    "no": "003",
    "title": "A Night That Time Stood Still",
    "date": "2025-08-01",
    "img": "reports/003/cover.jpg",
    "loc": "Barnsley Hall Hospital",
    "tags": [
      "Hauntings",
      "Shadow People"
    ],
    "excerpt": "This is one of the incidents I’m most hesitant to discuss openly when sharing my experiences, and truthfully, I’m not entirely sure why. Talking about what happened makes me feel deeply uneasy. But before we…"
  },
  {
    "kind": "report",
    "no": "002",
    "title": "Shadows of the Past",
    "date": "2025-07-19",
    "img": "reports/002/cover.jpg",
    "loc": "Bromsgrove, UK",
    "tags": [
      "Hauntings"
    ],
    "excerpt": "This report details a series of unsettling events that have taken place in my Nan’s house, located on a council estate just outside of Birmingham, UK. These events include both isolated experiences and those…"
  },
  {
    "kind": "report",
    "no": "001",
    "title": "The Stranger at the Door",
    "date": "2025-06-01",
    "img": "reports/001/cover.jpg",
    "loc": "Bromsgrove, UK",
    "tags": [
      "Hauntings",
      "Poltergeist"
    ],
    "excerpt": "Like many of us, I’ve had my share of spooky happenings, some stretching back to my childhood. However, in this post, I want to focus on a series of events that took place in my current home – a series that…"
  }
];

// Incident Tapes (newest first). Fields:
//   narrator  – channel that narrated it (shown on the cassette label)
//   sides     – one entry per story on the tape: start/end are seconds into the YouTube video.
//               Two entries = a double-sided cassette with a Side A / Side B switch.
//   dur       – running time in seconds (shown on the tape page)
//   pinned    – always shown first on the Tapes page
const TAPES = [
  {
    "kind": "tape",
    "no": "006",
    "title": "Our Haunted House Interview (The Stranger at the Door case)",
    "date": "2026-06-14",
    "img": "tapes/006/cover.jpg",
    "loc": "Black Country Extra radio",
    "tags": [
      "Hauntings"
    ],
    "excerpt": "Myself and my partner spoke with Ian Hideous from Black Country Extra radio station for an interview regarding the high strangeness that happened in our home, which is fully documented in Report 001: The…",
    "url": "https://theparanormalpad.wordpress.com/2026/06/14/incident-tape-002-radio-interview-the-stranger-at-the-door-case/",
    "dur": 1805,
    "pinned": true
  },
  {
    "kind": "tape",
    "no": "005",
    "title": "The Medford Shadow & The Stranger at the Door",
    "date": "2026-10-03",
    "img": "tapes/005/cover.jpg",
    "loc": "Chillers & Thrillers (Spotify)",
    "tags": [
      "Hauntings",
      "Shadow People",
      "Poltergeist"
    ],
    "excerpt": "Two of my Incident Reports were narrated by M on Chillers and Thrillers: A Paranormal Podcast, a podcast that recounts true stories of people's encounters with the strange and unexplained. Both feature in…",
    "url": "https://open.spotify.com/episode/18DXC8ddQYqAgYRS3wrKIK",
    "narrator": "Chillers & Thrillers",
    "dur": 2217,
    "sides": [
      {
        "side": "A",
        "report": "007",
        "title": "The Medford Shadow",
        "start": 1396,
        "end": 2250
      },
      {
        "side": "B",
        "report": "001",
        "title": "The Stranger at the Door",
        "start": 32,
        "end": 1395
      }
    ]
  },
  {
    "kind": "tape",
    "no": "004",
    "title": "A Night That Time Stood Still",
    "date": "2024-10-10",
    "img": "tapes/004/cover.jpg",
    "loc": "Barnsley Hall, Bromsgrove",
    "tags": [
      "Hauntings",
      "Shadow People"
    ],
    "excerpt": "In October 2024, my friend J and I went back to Barnsley Hall, the site of the old asylum on the edge of Bromsgrove, to retrace our steps from the night in Incident Report 003: A Night That Time Stood Still …",
    "url": "https://www.youtube.com/watch?v=n8cJw0xJxRk",
    "narrator": "The Reporter & J",
    "dur": 548,
    "sides": [
      {
        "side": "A",
        "report": "003",
        "title": "A Night That Time Stood Still",
        "start": 0,
        "end": 548
      }
    ]
  },
  {
    "kind": "tape",
    "no": "003",
    "title": "Letters on the Board",
    "date": "2026-05-22",
    "img": "tapes/003/cover.jpg",
    "loc": "Midnight Narrative (YouTube)",
    "tags": [
      "Ouija Board"
    ],
    "excerpt": "Report 006: Letters on the Board, narrated by Midnight Narrative Horror in Episode 5, “Time and Shadows”.",
    "url": "https://www.youtube.com/watch?v=BxVILuS9Q-U",
    "narrator": "Midnight Narrative",
    "dur": 602,
    "sides": [
      {
        "side": "A",
        "report": "006",
        "title": "Letters on the Board",
        "start": 571,
        "end": 1173
      }
    ]
  },
  {
    "kind": "tape",
    "no": "002",
    "title": "Shadows of the Past & The Stranger at the Door",
    "date": "2024-11-09",
    "img": "tapes/002/cover.jpg",
    "loc": "Paranormal M (YouTube)",
    "tags": [
      "Hauntings",
      "Poltergeist"
    ],
    "excerpt": "Two of my Incident Reports, narrated by Paranormal M: Shadows of the Past on Side A and The Stranger at the Door on Side B.",
    "url": "https://www.youtube.com/watch?v=wJeulx5gq20",
    "narrator": "Paranormal M",
    "dur": 3448,
    "sides": [
      {
        "side": "A",
        "report": "002",
        "title": "Shadows of the Past",
        "start": 1775,
        "end": 3470
      },
      {
        "side": "B",
        "report": "001",
        "title": "The Stranger at the Door",
        "start": 22,
        "end": 1775
      }
    ]
  },
  {
    "kind": "tape",
    "no": "001",
    "title": "The Stranger at the Door",
    "date": "2024-10-16",
    "img": "tapes/001/cover.jpg",
    "loc": "Mortis Media (YouTube)",
    "tags": [
      "Hauntings",
      "Poltergeist"
    ],
    "excerpt": "Report 001: The Stranger at the Door, narrated by Mortis Media in 10 True Disturbing Haunted House Scary Stories.",
    "url": "https://www.youtube.com/watch?v=eSIEyrPE0qY",
    "narrator": "Mortis Media",
    "dur": 1510,
    "sides": [
      {
        "side": "A",
        "report": "001",
        "title": "The Stranger at the Door",
        "start": 315,
        "end": 1825
      }
    ]
  }
];

const FILES = [...REPORTS, ...TAPES];

// The case shown at the top of the homepage ("Featured Case")
const FEATURED = {
  "no": "008",
  "where": "Astbury Avenue, Smethwick, Birmingham",
  "identity": "Witness identity: withheld",
  "stamp": "Told by a sceptic",
  "statement": "Fran explained that when she was a little girl, she would often hear children playing on the landing outside her door after she’d gone to bed. On one occasion, one of the children came into her bedroom and asked her to come out and play.",
  "quote": "“Come on,” it said. “Come with me and come and play with us downstairs.”",
  "witness": "“Fran” (anonymised)",
  "place": "Smethwick, B’ham",
  "status": "Unexplained"
};

// Comments ("Witness statements") under every report and tape.
// Paste the firebaseConfig from Firebase → Project settings → Your apps here (README → Comments).
// Until it's filled in, each page shows "The statements desk opens soon."
const COMMENTS = {
  firebase: {
    apiKey: 'AIzaSyA9IRJhDKlUocfQQlEn9qVbZMYkmYH8oUM',
    authDomain: 'the-paranormal-pad.firebaseapp.com',
    projectId: 'the-paranormal-pad',
    storageBucket: 'the-paranormal-pad.firebasestorage.app',
    messagingSenderId: '299735710392',
    appId: '1:299735710392:web:dfa9ed37772cc0201cd24d'
  },
  moderator: 'theparanormalpad@gmail.com'   // the only Google account that can approve comments at #moderate
};

// Email via Web3Forms (https://web3forms.com): the Contact form, plus an alert
// email whenever someone files a witness statement. Paste the access key here.
const EMAIL = {
  web3formsKey: 'e5cfcd35-cd5e-45eb-9b29-d91e63bbea5b',   // sends to theparanormalpad@gmail.com
  commentAlerts: true   // set to false to stop the "new witness statement" emails
};

// Subject filter buttons, in order
const SUBJECTS = ['Hauntings', 'Shadow People', 'Poltergeist', 'Sleep Paralysis', 'Dreams', 'Ouija Board', 'UAP'];
