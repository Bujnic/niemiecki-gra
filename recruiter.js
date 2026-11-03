"use strict";

/* ================= Rozmowa z rekruterem ================= */

/* Zwrot = lista rdzeni (po foldDe), które muszą wystąpić w tej kolejności w oknie 7 słów.
   „a|b” = alternatywy, dopasowanie od początku słowa. */
const K = (label, stems) => ({ label, stems: stems.split(" ").map((s) => s.split("|")) });

const RECRUITER_QUESTIONS = [
  {
    id: "intro", extra: true,
    q: "Erzählen Sie bitte etwas über sich.",
    pl: "Proszę opowiedzieć coś o sobie.",
    model: "Ich bin zweiundzwanzig Jahre alt und studiere im fünften Semester. Ich interessiere mich nicht nur für Wirtschaft, sondern auch für Technik. Während meines Praktikums habe ich wichtige Erfahrungen gesammelt und gelernt, im Team zu arbeiten. In meiner Freizeit treibe ich Sport, um einen Ausgleich zum Studium zu finden. Außerdem lerne ich Deutsch, damit ich später auch im Ausland arbeiten kann.",
    keys: [K("studieren / Studium", "studi"), K("Erfahrungen sammeln", "erfahrung sammel|gesammelt"), K("Praktikum", "praktikum|praktika"), K("im Team arbeiten", "team"), K("sich interessieren für", "interessier"), K("einen Ausgleich finden", "ausgleich|balance")],
  },
  ...TEXTS.slice(0, 4).map((t, i) => ({ id: "t" + i, q: t.q, pl: t.pl, model: t.a.replace(/[{}]/g, ""), keys: null, textIndex: i })),
  {
    id: "strengths", extra: true,
    q: "Was sind Ihre Stärken und Schwächen?",
    pl: "Jakie są Pana/Pani mocne i słabe strony?",
    model: "Zu meinen Stärken gehört, dass ich zuverlässig und gut organisiert bin. Ich kann konstruktiv Kritik üben, ohne in Wut zu geraten, und ich führe in Meetings gern das Protokoll. Eine meiner Schwächen ist, dass ich manchmal zu ungeduldig bin. Ich arbeite aber daran, indem ich mir mehr Zeit nehme, um Probleme in Ruhe zu analysieren. Außerdem bitte ich Kollegen regelmäßig um Feedback, damit ich mich weiterentwickeln kann.",
    keys: [K("Stärken", "staerke"), K("Schwächen", "schwaeche"), K("zuverlässig", "zuverlaessig"), K("Kritik üben", "kritik ueb"), K("in Wut geraten", "wut gera|geri"), K("ein Protokoll führen", "protokoll|protokolle")],
  },
];

const TEXT_KEYS = [
  [K("nicht nur … sondern auch", "nicht$ nur$ sondern$"), K("Erfahrungen sammeln", "erfahrung sammel|gesammelt"), K("Misserfolge", "misserfolg"), K("Ausreden", "ausrede"), K("Kritik üben", "kritik ueb"), K("in Wut geraten", "wut gera|geri"), K("ein Protokoll führen", "protokoll fuehr|gefuehrt"), K("Vereinbarungen treffen", "vereinbarung treff|getroff|traf")],
  [K("Ziel", "ziel$|ziele$|zielen$"), K("Leistungen", "leistung"), K("Erwartungen", "erwartung"), K("erfüllen / übertreffen", "erfuell|uebertreff|uebertroff"), K("Leitfaden", "leitfaden"), K("Gelegenheit ergreifen", "gelegenheit ergreif|ergriff"), K("Fragen stellen", "frage stell|gestellt"), K("zur Sprache kommen", "sprache komm|kam|gekommen")],
  [K("Führungskraft", "fuehrungskraft|fuehrungskraefte|fuehrungsposition"), K("Leistungen", "leistung"), K("Verhalten", "verhalten"), K("beurteilen / bewerten", "beurteil|bewert"), K("Mitarbeiter / Team", "mitarbeiter|team"), K("Stabilität", "stabilitaet"), K("Balance / Ausgleich", "balance|ausgleich|gleichgewicht")],
  [K("sich weiterbilden", "weiterbild|weiterzubild|fortbild"), K("wahrscheinlich", "wahrscheinlich"), K("Promotion", "promotion|promovier|doktor"), K("Arbeitsmarkt", "arbeitsmarkt"), K("Kurse besuchen", "kurs|kurse|schulung|seminar"), K("Wünsche", "wunsch|wuensche"), K("einen Vertrag unterschreiben", "unterschreib|unterschrieb")],
];
RECRUITER_QUESTIONS.forEach((q) => { if (q.textIndex != null) q.keys = TEXT_KEYS[q.textIndex]; });

const CONNECTORS_LIST = [
  { label: "nicht nur … sondern auch", stems: [["nicht$"], ["nur$"], ["sondern$"]] },
  { label: "außerdem", stems: [["ausserdem"]] },
  { label: "dass", stems: [["dass$"]] },
  { label: "weil / da", stems: [["weil$", "da$"]] },
  { label: "deshalb / deswegen", stems: [["deshalb$", "deswegen$", "daher$", "darum$"]] },
  { label: "obwohl / trotzdem", stems: [["obwohl", "trotzdem"]] },
  { label: "zum Beispiel", stems: [["zum$"], ["beispiel"]] },
  { label: "zuerst / danach", stems: [["zuerst", "danach", "anschliessend", "schliesslich"]] },
  { label: "einerseits / andererseits", stems: [["einerseits", "andererseits"]] },
  { label: "wenn / als", stems: [["wenn$"]] },
];

/* ---------- Analiza ---------- */

function tokenize(text) {
  const raw = String(text).match(/[A-Za-zÄÖÜäöüß-]+|[0-9]+|[^\sA-Za-zÄÖÜäöüß0-9]+|\s+/g) || [];
  const words = [];
  raw.forEach((t, idx) => { if (/^[A-Za-zÄÖÜäöüß0-9-]+$/.test(t)) words.push({ t, f: foldDe(t).replace(/-/g, ""), idx }); });
  return { raw, words };
}

const stemHit = (word, alts) => alts.some((a) => (a.endsWith("$") ? word === a.slice(0, -1) : word.startsWith(a)));

function findPhrase(words, stems, window = 7) {
  for (let i = 0; i < words.length; i++) {
    if (!stemHit(words[i].f, stems[0])) continue;
    const hit = [i];
    let j = i;
    for (let s = 1; s < stems.length; s++) {
      let found = -1;
      for (let k = j + 1; k < Math.min(words.length, i + window + 1); k++) if (stemHit(words[k].f, stems[s])) { found = k; break; }
      if (found < 0) break;
      hit.push(found);
      j = found;
    }
    if (hit.length === stems.length) return hit;
  }
  return null;
}

const NOT_INF = new Set(["den", "einen", "meinen", "deinen", "seinen", "ihren", "unseren", "euren", "diesen", "jenen", "allen", "vielen", "wenigen", "anderen", "keinen", "jeden", "beiden", "ihnen", "denen"]);
const isGluedZu = (w) => /^[a-zäöü]/.test(w.t) && /^[a-z]{2,}zu[a-z]{2,}(en|ern|eln)$/.test(w.f);
const isZuInf = (words, i) => {
  const w = words[i], nx = words[i + 1];
  if (w.f === "zu") return !!nx && /(en|ern|eln)$/.test(nx.f) && !/^[A-ZÄÖÜ]/.test(nx.t) && !NOT_INF.has(nx.f);
  return isGluedZu(w);
};

function findInfinitives(words) {
  const found = [];
  const mark = new Set();
  const take = (label, idxs) => { found.push(label); idxs.forEach((x) => mark.add(x)); };
  const zuAt = (from) => { for (let k = from; k < Math.min(words.length, from + 12); k++) if (isZuInf(words, k)) return k; return -1; };
  for (let i = 0; i < words.length; i++) {
    const f = words[i].f;
    if (f === "um" || f === "ohne" || f === "anstatt" || f === "statt") {
      const z = zuAt(i + 1);
      if (z > 0) {
        const lbl = f === "um" ? "um … zu" : f === "ohne" ? "ohne … zu" : "anstatt … zu";
        if (!found.includes(lbl)) take(lbl, [i, z, z + (words[z].f === "zu" ? 1 : 0)]);
      }
    }
    if (f === "damit" && !found.includes("damit")) take("damit", [i]);
  }
  for (let i = 0; i < words.length; i++) {
    if (isZuInf(words, i) && !mark.has(i)) {
      if (!found.includes("zu + bezokolicznik")) found.push("zu + bezokolicznik");
      mark.add(i);
      if (words[i].f === "zu") mark.add(i + 1);
    }
  }
  return { found, mark };
}

function evaluateAnswer(text, q) {
  const { raw, words } = tokenize(text);
  const keyMark = new Set(), connMark = new Set();
  const hits = [], missed = [];
  for (const k of q.keys) {
    const r = findPhrase(words, k.stems);
    if (r) { hits.push(k.label); r.forEach((x) => keyMark.add(x)); } else missed.push(k.label);
  }
  const conns = [];
  for (const c of CONNECTORS_LIST) {
    const r = findPhrase(words, c.stems, 10);
    if (r) { conns.push(c.label); r.forEach((x) => connMark.add(x)); }
  }
  const inf = findInfinitives(words);
  const n = words.length;
  const parts = {
    len: Math.min(1, n / 40),
    keys: Math.min(1, hits.length / Math.max(1, Math.ceil(q.keys.length * 0.6))),
    inf: Math.min(1, inf.found.length / 2),
    conn: Math.min(1, conns.length / 3),
  };
  const pct = n < 3 ? 0 : Math.round(parts.len * 25 + parts.keys * 40 + parts.inf * 20 + parts.conn * 15);

  const wIndex = new Map(words.map((w, i) => [w.idx, i]));
  const html = raw.map((t, idx) => {
    const i = wIndex.get(idx);
    if (i == null) return esc(t);
    const cls = keyMark.has(i) ? "hl-key" : inf.mark.has(i) ? "hl-inf" : connMark.has(i) ? "hl-conn" : "";
    return cls ? `<span class="${cls}">${esc(t)}</span>` : esc(t);
  }).join("");

  const tips = [];
  if (n < 20) tips.push("Odpowiedź jest bardzo krótka – powiedz 3–4 pełne zdania.");
  if (missed.length && parts.keys < 1) tips.push(`Wpleć zwroty z notatek, np. „${missed.slice(0, 2).join("”, „")}”.`);
  if (!inf.found.length) tips.push("Dodaj konstrukcję bezokolicznikową: „…, um … zu …”, „ohne … zu …” albo „Es ist wichtig, … zu …”.");
  else if (inf.found.length < 2) tips.push("Masz jedną konstrukcję z „zu” – dorzuć drugą, np. „…, damit …” albo „…, um … zu …”.");
  if (conns.length < 2) tips.push("Łącz zdania: „nicht nur …, sondern auch …”, „außerdem”, „…, dass …”.");
  if (n >= 20 && n < 35 && tips.length < 2) tips.push("Rozwiń odpowiedź o przykład z praktyk albo studiów.");
  if (!tips.length) tips.push("Bardzo dobra odpowiedź! Spróbuj teraz powiedzieć ją bez patrzenia na wzór.");

  return { pct, parts, hits, missed, conns, inf: inf.found, words: n, html, tips: tips.slice(0, 2) };
}

/* ---------- Reakcje rekrutera ---------- */

const REACTIONS = {
  good: [["Sehr gut, vielen Dank. Das klingt überzeugend.", "Bardzo dobrze, dziękuję. To brzmi przekonująco."], ["Ausgezeichnet, das gefällt mir.", "Świetnie, podoba mi się to."], ["Danke, das war eine klare und gut strukturierte Antwort.", "Dziękuję, to była jasna i dobrze zbudowana odpowiedź."]],
  mid: [["Danke. Das ist ein guter Anfang – ein konkretes Beispiel wäre noch schön.", "Dziękuję. To dobry początek – przydałby się jeszcze konkretny przykład."], ["Interessant. Könnten Sie beim nächsten Mal etwas mehr ins Detail gehen?", "Ciekawe. Następnym razem proszę podać trochę więcej szczegółów."]],
  low: [["Danke. Ich hätte gern etwas mehr darüber gehört.", "Dziękuję. Chętnie usłyszałabym o tym więcej."], ["Hm, das war ziemlich kurz. Versuchen wir es mit der nächsten Frage.", "Hm, to było dość krótkie. Spróbujmy z następnym pytaniem."]],
};
const NEXT_Q = ["Kommen wir zur nächsten Frage.", "Przejdźmy do następnego pytania."];
const GOODBYE = ["Vielen Dank für das Gespräch! Wir melden uns bald bei Ihnen.", "Dziękuję za rozmowę! Wkrótce się odezwiemy."];
const GREETING = ["Guten Tag! Schön, dass Sie da sind. Fangen wir an.", "Dzień dobry! Miło, że Pan/Pani jest. Zaczynajmy."];

const reactionFor = (pct) => pick(REACTIONS[pct >= 75 ? "good" : pct >= 45 ? "mid" : "low"]);
const ttsRate = () => (S.settings.slowTTS ? 0.7 : 0.92);

function speakChain(texts) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  let k = 0;
  const nextOne = () => {
    if (k >= texts.length) return;
    const u = speak(texts[k++], ttsRate());
    if (u) u.onend = nextOne;
  };
  nextOne();
}

/* ---------- Ekrany ---------- */

function recruiterQuestions(n) {
  const list = RECRUITER_QUESTIONS.filter((q) => !q.extra || S.settings.recExtras !== false);
  return n > 0 ? list.slice(0, n) : list;
}

function recruiterSetup() {
  const sup = speechSupport();
  setupScreen({
    id: "recruiter", title: "Rekruter",
    info: () => h("div", null,
      "Rekruterka zadaje pytania na głos, a Ty odpowiadasz mówiąc (albo pisząc). Po każdej odpowiedzi dostajesz ocenę, podświetlone zwroty, wzór do odsłuchania i wskazówki.",
      !sup.ok ? h("div", { class: "warn" }, sup.msg, " Możesz odpowiadać, pisząc.") : sup.warn ? h("div", { class: "info-box" }, sup.warn) : null),
    count: { label: "Ile pytań", presets: [3, 0], def: 0, available: () => recruiterQuestions(0).length },
    options: (refresh) => [
      h("div", { class: "section-title" }, "Ustawienia"),
      togglePill("Pytania dodatkowe (spoza notatek)", () => S.settings.recExtras !== false, (v) => (S.settings.recExtras = v), refresh),
      togglePill("Pokaż tłumaczenie pytań", () => !!S.settings.recPl, (v) => (S.settings.recPl = v)),
      togglePill("Wolniejsza mowa", () => !!S.settings.slowTTS, (v) => (S.settings.slowTTS = v)),
    ],
    buttons: [{ label: (n) => `Zacznij rozmowę (${n} pytań)`, run: (n) => recruiterInterview(recruiterQuestions(n)) }],
  });
}

function recruiterInterview(qs) {
  const results = [];
  let widget = null;
  show("Rekruter", (el) => {
    cleanup = () => { if (widget) widget.abort(); };
    const hud = h("div", { class: "hud" });
    const body = h("div");
    el.append(hud, body);

    const setHud = (k) => {
      hud.innerHTML = "";
      hud.append(h("span", null, `${Math.min(k + 1, qs.length)}/${qs.length}`), h("div", { class: "bar" }, h("i", { style: `width:${(k / qs.length) * 100}%` })), h("span", null, "👔"));
    };

    function bubble(de, pl, extraLabel) {
      const plEl = h("div", { class: "rec-pl", hidden: !S.settings.recPl }, pl);
      const tBtn = h("button", { class: "pill small", onclick: () => { S.settings.recPl = !S.settings.recPl; save(); body.querySelectorAll && body.querySelectorAll(".rec-pl").forEach((x) => (x.hidden = !S.settings.recPl)); tBtn.classList.toggle("on", !!S.settings.recPl); } }, "Tłumaczenie");
      tBtn.classList.toggle("on", !!S.settings.recPl);
      return h("div", { class: "rec-row slide-in" },
        h("div", { class: "rec-avatar", "aria-hidden": "true" }, "👩‍💼"),
        h("div", { class: "rec-bubble" },
          extraLabel ? h("div", { class: "rec-extra" }, extraLabel) : null,
          h("div", { class: "rec-de" }, de),
          plEl,
          h("div", { class: "rec-actions" },
            h("button", { class: "pill small", onclick: () => speak(de, ttsRate()) }, "▶ Powtórz"),
            tBtn)));
    }

    function intro() {
      setHud(0);
      body.innerHTML = "";
      body.append(
        bubble(GREETING[0], GREETING[1]),
        h("div", { class: "card muted", style: "font-size:14px" },
          "Rekruterka mówi po niemiecku. Odpowiadaj pełnymi zdaniami i używaj zwrotów z notatek. ",
          "Dotknij mikrofonu, żeby zacząć mówić, i jeszcze raz, żeby skończyć."),
        h("button", { class: "btn primary", onclick: () => ask(0, true) }, "Zaczynamy"));
    }

    function ask(k, withGreeting) {
      if (widget) widget.abort();
      if (k >= qs.length) return summary();
      const q = qs[k];
      setHud(k);
      body.innerHTML = "";
      speakChain(withGreeting ? [GREETING[0], q.q] : [q.q]);
      widget = micWidget({
        maxMs: 120000,
        typingLabel: "Wolę napisać odpowiedź",
        onDone: (text) => evaluate(k, text),
      });
      body.append(
        bubble(q.q, q.pl, q.extra ? "dodatkowe pytanie (spoza notatek)" : null),
        widget.el,
        h("button", { class: "btn ghost", style: "margin-top:12px", onclick: () => { results[k] = { q, pct: 0, skipped: true }; ask(k + 1); } }, "Pomiń pytanie"));
    }

    function evaluate(k, text) {
      if (widget) { widget.abort(); widget = null; }
      const q = qs[k];
      const ev = evaluateAnswer(text, q);
      results[k] = { q, pct: ev.pct, text };
      const last = k + 1 >= qs.length;
      const [rDe, rPl] = reactionFor(ev.pct);
      speakChain([rDe]);
      if (typeof haptic === "function") haptic(ev.pct >= 60 ? "success" : "error");
      if (ev.pct >= 90 && typeof celebrate === "function") celebrate();

      const modelBox = h("div", { class: "card model", hidden: true }, h("div", { class: "muted", style: "font-size:13px;margin-bottom:6px" }, "Wzorowa odpowiedź"), q.model);
      const bar = (label, v) => h("div", { class: "rec-part" }, h("span", null, label), h("div", { class: "bar" }, h("i", { style: `width:${Math.round(v * 100)}%` })));
      body.innerHTML = "";
      body.append(
        h("div", { class: "card center pop" },
          h("div", { class: "muted" }, q.q),
          h("div", { class: "result-big" }, `${ev.pct}%`),
          bar("Długość", ev.parts.len), bar("Zwroty z notatek", ev.parts.keys), bar("Bezokoliczniki (zu)", ev.parts.inf), bar("Łączniki", ev.parts.conn)),
        h("div", { class: "card" },
          h("div", { class: "muted", style: "font-size:13px;margin-bottom:6px" }, `Twoja odpowiedź (${ev.words} słów)`),
          h("div", { class: "transcript-hl", html: ev.html }),
          h("div", { class: "legend" }, h("span", { class: "hl-key" }, "zwrot"), " ", h("span", { class: "hl-inf" }, "zu / um / damit"), " ", h("span", { class: "hl-conn" }, "łącznik"))),
        h("div", { class: "card" },
          h("div", { class: "rec-chips" },
            ev.hits.map((x) => h("span", { class: "rec-chip ok" }, "✓ " + x)),
            ev.missed.map((x) => h("span", { class: "rec-chip miss" }, x)),
            ev.inf.map((x) => h("span", { class: "rec-chip inf" }, x)),
            ev.conns.map((x) => h("span", { class: "rec-chip conn" }, x))),
          h("div", { class: "tips" }, ev.tips.map((t) => h("div", { class: "tip" }, "💡 " + t)))),
        bubble(rDe + (last ? "" : " " + NEXT_Q[0]), rPl + (last ? "" : " " + NEXT_Q[1])),
        h("div", { class: "btns-2" },
          h("button", { class: "btn ghost", onclick: () => speak(q.model, ttsRate()) }, "▶ Wzór"),
          h("button", { class: "btn ghost", onclick: (e) => { modelBox.hidden = !modelBox.hidden; e.currentTarget.textContent = modelBox.hidden ? "Pokaż wzór" : "Ukryj wzór"; } }, "Pokaż wzór")),
        modelBox,
        h("button", { class: "btn ghost", onclick: () => ask(k) }, "Odpowiedz jeszcze raz"),
        h("button", { class: "btn primary", onclick: () => ask(k + 1) }, last ? "Zakończ rozmowę" : "Następne pytanie"));
      screenEl.scrollTop = 0;
    }

    function summary() {
      setHud(qs.length);
      body.innerHTML = "";
      speakChain([GOODBYE[0]]);
      const answered = results.filter((r) => r && !r.skipped);
      const avg = Math.round(results.reduce((a, r) => a + ((r && r.pct) || 0), 0) / Math.max(1, qs.length));
      const xp = Math.round(avg / 2) + answered.length * 5;
      addXP(xp);
      S.stats.recruiterBest = Math.max(S.stats.recruiterBest || 0, avg);
      const passed = avg >= 70 && answered.length >= Math.min(3, qs.length);
      if (passed) S.stats.recruiterPass = (S.stats.recruiterPass || 0) + 1;
      save();
      if (typeof checkBadges === "function") checkBadges();
      if (passed && typeof celebrate === "function") celebrate();
      body.append(
        bubble(GOODBYE[0], GOODBYE[1]),
        h("div", { class: "card center pop" },
          h("div", { class: "muted" }, "Wynik rozmowy"),
          h("div", { class: "result-big" }, `${avg}%`),
          h("div", null, `+${xp} XP`),
          h("div", { class: passed ? "ok-text" : "muted", style: "margin-top:6px;font-weight:700" },
            passed ? "Gotowy na rozmowę! 👔" : "Do 70% brakuje niewiele – spróbuj jeszcze raz.")),
        h("div", { class: "card" }, results.map((r, k) => h("div", { class: "rec-sum-row" },
          h("span", null, `${k + 1}. ${r ? r.q.q : qs[k].q}`),
          h("b", { class: r && r.pct >= 70 ? "ok-text" : "" }, r && !r.skipped ? `${r.pct}%` : "pominięte")))),
        h("button", { class: "btn primary", onclick: () => recruiterInterview(qs) }, "Jeszcze raz"),
        h("button", { class: "btn ghost", onclick: recruiterSetup }, "Menu"));
    }

    intro();
  }, recruiterSetup);
}

EXTRA_MODES.push({ id: "recruiter", name: "Rozmowa z rekruterem", badge: "👔", color: "#c4b5fd", run: () => recruiterSetup(), desc: () => (S.stats.recruiterBest ? `Najlepiej: ${S.stats.recruiterBest}%` : "Próbna rozmowa na głos") });
