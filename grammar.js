"use strict";

/* ================= Przyimki i odmiana ================= */

/* Nowe działy słówek włączają się same także u osób, które mają już zapisane ustawienia. */
(function enableNewSets() {
  const ORIGINAL = ["technika", "reklamacje", "higiena", "infinitiv", "przymiotniki", "rozmowa", "beschaffung", "oferty", "zlecenia", "usterki"];
  const known = S.settings.knownSets || ORIGINAL;
  let changed = !S.settings.knownSets;
  for (const v of VOCAB) {
    if (!known.includes(v.id)) {
      if (!S.settings.sets.includes(v.id)) S.settings.sets.push(v.id);
      if (S.settings.testTopics && !S.settings.testTopics.includes("v:" + v.id)) S.settings.testTopics.push("v:" + v.id);
      changed = true;
    }
  }
  S.settings.knownSets = VOCAB.map((v) => v.id);
  if (changed) save();
})();

const gapSent = (s, ans) => `<i>${esc(s).replace("___", `<b class="ans">${esc(ans)}</b>`)}</i>`;

function mcqPrep(i) {
  const p = PREP_ITEMS[i];
  return {
    kind: "mcq",
    prompt: `<div class="sent">${gapHTML(p.s)}</div><div class="hint">Wybierz przyimek / formę</div>`,
    options: shuffle(p.opts),
    correct: p.a,
    ref: { t: "prep", i },
    cols: 2,
    rule: p.rule,
    explain: `${gapSent(p.s, p.a[0])}${p.a.length > 1 ? `<div class="muted">Też poprawnie: ${esc(p.a.slice(1).join(", "))}</div>` : ""}<div class="why">${p.why}</div>`,
  };
}

const DECL_TYPE = ["rodzajnik", "typ 1 (po der/die/das)", "typ 2 (po ein/kein/mein)", "typ 3 (bez rodzajnika)"];
const DECL_RULE = ["artikel", "adj1", "adj2", "adj3"];

function mcqDecl(i) {
  const d = DECL_ITEMS[i];
  return {
    kind: "mcq",
    prompt: `<div class="sent">${gapHTML(d.s)}</div><div class="hint">${d.typ ? "Wybierz końcówkę przymiotnika" : "Wybierz rodzajnik"}</div>`,
    options: shuffle(d.opts),
    correct: [d.opts[0]],
    ref: { t: "decl", i },
    cols: 2,
    rule: DECL_RULE[d.typ],
    explain: `${gapSent(d.s, d.opts[0])}<div class="decl-tags"><span>${d.cas}</span><span>${d.gen}</span><span>${DECL_TYPE[d.typ]}</span></div><div class="why">${d.why}</div>`,
  };
}

const prepSetup = indexSetup({
  id: "prep", title: "Przyimki", label: "Ile zdań", def: 12, total: PREP_ITEMS.length, make: mcqPrep,
  extraInfo: () => h("div", null, "Przyimki czasu (ab, bei, binnen, innerhalb, außerhalb, bis zu, über) i przyimki z Genitiv (während, wegen, aufgrund, infolge, anlässlich, laut). Po każdej odpowiedzi – przypadek i wyjaśnienie."),
});
const declSetup = indexSetup({
  id: "decl", title: "Odmiana", label: "Ile zdań", def: 12, total: DECL_ITEMS.length, make: mcqDecl,
  extraInfo: () => h("div", null, "Rodzajniki w 4 przypadkach i końcówki przymiotników (typ 1, 2 i 3). Po każdej odpowiedzi: przypadek, rodzaj i typ odmiany."),
});

MODES.push(
  { id: "prep", name: "Przyimki", desc: "ab, binnen, während, wegen…", badge: "ab", color: "#fda4af", run: () => prepSetup() },
  { id: "decl", name: "Odmiana", desc: "Rodzajniki i końcówki -e/-en/-er", badge: "-en", color: "#7dd3fc", run: () => declSetup() },
);

GRAMMAR_TOPICS.push(
  { id: "prep", name: "Przyimki (czasu, z Genitiv)", total: () => PREP_ITEMS.length, make: (i) => mcqPrep(i) },
  { id: "decl", name: "Odmiana (rodzajniki, przymiotniki)", total: () => DECL_ITEMS.length, make: (i) => mcqDecl(i) },
);

TYPE_NAMES.prep = "Przyimki";
TYPE_NAMES.decl = "Odmiana";
STEP_FROM_REF.prep = (ref) => (PREP_ITEMS[ref.i] ? mcqPrep(ref.i) : null);
STEP_FROM_REF.decl = (ref) => (DECL_ITEMS[ref.i] ? mcqDecl(ref.i) : null);

BADGES.push(
  { id: "prep", icon: "⏰", name: "Mistrz przyimków", desc: "30 dobrych odpowiedzi w „Przyimki”", goal: 30, val: () => okCount("prep") },
  { id: "decl", icon: "🔤", name: "Mistrz odmiany", desc: "30 dobrych odpowiedzi w „Odmiana”", goal: 30, val: () => okCount("decl") },
);
