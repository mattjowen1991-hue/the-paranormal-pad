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
  const perPage = () => 4;   // phones too: four cards, then the page buttons
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = iso => new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase();
  const label = f => (f.kind === 'tape' ? 'Incident Tape ' : 'Incident Report ') + f.no;
  const href = f => (f.kind === 'tape' ? '#tape-' : '#file-') + f.no;
  // Cover pictures carry the file's date, so a renumbered file never shows a browser's cached old picture.
  const imgSrc = f => `images/${f.img}?v=${f.date.replace(/-/g, '')}`;
  const ext = () => '';


  // subject tag buttons
  const tagBox = $('#tags');
  SUBJECTS.forEach(t => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = '[•] ' + t; b.dataset.tag = t; b.setAttribute('aria-pressed', 'false');
    tagBox.appendChild(b);
  });
  // The tags stay folded away until asked for; the toggle names the tag in use.
  const tagToggle = $('.tags-toggle');
  tagToggle.addEventListener('click', () => {
    const open = tagToggle.getAttribute('aria-expanded') !== 'true';
    tagToggle.setAttribute('aria-expanded', String(open));
    tagBox.hidden = !open;
  });

  function card(f) {
    if (f.kind === 'tape') return cassetteHTML(f);
    const isTape = false;
    return `<article class="card">
      <div class="paperclip"></div>
      <div class="top"><span class="code">${label(f)}</span><span class="stamp small ${isTape ? 'sepia' : 'red'}">${isTape ? 'Tape' : 'Report'}</span></div>
      <h3><a href="${esc(href(f))}"${ext(f)}>${esc(f.title)}</a></h3>
      <div class="meta">Filed ${fmt(f.date)} • ${esc(f.loc)}</div>
      <a class="photo" href="${esc(href(f))}"${ext(f)} tabindex="-1"><img class="sepia-photo" src="${imgSrc(f)}" alt="" loading="lazy"></a>
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
    $('.tags-current').textContent = state.tag ? `: ${state.tag}` : '';
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
    state.page = Number(b.dataset.page); renderGrid(); savePlace();
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

  // tapes page: reel-to-reel decks driven by the tape's YouTube video or Spotify episode
  const ytIdOf = f => (CONTENT[keyOf(f)] || '').match(/data-yt="([\w-]{11})"/)?.[1];
  const spIdOf = f => (CONTENT[keyOf(f)] || '').match(/data-sp="(\w{22})"/)?.[1];
  const ytLink = (id, sec) => `https://www.youtube.com/watch?v=${id}${sec ? `&t=${sec}s` : ''}`;
  const spLink = (id, sec) => `https://open.spotify.com/episode/${id}${sec ? `?t=${sec}` : ''}`;
  const clock = sec => { sec = Math.max(0, Math.floor(sec || 0)); const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s2 = String(sec % 60).padStart(2, '0'); return h ? `${h}:${String(m).padStart(2, '0')}:${s2}` : `${String(m).padStart(2, '0')}:${s2}`; };

  // Where a tape lives, shown on its cassette label (brand shapes from Simple Icons, in brand colours).
  const PLATFORMS = {
    yt: ['YouTube', '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#f00" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"/><path fill="#fff" d="M9.545 15.568V8.432L15.818 12z"/></svg>'],
    sp: ['Spotify', '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11.5" fill="#000"/><path fill="#1ed760" d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>'],
  };

  const platformOf = f => PLATFORMS[ytIdOf(f) ? 'yt' : spIdOf(f) ? 'sp' : ''];
  const platformBadge = f => {
    const p = platformOf(f);
    return p ? `<span class="platform" title="Plays from ${p[0]}">${p[1]}${p[0]}</span>` : '';
  };
  const platformIcon = f => {
    const p = platformOf(f);
    return p ? p[1].replace('aria-hidden="true"', `role="img" aria-label="${p[0]}"`) : '';
  };

  // Order: pinned tape first (the radio interview), then newest number down, so Tape 001 is always last.
  const tapeOrder = (a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.no.localeCompare(a.no);
  function cassetteHTML(f) {
    const yt = ytIdOf(f), sp = !yt && spIdOf(f), first = f.sides?.[0];
    // The mark sits at the end of the narrator line, or of the title when there's no narrator.
    const badge = platformBadge(f);
    const start = first ? first.start : 0;
    return `
    <article class="deck cassette${f.sides?.length > 1 ? ' two-sided' : ''}" data-no="${f.no}" data-yt="${yt || ''}" data-sp="${sp || ''}">
      <div class="cassette-label">
        <div class="side"><span class="side-name">Side ${first ? first.side : 'A'} • Incident Tape ${f.no}</span>${f.sides?.length > 1
          ? `<div class="sides" role="group" aria-label="Choose a side">${f.sides.map((sd, i) =>
              `<button type="button" data-side="${i}" aria-pressed="${i === 0}">Side ${sd.side}</button>`).join('')}</div>`
          : ''}</div>
        <div class="label-lines">
        <h2><span class="t">${esc(first ? first.title : f.title)}</span>${f.narrator ? '' : badge}</h2>
        ${f.narrator ? `<div class="narrator"><span>Narrated by ${esc(f.narrator)}</span>${badge}</div>` : ''}
        ${f.sides?.length > 1 ? `<button type="button" class="flip-hint">⇄ Flip to Side ${f.sides[1].side}: <span>${esc(f.sides[1].title)}</span></button>` : ''}
        </div>
        <div class="cassette-window">
          <div class="spool left" style="--fill:.95"><div class="reel"></div></div>
          <div class="counter">${clock(start)}</div>
          <div class="spool right" style="--fill:.52"><div class="reel"></div></div>
        </div>
      </div>
      <div class="screen">
        <img class="sepia-photo" src="${imgSrc(f)}" alt="">
      </div>
      <div class="cassette-head">
        <a class="btn blood play" href="${sp ? spLink(sp, start) : ytLink(yt, start)}" target="_blank" rel="noopener">▶ Play tape</a>
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
  // Spotify's embed API, for tapes that live on Spotify. Gives up after 8s (blocked network).
  let spApi = null;
  function loadSpotifyApi() {
    if (spApi) return spApi;
    spApi = new Promise((res, rej) => {
      const prev = window.onSpotifyIframeApiReady;
      window.onSpotifyIframeApiReady = api => { prev?.(api); res(api); };
      const tag = document.createElement('script');
      tag.src = 'https://open.spotify.com/embed/iframe-api/v1';
      tag.async = true;
      tag.onerror = rej;
      document.head.appendChild(tag);
      setTimeout(() => rej(new Error('Spotify unreachable')), 8000);
    });
    spApi.catch(() => { spApi = null; });
    return spApi;
  }
  // A Spotify player in `el` for an episode; `onUpdate` gets {isPaused, isBuffering, position, duration} (ms).
  const spotifyPlayer = (api, el, id, onUpdate) => new Promise(res => {
    api.createController(el, { uri: `spotify:episode:${id}`, width: '100%', height: '100%' }, ctl => {
      ctl.addListener('ready', () => ctl.play());
      ctl.addListener('playback_update', ev => onUpdate(ev.data));
      res(ctl);
    });
  });
  // Drives a Spotify player like a tape side: jumps to the side's start, stops at its end, and
  // resumes after seeks (Spotify pauses after each one and first reports a stale position or two).
  // `getSide()` gives the current {start, end}; `onState` hears {playing, started, loading, now, dur}.
  function spotifySide(getSide, onState) {
    const t = { ctl: null, playing: false, at: 0, needSeek: true, target: null };
    t.seek = sec => { t.target = sec; t.ctl.seek(sec); };
    t.update = ({ isPaused, isBuffering, position, duration }) => {
      const sd = getSide(), now = position / 1000;
      if (t.target != null) {
        if (Math.abs(now - t.target) > 3) return;
        t.target = null;
        if (isPaused) { t.ctl.resume(); return; }
      }
      t.at = now;
      if (!isPaused && t.needSeek) {   // episodes start at 0: jump to the story
        t.needSeek = false;
        if (Math.abs(now - sd.start) > 2) { t.seek(sd.start); return; }
      }
      // Only as it runs off the end: just after a side change Spotify still reports the old position.
      if (!isPaused && sd.end && now >= sd.end && now < sd.end + 3) t.ctl.pause();
      const started = !isPaused && !t.playing;
      t.playing = !isPaused;
      onState({ playing: t.playing, started, loading: t.playing && (isBuffering || !position), now, dur: duration / 1000 });
    };
    // Play/pause; a side that's finished (or never started) starts again from its beginning.
    t.toggle = () => {
      const sd = getSide();
      if (!t.playing && (t.at < sd.start - 2 || (sd.end && t.at >= sd.end - 1))) t.needSeek = true;
      t.ctl.togglePlay();
    };
    t.pause = () => { if (t.playing) t.ctl?.pause(); };
    // Another side: jump straight there if playing, otherwise when next played.
    t.goTo = sd => { t.at = sd.start; t.playing ? t.seek(sd.start) : (t.needSeek = true); };
    return t;
  }

  const decks = [];
  function initDeck(d) {
    const id = d.dataset.yt, sp = d.dataset.sp;
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
    const show = (now, dur) => {
      const sd = cur(), end = sd.end || dur || 0, len = end - sd.start;
      const done = len > 0 ? Math.min(1, Math.max(0, (now - sd.start) / len)) : 0;
      counter.textContent = clock(now);   // matches the player's own timer
      spools[0].style.setProperty('--fill', (.95 - .43 * done).toFixed(3));
      spools[1].style.setProperty('--fill', (.52 + .43 * done).toFixed(3));
    };
    const tick = () => {
      const p = deck.player; if (!p?.getCurrentTime) return;
      show(p.getCurrentTime(), p.getDuration?.());
    };
    const spt = sp && spotifySide(cur, ({ playing, started, loading, now, dur }) => {
      if (started) decks.forEach(o => o !== deck && o.pause());
      setPlaying(playing);
      if (loading) btn.textContent = 'Loading…';
      show(now, dur);
    });
    deck.pause = () => sp ? spt.pause() : deck.player?.pauseVideo?.();

    photo.addEventListener('click', e => { if (!deck.player) { e.preventDefault(); btn.click(); } });
    btn.addEventListener('click', async e => {
        if (sp) {
          e.preventDefault();
          if (deck.player) { spt.toggle(); return; }
          btn.textContent = 'Loading…';
          try {
            const api = await loadSpotifyApi();
            photo.classList.add('has-video', 'has-audio');   // Spotify's player docks under the cover
            photo.insertAdjacentHTML('beforeend', '<div></div>');
            deck.player = spt.ctl = await spotifyPlayer(api, photo.lastElementChild, sp, spt.update);
          } catch (err) {
            btn.textContent = '▶ Play tape';
            window.open(btn.href, '_blank', 'noopener');   // Spotify blocked here: open it there
          }
          return;
        }
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
                if (playing) decks.forEach(o => o !== deck && o.pause());
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
      const wasPlaying = sp ? spt.playing : deck.player?.getPlayerState?.() === 1;
      deck.side = i;
      const sd = cur(), other = sides[(i + 1) % sides.length];
      d.classList.remove('flipping'); void d.offsetWidth; d.classList.add('flipping');
      d.classList.toggle('side-b', i === 1);
      d.querySelector('.side-name').textContent = `Side ${sd.side} • Incident Tape ${file.no}`;
      d.querySelector('.cassette-label h2 .t').textContent = sd.title;
      d.querySelectorAll('.sides button').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.side) === i)));
      const hint = d.querySelector('.flip-hint');
      if (hint) hint.innerHTML = `⇄ Flip to Side ${other.side}: <span>${esc(other.title)}</span>`;
      btn.href = sp ? spLink(sp, sd.start) : ytLink(id, sd.start);
      counter.textContent = clock(sd.start);
      spools[0].style.setProperty('--fill', '.95');
      spools[1].style.setProperty('--fill', '.52');
      if (sp && deck.player) spt.goTo(sd);
      else if (deck.player?.loadVideoById) {
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
  const pauseTapesOutside = view => decks.forEach(o => { if (!o.el.closest(`[data-view="${view}"]`)) o.pause(); });

  // contact form → The Reporter's inbox (js/email.js)
  const contactForm = $('#submit-form'), contactNote = $('#sent'), contactBtn = contactForm.querySelector('button[type="submit"]');
  const contactSay = (html, bad) => { contactNote.hidden = false; contactNote.innerHTML = html; contactNote.classList.toggle('bad', !!bad); };
  contactForm.addEventListener('submit', async e => {
    e.preventDefault();
    const f = contactForm.elements, val = n => f.namedItem(n).value.trim();
    if (f.namedItem('botcheck').checked) { contactForm.reset(); contactSay('<b>Thank you.</b> Your statement has been sent.'); return; }
    if (!val('story')) { contactSay('Tell us what happened before sending.', true); f.namedItem('story').focus(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val('email'))) { contactSay('Add an email address so The Reporter can get back to you.', true); f.namedItem('email').focus(); return; }
    if (!Email.enabled() && !Statements.enabled()) { contactSay('<b>Not connected yet:</b> this form can’t send until the Web3Forms key or Firebase is set up (README).', true); return; }
    const anon = f.namedItem('anonymous').checked;
    contactBtn.disabled = true; contactBtn.textContent = 'Sending…';
    try {
      // Saved to the moderation desk AND emailed; it counts as sent if either works.
      const saved = Statements.enabled()
        ? Statements.saveSubmission({ name: val('name'), email: val('email'), where: val('where'), story: val('story'), anonymous: anon })
        : Promise.reject(new Error('Firebase not set up'));
      const emailed = !Email.enabled() ? Promise.reject(new Error('Email not set up')) : Email.send(`New incident submission${val('where') ? ` - ${val('where')}` : ''}`, {
        'Name': val('name') || '(not given)',
        'Email': val('email'),
        'Where it happened': val('where') || '(not given)',
        'Keep identity confidential': anon ? 'YES - do not publish their name' : 'No',
        'What happened': val('story')
      }, val('email'));
      const [savedResult, emailedResult] = await Promise.allSettled([saved, emailed]);
      if (savedResult.status === 'rejected') console.warn('Submission not saved to the desk', savedResult.reason);
      if (emailedResult.status === 'rejected') console.warn('Submission not emailed', emailedResult.reason);
      if (savedResult.status === 'rejected' && emailedResult.status === 'rejected') throw emailedResult.reason;
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
  // ---------- sharing ----------
  // Share links point at the per-file share pages (reports/008/, tapes/002/), which carry
  // that file's title, opening lines and cover image for WhatsApp/Facebook previews.
  // Those pages are made by tools/share_pages.py.
  const shareUrl = f => `${location.origin}/${f.kind === 'tape' ? 'tapes' : 'reports'}/${f.no}/`;
  const shareButton = (f, size = '') => `<button type="button" class="btn ${size ? 'light' : 'dark'} share-btn ${size}" data-share="${f.kind}-${f.no}">
      <span class="share-icon" aria-hidden="true"></span><span class="share-label">Share ${f.kind === 'tape' ? 'tape' : 'report'}</span></button>`;
  document.addEventListener('click', async e => {
    const btn = e.target.closest('[data-share]'); if (!btn) return;
    const [kind, no] = btn.dataset.share.split('-');
    const f = FILES.find(x => x.kind === kind && x.no === no); if (!f) return;
    const url = shareUrl(f), title = `${label(f)}: ${f.title}`;
    const labelEl = btn.querySelector('.share-label'), original = labelEl.textContent;
    const flash = text => { labelEl.textContent = text; setTimeout(() => { labelEl.textContent = original; }, 2200); };
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      try { await navigator.share({ title, text: `${title} - The Paranormal Pad`, url }); } catch (err) { /* closed the share sheet */ }
      return;
    }
    try { await navigator.clipboard.writeText(url); flash('Link copied'); }
    catch (err) { window.prompt('Copy this link:', url); }
  });

  // ---------- "Listen instead": a report's narrations, newest first ----------
  // Worked out from the tapes: each tape side names the report it tells. Tapes marked
  // "narration": false (the radio interview, the Barnsley Hall revisit) are "Also on tape" links.
  const tapes = () => FILES.filter(x => x.kind === 'tape');
  const narrationsOf = no => tapes().filter(t => t.narration !== false)
    .flatMap(t => (t.sides || []).filter(sd => sd.report === no).map(side => ({ tape: t, side })))
    .sort((a, b) => b.tape.date.localeCompare(a.tape.date) || b.tape.no.localeCompare(a.tape.no));
  const alsoOnTape = no => tapes().filter(t => t.narration === false
    && ((t.sides || []).some(sd => sd.report === no) || (t.reports || []).includes(no)));
  const sideLen = x => x.side.end ? x.side.end - x.side.start : 0;

  function listenHTML(f) {
    const list = narrationsOf(f.no), also = alsoOnTape(f.no);
    if (!list.length && !also.length) return '';
    return `<section class="listen" aria-label="Listen to this report">
      ${list.length ? `<div class="listen-bar">
          <button type="button" class="btn blood listen-play">▶ Listen instead</button>
          <b class="listen-time"></b>
        </div>
        <div class="listen-info"></div>
        ${list.length > 1 ? `<div class="listen-choices" role="group" aria-label="Choose a narration"><span>${list.length} narrations</span>${
          list.map((x, i) => `<button type="button" data-i="${i}" aria-pressed="${i === 0}"><span class="n">${esc(x.tape.narrator)}</span>
            <span class="m">${platformIcon(x.tape)}${sideLen(x) ? clock(sideLen(x)) : ''}</span></button>`).join('')}</div>` : ''}
        <div class="listen-screen" hidden></div>` : ''}
      ${also.length ? `<p class="also-on-tape">Also on tape: ${also.map(t =>
        `<a href="${href(t)}">Incident Tape ${t.no}: ${esc(t.title)}</a>`).join(' • ')}</p>` : ''}
    </section>`;
  }

  // The player behind "Listen instead": plays just this report's part of the chosen tape.
  function mountListen(root, f) {
    const box = root.querySelector('.listen'), btn = box?.querySelector('.listen-play');
    if (!btn) return;
    const list = narrationsOf(f.no), info = box.querySelector('.listen-info'), screen = box.querySelector('.listen-screen');
    const time = box.querySelector('.listen-time');
    let i = 0, player = null, spt = null, playing = false, timer = 0;
    const cur = () => list[i].side;
    const media = x => { const yt = ytIdOf(x.tape); return yt ? ['yt', yt] : ['sp', spIdOf(x.tape)]; };
    const link = x => { const [k, id] = media(x); return k === 'yt' ? ytLink(id, x.side.start) : spLink(id, x.side.start); };
    const setInfo = () => {
      const x = list[i], t = x.tape, len = sideLen(x);
      time.textContent = len ? clock(len) : '';
      info.innerHTML = `<span class="listen-by">Narrated by ${esc(t.narrator)} ${platformBadge(t)}</span>
        <a href="${href(t)}">Incident Tape ${t.no}${t.sides.length > 1 ? `, Side ${x.side.side}` : ''}</a>`;
    };
    // While playing, the time shows how far into this story you are.
    const showTime = now => {
      const len = sideLen(list[i]);
      if (len) time.textContent = `${clock(Math.min(len, Math.max(0, now - cur().start)))} / ${clock(len)}`;
    };
    const setPlaying = on => {
      playing = on;
      box.classList.toggle('playing', on);
      btn.textContent = on ? '❚❚ Pause' : '▶ Listen instead';
    };
    const reset = () => {
      clearInterval(timer);
      player?.destroy?.();
      player = spt = null;
      screen.innerHTML = '';
      screen.hidden = true;
      setPlaying(false);
      setInfo();
    };
    async function start() {
      const x = list[i], [kind, id] = media(x);
      btn.textContent = 'Loading…';
      screen.className = `listen-screen ${kind}`;
      screen.hidden = false;
      screen.innerHTML = '<div></div>';
      try {
        if (kind === 'sp') {
          const api = await loadSpotifyApi();
          spt = spotifySide(cur, ({ playing: on, loading, now }) => {
            setPlaying(on);
            if (loading) btn.textContent = 'Loading…';
            showTime(now);
          });
          player = spt.ctl = await spotifyPlayer(api, screen.firstElementChild, id, spt.update);
        } else {
          if (!(await ytReachable)) throw new Error('YouTube unreachable');
          const YT = await loadYouTubeApi();
          player = new YT.Player(screen.firstElementChild, {
            videoId: id, host: 'https://www.youtube-nocookie.com',
            playerVars: { autoplay: 1, rel: 0, playsinline: 1, start: x.side.start, ...(x.side.end ? { end: x.side.end } : {}) },
            events: {
              onReady: ev => ev.target.playVideo(),
              onStateChange: ev => {
                setPlaying(ev.data === YT.PlayerState.PLAYING);
                if (ev.data === YT.PlayerState.UNSTARTED || ev.data === YT.PlayerState.BUFFERING) btn.textContent = 'Loading…';
                clearInterval(timer);
                if (playing) timer = setInterval(() => box.isConnected ? showTime(player.getCurrentTime()) : reset(), 500);
              }
            }
          });
        }
      } catch (err) {
        reset();
        window.open(link(x), '_blank', 'noopener');   // blocked here: open it on YouTube / Spotify
      }
    }
    btn.addEventListener('click', () => {
      if (!player) return start();
      if (spt) return spt.toggle();
      if (!player.getPlayerState) return;   // still loading
      const st = player.getPlayerState();
      if (st === 1) return player.pauseVideo();
      if (st === 0) player.seekTo(cur().start, true);   // finished: from the top of the story
      player.playVideo();
    });
    // Another narration: swap players, carrying on playing if it was.
    box.querySelectorAll('.listen-choices button').forEach(b => b.addEventListener('click', () => {
      const j = Number(b.dataset.i);
      if (j === i) return;
      const was = playing;
      reset();
      i = j;
      box.querySelectorAll('.listen-choices button').forEach(o => o.setAttribute('aria-pressed', String(o === b)));
      setInfo();
      if (was) start();
    }));
    setInfo();
  }

  function renderFile(f) {
    const isTape = f.kind === 'tape';
    const words = (TEXT[keyOf(f)] || '').split(' ').length;
    const mins = Math.max(1, Math.round(words / 200));
    const same = FILES.filter(x => x.kind === f.kind).sort(isTape ? (a, b) => a.no.localeCompare(b.no) : (a, b) => a.date.localeCompare(b.date));
    const i = same.indexOf(f), older = same[i - 1], newer = same[i + 1];
    const navLink = (x, cls, lab) => x ? `<a class="${cls}" href="${href(x)}"><span class="label">${lab}</span><b>${isTape ? 'Tape' : 'Report'} ${x.no}: ${esc(x.title)}</b></a>` : '';
    $('#view-file').innerHTML = `
      <div class="file-top">
        <a class="back" href="#${isTape ? 'tapes' : 'reports'}">← All incident ${isTape ? 'tapes' : 'reports'}</a>
        ${shareButton(f, 'small')}
      </div>
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
        ${isTape ? '' : listenHTML(f)}
        <div class="prose">${CONTENT[keyOf(f)] || ''}</div>
        <div class="share-bar">
          <span>Know someone who should read this ${isTape ? 'tape' : 'report'}?</span>
          ${shareButton(f)}
        </div>
      </article>
      <section class="statements" id="statements" data-page-id="${isTape ? 'tape' : 'report'}-${f.no}"></section>
      <nav class="file-nav" aria-label="More files">${navLink(older, 'prev', isTape ? '← Previous tape' : '← Older file')}${navLink(newer, 'next', isTape ? 'Next tape →' : 'Newer file →')}</nav>`;
    // Tapes open with their video: lift it out of the text column so it's full width.
    const prose = $('#view-file .prose'), first = prose?.firstElementChild;
    if (isTape && first?.matches('.evidence[data-yt], .evidence[data-sp]')) {
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
    // Spotify recordings: the tape's cover with a play button, swapped for Spotify's player on click.
    root.querySelectorAll('.evidence[data-sp]').forEach(card => {
      const id = card.dataset.sp, start = Number(card.dataset.start || 0);
      const caption = card.querySelector('p')?.textContent || 'Audio evidence';
      const player = document.createElement('div');
      player.className = 'player';
      player.innerHTML = `<a class="player-start" href="${spLink(id, start)}" target="_blank" rel="noopener" aria-label="Play recording: ${esc(caption)}">
          <img class="sepia-photo" src="${esc(card.dataset.img || '')}" alt="">
          <span class="play">Play evidence</span>
        </a>`;
      let ctl = null, pending = null, target = null;
      const seekTo = sec => { target = sec; ctl.seek(sec); };
      card.playFrom = sec => {
        if (ctl) { seekTo(sec); return true; }
        pending = sec;
        if (player.dataset.loading) return true;
        player.dataset.loading = '1';
        loadSpotifyApi().then(api => {
          player.innerHTML = '<div></div>';
          player.classList.add('spotify');
          return spotifyPlayer(api, player.firstElementChild, id, ({ isPaused, position }) => {
            const now = position / 1000;
            if (target != null) {   // Spotify pauses after a seek: resume once it lands
              if (Math.abs(now - target) > 3) return;
              target = null;
              if (isPaused) ctl.resume();
              return;
            }
            if (isPaused || pending == null) return;
            const to = pending; pending = null;
            if (Math.abs(now - to) > 2) seekTo(to);   // episodes start at 0: jump to the story
          });
        }).then(c => { ctl = c; }, () => {
          delete player.dataset.loading;
          window.open(spLink(id, pending ?? start), '_blank', 'noopener');   // Spotify blocked here
        });
        return true;
      };
      player.querySelector('a').addEventListener('click', e => { e.preventDefault(); card.playFrom(start); });
      card.querySelector('.label').after(player);
      card.querySelector(':scope > a')?.remove();
    });
    // "▶ Play Side A/B" buttons in a tape file jump the page's main player to that story.
    root.querySelectorAll('[data-seek]').forEach(a => a.addEventListener('click', e => {
      const card = root.querySelector('.evidence[data-yt], .evidence[data-sp]');
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
              <a class="frame" href="${href(f)}" style="display:block"><img class="sepia-photo" src="${imgSrc(f)}" alt="Illustration for ${label(f)}"></a>
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
  // Going back (back button or swipe) returns you to where you were: each history entry keeps
  // its scroll position and ledger page. Pages reached by a link open at the top as usual.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  let saveTimer = 0;
  const savePlace = () => {
    clearTimeout(saveTimer);
    try { history.replaceState({ ...(history.state || {}), y: Math.round(scrollY), page: state.page }, ''); } catch (err) { /* private mode limits */ }
  };
  window.addEventListener('scroll', () => { clearTimeout(saveTimer); saveTimer = setTimeout(savePlace, 150); }, { passive: true });
  // Save the exact spot just before a link takes you somewhere else on the site.
  document.addEventListener('click', e => { if (e.target.closest('a[href^="#"]')) savePlace(); }, true);
  // Images further up can still be loading, so settle on the spot over a moment, unless you scroll first.
  function restoreScroll(y) {
    let last = null;
    const go = () => {
      if (last !== null && Math.abs(scrollY - last) > 2) return;
      window.scrollTo(0, y);
      last = scrollY;
    };
    go();
    requestAnimationFrame(go);
    setTimeout(go, 300);
    setTimeout(go, 900);
  }

  let moderateMounted = false;
  function route() {
    searchOpened = false;
    clearTimeout(saveTimer);
    const back = typeof history.state?.y === 'number' ? history.state : null;
    const h = (location.hash || '#archive').slice(1);
    let view = h, tab = h;
    if (h === 'reports') { view = 'archive'; state.kind = 'report'; }
    if (h === 'archive') { state.kind = 'all'; }
    if (h === 'files') { view = 'archive'; tab = 'reports'; }
    const fm = h.match(/^(file|tape)-(\d{3})$/);
    const file = fm && FILES.find(x => x.kind === (fm[1] === 'tape' ? 'tape' : 'report') && x.no === fm[2]);
    if (file) { renderFile(file); mountPlayers($('#view-file')); mountListen($('#view-file'), file); Statements.mount($('#statements')); view = 'file'; tab = file.kind === 'tape' ? 'tapes' : 'reports'; }
    if (!document.querySelector(`[data-view="${view}"]`)) { view = 'archive'; tab = 'archive'; }
    show(view, tab, view === 'archive' ? (h === 'reports' || h === 'files' ? h : 'archive') : view);
    if (view === 'moderate' && !moderateMounted) { moderateMounted = true; Statements.mountModerator($('#moderate-desk')); }
    if (back) {
      if (view === 'archive' && back.page > 1) { state.page = back.page; renderGrid(); }
      restoreScroll(back.y);
    } else if (h === 'files') $('#files').scrollIntoView({ block: 'start' });
    else window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);
  renderCounts();
  renderFeatured();
  const yearEl = $('#footer-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
  route();
}
