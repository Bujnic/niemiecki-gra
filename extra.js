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
    default: return null;
  }
}

EXTRA_MODES.push({
  id: "errors", name: "Moje błędy", badge: "!", color: "#fca5a5", run: () => errorsSetup(), count: errorCount,
  desc: () => (errorCount() ? `${errorCount()} do poprawy` : "Pomyłki ze wszystkich trybów"),
});

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
