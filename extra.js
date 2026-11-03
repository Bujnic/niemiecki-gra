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
