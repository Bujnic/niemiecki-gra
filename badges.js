"use strict";

/* ================= Odznaki ================= */

const st = (k) => (S.stats && S.stats[k]) || 0;
const okCount = (t) => (S.stats && S.stats.correct && S.stats.correct[t]) || 0;
const totalCorrect = () => Object.values((S.stats && S.stats.correct) || {}).reduce((a, b) => a + b, 0);
const masteredCount = () => WORDS.filter((w) => srsGet(w.key).b >= 4).length;

const BADGES = [
  { id: "first", icon: "👣", name: "Pierwsze kroki", desc: "Pierwsza dobra odpowiedź", goal: 1, val: () => totalCorrect() || (S.xp > 0 ? 1 : 0) },
  { id: "answers500", icon: "🎯", name: "Pół tysiąca", desc: "500 dobrych odpowiedzi", goal: 500, val: totalCorrect },
  { id: "words50", icon: "📗", name: "50 słówek opanowanych", desc: "Słówko w pudełku 4+ powtórek", goal: 50, val: masteredCount },
  { id: "words100", icon: "📚", name: "100 słówek opanowanych", desc: "Słówko w pudełku 4+ powtórek", goal: 100, val: masteredCount },
  { id: "words200", icon: "🏛️", name: "200 słówek opanowanych", desc: "Prawie cały słownik", goal: 200, val: masteredCount },
  { id: "streak3", icon: "🔥", name: "3 dni z rzędu", desc: "Ucz się 3 dni pod rząd", goal: 3, val: () => S.streak.count },
  { id: "streak7", icon: "📅", name: "7 dni z rzędu", desc: "Cały tydzień nauki", goal: 7, val: () => S.streak.count },
  { id: "streak30", icon: "🗓️", name: "30 dni z rzędu", desc: "Miesiąc bez przerwy", goal: 30, val: () => S.streak.count },
  { id: "xp1000", icon: "⭐", name: "1000 XP", desc: "Zbierz 1000 punktów", goal: 1000, val: () => S.xp },
  { id: "level10", icon: "🚀", name: "Poziom 10", desc: "Dojdź do 10. poziomu", goal: 10, val: () => level() },
  { id: "damit", icon: "🔗", name: "Mistrz damit", desc: "50 dobrych odpowiedzi w łączeniu zdań", goal: 50, val: () => okCount("conn") },
  { id: "zu", icon: "🧩", name: "Mistrz zu", desc: "50 dobrych odpowiedzi „zu czy bez zu”", goal: 50, val: () => okCount("zu") },
  { id: "gaps", icon: "✏️", name: "Mistrz luk", desc: "50 dobrze uzupełnionych luk", goal: 50, val: () => okCount("gap") },
  { id: "prefix", icon: "🔨", name: "zer- czy ver-?", desc: "30 dobrze posortowanych słów", goal: 30, val: () => okCount("prefix") },
  { id: "article", icon: "🎩", name: "der, die, das", desc: "100 trafionych rodzajników", goal: 100, val: () => okCount("article") },
  { id: "fixer", icon: "🛠️", name: "Pogromca błędów", desc: "Popraw 25 swoich błędów", goal: 25, val: () => st("errorsFixed") },
  { id: "clean", icon: "🧹", name: "Czysta karta", desc: "Wyczyść całą listę „Moje błędy”", goal: 1, val: () => st("errorsCleared") },
  { id: "test5", icon: "🏆", name: "Piątka ze sprawdzianu", desc: "Ocena 5.0 ze sprawdzianu", goal: 1, val: () => st("testFive") },
  { id: "tests5", icon: "📝", name: "Egzaminator", desc: "Napisz 5 sprawdzianów", goal: 5, val: () => (S.tests || []).length },
  { id: "rpg", icon: "💼", name: "Praktykant → awans", desc: "Zalicz wszystkie dni praktyk", goal: () => DAYS.length, val: () => S.rpg.done.length },
  { id: "dict", icon: "🎧", name: "Dyktando bez błędu", desc: "Bezbłędne dyktando", goal: 1, val: () => st("dictPerfect") },
  { id: "dict10", icon: "👂", name: "Ucho do niemieckiego", desc: "10 bezbłędnych dyktand", goal: 10, val: () => st("dictPerfect") },
  { id: "speak", icon: "🗣️", name: "Mówię po niemiecku", desc: "90% w ćwiczeniu „Mówienie”", goal: 90, val: () => st("speakBest"), unit: "%" },
  { id: "interview", icon: "🤝", name: "Rozmowa 90%", desc: "Tekst z rozmowy o pracę na 90%+", goal: 90, val: () => st("interviewPct"), unit: "%" },
  { id: "recruiter", icon: "👔", name: "Gotowy na rozmowę", desc: "Rozmowa z rekruterem na 70%+", goal: 1, val: () => st("recruiterPass") },
  { id: "memory", icon: "🧠", name: "Pamięć słonia", desc: "Ukończ Memory", goal: 1, val: () => (Object.keys(S.best).some((k) => /^memory/.test(k)) ? 1 : 0) },
];

const badgeGoal = (b) => (typeof b.goal === "function" ? b.goal() : b.goal);
const unlockedCount = () => BADGES.filter((b) => S.badges && S.badges[b.id]).length;

let badgeQueue = [];
let badgeShowing = false;
function checkBadges(silent) {
  S.badges = S.badges || {};
  const fresh = [];
  for (const b of BADGES) {
    if (S.badges[b.id]) continue;
    let v = 0;
    try { v = b.val(); } catch (e) { v = 0; }
    if (v >= badgeGoal(b)) { S.badges[b.id] = Date.now(); fresh.push(b); }
  }
  if (!fresh.length) return [];
  save();
  if (!silent) { badgeQueue.push(...fresh); nextBadgePop(); }
  return fresh;
}

function nextBadgePop() {
  if (badgeShowing || !badgeQueue.length) return;
  const b = badgeQueue.shift();
  badgeShowing = true;
  if (typeof haptic === "function") haptic("success");
  if (typeof sfx === "function") sfx("badge");
  const pop = h("div", { class: "badge-pop", onclick: () => close() },
    h("div", { class: "badge-pop-icon" }, b.icon),
    h("div", null, h("div", { class: "badge-pop-k" }, "Nowa odznaka!"), h("b", null, b.name)));
  document.body.append(pop);
  let t = setTimeout(close, 3200);
  function close() {
    clearTimeout(t);
    if (!pop.parentNode) return;
    pop.classList.add("out");
    setTimeout(() => { pop.remove(); badgeShowing = false; nextBadgePop(); }, 280);
  }
}

function badgesScreen() {
  checkBadges(true);
  show("Odznaki", (el) => {
    el.append(h("div", { class: "card center" },
      h("div", { class: "result-big" }, `${unlockedCount()}/${BADGES.length}`),
      h("div", { class: "muted" }, "odznak zdobytych")));
    el.append(h("div", { class: "badge-grid" }, BADGES.map((b) => {
      const goal = badgeGoal(b);
      let v = 0;
      try { v = b.val(); } catch (e) { /* */ }
      const got = S.badges[b.id];
      const pct = got ? 100 : Math.round(clamp(v / goal, 0, 1) * 100);
      return h("div", { class: `badge-cell ${got ? "got" : "locked"}` },
        h("div", { class: "badge-icon" }, b.icon),
        h("b", null, b.name),
        h("small", null, b.desc),
        got
          ? h("small", { class: "badge-date" }, new Date(got).toLocaleDateString("pl-PL"))
          : h("div", { class: "badge-prog" }, h("div", { class: "bar" }, h("i", { style: `width:${pct}%` })), h("small", null, `${Math.min(v, goal)}/${goal}${b.unit || ""}`)));
    })));
  });
}

EXTRA_MODES.push({ id: "badges", name: "Odznaki", badge: "🏅", color: "#fde68a", run: () => badgesScreen(), desc: () => `${unlockedCount()}/${BADGES.length} zdobytych` });

document.addEventListener("DOMContentLoaded", () => { setTimeout(() => checkBadges(), 600); });
