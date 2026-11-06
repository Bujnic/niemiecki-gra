"use strict";

/* Dodatkowe tryby na ekranie głównym (sekcja „Nauka i egzamin”). */
const EXTRA_MODES = [];
function homeExtras() {
  if (!EXTRA_MODES.length) return null;
  return h("div", null,
    h("div", { class: "section-title" }, "Nauka i egzamin"),
    h("div", { class: "modes" },
      EXTRA_MODES.map((m) => {
        const n = m.count ? m.count() : 0;
        return h("button", { class: "mode", onclick: m.run },
          n ? h("span", { class: "count-badge" }, n) : null,
          h("span", { class: "badge", style: `background:${m.color}` }, m.badge),
          h("b", null, m.name),
          h("small", null, typeof m.desc === "function" ? m.desc() : m.desc));
      })));
}

/* ================= Moje błędy ================= */
/*
  Każda błędna odpowiedź trafia do S.errors pod kluczem elementu (typ + id).
  Element znika z listy po 2 poprawnych odpowiedziach z rzędu.
*/

const TYPE_NAMES = {
  vocab: "Słówka",
  type: "Wpisywanie słówek",
  article: "der / die / das",
  colloc: "Kolokacje",
  conn: "Łączenie zdań",
  gap: "Luki",
  zu: "Zu czy bez zu",
  builder: "Układanka zdań",
  prefix: "zer- / ver-",
  cloze: "Rozmowa o pracę",
  dict: "Dyktando",
};

const refKey = (r) => `${r.t}:${r.k != null ? r.k : r.i}${r.d ? ":" + r.d : ""}`;

function recordAnswer(ref, ok) {
  const k = refKey(ref);
  const st = ok ? S.stats.correct : S.stats.wrong;
  st[ref.t] = (st[ref.t] || 0) + 1;
  if (!ok) {
    const e = S.errors[k] || { ref, n: 0 };
    e.n++;
    e.streak = 0;
    e.at = Date.now();
    S.errors[k] = e;
  } else if (S.errors[k]) {
    S.errors[k].streak = (S.errors[k].streak || 0) + 1;
    if (S.errors[k].streak >= 2) {
      delete S.errors[k];
      S.stats.errorsFixed = (S.stats.errorsFixed || 0) + 1;
      if (!Object.keys(S.errors).length) S.stats.errorsCleared = (S.stats.errorsCleared || 0) + 1;
    }
  }
  save();
  if (typeof checkBadges === "function") checkBadges();
}

const STEP_FROM_REF = {};
const errorList = () => Object.values(S.errors);
const errorCount = () => errorList().length;

function stepFromRef(ref) {
  const w = ref.k != null ? wordByKey(ref.k) : null;
  switch (ref.t) {
    case "vocab": {
      if (!w) return null;
      const same = WORDS.filter((x) => x.set === w.set);
      return mcqVocab(w, same.length >= 4 ? same : WORDS, ref.d || S.settings.dir);
    }
    case "article": return w && w.art ? mcqArticle(w) : null;
    case "colloc": return COLLOCATIONS[ref.i] ? mcqColloc(ref.i) : null;
    case "conn": return CONNECTORS[ref.i] ? mcqConnector(ref.i) : null;
    case "gap": return GAPS[ref.i] ? mcqGap(ref.i) : null;
    case "zu": return ZU_ITEMS[ref.i] ? mcqZu(ref.i) : null;
    case "prefix": return PREFIX_ITEMS[ref.i] ? prefixStep(ref.i) : null;
    case "builder": return SENTENCES[ref.i] ? builderStep(ref.i) : null;
    case "type": return w && typeof typeStep === "function" ? typeStep(w) : null;
    case "dict": return typeof dictStepFromRef === "function" ? dictStepFromRef(ref) : null;
    default: return STEP_FROM_REF[ref.t] ? STEP_FROM_REF[ref.t](ref) : null;
  }
}

EXTRA_MODES.push({
  id: "errors", name: "Moje błędy", badge: "!", color: "#fca5a5", run: () => errorsSetup(), count: errorCount,
  desc: () => (errorCount() ? `${errorCount()} do poprawy` : "Pomyłki ze wszystkich trybów"),
});

/* ================= Wpisywanie (PL → DE) ================= */

const ARTICLES = ["der", "die", "das"];
function foldDe(s) {
  return String(s).toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[„”"“'’]/g, "").replace(/…|\.\.\./g, " ")
    .replace(/[.,!?;:]+/g, " ").replace(/\s+/g, " ").trim();
}
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = range(n + 1), cur = new Array(n + 1);
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    [prev, cur] = [cur, prev];
  }
  return prev[n];
}
/* Różnice na poziomie liter: <del> = zbędne u ciebie, <ins> = brakujące. */
function charDiffHTML(given, target) {
  const a = [...given], b = [...target];
  const L = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      L[i][j] = a[i].toLowerCase() === b[j].toLowerCase() ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  let i = 0, j = 0, out = "";
  while (i < a.length && j < b.length) {
    if (a[i].toLowerCase() === b[j].toLowerCase()) { out += esc(b[j]); i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) { out += `<del>${esc(a[i])}</del>`; i++; }
    else { out += `<ins>${esc(b[j])}</ins>`; j++; }
  }
  while (i < a.length) out += `<del>${esc(a[i++])}</del>`;
  while (j < b.length) out += `<ins>${esc(b[j++])}</ins>`;
  return out;
}
const splitArticle = (s) => {
  const m = s.match(/^(der|die|das)\s+(.+)$/i);
  return m ? { art: m[1].toLowerCase(), core: m[2] } : { art: null, core: s };
};
const variants = (de) => de.replace(/\(.*?\)/g, "").split(/\s+\/\s+/).map((x) => x.trim()).filter(Boolean);

/* Zwraca { status: "ok" | "almost" | "wrong", note, diff, best } */
function checkTyped(input, target, requireArticle) {
  const raw = input.trim();
  let best = null;
  for (const v of variants(target)) {
    const t = splitArticle(v), u = splitArticle(raw);
    const tc = foldDe(t.core), uc = foldDe(u.core);
    const dist = levenshtein(uc, tc);
    const tol = tc.length > 8 ? 2 : 1;
    let status, note = "";
    if (dist === 0) status = "ok";
    else if (dist <= tol) { status = "almost"; note = "Prawie dobrze – literówka."; }
    else status = "wrong";
    if (status !== "wrong" && t.art) {
      if (u.art && u.art !== t.art) { status = "almost"; note = `Zły rodzajnik: poprawnie „${t.art}”.` + (dist ? " Do tego literówka." : ""); }
      else if (!u.art && requireArticle) { status = "almost"; note = `Brakuje rodzajnika: „${t.art}”.` + (dist ? " Do tego literówka." : ""); }
    }
    const rank = { ok: 0, almost: 1, wrong: 2 }[status];
    if (!best || rank < best.rank || (rank === best.rank && dist < best.dist)) best = { status, note, dist, rank, v };
  }
  const t = splitArticle(best.v), u = splitArticle(raw);
  let diff;
  if (t.art && u.art !== t.art) diff = `${u.art ? `<del>${esc(u.art)}</del> ` : ""}<ins>${t.art}</ins> ${charDiffHTML(u.core, t.core)}`;
  else diff = charDiffHTML(raw, best.v);
  return { status: best.status, note: best.note, best: best.v, diff };
}

/* Pole tekstowe bez autokorekty + przyciski ä ö ü ß */
function germanInput(opts = {}) {
  const input = h(opts.multiline ? "textarea" : "input", {
    class: opts.multiline ? "text-input multi" : "text-input",
    type: "text", autocomplete: "off", autocorrect: "off", autocapitalize: "off", spellcheck: "false",
    enterkeyhint: "done", lang: "de", placeholder: opts.placeholder || "Wpisz po niemiecku",
  });
  const keys = h("div", { class: "umlauts" },
    ["ä", "ö", "ü", "ß", "Ä", "Ö", "Ü"].map((ch) => {
      const b = h("button", { class: "key", type: "button" }, ch);
      b.addEventListener("pointerdown", (e) => e.preventDefault());
      b.addEventListener("click", () => {
        const s = input.selectionStart != null ? input.selectionStart : input.value.length;
        const e = input.selectionEnd != null ? input.selectionEnd : s;
        input.value = input.value.slice(0, s) + ch + input.value.slice(e);
        try { input.setSelectionRange(s + 1, s + 1); } catch (err) { /* */ }
        input.focus();
      });
      return b;
    }));
  return { input, keys };
}

RENDERERS.type = (el, step, ctx) => {
  const w = step.w;
  const { input, keys } = germanInput();
  const checkBtn = h("button", { class: "btn primary" }, "Sprawdź");
  const skipBtn = h("button", { class: "btn ghost" }, "Nie wiem");
  el.append(
    h("div", { class: "prompt pop" },
      h("div", { class: "big" }, w.pl),
      h("div", { class: "hint" }, `${SET_NAMES[w.set] || ""}${w.art ? " · rzeczownik" : ""}${w.art && S.settings.requireArticle ? " – z rodzajnikiem" : ""}`)),
    input, keys, checkBtn, skipBtn);
  let done = false;
  const finish = (given) => {
    if (done) return;
    done = true;
    input.disabled = true;
    checkBtn.remove();
    skipBtn.remove();
    keys.remove();
    const r = given ? checkTyped(given, w.de, !!S.settings.requireArticle) : { status: "wrong", note: "", diff: "" };
    const after = `${w.emoji ? `<span class="emo">${w.emoji}</span> ` : ""}<b>${esc(w.de)}</b> – ${esc(w.pl)}`;
    ctx.done({
      ok: r.status !== "wrong",
      almost: r.status === "almost",
      almostWhy: r.note,
      given: r.status === "ok" ? null : given || "",
      expected: w.de,
      explain: given && r.status !== "ok" ? `<div class="diff">${r.diff}</div><div class="muted" style="font-size:13px">przekreślone = zbędne, podkreślone = brakujące</div>` : null,
      after,
      status: r.status,
    });
    if (!ctx.test) speak(w.de);
  };
  checkBtn.addEventListener("click", () => { if (input.value.trim()) finish(input.value); else input.focus(); });
  skipBtn.addEventListener("click", () => finish(""));
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); if (input.value.trim()) finish(input.value); } });
  input.focus();
};

function typeStep(w) {
  return {
    kind: "type", w, ref: { t: "type", k: w.key },
    onResult: (ok, res) => { if (!res || !res.almost) srsRecord(w.key, ok); },
  };
}

/* ================= Dyktando ================= */

const plainSentences = (text) => text.replace(/[{}]/g, "").match(/[^.!?]+[.!?]/g).map((x) => x.trim());
const INTERVIEW_SENTENCES = () => TEXTS.flatMap((t) => plainSentences(t.a));
const tokens = (s) => s.replace(/[„”"“…]/g, " ").split(/\s+/).map((w) => w.replace(/^[^\wäöüÄÖÜß]+|[^\wäöüÄÖÜß]+$/g, "")).filter(Boolean);

/* Porównanie na poziomie słów (LCS z tolerancją literówek). */
function wordDiff(given, target) {
  const a = tokens(given), b = tokens(target);
  const eq = (x, y) => {
    const fx = foldDe(x), fy = foldDe(y);
    if (fx === fy) return 2;
    const d = levenshtein(fx, fy);
    return fy.length > 3 && d <= (fy.length > 8 ? 2 : 1) ? 1 : 0;
  };
  const L = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      L[i][j] = eq(a[i], b[j]) ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  let i = 0, j = 0, exact = 0, typo = 0, extra = 0;
  const out = [];
  while (i < a.length && j < b.length) {
    const e = eq(a[i], b[j]);
    if (e && L[i][j] === L[i + 1][j + 1] + 1) {
      if (e === 2) { exact++; out.push(`<span class="wok">${esc(b[j])}</span>`); }
      else { typo++; out.push(`<span class="wtypo">${charDiffHTML(a[i], b[j])}</span>`); }
      i++; j++;
    } else if (L[i + 1][j] >= L[i][j + 1]) { extra++; out.push(`<span class="wbad">${esc(a[i])}</span>`); i++; }
    else { out.push(`<span class="wmiss">${esc(b[j])}</span>`); j++; }
  }
  while (i < a.length) { extra++; out.push(`<span class="wbad">${esc(a[i++])}</span>`); }
  while (j < b.length) out.push(`<span class="wmiss">${esc(b[j++])}</span>`);
  const total = b.length;
  return { html: out.join(" "), exact, typo, extra, total, pct: Math.round(((exact + typo * 0.75) / Math.max(1, total)) * 100) };
}

RENDERERS.dict = (el, step, ctx) => {
  const text = step.text;
  const isWord = tokens(text).length <= 3;
  const { input, keys } = germanInput({ multiline: !isWord, placeholder: "Wpisz, co słyszysz" });
  const rate = () => (S.settings.slowTTS ? 0.6 : 0.9);
  const play = () => {
    if (!("speechSynthesis" in window)) { toast("Ta przeglądarka nie ma syntezy mowy"); return; }
    speak(text, rate());
  };
  const playBtn = h("button", { class: "btn play-btn", onclick: play }, "▶  Odsłuchaj");
  const again = h("button", { class: "btn small ghost", onclick: play }, "Powtórz");
  const slow = togglePill("Wolniej", () => !!S.settings.slowTTS, (v) => (S.settings.slowTTS = v));
  const checkBtn = h("button", { class: "btn primary" }, "Sprawdź");
  const skipBtn = h("button", { class: "btn ghost" }, "Pokaż tekst");
  el.append(
    h("div", { class: "prompt pop" },
      h("div", { class: "hint" }, isWord ? "Dyktando – słówko" : "Dyktando – zdanie"),
      playBtn,
      h("div", { class: "row", style: "justify-content:center;gap:8px;margin-top:10px" }, again, slow)),
    input, keys, checkBtn, skipBtn);
  play();

  let done = false;
  const finish = (given) => {
    if (done) return;
    done = true;
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    input.disabled = true;
    [checkBtn, skipBtn, keys].forEach((x) => x.remove());
    const d = wordDiff(given || "", text);
    const perfect = d.exact === d.total && !d.extra;
    const ok = d.exact + d.typo === d.total && !d.extra;
    if (perfect) S.stats.dictPerfect = (S.stats.dictPerfect || 0) + 1;
    ctx.done({
      ok,
      almost: ok && !perfect,
      almostWhy: "literówki zaznaczone na żółto.",
      given: perfect ? null : given || "",
      expected: text,
      explain: given ? `<div class="diff words">${d.html}</div><div class="muted" style="font-size:13px">zielone = dobrze · żółte = literówka · podkreślone = brakuje · przekreślone = zbędne · ${d.pct}%</div>` : null,
      pct: d.pct,
    });
  };
  checkBtn.addEventListener("click", () => { if (input.value.trim()) finish(input.value); else input.focus(); });
  skipBtn.addEventListener("click", () => finish(""));
  if (isWord) input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); if (input.value.trim()) finish(input.value); } });
};

const dictStep = (text) => ({ kind: "dict", text, xp: 15, ref: { t: "dict", k: text } });
const dictStepFromRef = (ref) => dictStep(ref.k);

const DICT_SOURCES = [
  { id: "words", name: "Słówka (z wybranych działów)", items: () => activeWords().map((w) => w.de) },
  { id: "sentences", name: "Zdania z ćwiczeń", items: () => SENTENCES },
  { id: "interview", name: "Zdania z rozmowy o pracę", items: INTERVIEW_SENTENCES },
];
const dictSource = () => DICT_SOURCES.find((s) => s.id === (S.settings.dictSource || "sentences"));

function sourcePills(key, sources, def, onChange) {
  const wrap = h("div");
  for (const s of sources) {
    const b = h("button", { class: `pill ${(S.settings[key] || def) === s.id ? "on" : ""}` }, s.name);
    b.addEventListener("click", () => {
      S.settings[key] = s.id;
      save();
      for (const x of wrap.children) x.classList.toggle("on", x === b);
      onChange && onChange();
    });
    wrap.append(b);
  }
  return wrap;
}

function dictSetup() {
  setupScreen({
    id: "dict", title: "Dyktando",
    info: () => h("div", null,
      "Telefon czyta po niemiecku, a ty wpisujesz. Literówki i wielkość liter są wybaczane, różnice zobaczysz słowo po słowie.",
      !("speechSynthesis" in window) ? h("div", { class: "warn" }, "Ta przeglądarka nie obsługuje syntezy mowy – dyktando nie zadziała.") : null),
    count: { label: "Ile nagrań", presets: [5, 10, 20, 0], def: 10, available: () => dictSource().items().length },
    options: (refresh) => [
      h("div", { class: "section-title" }, "Co dyktować"), sourcePills("dictSource", DICT_SOURCES, "sentences", refresh),
      h("div", { class: "section-title" }, "Tempo"), togglePill("Wolniej", () => !!S.settings.slowTTS, (v) => (S.settings.slowTTS = v)),
    ],
    buttons: [{ label: (n) => `Start (${n})`, run: (n) => {
      const items = shuffle(dictSource().items()).slice(0, n);
      runSession({ key: "dict", title: "Dyktando", steps: items.map(dictStep), back: dictSetup, again: dictSetup });
    } }],
  });
}

EXTRA_MODES.push({ id: "dict", name: "Dyktando", badge: "♪", color: "#fdba74", run: () => dictSetup(), desc: "Słuchaj i zapisuj" });

/* ================= Sprawdzian ================= */

const GRAMMAR_TOPICS = [
  { id: "conn", name: "Łączenie zdań", total: () => CONNECTORS.length, make: (i) => mcqConnector(i) },
  { id: "gap", name: "Luki (zu, um, damit…)", total: () => GAPS.length, make: (i) => mcqGap(i) },
  { id: "zu", name: "Zu czy bez zu", total: () => ZU_ITEMS.length, make: (i) => mcqZu(i) },
  { id: "colloc", name: "Kolokacje", total: () => COLLOCATIONS.length, make: (i) => mcqColloc(i) },
  { id: "builder", name: "Układanka zdań", total: () => SENTENCES.length, make: (i) => builderStep(i) },
  { id: "prefix", name: "zer- / ver-", total: () => PREFIX_ITEMS.length, make: (i) => mcqPrefix(i) },
  { id: "article", name: "der / die / das", total: () => nouns().length, make: (i) => mcqArticle(nouns()[i]) },
];

function testTopics() {
  if (!S.settings.testTopics) S.settings.testTopics = ["g:conn", "g:gap", "g:zu", "g:colloc", ...VOCAB.map((v) => "v:" + v.id)];
  return S.settings.testTopics;
}
function testPool() {
  const sel = testTopics();
  const sources = [];
  for (const g of GRAMMAR_TOPICS) if (sel.includes("g:" + g.id)) sources.push({ total: g.total(), make: g.make });
  for (const id of Object.keys(SET_NAMES)) {
    if (!sel.includes("v:" + id)) continue;
    const pool = WORDS.filter((w) => w.set === id);
    if (pool.length >= 4) sources.push({ total: pool.length, make: (i) => mcqVocab(pool[i], pool, Math.random() < 0.5 ? "de-pl" : "pl-de") });
  }
  return sources;
}
const testAvailable = () => testPool().reduce((a, s) => a + s.total, 0);

function buildTest(n) {
  const sources = testPool().map((s) => ({ ...s, deck: shuffle(range(s.total)) }));
  const steps = [];
  let k = 0;
  while (steps.length < n && sources.some((s) => s.deck.length)) {
    const src = sources[k++ % sources.length];
    if (src.deck.length) steps.push(src.make(src.deck.pop()));
  }
  return shuffle(steps);
}

function gradeFor(pct) {
  if (pct >= 90) return { g: "5.0", label: "bardzo dobry" };
  if (pct >= 80) return { g: "4.5", label: "dobry plus (4+)" };
  if (pct >= 70) return { g: "4.0", label: "dobry" };
  if (pct >= 60) return { g: "3.5", label: "dostateczny plus (3+)" };
  if (pct >= 50) return { g: "3.0", label: "dostateczny" };
  return { g: "2.0", label: "niedostateczny" };
}

function topicPills(onChange) {
  const sel = testTopics();
  const wrap = h("div");
  const add = (id, label) => {
    const b = h("button", { class: `pill ${sel.includes(id) ? "on" : ""}` }, label);
    b.addEventListener("click", () => {
      const cur = testTopics();
      S.settings.testTopics = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      save();
      b.classList.toggle("on", S.settings.testTopics.includes(id));
      onChange && onChange();
    });
    wrap.append(b);
  };
  wrap.append(h("div", { class: "muted", style: "font-size:13px;margin:4px 0 6px" }, "Gramatyka"));
  for (const g of GRAMMAR_TOPICS) add("g:" + g.id, g.name);
  wrap.append(h("div", { class: "muted", style: "font-size:13px;margin:8px 0 6px" }, "Słówka"));
  for (const id of Object.keys(SET_NAMES)) add("v:" + id, SET_NAMES[id]);
  return wrap;
}

function stepPromptHTML(step) {
  if (step.reviewPrompt) return step.reviewPrompt;
  if (step.kind === "mcq") return step.prompt;
  if (step.kind === "builder") return `<div class="hint">Ułóż zdanie</div>`;
  if (step.kind === "prefix") return `<div class="big">${esc(PREFIX_ITEMS[step.i].w)}</div>`;
  if (step.kind === "type") return `<div class="big">${esc(step.w.pl)}</div><div class="hint">Wpisz po niemiecku</div>`;
  if (step.kind === "dict") return `<div class="hint">Dyktando</div>`;
  return "";
}

function testSetup() {
  setupScreen({
    id: "test", title: "Sprawdzian",
    info: () => h("div", null,
      h("b", null, "Test przed egzaminem"),
      h("div", { class: "muted", style: "margin-top:6px;font-size:15px" }, "Bez podpowiedzi w trakcie. Na końcu wynik w %, ocena i omówienie błędów. Błędy trafiają do „Moje błędy”.")),
    count: { label: "Ile pytań", presets: [10, 20, 30, 50], def: 20, available: testAvailable },
    options: (refresh) => [h("div", { class: "section-title" }, "Zakres sprawdzianu"), topicPills(refresh)],
    buttons: [{ label: (n) => (n ? `Rozpocznij sprawdzian (${n} pytań)` : "Wybierz zakres"), run: (n) => runTest(n) }],
    footer: () => {
      const hist = (S.tests || []).slice(-10).reverse();
      if (!hist.length) return null;
      return h("div", null,
        h("div", { class: "section-title" }, "Historia wyników"),
        h("div", { class: "card" }, h("table", { class: "stats" },
          hist.map((t) => h("tr", null,
            h("td", null, new Date(t.at).toLocaleDateString("pl-PL"), " · ", `${t.score}/${t.n}`),
            h("td", null, `${t.pct}% · ${t.grade}`))))));
    },
  });
}

function runTest(n) {
  const steps = buildTest(n);
  runSession({
    title: "Sprawdzian", steps, test: true, back: testSetup,
    intro: h("div", { class: "story" }, h("div", { class: "who" }, `Sprawdzian · ${steps.length} pytań`), "Odpowiadaj spokojnie – wynik i omówienie zobaczysz dopiero na końcu."),
    onFinish: (r, body) => {
      const pct = Math.round((r.score / r.total) * 100);
      const gr = gradeFor(pct);
      S.tests = S.tests || [];
      S.tests.push({ at: Date.now(), n: r.total, score: r.score, pct, grade: gr.g });
      if (gr.g === "5.0") S.stats.testFive = (S.stats.testFive || 0) + 1;
      save();
      addXP(r.score * 5);
      if (typeof checkBadges === "function") checkBadges();
      const wrong = r.log.filter((x) => !x.res.ok);
      body.append(
        h("div", { class: "card center pop" },
          h("div", { class: "muted" }, "Wynik sprawdzianu"),
          h("div", { class: "result-big" }, `${pct}%`),
          h("div", { style: "font-size:22px;font-weight:800" }, `Ocena: ${gr.g}`),
          h("div", { class: "muted" }, `${gr.label} · ${r.score}/${r.total} · +${r.score * 5} XP`)),
        wrong.length ? h("div", { class: "section-title" }, `Omówienie błędów (${wrong.length})`) : h("div", { class: "card center" }, "Bezbłędnie – gratulacje!"),
        wrong.map((x) => h("div", { class: "card review" },
          h("div", { class: "prompt", html: stepPromptHTML(x.step) }),
          feedbackEl({ ...x.res, explain: x.res.explain || (x.step.explain || null) }))),
        h("button", { class: "btn primary", onclick: testSetup }, "Nowy sprawdzian"),
        h("button", { class: "btn ghost", onclick: home }, "Menu")
      );
    },
  });
}

EXTRA_MODES.push({ id: "test", name: "Sprawdzian", badge: "A+", color: "#93c5fd", run: () => testSetup(), desc: "Test z oceną przed egzaminem" });

const replayable = () => errorList().filter((e) => e.ref.t !== "cloze" && stepFromRef(e.ref));

function errorsSetup() {
  setupScreen({
    id: "errors", title: "Moje błędy",
    info: () => {
      const list = errorList();
      if (!list.length) return h("div", null, h("b", null, "Brak błędów – świetnie!"), h("div", { class: "muted" }, "Każda pomyłka z dowolnego trybu trafi tutaj. Element znika po 2 poprawnych odpowiedziach z rzędu."));
      const by = {};
      for (const e of list) by[e.ref.t] = (by[e.ref.t] || 0) + 1;
      return h("div", null,
        h("b", null, `Do poprawy: ${list.length}`),
        h("div", { class: "muted", style: "margin-top:6px;font-size:15px" }, Object.entries(by).map(([t, n]) => `${TYPE_NAMES[t] || t}: ${n}`).join(" · ")),
        h("div", { class: "muted", style: "margin-top:6px;font-size:14px" }, "Element znika po 2 poprawnych odpowiedziach z rzędu."));
    },
    count: { label: "Ile powtórzyć", presets: [5, 10, 20, 0], def: 10, available: () => replayable().length },
    buttons: [{
      label: (n) => (n ? `Powtórz błędy (${n})` : "Brak błędów do powtórki"),
      run: (n) => {
        const steps = shuffle(replayable()).sort((a, b) => b.n - a.n).slice(0, n).map((e) => stepFromRef(e.ref));
        runSession({ title: "Moje błędy", steps: shuffle(steps), back: errorsSetup, again: errorsSetup });
      },
    }],
    footer: () => {
      const cl = errorList().filter((e) => e.ref.t === "cloze" && TEXTS[e.ref.i]);
      return h("div", null,
        cl.length ? [h("div", { class: "section-title" }, "Teksty z błędami (Rozmowa o pracę)"),
          cl.map((e) => h("button", { class: "day", onclick: () => clozeGame(e.ref.i, { back: errorsSetup }) },
            h("span", { class: "num" }, e.n), h("span", null, h("b", null, TEXTS[e.ref.i].q), h("br"), h("small", { class: "muted" }, "Uzupełnij bezbłędnie 2 razy z rzędu"))))] : null,
        errorCount() ? h("button", {
          class: "btn ghost", style: "margin-top:16px",
          onclick: () => { if (confirm("Wyczyścić całą listę błędów?")) { S.errors = {}; save(); errorsSetup(); } },
        }, "Wyczyść listę błędów") : null);
    },
  });
}
