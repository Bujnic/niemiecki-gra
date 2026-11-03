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
  for (const c of children.flat(2)) {
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
const range = (n) => Array.from({ length: n }, (_, i) => i);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function makeDeck(items) {
  let deck = [];
  return () => {
    if (!deck.length) deck = shuffle(items);
    return deck.pop();
  };
}

/* Podświetla podmioty (pierwsze wystąpienie każdego) w zdaniu. Zwraca HTML. */
function markSubjects(sentence, subj) {
  let out = esc(sentence);
  for (const s of uniq(subj || [])) {
    const re = new RegExp(`(^|[^\\wäöüÄÖÜß])(${esc(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})(?=[^\\wäöüÄÖÜß]|$)`);
    out = out.replace(re, `$1<mark class="subj">$2</mark>`);
  }
  return out;
}

/* ================= Words ================= */

const WORDS = [];
const SET_NAMES = {};
function rebuildWords() {
  WORDS.length = 0;
  for (const k in SET_NAMES) delete SET_NAMES[k];
  for (const set of VOCAB) {
    SET_NAMES[set.id] = set.name;
    for (const line of set.words) {
      const w = parseWord(line, set.id);
      if (w) WORDS.push(w);
    }
  }
  if (typeof addCustomWords === "function") addCustomWords();
}
function parseWord(line, setId) {
  const [deRaw, plRaw, emo] = line.split("|").map((s) => s.trim());
  if (!deRaw || !plRaw) return null;
  const plural = /\(pl\)\s*$/.test(deRaw);
  const de = deRaw.replace(/\s*\(pl\)\s*$/, "");
  const m = de.match(/^(der|die|das) (\S.*)$/);
  return {
    key: de,
    de,
    pl: plRaw,
    set: setId,
    art: m && !plural ? m[1] : null,
    noun: m ? m[2] : null,
    emoji: emo || (typeof EMOJI !== "undefined" && EMOJI[de]) || "",
  };
}
rebuildWords();
const wordByKey = (k) => WORDS.find((w) => w.key === k);

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
  errors: {},
  stats: { correct: {}, wrong: {}, errorsFixed: 0 },
  settings: { dir: "de-pl", sets: VOCAB.map((s) => s.id), sound: true, counts: {}, prefixPl: false },
});

let S = load();

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY));
    if (!raw) return defaults();
    const d = defaults();
    const s = { ...d, ...raw, settings: { ...d.settings, ...raw.settings }, rpg: { ...d.rpg, ...raw.rpg }, stats: { ...d.stats, ...raw.stats } };
    if (s.settings.flashCount != null && s.settings.counts.flash == null) s.settings.counts.flash = s.settings.flashCount;
    delete s.settings.flashCount;
    return s;
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
  if (typeof checkBadges === "function") checkBadges();
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
  const ids = Object.keys(SET_NAMES);
  const sets = S.settings.sets.filter((s) => ids.includes(s));
  return WORDS.filter((w) => (sets.length ? sets : ids).includes(w.set));
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
    voices.find((v) => v.lang && v.lang.replace("_", "-").startsWith("de")) || null;
}
if ("speechSynthesis" in window) {
  pickVoice();
  speechSynthesis.onvoiceschanged = pickVoice;
}
function speak(text, rate = 0.92) {
  if (!("speechSynthesis" in window)) return toast("Brak syntezy mowy");
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/\(.*?\)/g, ""));
  u.lang = "de-DE";
  if (deVoice) u.voice = deVoice;
  u.rate = rate;
  speechSynthesis.speak(u);
  return u;
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
  screenEl.className = "";
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

/* ================= Shared setup screen ================= */
/*
  countPicker: presety + pole liczby + / −, zapamiętane w S.settings.counts[id].
  Wartość 0 = „Wszystkie”. Zmiany nie przerysowują ekranu (brak skoku na górę).
*/
function countValue(id, c) {
  const v = S.settings.counts[id];
  return v == null ? c.def : v;
}
function countFor(id, c, available) {
  const v = countValue(id, c);
  const max = c.all === false ? c.max : available;
  if (!(max >= 1)) return 0;
  return v > 0 ? clamp(v, Math.min(c.min || 1, max), max) : max;
}

function countPicker(id, c, onChange) {
  const presets = h("div");
  const input = h("input", {
    class: "num-input", type: "number", inputmode: "numeric", min: String(c.min || 1),
    autocomplete: "off", "aria-label": c.label,
  });
  const set = (n) => { S.settings.counts[id] = n; save(); refresh(); onChange && onChange(); };
  for (const n of c.presets) {
    presets.append(h("button", { class: "pill", "data-n": n, onclick: () => set(n) }, n ? `${n}${c.unit || ""}` : "Wszystkie"));
  }
  const step = (d) => {
    const max = c.all === false ? c.max : Math.max(1, c.available());
    const cur = countValue(id, c) > 0 ? countValue(id, c) : max;
    set(clamp(cur + d, c.min || 1, max));
  };
  input.addEventListener("input", () => {
    const v = parseInt(input.value, 10);
    if (v > 0) { S.settings.counts[id] = v; save(); refreshButtons(); onChange && onChange(); }
  });
  input.addEventListener("blur", refresh);

  function refreshButtons() {
    const v = countValue(id, c);
    for (const b of presets.children) b.classList.toggle("on", Number(b.dataset.n) === v);
  }
  function refresh() {
    refreshButtons();
    const v = countValue(id, c);
    if (document.activeElement !== input) input.value = v > 0 ? v : "";
    input.placeholder = c.all === false ? "" : `wszystkie (${c.available()})`;
  }
  refresh();
  const el = h("div", null,
    presets,
    h("div", { class: "stepper" },
      h("button", { class: "icon-btn", "aria-label": "Mniej", onclick: () => step(-(c.step || 5)) }, "−"),
      input,
      h("button", { class: "icon-btn", "aria-label": "Więcej", onclick: () => step(c.step || 5) }, "+")
    )
  );
  return { el, refresh };
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
  const ids = () => Object.keys(SET_NAMES);
  const sync = () => { for (const id in btns) btns[id].classList.toggle("on", S.settings.sets.includes(id)); };
  const all = h("button", { class: "pill" }, "Wszystkie / żadne");
  all.addEventListener("click", () => {
    S.settings.sets = S.settings.sets.length >= ids().length ? [] : ids();
    save();
    sync();
    onChange && onChange();
  });
  for (const id of ids()) {
    const n = WORDS.filter((w) => w.set === id).length;
    const b = h("button", { class: "pill" }, `${SET_NAMES[id]} (${n})`);
    b.addEventListener("click", () => {
      const on = S.settings.sets.includes(id);
      S.settings.sets = on ? S.settings.sets.filter((x) => x !== id) : [...S.settings.sets, id];
      save();
      sync();
      onChange && onChange();
    });
    btns[id] = b;
  }
  sync();
  return h("div", null, all, Object.values(btns));
}

function togglePill(label, getter, setter, onChange) {
  const b = h("button", { class: `pill ${getter() ? "on" : ""}` }, label);
  b.addEventListener("click", () => {
    setter(!getter());
    save();
    b.classList.toggle("on", getter());
    onChange && onChange();
  });
  return b;
}

/*
  setupScreen(cfg)
  cfg: { id, title, back, info(): Node|string, count: {label, presets, def, available(), unit, all, max, min, step},
         sets, dir, options(refresh): Node[], buttons: [{ label(n), cls, run(n), available() }], footer(): Node }
*/
function setupScreen(cfg) {
  show(cfg.title, (el) => {
    const info = h("div", { class: "card" });
    const btns = cfg.buttons.map((b) => {
      const e = h("button", { class: `btn ${b.cls || "primary"}` });
      return { b, e };
    });
    const avail = (b) => (b.available ? b.available() : cfg.count.available ? cfg.count.available() : cfg.count.max);
    function refresh() {
      if (cfg.info) {
        info.innerHTML = "";
        info.append(cfg.info());
      }
      picker.refresh();
      for (const { b, e } of btns) {
        const n = countFor(cfg.id, cfg.count, avail(b));
        e.textContent = b.label(n);
        e.disabled = !(n > 0);
      }
    }
    const picker = countPicker(cfg.id, cfg.count, () => refresh());
    for (const { b, e } of btns) {
      e.addEventListener("click", () => {
        const n = countFor(cfg.id, cfg.count, avail(b));
        if (n > 0) b.run(n);
      });
    }
    if (cfg.info) el.append(info);
    el.append(h("div", { class: "section-title" }, cfg.count.label), picker.el);
    if (cfg.dir) el.append(h("div", { class: "section-title" }, "Kierunek"), dirPills(refresh));
    if (cfg.options) el.append(...cfg.options(refresh));
    if (cfg.sets) el.append(h("div", { class: "section-title" }, "Działy słówek (wspólne dla wszystkich trybów)"), setPills(refresh));
    el.append(h("div", { style: "height:8px" }), ...btns.map((x) => x.e));
    if (cfg.footer) el.append(cfg.footer());
    refresh();
  }, cfg.back || home);
}

/* ================= Explanations ================= */

const RULES = Object.fromEntries(CHEATSHEET.map((c) => [c.id, c]));

function ruleButton(ruleId) {
  const r = RULES[ruleId];
  if (!r) return null;
  const box = h("div", { class: "rule-box", hidden: true }, h("h3", null, r.title), h("div", { html: r.body }));
  const b = h("button", { class: "btn small ghost", style: "margin-top:10px" }, "Reguła ze Ściągi ▾");
  b.addEventListener("click", () => {
    box.hidden = !box.hidden;
    b.textContent = box.hidden ? "Reguła ze Ściągi ▾" : "Ukryj regułę ▴";
  });
  return h("div", null, b, box);
}

/* res: { ok, given, expected, alt, explain (html), pickedWhy, rule, after (html) } */
function feedbackEl(res) {
  return h("div", { class: `feedback pop ${res.almost ? "almost" : res.ok ? "" : "bad"}` },
    h("div", { class: "title" },
      res.almost ? `Prawie dobrze! ${res.almostWhy || ""}` :
      res.ok ? (res.alt ? `Dobrze! Częściej: ${res.expected}` : "Dobrze!") : res.expected != null ? `Poprawnie: ${res.expected}` : "Nie tym razem"),
    (!res.ok || res.almost) && res.given != null && res.given !== "" ? h("div", { class: "picked" },
      h("span", { class: "muted" }, "Twoja odpowiedź: "), h("b", null, res.given),
      res.pickedWhy ? h("div", { class: "why-not" }, res.pickedWhy) : null) : null,
    res.explain ? h("div", { class: "explain", html: res.explain }) : null,
    res.after ? h("div", { class: "after", html: res.after }) : null,
    res.rule ? ruleButton(res.rule) : null
  );
}

/* ================= Session engine ================= */
/*
  runSession(cfg)
  cfg: { key, title, back, again, steps: [] | gen(i), n, lives, seconds, intro, onFinish(result, body) }
  step: { kind: "mcq" | "builder" | "prefix", ...dane }; renderer woła ctx.done(res).
*/
const RENDERERS = {};

function runSession(cfg) {
  const back = cfg.back || home;
  show(cfg.title, (el) => {
    let i = 0, score = 0, lives = cfg.lives || 0, combo = 0, xpGained = 0, answered = 0;
    let timeLeft = cfg.seconds || 0, timerId = null, finished = false;
    const total = cfg.steps ? cfg.steps.length : cfg.n || 0;
    const log = [];

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

    const outOfLives = () => cfg.lives && lives <= 0;

    function next() {
      if (finished) return;
      if (total && i >= total) return finish();
      if (outOfLives()) return finish();
      const step = cfg.steps ? cfg.steps[i] : cfg.gen(i);
      renderHud();
      body.innerHTML = "";
      const stage = h("div", { class: "stage" });
      body.append(stage);
      let doneOnce = false;
      RENDERERS[step.kind](stage, step, {
        timed: !!cfg.seconds,
        test: !!cfg.test,
        done: (res) => {
          if (doneOnce || finished) return;
          doneOnce = true;
          result(step, res, stage);
        },
      });
    }

    function result(step, res, stage) {
      answered++;
      log.push({ step, res });
      if (cfg.test) {
        if (res.ok) score++;
        if (step.ref) recordAnswer(step.ref, res.ok);
        i++;
        setTimeout(next, 250);
        return;
      }
      beep(res.ok);
      if (step.onResult) step.onResult(res.ok, res);
      if (step.ref) recordAnswer(step.ref, res.ok);
      if (res.ok) {
        combo++;
        score++;
        const gain = (step.xp || 10) + (combo >= 3 ? 5 : 0);
        xpGained += gain;
        addXP(gain);
      } else {
        combo = 0;
        if (cfg.lives) lives--;
      }
      i++;
      renderHud();

      if (cfg.seconds) {
        setTimeout(() => (outOfLives() ? finish() : next()), res.ok ? 350 : 900);
        return;
      }
      const fb = feedbackEl(res);
      const nextBtn = h("button", { class: "btn primary", style: "margin-top:14px" }, total && i >= total ? "Wynik" : "Dalej");
      nextBtn.addEventListener("click", () => (outOfLives() ? finish() : next()));
      stage.append(fb, nextBtn);
      if (res.ok && !res.explain && !res.after) setTimeout(() => nextBtn.isConnected && nextBtn.click(), 700);
      else nextBtn.scrollIntoView({ behavior: "smooth", block: "end" });
    }

    function finish() {
      if (finished) return;
      finished = true;
      if (timerId) clearInterval(timerId);
      const record = cfg.key ? setBest(cfg.key, score) : false;
      const result = { score, answered, total: total || answered, xp: xpGained, log };
      body.innerHTML = "";
      hud.innerHTML = "";
      if (cfg.test) return cfg.onFinish(result, body);
      body.append(
        h("div", { class: "card center pop" },
          h("div", { class: "muted" }, cfg.seconds ? "Koniec czasu!" : outOfLives() ? "Koniec żyć!" : "Koniec rundy"),
          h("div", { class: "result-big" }, total ? `${score}/${total}` : `${score}`),
          h("div", null, `+${xpGained} XP`),
          record ? h("div", { style: "color:var(--gold);font-weight:800;margin-top:6px" }, "Nowy rekord!") :
            cfg.key && S.best[cfg.key] != null ? h("div", { class: "muted" }, `Rekord: ${S.best[cfg.key]}`) : null
        )
      );
      if (cfg.onFinish) cfg.onFinish(result, body);
      else body.append(
        h("button", { class: "btn primary", onclick: cfg.again || (() => runSession(cfg)) }, "Jeszcze raz"),
        h("button", { class: "btn ghost", onclick: back }, "Menu")
      );
    }

    if (cfg.intro) {
      body.append(cfg.intro, h("button", { class: "btn primary", onclick: next }, "Zaczynamy"));
      renderHud();
    } else next();
  }, back);
}

/* ---------- MCQ renderer ---------- */
/* step: { kind:"mcq", prompt, options, correct[], explain, after, rule, whyNot(opt), cols, big } */
RENDERERS.mcq = (el, q, ctx) => {
  const opts = h("div", { class: `options ${q.cols ? "cols-" + q.cols : ""} ${q.big ? "big" : ""}` });
  el.append(h("div", { class: "prompt pop", html: q.prompt }), opts);
  let locked = false;
  for (const o of q.options) {
    const b = h("button", { class: "opt" }, o);
    b.addEventListener("click", () => {
      if (locked) return;
      locked = true;
      const ok = q.correct.includes(o);
      if (ctx.test) b.classList.add("sel");
      else {
        for (const x of opts.children) {
          if (q.correct.includes(x.textContent)) x.classList.add("ok");
          else if (x === b) x.classList.add("bad");
          else x.classList.add("dim");
        }
        if (!ok) opts.classList.add("shake");
      }
      ctx.done({
        ok,
        given: o,
        expected: q.correct[0],
        alt: ok && q.correct.length > 1 && o !== q.correct[0],
        explain: q.explain,
        after: q.after,
        rule: q.rule,
        pickedWhy: !ok && q.whyNot ? q.whyNot(o) : null,
      });
    });
    opts.append(b);
  }
};

/* ================= Question generators ================= */

const gapHTML = (s) => esc(s).replace("___", '<span class="gap">&nbsp;?&nbsp;</span>');
const emojiAfter = (w) => (w.emoji ? `<span class="emo">${w.emoji}</span> ` : "");

function mcqVocab(w, pool, dir = S.settings.dir) {
  const toPl = dir === "de-pl";
  const others = shuffle(pool.filter((x) => x.key !== w.key && x.pl !== w.pl && x.de !== w.de));
  const sameSet = others.filter((x) => x.set === w.set);
  const distract = uniq([...sameSet, ...others].map((x) => (toPl ? x.pl : x.de))).filter((x) => x !== (toPl ? w.pl : w.de)).slice(0, 3);
  const correct = toPl ? w.pl : w.de;
  return {
    kind: "mcq",
    prompt: `<div class="big">${esc(toPl ? w.de : w.pl)}</div><div class="hint">${esc(SET_NAMES[w.set] || "")}</div>`,
    options: shuffle([correct, ...distract]),
    correct: [correct],
    after: w.emoji ? `${emojiAfter(w)}<b>${esc(w.de)}</b> – ${esc(w.pl)}` : null,
    ref: { t: "vocab", k: w.key, d: dir },
    onResult: (ok) => srsRecord(w.key, ok),
  };
}
function vocabGen(pool, dir) {
  const deck = makeDeck(pool);
  return () => {
    const due = dueWords(pool);
    const w = due.length && Math.random() < 0.4 ? pick(due) : deck();
    return mcqVocab(w, pool, dir);
  };
}

const nouns = () => WORDS.filter((w) => w.art);
function mcqArticle(w) {
  return {
    kind: "mcq",
    prompt: `<div class="big">${w.emoji ? `<span class="emo">${w.emoji}</span> ` : ""}${esc(w.noun)}</div><div class="hint">${esc(w.pl)}</div>`,
    options: ["der", "die", "das"],
    correct: [w.art],
    explain: `<b>${esc(w.de)}</b> – ${esc(w.pl)}`,
    ref: { t: "article", k: w.key },
    cols: 3,
    big: true,
  };
}

function mcqColloc(i) {
  const c = COLLOCATIONS[i];
  const valid = COLLOCATIONS.filter((x) => x.stem === c.stem).map((x) => x.gap);
  const distract = shuffle(uniq(COLLOCATIONS.map((x) => x.gap)).filter((g) => !valid.includes(g))).slice(0, 3);
  return {
    kind: "mcq",
    prompt: `<div class="sent">${gapHTML(c.stem)}</div><div class="hint">${esc(c.pl)}</div>`,
    options: shuffle([c.gap, ...distract]),
    correct: [c.gap],
    explain: `<b>${esc(c.stem.replace("___", c.gap))}</b> – ${esc(c.pl)}`,
    ref: { t: "colloc", i },
    cols: 2,
  };
}

const CONNECTOR_OPTS = ["dass", "zu", "um … zu", "damit", "anstatt … zu", "anstatt dass", "ohne … zu", "ohne dass"];
const MEANING = (o) => (/um|damit/.test(o) ? "cel" : /anstatt/.test(o) ? "zamiast" : /ohne/.test(o) ? "bez" : "że");
const MEANING_PL = { cel: "„żeby” (cel)", zamiast: "„zamiast”", bez: "„bez / nie robiąc czegoś”", "że": "„że”" };
const isZuForm = (o) => o === "zu" || o.includes("… zu");

function mcqConnector(i) {
  const c = CONNECTORS[i];
  const same = c.same != null ? c.same : c.answers.some(isZuForm);
  const m = MEANING(c.answers[0]);
  const whyNot = (o) => {
    if (MEANING(o) !== m) return `„${o}” znaczy ${MEANING_PL[MEANING(o)]}, a tu chodzi o ${MEANING_PL[m]}.`;
    if (isZuForm(o) && !same) return `Forma z zu wymaga tego samego podmiotu, a tu podmioty są różne (${c.subj[0]} / ${c.subj[1]}).`;
    return "Przy tym samym podmiocie używamy formy z zu.";
  };
  return {
    kind: "mcq",
    prompt: `<div class="two-sent"><div>${esc(c.a)}</div><div>${esc(c.b)}</div></div><div class="hint">Jak połączysz te zdania?</div>`,
    options: CONNECTOR_OPTS,
    correct: c.answers,
    ref: { t: "conn", i },
    cols: 2,
    rule: c.rule,
    whyNot,
    explain: `<div class="two-sent small"><div>${markSubjects(c.a, [c.subj[0]])}</div><div>${markSubjects(c.b, [c.subj[1]])}</div></div>` +
      `<i>${esc(c.full)}</i><div class="why">${esc(c.why)}</div>`,
  };
}

const GAP_OPTS = ["zu", "um", "damit", "anstatt", "ohne", "dass"];
const GAP_NO = {
  zu: "„zu” stoi tylko bezpośrednio przed bezokolicznikiem – samo nie łączy zdań.",
  um: "„um … zu” wyraża cel (żeby …) i wymaga na końcu zu + bezokolicznika.",
  damit: "„damit” (żeby) wymaga własnego podmiotu i odmienionego czasownika na końcu – nigdy nie łączy się z zu.",
  anstatt: "„anstatt” znaczy „zamiast” – w tym zdaniu sens jest inny.",
  ohne: "„ohne” znaczy „bez / nie robiąc czegoś” – w tym zdaniu sens jest inny.",
  dass: "„dass” (że) wprowadza zdanie z własnym podmiotem i odmienionym czasownikiem na końcu – nie łączy się z zu.",
};
function mcqGap(i) {
  const g = GAPS[i];
  const cap = /^[A-ZÄÖÜ]/.test(g.a);
  const fix = (o) => (cap ? o[0].toUpperCase() + o.slice(1) : o);
  return {
    kind: "mcq",
    prompt: `<div class="sent">${gapHTML(g.s)}</div>`,
    options: (g.opts || GAP_OPTS).map(fix),
    correct: [g.a],
    ref: { t: "gap", i },
    cols: 3,
    rule: g.rule,
    whyNot: (o) => GAP_NO[o.toLowerCase()] || null,
    explain: `<i>${markSubjects(g.s.replace("___", "[[" + g.a + "]]"), g.subj).replace(/\[\[(.+?)\]\]/, "<b class=\"ans\">$1</b>")}</i><div class="why">${esc(g.why)}</div>`,
  };
}

const zuKind = (o) => (o.startsWith("zu ") ? "spaced" : o.indexOf("zu", 1) > 0 ? "glued" : "bare");
function mcqZu(i) {
  const z = ZU_ITEMS[i];
  const correct = z.opts[0];
  const ck = zuKind(correct);
  const whyNot = (o) => {
    const k = zuKind(o);
    if (ck === "bare") return `Tu nie ma zu: ${z.why}`;
    if (ck === "glued" && k === "spaced") return `Przy czasowniku rozdzielnym zu wchodzi do środka: „${correct}”, nie „${o}”.`;
    if (k === "bare") return `Brakuje zu. ${z.why}`;
    return z.why;
  };
  return {
    kind: "mcq",
    prompt: `<div class="sent">${gapHTML(z.s)}</div>`,
    options: shuffle(z.opts),
    correct: [correct],
    ref: { t: "zu", i },
    rule: z.rule,
    whyNot,
    explain: `<i>${esc(z.s.replace("___", correct))}</i><div class="why">${esc(z.why)}</div>`,
  };
}

const BINS = {
  zer: { name: "zer- : zniszczenie", desc: "rozpadło się, zepsuło", reason: "zer- = zniszczenie, rozpad na kawałki" },
  verFehler: { name: "ver- : błąd, pomyłka", desc: "zrobione niewłaściwie", reason: "ver- = coś zrobione źle, pomyłka" },
  verWeg: { name: "ver- : oddalenie", desc: "opuszczenie, zniknięcie", reason: "ver- = oddalenie, opuszczenie" },
};
function mcqPrefix(i) {
  const p = PREFIX_ITEMS[i];
  return {
    kind: "mcq",
    prompt: `<div class="big">${esc(p.w)}</div><div class="hint">Co oznacza przedrostek?</div>`,
    options: Object.values(BINS).map((b) => b.name),
    correct: [BINS[p.bin].name],
    ref: { t: "prefix", i },
    rule: p.bin === "zer" ? "zer" : "ver",
    explain: `<b>${esc(p.w)}</b> – ${esc(p.pl)}: ${esc(BINS[p.bin].reason)}`,
  };
}

const deckOf = (n) => makeDeck(range(n));

/* ================= Home ================= */

const MODES = [
  { id: "flash", name: "Fiszki", desc: "Powtórki w odstępach czasu", badge: "DE", color: "#f5b301", run: () => flashSetup() },
  { id: "quiz", name: "Quiz słówek", desc: "4 odpowiedzi do wyboru", badge: "?", color: "#60a5fa", run: () => quizSetup() },
  { id: "memory", name: "Memory", desc: "Znajdź pary DE–PL", badge: "▦", color: "#a78bfa", run: () => memorySetup() },
  { id: "article", name: "der / die / das", desc: "Na czas – ile zdążysz", badge: "der", color: "#f87171", run: () => articleSetup() },
  { id: "colloc", name: "Kolokacje", desc: "Angebot + unterbreiten…", badge: "+", color: "#34d399", run: () => collocSetup() },
  { id: "conn", name: "Łączenie zdań", desc: "damit, um…zu, ohne, anstatt", badge: "⇄", color: "#fb923c", run: () => connSetup() },
  { id: "gaps", name: "Luki", desc: "zu / um / damit / ohne / anstatt", badge: "__", color: "#f472b6", run: () => gapSetup() },
  { id: "zu", name: "Zu czy bez zu?", desc: "3 życia", badge: "zu", color: "#facc15", run: () => zuSetup() },
  { id: "builder", name: "Układanka zdań", desc: "Przeciągnij słowa w kolejności", badge: "≡", color: "#22d3ee", run: () => builderSetup() },
  { id: "prefix", name: "zer- / ver-", desc: "Wrzuć słowo do kosza", badge: "zer", color: "#c084fc", run: () => prefixSetup() },
  { id: "cloze", name: "Rozmowa o pracę", desc: "Uzupełnij odpowiedzi w dowolnej kolejności", badge: "Q", color: "#4ade80", run: () => clozeMenu() },
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
      homeExtras(),
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

/* ================= Modes (setup + run) ================= */

const COUNT_STD = (label, def, available) => ({ label, presets: [5, 10, 20, 0], def, available });

function typingOptions(flagKey) {
  return () => [
    h("div", { class: "section-title" }, "Sposób odpowiedzi"),
    togglePill("Wpisuj (polski → niemiecki)", () => !!S.settings[flagKey], (v) => (S.settings[flagKey] = v)),
    togglePill("Rodzajnik wymagany", () => !!S.settings.requireArticle, (v) => (S.settings.requireArticle = v)),
  ];
}

function quizSetup() {
  setupScreen({
    id: "quiz", title: "Quiz słówek", sets: true, dir: true,
    count: COUNT_STD("Ile pytań", 10, () => activeWords().length),
    options: typingOptions("typeQuiz"),
    buttons: [{ label: (n) => `Start (${n} pytań)`, run: (n) => {
      const pool = activeWords();
      if (S.settings.typeQuiz) {
        const deck = makeDeck(pool);
        runSession({ key: "quizType", title: "Quiz – wpisywanie", n, gen: () => typeStep(deck()), back: quizSetup });
      } else runSession({ key: "quiz", title: "Quiz słówek", n, gen: vocabGen(pool), back: quizSetup });
    } }],
  });
}

function articleSetup() {
  setupScreen({
    id: "article", title: "der / die / das",
    info: () => h("div", null, `Rzeczowników w bazie: ${nouns().length}. Odpowiadaj jak najszybciej – liczy się wynik w wybranym czasie.`),
    count: { label: "Czas rundy (sekundy)", presets: [30, 60, 90, 120], def: 60, unit: " s", all: false, max: 600, min: 10, step: 15 },
    buttons: [{ label: (n) => `Start (${n} s)`, run: (n) => {
      const deck = makeDeck(nouns());
      runSession({ key: "article" + (n === 60 ? "" : n), title: "der / die / das", seconds: n, gen: () => mcqArticle(deck()), back: articleSetup });
    } }],
  });
}

function indexSetup({ id, title, label, def, total, make, lives, back, extraInfo }) {
  const setup = () => setupScreen({
    id, title,
    info: extraInfo,
    count: COUNT_STD(label, def, () => total),
    buttons: [{ label: (n) => `Start (${n})`, run: (n) => {
      const deck = deckOf(total);
      runSession({ key: id, title, n, lives, gen: () => make(deck()), back: setup });
    } }],
  });
  return setup;
}
const collocSetup = indexSetup({ id: "colloc", title: "Kolokacje", label: "Ile pytań", def: 10, total: COLLOCATIONS.length, make: mcqColloc });
const connSetup = indexSetup({ id: "conn", title: "Łączenie zdań", label: "Ile par zdań", def: 10, total: CONNECTORS.length, make: mcqConnector });
const gapSetup = indexSetup({ id: "gaps", title: "Luki", label: "Ile zdań", def: 12, total: GAPS.length, make: mcqGap });
const zuSetup = indexSetup({
  id: "zu", title: "Zu czy bez zu?", label: "Ile zdań (masz 3 życia)", def: 0, total: ZU_ITEMS.length, make: mcqZu, lives: 3,
  extraInfo: () => h("div", null, "Masz 3 życia. Każdy błąd zabiera jedno."),
});

/* ---------- Flashcards ---------- */

function flashSetup() {
  const learnable = () => {
    const pool = activeWords();
    const n = dueWords(pool).length + pool.filter((w) => !S.srs[w.key]).length;
    return n || pool.length;
  };
  setupScreen({
    id: "flash", title: "Fiszki", sets: true, dir: true,
    info: () => {
      const pool = activeWords();
      return h("div", null,
        h("div", null, h("b", null, `Do powtórki: ${dueWords(pool).length}`), ` · nowe: ${pool.filter((w) => !S.srs[w.key]).length} · w działach: ${pool.length}`),
        h("div", { class: "muted", style: "margin-top:6px;font-size:15px" }, "Najpierw lecą powtórki, potem nowe słówka. Znane wracają coraz rzadziej, nieznane – szybko."));
    },
    count: { label: "Ile fiszek w sesji", presets: [10, 20, 30, 50, 0], def: 20, available: () => activeWords().length },
    options: typingOptions("typeFlash"),
    buttons: [
      { label: (n) => `Ucz się (${n} kart)`, available: learnable, run: (n) => flashSession(false, n) },
      { label: (n) => `Losowe ${n} ze wszystkich wybranych`, cls: "ghost", run: (n) => flashSession(true, n) },
    ],
  });
}

function flashSession(random, n) {
  const pool = activeWords();
  let queue;
  if (random) queue = shuffle(pool);
  else {
    const due = shuffle(dueWords(pool)).sort((a, b) => srsGet(a.key).b - srsGet(b.key).b);
    const fresh = shuffle(pool.filter((w) => !S.srs[w.key]));
    queue = [...due, ...fresh];
    if (!queue.length) queue = shuffle(pool);
  }
  queue = queue.slice(0, n);
  if (S.settings.typeFlash) {
    return runSession({ title: "Fiszki – wpisywanie", steps: queue.map(typeStep), back: flashSetup, again: () => flashSession(random, n) });
  }
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
        card.append(h("div", { class: "back pop" }, w.emoji ? h("span", { class: "emo" }, w.emoji, " ") : null, toPl ? w.pl : w.de));
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
        recordAnswer({ t: "vocab", k: w.key, d: S.settings.dir }, ok);
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
        h("button", { class: "btn primary", onclick: () => flashSession(random, n) }, "Kolejna sesja"),
        h("button", { class: "btn ghost", onclick: flashSetup }, "Ustawienia fiszek")
      );
    }
    render();
  }, flashSetup);
}

/* ---------- Memory ---------- */

const MEMORY_MAX = 10;
const memoryPool = () => activeWords().filter((w) => w.de.length <= 34 && w.pl.length <= 40);

function memorySetup() {
  setupScreen({
    id: "memory", title: "Memory", sets: true,
    info: () => h("div", null, "Odkrywaj po dwie karty i szukaj par niemieckie słowo – polskie znaczenie. Na telefonie najwygodniej do 10 par."),
    count: { label: "Ile par", presets: [4, 6, 8, 10], def: 6, all: false, max: MEMORY_MAX, min: 2, step: 1 },
    buttons: [{ label: (n) => `Start (${Math.min(n, memoryPool().length)} par)`, run: (n) => memoryGame(Math.min(n, memoryPool().length)) }],
  });
}

function memoryGame(nPairs) {
  const pairs = shuffle(memoryPool()).slice(0, nPairs);
  const cards = shuffle(pairs.flatMap((w) => [{ w, side: "de" }, { w, side: "pl" }]));
  let open = [], moves = 0, matched = 0, busy = false;
  const start = Date.now();
  const bestKey = `memory${nPairs}`;

  show("Memory", (el) => {
    const hud = h("div", { class: "hud" });
    const grid = h("div", { class: `memory ${nPairs > 6 ? "dense" : ""}` });
    el.append(hud, grid);
    const renderHud = () => { hud.innerHTML = ""; hud.append(h("span", null, `Ruchy: ${moves}`), h("span", { class: "spacer" }), h("span", null, `Pary: ${matched}/${nPairs}`)); };
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
          if (matched === nPairs) setTimeout(finish, 500);
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
      const xp = Math.max(10, nPairs * 12 - (moves - nPairs) * 4);
      addXP(xp);
      const rec = setBest(bestKey, -moves);
      el.innerHTML = "";
      el.append(
        h("div", { class: "card center pop" },
          h("div", { class: "muted" }, `Wszystkie pary w ${secs} s`),
          h("div", { class: "result-big" }, `${moves} ruchów`),
          h("div", null, `+${xp} XP`),
          rec ? h("div", { style: "color:var(--gold);font-weight:800" }, "Nowy rekord!") : h("div", { class: "muted" }, `Rekord (${nPairs} par): ${-S.best[bestKey]} ruchów`)),
        h("div", { class: "card" }, pairs.map((w) => h("div", { style: "padding:4px 0" }, w.emoji ? h("span", { class: "emo" }, w.emoji, " ") : null, h("b", null, w.de), " – ", w.pl))),
        h("button", { class: "btn primary", onclick: () => memoryGame(nPairs) }, "Nowa plansza"),
        h("button", { class: "btn ghost", onclick: memorySetup }, "Ustawienia")
      );
    }
  }, memorySetup);
}

/* ---------- Pointer drag (działa na iPhonie) ---------- */
/*
  enableDrag(el, { onTap, onStart, onMove(x, y), onDrop(x, y) })
  Ruch > 8 px = przeciąganie, inaczej = dotknięcie.
*/
function enableDrag(el, { onTap, onStart, onMove, onDrop }) {
  let sx, sy, dragging = false, ghost = null, offX = 0, offY = 0, pid = null;
  el.addEventListener("pointerdown", (e) => {
    if (e.button && e.button !== 0) return;
    pid = e.pointerId;
    sx = e.clientX; sy = e.clientY;
    dragging = false;
    try { el.setPointerCapture(pid); } catch (err) { /* stary Safari */ }
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

RENDERERS.builder = (el, step, ctx) => {
  const target = SENTENCES[step.i];
  const words = target.split(" ");
  let tries = 0;
  let answer = [];
  let pool = shuffle(words.map((w, i) => ({ w, id: i })));
  if (pool.length > 1 && pool.every((t, i) => t.id === i)) pool.reverse();

  const ansZone = h("div", { class: "zone answer" });
  const poolZone = h("div", { class: "zone pool" });
  const fb = h("div");
  const checkBtn = h("button", { class: "btn primary" }, "Sprawdź");
  const showBtn = h("button", { class: "btn ghost" }, "Pokaż odpowiedź");
  el.append(h("div", { class: "muted", style: "margin:0 4px 8px;font-size:15px" }, "Dotknij słowa, aby je dodać lub usunąć. Przeciągnij, aby zmienić kolejność."), ansZone, poolZone, checkBtn, showBtn, fb);

  function insertIndex(x, y, exclude) {
    const tiles = [...ansZone.children].filter((t) => t !== exclude && t.classList.contains("tile"));
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

  const finishStep = (ok, given) => {
    checkBtn.remove();
    showBtn.remove();
    fb.innerHTML = "";
    ctx.done({ ok, given, expected: target, explain: ok ? `<i>${esc(target)}</i>` : null, after: null });
    if (ok && !ctx.test) speak(target);
  };

  checkBtn.addEventListener("click", () => {
    if (pool.length) { toast("Użyj wszystkich słów"); return; }
    const got = answer.map((t) => t.w).join(" ");
    tries++;
    if (ctx.test) return finishStep(got === target, got);
    if (got === target) {
      [...ansZone.children].forEach((c) => c.classList.add("right"));
      finishStep(tries === 1, null);
    } else {
      beep(false);
      ansZone.classList.add("shake");
      setTimeout(() => ansZone.classList.remove("shake"), 500);
      [...ansZone.children].forEach((c, k) => c.classList.toggle("wrong", answer[k].w !== words[k]));
      fb.innerHTML = "";
      fb.append(h("div", { class: "feedback bad pop" }, "Na czerwono słowa na złym miejscu. Popraw i sprawdź ponownie (zaliczone będzie bez punktu za pierwszą próbę)."));
    }
  });
  showBtn.addEventListener("click", () => finishStep(false, answer.map((t) => t.w).join(" ")));
  if (ctx.test) showBtn.textContent = "Pomiń";
};

const builderStep = (i) => ({ kind: "builder", i, xp: 20, ref: { t: "builder", i } });

function builderSetup() {
  setupScreen({
    id: "builder", title: "Układanka zdań",
    count: COUNT_STD("Ile zdań", 8, () => SENTENCES.length),
    buttons: [{ label: (n) => `Start (${n} zdań)`, run: (n) => {
      const deck = deckOf(SENTENCES.length);
      runSession({ key: "builder", title: "Układanka zdań", n, gen: () => builderStep(deck()), back: builderSetup });
    } }],
  });
}

/* ---------- Prefix sort ---------- */

RENDERERS.prefix = (el, step, ctx) => {
  const it = PREFIX_ITEMS[step.i];
  let locked = false;
  const plLine = h("div", { class: "drop-pl", hidden: !S.settings.prefixPl }, it.pl);
  const cardEl = h("div", { class: "drop-card pop" }, it.w);
  const bins = h("div", { class: "bins" });
  const binEls = {};
  for (const [id, b] of Object.entries(BINS)) {
    const be = h("button", { class: "bin" }, h("b", null, b.name), h("small", null, b.desc));
    be.addEventListener("click", () => choose(id));
    binEls[id] = be;
    bins.append(be);
  }
  const toggle = togglePill("Pokaż tłumaczenie", () => S.settings.prefixPl, (v) => (S.settings.prefixPl = v), () => { plLine.hidden = !S.settings.prefixPl; });
  el.append(
    h("div", { class: "row wrap", style: "justify-content:space-between" },
      h("span", { class: "muted", style: "font-size:15px" }, "Przeciągnij kartę do kosza albo dotknij kosza. Dotknij karty = tłumaczenie."),
      toggle),
    h("div", { class: "drop-card-wrap" }, h("div", { class: "center" }, cardEl, plLine)),
    bins
  );

  const reveal = () => { plLine.hidden = false; };
  let pressTimer = null;
  cardEl.addEventListener("pointerdown", () => { pressTimer = setTimeout(reveal, 450); });
  const clearPress = () => clearTimeout(pressTimer);
  cardEl.addEventListener("pointermove", clearPress);
  cardEl.addEventListener("pointerup", clearPress);
  cardEl.addEventListener("pointercancel", clearPress);
  cardEl.addEventListener("contextmenu", (e) => e.preventDefault());

  const binAt = (x, y) => Object.keys(binEls).find((id) => inRect(binEls[id], x, y));
  enableDrag(cardEl, {
    onTap: reveal,
    onMove: (x, y) => { clearPress(); const id = binAt(x, y); for (const k in binEls) binEls[k].classList.toggle("hot", k === id); },
    onDrop: (x, y) => { for (const k in binEls) binEls[k].classList.remove("hot"); if (x != null) { const id = binAt(x, y); if (id) choose(id); } },
  });

  function choose(id) {
    if (locked) return;
    locked = true;
    const ok = id === it.bin;
    if (ctx.test) binEls[id].classList.add("hot");
    else {
      binEls[it.bin].classList.add("ok");
      if (!ok) binEls[id].classList.add("bad");
    }
    cardEl.style.visibility = "hidden";
    plLine.hidden = true;
    ctx.done({
      ok,
      given: ok ? null : BINS[id].name,
      expected: BINS[it.bin].name,
      explain: `<b>${esc(it.w)}</b> – ${esc(it.pl)}: ${esc(BINS[it.bin].reason)}`,
      rule: it.bin === "zer" ? "zer" : "ver",
    });
  }
};

const prefixStep = (i) => ({ kind: "prefix", i, ref: { t: "prefix", i } });

function prefixSetup() {
  setupScreen({
    id: "prefix", title: "zer- / ver-",
    count: COUNT_STD("Ile słów", 10, () => PREFIX_ITEMS.length),
    options: () => [
      h("div", { class: "section-title" }, "Tłumaczenie"),
      togglePill("Pokaż tłumaczenie pod słowem", () => S.settings.prefixPl, (v) => (S.settings.prefixPl = v)),
    ],
    buttons: [{ label: (n) => `Start (${n} słów)`, run: (n) => {
      const deck = deckOf(PREFIX_ITEMS.length);
      runSession({
        key: "prefix", title: "zer- / ver-", n, gen: () => prefixStep(deck()), back: prefixSetup,
        onFinish: (r, body) => body.append(
          h("div", { class: "muted center", style: "margin:8px 0 14px" }, "Pamiętaj: zer- i ver- nie łączą się z ge- w Partizip II (zerrissen, verlassen)."),
          h("button", { class: "btn primary", onclick: () => prefixSetup() }, "Jeszcze raz"),
          h("button", { class: "btn ghost", onclick: home }, "Menu")),
      });
    } }],
  });
}

/* ---------- Cloze: rozmowa o pracę / teksty 3B (dowolna kolejność) ---------- */

function clozeMenu() {
  setupScreen({
    id: "cloze", title: "Rozmowa o pracę",
    info: () => h("div", null, "Uzupełniasz luki w dowolnej kolejności: przeciągnij słowo na lukę albo dotknij słowa i luki. Na końcu „Sprawdź”."),
    count: COUNT_STD("Ile tekstów w serii (losowo)", 0, () => TEXTS.length),
    buttons: [{ label: (n) => `Losowa seria (${n})`, run: (n) => clozeSeries(shuffle(range(TEXTS.length)).slice(0, n)) }],
    footer: () => h("div", null,
      h("div", { class: "section-title" }, "Albo wybierz jedno pytanie"),
      TEXTS.map((t, i) => {
        const best = S.best["cloze" + i];
        return h("button", { class: "day", onclick: () => clozeGame(i) },
          h("span", { class: "num" }, i + 1),
          h("span", null, h("b", null, t.q), h("br"), h("small", { class: "muted" }, t.pl + (best != null ? ` · najlepiej: ${best} błędów` : ""))));
      })),
  });
}

function clozeSeries(list, k = 0) {
  if (k >= list.length) return clozeMenu();
  clozeGame(list[k], {
    title: `Rozmowa ${k + 1}/${list.length}`,
    nextLabel: k + 1 < list.length ? "Następny tekst" : "Koniec serii",
    onFinish: () => clozeSeries(list, k + 1),
  });
}

function clozeGame(i, opts = {}) {
  const t = TEXTS[i];
  const parts = t.a.split(/(\{[^}]+\})/).filter(Boolean);
  const gaps = parts.filter((p) => p.startsWith("{")).map((p) => p.slice(1, -1));
  const otherWords = TEXTS.filter((_, k) => k !== i).flatMap((x) => (x.a.match(/\{([^}]+)\}/g) || []).map((m) => m.slice(1, -1)));
  const extra = shuffle(uniq(otherWords).filter((w) => !gaps.includes(w))).slice(0, 3);
  const bank = shuffle([...gaps, ...extra].map((w, id) => ({ w, id })));
  const filled = gaps.map(() => null);
  const locked = gaps.map(() => false);
  let selWord = null, selGap = null, mistakes = 0, checks = 0;

  show(opts.title || "Rozmowa o pracę", (el) => {
    el.classList.add("no-pad-top");
    const bankEl = h("div", { class: "bank" });
    const status = h("div", { class: "bank-status muted" });
    const sticky = h("div", { class: "bank-sticky" }, bankEl, status);
    const gapEls = [];
    const text = h("div", { class: "cloze" });
    for (const p of parts) {
      if (p.startsWith("{")) {
        const k = gapEls.length;
        const g = h("button", { class: "g", "data-k": k });
        g.addEventListener("click", () => tapGap(k));
        gapEls.push(g);
        text.append(g);
      } else text.append(p);
    }
    const checkBtn = h("button", { class: "btn primary", onclick: check }, "Sprawdź");
    const fb = h("div");
    el.append(sticky);
    if (opts.intro) el.append(opts.intro);
    el.append(
      h("div", { class: "story" }, h("div", { class: "who" }, t.q), h("div", { class: "muted" }, t.pl)),
      h("div", { class: "card" }, text),
      checkBtn, fb
    );

    const wordById = (id) => bank.find((b) => b.id === id);
    const usedIds = () => filled.filter((x) => x != null);

    function place(id, k) {
      if (locked[k]) return;
      const prev = filled.indexOf(id);
      if (prev >= 0 && !locked[prev]) filled[prev] = null;
      filled[k] = id;
      gapEls[k].classList.remove("bad");
      selWord = null;
      selGap = null;
      const nextEmpty = filled.findIndex((x, j) => x == null && !locked[j]);
      draw();
      if (nextEmpty >= 0 && checks === 0) { /* bez automatycznego wyboru – dowolna kolejność */ }
    }
    function tapWord(id) {
      if (selGap != null) return place(id, selGap);
      selWord = selWord === id ? null : id;
      draw();
    }
    function tapGap(k) {
      if (locked[k]) return;
      if (selWord != null) return place(selWord, k);
      if (filled[k] != null) { filled[k] = null; selGap = k; draw(); return; }
      selGap = selGap === k ? null : k;
      draw();
    }

    function draw() {
      bankEl.innerHTML = "";
      const used = usedIds();
      for (const b of bank) {
        const tile = h("div", { class: `tile ${used.includes(b.id) ? "used" : ""} ${selWord === b.id ? "sel" : ""}` }, b.w);
        if (!used.includes(b.id)) {
          enableDrag(tile, {
            onTap: () => tapWord(b.id),
            onMove: (x, y) => {
              const g = document.elementFromPoint && document.elementFromPoint(x, y);
              const gap = g && g.closest && g.closest(".g");
              gapEls.forEach((e) => e.classList.toggle("hot", e === gap));
            },
            onDrop: (x, y) => {
              gapEls.forEach((e) => e.classList.remove("hot"));
              if (x == null) return;
              const g = document.elementFromPoint && document.elementFromPoint(x, y);
              const gap = g && g.closest && g.closest(".g");
              if (gap) place(b.id, Number(gap.dataset.k));
            },
          });
        }
        bankEl.append(tile);
      }
      gapEls.forEach((g, k) => {
        g.textContent = filled[k] != null ? wordById(filled[k]).w : "";
        g.classList.toggle("filled", filled[k] != null);
        g.classList.toggle("cur", selGap === k);
        g.classList.toggle("ok", locked[k]);
      });
      const left = filled.filter((x) => x == null).length;
      status.textContent = selWord != null ? "Teraz dotknij luki" : selGap != null ? "Teraz dotknij słowa" : left ? `Pustych luk: ${left}` : "Wszystko uzupełnione – sprawdź!";
    }
    draw();

    function check() {
      if (filled.some((x, k) => x == null && !locked[k])) {
        if (!confirm("Nie wszystkie luki są uzupełnione. Sprawdzić mimo to?")) return;
      }
      checks++;
      let wrong = 0;
      gapEls.forEach((g, k) => {
        if (locked[k]) return;
        const got = filled[k] != null ? wordById(filled[k]).w : "";
        g.querySelector && g.querySelector(".fix") && g.querySelector(".fix").remove();
        if (got === gaps[k]) {
          locked[k] = true;
          g.classList.add("ok");
          g.classList.remove("bad");
        } else {
          wrong++;
          g.classList.add("bad");
          g.innerHTML = `${esc(got || "—")} <span class="fix">→ ${esc(gaps[k])}</span>`;
        }
      });
      mistakes += wrong;
      beep(!wrong);
      fb.innerHTML = "";
      gapEls.forEach((g, k) => g.classList.toggle("cur", false));
      if (!wrong) return finish();
      checkBtn.hidden = true;
      fb.append(
        h("div", { class: "feedback bad pop" }, h("div", { class: "title" }, `Błędne luki: ${wrong}`), "Na czerwono twoja odpowiedź i poprawne słowo."),
        h("button", { class: "btn primary", style: "margin-top:12px", onclick: retry }, "Popraw błędne"),
        h("button", { class: "btn ghost", onclick: finish }, "Zakończ i pokaż wynik")
      );
    }
    function retry() {
      gapEls.forEach((g, k) => { if (!locked[k]) { filled[k] = null; g.classList.remove("bad"); } });
      fb.innerHTML = "";
      checkBtn.hidden = false;
      draw();
    }

    function finish() {
      const plain = t.a.replace(/[{}]/g, "");
      const bk = "cloze" + i;
      if (S.best[bk] == null || mistakes < S.best[bk]) { S.best[bk] = mistakes; save(); }
      const pct = Math.round(Math.max(0, gaps.length - mistakes) / gaps.length * 100);
      if (i < 4) S.stats.interviewPct = Math.max(S.stats.interviewPct || 0, pct);
      recordAnswer({ t: "cloze", i }, mistakes === 0);
      const bonus = Math.max(0, gaps.length * 4 + 20 - mistakes * 5);
      addXP(bonus);
      sticky.remove();
      checkBtn.remove();
      gapEls.forEach((g, k) => { g.textContent = gaps[k]; g.classList.add("ok"); g.classList.remove("bad", "cur"); });
      fb.innerHTML = "";
      fb.append(
        h("div", { class: `feedback pop ${mistakes > 2 ? "bad" : ""}` },
          h("div", { class: "title" }, mistakes ? `Gotowe! Błędy: ${mistakes}` : "Bezbłędnie!"),
          `+${bonus} XP`),
        h("button", { class: "btn", style: "margin-top:12px", onclick: () => speak(plain) }, "Odsłuchaj całą odpowiedź"),
        opts.onFinish
          ? h("button", { class: "btn primary", onclick: () => opts.onFinish({ mistakes, total: gaps.length }) }, opts.nextLabel || "Dalej")
          : [h("button", { class: "btn primary", onclick: () => clozeGame((i + 1) % TEXTS.length) }, "Następne pytanie"),
             h("button", { class: "btn ghost", onclick: clozeMenu }, "Lista pytań")]
      );
      fb.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, opts.back || clozeMenu);
}

/* ---------- RPG: Praktykant ---------- */

const wordsFrom = (...sets) => WORDS.filter((w) => sets.includes(w.set));
const pickN = (n, make) => Array.from({ length: n }, make);
function vocabSteps(n, pool, dir) {
  return shuffle(pool).slice(0, n).map((w) => mcqVocab(w, pool, dir));
}
const DAYS = [
  {
    title: "Magazyn: przyjmujesz dostawę",
    who: "Herr Lerchner, kierownik magazynu",
    story: "Willkommen! Pierwszego dnia przychodzi duża dostawa, ale część towaru jest uszkodzona. Rozpoznaj usterki i słownictwo magazynowe.",
    build: () => {
      const d = deckOf(PREFIX_ITEMS.length);
      return [...vocabSteps(6, wordsFrom("usterki", "reklamacje", "beschaffung"), "pl-de"), mcqPrefix(d()), mcqPrefix(d())];
    },
  },
  {
    title: "Biuro: zamówienia i faktury",
    who: "Frau Sommer, księgowa",
    story: "Dziś pomagasz w biurze. Trzeba złożyć ofertę, udzielić zlecenia i uregulować rachunki – dopasuj właściwe czasowniki.",
    build: () => { const d = deckOf(COLLOCATIONS.length); return pickN(8, () => mcqColloc(d())); },
  },
  {
    title: "Szkolenie z higieny",
    who: "Pani z działu BHP",
    story: "Przed pracą w domu opieki każdy przechodzi szkolenie z higieny. Pokaż, że znasz słownictwo i wiesz, kiedy użyć „zu”.",
    build: () => { const d = deckOf(ZU_ITEMS.length); return [...vocabSteps(5, wordsFrom("higiena")), ...pickN(3, () => mcqZu(d()))]; },
  },
  {
    title: "U szefa: po co to robisz?",
    who: "Der Chef",
    story: "Szef pyta, po co i dlaczego robisz różne rzeczy. Łącz zdania: um…zu, damit, anstatt, ohne.",
    build: () => {
      const c = deckOf(CONNECTORS.length), g = deckOf(GAPS.length);
      return [...pickN(5, () => mcqConnector(c())), ...pickN(3, () => mcqGap(g()))];
    },
  },
  {
    title: "Spotkanie z klientem",
    who: "Klient z Monachium",
    story: "Przychodzi ważny klient z zapytaniem ofertowym. Rozmowa ma być rzeczowa i przyjazna – uważaj na rodzajniki!",
    build: () => [
      ...vocabSteps(4, wordsFrom("oferty", "zlecenia")),
      ...vocabSteps(2, wordsFrom("przymiotniki"), "pl-de"),
      ...shuffle(nouns()).slice(0, 2).map(mcqArticle),
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

  runSession({
    title: `Dzień ${i + 1}`,
    steps: d.build(),
    intro,
    back: rpgMenu,
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
    for (const c of CHEATSHEET) el.append(h("div", { class: "card", id: "rule-" + c.id }, h("h3", null, c.title), h("div", { html: c.body })));
  });
}

/* ---------- Stats & settings ---------- */

function statsScreen() {
  show("Postępy", (el) => {
    const counts = Array(7).fill(0);
    for (const w of WORDS) counts[srsGet(w.key).b]++;
    const max = Math.max(...counts, 1);
    const labels = ["nowe", "1", "2", "3", "4", "5", "6"];
    const bestNames = { quiz: "Quiz słówek", article: "der/die/das (60 s)", colloc: "Kolokacje", conn: "Łączenie zdań", gaps: "Luki", zu: "Zu czy bez zu", builder: "Układanka", prefix: "zer-/ver-" };
    const memBest = Object.keys(S.best).filter((k) => /^memory\d*$/.test(k));

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
          memBest.map((k) => h("tr", null, h("td", null, `Memory ${k === "memory" ? "6" : k.slice(6)} par (ruchy)`), h("td", null, -S.best[k])))
        )
      ),
      h("div", { class: "section-title" }, "Kierunek tłumaczenia"),
      dirPills(),
      h("div", { class: "section-title" }, "Działy słówek"),
      setPills(),
      h("div", { class: "section-title" }, "Dźwięk"),
      togglePill("Dźwięki", () => S.settings.sound, (v) => (S.settings.sound = v)),
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

document.addEventListener("DOMContentLoaded", () => {
  updateChips();
  home();
});

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
