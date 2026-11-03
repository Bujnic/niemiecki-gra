"use strict";

/* ================= Helpers ================= */

const $ = (sel, el = document) => el.querySelector(sel);

function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "html") el.innerHTML = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (k === "style") el.style.cssText = v;
      else el.setAttribute(k, v === true ? "" : v);
    }
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const uniq = (arr) => [...new Set(arr)];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function makeDeck(items) {
  let deck = [];
  return () => {
    if (!deck.length) deck = shuffle(items);
    return deck.pop();
  };
}

/* ================= Words ================= */

const WORDS = [];
for (const set of VOCAB) {
  for (const line of set.words) {
    const [deRaw, plRaw] = line.split("|").map((s) => s.trim());
    if (!deRaw || !plRaw) continue;
    const plural = /\(pl\)\s*$/.test(deRaw);
    const de = deRaw.replace(/\s*\(pl\)\s*$/, "");
    const m = de.match(/^(der|die|das) (\S.*)$/);
    WORDS.push({
      key: de,
      de,
      pl: plRaw,
      set: set.id,
      art: m && !plural ? m[1] : null,
      noun: m ? m[2] : null,
    });
  }
}
const SET_NAMES = Object.fromEntries(VOCAB.map((s) => [s.id, s.name]));

/* ================= Storage ================= */

const STORE_KEY = "niemiecki-b2-progress-v1";
const DAY = 86400000;
const INTERVALS = [0, 10 * 60000, DAY, 3 * DAY, 7 * DAY, 16 * DAY, 40 * DAY];

const defaults = () => ({
  xp: 0,
  streak: { count: 0, last: null },
  srs: {},
  best: {},
  rpg: { done: [] },
  settings: { dir: "de-pl", sets: VOCAB.map((s) => s.id), sound: true, flashCount: 20 },
});

let S = load();

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY));
    if (!raw) return defaults();
    const d = defaults();
    return { ...d, ...raw, settings: { ...d.settings, ...raw.settings }, rpg: { ...d.rpg, ...raw.rpg } };
  } catch (e) {
    return defaults();
  }
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { /* prywatny tryb */ }
}

const todayStr = (d = new Date()) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

function touchStreak() {
  const today = todayStr();
  if (S.streak.last === today) return;
  const yesterday = todayStr(new Date(Date.now() - DAY));
  S.streak.count = S.streak.last === yesterday ? S.streak.count + 1 : 1;
  S.streak.last = today;
}

function addXP(n) {
  if (n <= 0) return;
  const before = level();
  S.xp += n;
  touchStreak();
  save();
  updateChips();
  if (level() > before) toast(`Nowy poziom: ${level()}!`);
}

const level = () => Math.floor(Math.sqrt(S.xp / 50)) + 1;
const levelXP = (l) => (l - 1) * (l - 1) * 50;

function srsGet(key) { return S.srs[key] || { b: 0, due: 0 }; }
function srsRecord(key, ok) {
  const cur = srsGet(key);
  const b = ok ? Math.min(cur.b + 1, INTERVALS.length - 1) : 1;
  S.srs[key] = { b, due: Date.now() + INTERVALS[b] };
  save();
}
function activeWords() {
  const sets = S.settings.sets.length ? S.settings.sets : VOCAB.map((s) => s.id);
  return WORDS.filter((w) => sets.includes(w.set));
}
function dueWords(pool = activeWords()) {
  const now = Date.now();
  return pool.filter((w) => S.srs[w.key] && S.srs[w.key].due <= now);
}
function setBest(key, score) {
  if (!(key in S.best) || score > S.best[key]) {
    S.best[key] = score;
    save();
    return true;
  }
  return false;
}

/* ================= Sound & speech ================= */

let audioCtx = null;
function beep(ok) {
  if (!S.settings.sound) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = "sine";
    o.frequency.value = ok ? 880 : 220;
    if (ok) o.frequency.setValueAtTime(1175, audioCtx.currentTime + 0.08);
    g.gain.setValueAtTime(0.12, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
    o.connect(g).connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + 0.25);
  } catch (e) { /* brak audio */ }
}

let deVoice = null;
function pickVoice() {
  if (!("speechSynthesis" in window)) return;
  const voices = speechSynthesis.getVoices();
  deVoice = voices.find((v) => v.lang === "de-DE" && /Anna|Helena|Markus|Google/i.test(v.name)) ||
    voices.find((v) => v.lang && v.lang.startsWith("de")) || null;
}
if ("speechSynthesis" in window) {
  pickVoice();
  speechSynthesis.onvoiceschanged = pickVoice;
}
function speak(text) {
  if (!("speechSynthesis" in window)) return toast("Brak syntezy mowy");
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/\(.*?\)/g, ""));
  u.lang = "de-DE";
  if (deVoice) u.voice = deVoice;
  u.rate = 0.92;
  speechSynthesis.speak(u);
}

/* ================= UI shell ================= */

const screenEl = $("#screen");
const titleEl = $("#title");
const backBtn = $("#backBtn");
let onBack = null;
let cleanup = null;

function updateChips() {
  $("#xpChip").textContent = `${S.xp} XP`;
  $("#streakChip").textContent = `${S.streak.count}`;
}

function show(title, render, back = home) {
  if (cleanup) { cleanup(); cleanup = null; }
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  titleEl.textContent = title;
  onBack = back;
  backBtn.hidden = !back;
  screenEl.innerHTML = "";
  screenEl.scrollTop = 0;
  render(screenEl);
}
backBtn.addEventListener("click", () => onBack && onBack());

let toastTimer = null;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.hidden = false;
  t.classList.remove("pop");
  void t.offsetWidth;
  t.classList.add("pop");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 1800);
}

/* ================= Home ================= */

const MODES = [
  { id: "flash", name: "Fiszki", desc: "Powtórki w odstępach czasu", badge: "DE", color: "#f5b301", run: () => flashSetup() },
  { id: "quiz", name: "Quiz słówek", desc: "4 odpowiedzi, 10 pytań", badge: "?", color: "#60a5fa", run: () => quizVocab() },
  { id: "memory", name: "Memory", desc: "Znajdź pary DE–PL", badge: "▦", color: "#a78bfa", run: () => memoryGame() },
  { id: "article", name: "der / die / das", desc: "60 sekund, ile zdążysz", badge: "der", color: "#f87171", run: () => articleGame() },
  { id: "colloc", name: "Kolokacje", desc: "Angebot + unterbreiten…", badge: "+", color: "#34d399", run: () => collocGame() },
  { id: "conn", name: "Łączenie zdań", desc: "damit, um…zu, ohne, anstatt", badge: "⇄", color: "#fb923c", run: () => connectorGame() },
  { id: "gaps", name: "Luki", desc: "zu / um / damit / ohne / anstatt", badge: "__", color: "#f472b6", run: () => gapGame() },
  { id: "zu", name: "Zu czy bez zu?", desc: "Przetrwanie: 3 życia", badge: "zu", color: "#facc15", run: () => zuGame() },
  { id: "builder", name: "Układanka zdań", desc: "Przeciągnij słowa w kolejności", badge: "≡", color: "#22d3ee", run: () => builderGame() },
  { id: "prefix", name: "zer- / ver-", desc: "Wrzuć słowo do kosza", badge: "zer", color: "#c084fc", run: () => prefixGame() },
  { id: "cloze", name: "Rozmowa o pracę", desc: "Uzupełnij swoje odpowiedzi", badge: "Q", color: "#4ade80", run: () => clozeMenu() },
];

function home() {
  show("Niemiecki B2", (el) => {
    const l = level();
    const cur = S.xp - levelXP(l);
    const need = levelXP(l + 1) - levelXP(l);
    const due = dueWords().length;
    const learned = WORDS.filter((w) => srsGet(w.key).b >= 4).length;

    el.append(
      h("div", { class: "hero" },
        h("div", { class: "lvl" }, h("span", null, `Poziom ${l}`), h("span", null, `${cur} / ${need} XP`)),
        h("div", { class: "bar" }, h("i", { style: `width:${Math.min(100, (cur / need) * 100)}%` })),
        h("div", { class: "due" },
          due ? `Do powtórki: ${due} słówek · ` : "Brak zaległych powtórek · ",
          `opanowane: ${learned} / ${WORDS.length}`)
      ),
      h("button", { class: "mode wide", style: "background:linear-gradient(135deg,#7c2d12,#b45309)", onclick: rpgMenu },
        h("span", { class: "badge", style: "background:#fde68a" }, "RPG"),
        h("span", null, h("b", null, "Praktykant w niemieckiej firmie"), h("br"), h("small", { style: "color:#fde68a" }, "6 dni pracy – wszystko z zeszytu w jednej fabule"))
      ),
      h("div", { class: "section-title" }, "Tryby gry"),
      h("div", { class: "modes" },
        MODES.map((m) =>
          h("button", { class: "mode", onclick: m.run },
            h("span", { class: "badge", style: `background:${m.color}` }, m.badge),
            h("b", null, m.name),
            h("small", null, m.desc)
          )
        )
      ),
      h("div", { class: "section-title" }, "Więcej"),
      h("div", { class: "modes" },
        h("button", { class: "mode", onclick: cheatsheet },
          h("span", { class: "badge", style: "background:#e5e7eb" }, "§"), h("b", null, "Ściąga"), h("small", null, "Gramatyka w pigułce")),
        h("button", { class: "mode", onclick: statsScreen },
          h("span", { class: "badge", style: "background:#e5e7eb" }, "%"), h("b", null, "Postępy i ustawienia"), h("small", null, "Działy, statystyki, reset"))
      )
    );
  }, null);
}

/* ================= Generic quiz runner ================= */
/*
  cfg: { key, title, gen() -> question | questions: [], n, lives, seconds, cols, big, back, intro, onFinish(result) }
  question: { prompt (html), options [], correct [] (pierwsza = najlepsza), explain (html), onResult(ok) }
*/
function runQuiz(cfg) {
  const back = cfg.back || home;
  show(cfg.title, (el) => {
    let i = 0, score = 0, lives = cfg.lives || 0, combo = 0, xpGained = 0, answered = 0;
    let timeLeft = cfg.seconds || 0, timerId = null, finished = false;
    const total = cfg.questions ? cfg.questions.length : cfg.n || 0;

    const hud = h("div", { class: "hud" });
    const body = h("div");
    el.append(hud, body);

    if (cfg.seconds) {
      timerId = setInterval(() => {
        timeLeft--;
        renderHud();
        if (timeLeft <= 0) finish();
      }, 1000);
      cleanup = () => clearInterval(timerId);
    }

    function renderHud() {
      hud.innerHTML = "";
      if (cfg.seconds) {
        hud.append(h("div", { class: "bar" }, h("i", { style: `width:${(timeLeft / cfg.seconds) * 100}%` })), h("span", { class: "timer" }, `${timeLeft}s`));
      } else if (total) {
        hud.append(h("span", null, `${Math.min(i + 1, total)}/${total}`), h("div", { class: "bar" }, h("i", { style: `width:${(i / total) * 100}%` })));
      }
      if (cfg.lives) hud.append(h("span", { class: "hearts" }, "♥".repeat(Math.max(0, lives)) + "♡".repeat(Math.max(0, cfg.lives - lives))));
      hud.append(h("span", null, `${score} pkt`));
      if (combo >= 3) hud.append(h("span", { class: "combo" }, `x${combo}`));
    }

    function next() {
      if (finished) return;
      if (total && i >= total) return finish();
      const q = cfg.questions ? cfg.questions[i] : cfg.gen();
      renderHud();
      body.innerHTML = "";
      const opts = h("div", { class: `options ${cfg.cols ? "cols-" + cfg.cols : ""} ${cfg.big ? "big" : ""}` });
      body.append(h("div", { class: "prompt pop", html: q.prompt }), opts);
      let locked = false;
      for (const o of q.options) {
        const b = h("button", { class: "opt" }, o);
        b.addEventListener("click", () => {
          if (locked) return;
          locked = true;
          answer(q, o, opts);
        });
        opts.append(b);
      }
    }

    function answer(q, chosen, optsEl) {
      const ok = q.correct.includes(chosen);
      answered++;
      beep(ok);
      if (q.onResult) q.onResult(ok);
      for (const b of optsEl.children) {
        if (q.correct.includes(b.textContent)) b.classList.add("ok");
        else if (b.textContent === chosen) b.classList.add("bad");
        else b.classList.add("dim");
      }
      if (ok) {
        combo++;
        score++;
        const gain = 10 + (combo >= 3 ? 5 : 0);
        xpGained += gain;
        addXP(gain);
      } else {
        combo = 0;
        if (cfg.lives) lives--;
        optsEl.classList.add("shake");
      }
      i++;
      renderHud();

      const timed = !!cfg.seconds;
      if (timed) {
        setTimeout(() => { if (cfg.lives && lives <= 0) finish(); else next(); }, ok ? 350 : 900);
        return;
      }
      const notBest = ok && q.correct.length > 1 && chosen !== q.correct[0];
      const fb = h("div", { class: `feedback pop ${ok ? "" : "bad"}` },
        h("div", { class: "title" }, ok ? (notBest ? `Dobrze! Częściej: ${q.correct[0]}` : "Dobrze!") : `Poprawnie: ${q.correct[0]}`),
        q.explain ? h("div", { html: q.explain }) : null
      );
      const nextBtn = h("button", { class: "btn primary", style: "margin-top:14px" }, "Dalej");
      nextBtn.addEventListener("click", () => { if (cfg.lives && lives <= 0) finish(); else next(); });
      body.append(fb, nextBtn);
      if (ok && !q.explain) setTimeout(() => nextBtn.isConnected && nextBtn.click(), 700);
      else nextBtn.scrollIntoView({ behavior: "smooth", block: "end" });
    }

    function finish() {
      if (finished) return;
      finished = true;
      if (timerId) clearInterval(timerId);
      const record = cfg.key ? setBest(cfg.key, score) : false;
      const result = { score, answered, total: total || answered, xp: xpGained };
      body.innerHTML = "";
      hud.innerHTML = "";
      body.append(
        h("div", { class: "card center pop" },
          h("div", { class: "muted" }, cfg.seconds ? "Koniec czasu!" : cfg.lives && lives <= 0 ? "Koniec żyć!" : "Koniec rundy"),
          h("div", { class: "result-big" }, total ? `${score}/${total}` : `${score}`),
          h("div", null, `+${xpGained} XP`),
          record ? h("div", { style: "color:var(--gold);font-weight:800;margin-top:6px" }, "Nowy rekord!") :
            cfg.key && S.best[cfg.key] != null ? h("div", { class: "muted" }, `Rekord: ${S.best[cfg.key]}`) : null
        )
      );
      if (cfg.onFinish) cfg.onFinish(result, body);
      else body.append(
        h("button", { class: "btn primary", onclick: () => runQuiz(cfg) }, "Jeszcze raz"),
        h("button", { class: "btn ghost", onclick: back }, "Menu")
      );
    }

    if (cfg.intro) {
      body.append(cfg.intro, h("button", { class: "btn primary", onclick: next }, "Zaczynamy"));
      renderHud();
    } else next();
  }, back);
}

/* ================= Question generators ================= */

function genVocabQ(pool, dir = S.settings.dir) {
  const due = dueWords(pool);
  const w = due.length && Math.random() < 0.6 ? pick(due) : pick(pool);
  const toPl = dir === "de-pl";
  const others = shuffle(pool.filter((x) => x.key !== w.key && x.pl !== w.pl && x.de !== w.de));
  const sameSet = others.filter((x) => x.set === w.set);
  const distract = uniq([...sameSet, ...others].map((x) => (toPl ? x.pl : x.de))).slice(0, 3);
  const correct = toPl ? w.pl : w.de;
  return {
    prompt: `<div class="big">${esc(toPl ? w.de : w.pl)}</div><div class="hint">${esc(SET_NAMES[w.set])}</div>`,
    options: shuffle([correct, ...distract]),
    correct: [correct],
    explain: null,
    onResult: (ok) => srsRecord(w.key, ok),
  };
}

const NOUNS = WORDS.filter((w) => w.art);
const nounDeck = makeDeck(NOUNS);
function genArticleQ() {
  const w = nounDeck();
  return {
    prompt: `<div class="big">${esc(w.noun)}</div><div class="hint">${esc(w.pl)}</div>`,
    options: ["der", "die", "das"],
    correct: [w.art],
    explain: `<b>${esc(w.de)}</b> – ${esc(w.pl)}`,
  };
}

const collocDeck = makeDeck(COLLOCATIONS);
function genCollocQ() {
  const c = collocDeck();
  const valid = COLLOCATIONS.filter((x) => x.stem === c.stem).map((x) => x.gap);
  const distract = shuffle(uniq(COLLOCATIONS.map((x) => x.gap)).filter((g) => !valid.includes(g))).slice(0, 3);
  return {
    prompt: `<div class="sent">${esc(c.stem).replace("___", '<span class="gap">&nbsp;?&nbsp;</span>')}</div><div class="hint">${esc(c.pl)}</div>`,
    options: shuffle([c.gap, ...distract]),
    correct: [c.gap],
    explain: `<b>${esc(c.stem.replace("___", c.gap))}</b> – ${esc(c.pl)}`,
  };
}

const CONNECTOR_OPTS = ["dass", "zu", "um … zu", "damit", "anstatt … zu", "anstatt dass", "ohne … zu", "ohne dass"];
const connDeck = makeDeck(CONNECTORS);
function genConnectorQ() {
  const c = connDeck();
  const zuForm = c.answers.some((a) => a.includes("zu"));
  const rule = zuForm
    ? "Ten sam podmiot w obu zdaniach → najlepiej forma z <b>zu</b>."
    : "Różne podmioty → <b>dass / damit / anstatt dass / ohne dass</b>.";
  return {
    prompt: `<div class="two-sent"><div>${esc(c.a)}</div><div>${esc(c.b)}</div></div><div class="hint">Jak połączysz te zdania?</div>`,
    options: CONNECTOR_OPTS,
    correct: c.answers,
    explain: `<i>${esc(c.full)}</i><br><span class="muted">${rule}</span>`,
  };
}

const GAP_OPTS = ["zu", "um", "damit", "anstatt", "ohne", "dass"];
const gapDeck = makeDeck(GAPS);
function genGapQ() {
  const g = gapDeck();
  const cap = /^[A-ZÄÖÜ]/.test(g.a);
  const fix = (o) => (cap ? o[0].toUpperCase() + o.slice(1) : o);
  const options = (g.opts || GAP_OPTS).map(fix);
  return {
    prompt: `<div class="sent">${esc(g.s).replace("___", '<span class="gap">&nbsp;?&nbsp;</span>')}</div>`,
    options,
    correct: [g.a],
    explain: `<i>${esc(g.s.replace("___", g.a))}</i>`,
  };
}

const zuDeck = makeDeck(ZU_ITEMS);
function genZuQ() {
  const z = zuDeck();
  return {
    prompt: `<div class="sent">${esc(z.s).replace("___", '<span class="gap">&nbsp;?&nbsp;</span>')}</div>`,
    options: shuffle(z.opts),
    correct: [z.opts[0]],
    explain: `<i>${esc(z.s.replace("___", z.opts[0]))}</i><br><span class="muted">${esc(z.why)}</span>`,
  };
}

const BINS = {
  zer: { name: "zer- : zniszczenie", desc: "rozpadło się, zepsuło" },
  verFehler: { name: "ver- : błąd, pomyłka", desc: "zrobione niewłaściwie" },
  verWeg: { name: "ver- : oddalenie", desc: "opuszczenie, zniknięcie" },
};
const prefixDeck = makeDeck(PREFIX_ITEMS);
function genPrefixQ() {
  const p = prefixDeck();
  const names = Object.values(BINS).map((b) => b.name);
  return {
    prompt: `<div class="big">${esc(p.w)}</div><div class="hint">Co oznacza przedrostek?</div>`,
    options: names,
    correct: [BINS[p.bin].name],
    explain: `<b>${esc(p.w)}</b> – ${esc(p.pl)}`,
  };
}

/* ================= Modes ================= */

function quizVocab() {
  const pool = activeWords();
  runQuiz({ key: "quiz", title: "Quiz słówek", n: 10, gen: () => genVocabQ(pool) });
}
function articleGame() {
  runQuiz({ key: "article", title: "der / die / das", seconds: 60, gen: genArticleQ, cols: 3, big: true });
}
function collocGame() {
  runQuiz({ key: "colloc", title: "Kolokacje", n: 10, gen: genCollocQ, cols: 2 });
}
function connectorGame() {
  runQuiz({ key: "conn", title: "Łączenie zdań", n: 10, gen: genConnectorQ, cols: 2 });
}
function gapGame() {
  runQuiz({ key: "gaps", title: "Luki", n: 12, gen: genGapQ, cols: 3 });
}
function zuGame() {
  runQuiz({ key: "zu", title: "Zu czy bez zu?", lives: 3, gen: genZuQ });
}

/* ---------- Flashcards ---------- */

const FLASH_PRESETS = [10, 20, 30, 50, 0];

function flashCount(available) {
  const n = S.settings.flashCount;
  return n > 0 ? Math.min(n, available) : available;
}

function flashSetup() {
  show("Fiszki", (el) => {
    const info = h("div");
    const presets = h("div");
    const input = h("input", { class: "num-input", type: "number", inputmode: "numeric", min: "1", "aria-label": "Liczba fiszek" });
    const startBtn = h("button", { class: "btn primary", style: "margin-top:16px", onclick: () => flashSession(false) });
    const randomBtn = h("button", { class: "btn ghost", onclick: () => flashSession(true) });

    function refresh() {
      const pool = activeWords();
      const due = dueWords(pool).length;
      const fresh = pool.filter((w) => !S.srs[w.key]).length;
      const learnable = due + fresh || pool.length;
      info.innerHTML = "";
      info.append(
        h("div", null, h("b", null, `Do powtórki: ${due}`), ` · nowe: ${fresh} · w działach: ${pool.length}`),
        h("div", { class: "muted", style: "margin-top:6px;font-size:15px" }, "Najpierw lecą powtórki, potem nowe słówka. Znane wracają coraz rzadziej, nieznane – szybko.")
      );
      for (const b of presets.children) b.classList.toggle("on", Number(b.dataset.n) === (S.settings.flashCount || 0));
      if (document.activeElement !== input) input.value = S.settings.flashCount > 0 ? S.settings.flashCount : "";
      input.placeholder = `wszystkie (${pool.length})`;
      startBtn.textContent = `Ucz się (${flashCount(learnable)} kart)`;
      startBtn.disabled = !pool.length;
      randomBtn.textContent = `Losowe ${flashCount(pool.length)} ze wszystkich wybranych`;
      randomBtn.disabled = !pool.length;
    }

    const setCount = (n) => { S.settings.flashCount = n; save(); refresh(); };
    for (const n of FLASH_PRESETS) {
      presets.append(h("button", { class: "pill", "data-n": n, onclick: () => setCount(n) }, n ? String(n) : "Wszystkie"));
    }
    const step = (d) => {
      const max = activeWords().length || 1;
      const cur = S.settings.flashCount > 0 ? S.settings.flashCount : max;
      setCount(Math.max(1, Math.min(max, cur + d)));
    };
    input.addEventListener("input", () => {
      const v = parseInt(input.value, 10);
      if (v > 0) setCount(v);
    });
    input.addEventListener("blur", refresh);

    el.append(
      h("div", { class: "card" }, info),
      h("div", { class: "section-title" }, "Ile fiszek w sesji"),
      presets,
      h("div", { class: "stepper" },
        h("button", { class: "icon-btn", "aria-label": "Mniej", onclick: () => step(-5) }, "−"),
        input,
        h("button", { class: "icon-btn", "aria-label": "Więcej", onclick: () => step(5) }, "+")
      ),
      h("div", { class: "section-title" }, "Kierunek"),
      dirPills(refresh),
      h("div", { class: "section-title" }, "Działy (wspólne dla wszystkich trybów)"),
      setPills(refresh),
      startBtn,
      randomBtn
    );
    refresh();
  });
}

function dirPills(onChange) {
  const wrap = h("div");
  for (const [v, label] of [["de-pl", "Niemiecki → polski"], ["pl-de", "Polski → niemiecki"]]) {
    const b = h("button", { class: `pill ${S.settings.dir === v ? "on" : ""}` }, label);
    b.addEventListener("click", () => {
      S.settings.dir = v;
      save();
      for (const x of wrap.children) x.classList.toggle("on", x === b);
      onChange && onChange();
    });
    wrap.append(b);
  }
  return wrap;
}

function setPills(onChange) {
  const btns = {};
  const sync = () => { for (const id in btns) btns[id].classList.toggle("on", S.settings.sets.includes(id)); };
  const all = h("button", { class: "pill" }, "Wszystkie / żadne");
  all.addEventListener("click", () => {
    S.settings.sets = S.settings.sets.length === VOCAB.length ? [] : VOCAB.map((s) => s.id);
    save();
    sync();
    onChange && onChange();
  });
  for (const s of VOCAB) {
    const b = h("button", { class: "pill" }, `${s.name} (${s.words.length})`);
    b.addEventListener("click", () => {
      const on = S.settings.sets.includes(s.id);
      S.settings.sets = on ? S.settings.sets.filter((x) => x !== s.id) : [...S.settings.sets, s.id];
      save();
      sync();
      onChange && onChange();
    });
    btns[s.id] = b;
  }
  sync();
  return h("div", null, all, Object.values(btns));
}

function flashSession(random) {
  const pool = activeWords();
  let queue;
  if (random) queue = shuffle(pool);
  else {
    const due = shuffle(dueWords(pool)).sort((a, b) => srsGet(a.key).b - srsGet(b.key).b);
    const fresh = shuffle(pool.filter((w) => !S.srs[w.key]));
    queue = [...due, ...fresh];
    if (!queue.length) queue = shuffle(pool);
  }
  queue = queue.slice(0, flashCount(queue.length));
  const toPl = S.settings.dir === "de-pl";
  let known = 0, seen = 0;

  show("Fiszki", (el) => {
    const hud = h("div", { class: "hud" });
    const area = h("div");
    el.append(hud, area);

    function render() {
      hud.innerHTML = "";
      hud.append(h("span", null, `Zostało: ${queue.length}`), h("div", { class: "bar" }, h("i", { style: `width:${(seen / (seen + queue.length)) * 100}%` })), h("span", null, `${known} ✓`));
      area.innerHTML = "";
      if (!queue.length) return done();
      const w = queue[0];
      let flipped = false;
      const box = srsGet(w.key).b;
      const card = h("div", { class: "card-flip pop" },
        h("div", { class: "box" }, box ? `pudełko ${box}/6` : "nowe"),
        h("div", { class: "front" }, toPl ? w.de : w.pl),
        h("div", { class: "tap" }, "Dotknij, aby odwrócić")
      );
      const speakBtn = h("button", { class: "speak", "aria-label": "Wymowa" }, "♪");
      speakBtn.addEventListener("click", (e) => { e.stopPropagation(); speak(w.de); });
      card.append(speakBtn);
      const actions = h("div", { class: "btns-2", style: "margin-top:14px;visibility:hidden" },
        h("button", { class: "btn red", onclick: () => rate(false) }, "Nie wiem"),
        h("button", { class: "btn green", onclick: () => rate(true) }, "Wiem")
      );
      const hint = h("div", { class: "muted center", style: "margin-top:10px;font-size:14px" }, "Możesz też przesunąć kartę: w prawo = wiem, w lewo = nie wiem");
      area.append(card, actions, hint);

      function flip() {
        if (flipped) return;
        flipped = true;
        card.querySelector(".tap").remove();
        card.append(h("div", { class: "back pop" }, toPl ? w.pl : w.de));
        actions.style.visibility = "visible";
        if (toPl) speak(w.de);
      }

      let sx = null, dx = 0;
      card.addEventListener("pointerdown", (e) => { if (e.target.closest(".speak")) return; sx = e.clientX; dx = 0; });
      card.addEventListener("pointermove", (e) => {
        if (sx == null || !flipped) return;
        dx = e.clientX - sx;
        card.style.transform = `translateX(${dx}px) rotate(${dx / 20}deg)`;
      });
      const end = () => {
        if (sx == null) return;
        sx = null;
        if (flipped && Math.abs(dx) > 90) return rate(dx > 0);
        card.style.transform = "";
        if (Math.abs(dx) < 8) flip();
      };
      card.addEventListener("pointerup", end);
      card.addEventListener("pointercancel", () => { sx = null; card.style.transform = ""; });

      function rate(ok) {
        srsRecord(w.key, ok);
        beep(ok);
        queue.shift();
        if (ok) { known++; seen++; addXP(5); }
        else queue.splice(Math.min(3, queue.length), 0, w);
        render();
      }
    }

    function done() {
      area.append(
        h("div", { class: "card center pop" },
          h("div", { class: "muted" }, "Sesja zakończona"),
          h("div", { class: "result-big" }, `${known}`),
          h("div", null, "słówek zaliczonych")),
        h("button", { class: "btn primary", onclick: () => flashSession(random) }, "Kolejna sesja"),
        h("button", { class: "btn ghost", onclick: home }, "Menu")
      );
    }
    render();
  }, flashSetup);
}

/* ---------- Memory ---------- */

function memoryGame() {
  const pool = activeWords().filter((w) => w.de.length <= 34 && w.pl.length <= 40);
  const pairs = shuffle(pool).slice(0, 6);
  const cards = shuffle(pairs.flatMap((w) => [{ w, side: "de" }, { w, side: "pl" }]));
  let open = [], moves = 0, matched = 0, start = Date.now(), busy = false;

  show("Memory", (el) => {
    const hud = h("div", { class: "hud" });
    const grid = h("div", { class: "memory" });
    el.append(hud, grid);
    const renderHud = () => { hud.innerHTML = ""; hud.append(h("span", null, `Ruchy: ${moves}`), h("span", { class: "spacer" }), h("span", null, `Pary: ${matched}/6`)); };
    renderHud();

    for (const c of cards) {
      const b = h("button", { class: `mem ${c.side}` }, c.side === "de" ? c.w.de : c.w.pl);
      c.el = b;
      b.addEventListener("click", () => {
        if (busy || b.classList.contains("open") || b.classList.contains("done")) return;
        b.classList.add("open");
        if (c.side === "de") speak(c.w.de);
        open.push(c);
        if (open.length < 2) return;
        moves++;
        const [a, d] = open;
        open = [];
        if (a.w.key === d.w.key && a.side !== d.side) {
          beep(true);
          a.el.classList.add("done");
          d.el.classList.add("done");
          matched++;
          if (matched === 6) setTimeout(finish, 500);
        } else {
          beep(false);
          busy = true;
          a.el.classList.add("miss");
          d.el.classList.add("miss");
          setTimeout(() => {
            for (const x of [a, d]) x.el.classList.remove("open", "miss");
            busy = false;
          }, 900);
        }
        renderHud();
      });
      grid.append(b);
    }

    function finish() {
      const secs = Math.round((Date.now() - start) / 1000);
      const xp = Math.max(15, 70 - (moves - 6) * 4);
      addXP(xp);
      const rec = setBest("memory", -moves);
      el.innerHTML = "";
      el.append(
        h("div", { class: "card center pop" },
          h("div", { class: "muted" }, `Wszystkie pary w ${secs} s`),
          h("div", { class: "result-big" }, `${moves} ruchów`),
          h("div", null, `+${xp} XP`),
          rec ? h("div", { style: "color:var(--gold);font-weight:800" }, "Nowy rekord!") : h("div", { class: "muted" }, `Rekord: ${-S.best.memory} ruchów`)),
        h("div", { class: "card" }, pairs.map((w) => h("div", { style: "padding:4px 0" }, h("b", null, w.de), " – ", w.pl))),
        h("button", { class: "btn primary", onclick: memoryGame }, "Nowa plansza"),
        h("button", { class: "btn ghost", onclick: home }, "Menu")
      );
    }
  });
}

/* ---------- Pointer drag (działa na iPhonie) ---------- */
/*
  enableDrag(el, { onTap, onMove(x, y), onDrop(x, y) })
  Ruch > 8 px = przeciąganie, inaczej = dotknięcie.
*/
function enableDrag(el, { onTap, onStart, onMove, onDrop }) {
  let sx, sy, dragging = false, ghost = null, offX = 0, offY = 0, pid = null;
  el.addEventListener("pointerdown", (e) => {
    if (e.button && e.button !== 0) return;
    pid = e.pointerId;
    sx = e.clientX; sy = e.clientY;
    dragging = false;
    el.setPointerCapture(pid);
  });
  el.addEventListener("pointermove", (e) => {
    if (pid !== e.pointerId) return;
    if (!dragging && Math.hypot(e.clientX - sx, e.clientY - sy) > 8) {
      dragging = true;
      const r = el.getBoundingClientRect();
      offX = sx - r.left; offY = sy - r.top;
      ghost = el.cloneNode(true);
      ghost.classList.add("ghost");
      ghost.style.width = r.width + "px";
      document.body.append(ghost);
      el.classList.add("placeholder");
      onStart && onStart();
    }
    if (dragging) {
      ghost.style.left = e.clientX - offX + "px";
      ghost.style.top = e.clientY - offY + "px";
      onMove && onMove(e.clientX, e.clientY);
    }
  });
  const end = (e, cancelled) => {
    if (pid !== e.pointerId) return;
    pid = null;
    if (dragging) {
      ghost.remove();
      el.classList.remove("placeholder");
      dragging = false;
      if (!cancelled) onDrop && onDrop(e.clientX, e.clientY);
      else onDrop && onDrop(null, null);
    } else if (!cancelled) onTap && onTap();
  };
  el.addEventListener("pointerup", (e) => end(e, false));
  el.addEventListener("pointercancel", (e) => end(e, true));
}

const inRect = (el, x, y) => {
  const r = el.getBoundingClientRect();
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
};

/* ---------- Sentence builder ---------- */

function builderGame() {
  const list = shuffle(SENTENCES).slice(0, 8);
  let idx = 0, firstTry = 0, xp = 0;

  show("Układanka zdań", (el) => {
    function round() {
      el.innerHTML = "";
      if (idx >= list.length) return finish();
      const target = list[idx];
      const words = target.split(" ");
      let tries = 0;
      let answer = [];
      let pool = shuffle(words.map((w, i) => ({ w, id: i })));
      if (pool.every((t, i) => t.id === i)) pool.reverse();

      const hud = h("div", { class: "hud" }, h("span", null, `${idx + 1}/${list.length}`), h("div", { class: "bar" }, h("i", { style: `width:${(idx / list.length) * 100}%` })), h("span", null, `${firstTry} ✓`));
      const ansZone = h("div", { class: "zone answer" });
      const poolZone = h("div", { class: "zone pool" });
      const fb = h("div");
      const checkBtn = h("button", { class: "btn primary" }, "Sprawdź");
      const showBtn = h("button", { class: "btn ghost" }, "Pokaż odpowiedź");
      el.append(hud, h("div", { class: "muted", style: "margin:0 4px 8px;font-size:15px" }, "Dotknij słowa, aby je dodać lub usunąć. Przeciągnij, aby zmienić kolejność."), ansZone, poolZone, checkBtn, showBtn, fb);

      function insertIndex(x, y, exclude) {
        const tiles = [...ansZone.children].filter((t) => t !== exclude);
        for (let k = 0; k < tiles.length; k++) {
          const r = tiles[k].getBoundingClientRect();
          if (y < r.top) return k;
          if (y <= r.bottom && x < r.left + r.width / 2) return k;
        }
        return tiles.length;
      }

      function tileEl(t, inAnswer) {
        const b = h("div", { class: "tile" }, t.w);
        enableDrag(b, {
          onTap: () => {
            if (inAnswer) { answer = answer.filter((x) => x !== t); pool.push(t); }
            else { pool = pool.filter((x) => x !== t); answer.push(t); }
            draw();
          },
          onMove: (x, y) => ansZone.classList.toggle("hot", inRect(ansZone, x, y)),
          onDrop: (x, y) => {
            ansZone.classList.remove("hot");
            if (x == null) return draw();
            if (inRect(ansZone, x, y) || (inAnswer && !inRect(poolZone, x, y))) {
              const k = insertIndex(x, y, b);
              answer = answer.filter((z) => z !== t);
              pool = pool.filter((z) => z !== t);
              answer.splice(k, 0, t);
            } else if (inAnswer) {
              answer = answer.filter((z) => z !== t);
              pool.push(t);
            }
            draw();
          },
        });
        return b;
      }

      function draw() {
        ansZone.innerHTML = "";
        poolZone.innerHTML = "";
        answer.forEach((t) => ansZone.append(tileEl(t, true)));
        pool.forEach((t) => poolZone.append(tileEl(t, false)));
        if (!answer.length) ansZone.append(h("span", { class: "muted", style: "padding:10px" }, "Tutaj ułóż zdanie"));
      }
      draw();

      checkBtn.addEventListener("click", () => {
        if (pool.length) { toast("Użyj wszystkich słów"); return; }
        const got = answer.map((t) => t.w).join(" ");
        tries++;
        if (got === target) {
          beep(true);
          [...ansZone.children].forEach((c) => c.classList.add("right"));
          if (tries === 1) { firstTry++; xp += 20; addXP(20); } else { xp += 5; addXP(5); }
          fb.innerHTML = "";
          fb.append(h("div", { class: "feedback pop" }, h("div", { class: "title" }, "Super!"), h("i", null, target)),
            h("button", { class: "btn primary", style: "margin-top:12px", onclick: () => { idx++; round(); } }, "Dalej"));
          checkBtn.remove(); showBtn.remove();
          speak(target);
        } else {
          beep(false);
          ansZone.classList.add("shake");
          setTimeout(() => ansZone.classList.remove("shake"), 500);
          [...ansZone.children].forEach((c, k) => c.classList.toggle("wrong", answer[k].w !== words[k]));
          fb.innerHTML = "";
          fb.append(h("div", { class: "feedback bad pop" }, "Na czerwono słowa na złym miejscu. Popraw i sprawdź ponownie."));
        }
      });
      showBtn.addEventListener("click", () => {
        fb.innerHTML = "";
        fb.append(h("div", { class: "feedback bad pop" }, h("div", { class: "title" }, "Odpowiedź:"), h("i", null, target)),
          h("button", { class: "btn primary", style: "margin-top:12px", onclick: () => { idx++; round(); } }, "Dalej"));
        checkBtn.remove(); showBtn.remove();
      });
    }

    function finish() {
      setBest("builder", firstTry);
      el.append(
        h("div", { class: "card center pop" },
          h("div", { class: "muted" }, "Za pierwszym razem"),
          h("div", { class: "result-big" }, `${firstTry}/${list.length}`),
          h("div", null, `+${xp} XP`)),
        h("button", { class: "btn primary", onclick: builderGame }, "Jeszcze raz"),
        h("button", { class: "btn ghost", onclick: home }, "Menu")
      );
    }
    round();
  });
}

/* ---------- Prefix sort ---------- */

function prefixGame() {
  const items = shuffle(PREFIX_ITEMS).slice(0, 10);
  let idx = 0, score = 0, xp = 0;

  show("zer- / ver-", (el) => {
    function round() {
      el.innerHTML = "";
      if (idx >= items.length) return finish();
      const it = items[idx];
      let locked = false;
      const hud = h("div", { class: "hud" }, h("span", null, `${idx + 1}/${items.length}`), h("div", { class: "bar" }, h("i", { style: `width:${(idx / items.length) * 100}%` })), h("span", null, `${score} pkt`));
      const cardEl = h("div", { class: "drop-card pop" }, it.w);
      const bins = h("div", { class: "bins" });
      const fb = h("div");
      const binEls = {};
      for (const [id, b] of Object.entries(BINS)) {
        const be = h("button", { class: "bin" }, h("b", null, b.name), h("small", null, b.desc));
        be.addEventListener("click", () => choose(id));
        binEls[id] = be;
        bins.append(be);
      }
      el.append(hud, h("div", { class: "muted center", style: "font-size:15px" }, "Przeciągnij kartę do kosza albo dotknij kosza"), h("div", { class: "drop-card-wrap" }, cardEl), bins, fb);

      const binAt = (x, y) => Object.keys(binEls).find((id) => inRect(binEls[id], x, y));
      enableDrag(cardEl, {
        onMove: (x, y) => { const id = binAt(x, y); for (const k in binEls) binEls[k].classList.toggle("hot", k === id); },
        onDrop: (x, y) => { for (const k in binEls) binEls[k].classList.remove("hot"); if (x != null) { const id = binAt(x, y); if (id) choose(id); } },
      });

      function choose(id) {
        if (locked) return;
        locked = true;
        const ok = id === it.bin;
        beep(ok);
        binEls[it.bin].classList.add("ok");
        if (!ok) binEls[id].classList.add("bad");
        if (ok) { score++; xp += 10; addXP(10); }
        cardEl.style.visibility = "hidden";
        fb.append(
          h("div", { class: `feedback pop ${ok ? "" : "bad"}` }, h("div", { class: "title" }, ok ? "Dobrze!" : "Nie tym razem"), h("b", null, it.w), ` – ${it.pl}`),
          h("button", { class: "btn primary", style: "margin-top:12px", onclick: () => { idx++; round(); } }, "Dalej")
        );
      }
    }
    function finish() {
      setBest("prefix", score);
      el.append(
        h("div", { class: "card center pop" }, h("div", { class: "result-big" }, `${score}/${items.length}`), h("div", null, `+${xp} XP`),
          h("div", { class: "muted", style: "margin-top:8px" }, "Pamiętaj: zer- i ver- nie łączą się z ge- w Partizip II (zerrissen, verlassen).")),
        h("button", { class: "btn primary", onclick: prefixGame }, "Jeszcze raz"),
        h("button", { class: "btn ghost", onclick: home }, "Menu")
      );
    }
    round();
  });
}

/* ---------- Cloze (rozmowa o pracę / teksty) ---------- */

function clozeMenu() {
  show("Rozmowa o pracę", (el) => {
    el.append(h("div", { class: "muted", style: "margin:0 4px 12px" }, "Wybierz pytanie. Uzupełniasz luki w odpowiedzi po kolei, potem możesz odsłuchać całość."));
    TEXTS.forEach((t, i) => {
      const best = S.best["cloze" + i];
      el.append(h("button", { class: "day", onclick: () => clozeGame(i) },
        h("span", { class: "num" }, i + 1),
        h("span", null, h("b", null, t.q), h("br"), h("small", { class: "muted" }, t.pl + (best != null ? ` · najlepiej: ${best} błędów` : "")))
      ));
    });
  });
}

function clozeGame(i, opts = {}) {
  const t = TEXTS[i];
  const parts = t.a.split(/(\{[^}]+\})/).filter(Boolean);
  const gaps = parts.filter((p) => p.startsWith("{")).map((p) => p.slice(1, -1));
  const otherWords = TEXTS.filter((_, k) => k !== i).flatMap((x) => (x.a.match(/\{([^}]+)\}/g) || []).map((m) => m.slice(1, -1)));
  const bankWords = shuffle([...gaps.map((w, k) => ({ w, k })), ...shuffle(uniq(otherWords).filter((w) => !gaps.includes(w))).slice(0, 3).map((w) => ({ w, k: -1 }))]);
  let cur = 0, mistakes = 0;

  show(opts.title || "Rozmowa o pracę", (el) => {
    const gapEls = [];
    const text = h("div", { class: "cloze" });
    for (const p of parts) {
      if (p.startsWith("{")) {
        const g = h("span", { class: "g" }, p.slice(1, -1));
        gapEls.push(g);
        text.append(g);
      } else text.append(p);
    }
    const bank = h("div", { class: "bank" });
    const fb = h("div");
    if (opts.intro) el.append(opts.intro);
    el.append(
      h("div", { class: "story" }, h("div", { class: "who" }, t.q), h("div", { class: "muted" }, t.pl)),
      h("div", { class: "card" }, text),
      h("div", { class: "muted", style: "margin:0 4px" }, "Dotknij słowa pasującego do podświetlonej luki:"),
      bank, fb
    );
    const mark = () => gapEls.forEach((g, k) => g.classList.toggle("cur", k === cur));
    mark();

    for (const b of bankWords) {
      const tile = h("button", { class: "tile" }, b.w);
      tile.addEventListener("click", () => {
        if (cur >= gaps.length) return;
        if (b.w === gaps[cur] && !tile.classList.contains("used")) {
          beep(true);
          gapEls[cur].classList.add("filled");
          tile.classList.add("used");
          addXP(4);
          cur++;
          mark();
          if (cur < gaps.length) gapEls[cur].scrollIntoView({ behavior: "smooth", block: "center" });
          else finish();
        } else {
          beep(false);
          mistakes++;
          tile.classList.add("shake");
          setTimeout(() => tile.classList.remove("shake"), 500);
        }
      });
      bank.append(tile);
    }

    function finish() {
      const plain = t.a.replace(/[{}]/g, "");
      const bk = "cloze" + i;
      if (S.best[bk] == null || mistakes < S.best[bk]) { S.best[bk] = mistakes; save(); }
      const bonus = Math.max(0, 30 - mistakes * 5);
      addXP(bonus);
      bank.remove();
      fb.append(
        h("div", { class: `feedback pop ${mistakes > 2 ? "bad" : ""}` },
          h("div", { class: "title" }, mistakes ? `Gotowe! Błędy: ${mistakes}` : "Bezbłędnie!"),
          `+${bonus} XP bonusu`),
        h("button", { class: "btn", style: "margin-top:12px", onclick: () => speak(plain) }, "Odsłuchaj całą odpowiedź"),
        opts.onFinish
          ? h("button", { class: "btn primary", onclick: () => opts.onFinish({ mistakes, total: gaps.length }) }, "Dalej")
          : [h("button", { class: "btn primary", onclick: () => clozeGame((i + 1) % TEXTS.length) }, "Następne pytanie"),
             h("button", { class: "btn ghost", onclick: clozeMenu }, "Lista pytań")]
      );
    }
  }, opts.back || clozeMenu);
}

/* ---------- RPG: Praktykant ---------- */

const wordsFrom = (...sets) => WORDS.filter((w) => sets.includes(w.set));
const DAYS = [
  {
    title: "Magazyn: przyjmujesz dostawę",
    who: "Herr Lerchner, kierownik magazynu",
    story: "Willkommen! Pierwszego dnia przychodzi duża dostawa, ale część towaru jest uszkodzona. Rozpoznaj usterki i słownictwo magazynowe.",
    build: () => [
      ...Array.from({ length: 6 }, () => genVocabQ(wordsFrom("usterki", "reklamacje", "beschaffung"), "pl-de")),
      genPrefixQ(), genPrefixQ(),
    ],
  },
  {
    title: "Biuro: zamówienia i faktury",
    who: "Frau Sommer, księgowa",
    story: "Dziś pomagasz w biurze. Trzeba złożyć ofertę, udzielić zlecenia i uregulować rachunki – dopasuj właściwe czasowniki.",
    build: () => Array.from({ length: 8 }, genCollocQ),
  },
  {
    title: "Szkolenie z higieny",
    who: "Pani z działu BHP",
    story: "Przed pracą w domu opieki każdy przechodzi szkolenie z higieny. Pokaż, że znasz słownictwo i wiesz, kiedy użyć „zu”.",
    build: () => [
      ...Array.from({ length: 5 }, () => genVocabQ(wordsFrom("higiena"))),
      genZuQ(), genZuQ(), genZuQ(),
    ],
  },
  {
    title: "U szefa: po co to robisz?",
    who: "Der Chef",
    story: "Szef pyta, po co i dlaczego robisz różne rzeczy. Łącz zdania: um…zu, damit, anstatt, ohne.",
    build: () => [...Array.from({ length: 5 }, genConnectorQ), genGapQ(), genGapQ(), genGapQ()],
  },
  {
    title: "Spotkanie z klientem",
    who: "Klient z Monachium",
    story: "Przychodzi ważny klient z zapytaniem ofertowym. Rozmowa ma być rzeczowa i przyjazna – uważaj na rodzajniki!",
    build: () => [
      ...Array.from({ length: 4 }, () => genVocabQ(wordsFrom("oferty", "zlecenia"))),
      ...Array.from({ length: 2 }, () => genVocabQ(wordsFrom("przymiotniki"), "pl-de")),
      genArticleQ(), genArticleQ(),
    ],
  },
  {
    title: "Rozmowa o awans",
    who: "Dyrektorka HR",
    story: "Ostatni dzień praktyk. Dyrekcja zaprasza cię na rozmowę – może dostaniesz stałą pracę? Uzupełnij swoją odpowiedź.",
    cloze: true,
  },
];

function rpgMenu() {
  show("Praktykant", (el) => {
    const done = S.rpg.done;
    el.append(h("div", { class: "story" },
      h("div", { class: "who" }, "Praktyki w Uhl GmbH"),
      "Masz 6 dni praktyk w niemieckiej firmie. Każdy dzień to inne zadania z twojego zeszytu. Zalicz dzień (min. 60%), żeby odblokować następny."));
    DAYS.forEach((d, i) => {
      const unlocked = i === 0 || done.includes(i - 1);
      const isDone = done.includes(i);
      el.append(h("button", {
        class: `day ${isDone ? "done" : ""} ${unlocked ? "" : "locked"}`,
        onclick: () => (unlocked ? rpgDay(i) : toast("Najpierw zalicz poprzedni dzień")),
      },
        h("span", { class: "num" }, isDone ? "✓" : i + 1),
        h("span", null, h("b", null, `Dzień ${i + 1}: ${d.title}`), h("br"), h("small", { class: "muted" }, isDone ? "zaliczony – możesz powtórzyć" : unlocked ? "dostępny" : "zablokowany"))
      ));
    });
    if (done.length === DAYS.length) {
      el.append(h("div", { class: "card center" }, h("b", null, "Dostałeś stałą umowę! Herzlichen Glückwunsch!"), h("div", { class: "muted" }, "Powtarzaj dni, żeby utrwalać materiał.")));
    }
  });
}

function rpgDay(i) {
  const d = DAYS[i];
  const intro = h("div", { class: "story pop" }, h("div", { class: "who" }, `Dzień ${i + 1} · ${d.who}`), d.story);
  const pass = (ok) => {
    if (ok && !S.rpg.done.includes(i)) { S.rpg.done.push(i); addXP(50); save(); }
  };
  const after = (ok, body) => {
    body.append(
      h("div", { class: `feedback pop ${ok ? "" : "bad"}` },
        h("div", { class: "title" }, ok ? "Dzień zaliczony!" : "Nie tym razem…"),
        ok ? (i + 1 < DAYS.length ? "Szef jest zadowolony. Jutro nowe wyzwanie." : "Dostajesz stałą umowę!") : "Potrzebujesz co najmniej 60%. Spróbuj jeszcze raz."),
      ok && i + 1 < DAYS.length ? h("button", { class: "btn primary", style: "margin-top:12px", onclick: () => rpgDay(i + 1) }, `Dzień ${i + 2}`) : null,
      !ok ? h("button", { class: "btn primary", style: "margin-top:12px", onclick: () => rpgDay(i) }, "Powtórz dzień") : null,
      h("button", { class: "btn ghost", onclick: rpgMenu }, "Mapa praktyk")
    );
  };

  if (d.cloze) {
    const k = Math.floor(Math.random() * 4);
    clozeGame(k, {
      title: `Dzień ${i + 1}`,
      intro,
      back: rpgMenu,
      onFinish: ({ mistakes, total }) => {
        const ok = mistakes <= Math.ceil(total * 0.4);
        pass(ok);
        show(`Dzień ${i + 1}`, (el) => after(ok, el), rpgMenu);
      },
    });
    return;
  }

  runQuiz({
    title: `Dzień ${i + 1}`,
    questions: d.build(),
    intro,
    back: rpgMenu,
    cols: 1,
    onFinish: (r, body) => {
      const ok = r.score / r.total >= 0.6;
      pass(ok);
      after(ok, body);
    },
  });
}

/* ---------- Cheatsheet ---------- */

function cheatsheet() {
  show("Ściąga", (el) => {
    el.classList.add("cheat");
    el.append(h("div", { class: "card", style: "background:#1e3a5f" },
      h("b", null, "Złota zasada: "),
      "ten sam podmiot → zu, um…zu, anstatt…zu, ohne…zu. Różne podmioty → dass, damit, anstatt dass, ohne dass."));
    for (const c of CHEATSHEET) el.append(h("div", { class: "card" }, h("h3", null, c.title), h("div", { html: c.body })));
    cleanup = () => el.classList.remove("cheat");
  });
}

/* ---------- Stats & settings ---------- */

function statsScreen() {
  show("Postępy", (el) => {
    const counts = Array(7).fill(0);
    for (const w of WORDS) counts[srsGet(w.key).b]++;
    const max = Math.max(...counts, 1);
    const labels = ["nowe", "1", "2", "3", "4", "5", "6"];
    const bestNames = { quiz: "Quiz słówek", article: "der/die/das (60 s)", colloc: "Kolokacje", conn: "Łączenie zdań", gaps: "Luki", zu: "Zu czy bez zu (seria)", builder: "Układanka", prefix: "zer-/ver-" };

    el.append(
      h("div", { class: "card" },
        h("table", { class: "stats" },
          h("tr", null, h("td", null, "Poziom"), h("td", null, level())),
          h("tr", null, h("td", null, "XP"), h("td", null, S.xp)),
          h("tr", null, h("td", null, "Dni z rzędu"), h("td", null, S.streak.count)),
          h("tr", null, h("td", null, "Słówek w bazie"), h("td", null, WORDS.length)),
          h("tr", null, h("td", null, "Opanowane (pudełko 4+)"), h("td", null, WORDS.filter((w) => srsGet(w.key).b >= 4).length)),
          h("tr", null, h("td", null, "Dni praktyk zaliczone"), h("td", null, `${S.rpg.done.length}/${DAYS.length}`))
        )
      ),
      h("div", { class: "card" },
        h("b", null, "Słówka w pudełkach powtórek"),
        h("div", { class: "boxes" }, counts.map((c) => h("div", { style: `height:${(c / max) * 100}%`, title: c }))),
        h("div", { class: "boxes-l" }, counts.map((c, k) => h("span", null, `${labels[k]}`, h("br"), c)))
      ),
      h("div", { class: "card" },
        h("b", null, "Rekordy"),
        h("table", { class: "stats" },
          Object.entries(bestNames).map(([k, n]) => h("tr", null, h("td", null, n), h("td", null, S.best[k] ?? "–"))),
          h("tr", null, h("td", null, "Memory (najmniej ruchów)"), h("td", null, S.best.memory != null ? -S.best.memory : "–"))
        )
      ),
      h("div", { class: "section-title" }, "Kierunek tłumaczenia"),
      dirPills(),
      h("div", { class: "section-title" }, "Działy słówek"),
      setPills(),
      h("div", { class: "section-title" }, "Dźwięk"),
      h("button", {
        class: `pill ${S.settings.sound ? "on" : ""}`,
        onclick: (e) => {
          S.settings.sound = !S.settings.sound;
          save();
          e.currentTarget.classList.toggle("on", S.settings.sound);
          e.currentTarget.textContent = S.settings.sound ? "Dźwięki włączone" : "Dźwięki wyłączone";
        },
      }, S.settings.sound ? "Dźwięki włączone" : "Dźwięki wyłączone"),
      h("button", {
        class: "btn red", style: "margin-top:24px",
        onclick: () => { if (confirm("Na pewno usunąć cały postęp?")) { S = defaults(); save(); updateChips(); home(); } },
      }, "Resetuj postęp")
    );
  });
}

/* ================= Start ================= */

document.addEventListener("dblclick", (e) => e.preventDefault(), { passive: false });
document.addEventListener("gesturestart", (e) => e.preventDefault());

updateChips();
home();

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
