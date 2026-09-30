// ─── The Paranormal Pad ──────────────────────────────────────────
// Loads the page sections (partials/) and every report/tape's text (content/),
// then starts the site: archive, search and filters, report pages, cassette players.
// Data lives in js/data.js.

// ─── Load HTML partials ───────────────────────────────────────────
// Each placeholder <div id="partial-…"> is swapped for the matching file in partials/.
async function loadPartial(id, file) {
  const el = document.getElementById(id);
  if (!el) return;
  try {
    const res = await fetch(`partials/${file}`, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`Failed to load ${file}`);
    const tpl = document.createElement('template');
    tpl.innerHTML = await res.text();
    el.replaceWith(tpl.content);
  } catch (e) {
    console.error(e);
  }
}

async function loadAllPartials() {
  await Promise.all([
    loadPartial('partial-header',   'header.html'),
    loadPartial('partial-archive',  'archive.html'),
    loadPartial('partial-file',     'file.html'),
    loadPartial('partial-tapes',    'tapes.html'),
    loadPartial('partial-reporter', 'reporter.html'),
    loadPartial('partial-contact',  'contact.html'),
    loadPartial('partial-moderate', 'moderate.html'),
    loadPartial('partial-footer',   'footer.html'),
  ]);
}

// ─── Load report & tape text ──────────────────────────────────────
// Full text of every report and tape, keyed r008, t002 …
const CONTENT = {};
let TEXT = {};
const keyOf = f => (f.kind === 'tape' ? 't' : 'r') + f.no;
const contentPath = f => `content/${f.kind === 'tape' ? 'tapes' : 'reports'}/${f.no}.html`;

async function loadContent() {
  await Promise.all(FILES.map(async f => {
    try {
      const res = await fetch(contentPath(f), { cache: 'no-cache' });
      CONTENT[keyOf(f)] = res.ok ? await res.text() : '';
    } catch (e) {
      console.error(e);
      CONTENT[keyOf(f)] = '';
    }
  }));
}

Promise.all([loadAllPartials(), loadContent()]).then(startApp);

// ─── The site ─────────────────────────────────────────────────────
function startApp() {
  TEXT = Object.fromEntries(Object.entries(CONTENT).map(([k, v]) => [k, v.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()]));

  const state = { kind: 'all', tag: null, q: '', sort: 'new', page: 1 };
  const phoneQuery = matchMedia('(max-width: 700px)');
  const perPage = () => phoneQuery.matches ? Infinity : 4;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = iso => new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase();
  const label = f => (f.kind === 'tape' ? 'Incident Tape ' : 'Incident Report ') + f.no;
  const href = f => (f.kind === 'tape' ? '#tape-' : '#file-') + f.no;
  const ext = () => '';


  // subject tag buttons
  const tagBox = $('#tags');
  SUBJECTS.forEach(t => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = '[•] ' + t; b.dataset.tag = t; b.setAttribute('aria-pressed', 'false');
    tagBox.appendChild(b);
  });

  function card(f) {
    if (f.kind === 'tape') return cassetteHTML(f);
    const isTape = false;
    return `<article class="card">
      <div class="paperclip"></div>
      <div class="top"><span class="code">${label(f)}</span><span class="stamp small ${isTape ? 'sepia' : 'red'}">${isTape ? 'Tape' : 'Report'}</span></div>
      <h3><a href="${esc(href(f))}"${ext(f)}>${esc(f.title)}</a></h3>
      <div class="meta">Filed ${fmt(f.date)} • ${esc(f.loc)}</div>
      <a class="photo" href="${esc(href(f))}"${ext(f)} tabindex="-1"><img class="sepia-photo" src="images/${f.img}" alt="" loading="lazy"></a>
      <p>${esc(f.excerpt)}</p>
      <div class="foot"><a class="btn dark" href="${esc(href(f))}"${ext(f)}>${isTape ? 'Listen to tape' : 'Read report'} ${f.no}</a><small>${esc(f.tags[0] || (isTape ? 'Audio' : 'First-hand'))}</small></div>
    </article>`;
  }

  function renderGrid() {
    const q = state.q.trim().toLowerCase();
    let list = FILES.filter(f =>
      (state.kind === 'all' || f.kind === state.kind) &&
      (!state.tag || f.tags.includes(state.tag)) &&
      (!q || [f.title, f.loc, label(f), f.tags.join(' '), TEXT[keyOf(f)] || f.excerpt].join(' ').toLowerCase().includes(q)));
    list.sort((a, b) => state.sort === 'new' ? b.date.localeCompare(a.date) || b.kind.localeCompare(a.kind) : a.date.localeCompare(b.date) || a.kind.localeCompare(b.kind));
    // Unfiltered "All files": lead with the two newest reports, then the top two tapes
    // (same order as the Tapes page), then everything else by date.
    if (state.kind === 'all' && !state.tag && !q && state.sort === 'new') {
      const lead = [
        ...list.filter(f => f.kind === 'report').slice(0, 2),
        ...list.filter(f => f.kind === 'tape').sort(tapeOrder).slice(0, 2)
      ];
      list = [...lead, ...list.filter(f => !lead.includes(f))];
    }
    const size = perPage();
    const pages = Math.max(1, Math.ceil(list.length / size));
    state.page = Math.min(Math.max(1, state.page), pages);
    const start = size === Infinity ? 0 : (state.page - 1) * size;
    const shown = size === Infinity ? list : list.slice(start, start + size);
    $('#grid').innerHTML = list.length ? shown.map(card).join('') : `<div class="empty">No files match. Try another search or clear the filters.</div>`;
    pruneDecks();
    $('#grid').querySelectorAll('.deck').forEach(initDeck);
    const total = FILES.filter(f => state.kind === 'all' || f.kind === state.kind).length;
    $('#count').textContent = pages > 1
      ? `Showing ${start + 1}–${start + shown.length} of ${list.length}`
      : `Showing ${list.length} of ${total}`;
    renderPager(pages);
    document.querySelectorAll('.seg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.kind === state.kind)));
    document.querySelectorAll('#tags button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tag === state.tag)));
  }

  const pad = n => String(n).padStart(2, '0');
  function renderPager(pages) {
    const pager = $('#pager');
    pager.hidden = pages <= 1;
    if (pages <= 1) { pager.innerHTML = ''; return; }
    const nums = Array.from({ length: pages }, (_, i) => i + 1)
      .map(n => `<button type="button" data-page="${n}"${n === state.page ? ' aria-current="page"' : ''}>${pad(n)}</button>`).join('');
    pager.innerHTML = `<span class="where-am-i">Archive ledger page <b>${pad(state.page)}</b> of ${pad(pages)}</span>
      <div class="pages">
        <button type="button" data-page="${state.page - 1}"${state.page === 1 ? ' disabled' : ''}>← Prev folio</button>
        ${nums}
        <button type="button" data-page="${state.page + 1}"${state.page === pages ? ' disabled' : ''}>Next folio →</button>
      </div>`;
  }
  $('#pager').addEventListener('click', e => {
    const b = e.target.closest('button[data-page]'); if (!b || b.disabled) return;
    state.page = Number(b.dataset.page); renderGrid();
    $('#files').scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });
  phoneQuery.addEventListener('change', () => renderGrid());

  document.querySelectorAll('.seg button').forEach(b => b.addEventListener('click', () => { state.kind = b.dataset.kind; state.page = 1; renderGrid(); }));
  tagBox.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    state.tag = state.tag === b.dataset.tag ? null : b.dataset.tag; state.page = 1; renderGrid();
  });
  $('#sort').addEventListener('change', e => { state.sort = e.target.value; state.page = 1; renderGrid(); });
  // Set when typing opened the results over another page, so clearing the box can go back.
  let searchOpened = false;
  $('#q').addEventListener('input', e => {
    // Secret word typed into the search box opens the moderation desk (see the private notes repo).
    const typed = e.target.value;
    if (typed.trim().length >= 4) Statements.isSecretWord(typed).then(ok => {
      if (!ok || $('#q').value !== typed) return;
      $('#q').value = ''; $('#q').blur();
      state.q = '';
      location.hash = 'moderate';
    });
    state.q = e.target.value;
    state.page = 1;
    if (!state.q.trim()) {
      if (searchOpened) route(); else renderGrid();
      return;
    }
    // Switch to the results in place: no hash change and no scroll on phones,
    // so the search box keeps focus and the keyboard stays open.
    const phone = matchMedia('(max-width: 700px)').matches;
    const fromOtherView = current !== 'archive';
    if (fromOtherView || (phone && document.body.dataset.page === 'archive')) {
      show('archive', 'reports', 'files');
      searchOpened = true;
    } else renderGrid();
    if (fromOtherView && !phone) $('#files').scrollIntoView({ block: 'start' });
  });

  // tapes page: reel-to-reel decks driven by the tape's YouTube video
  const ytIdOf = f => (CONTENT[keyOf(f)] || '').match(/data-yt="([\w-]{11})"/)?.[1];
  const clock = sec => { sec = Math.max(0, Math.floor(sec || 0)); const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s2 = String(sec % 60).padStart(2, '0'); return h ? `${h}:${String(m).padStart(2, '0')}:${s2}` : `${String(m).padStart(2, '0')}:${s2}`; };

  // Order: pinned tape first (the radio interview), then newest number down, so Tape 001 is always last.
  const tapeOrder = (a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.no.localeCompare(a.no);
  function cassetteHTML(f) {
    const yt = ytIdOf(f), first = f.sides?.[0];
    const start = first ? first.start : 0;
    return `
    <article class="deck cassette${f.sides?.length > 1 ? ' two-sided' : ''}" data-no="${f.no}" data-yt="${yt || ''}">
      <div class="cassette-label">
        <div class="side"><span class="side-name">Side ${first ? first.side : 'A'} • Incident Tape ${f.no}</span>${f.sides?.length > 1
          ? `<div class="sides" role="group" aria-label="Choose a side">${f.sides.map((sd, i) =>
              `<button type="button" data-side="${i}" aria-pressed="${i === 0}">Side ${sd.side}</button>`).join('')}</div>`
          : ''}</div>
        <div class="label-lines">
        <h2>${esc(first ? first.title : f.title)}</h2>
        ${f.narrator ? `<div class="narrator">Narrated by ${esc(f.narrator)}</div>` : ''}
        ${f.sides?.length > 1 ? `<button type="button" class="flip-hint">⇄ Flip to Side ${f.sides[1].side}: <span>${esc(f.sides[1].title)}</span></button>` : ''}
        </div>
        <div class="cassette-window">
          <div class="spool left" style="--fill:.95"><div class="reel"></div></div>
          <div class="counter">${clock(start)}</div>
          <div class="spool right" style="--fill:.52"><div class="reel"></div></div>
        </div>
      </div>
      <div class="screen">
        <img class="sepia-photo" src="images/${f.img}" alt="">
      </div>
      <div class="cassette-head">
        <a class="btn blood play" href="https://www.youtube.com/watch?v=${yt}${start ? `&t=${start}s` : ''}" target="_blank" rel="noopener">▶ Play tape</a>
        <a class="btn light" href="${href(f)}">Open tape file</a>
      </div>
    </article>`;
  }
  $('#decks').innerHTML = FILES.filter(f => f.kind === 'tape').sort(tapeOrder).map(cassetteHTML).join('');

  // Can this page reach YouTube? (Blocked in the private preview.) Probe with a thumbnail.
  const ytReachable = new Promise(res => {
    const probe = new Image();
    probe.onload = () => res(probe.naturalWidth > 0);
    probe.onerror = () => res(false);
    probe.src = 'https://i.ytimg.com/vi/' + (FILES.map(ytIdOf).find(Boolean) || '') + '/default.jpg';
    setTimeout(() => res(false), 5000);
  });
  let ytOk = null;
  ytReachable.then(v => { ytOk = v; });
  let ytApi = null;
  function loadYouTubeApi() {
    if (ytApi) return ytApi;
    ytApi = new Promise((res, rej) => {
      if (window.YT?.Player) return res(window.YT);
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { prev?.(); res(window.YT); };
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.onerror = rej;
      document.head.appendChild(tag);
    });
    return ytApi;
  }

  const decks = [];
  function initDeck(d) {
    const id = d.dataset.yt;
    const btn = d.querySelector('.play');
    const counter = d.querySelector('.counter'), photo = d.querySelector('.screen');
    const spools = d.querySelectorAll('.spool');
    const file = FILES.find(x => x.kind === 'tape' && x.no === d.dataset.no);
    const sides = file.sides || [{ side: 'A', title: file.title, start: 0, end: 0 }];
    const deck = { el: d, player: null, timer: 0, side: 0 };
    decks.push(deck);
    const cur = () => sides[deck.side];

    const setPlaying = on => {
      d.classList.toggle('playing', on);
      btn.textContent = on ? '❚❚ Pause tape' : '▶ Play tape';
    };
    const tick = () => {
      const p = deck.player; if (!p?.getCurrentTime) return;
      const sd = cur(), end = sd.end || p.getDuration?.() || 0;
      const now = p.getCurrentTime(), t = now - sd.start, len = end - sd.start;
      const done = len > 0 ? Math.min(1, Math.max(0, t / len)) : 0;
      counter.textContent = clock(now);   // matches YouTube's own timer
      spools[0].style.setProperty('--fill', (.95 - .43 * done).toFixed(3));
      spools[1].style.setProperty('--fill', (.52 + .43 * done).toFixed(3));
    };

    photo.addEventListener('click', e => { if (!deck.player) { e.preventDefault(); btn.click(); } });
    btn.addEventListener('click', async e => {
        if (!id || ytOk === false) return;           // YouTube blocked: let the link open it
        e.preventDefault();
        if (ytOk === null && !(await ytReachable)) { window.open(btn.href, '_blank', 'noopener'); return; }
        if (deck.player) {
          if (!deck.player.getPlayerState) return;   // still loading
          const st = deck.player.getPlayerState();
          st === 1 ? deck.player.pauseVideo() : deck.player.playVideo();
          return;
        }
        btn.textContent = 'Loading…';
        try {
          const YT = await loadYouTubeApi();
          photo.classList.add('has-video');
          photo.innerHTML = '<div></div>';
          deck.player = new YT.Player(photo.firstElementChild, {
            videoId: id, host: 'https://www.youtube-nocookie.com',
            playerVars: { autoplay: 1, rel: 0, playsinline: 1, start: cur().start, ...(cur().end ? { end: cur().end } : {}) },
            events: {
              onReady: ev => { ev.target.playVideo(); tick(); },
              onStateChange: ev => {
                const playing = ev.data === YT.PlayerState.PLAYING;
                if (playing) decks.forEach(o => o !== deck && o.player?.pauseVideo?.());
                setPlaying(playing);
                // YouTube adverts and buffering don't count as playing: show that something's happening.
                if (ev.data === YT.PlayerState.UNSTARTED || ev.data === YT.PlayerState.BUFFERING) btn.textContent = 'Loading…';
                clearInterval(deck.timer);
                if (playing) deck.timer = setInterval(tick, 500);
                tick();
              }
            }
          });
        } catch (err) {
          btn.textContent = '▶ Play tape';
        }
    });

    // Two-sided tapes: choosing a side flips the cassette and moves the tape to that story.
    const setSide = i => {
      if (i === deck.side || !sides[i]) return;
      const wasPlaying = deck.player?.getPlayerState?.() === 1;
      deck.side = i;
      const sd = cur(), other = sides[(i + 1) % sides.length];
      d.classList.remove('flipping'); void d.offsetWidth; d.classList.add('flipping');
      d.classList.toggle('side-b', i === 1);
      d.querySelector('.side-name').textContent = `Side ${sd.side} • Incident Tape ${file.no}`;
      d.querySelector('.cassette-label h2').textContent = sd.title;
      d.querySelectorAll('.sides button').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.side) === i)));
      const hint = d.querySelector('.flip-hint');
      if (hint) hint.innerHTML = `⇄ Flip to Side ${other.side}: <span>${esc(other.title)}</span>`;
      btn.href = `https://www.youtube.com/watch?v=${id}&t=${sd.start}s`;
      counter.textContent = clock(sd.start);
      spools[0].style.setProperty('--fill', '.95');
      spools[1].style.setProperty('--fill', '.52');
      if (deck.player?.loadVideoById) {
        const opts = { videoId: id, startSeconds: sd.start, ...(sd.end ? { endSeconds: sd.end } : {}) };
        wasPlaying ? deck.player.loadVideoById(opts) : deck.player.cueVideoById(opts);
      }
    };
    d.querySelectorAll('.sides button').forEach(b => b.addEventListener('click', () => setSide(Number(b.dataset.side))));
    d.querySelector('.flip-hint')?.addEventListener('click', () => setSide((deck.side + 1) % sides.length));
  }
  document.querySelectorAll('#decks .deck').forEach(initDeck);
  // Forget cassettes that were re-rendered away (e.g. the archive list after a filter change).
  function pruneDecks() {
    for (let i = decks.length - 1; i >= 0; i--) {
      if (!document.body.contains(decks[i].el)) {
        clearInterval(decks[i].timer);
        decks[i].player?.destroy?.();
        decks.splice(i, 1);
      }
    }
  }
  // Pause any tape that isn't on the page being shown.
  const pauseTapesOutside = view => decks.forEach(o => { if (!o.el.closest(`[data-view="${view}"]`)) o.player?.pauseVideo?.(); });

  // contact form → The Reporter's inbox (js/email.js)
  const contactForm = $('#submit-form'), contactNote = $('#sent'), contactBtn = contactForm.querySelector('button[type="submit"]');
  const contactSay = (html, bad) => { contactNote.hidden = false; contactNote.innerHTML = html; contactNote.classList.toggle('bad', !!bad); };
  contactForm.addEventListener('submit', async e => {
    e.preventDefault();
    const f = contactForm.elements, val = n => f.namedItem(n).value.trim();
    if (f.namedItem('botcheck').checked) { contactForm.reset(); contactSay('<b>Thank you.</b> Your statement has been sent.'); return; }
    if (!val('story')) { contactSay('Tell us what happened before sending.', true); f.namedItem('story').focus(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val('email'))) { contactSay('Add an email address so The Reporter can get back to you.', true); f.namedItem('email').focus(); return; }
    if (!Email.enabled()) { contactSay('<b>Not connected yet:</b> this form can’t send until the Web3Forms key is added (README → Contact form).', true); return; }
    const anon = f.namedItem('anonymous').checked;
    contactBtn.disabled = true; contactBtn.textContent = 'Sending…';
    try {
      await Email.send(`New incident submission${val('where') ? ` — ${val('where')}` : ''}`, {
        'Name': val('name') || '(not given)',
        'Email': val('email'),
        'Where it happened': val('where') || '(not given)',
        'Keep identity confidential': anon ? 'YES — do not publish their name' : 'No',
        'What happened': val('story')
      }, val('email'));
      contactForm.reset();
      contactSay(`<b>Thank you.</b> Your statement is with The Reporter, who’ll be in touch by email.${anon ? ' Your identity will be kept confidential.' : ''}`);
    } catch (err) {
      console.error(err);
      contactSay('Your statement couldn’t be sent. Check your connection and try again.', true);
    } finally {
      contactBtn.disabled = false; contactBtn.textContent = 'File my report';
    }
  });

  // report / tape page
  const longDate = iso => new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  function renderFile(f) {
    const isTape = f.kind === 'tape';
    const words = (TEXT[keyOf(f)] || '').split(' ').length;
    const mins = Math.max(1, Math.round(words / 200));
    const same = FILES.filter(x => x.kind === f.kind).sort(isTape ? (a, b) => a.no.localeCompare(b.no) : (a, b) => a.date.localeCompare(b.date));
    const i = same.indexOf(f), older = same[i - 1], newer = same[i + 1];
    const navLink = (x, cls, lab) => x ? `<a class="${cls}" href="${href(x)}"><span class="label">${lab}</span><b>${isTape ? 'Tape' : 'Report'} ${x.no}: ${esc(x.title)}</b></a>` : '';
    $('#view-file').innerHTML = `
      <a class="back" href="#${isTape ? 'tapes' : 'reports'}">← All incident ${isTape ? 'tapes' : 'reports'}</a>
      <article class="report">
        <div class="paperclip"></div>
        <div class="docket">
          <div class="left">
            <span class="stamp ${isTape ? 'sepia' : 'red'}">${isTape ? 'Audio file // On record' : 'Unexplained // Open file'}</span>
            <span class="code">${label(f)}</span>
          </div>
          <span class="clear">${isTape && f.dur ? `RUNNING TIME: ${Math.round(f.dur / 60)} MIN` : `READING TIME: ${mins} MIN`}</span>
        </div>
        <header style="margin-top:1.5rem">
          <div class="kicker">${label(f)} • ${isTape ? 'Recorded' : 'Filed'} ${longDate(f.date)}</div>
          <h1>${esc(f.title)}</h1>
          <div class="where">⌖ ${esc(f.loc)}</div>
          <div class="specs">
            <div>${isTape ? 'Recorded' : 'Filed'}<b>${fmt(f.date)}</b></div>
            <div>Origin<b>${esc(f.loc)}</b></div>
            <div>Subjects<b class="red">${esc(f.tags.join(' • ') || 'Unclassified')}</b></div>
            <div>Length<b>${isTape && f.dur ? (f.sides?.length > 1 ? `${f.sides.length} sides • ` : '') + clock(f.dur) : words.toLocaleString('en-GB') + ' words'}</b></div>
          </div>
        </header>
        <div class="prose">${CONTENT[keyOf(f)] || ''}</div>
      </article>
      <section class="statements" id="statements" data-page-id="${isTape ? 'tape' : 'report'}-${f.no}"></section>
      <nav class="file-nav" aria-label="More files">${navLink(older, 'prev', isTape ? '← Previous tape' : '← Older file')}${navLink(newer, 'next', isTape ? 'Next tape →' : 'Newer file →')}</nav>`;
    // Tapes open with their video: lift it out of the text column so it's full width.
    const prose = $('#view-file .prose'), first = prose?.firstElementChild;
    if (isTape && first?.matches('.evidence[data-yt]')) {
      first.classList.add('hero');
      prose.before(first);
    }
  }

  // ---------- YouTube players ----------
  // Each video card shows its thumbnail with a play button. Clicking swaps in the real
  // YouTube player. Where other sites are blocked (e.g. the private preview), the
  // thumbnail can't load, so the button opens the video on YouTube instead.
  function mountPlayers(root) {
    root.querySelectorAll('.evidence[data-yt]').forEach(card => {
      const id = card.dataset.yt, start = Number(card.dataset.start || 0), end = Number(card.dataset.end || 0);
      const caption = card.querySelector('p')?.textContent || 'Video evidence';
      const player = document.createElement('div');
      player.className = 'player';
      // A real link, so it still opens YouTube anywhere the in-page player is blocked.
      player.innerHTML = `<a class="player-start" href="https://www.youtube.com/watch?v=${id}${start ? `&t=${start}s` : ''}" target="_blank" rel="noopener" aria-label="Play video: ${esc(caption)}">
          <img class="sepia-photo" src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="">
          <span class="play">Play evidence</span>
        </a>`;
      const img = player.querySelector('img');
      let canEmbed = false;
      img.addEventListener('load', () => { canEmbed = img.naturalWidth > 0; });
      img.addEventListener('error', () => img.classList.add('missing'));
      // Swap in the real player at a given second. Returns false where YouTube is blocked.
      card.playFrom = sec => {
        if (!canEmbed && !(img.complete && img.naturalWidth > 0)) return false;
        player.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&start=${sec}${end > sec ? `&end=${end}` : ''}" title="${esc(caption)}"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
        return true;
      };
      player.querySelector('a').addEventListener('click', e => {
        if (card.playFrom(start)) e.preventDefault();   // otherwise the link opens YouTube
      });
      card.querySelector('.label').after(player);
      // The player itself links to YouTube, so the separate button isn't needed.
      card.querySelector(':scope > a')?.remove();
    });
    // "▶ Play Side A/B" buttons in a tape file jump the page's main player to that story.
    root.querySelectorAll('[data-seek]').forEach(a => a.addEventListener('click', e => {
      const card = root.querySelector('.evidence[data-yt]');
      if (card?.playFrom?.(Number(a.dataset.seek))) {
        e.preventDefault();
        card.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      }
    }));
  }

  // ---------- counts, latest dispatch and featured case (from data.js) ----------
  function renderCounts() {
    const n = { all: FILES.length, report: REPORTS.length, tape: TAPES.length };
    document.querySelectorAll('[data-count]').forEach(el => { el.textContent = n[el.dataset.count]; });
    const latest = [...REPORTS].sort((a, b) => b.date.localeCompare(a.date))[0];
    if (!latest) return;
    $('#latest-dispatch').innerHTML = `<div><b>Latest dispatch:</b> Incident Report ${latest.no}, <a href="${href(latest)}">“${esc(latest.title)}”</a>, filed ${longDate(latest.date)}.</div>
        <a class="stamp red new-file" href="${href(latest)}">New file</a>`;
    document.querySelector('[data-latest="date"]').textContent = fmt(latest.date);
    document.querySelector('[data-latest="sub"]').textContent = `Report ${latest.no}, ${latest.loc.split(',')[0]}`;
  }
  function renderFeatured() {
    const f = REPORTS.find(r => r.no === FEATURED.no) || REPORTS[0];
    const x = FEATURED.no === f.no ? FEATURED : {};
    $('#featured').innerHTML = `
        <div class="paperclip"></div>
        <div class="docket">
          <div class="left">
            <span class="stamp red">Unexplained // Open file</span>
            <span class="code">Featured: ${label(f)}</span>
          </div>
          ${x.identity ? `<span class="clear">${esc(x.identity).toUpperCase()}</span>` : ''}
        </div>
        <div class="dossier-grid">
          <div>
            <h2><a href="${href(f)}">${esc(f.title)}</a></h2>
            <div class="where">⌖ ${esc(x.where || f.loc)}</div>
            <figure class="plate">
              <a class="frame" href="${href(f)}" style="display:block"><img class="sepia-photo" src="images/${f.img}" alt="Illustration for ${label(f)}"></a>
              <figcaption><span></span><span>Report ${f.no}</span></figcaption>
            </figure>
          </div>
          <div class="statement">
            <div class="head"><span>Reporter’s field statement</span>${x.stamp ? `<span class="stamp red small tilt-right">${esc(x.stamp)}</span>` : ''}</div>
            <p>${esc(x.statement || f.excerpt)}</p>
            ${x.quote ? `<div class="quote">
              <div class="label">Witness testimony:</div>
              <p>${esc(x.quote)}</p>
            </div>` : ''}
            <div class="specs">
              <div>Witness<b>${esc(x.witness || 'First-hand account')}</b></div>
              <div>Location<b>${esc(x.place || f.loc)}</b></div>
              <div>Subjects<b class="red">${esc(f.tags.join(' • ') || 'Unclassified')}</b></div>
              <div>Status<b>${esc(x.status || 'Unexplained')}</b></div>
            </div>
            <div class="actions">
              <a class="btn dark" href="${href(f)}">Read ${label(f)}</a>
              <a class="btn light" href="#reports">All reports</a>
            </div>
          </div>
        </div>`;
  }

  // simple hash router
  let current = 'archive';
  // Phones: the tab menu scrolls sideways. Keep the current tab in view, and fade
  // whichever edge has more tabs hidden behind it so people know they can swipe.
  const tabScroller = document.querySelector('.tabs .scroller');
  function tabEdges() {
    if (!tabScroller) return;
    const max = tabScroller.scrollWidth - tabScroller.clientWidth;
    tabScroller.classList.toggle('more-right', tabScroller.scrollLeft < max - 4);
    tabScroller.classList.toggle('more-left', tabScroller.scrollLeft > 4);
  }
  function showActiveTab() {
    const active = tabScroller?.querySelector('.tab[aria-current="page"]');
    if (active) tabScroller.scrollLeft = active.offsetLeft - (tabScroller.clientWidth - active.offsetWidth) / 2;
    tabEdges();
  }
  tabScroller?.addEventListener('scroll', tabEdges, { passive: true });
  window.addEventListener('resize', tabEdges);

  function show(view, tab, page) {
    pauseTapesOutside(view);
    document.querySelectorAll('[data-view]').forEach(v => v.hidden = v.dataset.view !== view);
    document.querySelectorAll('.tab').forEach(a => { if (a.dataset.route === tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    showActiveTab();
    current = view;
    document.body.dataset.page = page;
    state.page = 1;
    $('#files h2').textContent = page === 'reports' ? 'Case files // Incident reports' : 'Case files // The full archive';
    renderGrid();
  }
  let moderateMounted = false;
  function route() {
    searchOpened = false;
    const h = (location.hash || '#archive').slice(1);
    let view = h, tab = h;
    if (h === 'reports') { view = 'archive'; state.kind = 'report'; }
    if (h === 'archive') { state.kind = 'all'; }
    if (h === 'files') { view = 'archive'; tab = 'reports'; }
    const fm = h.match(/^(file|tape)-(\d{3})$/);
    const file = fm && FILES.find(x => x.kind === (fm[1] === 'tape' ? 'tape' : 'report') && x.no === fm[2]);
    if (file) { renderFile(file); mountPlayers($('#view-file')); Statements.mount($('#statements')); view = 'file'; tab = file.kind === 'tape' ? 'tapes' : 'reports'; }
    if (!document.querySelector(`[data-view="${view}"]`)) { view = 'archive'; tab = 'archive'; }
    show(view, tab, view === 'archive' ? (h === 'reports' || h === 'files' ? h : 'archive') : view);
    if (view === 'moderate' && !moderateMounted) { moderateMounted = true; Statements.mountModerator($('#moderate-desk')); }
    if (h === 'files') $('#files').scrollIntoView({ block: 'start' });
    else window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);
  renderCounts();
  renderFeatured();
  const yearEl = $('#footer-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
  route();
}
