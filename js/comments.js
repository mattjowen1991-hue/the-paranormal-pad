// ─── Witness statements (comments) + incident submissions ─────────
// Comments under every report and tape, and copies of contact form submissions,
// stored in Google Firebase (Firestore).
//   Readers:   file a statement (name + message). It stays hidden until approved.
//              The contact form saves a submission here as well as emailing it.
//   Moderator: the private page #moderate. Sign in with Google to approve, reply or delete
//              statements, and to read and track submissions (only the moderator can read those).
// Setup: COMMENTS in js/data.js, rules in firestore.rules, steps in README → Comments.
//
// Local testing against the Firebase emulator: open the site on localhost with ?emulator=1

const Statements = (() => {
  const SDK = 'https://www.gstatic.com/firebasejs/12.19.0';
  const emulator = new URLSearchParams(location.search).has('emulator')
    && ['localhost', '127.0.0.1'].includes(location.hostname);
  const settings = () => (typeof COMMENTS !== 'undefined' ? COMMENTS : {});
  const enabled = () => emulator || !!settings().firebase;

  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const when = ts => ts?.toDate ? ts.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Just now';
  const byDate = (a, b) => (a.createdAt?.toMillis?.() ?? Infinity) - (b.createdAt?.toMillis?.() ?? Infinity);

  // Firebase is only downloaded when a statements section or the moderation desk is opened.
  let fb = null;
  function firebase() {
    fb ??= (async () => {
      const [app, store] = await Promise.all([import(`${SDK}/firebase-app.js`), import(`${SDK}/firebase-firestore.js`)]);
      const config = emulator ? { apiKey: 'demo', projectId: 'demo-paranormal-pad', authDomain: '127.0.0.1' } : settings().firebase;
      const instance = app.initializeApp(config);
      const db = store.getFirestore(instance);
      if (emulator) store.connectFirestoreEmulator(db, '127.0.0.1', 8085);
      return { instance, db, ...store };
    })();
    return fb;
  }
  let fbAuth = null;
  function auth() {
    fbAuth ??= (async () => {
      const [{ instance }, mod] = await Promise.all([firebase(), import(`${SDK}/firebase-auth.js`)]);
      const a = mod.getAuth(instance);
      if (emulator) {
        mod.connectAuthEmulator(a, 'http://127.0.0.1:9099', { disableWarnings: true });
        window.__statementsAuth = { auth: a, ...mod };   // lets local tests sign in without a real Google account
      }
      return { auth: a, ...mod };
    })();
    return fbAuth;
  }

  // ---------- secret word + PIN for the moderation desk ----------
  // Stored as SHA-256 hashes of "paranormal-pad:word:…" / "paranormal-pad:pin:…" so they
  // aren't readable in the page source. The real values are kept in the private notes repo.
  // This is a curtain, not a lock: approving/deleting still needs the moderator's Google sign-in.
  const SECRET_WORD_HASH = '536ffa358e9deaee314923dd89eb31fb9630ccb9677dda3542bd0d4ef9ef763a';
  const PIN_HASH = '2eaec4b8bbd68270097396feb6de89afe7d9e85be1e829b968ef0da138760370';
  async function sha256(text) {
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  const isSecretWord = async text => (await sha256(`paranormal-pad:word:${text.trim().toLowerCase()}`)) === SECRET_WORD_HASH;
  const unlocked = () => { try { return sessionStorage.getItem('pp-desk') === '1'; } catch (e) { return false; } };
  function pinGate(root) {
    return new Promise(resolve => {
      root.innerHTML = `<div class="moderate-sheet">
        <div class="docket"><div class="left"><span class="stamp red">Restricted</span><span class="code">Moderation desk</span></div></div>
        <h1>Moderation desk</h1>
        <form class="pin-form" novalidate>
          <div class="field"><label for="desk-pin">Enter PIN</label>
            <input id="desk-pin" type="password" inputmode="numeric" autocomplete="off" maxlength="12" placeholder="······"></div>
          <div><button class="btn dark" type="submit">Unlock</button></div>
          <p class="statement-note bad" role="status" hidden></p>
        </form></div>`;
      const form = root.querySelector('.pin-form'), input = form.querySelector('input'), note = form.querySelector('.statement-note');
      input.focus();
      form.addEventListener('submit', async e => {
        e.preventDefault();
        if ((await sha256(`paranormal-pad:pin:${input.value.trim()}`)) === PIN_HASH) {
          try { sessionStorage.setItem('pp-desk', '1'); } catch (err) {}
          resolve();
          return;
        }
        form.querySelector('button').disabled = true;
        await new Promise(r => setTimeout(r, 1000));   // slow down guessing
        form.querySelector('button').disabled = false;
        note.hidden = false; note.textContent = 'That PIN isn’t right.';
        input.value = ''; input.focus();
      });
    });
  }

  const moderator = () => settings().moderator || 'theparanormalpad@gmail.com';
  const titleFor = pageId => {
    const [kind, no] = pageId.split('-');
    const f = FILES.find(x => (x.kind === 'tape' ? 'tape' : 'report') === kind && x.no === no);
    return f ? `${kind === 'tape' ? 'Tape' : 'Report'} ${no}: ${f.title}` : pageId;
  };

  // ---------- reader side ----------
  function cardHTML(c) {
    return `<article class="statement-card">
      <header><b>${esc(c.name)}</b><time>${esc(when(c.createdAt))}</time></header>
      <p>${esc(c.message)}</p>
      ${c.reply ? `<div class="reporter-reply"><span class="label">The Reporter replies:</span><p>${esc(c.reply)}</p></div>` : ''}
    </article>`;
  }

  async function mount(section) {
    const pageId = section.dataset.pageId;
    section.innerHTML = `
      <div class="docket">
        <div class="left"><span class="stamp red">Witness statements</span><span class="code statement-count"></span></div>
      </div>
      <p class="statements-intro">Had something similar happen, or have a theory about this one? File your statement below. The Reporter reads every statement before it’s added to the file.</p>
      <div class="statement-list" aria-live="polite"></div>
      ${enabled() ? `
      <form class="statement-form" novalidate>
        <div class="field"><label for="st-name">Your name</label><input id="st-name" name="name" maxlength="60" autocomplete="nickname" placeholder="As you’d like it shown…"></div>
        <div class="field"><label for="st-message">Your statement</label><textarea id="st-message" name="message" maxlength="3000" placeholder="Tell us what you think, or what happened to you…"></textarea></div>
        <div class="field st-trap" aria-hidden="true"><label for="st-website">Leave this empty</label><input id="st-website" name="website" tabindex="-1" autocomplete="off"></div>
        <div class="statement-actions">
          <button class="btn blood" type="submit">File statement</button>
          <small>Please don’t include details you wouldn’t want published.</small>
        </div>
        <div class="statement-note" role="status" hidden></div>
      </form>` : ''}`;

    const list = section.querySelector('.statement-list');
    const count = section.querySelector('.statement-count');
    if (!enabled()) {
      list.innerHTML = '<p class="statements-empty">The statements desk opens soon.</p>';
      return;
    }

    list.innerHTML = '<p class="statements-empty">Opening the file…</p>';
    try {
      const { db, collection, query, where, getDocs } = await firebase();
      const snap = await getDocs(query(collection(db, 'comments'), where('pageId', '==', pageId), where('approved', '==', true)));
      const items = snap.docs.map(d => d.data()).sort(byDate);
      if (!section.isConnected) return;
      count.textContent = items.length ? `${items.length} on file` : '';
      list.innerHTML = items.length ? items.map(cardHTML).join('')
        : '<p class="statements-empty">No statements on file yet. Be the first to add yours.</p>';
    } catch (e) {
      console.error(e);
      list.innerHTML = '<p class="statements-empty">Statements couldn’t be loaded right now. Try again later.</p>';
    }

    const form = section.querySelector('.statement-form');
    const note = form.querySelector('.statement-note');
    const button = form.querySelector('button');
    const say = (text, bad) => { note.hidden = false; note.textContent = text; note.classList.toggle('bad', !!bad); };
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const f = form.elements;   // (form.name would be the form's own name, not the field)
      const name = f.namedItem('name').value.trim(), message = f.namedItem('message').value.trim();
      if (f.namedItem('website').value) { form.reset(); say('Thank you. Your statement has been filed.'); return; }   // bot
      if (!name) { say('Add your name so The Reporter knows who filed it.', true); f.namedItem('name').focus(); return; }
      if (!message) { say('Write your statement first.', true); f.namedItem('message').focus(); return; }
      button.disabled = true; button.textContent = 'Filing…';
      try {
        const { db, collection, addDoc, serverTimestamp } = await firebase();
        await addDoc(collection(db, 'comments'), { pageId, name, message, createdAt: serverTimestamp(), approved: false });
        // Let The Reporter know by email (best effort: the statement is already saved).
        if (typeof Email !== 'undefined' && Email.commentAlerts()) {
          const base = location.href.split('#')[0];
          Email.send(`New witness statement on ${titleFor(pageId)}`, {
            'Report': titleFor(pageId),
            'Name': name,
            'Statement': message,
            'Read it on': `${base}#${pageId.replace('report', 'file')}`,
            'Approve it at': `${base}#moderate`
          }).catch(err => console.warn('Comment alert not sent', err));
        }
        form.reset();
        say('Thank you. Your statement has been filed and will appear here once The Reporter has read it.');
      } catch (err) {
        console.error(err);
        say('Your statement couldn’t be filed. Check your connection and try again.', true);
      } finally {
        button.disabled = false; button.textContent = 'File statement';
      }
    });
  }

  // ---------- incident submissions (contact form copies) ----------
  async function saveSubmission({ name, email, where, story, anonymous }) {
    if (!enabled()) throw new Error('Firebase is not set up');
    const { db, collection, addDoc, serverTimestamp } = await firebase();
    await addDoc(collection(db, 'submissions'), {
      name: name || '', email, where: where || '', story, anonymous: !!anonymous,
      createdAt: serverTimestamp(), status: 'new'
    });
  }
  const SUB_STATUS = { new: 'New', replied: 'Replied', report: 'Turned into a report', archived: 'Archived' };

  // ---------- moderation desk (#moderate) ----------
  async function mountModerator(root) {
    if (!enabled()) {
      root.innerHTML = `<div class="moderate-sheet"><h1>Moderation desk</h1>
        <p>Comments aren’t switched on yet. Add the Firebase settings to <code>js/data.js</code> (see README → Comments).</p></div>`;
      return;
    }
    if (!unlocked()) await pinGate(root);
    root.innerHTML = '<div class="moderate-sheet"><h1>Moderation desk</h1><p>Loading…</p></div>';
    const A = await auth();
    A.onAuthStateChanged(A.auth, user => render(user));

    async function render(user) {
      if (!user) {
        root.innerHTML = `<div class="moderate-sheet">
          <div class="docket"><div class="left"><span class="stamp red">Restricted</span><span class="code">Moderation desk</span></div></div>
          <h1>Moderation desk</h1>
          <p>Sign in with the Reporter’s Google account (theparanormalpad@gmail.com) to read witness statements and incident submissions.</p>
          <div><button class="btn dark" type="button" data-act="signin">Sign in with Google</button></div>
          <p class="statement-note" role="status" hidden></p>
        </div>`;
        root.querySelector('[data-act="signin"]').onclick = async () => {
          try { await A.signInWithPopup(A.auth, new A.GoogleAuthProvider()); }
          catch (e) { const n = root.querySelector('.statement-note'); n.hidden = false; n.textContent = `Sign-in didn’t complete (${e.code || e.message}).`; }
        };
        return;
      }
      if (user.email !== moderator() || !user.emailVerified) {
        root.innerHTML = `<div class="moderate-sheet"><h1>Moderation desk</h1>
          <p>${esc(user.email)} can’t moderate statements. Sign in with the Reporter’s account instead.</p>
          <div><button class="btn light" type="button" data-act="signout">Sign out</button></div></div>`;
        root.querySelector('[data-act="signout"]').onclick = () => A.signOut(A.auth);
        return;
      }

      root.innerHTML = `<div class="moderate-sheet">
        <div class="docket"><div class="left"><span class="stamp red">Restricted</span><span class="code">Moderation desk</span></div>
          <span class="clear">${esc(user.email)} · <button class="linkish" type="button" data-act="signout">Sign out</button></span></div>
        <h1>Moderation desk</h1>
        <div class="desk-tabs" role="tablist">
          <button type="button" role="tab" data-tab="statements">Witness statements <span data-count="pending-badge"></span></button>
          <button type="button" role="tab" data-tab="submissions">Incident submissions <span data-count="new-badge"></span></button>
        </div>
        <section data-panel="statements">
          <h2 class="mod-head">Awaiting review <span data-count="pending"></span></h2>
          <div class="mod-list" data-list="pending"><p class="statements-empty">Loading…</p></div>
          <h2 class="mod-head">On the file <span data-count="approved"></span></h2>
          <div class="mod-list" data-list="approved"><p class="statements-empty">Loading…</p></div>
        </section>
        <section data-panel="submissions" hidden>
          <p class="desk-intro">Every story sent through the Contact page, also emailed to you. Only you can see these.</p>
          <h2 class="mod-head">New <span data-count="sub-new"></span></h2>
          <div class="mod-list" data-list="sub-new"><p class="statements-empty">Loading…</p></div>
          <h2 class="mod-head">Handled <span data-count="sub-done"></span></h2>
          <div class="mod-list" data-list="sub-done"><p class="statements-empty">Loading…</p></div>
        </section>
      </div>`;
      root.querySelector('[data-act="signout"]').onclick = () => A.signOut(A.auth);
      showTab(currentTab());
      await Promise.all([load(), loadSubmissions()]);
    }

    let flash = null;   // { id, text }: confirmation shown on a card after it's reloaded
    async function load() {
      const { db, collection, query, where, getDocs } = await firebase();
      const get = async approved => (await getDocs(query(collection(db, 'comments'), where('approved', '==', approved))))
        .docs.map(d => ({ id: d.id, ...d.data() }));
      const [pending, approved] = await Promise.all([get(false), get(true)]);
      pending.sort(byDate);
      approved.sort((a, b) => byDate(b, a));
      if (flash && !pending.concat(approved).some(c => c.id === flash.id)) flash = null;
      fill('pending', pending, 'Nothing waiting. All statements have been read.');
      fill('approved', approved.slice(0, 40), 'No statements on the file yet.');
      root.querySelector('[data-count="pending"]').textContent = `(${pending.length})`;
      root.querySelector('[data-count="pending-badge"]').textContent = pending.length ? `(${pending.length})` : '';
      root.querySelector('[data-count="approved"]').textContent = `(${approved.length})`;
    }

    function fill(kind, items, empty) {
      const box = root.querySelector(`[data-list="${kind}"]`);
      box.innerHTML = items.length ? items.map(c => `
        <article class="statement-card mod-card" data-id="${esc(c.id)}">
          <header><a href="#${esc(c.pageId.replace('report', 'file'))}">${esc(titleFor(c.pageId))}</a><time>${esc(when(c.createdAt))}</time></header>
          <b class="mod-name">${esc(c.name)}</b>
          <p>${esc(c.message)}</p>
          <div class="field"><label for="reply-${esc(c.id)}">Reply as The Reporter (optional)</label>
            <textarea id="reply-${esc(c.id)}" maxlength="3000" placeholder="Shown under their statement…" data-saved="${esc(c.reply || '')}">${esc(c.reply || '')}</textarea></div>
          <div class="mod-actions">
            ${kind === 'pending'
              ? '<button class="btn blood" type="button" data-act="approve">Approve</button>'
              : '<button class="btn dark" type="button" data-act="save">Add reply</button><button class="btn light" type="button" data-act="hide">Hide</button>'}
            <button class="btn light" type="button" data-act="delete">Delete</button>
            <span class="mod-confirm" hidden>Delete for good? <button class="btn blood" type="button" data-act="really-delete">Yes, delete</button><button class="btn light" type="button" data-act="cancel">Cancel</button></span>
          </div>
          ${flash?.id === c.id ? `<p class="statement-note" role="status">${esc(flash.text)}</p>` : ''}
        </article>`).join('') : `<p class="statements-empty">${empty}</p>`;
      box.querySelectorAll('.mod-card').forEach(syncButtons);
    }

    // Button labels follow what's in the reply box, and nothing is clickable until something changed.
    function syncButtons(card) {
      const box = card.querySelector('textarea'), text = box.value.trim(), saved = box.dataset.saved || '';
      const approve = card.querySelector('[data-act="approve"]');
      if (approve) approve.textContent = text ? 'Approve with reply' : 'Approve';
      const save = card.querySelector('[data-act="save"]');
      if (save) {
        save.textContent = !saved ? 'Add reply' : text ? 'Update reply' : 'Remove reply';
        save.disabled = text === saved;
      }
    }
    root.addEventListener('input', e => { const card = e.target.closest('.mod-card'); if (card) syncButtons(card); });

    root.addEventListener('click', async e => {
      const btn = e.target.closest('.mod-card [data-act]'); if (!btn) return;
      const card = btn.closest('.mod-card'), id = card.dataset.id, act = btn.dataset.act;
      const confirmBox = card.querySelector('.mod-confirm');
      if (act === 'delete') { confirmBox.hidden = false; return; }
      if (act === 'cancel') { confirmBox.hidden = true; return; }
      const { db, doc, updateDoc, deleteDoc, serverTimestamp } = await firebase();
      const reply = card.querySelector('textarea').value.trim(), saved = card.querySelector('textarea').dataset.saved || '';
      const withReply = reply ? { reply, repliedAt: serverTimestamp() } : { reply: '' };
      card.querySelectorAll('button').forEach(b => { b.disabled = true; });
      try {
        if (act === 'approve') {
          await updateDoc(doc(db, 'comments', id), { approved: true, ...withReply });
          flash = { id, text: reply ? 'Approved with your reply. It’s now on the report.' : 'Approved. It’s now on the report.' };
        }
        if (act === 'save') {
          await updateDoc(doc(db, 'comments', id), { approved: true, ...withReply });
          flash = { id, text: !reply ? 'Reply removed.' : saved ? 'Reply updated.' : 'Reply added.' };
        }
        if (act === 'hide') {
          await updateDoc(doc(db, 'comments', id), { approved: false });
          flash = { id, text: 'Hidden from the report. It’s back in Awaiting review.' };
        }
        if (act === 'really-delete') { await deleteDoc(doc(db, 'comments', id)); flash = null; }
        await load();
        if (flash) root.querySelector(`.mod-card[data-id="${CSS.escape(flash.id)}"]`)?.scrollIntoView({ block: 'nearest' });
      } catch (err) {
        console.error(err);
        card.querySelectorAll('button').forEach(b => { b.disabled = false; });
        card.insertAdjacentHTML('beforeend', `<p class="statement-note bad">That didn’t save (${esc(err.code || err.message)}).</p>`);
      }
    });

    // ---- tabs ----
    function currentTab() { try { return sessionStorage.getItem('pp-desk-tab') || 'statements'; } catch (e) { return 'statements'; } }
    function showTab(name) {
      root.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === name)));
      root.querySelectorAll('[data-panel]').forEach(p => { p.hidden = p.dataset.panel !== name; });
      try { sessionStorage.setItem('pp-desk-tab', name); } catch (e) {}
    }
    root.addEventListener('click', e => { const t = e.target.closest('[data-tab]'); if (t) showTab(t.dataset.tab); });

    // ---- incident submissions ----
    let subFlash = null;
    async function loadSubmissions() {
      const { db, collection, getDocs } = await firebase();
      let all;
      try {
        all = (await getDocs(collection(db, 'submissions'))).docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (err) {
        console.error(err);
        root.querySelector('[data-list="sub-new"]').innerHTML = `<p class="statements-empty">Submissions couldn’t be loaded (${esc(err.code || err.message)}). If this says permission-denied, the latest firestore.rules haven’t been published in Firebase yet.</p>`;
        root.querySelector('[data-list="sub-done"]').innerHTML = '';
        return;
      }
      all.sort((a, b) => byDate(b, a));
      const fresh = all.filter(x => (x.status || 'new') === 'new'), done = all.filter(x => (x.status || 'new') !== 'new');
      if (subFlash && !all.some(x => x.id === subFlash.id)) subFlash = null;
      fillSubs('sub-new', fresh, 'No new submissions.');
      fillSubs('sub-done', done.slice(0, 60), 'Nothing handled yet.');
      root.querySelector('[data-count="sub-new"]').textContent = `(${fresh.length})`;
      root.querySelector('[data-count="sub-done"]').textContent = `(${done.length})`;
      root.querySelector('[data-count="new-badge"]').textContent = fresh.length ? `(${fresh.length})` : '';
    }
    function fillSubs(listName, items, empty) {
      const box = root.querySelector(`[data-list="${listName}"]`);
      box.innerHTML = items.length ? items.map(x => {
        const status = x.status || 'new';
        const subject = encodeURIComponent('Your story for The Paranormal Pad');
        return `<article class="statement-card sub-card" data-sid="${esc(x.id)}">
          <header><b>${esc(x.where || 'Place not given')}</b><time>${esc(when(x.createdAt))}</time></header>
          <div class="sub-who">
            <b class="mod-name">${esc(x.name || 'No name given')}</b>
            ${x.anonymous ? '<span class="stamp red small">Keep identity confidential</span>' : ''}
            ${status !== 'new' ? `<span class="sub-status">${esc(SUB_STATUS[status] || status)}</span>` : ''}
          </div>
          <p class="sub-email"><a href="mailto:${esc(x.email)}?subject=${subject}">${esc(x.email)}</a></p>
          <p>${esc(x.story)}</p>
          <div class="field"><label for="note-${esc(x.id)}">Private note (only you see this)</label>
            <textarea id="note-${esc(x.id)}" maxlength="3000" placeholder="e.g. Replied 4 Oct, waiting for photos" data-saved="${esc(x.note || '')}">${esc(x.note || '')}</textarea></div>
          <div class="mod-actions">
            <a class="btn dark" href="mailto:${esc(x.email)}?subject=${subject}">Reply by email</a>
            ${status === 'new'
              ? '<button class="btn light" type="button" data-sact="replied">Mark replied</button><button class="btn light" type="button" data-sact="report">Turned into a report</button><button class="btn light" type="button" data-sact="archived">Archive</button>'
              : '<button class="btn light" type="button" data-sact="new">Move back to New</button>'}
            <button class="btn light" type="button" data-sact="note" disabled>Save note</button>
            <button class="btn light" type="button" data-sact="delete">Delete</button>
            <span class="mod-confirm" hidden>Delete for good? <button class="btn blood" type="button" data-sact="really-delete">Yes, delete</button><button class="btn light" type="button" data-sact="cancel">Cancel</button></span>
          </div>
          ${subFlash?.id === x.id ? `<p class="statement-note" role="status">${esc(subFlash.text)}</p>` : ''}
        </article>`;
      }).join('') : `<p class="statements-empty">${empty}</p>`;
    }
    root.addEventListener('input', e => {
      const card = e.target.closest('.sub-card'); if (!card) return;
      const t = card.querySelector('textarea');
      card.querySelector('[data-sact="note"]').disabled = t.value.trim() === (t.dataset.saved || '');
    });
    root.addEventListener('click', async e => {
      const btn = e.target.closest('.sub-card [data-sact]'); if (!btn) return;
      const card = btn.closest('.sub-card'), id = card.dataset.sid, act = btn.dataset.sact;
      const confirmBox = card.querySelector('.mod-confirm');
      if (act === 'delete') { confirmBox.hidden = false; return; }
      if (act === 'cancel') { confirmBox.hidden = true; return; }
      const { db, doc, updateDoc, deleteDoc, serverTimestamp } = await firebase();
      card.querySelectorAll('button').forEach(b => { b.disabled = true; });
      try {
        if (act === 'really-delete') { await deleteDoc(doc(db, 'submissions', id)); subFlash = null; }
        else if (act === 'note') {
          await updateDoc(doc(db, 'submissions', id), { note: card.querySelector('textarea').value.trim(), updatedAt: serverTimestamp() });
          subFlash = { id, text: 'Note saved.' };
        } else {
          await updateDoc(doc(db, 'submissions', id), { status: act, updatedAt: serverTimestamp() });
          subFlash = { id, text: act === 'new' ? 'Moved back to New.' : `Marked: ${SUB_STATUS[act]}.` };
        }
        await loadSubmissions();
        if (subFlash) root.querySelector(`.sub-card[data-sid="${CSS.escape(subFlash.id)}"]`)?.scrollIntoView({ block: 'nearest' });
      } catch (err) {
        console.error(err);
        card.querySelectorAll('button').forEach(b => { b.disabled = false; });
        card.insertAdjacentHTML('beforeend', `<p class="statement-note bad">That didn’t save (${esc(err.code || err.message)}).</p>`);
      }
    });
  }

  return { mount, mountModerator, enabled, isSecretWord, saveSubmission };
})();
