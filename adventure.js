"use strict";

/* ================= Przygoda: 100 poziomów na mapie =================
   10 rozdziałów po 10 poziomów. Co 10. poziom to boss.
   Dalsze poziomy są zakryte mgłą, dopóki do nich nie dojdziesz.
   Zadania budują się z istniejących trybów (runSession + generatory z app.js),
   a trudność rośnie z numerem poziomu. */

const ADV_LEVELS = 100;
const ADV_CHAPTERS = [
  { icon: "🚆", name: "Przyjazd do Niemiec", story: "Wysiadasz na dworcu we Frankfurcie. Wszystko po niemiecku, czas się odnaleźć.", boss: { icon: "🎫", name: "Konduktor", line: "Fahrkarte, bitte! Pokaż, że rozumiesz, co się do ciebie mówi." } },
  { icon: "🏠", name: "Szukanie mieszkania", story: "Ogłoszenia, oględziny, umowa najmu. Bez dobrego niemieckiego ani rusz.", boss: { icon: "🔑", name: "Pan Müller, właściciel mieszkania", line: "Chce sprawdzić, czy jesteś solidnym najemcą." } },
  { icon: "📦", name: "Magazyn", story: "Pierwszy dzień w Uhl GmbH. Dostawy, palety i dokumenty przewozowe.", boss: { icon: "🦺", name: "Kierownik magazynu", line: "Na zmianie nie ma miejsca na pomyłki." } },
  { icon: "🗂️", name: "Biuro", story: "Awans do biura: zamówienia, faktury i e-maile do klientów.", boss: { icon: "🧾", name: "Księgowa Frau Schmidt", line: "Każda faktura musi się zgadzać co do słowa." } },
  { icon: "🧯", name: "Szkolenie", story: "Obowiązkowe szkolenie z BHP i higieny. Na końcu test.", boss: { icon: "🧑‍🏫", name: "Inspektor szkolenia", line: "Kto nie zda, ten powtarza cały dzień." } },
  { icon: "🤝", name: "Klient", story: "Twój pierwszy własny klient. Uprzejmie, konkretnie i bez błędów.", boss: { icon: "💼", name: "Wymagający klient", line: "Ma sto pytań i mało cierpliwości." } },
  { icon: "🏛️", name: "Urząd", story: "Anmeldung, Steuer-ID, formularze. Niemiecka biurokracja w pełnej krasie.", boss: { icon: "📋", name: "Urzędnik z okienka nr 7", line: "Formularz musi być wypełniony perfekcyjnie." } },
  { icon: "✈️", name: "Delegacja", story: "Firma wysyła cię do Monachium na targi. Prezentujesz ofertę.", boss: { icon: "🎤", name: "Partner biznesowy", line: "Przekonaj go do współpracy." } },
  { icon: "📈", name: "Rozmowa o awans", story: "Szef zauważył twoje postępy. Czas powalczyć o więcej.", boss: { icon: "👔", name: "Dyrektor HR", line: "Uzasadnij, dlaczego zasługujesz na awans." } },
  { icon: "👑", name: "Szczyt", story: "Ostatnia prosta. Pokaż, że niemiecki masz w małym palcu.", boss: { icon: "👑", name: "Prezes firmy", line: "Ostateczny sprawdzian ze wszystkiego." } },
];

const advChapterOf = (lv) => Math.ceil(lv / 10) - 1;
const advIsBoss = (lv) => lv % 10 === 0;
const advD = (lv) => (lv - 1) / (ADV_LEVELS - 1); /* 0 → 1 */
const advVocabPool = () => { const p = activeWords(); return p.length >= 8 ? p : WORDS; };

/* Typy zadań. make(lv) zwraca kroki/generator do runSession. */
const ADV_TASKS = {
  vocab: {
    icon: "📖", name: "Słówka",
    gen: (lv) => { const dir = lv % 2 ? "de-pl" : "pl-de"; return vocabGen(advVocabPool(), dir); },
    step: () => { const p = advVocabPool(); return mcqVocab(pick(p), p, Math.random() < 0.5 ? "de-pl" : "pl-de"); },
  },
  article: {
    icon: "🎩", name: "der / die / das",
    gen: () => { const d = makeDeck(nouns()); return () => mcqArticle(d()); },
    step: () => mcqArticle(pick(nouns())),
  },
  colloc: {
    icon: "🔗", name: "Kolokacje",
    gen: () => { const d = deckOf(COLLOCATIONS.length); return () => mcqColloc(d()); },
    step: () => mcqColloc(Math.floor(Math.random() * COLLOCATIONS.length)),
  },
  conn: {
    icon: "⇄", name: "Łączenie zdań",
    gen: () => { const d = deckOf(CONNECTORS.length); return () => mcqConnector(d()); },
    step: () => mcqConnector(Math.floor(Math.random() * CONNECTORS.length)),
  },
  gaps: {
    icon: "✏️", name: "Luki",
    gen: () => { const d = deckOf(GAPS.length); return () => mcqGap(d()); },
    step: () => mcqGap(Math.floor(Math.random() * GAPS.length)),
  },
  zu: {
    icon: "🧩", name: "Zu czy bez zu?",
    gen: () => { const d = deckOf(ZU_ITEMS.length); return () => mcqZu(d()); },
    step: () => mcqZu(Math.floor(Math.random() * ZU_ITEMS.length)),
  },
  prefix: {
    icon: "🔨", name: "zer- / ver-",
    gen: () => { const d = deckOf(PREFIX_ITEMS.length); return () => prefixStep(d()); },
  },
  builder: {
    icon: "≡", name: "Układanka zdań",
    gen: () => { const d = deckOf(SENTENCES.length); return () => builderStep(d()); },
  },
};
/* Kolejność zadań w rozdziale (poziomy 1–9), przesuwana co rozdział, żeby się nie powtarzało. */
const ADV_ORDER = ["vocab", "article", "colloc", "vocab", "conn", "gaps", "builder", "zu", "prefix", "article", "vocab", "gaps"];
const ADV_BOSS_MIX = ["vocab", "article", "colloc", "conn", "gaps", "zu"];

/* Pełna definicja poziomu: zawsze ta sama dla danego numeru. */
function advLevel(lv) {
  const d = advD(lv);
  const ch = advChapterOf(lv);
  if (advIsBoss(lv)) {
    const n = 10 + Math.round(8 * d);
    return {
      lv, ch, boss: true, type: "boss", icon: ADV_CHAPTERS[ch].boss.icon, name: ADV_CHAPTERS[ch].boss.name,
      n, lives: d > 0.6 ? 2 : 3, need: Math.ceil(n * (0.7 + 0.2 * d)),
      rules: "Mieszanka wszystkiego",
    };
  }
  const type = ADV_ORDER[(lv - 1 - ch + ch * 5) % ADV_ORDER.length];
  const t = ADV_TASKS[type];
  const base = { lv, ch, type, icon: t.icon, name: t.name };
  if (type === "article") {
    const seconds = 60 - Math.round(20 * d);
    return { ...base, seconds, goal: 8 + Math.round(10 * d), rules: `Na czas: ${seconds} sekund` };
  }
  const n = type === "builder" ? 3 + Math.round(3 * d) : 6 + Math.round(8 * d);
  const pos = (lv - 1) % 10;
  const lives = type === "zu" ? (d > 0.5 ? 2 : 3) : (pos === 3 || pos === 7) && lv > 10 ? (d > 0.6 ? 2 : 3) : 0;
  return { ...base, n, lives, need: Math.ceil(n * (0.6 + 0.25 * d)), rules: lives ? `${lives} ${lives === 1 ? "życie" : "życia"}` : "" };
}

/* ---------- Stan ---------- */

function advState() {
  S.adv = S.adv || {};
  S.adv.stars = S.adv.stars || {};
  return S.adv;
}
const advStars = (lv) => advState().stars[lv] || 0;
const advDone = (lv) => advStars(lv) > 0;
const advUnlocked = (lv) => lv === 1 || advDone(lv - 1);
const advCurrent = () => { for (let lv = 1; lv <= ADV_LEVELS; lv++) if (!advDone(lv)) return lv; return ADV_LEVELS; };
const advTotalStars = () => Object.values(advState().stars).reduce((a, b) => a + b, 0);
const advAllDone = () => advDone(ADV_LEVELS);
/* Niedokończony poziom: pytania jako ref (stepFromRef), numer pytania, punkty, życia. */
function advRun(lv) {
  const r = advState().run;
  if (!r || (lv != null && r.lv !== lv) || !advUnlocked(r.lv) || !Array.isArray(r.refs) || r.i >= r.refs.length) return null;
  return r;
}
function advClearRun() {
  if (advState().run) { delete advState().run; save(); }
}
/* Przywrócenie postępu: poziomy 1..n-1 zaliczone (min. 1 gwiazdka), bez XP i bez obniżania wyników. */
function advRestore(n) {
  n = Math.max(1, Math.min(ADV_LEVELS, Math.floor(+n) || 0));
  if (n <= 1) return false;
  let changed = false;
  for (let lv = 1; lv < n; lv++) if (!advDone(lv)) { advState().stars[lv] = 1; changed = true; }
  if (changed) save();
  return true;
}
function advRestoreFromUrl() {
  const m = (location.search + "&" + location.hash).match(/[?&#]przygoda=(\d+)/);
  if (!m) return;
  const n = +m[1];
  if (advRestore(n)) toast(`Odblokowano poziom ${Math.min(n, ADV_LEVELS)} w Przygodzie`);
  try {
    const url = new URL(location.href);
    url.searchParams.delete("przygoda");
    url.hash = url.hash.replace(/#?&?przygoda=\d+/, "");
    history.replaceState(null, "", url.pathname + url.search + (url.hash && url.hash !== "#" ? url.hash : ""));
  } catch (e) { /* file:// */ }
}
document.addEventListener("DOMContentLoaded", () => { advRestoreFromUrl(); home(); });

function advRestoreCard() {
  const input = h("input", { class: "text-input", type: "number", min: "2", max: String(ADV_LEVELS), inputmode: "numeric", placeholder: "np. 6" });
  const card = h("div", { class: "card adv-restore", hidden: true },
    h("b", null, "Przywróć postęp"),
    h("div", { class: "muted" }, "Wpisz poziom, od którego chcesz grać. Wcześniejsze poziomy zostaną zaliczone (1 gwiazdka, bez XP). Lepsze wyniki się nie zmienią."),
    input,
    h("button", { class: "btn primary", onclick: () => {
      const n = Math.floor(+input.value);
      if (!(n >= 2 && n <= ADV_LEVELS)) return toast(`Wpisz liczbę od 2 do ${ADV_LEVELS}`);
      if (!confirm(`Zaliczyć poziomy 1–${n - 1} i odblokować poziom ${n}?`)) return;
      advRestore(n);
      toast(`Odblokowano poziom ${n} w Przygodzie`);
      advMap();
    } }, "Przywróć"));
  return card;
}

const starStr = (n, max = 3) => "★".repeat(n) + "☆".repeat(max - n);

/* ---------- Mapa ---------- */

const ADV_ROW = 92;          /* wysokość jednego poziomu na mapie (px) */
const advX = (pos) => 50 + 30 * Math.sin(pos * 0.95); /* zygzak ścieżki, % szerokości */

function advMap() {
  const cur = advCurrent();
  const curCh = advChapterOf(cur);
  show("Przygoda", (el) => {
    el.classList.add("adv-screen");
    el.append(h("div", { class: "adv-top" },
      h("div", null, h("b", null, advAllDone() ? "Przygoda ukończona!" : `Poziom ${cur} / ${ADV_LEVELS}`), h("small", { class: "muted" }, ADV_CHAPTERS[curCh].name)),
      h("div", { class: "adv-stars" }, `★ ${advTotalStars()}`, h("small", { class: "muted" }, ` / ${ADV_LEVELS * 3}`),
        h("button", { class: "adv-more", "aria-label": "Więcej opcji", onclick: () => { restore.hidden = !restore.hidden; } }, "⋯"))));
    const restore = advRestoreCard();
    el.append(restore);

    const run = advRun();
    if (run) {
      el.append(h("div", { class: "card adv-resume" },
        h("b", null, `Niedokończony poziom ${run.lv}`),
        h("div", { class: "muted" }, `Pytanie ${run.i + 1} z ${run.refs.length} · ${run.score} pkt`),
        h("button", { class: "btn primary", onclick: () => advPlay(run.lv, true) }, "Kontynuuj")));
    }

    let curNode = null;
    for (let ch = 0; ch <= curCh; ch++) {
      const C = ADV_CHAPTERS[ch];
      const section = h("div", { class: "adv-chapter" },
        h("div", { class: "adv-banner" },
          h("span", { class: "adv-banner-icon" }, C.icon),
          h("span", null, h("small", null, `Rozdział ${ch + 1}`), h("b", null, C.name))));
      const track = h("div", { class: "adv-track", style: `height:${ADV_ROW * 10}px` });
      const pts = [];
      for (let p = 0; p < 10; p++) pts.push([advX(p), p * ADV_ROW + ADV_ROW / 2]);
      track.innerHTML = `<svg class="adv-path" viewBox="0 0 100 ${ADV_ROW * 10}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts.map(([x, y]) => `${x},${y}`).join(" ")}" /></svg>`;

      for (let p = 0; p < 10; p++) {
        const lv = ch * 10 + p + 1;
        const done = advDone(lv);
        const isCur = lv === cur && !advAllDone();
        const isNext = lv === cur + 1;
        const visible = done || isCur;
        const L = advLevel(lv);
        const cls = ["adv-node", L.boss ? "boss" : "", done ? "done" : isCur ? "cur" : isNext ? "next" : "fog"].join(" ");
        const node = h("button", {
          class: cls,
          style: `left:${advX(p)}%;top:${p * ADV_ROW + ADV_ROW / 2}px`,
          "aria-label": visible ? `Poziom ${lv}: ${L.name}` : `Poziom ${lv}: zakryty`,
          onclick: () => (visible ? advIntro(lv) : toast(isNext ? "Najpierw przejdź poprzedni poziom" : "Ten poziom jest jeszcze we mgle")),
        },
          h("span", { class: "adv-node-icon" }, visible ? (isCur && !L.boss ? "▶" : L.icon) : L.boss && isNext ? "💀" : "?"),
          h("span", { class: "adv-node-num" }, lv),
          done ? h("span", { class: "adv-node-stars" }, starStr(advStars(lv))) : null,
          isCur ? h("span", { class: "adv-you" }, "🧍") : null);
        if (isCur) curNode = node;
        track.append(node);
      }
      if (ch === curCh) {
        const fogFrom = Math.max(0, ((cur - 1) % 10) + 2);
        if (fogFrom < 10 && !advAllDone()) track.append(h("div", { class: "adv-fog", style: `top:${fogFrom * ADV_ROW}px` }));
      }
      section.append(track);
      el.append(section);
    }

    const hiddenCh = ADV_CHAPTERS.length - 1 - curCh;
    if (hiddenCh > 0) {
      el.append(h("div", { class: "adv-cloud" },
        h("div", { class: "adv-cloud-icon" }, "☁️ ☁️ ☁️"),
        h("b", null, "Dalej gęsta mgła"),
        h("small", { class: "muted" }, `${hiddenCh} ${hiddenCh === 1 ? "rozdział czeka" : hiddenCh < 5 ? "rozdziały czekają" : "rozdziałów czeka"}. Co jest dalej, zobaczysz, jak tam dojdziesz.`)));
    }

    if (curNode) setTimeout(() => curNode.scrollIntoView({ block: "center", behavior: "smooth" }), 250);
  });
}

/* ---------- Ekran przed poziomem ---------- */

function advIntro(lv) {
  if (!advUnlocked(lv)) return;
  const L = advLevel(lv);
  const C = ADV_CHAPTERS[L.ch];
  const goal = L.seconds ? `Zdobądź co najmniej ${L.goal} punktów` : `Masz ${L.n} ${L.type === "builder" ? "zdań" : "pytań"}. Zalicza ${L.need} dobrych`;
  show(`Poziom ${lv}`, (el) => {
    el.append(
      h("div", { class: `adv-intro pop ${L.boss ? "boss" : ""}` },
        h("div", { class: "adv-intro-k" }, `${C.icon} Rozdział ${L.ch + 1} · ${C.name}`),
        h("div", { class: "adv-intro-icon" }, L.icon),
        h("div", { class: "adv-intro-name" }, L.boss ? `BOSS: ${L.name}` : L.name),
        h("p", null, L.boss ? C.boss.line : (lv - 1) % 10 === 0 ? C.story : "")),
      h("div", { class: "card adv-rules" },
        h("div", null, "🎯 ", goal),
        L.lives ? h("div", null, "❤️ ", `Masz ${L.lives} ${L.lives === 1 ? "życie" : "życia"}: każdy błąd zabiera jedno`) : null,
        L.seconds ? h("div", null, "⏱️ ", `Czas: ${L.seconds} sekund`) : null,
        L.boss ? h("div", null, "🎲 ", "Pytania ze wszystkich trybów naraz") : null,
        h("div", null, "⭐ ", advDone(lv) ? `Twój wynik: ${starStr(advStars(lv))}` : `Nagroda: +${advBonus(lv)} XP za pierwsze przejście`)),
      ...(advRun(lv)
        ? [h("button", { class: "btn primary", onclick: () => advPlay(lv, true) }, `Kontynuuj (pytanie ${advRun(lv).i + 1}/${advRun(lv).refs.length})`),
          h("button", { class: "btn", onclick: () => { advClearRun(); advPlay(lv); } }, "Zacznij od nowa")]
        : [h("button", { class: "btn primary", onclick: () => advPlay(lv) }, advDone(lv) ? "Zagraj jeszcze raz" : "Start")]),
      h("button", { class: "btn ghost", onclick: advMap }, "Mapa"));
  }, advMap);
}

const advBonus = (lv) => (advIsBoss(lv) ? 100 + advChapterOf(lv) * 25 : 15 + advChapterOf(lv) * 5);

function advPlay(lv, resume = false) {
  const L = advLevel(lv);
  const cfg = { title: L.boss ? `Boss · poziom ${lv}` : `Poziom ${lv} · ${L.name}`, back: advMap, lives: L.lives || 0,
    onFinish: (r, body) => { advClearRun(); advFinish(lv, r, body); } };
  if (L.seconds) {
    advClearRun();
    cfg.seconds = L.seconds;
    cfg.gen = ADV_TASKS.article.gen(lv);
    return runSession(cfg);
  }
  const run = resume ? advRun(lv) : null;
  let steps = run ? run.refs.map((ref) => stepFromRef(ref)) : null;
  if (!steps || steps.some((x) => !x)) {
    if (L.boss) {
      const mix = ADV_BOSS_MIX;
      steps = shuffle(Array.from({ length: L.n }, (_, k) => ADV_TASKS[mix[(k + lv) % mix.length]].step()));
    } else {
      const gen = ADV_TASKS[L.type].gen(lv);
      steps = Array.from({ length: L.n }, (_, k) => gen(k));
    }
    advState().run = steps.every((x) => x.ref)
      ? { lv, refs: steps.map((x) => x.ref), i: 0, score: 0, lives: L.lives || 0 }
      : undefined;
    save();
  } else cfg.start = { i: run.i, score: run.score, lives: run.lives };
  cfg.steps = steps;
  cfg.onProgress = (p) => {
    const cur = advState().run;
    if (cur && cur.lv === lv) { Object.assign(cur, p); save(); }
  };
  runSession(cfg);
}

function advScore(L, r) {
  if (L.seconds) {
    const s = r.score;
    return s >= L.goal + 6 ? 3 : s >= L.goal + 3 ? 2 : s >= L.goal ? 1 : 0;
  }
  if (r.score < L.need) return 0;
  if (r.score >= r.total) return 3;
  return r.score >= L.need + Math.ceil((r.total - L.need) / 2) ? 2 : 1;
}

function advFinish(lv, r, body) {
  const L = advLevel(lv);
  const stars = advScore(L, { ...r, total: L.n || r.total });
  const first = stars > 0 && !advDone(lv);
  if (stars > advStars(lv)) { advState().stars[lv] = stars; save(); }
  if (first) addXP(advBonus(lv));
  const lastInChapter = advIsBoss(lv);

  const starsEl = h("div", { class: "adv-result-stars" },
    [0, 1, 2].map((k) => h("span", { class: k < stars ? "on" : "", style: `animation-delay:${0.15 + k * 0.25}s` }, "★")));
  body.append(...[
    h("div", { class: `feedback pop ${stars ? "" : "bad"}` },
      starsEl,
      h("div", { class: "title" }, stars ? (L.boss ? `${L.name} pokonany!` : "Poziom zaliczony!") : "Nie tym razem…"),
      stars
        ? first ? `+${advBonus(lv)} XP za przejście poziomu` : `Najlepszy wynik: ${starStr(advStars(lv))}`
        : L.seconds ? `Potrzebujesz ${L.goal} punktów. Spróbuj jeszcze raz!` : `Potrzebujesz ${L.need} dobrych odpowiedzi. Spróbuj jeszcze raz!`),
    first && lastInChapter && lv < ADV_LEVELS
      ? h("div", { class: "card center adv-unlock pop" }, h("div", null, "☁️ ➜ ", ADV_CHAPTERS[L.ch + 1].icon), h("b", null, `Mgła się rozwiała! Nowy rozdział: ${ADV_CHAPTERS[L.ch + 1].name}`))
      : null,
    stars && lv < ADV_LEVELS ? h("button", { class: "btn primary", style: "margin-top:12px", onclick: () => advIntro(lv + 1) }, `Dalej: poziom ${lv + 1}`) : null,
    h("button", { class: `btn ${stars ? "" : "primary"}`, style: stars ? "" : "margin-top:12px", onclick: () => advPlay(lv) },
      !stars ? "Spróbuj jeszcze raz" : stars < 3 ? "Powtórz po 3 gwiazdki" : "Zagraj jeszcze raz"),
    h("button", { class: "btn ghost", onclick: advMap }, "Mapa"),
  ].filter(Boolean));
  if (stars && typeof celebrate === "function") setTimeout(() => celebrate(), 300);
}

/* ---------- Kafelek na ekranie głównym ---------- */

function adventureTile() {
  const cur = advCurrent();
  const C = ADV_CHAPTERS[advChapterOf(cur)];
  return h("button", { class: "mode wide adv-tile", onclick: advMap },
    h("span", { class: "badge", style: "background:#bbf7d0" }, "🗺️"),
    h("span", null,
      h("b", null, "Przygoda"), h("br"),
      h("small", null, advAllDone() ? `Ukończona! ★ ${advTotalStars()}` : `Poziom ${cur}/${ADV_LEVELS} · ${C.icon} ${C.name} · ★ ${advTotalStars()}`)));
}

const homeBeforeAdventure = home;
home = function () {
  homeBeforeAdventure();
  const anchor = screenEl.querySelector(".gift-strip") || screenEl.querySelector(".hero");
  if (anchor) anchor.after(adventureTile());
};
