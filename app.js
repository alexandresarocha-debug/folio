(() => {
'use strict';
/* ---------- Icons ---------- */
const P = (d, extra='') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;
const I = {
  search: P('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  bookmark: P('<path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4-6 4z"/>'),
  bookmarkFill: P('<path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4-6 4z" fill="currentColor"/>'),
  check: P('<path d="m5 12.5 4.5 4.5L19 7.5"/>', 'stroke-width="2.2"'),
  close: P('<path d="m6 9 6 6 6-6"/>', 'stroke-width="2"'),
  x: P('<path d="M18 6 6 18M6 6l12 12"/>'),
  back: P('<path d="m15 18-6-6 6-6"/>', 'stroke-width="2"'),
  right: P('<path d="m9 18 6-6-6-6"/>', 'stroke-width="2"'),
  ext: P('<path d="M7 17 17 7M8 7h9v9"/>'),
  flame: P('<path d="M12 2.5c.5 3.5 4.5 5.5 4.5 10a4.5 4.5 0 0 1-9 0c0-2 1-3.5 2-4.5 0 1.5.8 2.6 1.8 3C10.8 8.5 11 5 12 2.5Z" fill="currentColor" stroke="none"/>'),
  compass: P('<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>'),
  home: P('<path d="M4 10.5 12 4l8 6.5"/><path d="M6.5 9.8V20h11V9.8"/>'),
  layers: P('<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>'),
  chart: P('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
  book: P('<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/>'),
  paper: P('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>'),
  globe: P('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'),
  warn: P('<path d="M10.3 4.2 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z"/><path d="M12 9.5v4M12 17h.01"/>'),
  dive: P('<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/>'),
  arrowR: P('<path d="M5 12h14M13 6l6 6-6 6"/>', 'stroke-width="2"'),
  swipe: P('<path d="M7 12h12M15 8l4 4-4 4M5 8v8"/>'),
  sparkle: P('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>'),
  play: P('<path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor" stroke="none"/>'),
  pause: P('<path d="M6.5 5h3.2v14H6.5Zm8 0H17.7v14h-3.2Z" fill="currentColor" stroke="none"/>'),
};

/* ---------- Utils ---------- */
const $ = (s, r=document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad = n => String(n).padStart(2,'0');
const dayKey = (d=new Date()) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate()+n); return x; };
const haptic = (ms=8) => { try { navigator.vibrate && navigator.vibrate(ms); } catch(e){} };
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function syncInert() {
  const covered = ['#reader', '#search', '#push', '#work'].some(s => $(s).getAttribute('aria-hidden') === 'false');
  if (covered) $('#app').setAttribute('inert', ''); else $('#app').removeAttribute('inert');
}
function beginScreen(el) { if (el.dataset.booted) el.dataset.settled = '1'; }
function endScreen(el) { el.dataset.booted = '1'; bindChips(el); }
function bindChips(root) {
  if (!root) return;
  root.querySelectorAll('.chips').forEach(row => {
    const update = () => {
      const max = row.scrollWidth - row.clientWidth;
      const overflow = max > 4;
      row.classList.toggle('fade-l', overflow && row.scrollLeft > 4);
      row.classList.toggle('fade-r', overflow && row.scrollLeft < max - 4);
    };
    row.addEventListener('scroll', update, { passive: true });
    requestAnimationFrame(update);
  });
}
const hash = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const wordCount = s => String(s || '').trim().split(/\s+/).filter(Boolean).length;
const minutes = c => Math.max(1, Math.ceil((wordCount(c.summary) + wordCount(c.deepDive)) / 200));
/* List previews stay plain prose: drop paragraph breaks and "- " markers. */
function previewText(text) {
  return String(text || '').split('\n').map(line => line.replace(/^\s*-\s+/, '')).join(' ').replace(/\s+/g, ' ').trim();
}
const yearStr = y => y < 0 ? `c. ${-y} BC` : String(y);

/* ---------- State ---------- */
const KEY = 'folio.v1';
const defaults = { saved:{}, read:{}, days:{}, goal:3, theme:'dark', seed: Math.floor(Math.random()*1e9), hinted:false, filter:'all' };
let S;
try { S = Object.assign({}, defaults, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch(e) { S = {...defaults}; }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(e){} };
save();

let D = null, byId = {}, topicById = {}, pathById = {};
const color = t => `var(--${t})`;
/* A card may list several topics. Older cards have only `topic`. */
function cardTopics(c) {
  const raw = Array.isArray(c.topics) && c.topics.length ? c.topics : (c.topic ? [c.topic] : []);
  const ids = raw.filter(id => topicById[id]);
  return ids.length ? ids : (c.topic && topicById[c.topic] ? [c.topic] : []);
}
function primaryTopic(c) { return cardTopics(c)[0] || c.topic; }
function hasTopic(c, id) { return id === 'all' || cardTopics(c).includes(id); }
function topicLine(c, full) {
  return cardTopics(c).map(id => full ? topicById[id].name : topicById[id].short).join(' · ');
}
function topicTags(c, full) {
  return cardTopics(c).map(id => `<span class="tag" style="color:${color(id)}">${esc(full ? topicById[id].name : topicById[id].short)}</span>`).join('<span class="sep">·</span>');
}

function streak() {
  const met = k => (S.days[k] || 0) >= S.goal;
  let d = new Date(), n = 0;
  if (!met(dayKey(d))) d = addDays(d, -1);
  while (met(dayKey(d))) { n++; d = addDays(d, -1); }
  return n;
}
function bestStreak() {
  const keys = Object.keys(S.days).filter(k => S.days[k] >= S.goal).sort();
  let best = 0, run = 0, prev = null;
  for (const k of keys) {
    const cur = new Date(k + 'T12:00:00');
    run = prev && Math.round((cur - prev) / 864e5) === 1 ? run + 1 : 1;
    best = Math.max(best, run); prev = cur;
  }
  return Math.max(best, streak());
}
const todayCount = () => S.days[dayKey()] || 0;

function setRead(id, val) {
  const was = !!S.read[id];
  if (val === was) return;
  const k = dayKey();
  if (val) {
    S.read[id] = k; S.days[k] = (S.days[k] || 0) + 1;
    if (S.days[k] === S.goal) setTimeout(() => toast(I.flame, `Daily goal hit · ${streak()}-day streak`), 250), haptic([10,60,14]);
    else haptic(10);
  } else {
    const rk = S.read[id]; delete S.read[id];
    if (S.days[rk]) S.days[rk] = Math.max(0, S.days[rk] - 1);
    haptic(6);
  }
  save();
}
function toggleSave(id) {
  if (S.saved[id]) delete S.saved[id]; else S.saved[id] = Date.now();
  haptic(S.saved[id] ? 12 : 6); save();
  return !!S.saved[id];
}

/* ---------- Toast ---------- */
let toastT;
function toast(icon, msg) {
  const t = $('#toast');
  t.innerHTML = `<span class="ti">${icon}</span>${esc(msg)}`;
  t.classList.add('show'); clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ---------- Art ---------- */
function pathArt(p) {
  const r = rng(hash(p.id)); const c = color(p.topic); let s = '';
  if (p.topic === 'history') {
    for (let i = 0; i < 5; i++) { const x = 20 + i * 28; s += `<path d="M${x} 170 V${70 + r()*20} a14 14 0 0 1 28 0 V170" stroke="${c}" stroke-opacity="${.18 + i*.1}" fill="none" stroke-width="2"/>`; }
    s += `<circle cx="${100 + r()*30}" cy="${40 + r()*20}" r="18" fill="${c}" fill-opacity=".35"/>`;
  } else if (p.topic === 'psychology') {
    for (let i = 0; i < 4; i++) s += `<circle cx="${70 + r()*50}" cy="${60 + r()*50}" r="${26 + r()*34}" stroke="${c}" stroke-opacity="${.2 + r()*.35}" fill="${c}" fill-opacity="${r()*.08}" stroke-width="2"/>`;
  } else if (p.topic === 'biology') {
    for (let i = 0; i < 6; i++) {
      const cx = 36 + r() * 98, cy = 36 + r() * 98, rx = 16 + r() * 18;
      s += `<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${(rx * 0.62).toFixed(1)}" transform="rotate(${(r()*70-20).toFixed(0)} ${cx.toFixed(1)} ${cy.toFixed(1)})" stroke="${c}" stroke-opacity="${.25 + r()*.4}" fill="${c}" fill-opacity="${r()*.1}" stroke-width="2"/>`;
    }
  } else {
    for (let i = 0; i < 7; i++) { const w = 40 + r()*90; s += `<rect x="${40}" y="${30 + i*17}" width="${w}" height="5" rx="2.5" fill="${c}" fill-opacity="${.15 + r()*.3}"/>`; }
    s += `<path d="M150 20 C110 60 100 110 60 160" stroke="${c}" stroke-opacity=".55" stroke-width="2" fill="none"/>`;
  }
  return `<svg class="art" viewBox="0 0 170 170">${s}</svg>`;
}
const emptyArt = (kind) => kind === 'saved'
  ? `<svg class="art" viewBox="0 0 120 120" fill="none"><circle cx="60" cy="60" r="56" fill="var(--surface)"/><rect x="34" y="30" width="44" height="58" rx="6" fill="var(--surface-3)" transform="rotate(-8 56 59)"/><path d="M46 28h28a4 4 0 0 1 4 4v58l-18-11-18 11V32a4 4 0 0 1 4-4Z" fill="var(--surface-2)" stroke="var(--warn)" stroke-width="2.4" stroke-linejoin="round"/><path d="m90 30 3 6 6 3-6 3-3 6-3-6-6-3 6-3z" fill="var(--warn)" opacity=".8"/></svg>`
  : `<svg class="art" viewBox="0 0 120 120" fill="none"><circle cx="60" cy="60" r="56" fill="var(--surface)"/><circle cx="54" cy="54" r="22" stroke="var(--muted)" stroke-width="4"/><path d="m71 71 16 16" stroke="var(--muted)" stroke-width="5" stroke-linecap="round"/></svg>`;

/* ---------- Components ---------- */
function cardMeta(c) {
  const bits = [`<span>${minutes(c)} min</span>`, `<i class="dot"></i>`, `<span>${esc(c.source.author.split(/,|&| and /)[0].trim())}</span>`];
  return `<div class="meta">${bits.join('')}<span class="grow"></span>${S.saved[c.id] ? `<span class="badge sv">${I.bookmarkFill}</span>` : ''}${S.read[c.id] ? `<span class="badge ok">${I.check}</span>` : ''}</div>`;
}
function ideaCard(c, i, seq) {
  return `<button class="card${S.read[c.id] ? ' read' : ''}" style="--c:${color(primaryTopic(c))};--i:${Math.min(i,10)}" data-open="${c.id}" data-seq="${seq}">
    <div class="kicker topic-tags">${topicTags(c)}${tierLabel(c.tier)}</div>
    <h4>${esc(c.title)}</h4>
    <p>${esc(previewText(c.summary))}</p>
    ${cardMeta(c)}
  </button>`;
}
const SEQS = {}; let seqN = 0;
const regSeq = ids => { const k = 's' + (++seqN); SEQS[k] = ids; return k; };

/* ---------- Paths as courses ----------
   A path's `order` array ({id, tier}) is the sequence. Without it, cards stay in
   cards.json order. Tier on the path entry wins over the card's own tier. No tier
   anywhere means one ungrouped list. A path is "being built" when it has fewer
   than 3 cards, or when it has some tiers but not all of 1, 2 and 3. Completion
   is derived from read marks, not stored separately. */
function validTier(v) { return v === 1 || v === 2 || v === 3 ? v : null; }
function tierLabel(tier) {
  const t = validTier(tier);
  return t ? `<span class="tier-with"><span class="sep">·</span><span class="tier-tag">Tier ${t}</span></span>` : '';
}
const TIER_LEAD = { 1: 'The basic idea', 2: 'How it works', 3: 'Open questions' };
function pathEntries(p) {
  if (!p) return [];
  if (Array.isArray(p.order) && p.order.length) {
    const seen = new Set();
    const out = [];
    for (const item of p.order) {
      if (!item || typeof item.id !== 'string' || seen.has(item.id)) continue;
      const card = byId[item.id];
      if (!card || !(card.paths || []).includes(p.id)) continue;
      seen.add(item.id);
      out.push({ card, tier: validTier(item.tier) || validTier(card.tier) });
    }
    return out;
  }
  return D.cards.filter(c => (c.paths || []).includes(p.id)).map(card => ({ card, tier: validTier(card.tier) }));
}
function entriesGrouped(entries) { return entries.some(e => e.tier); }
function courseEntries(entries) {
  if (!entriesGrouped(entries)) return entries;
  const out = [];
  for (const t of [1, 2, 3]) out.push(...entries.filter(e => e.tier === t));
  out.push(...entries.filter(e => !e.tier));
  return out;
}
function pathIsThin(entries) {
  if (entries.length < 3) return true;
  if (!entriesGrouped(entries)) return false;
  const have = new Set(entries.map(e => e.tier).filter(Boolean));
  return have.size < 3;
}
function pathProgress(p) {
  const entries = pathEntries(p);
  const done = entries.filter(e => S.read[e.card.id]).length;
  const thin = pathIsThin(entries);
  const allDone = entries.length > 0 && done === entries.length;
  const status = thin ? 'Being built' : allDone ? 'Finished' : done ? 'In progress' : 'Not started';
  return { entries, done, total: entries.length, thin, allDone, status };
}
function tierFor(card, pathId) {
  if (pathId && pathById[pathId]) {
    const hit = pathEntries(pathById[pathId]).find(e => e.card.id === card.id);
    if (hit && hit.tier) return hit.tier;
  }
  return validTier(card.tier);
}
function resumePath() {
  if (S.lastPath && pathById[S.lastPath]) return pathById[S.lastPath];
  let best = null, bestDone = 0;
  for (const p of D.paths) {
    const prog = pathProgress(p);
    if (prog.done > 0 && !prog.allDone && prog.done >= bestDone) { best = p; bestDone = prog.done; }
  }
  return best;
}
function relatedPath(p) {
  const others = D.paths.filter(x => x.id !== p.id);
  const score = x => {
    const prog = pathProgress(x);
    let s = x.topic === p.topic ? 4 : 0;
    if (!prog.thin && !prog.allDone) s += 2;
    else if (!prog.allDone) s += 1;
    return s;
  };
  others.sort((a, b) => score(b) - score(a) || D.paths.indexOf(a) - D.paths.indexOf(b));
  return others[0] || null;
}
function stepButton(e, i, seq, pathId) {
  const c = e.card;
  return `<li><button class="step${S.read[c.id] ? ' done' : ''}" style="--c:${color(primaryTopic(c))}" data-open="${c.id}" data-seq="${seq}" data-path-read="${pathId}">
    <span class="n">${S.read[c.id] ? I.check : i + 1}</span>
    <span><h4>${esc(c.title)}</h4><p>${esc(c.source.author)} · ${yearStr(c.source.year)} · ${minutes(c)} min</p></span></button></li>`;
}
function stepsHTML(entries, seq, pathId, grouped) {
  if (!grouped) return `<ol class="steps">${entries.map((e, i) => stepButton(e, i, seq, pathId)).join('')}</ol>`;
  let html = '', n = 0;
  for (const t of [1, 2, 3]) {
    const group = entries.filter(e => e.tier === t);
    if (!group.length) continue;
    html += `<div class="tier-h"><h2>Tier ${t}</h2><span>${TIER_LEAD[t]}</span></div><ol class="steps">${group.map(e => stepButton(e, n++, seq, pathId)).join('')}</ol>`;
  }
  const rest = entries.filter(e => !e.tier);
  if (rest.length) html += `<div class="tier-h"><h2>Also on this path</h2></div><ol class="steps">${rest.map(e => stepButton(e, n++, seq, pathId)).join('')}</ol>`;
  return html;
}
function pathCard(p, i) {
  const prog = pathProgress(p);
  return `<button class="path" style="--c:${color(p.topic)};--i:${i}" data-path="${p.id}">
    <span class="tint"></span>${pathArt(p)}
    <div class="kicker${prog.thin ? ' built' : ''}">${esc(prog.status)}</div>
    <h3>${esc(p.title)}</h3><p>${esc(p.blurb)}</p>
    <div class="bar"><i style="width:${prog.total ? prog.done / prog.total * 100 : 0}%"></i></div>
    <div class="foot"><span>${prog.done} of ${prog.total}</span></div>
  </button>`;
}

/* ---------- Home ---------- */
function renderHome() {
  const el = $('#s-home');
  beginScreen(el);
  const st = streak();
  const resume = resumePath();
  const resumeProg = resume ? pathProgress(resume) : null;
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long' });
  let i = 0;
  const tc = todayCount(), goalN = S.goal, goalDone = tc >= goalN;
  el.innerHTML = `
    <header class="topbar">
      <div><div class="eyebrow">${esc(dateStr)}</div><h1 class="h-title">Paths</h1></div>
      <div class="row">
        <button class="pill${st ? ' hot' : ''}" data-tab="progress" aria-label="${st} day streak">${I.flame}${st}</button>
        <button class="icon-btn" data-act="search" aria-label="Search">${I.search}</button>
      </div>
    </header>
    <p class="today-goal${goalDone ? ' done' : ''}">Today: ${tc} of ${goalN} ideas${goalDone ? ' \u2713' : ''}</p>
    ${resume ? `<button class="resume" style="--c:${color(resume.topic)}" data-path="${resume.id}">
      <span class="resume-copy"><div class="kicker">Continue</div><h3>${esc(resume.title)}</h3><p>${resumeProg.done} of ${resumeProg.total} · ${esc(resumeProg.status)}</p></span>
      <span class="go">${I.right}</span>
    </button>` : ''}
    <p class="intro">Read a handful of linked ideas in order and see how the arguments talk to each other.</p>
    ${D.topics.map(t => {
      const paths = D.paths.filter(p => p.topic === t.id);
      if (!paths.length) return '';
      return `<div class="section-h"><h2 style="color:${color(t.id)}">${esc(t.name)}</h2></div>
        <div class="paths">${paths.map(p => pathCard(p, i++)).join('')}</div>`;
    }).join('')}`;
  endScreen(el);
}

/* ---------- All cards (the old Discover deck) ---------- */
function feedOrder() {
  const r = rng(S.seed); const arr = D.cards.map(c => [r(), c]);
  arr.sort((a,b) => a[0]-b[0]);
  return arr.map(x => x[1]);
}
function renderCards() {
  const el = $('#s-cards');
  beginScreen(el);
  const f = S.filter;
  const list = feedOrder().filter(c => hasTopic(c, f));
  const unread = list.filter(c => !S.read[c.id]);
  const ordered = [...unread, ...list.filter(c => S.read[c.id])];
  const seq = regSeq(ordered.map(c => c.id));
  el.innerHTML = `
    <header class="topbar">
      <div><div class="eyebrow">The library</div><h1 class="h-title">All cards</h1></div>
      <button class="icon-btn" data-act="search" aria-label="Search">${I.search}</button>
    </header>
    <div class="chips" role="tablist">
      ${[{id:'all', short:'All ideas'}, ...D.topics].map(t => `<button class="chip${f === t.id ? ' on' : ''}" data-filter="${t.id}" role="tab" aria-selected="${f === t.id}" ${t.id !== 'all' ? `style="${f === t.id ? '' : `color:${color(t.id)}`}"` : ''}>${t.id !== 'all' ? '<i></i>' : ''}${esc(t.short)}</button>`).join('')}
    </div>
    <div class="section-h"><h2>${f === 'all' ? 'All ideas' : esc(topicById[f].name)}</h2><span>${list.length - unread.length} of ${list.length} read</span></div>
    <div class="cards">${ordered.map((c, i) => ideaCard(c, i, seq)).join('')}</div>
    <p class="foot-note">${D.cards.length} ideas · every source links to the real book or paper.<br>More are added to the library over time.</p>`;
  endScreen(el);
}

/* ---------- Path detail ---------- */
function openPath(id, push=true) {
  const p = pathById[id];
  if (!p) return;
  const prog = pathProgress(p);
  const entries = courseEntries(prog.entries);
  const seq = regSeq(entries.map(e => e.card.id));
  const next = entries.find(e => !S.read[e.card.id]) || entries[0];
  const grouped = entriesGrouped(entries);
  const mins = entries.reduce((a, e) => a + minutes(e.card), 0);
  const action = prog.done === 0 ? 'Start' : prog.allDone ? 'Read again' : 'Continue';
  if (S.lastPath !== id) { S.lastPath = id; save(); }
  const el = $('#push');
  el.dataset.path = id;
  el.innerHTML = `
    <button class="icon-btn back" data-act="pop" aria-label="Back">${I.back}</button>
    <div class="hero" style="--c:${color(p.topic)}"><span class="tint"></span>
      <div class="eyebrow" style="color:${color(p.topic)}">${esc(topicById[p.topic].name)}</div>
      <h1>${esc(p.title)}</h1>
      <p class="lede">${esc(p.blurb)}</p>
      ${prog.thin ? '<p class="built-note">Still being built. Every idea that\u2019s here is open.</p>' : ''}
      <div class="bar" style="--c:${color(p.topic)}"><i style="width:${prog.total ? prog.done / prog.total * 100 : 0}%"></i></div>
      <div class="row path-stat"><span>${prog.done} of ${prog.total}</span><span>${esc(prog.status)}</span><span>~${mins} min</span></div>
      ${next ? `<button class="btn block" data-open="${next.card.id}" data-seq="${seq}" data-path-read="${p.id}">${action} ${I.arrowR}</button>` : ''}
    </div>
    ${stepsHTML(entries, seq, p.id, grouped)}`;
  el.setAttribute('aria-hidden', 'false');
  syncInert();
  if (push) { el.scrollTop = 0; requestAnimationFrame(() => el.classList.add('open')); pushHist('path'); }
  else if (!el.classList.contains('open')) { el.scrollTop = 0; requestAnimationFrame(() => el.classList.add('open')); }
}
function closePath() { const el = $('#push'); el.classList.remove('open'); el.setAttribute('aria-hidden','true'); delete el.dataset.path; syncInert(); }

/* ---------- Saved ---------- */
function renderSaved() {
  const el = $('#s-saved');
  beginScreen(el);
  const ids = Object.keys(S.saved).filter(id => byId[id]).sort((a,b) => S.saved[b] - S.saved[a]);
  const seq = regSeq(ids);
  el.innerHTML = `
    <header class="topbar"><div><div class="eyebrow">Your library</div><h1 class="h-title">Saved</h1></div>${ids.length ? `<span class="pill">${I.bookmarkFill.replace('<svg','<svg style="color:var(--warn)"')}${ids.length}</span>` : ''}</header>
    ${ids.length ? `<div class="cards stack">${ids.map((id,i) => ideaCard(byId[id], i, seq)).join('')}</div>`
    : `<div class="empty">${emptyArt('saved')}<h3>Nothing saved yet</h3><p>Tap the bookmark on any idea and it will wait for you here, even offline.</p><button class="btn" data-tab="cards">Browse ideas ${I.arrowR}</button></div>`}`;
  endScreen(el);
}

/* ---------- Progress ---------- */
function renderProgress() {
  const el = $('#s-progress');
  beginScreen(el);
  const st = streak(), best = bestStreak(), total = Object.keys(S.read).filter(id => byId[id]).length;
  const savedN = Object.keys(S.saved).filter(id => byId[id]).length;
  const week = [...Array(7)].map((_, i) => { const d = addDays(new Date(), i - 6); const k = dayKey(d); const n = S.days[k] || 0; return { l: ['Su','Mo','Tu','We','Th','Fr','Sa'][d.getDay()], n, today: i === 6 }; });
  el.innerHTML = `
    <header class="topbar"><div><div class="eyebrow">Your reading</div><h1 class="h-title">Progress</h1></div></header>
    <div class="stats">
      <div class="stat big"><div class="flame">${I.flame}</div><div><b>${st}</b><span>${st === 1 ? 'day' : 'days'} streak · best ${best}</span></div></div>
      <div class="week stat" style="display:flex">${week.map(w => `<div class="${w.today ? 'today' : ''}"><i class="${w.n >= S.goal ? 'full' : w.n ? 'part' : ''}">${w.n >= S.goal ? I.check : ''}</i>${w.l}</div>`).join('')}</div>
      <div class="stat"><b>${total}</b><span>ideas read</span></div>
      <div class="stat"><b>${savedN}</b><span>saved</span></div>
    </div>
    <div class="section-h"><h2>By topic</h2></div>
    <div class="group">${D.topics.map(t => { const cs = D.cards.filter(c => hasTopic(c, t.id)); const n = cs.filter(c => S.read[c.id]).length;
      const pct = cs.length ? n / cs.length * 100 : 0;
      return `<div class="tp" style="--c:${color(t.id)}"><div class="row"><b style="font-weight:600">${esc(t.name)}</b><span>${n}/${cs.length}</span></div><div class="bar"><i style="width:${pct}%"></i></div></div>`; }).join('')}</div>
    <div class="section-h"><h2>Settings</h2></div>
    <div class="group">
      <div class="item"><span class="lbl">Daily goal<small>Ideas per day to keep a streak</small></span><div class="seg" data-seg="goal">${[1,3,5,10].map(g => `<button class="${S.goal === g ? 'on' : ''}" data-goal="${g}">${g}</button>`).join('')}</div></div>
      <div class="item"><span class="lbl">Appearance</span><div class="seg">${['dark','light'].map(t => `<button class="${S.theme === t ? 'on' : ''}" data-theme-set="${t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div></div>
      <button class="item" data-act="reset"><span class="lbl danger">Reset progress</span></button>
    </div>
    <p class="foot-note">Folio stores everything on this device. No account, no tracking.<br>Psychology ideas flag replication concerns where the evidence is shaky.<br>v1 · ${D.cards.length} ideas · ${D.paths.length} paths</p>`;
  endScreen(el);
}

/* ---------- Search ---------- */
function openSearch() {
  const el = $('#search');
  el.innerHTML = `<div class="search-head"><label class="field">${I.search}<input type="search" placeholder="Ideas, authors, books…" autocomplete="off" enterkeyhint="search" aria-label="Search ideas"></label><button class="cancel" data-act="closeSearch">Cancel</button></div><div class="search-body" id="sres"></div>`;
  el.classList.add('open'); el.setAttribute('aria-hidden','false'); syncInert();
  const inp = $('input', el);
  inp.addEventListener('input', () => runSearch(inp.value));
  runSearch('');
  setTimeout(() => inp.focus(), 60);
  pushHist('search');
}
function runSearch(q) {
  const box = $('#sres'); q = q.trim();
  if (!q) {
    box.innerHTML = `<div class="section-h"><h2>Browse by topic</h2></div><div class="chips" style="margin:0;padding:0;flex-wrap:wrap">${D.topics.map(t => `<button class="chip" style="color:${color(t.id)}" data-sq="${esc(t.short)}"><i></i>${esc(t.short)}</button>`).join('')}</div>
      <div class="section-h"><h2>Try</h2></div><div class="chips" style="margin:0;padding:0;flex-wrap:wrap">${['Kahneman','Rome','replication','Barthes','plague','novel','habits','Orwell'].map(s => `<button class="chip" data-sq="${s}">${s}</button>`).join('')}</div>`;
    bindChips(box);
    return;
  }
  const terms = q.toLowerCase().split(/\s+/);
  const scored = D.cards.map(c => {
    const deeper = (c.goDeeper || []).map(w => w.authors + ' ' + w.title).join(' ');
    const hay = { t: c.title.toLowerCase(), a: (c.source.author + ' ' + c.source.title + ' ' + deeper).toLowerCase(), b: (c.summary + ' ' + c.deepDive + ' ' + topicLine(c, true)).toLowerCase() };
    let s = 0;
    for (const w of terms) { const ts = hay.t.includes(w) ? 5 : 0, as = hay.a.includes(w) ? 3 : 0, bs = hay.b.includes(w) ? 1 : 0; if (!ts && !as && !bs) return [0, c]; s += ts + as + bs; }
    return [s, c];
  }).filter(x => x[0] > 0).sort((a,b) => b[0] - a[0]).map(x => x[1]);
  const seq = regSeq(scored.map(c => c.id));
  const re = new RegExp('(' + terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'gi');
  const hl = s => esc(s).replace(re, '<mark>$1</mark>');
  box.innerHTML = scored.length ? `<div class="section-h"><h2>${scored.length} result${scored.length > 1 ? 's' : ''}</h2></div><div class="cards">${scored.map((c,i) => `<button class="card" style="--c:${color(primaryTopic(c))};--i:${Math.min(i,8)}" data-open="${c.id}" data-seq="${seq}"><div class="kicker topic-tags">${topicTags(c)}${tierLabel(c.tier)}</div><h4>${hl(c.title)}</h4><p>${hl(c.source.author)} · ${esc(c.source.title)}</p></button>`).join('')}</div>`
    : `<div class="empty">${emptyArt('search')}<h3>No matches</h3><p>Nothing for \u201c${esc(q)}\u201d yet. Try an author, a book or a broader word.</p></div>`;
  bindChips(box);
}
function closeSearch() { const el = $('#search'); el.classList.remove('open'); el.setAttribute('aria-hidden','true'); syncInert(); document.activeElement && document.activeElement.blur(); }

/* ---------- Reader ---------- */
let R = { ids: [], idx: 0, pathId: null, mode: 'card' };
function para(text) {
  const raw = String(text || '');
  // Explicit breaks are the layout. Sentence splitting is only for one flat paragraph.
  if (raw.includes('\n')) return blocksHTML(raw);
  const sents = raw.match(/[^.!?]+[.!?]+(\s|$)/g) || [raw];
  const n = sents.length, parts = n > 9 ? 3 : n > 4 ? 2 : 1, per = Math.ceil(n / parts), out = [];
  for (let i = 0; i < n; i += per) out.push(sents.slice(i, i + per).join('').trim());
  return out.map(p => `<p>${esc(p)}</p>`).join('');
}
function blocksHTML(raw) {
  const blocks = raw.split(/\n\n+/);
  return blocks.map(block => {
    const lines = block.split('\n').map(line => line.trim()).filter(Boolean);
    let html = '', items = [];
    const flush = () => {
      if (!items.length) return;
      html += `<ul>${items.map(item => `<li>${esc(item)}</li>`).join('')}</ul>`;
      items = [];
    };
    for (const line of lines) {
      if (line.startsWith('- ')) items.push(line.slice(2));
      else { flush(); html += `<p>${esc(line)}</p>`; }
    }
    flush();
    return html;
  }).join('');
}
function refIcon(r) { const url = r.url || ''; if (/doi\.org/.test(url)) return I.paper; if (r.kind === 'paper') return I.paper; if (/wikipedia\.org/.test(url)) return I.globe; return I.book; }
function refKind(r) { return r.kind === 'book' ? 'Book' : /wikipedia\.org/.test(r.url) ? 'Overview' : /doi\.org/.test(r.url) ? 'Paper' : 'Read'; }
const DEEP_TIER = { 1: 'An overview', 2: 'The key studies', 3: 'Methods and critiques' };
function workRef(c, w) {
  return `<button class="ref work-ref" type="button" data-work="${esc(w.id)}" data-card="${esc(c.id)}"><span class="ty">${w.type === 'paper' ? I.paper : I.book}</span><span class="tx"><b>${esc(w.title)}</b><span><em>${w.type === 'paper' ? 'Paper' : 'Book'}</em>${esc(w.authors)} · ${yearStr(w.year)}</span></span><span class="go">${I.right}</span></button>`;
}
function goDeeperHTML(c) {
  const works = c.goDeeper || [];
  if (!works.length) return '';
  const lead = `<section class="further"><h2>Go deeper</h2><p class="further-lead">The main works around this idea. Open one for the concrete evidence, then the link to the original.</p>`;
  if (!works.some(w => validTier(w.tier))) return `${lead}${works.map(w => workRef(c, w)).join('')}</section>`;
  let body = '';
  for (const t of [1, 2, 3]) {
    const group = works.filter(w => validTier(w.tier) === t);
    if (!group.length) continue;
    body += `<h3 class="further-tier">Tier ${t}<span>${DEEP_TIER[t]}</span></h3>${group.map(w => workRef(c, w)).join('')}`;
  }
  const rest = works.filter(w => !validTier(w.tier));
  if (rest.length) body += rest.map(w => workRef(c, w)).join('');
  return `${lead}${body}</section>`;
}
function pageHTML(c) {
  const tier = tierFor(c, R.pathId);
  return `<article class="page" style="--c:${color(primaryTopic(c))}" data-id="${c.id}"><div class="page-in">
    <div class="kicker topic-tags">${topicTags(c, !tier)}${tierLabel(tier)}</div>
    <h1>${esc(c.title)}</h1>
    <a class="byline" href="${esc(c.source.url)}" target="_blank" rel="noopener"><span class="bk">${/doi\.org/.test(c.source.url) ? I.paper : I.book}</span><span><b>${esc(c.source.title)}</b><span>${esc(c.source.author)} · ${yearStr(c.source.year)}</span></span></a>
    ${c.caution ? `<div class="caution">${I.warn}<div><b>Replication note</b>${esc(c.caution)}</div></div>` : ''}
    <div class="prose">${para(c.summary)}</div>
    <div class="deep"><button data-act="deep" aria-expanded="false"><span class="ic">${I.dive}</span><b>Deep dive<small>Nuance, debates and what to watch for</small></b><span class="chev">${I.close}</span></button><div class="body"><div class="prose deep-prose">${para(c.deepDive)}</div></div></div>
    ${goDeeperHTML(c)}
  </div></article>`;
}
let drag = null;
let suppressClick = false;
let progressPage = null;
function updateReadingProgress() {
  const id = R.ids[R.idx];
  const bar = $('#rprog');
  const trackBar = $('#rprog-track');
  if (!id || !bar) return;
  const page = document.querySelector('#track .page[data-id="' + ((window.CSS && CSS.escape) ? CSS.escape(id) : id) + '"]');
  if (!page) return;
  if (progressPage !== page) {
    progressPage = page;
    page.addEventListener('scroll', () => requestAnimationFrame(updateReadingProgress), { passive: true });
  }
  const max = page.scrollHeight - page.clientHeight;
  const p = max <= 1 ? 1 : Math.min(1, Math.max(0, page.scrollTop / max));
  bar.style.width = (p * 100).toFixed(2) + '%';
  if (trackBar) trackBar.setAttribute('aria-valuenow', String(Math.round(p * 100)));
}
function layoutTrack(attempt) {
  if (R.mode === 'finish') return;
  const pager = $('#pager');
  const track = $('#track');
  if (!pager || !track) return;
  const w = Math.round(pager.clientWidth);
  if (!w) { if ((attempt || 0) < 8) requestAnimationFrame(() => layoutTrack((attempt || 0) + 1)); return; }
  const ids = [];
  if (R.idx > 0) ids.push(R.ids[R.idx - 1]);
  ids.push(R.ids[R.idx]);
  if (R.idx < R.ids.length - 1) ids.push(R.ids[R.idx + 1]);
  progressPage = null;
  track.innerHTML = ids.map(id => pageHTML(byId[id])).join('');
  const x = R.idx > 0 ? -w : 0;
  track.style.transition = 'none';
  track.style.transform = `translate3d(${x}px,0,0)`;
  track.getBoundingClientRect();
  updateReadingProgress();
}
function commitSwipe(dir, d) {
  const t = $('#track');
  const w = d.w;
  if (!t || !w || reduceMotion()) {
    R.idx += dir; layoutTrack(); syncReader(); haptic(4); return;
  }
  t.style.transition = 'transform .32s cubic-bezier(.16,1,.3,1)';
  t.style.transform = `translate3d(${d.base - dir * w}px,0,0)`;
  let finished = false;
  const done = (e) => {
    if (finished) return;
    if (e && (e.target !== t || e.propertyName !== 'transform')) return;
    finished = true;
    t.removeEventListener('transitionend', done);
    R.idx += dir; layoutTrack(); syncReader();
  };
  t.addEventListener('transitionend', done);
  setTimeout(done, 420);
  haptic(4);
}
function bindPager(pager) {
  const down = e => {
    if (R.mode === 'finish') return;
    if (e.button != null && e.button !== 0) return;
    const w = Math.round(pager.clientWidth);
    drag = { x: e.clientX, y: e.clientY, dx: 0, dy: 0, lock: null, w, pointerId: e.pointerId, base: R.idx > 0 ? -w : 0 };
    const t = $('#track'); if (t) t.style.transition = 'none';
  };
  const move = e => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    drag.dx = e.clientX - drag.x; drag.dy = e.clientY - drag.y;
    if (!drag.lock) {
      if (Math.abs(drag.dx) < 8 && Math.abs(drag.dy) < 8) return;
      drag.lock = Math.abs(drag.dx) > Math.abs(drag.dy) * 1.15 ? 'x' : 'y';
      if (drag.lock === 'x') { $('#reader').classList.add('dragging'); try { pager.setPointerCapture(e.pointerId); } catch (err) {} }
    }
    if (drag.lock !== 'x') return;
    e.preventDefault();
    let x = drag.base + drag.dx;
    const atStart = R.idx === 0 && drag.dx > 0;
    const atEnd = R.idx === R.ids.length - 1 && drag.dx < 0;
    if (atStart || atEnd) x = drag.base + drag.dx * 0.28;
    const t = $('#track'); if (t) t.style.transform = `translate3d(${x}px,0,0)`;
  };
  const up = e => {
    if (!drag || (e.pointerId != null && e.pointerId !== drag.pointerId)) return;
    const d = drag; drag = null;
    $('#reader').classList.remove('dragging');
    if (d.lock !== 'x') return;
    suppressClick = true;
    const threshold = Math.min(64, d.w * 0.16);
    let dir = 0;
    if (d.dx <= -threshold && R.idx < R.ids.length - 1) dir = 1;
    else if (d.dx >= threshold && R.idx > 0) dir = -1;
    const t = $('#track');
    if (!dir) {
      if (!t) return;
      t.style.transition = reduceMotion() ? 'none' : 'transform .28s cubic-bezier(.16,1,.3,1)';
      t.style.transform = `translate3d(${d.base}px,0,0)`;
      return;
    }
    commitSwipe(dir, d);
  };
  pager.addEventListener('pointerdown', down);
  pager.addEventListener('pointermove', move, { passive: false });
  pager.addEventListener('pointerup', up);
  pager.addEventListener('pointercancel', up);
  pager.addEventListener('click', e => { if (!suppressClick) return; suppressClick = false; e.preventDefault(); e.stopPropagation(); }, true);
}
function openReader(ids, startId, pathId) {
  R.ids = ids; R.idx = Math.max(0, ids.indexOf(startId));
  R.pathId = pathId && pathById[pathId] ? pathId : null;
  R.mode = 'card';
  if (R.pathId) { S.lastPath = R.pathId; save(); }
  const el = $('#reader');
  el.innerHTML = `
    <div class="reader-top"><button class="icon-btn" data-act="closeReader" aria-label="Close">${I.x}</button><div class="count" id="rcount"></div><button class="icon-btn" data-act="share" aria-label="Share">${P('<path d="M12 3v13M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>')}</button><div class="progress" id="rprog-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="Reading progress"><i id="rprog"></i></div></div>
    <div class="pager" id="pager"><div class="track" id="track"></div></div>
    <div class="reader-bar"><button class="icon-btn" id="rsave" data-act="rsave" aria-label="Save">${I.bookmark}</button><div class="mid"><button class="btn" id="rread" data-act="rread"></button></div><button class="icon-btn" id="rnext" data-act="rnext" aria-label="Next idea">${I.right}</button></div>
    ${!S.hinted && ids.length > 1 ? `<div class="hint">${I.swipe} Swipe sideways for the next idea</div>` : ''}`;
  if (!S.hinted && ids.length > 1) { S.hinted = true; save(); }
  layoutTrack();
  bindPager($('#pager'));
  syncReader();
  el.setAttribute('aria-hidden','false');
  syncInert();
  requestAnimationFrame(() => el.classList.add('open'));
  pushHist('reader');
}
function syncReader() {
  if (R.mode === 'finish') {
    const p = R.pathId && pathById[R.pathId];
    const prog = p ? pathProgress(p) : null;
    const el = $('#reader');
    if (p) el.style.setProperty('--c', color(p.topic));
    const count = $('#rcount');
    if (count) count.textContent = prog && prog.allDone && !prog.thin ? 'Finished' : 'End';
    const sv = $('#rsave');
    if (sv) { sv.disabled = true; sv.classList.remove('on'); sv.innerHTML = I.bookmark; }
    const rb = $('#rread');
    if (rb) { rb.className = 'btn'; rb.innerHTML = 'Done'; }
    const next = $('#rnext');
    if (next) { next.disabled = true; next.setAttribute('aria-label', 'Next idea'); }
    return;
  }
  const c = byId[R.ids[R.idx]]; if (!c) return;
  const el = $('#reader');
  el.style.setProperty('--c', color(primaryTopic(c)));
  const count = $('#rcount');
  if (count) count.textContent = R.ids.length > 1 ? `${R.idx + 1} of ${R.ids.length}` : topicLine(c);
  const sv = $('#rsave');
  if (sv) { sv.disabled = false; sv.classList.toggle('on', !!S.saved[c.id]); sv.innerHTML = S.saved[c.id] ? I.bookmarkFill : I.bookmark; sv.setAttribute('aria-pressed', String(!!S.saved[c.id])); }
  const rb = $('#rread');
  if (rb) { const isRead = !!S.read[c.id]; rb.className = 'btn' + (isRead ? ' done' : ''); rb.innerHTML = isRead ? `${I.check} Read` : 'Mark as read'; }
  const next = $('#rnext');
  if (next) {
    next.disabled = R.pathId ? false : R.idx >= R.ids.length - 1;
    next.setAttribute('aria-label', R.pathId ? 'Continue' : 'Next idea');
  }
  updateReadingProgress();
}
function goToIndex(idx) {
  if (idx === R.idx + 1) { readerGo(1); return; }
  R.idx = idx;
  layoutTrack();
  syncReader();
  haptic(4);
}
function showFinish() {
  const p = pathById[R.pathId];
  if (!p) return;
  R.mode = 'finish';
  const prog = pathProgress(p);
  const related = relatedPath(p);
  const complete = prog.allDone && !prog.thin;
  const pager = $('#pager');
  const rel = related ? (() => {
    const rp = pathProgress(related);
    return `<div class="section-h"><h2>Related path</h2></div>
      <button class="path related" style="--c:${color(related.topic)}" data-act="open-related" data-related="${related.id}">
        <span class="tint"></span>${pathArt(related)}
        <div class="kicker${rp.thin ? ' built' : ''}">${esc(rp.status)}</div>
        <h3>${esc(related.title)}</h3><p>${esc(related.blurb)}</p>
        <div class="foot"><span>${rp.done} of ${rp.total}</span></div>
      </button>`;
  })() : '';
  pager.innerHTML = `<div class="page finish-page" style="--c:${color(p.topic)}"><div class="page-in finish">
    <div class="finish-mark" aria-hidden="true">${I.check}</div>
    <div class="eyebrow" style="color:${color(p.topic)}">${complete ? 'Path complete' : prog.thin ? 'Still being built' : 'End of the path'}</div>
    <h1>${esc(p.title)}</h1>
    <p class="lede">${complete
      ? `You read all ${prog.total} ideas. It stays finished on this device.`
      : prog.thin
        ? `You\u2019ve read ${prog.done} of ${prog.total}. This path is still short of a full course, so it stays marked as being built.`
        : `${prog.done} of ${prog.total} read. It counts as finished once every idea is read.`}</p>
    ${!prog.allDone ? `<button class="btn block" data-act="finish-resume">Continue with what\u2019s unread ${I.arrowR}</button>` : ''}
    ${rel}
  </div></div>`;
  syncReader();
  haptic(10);
}
function continuePath() {
  const id = R.ids[R.idx];
  const wasRead = !!(id && S.read[id]);
  if (id && !wasRead) setRead(id, true);
  if (R.pathId) { S.lastPath = R.pathId; save(); }
  let next = -1;
  for (let i = R.idx + 1; i < R.ids.length; i++) if (!S.read[R.ids[i]]) { next = i; break; }
  if (next < 0) {
    for (let i = 0; i < R.idx; i++) if (!S.read[R.ids[i]]) { next = i; break; }
  }
  if (next >= 0) { goToIndex(next); return; }
  if (wasRead && R.idx < R.ids.length - 1) { goToIndex(R.idx + 1); return; }
  showFinish();
}
function resumeUnread() {
  R.mode = 'card';
  const idx = R.ids.findIndex(id => !S.read[id]);
  if (idx >= 0) R.idx = idx;
  const pager = $('#pager');
  pager.innerHTML = '<div class="track" id="track"></div>';
  layoutTrack();
  syncReader();
}
function readerGo(d) {
  if (R.mode === 'finish') return;
  const pager = $('#pager');
  if (!pager || drag) return;
  const dest = R.idx + d;
  if (dest < 0 || dest >= R.ids.length) return;
  const w = Math.round(pager.clientWidth);
  commitSwipe(d, { w, base: R.idx > 0 ? -w : 0 });
}
function closeReader() {
  drag = null;
  R.mode = 'card';
  const el = $('#reader');
  el.classList.remove('open', 'dragging');
  el.setAttribute('aria-hidden','true');
  syncInert();
  setTimeout(() => { if (!el.classList.contains('open')) { el.innerHTML = ''; progressPage = null; } }, 520);
  refresh();
}

/* ---------- Narration ---------- */
// The player only appears for works listed in data/audio.json. That file currently
// names the rewritten Tversky & Kahneman anchoring summary alone. Older MP3s do not
// match the new texts, so they are not listed. Set NARRATION_ENABLED to false to hide
// the player everywhere. Playback, catalog, and cache code stay in place.
const NARRATION_ENABLED = true;
const AUDIO_BASE = 'https://cdn.jsdelivr.net/gh/alexandresarocha-debug/folio-audio@main/';
const AUDIO_FALLBACK_BASE = 'https://raw.githubusercontent.com/alexandresarocha-debug/folio-audio/main/';
const AUDIO_RATES = ['0.75', '0.8', '0.85', '0.9', '0.95', '1', '1.1', '1.25'];
// New recording, committed in this repo because folio-audio is not writable from here.
// Same-origin so GitHub Pages can play it without the old MP3s. Do not point this
// slug at judgment-under-uncertainty-….mp3; that file is the previous narration.
// Narration omits the written "Source." citation. The page keeps it.
const AUDIO_FILES = {
  'judgment-under-uncertainty-heuristics-and-biases-1974': 'audio/anchoring-v4.mp3',
};
const AUDIO_RATE_KEY = 'folio.audio.rate';
const AUDIO_POS_KEY = 'folio.audio.pos';
let audioCatalog = null;
let narration = null;
let workGen = 0;

function workSlug(w) {
  const base = String(w && w.file || '').split('/').pop() || '';
  if (base.endsWith('.html')) return base.slice(0, -5);
  return String(w && w.id || '');
}
function audioInfo(w) {
  if (!audioCatalog) return null;
  const slug = workSlug(w);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) return null;
  if (!Object.prototype.hasOwnProperty.call(audioCatalog, slug)) return null;
  const duration = Number(audioCatalog[slug]);
  return { slug, duration: Number.isFinite(duration) ? duration : 0 };
}
function fmtClock(s) {
  if (!Number.isFinite(s) || s < 0) s = 0;
  s = Math.round(s);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}
function rateLabel(v) { return `${v}\u00d7`; }
function audioRate() {
  try {
    const v = localStorage.getItem(AUDIO_RATE_KEY);
    if (AUDIO_RATES.includes(v)) return Number(v);
  } catch (e) {}
  return 1;
}
function setAudioRate(v) {
  try { localStorage.setItem(AUDIO_RATE_KEY, v); } catch (e) {}
}
function audioPositions() {
  try {
    const v = JSON.parse(localStorage.getItem(AUDIO_POS_KEY) || '{}');
    return v && typeof v === 'object' ? v : {};
  } catch (e) { return {}; }
}
function saveAudioPos(slug, t, dur) {
  if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) return;
  const all = audioPositions();
  if (!Number.isFinite(t) || t < 1 || (Number.isFinite(dur) && dur > 0 && t > dur - 3)) delete all[slug];
  else all[slug] = Math.round(t * 10) / 10;
  try { localStorage.setItem(AUDIO_POS_KEY, JSON.stringify(all)); } catch (e) {}
}
function audioUrl(slug, fallback) {
  const mapped = AUDIO_FILES[slug];
  if (mapped) return mapped;
  return (fallback ? AUDIO_FALLBACK_BASE : AUDIO_BASE) + slug + '.mp3';
}
function catalogDuration(slug) {
  const n = audioCatalog ? Number(audioCatalog[slug]) : NaN;
  return Number.isFinite(n) ? n : 0;
}
function narrationDuration() {
  const audio = narration && narration.audio;
  if (audio && Number.isFinite(audio.duration) && audio.duration > 0 && audio.duration !== Infinity) return audio.duration;
  return narration ? catalogDuration(narration.slug) : 0;
}
function folioArtwork() {
  const item = (path, sizes, type) => {
    try { return { src: new URL(path, document.baseURI).href, sizes, type }; }
    catch (e) { return null; }
  };
  return [item('icons/icon-192.png', '192x192', 'image/png'), item('icons/icon-512.png', '512x512', 'image/png')].filter(Boolean);
}
function applyRate(audio) {
  const r = audioRate();
  try { audio.defaultPlaybackRate = r; audio.playbackRate = r; } catch (e) {}
}
function updatePositionState() {
  if (!narration || !('mediaSession' in navigator) || !navigator.mediaSession.setPositionState) return;
  const audio = narration.audio;
  if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0 || audio.duration === Infinity) return;
  const position = Math.min(audio.duration, Math.max(0, audio.currentTime || 0));
  const playbackRate = audio.playbackRate > 0 ? audio.playbackRate : 1;
  try { navigator.mediaSession.setPositionState({ duration: audio.duration, playbackRate, position }); } catch (e) {}
}
function clearMediaSession() {
  if (!('mediaSession' in navigator)) return;
  try { navigator.mediaSession.metadata = null; } catch (e) {}
  try { navigator.mediaSession.playbackState = 'none'; } catch (e) {}
  ['play', 'pause', 'seekbackward', 'seekforward', 'seekto'].forEach(action => {
    try { navigator.mediaSession.setActionHandler(action, null); } catch (e) {}
  });
  try { navigator.mediaSession.setPositionState(null); } catch (e) {}
}
function ensureMediaSession() {
  if (!narration || !('mediaSession' in navigator)) return;
  const n = narration;
  try { navigator.mediaSession.playbackState = n.audio && !n.audio.paused ? 'playing' : 'paused'; } catch (e) {}
  if (n.sessionReady) { updatePositionState(); return; }
  n.sessionReady = true;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({ title: n.title, artist: 'Folio', artwork: folioArtwork() });
  } catch (e) {}
  const bind = (action, fn) => { try { navigator.mediaSession.setActionHandler(action, fn); } catch (e) {} };
  bind('play', () => { if (narration) narrationResume(); });
  bind('pause', () => { if (narration) narrationPause(); });
  bind('seekbackward', d => narrationSkip(-((d && d.seekOffset) || 15)));
  bind('seekforward', d => narrationSkip((d && d.seekOffset) || 30));
  bind('seekto', d => { if (d && typeof d.seekTime === 'number') narrationSeek(d.seekTime, !!d.fastSeek); });
  updatePositionState();
}
function requestAudioCache(url) {
  if (!url || !('serviceWorker' in navigator)) return;
  const msg = { type: 'cache-audio', url };
  const send = sw => { try { sw.postMessage(msg); } catch (e) {} };
  if (navigator.serviceWorker.controller) send(navigator.serviceWorker.controller);
  navigator.serviceWorker.ready.then(reg => { if (reg.active) send(reg.active); }).catch(() => {});
}
function syncNarrationUI() {
  const n = narration;
  if (!n || !n.root || !n.root.isConnected) return;
  const audio = n.audio;
  const paused = !audio || audio.paused || audio.ended;
  const dur = narrationDuration();
  const hasSrc = !!(audio && audio.getAttribute('src'));
  const savedPos = Number(audioPositions()[n.slug]);
  const liveT = audio && Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
  const t = !hasSrc && savedPos > 1 ? savedPos : liveT;
  if (n.root.dataset.paused !== (paused ? '1' : '0')) {
    n.root.dataset.paused = paused ? '1' : '0';
    const icon = n.root.querySelector('[data-icon]');
    if (icon) icon.innerHTML = paused ? I.play : I.pause;
    const toggle = n.root.querySelector('.narration-toggle');
    if (toggle) {
      toggle.setAttribute('aria-label', (paused ? 'Play narration: ' : 'Pause narration: ') + n.title);
      toggle.setAttribute('aria-pressed', paused ? 'false' : 'true');
    }
  }
  const sub = n.root.querySelector('[data-sub]');
  if (sub) {
    if (n.failed) sub.textContent = 'Couldn\u2019t load this narration.';
    else if (hasSrc && !paused) sub.textContent = 'Narrated summary';
    else if (n.loading) sub.textContent = 'Loading\u2026';
    else if (!hasSrc && savedPos > 1) sub.textContent = `Resume from ${fmtClock(savedPos)}`;
    else sub.textContent = dur ? `Narrated summary \u00b7 ${fmtClock(dur)}` : 'Narrated summary';
  }
  const elapsed = n.root.querySelector('[data-elapsed]');
  const total = n.root.querySelector('[data-total]');
  if (!n.seekHold && elapsed) elapsed.textContent = fmtClock(t);
  if (total) total.textContent = fmtClock(dur || 0);
  const input = n.root.querySelector('.narration-seek');
  if (input) {
    const canSeek = !!(audio && Number.isFinite(audio.duration) && audio.duration > 0 && audio.duration !== Infinity);
    input.disabled = !canSeek;
    if (!n.seekHold && dur) {
      const v = String(Math.max(0, Math.min(1000, Math.round((t / dur) * 1000))));
      if (input.value !== v) input.value = v;
      input.style.setProperty('--p', (Number(v) / 10) + '%');
      input.setAttribute('aria-valuenow', v);
      input.setAttribute('aria-valuetext', `${fmtClock(t)} of ${fmtClock(dur)}`);
    }
  }
  const rate = audioRate();
  n.root.querySelectorAll('[data-rate]').forEach(btn => {
    const on = Number(btn.dataset.rate) === rate;
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
}
function narrationBlock(w) {
  if (!NARRATION_ENABLED) return '';
  const info = audioInfo(w);
  if (!info) return '';
  const rate = audioRate();
  const saved = Number(audioPositions()[info.slug]);
  const sub = saved > 1 ? `Resume from ${fmtClock(saved)}` : (info.duration ? `Narrated summary \u00b7 ${fmtClock(info.duration)}` : 'Narrated summary');
  const rates = AUDIO_RATES.map(r => {
    const on = Number(r) === rate;
    return `<button type="button" data-act="audio-rate" data-rate="${r}" class="${on ? 'on' : ''}" aria-pressed="${on ? 'true' : 'false'}">${rateLabel(r)}</button>`;
  }).join('');
  return `<section class="narration" data-slug="${esc(info.slug)}">
    <div class="narration-card">
      <button type="button" class="narration-toggle" data-act="audio-toggle" aria-label="Play narration: ${esc(w.title)}">
        <span class="ty" data-icon>${I.play}</span>
        <span class="tx"><b>Listen</b><span data-sub>${esc(sub)}</span></span>
      </button>
      <div class="narration-seekrow">
        <span data-elapsed>0:00</span>
        <input class="narration-seek" type="range" min="0" max="1000" value="0" step="1" disabled aria-label="Seek narration" aria-valuemin="0" aria-valuemax="1000" aria-valuenow="0">
        <span data-total>${esc(info.duration ? fmtClock(info.duration) : '0:00')}</span>
      </div>
      <div class="narration-transport">
        <button type="button" data-act="audio-back" aria-label="Back 15 seconds">-15s</button>
        <button type="button" data-act="audio-fwd" aria-label="Forward 30 seconds">+30s</button>
      </div>
      <div class="narration-rates" role="group" aria-label="Playback speed">${rates}</div>
    </div>
    <audio preload="none" playsinline webkit-playsinline crossorigin="anonymous"></audio>
  </section>`;
}
function bindNarrationAudio(n) {
  const audio = n.audio;
  const alive = () => narration && narration.audio === audio && !n.closing;
  audio.addEventListener('play', () => {
    if (!alive()) return;
    try { navigator.mediaSession.playbackState = 'playing'; } catch (e) {}
    syncNarrationUI();
  });
  audio.addEventListener('playing', () => {
    if (!alive()) return;
    n.loading = false;
    applyRate(audio);
    ensureMediaSession();
    if (!n.cacheSent) {
      n.cacheSent = true;
      requestAudioCache(audio.currentSrc || audio.src);
    }
    syncNarrationUI();
    updatePositionState();
  });
  audio.addEventListener('pause', () => {
    if (!alive()) return;
    try { navigator.mediaSession.playbackState = 'paused'; } catch (e) {}
    saveAudioPos(n.slug, audio.currentTime, audio.duration);
    syncNarrationUI();
    updatePositionState();
  });
  audio.addEventListener('timeupdate', () => {
    if (!alive()) return;
    syncNarrationUI();
    updatePositionState();
    const now = Date.now();
    if (now - n.saveAt > 5000) {
      n.saveAt = now;
      saveAudioPos(n.slug, audio.currentTime, audio.duration);
    }
  });
  audio.addEventListener('seeked', () => { if (alive()) updatePositionState(); });
  audio.addEventListener('ended', () => {
    if (!alive()) return;
    saveAudioPos(n.slug, audio.duration, audio.duration);
    try { audio.currentTime = 0; } catch (e) {}
    try { navigator.mediaSession.playbackState = 'paused'; } catch (e) {}
    syncNarrationUI();
  });
  audio.addEventListener('loadedmetadata', () => { if (alive()) syncNarrationUI(); });
  audio.addEventListener('durationchange', () => { if (alive()) { syncNarrationUI(); updatePositionState(); } });
  audio.addEventListener('ratechange', () => { if (alive()) updatePositionState(); });
  audio.addEventListener('waiting', () => {
    if (!alive() || !audio.getAttribute('src') || n.failed) return;
    n.loading = true;
    const sub = n.root.querySelector('[data-sub]');
    if (sub) sub.textContent = 'Loading\u2026';
  });
  audio.addEventListener('canplay', () => { if (!alive()) return; n.loading = false; syncNarrationUI(); });
}
function startNarrationSrc(n, url, resumeAt) {
  const audio = n.audio;
  if (n.onErr) audio.removeEventListener('error', n.onErr);
  const token = ++n.loadToken;
  const onErr = () => {
    if (!narration || narration !== n || n.loadToken !== token || n.closing) return;
    if (!n.fallback) {
      n.fallback = true;
      n.cacheSent = false;
      n.failed = false;
      startNarrationSrc(n, audioUrl(n.slug, true), audio.currentTime || resumeAt || 0);
      return;
    }
    n.failed = true;
    n.loading = false;
    syncNarrationUI();
  };
  n.onErr = onErr;
  audio.addEventListener('error', onErr);
  n.loading = true;
  audio.src = url;
  applyRate(audio);
  audio.addEventListener('loadedmetadata', () => {
    if (!narration || narration !== n || n.loadToken !== token) return;
    if (resumeAt > 1 && Number.isFinite(audio.duration) && resumeAt < audio.duration - 2) {
      try { audio.currentTime = resumeAt; } catch (e) {}
    }
    syncNarrationUI();
  }, { once: true });
  const played = audio.play();
  if (played) played.catch(err => {
    if (!narration || n.loadToken !== token) return;
    n.loading = false;
    if (!err || err.name === 'NotAllowedError' || err.name === 'AbortError') { syncNarrationUI(); return; }
    onErr();
  });
  syncNarrationUI();
}
function mountNarration(section, title) {
  if (!section) { narration = null; return; }
  const audio = section.querySelector('audio');
  if (!audio) return;
  audio.playsInline = true;
  narration = {
    slug: section.dataset.slug,
    title: title || 'Summary',
    root: section,
    audio,
    fallback: false,
    failed: false,
    loading: false,
    cacheSent: false,
    seekHold: false,
    saveAt: 0,
    closing: false,
    loadToken: 0,
    sessionReady: false,
    onErr: null,
  };
  bindNarrationAudio(narration);
  syncNarrationUI();
}
function stopNarration() {
  const n = narration;
  if (!n) { clearMediaSession(); return; }
  n.closing = true;
  n.loadToken += 1;
  narration = null;
  try { if (n.audio && !n.failed) saveAudioPos(n.slug, n.audio.currentTime, n.audio.duration); } catch (e) {}
  try { n.audio && n.audio.pause(); } catch (e) {}
  clearMediaSession();
}
function persistNarration() {
  const n = narration;
  if (!n || !n.audio || n.closing) return;
  saveAudioPos(n.slug, n.audio.currentTime, n.audio.duration);
}
function narrationToggle() {
  const n = narration;
  if (!n || !n.audio) return;
  const audio = n.audio;
  if (n.failed || !audio.getAttribute('src')) {
    n.failed = false;
    n.fallback = false;
    n.cacheSent = false;
    const saved = Number(audioPositions()[n.slug]);
    startNarrationSrc(n, audioUrl(n.slug, false), saved > 1 ? saved : 0);
    haptic(6);
    return;
  }
  if (audio.paused || audio.ended) {
    applyRate(audio);
    if (audio.ended || (audio.duration && audio.currentTime >= audio.duration - 0.25)) {
      try { audio.currentTime = 0; } catch (e) {}
    }
    const played = audio.play();
    if (played) played.catch(() => {});
  } else {
    audio.pause();
    saveAudioPos(n.slug, audio.currentTime, audio.duration);
  }
  haptic(6);
}
function narrationResume() {
  const n = narration;
  if (!n || !n.audio) return;
  if (!n.audio.getAttribute('src') || n.failed) narrationToggle();
  else if (n.audio.paused) { applyRate(n.audio); n.audio.play().catch(() => {}); }
}
function narrationPause() {
  const n = narration;
  if (!n || !n.audio || n.audio.paused) return;
  n.audio.pause();
  saveAudioPos(n.slug, n.audio.currentTime, n.audio.duration);
}
function narrationSeek(t, fast) {
  const n = narration;
  if (!n || !n.audio) return;
  const dur = Number.isFinite(n.audio.duration) && n.audio.duration > 0 ? n.audio.duration : 0;
  if (!dur) return;
  const next = Math.min(dur, Math.max(0, t));
  try {
    if (fast && typeof n.audio.fastSeek === 'function') n.audio.fastSeek(next);
    else n.audio.currentTime = next;
  } catch (e) {
    try { n.audio.currentTime = next; } catch (err) {}
  }
  saveAudioPos(n.slug, next, dur);
  syncNarrationUI();
  updatePositionState();
}
function narrationSkip(delta) {
  const n = narration;
  if (!n || !n.audio || !Number.isFinite(n.audio.duration)) return;
  narrationSeek((n.audio.currentTime || 0) + delta, false);
}
function narrationSetRate(v) {
  if (!AUDIO_RATES.includes(v)) return;
  setAudioRate(v);
  if (narration && narration.audio) applyRate(narration.audio);
  syncNarrationUI();
  updatePositionState();
  haptic(6);
}
function seekRatio(input) {
  const dur = narrationDuration();
  if (!dur || !input) return 0;
  return (Number(input.value) / 1000) * dur;
}
function onSeekInput(input) {
  if (!narration || !narration.root) return;
  narration.seekHold = true;
  const t = seekRatio(input);
  const elapsed = narration.root.querySelector('[data-elapsed]');
  if (elapsed) elapsed.textContent = fmtClock(t);
  input.style.setProperty('--p', (Number(input.value) / 10) + '%');
  input.setAttribute('aria-valuenow', input.value);
  input.setAttribute('aria-valuetext', fmtClock(t));
}
function commitSeek(input) {
  if (!narration || !input) return;
  narration.seekHold = false;
  const audio = narration.audio;
  if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
  narrationSeek((Number(input.value) / 1000) * audio.duration, false);
}
async function loadAudioCatalog() {
  try {
    const res = await fetch('data/audio.json', { cache: 'no-cache' });
    if (!res.ok) return;
    const data = await res.json();
    if (data && typeof data === 'object') audioCatalog = data;
  } catch (e) {}
}

function cleanWorkHtml(raw) {
  const doc = new DOMParser().parseFromString(raw, 'text/html');
  doc.querySelectorAll('script,style,iframe,object,embed,link,meta').forEach(n => n.remove());
  doc.querySelectorAll('*').forEach(el => {
    [...el.attributes].forEach(a => {
      if (a.name.startsWith('on') || a.name === 'srcdoc') el.removeAttribute(a.name);
      if ((a.name === 'href' || a.name === 'src') && /^\s*javascript:/i.test(a.value)) el.removeAttribute(a.name);
    });
  });
  const article = doc.querySelector('.work-doc');
  return article ? article.outerHTML : '';
}
async function openWork(cardId, workId) {
  const card = byId[cardId];
  const w = card && (card.goDeeper || []).find(x => x.id === workId);
  if (!w) return;
  stopNarration();
  const gen = ++workGen;
  const el = $('#work');
  el.style.setProperty('--c', color(primaryTopic(card)));
  el.innerHTML = `<div class="reader-top"><button class="icon-btn" data-act="closeWork" aria-label="Close">${I.x}</button><div class="count">Summary</div><div class="progress" id="wprog-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="Reading progress"><i id="wprog"></i></div></div><div class="work-scroll" id="work-scroll"><div class="page-in work-in"><p class="work-by">Loading the summary…</p></div></div>`;
  el.setAttribute('aria-hidden', 'false');
  syncInert();
  requestAnimationFrame(() => el.classList.add('open'));
  pushHist('work');
  const sc = $('#work-scroll');
  const update = () => {
    const max = sc.scrollHeight - sc.clientHeight;
    const p = max <= 1 ? 1 : Math.min(1, Math.max(0, sc.scrollTop / max));
    const bar = $('#wprog');
    if (bar) bar.style.width = (p * 100).toFixed(2) + '%';
    const track = $('#wprog-track');
    if (track) track.setAttribute('aria-valuenow', String(Math.round(p * 100)));
  };
  sc.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
  try {
    const res = await fetch(w.file);
    if (!res.ok) throw new Error('status');
    const body = cleanWorkHtml(await res.text());
    if (!body) throw new Error('empty');
    if (gen !== workGen) return;
    const kind = w.type === 'paper' ? 'Paper' : 'Book';
    sc.innerHTML = `<div class="page-in work-in"><div class="kicker"><i></i>${kind}</div><h1>${esc(w.title)}</h1><p class="work-by">${esc(w.authors)} · ${yearStr(w.year)}</p>${narrationBlock(w)}<div class="prose work-prose">${body}</div><footer class="work-attrib"><p><a href="${esc(w.sourceUrl)}" target="_blank" rel="noopener">Read the original</a></p></footer></div>`;
    mountNarration($('.narration', sc), w.title);
    sc.scrollTop = 0;
    requestAnimationFrame(update);
  } catch (e) {
    if (gen !== workGen) return;
    sc.innerHTML = '<div class="page-in work-in"><p class="work-by">Couldn’t open this text. Check your connection and try again.</p></div>';
  }
}
function closeWork() {
  workGen++;
  stopNarration();
  const el = $('#work');
  el.classList.remove('open');
  el.setAttribute('aria-hidden', 'true');
  syncInert();
  setTimeout(() => { if (!el.classList.contains('open')) el.innerHTML = ''; }, 480);
}

/* ---------- History (back button) ---------- */
const stack = [];
let suppressPop = 0;
function pushHist(kind) { stack.push(kind); history.pushState({ k: kind, n: stack.length }, ''); }
function closeTop(fromPop) {
  const k = stack.pop(); if (!k) return;
  if (k === 'work') closeWork(); else if (k === 'reader') closeReader(); else if (k === 'search') closeSearch(); else if (k === 'path') closePath();
  if (!fromPop) { suppressPop++; history.back(); }
}
window.addEventListener('popstate', () => {
  if (suppressPop) { suppressPop--; return; }
  if (stack.length) closeTop(true);
});

/* ---------- Tabs ---------- */
const TABS = [['home','Home',I.home],['cards','All cards',I.compass],['saved','Saved',I.bookmark],['progress','Progress',I.chart]];
let tab = 'home';
function renderTabs() { $('#tabbar').innerHTML = TABS.map(([id, l, ic]) => `<button class="tab${tab === id ? ' on' : ''}" data-tab="${id}" aria-label="${l}" aria-current="${tab === id ? 'page' : 'false'}"><span class="ico">${id === 'saved' && tab === id ? I.bookmarkFill : ic}</span><span class="tab-lbl">${l}</span></button>`).join(''); }
function setTab(id) {
  if (id === tab) { const s = $('#s-' + id); s.scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' }); return; }
  tab = id; haptic(5);
  document.querySelectorAll('.screen').forEach(s => {
    const on = s.id === 's-' + id;
    s.classList.toggle('active', on);
    if (on) s.removeAttribute('inert'); else s.setAttribute('inert', '');
  });
  render(id); renderTabs();
}
function render(id) { ({ home: renderHome, cards: renderCards, saved: renderSaved, progress: renderProgress })[id](); }
function refresh() {
  const sc = $('#s-' + tab), top = sc.scrollTop; render(tab); sc.scrollTop = top;
  const push = $('#push'); if (push.dataset.path) { const t = push.scrollTop; openPath(push.dataset.path, false); push.scrollTop = t; }
}
function applyTheme() {
  document.documentElement.dataset.theme = S.theme;
  document.querySelector('meta[name="theme-color"]').content = S.theme === 'light' ? '#f6f3ed' : '#0c0c0e';
}

/* ---------- Events ---------- */
document.addEventListener('click', e => {
  const t = e.target.closest('[data-open],[data-tab],[data-filter],[data-path],[data-act],[data-goal],[data-theme-set],[data-sq],[data-work]');
  if (!t) return;
  if (t.dataset.work) { openWork(t.dataset.card, t.dataset.work); haptic(6); return; }
  if (t.dataset.open) { openReader(SEQS[t.dataset.seq] || [t.dataset.open], t.dataset.open, t.dataset.pathRead || null); haptic(6); return; }
  if (t.dataset.tab) { if (stack.length) while (stack.length) closeTop(); setTab(t.dataset.tab); return; }
  if (t.dataset.filter) { S.filter = t.dataset.filter; save(); haptic(5); const sc = $('#s-cards'); const y = sc.scrollTop; renderCards(); sc.scrollTop = y; return; }
  if (t.dataset.path) { openPath(t.dataset.path); haptic(6); return; }
  if (t.dataset.goal) { S.goal = +t.dataset.goal; save(); haptic(6); renderProgress(); return; }
  if (t.dataset.themeSet) { S.theme = t.dataset.themeSet; save(); applyTheme(); haptic(6); renderProgress(); return; }
  if (t.dataset.sq) { const inp = $('#search input'); inp.value = t.dataset.sq; runSearch(inp.value); return; }
  const a = t.dataset.act;
  if (a === 'audio-toggle') { narrationToggle(); return; }
  if (a === 'audio-back') { narrationSkip(-15); haptic(6); return; }
  if (a === 'audio-fwd') { narrationSkip(30); haptic(6); return; }
  if (a === 'audio-rate') { narrationSetRate(t.dataset.rate); return; }
  if (a === 'search') openSearch();
  else if (a === 'closeSearch' || a === 'pop' || a === 'closeReader' || a === 'closeWork') closeTop();
  else if (a === 'deep') { const d = t.parentElement; const open = d.classList.toggle('open'); t.setAttribute('aria-expanded', open); haptic(5); }
  else if (a === 'rsave') { const on = toggleSave(R.ids[R.idx]); syncReader(); if (on) toast(I.bookmarkFill, 'Saved to your library'); }
  else if (a === 'rread') {
    if (R.mode === 'finish') { closeTop(); return; }
    const id = R.ids[R.idx]; setRead(id, !S.read[id]); syncReader();
  }
  else if (a === 'rnext') {
    if (R.mode === 'finish') return;
    if (R.pathId) { setTimeout(() => continuePath(), 160); return; }
    const id = R.ids[R.idx]; if (!S.read[id]) { setRead(id, true); syncReader(); } if (R.idx < R.ids.length - 1) setTimeout(() => readerGo(1), 160); else { toast(I.check, 'End of this set'); }
  }
  else if (a === 'finish-resume') resumeUnread();
  else if (a === 'open-related') {
    const id = t.dataset.related;
    const pathOpen = $('#push').classList.contains('open');
    if ($('#reader').classList.contains('open')) closeTop();
    openPath(id, !pathOpen);
    if (pathOpen) $('#push').scrollTop = 0;
  }
  else if (a === 'share') { if (R.mode === 'finish') return; const c = byId[R.ids[R.idx]]; const text = `${c.title}\n\n${c.source.title} — ${c.source.author} (${yearStr(c.source.year)})\n${c.source.url}`; if (navigator.share) navigator.share({ title: c.title, text }).catch(() => {}); else navigator.clipboard && navigator.clipboard.writeText(text).then(() => toast(I.check, 'Copied to clipboard')); }
  else if (a === 'reset') { if (confirm('Reset reading progress, streaks and saved ideas on this device?')) { S = { ...defaults, theme: S.theme, seed: S.seed }; save(); refresh(); toast(I.check, 'Progress reset'); } }
});
document.addEventListener('keydown', e => {
  if ($('#work').classList.contains('open')) { if (e.key === 'Escape') closeTop(); return; }
  if (!$('#reader').classList.contains('open')) return;
  if (e.key === 'ArrowRight') { if (R.pathId && R.mode !== 'finish') continuePath(); else readerGo(1); }
  else if (e.key === 'ArrowLeft') readerGo(-1);
  else if (e.key === 'Escape') closeTop();
});
let rz; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if ($('#reader').classList.contains('open') && !drag) layoutTrack(); }, 80); });
document.addEventListener('input', e => {
  if (e.target.classList && e.target.classList.contains('narration-seek')) onSeekInput(e.target);
});
document.addEventListener('change', e => {
  if (e.target.classList && e.target.classList.contains('narration-seek')) commitSeek(e.target);
});
document.addEventListener('pointerup', e => {
  if (!narration || !narration.seekHold) return;
  const input = e.target.classList && e.target.classList.contains('narration-seek') ? e.target : narration.root.querySelector('.narration-seek');
  commitSeek(input);
});
document.addEventListener('pointercancel', () => { if (narration) narration.seekHold = false; });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) persistNarration();
  else if (D) refresh();
});
window.addEventListener('pagehide', persistNarration);

/* ---------- Boot ---------- */
async function warmFonts() {
  if (!document.fonts) return;
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('430 19px Newsreader'),
        document.fonts.load('500 32px Newsreader'),
        document.fonts.load('italic 500 16px Newsreader'),
        document.fonts.load('560 15px Inter'),
      ]).then(() => document.fonts.ready),
      new Promise(r => setTimeout(r, 1200)),
    ]);
  } catch (e) {}
}
async function boot() {
  applyTheme();
  const started = performance.now();
  try {
    const res = await Promise.all([
      fetch('data/cards.json', { cache: 'no-cache' }),
      NARRATION_ENABLED ? loadAudioCatalog() : Promise.resolve(),
    ]).then(parts => parts[0]);
    if (!res.ok) throw new Error('status');
    D = await res.json();
    await warmFonts();
  } catch (e) {
    $('#splash').innerHTML = '<p style="color:var(--muted);padding:30px;text-align:center">Couldn\u2019t load ideas. Check your connection and reopen Folio.</p>'; return;
  }
  D.topics.forEach(t => topicById[t.id] = t); D.paths.forEach(p => pathById[p.id] = p);
  D.cards.forEach(c => {
    if (!Array.isArray(c.topics) || !c.topics.length) c.topics = c.topic ? [c.topic] : [];
    if (!c.topic && c.topics.length) c.topic = c.topics[0];
    byId[c.id] = c;
  });
  if (S.filter !== 'all' && !topicById[S.filter]) S.filter = 'all';
  renderTabs(); renderHome();
  const delay = Math.max(0, 280 - (performance.now() - started));
  setTimeout(() => requestAnimationFrame(() => $('#splash').classList.add('gone')), delay);
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}
boot();
})();
