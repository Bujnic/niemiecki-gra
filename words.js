"use strict";

/* ================= Własne słówka ================= */

const OWN_DEFAULT_CAT = "c_moje";

function customStore() {
  if (!S.custom) S.custom = { words: [], cats: {} };
  S.custom.words = S.custom.words || [];
  S.custom.cats = S.custom.cats || {};
  return S.custom;
}

function addCustomWords() {
  try { if (!S || !S.custom) return; } catch (e) { return; }
  const c = customStore();
  for (const id in c.cats) SET_NAMES[id] = c.cats[id];
  for (const cw of c.words) {
    if (!SET_NAMES[cw.cat]) SET_NAMES[cw.cat] = c.cats[cw.cat] || "Moje słówka";
    const w = parseWord(`${cw.de}${cw.plural ? " (pl)" : ""} | ${cw.pl}${cw.emoji ? " | " + cw.emoji : ""}`, cw.cat);
    if (!w) continue;
    w.own = cw.id;
    const dup = WORDS.findIndex((x) => x.key === w.key);
    if (dup >= 0) WORDS.splice(dup, 1, w);
    else WORDS.push(w);
  }
}

function normalizeDe(raw) {
  let s = String(raw || "").replace(/\s+/g, " ").trim().replace(/\s*\(pl\)\s*$/i, "");
  const m = s.match(/^(der|die|das)\s+(.+)$/i);
  if (m) s = m[1].toLowerCase() + " " + m[2].charAt(0).toUpperCase() + m[2].slice(1);
  return s;
}

function detectWord(de) {
  const m = de.match(/^(der|die|das) (\S.*)$/);
  if (m) return { kind: "noun", art: m[1], noun: m[2] };
  if (/^[A-ZÄÖÜ][a-zäöüß-]+$/.test(de)) return { kind: "bare-noun" };
  if (/^(sich )?[a-zäöüß]+(en|ern|eln)$/.test(de)) return { kind: "verb" };
  return { kind: "other" };
}

const ART_NAME = { der: "rodzaj męski", die: "rodzaj żeński", das: "rodzaj nijaki" };

function validateWord(f, editingId) {
  const errs = [];
  if (!f.de) errs.push("Wpisz słówko po niemiecku.");
  if (!f.pl) errs.push("Wpisz tłumaczenie po polsku.");
  if (/[|]/.test(f.de + f.pl + (f.emoji || ""))) errs.push("Znak „|” jest niedozwolony.");
  if (f.de.length > 80 || f.pl.length > 120) errs.push("Za długie – maksymalnie 80 znaków po niemiecku i 120 po polsku.");
  if ((f.emoji || "").length > 8) errs.push("Emoji: wstaw jeden znak (albo zostaw puste).");
  if (!f.cat) errs.push("Wybierz kategorię.");
  if (f.plural && !/^die /.test(f.de)) errs.push("Liczba mnoga zawsze ma rodzajnik „die”.");
  const dup = f.de && WORDS.find((w) => w.de.toLowerCase() === f.de.toLowerCase() && !(editingId && w.own === editingId));
  if (dup) errs.push(`To słówko już jest: „${dup.de} – ${dup.pl}” (${SET_NAMES[dup.set] || dup.set}).`);
  return errs;
}

function slugCat(name) {
  const base = "c_" + name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ł/g, "l").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 24);
  let id = base || "c_kat", k = 2;
  while (VOCAB.some((v) => v.id === id) || (customStore().cats[id] && customStore().cats[id] !== name)) id = base + "_" + k++;
  return id;
}
function ensureCat(id, name) {
  const c = customStore();
  if (VOCAB.some((v) => v.id === id)) return id;
  if (!c.cats[id]) {
    c.cats[id] = name || "Moje słówka";
    if (!S.settings.sets.includes(id)) S.settings.sets.push(id);
  }
  return id;
}

function saveCustomWord(f, editingId) {
  const c = customStore();
  const cat = ensureCat(f.cat, f.catName);
  if (editingId) {
    const cw = c.words.find((x) => x.id === editingId);
    if (cw) {
      const oldKey = cw.de;
      Object.assign(cw, { de: f.de, pl: f.pl, cat, emoji: f.emoji || "", plural: !!f.plural });
      if (oldKey !== f.de && S.srs[oldKey]) { S.srs[f.de] = S.srs[oldKey]; delete S.srs[oldKey]; }
    }
  } else {
    c.words.push({ id: "w" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), de: f.de, pl: f.pl, cat, emoji: f.emoji || "", plural: !!f.plural });
  }
  S.settings.lastCat = cat;
  save();
  rebuildWords();
}

function deleteCustomWord(id) {
  const c = customStore();
  const cw = c.words.find((x) => x.id === id);
  if (!cw) return;
  c.words = c.words.filter((x) => x.id !== id);
  delete S.srs[cw.de];
  for (const k in S.errors) if (S.errors[k].ref && S.errors[k].ref.k === cw.de) delete S.errors[k];
  pruneCats();
  save();
  rebuildWords();
}

function pruneCats() {
  const c = customStore();
  for (const id in c.cats) {
    if (!c.words.some((w) => w.cat === id)) {
      delete c.cats[id];
      S.settings.sets = S.settings.sets.filter((x) => x !== id);
    }
  }
}

/* ---------- eksport / import ---------- */

function exportJSON() {
  const c = customStore();
  return JSON.stringify({
    app: "niemiecki-b2", v: 1,
    words: c.words.map((w) => ({ de: w.de, pl: w.pl, cat: w.cat, catName: SET_NAMES[w.cat] || c.cats[w.cat] || "", emoji: w.emoji || undefined, plural: w.plural || undefined })),
  }, null, 1);
}

function importJSON(text) {
  let data;
  try { data = JSON.parse(text); } catch (e) { return { error: "To nie jest poprawny JSON – wklej cały skopiowany tekst." }; }
  const list = Array.isArray(data) ? data : data && Array.isArray(data.words) ? data.words : null;
  if (!list) return { error: "Brak listy słówek w tym tekście." };
  const c = customStore();
  let added = 0, updated = 0, skipped = 0;
  for (const it of list) {
    if (!it || typeof it.de !== "string" || typeof it.pl !== "string") { skipped++; continue; }
    const f = { de: normalizeDe(it.de), pl: it.pl.trim(), emoji: typeof it.emoji === "string" ? it.emoji.trim() : "", plural: !!it.plural };
    if (!f.de || !f.pl || /[|]/.test(f.de + f.pl + f.emoji) || f.de.length > 80 || f.pl.length > 120 || f.emoji.length > 8) { skipped++; continue; }
    let cat = typeof it.cat === "string" && it.cat ? it.cat : OWN_DEFAULT_CAT;
    if (!VOCAB.some((v) => v.id === cat)) {
      if (!/^c_[a-z0-9_]+$/.test(cat)) cat = slugCat(String(it.catName || cat));
      ensureCat(cat, String(it.catName || c.cats[cat] || "Moje słówka").slice(0, 40));
    }
    f.cat = cat;
    const mine = c.words.find((w) => w.de.toLowerCase() === f.de.toLowerCase());
    if (mine) {
      if (mine.pl !== f.pl || mine.cat !== f.cat || (mine.emoji || "") !== f.emoji) { Object.assign(mine, f); updated++; } else skipped++;
      continue;
    }
    if (WORDS.some((w) => !w.own && w.de.toLowerCase() === f.de.toLowerCase())) { skipped++; continue; }
    c.words.push({ id: "w" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ...f });
    added++;
  }
  save();
  rebuildWords();
  return { added, updated, skipped };
}

function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).then(() => true, () => false);
  }
  return Promise.resolve(false);
}

/* ---------- ekrany ---------- */

function catOptions(selected) {
  const c = customStore();
  const opts = [
    ...Object.keys(c.cats).map((id) => [id, c.cats[id] + " (moje)"]),
    ...VOCAB.map((v) => [v.id, v.name]),
  ];
  if (!c.cats[OWN_DEFAULT_CAT]) opts.unshift([OWN_DEFAULT_CAT, "Moje słówka (nowa)"]);
  opts.push(["__new", "+ Nowa kategoria…"]);
  return opts.map(([id, name]) => h("option", { value: id, selected: id === selected ? "selected" : null }, name));
}

function wordForm(editing, onSaved) {
  const de = germanInput({ placeholder: "np. der Bildschirm" });
  const pl = h("input", { class: "text-input", placeholder: "np. ekran", autocomplete: "off", maxlength: "120" });
  const emoji = h("input", { class: "text-input emoji-input", placeholder: "🙂", autocomplete: "off", maxlength: "8" });
  const plural = { v: !!(editing && editing.plural) };
  const pluralPill = togglePill("liczba mnoga (die …)", () => plural.v, (v) => { plural.v = v; detect(); });
  const sel = h("select", { class: "text-input" }, catOptions(editing ? editing.cat : S.settings.lastCat || OWN_DEFAULT_CAT));
  const newCat = h("input", { class: "text-input", placeholder: "Nazwa nowej kategorii", maxlength: "40", hidden: true });
  const hint = h("div", { class: "word-hint" });
  const err = h("div", { class: "warn", hidden: true });
  if (editing) { de.input.value = editing.de; pl.value = editing.pl; emoji.value = editing.emoji || ""; }

  function detect() {
    const v = normalizeDe(de.input.value);
    hint.innerHTML = "";
    if (!v) return;
    const d = detectWord(v);
    if (d.kind === "noun") hint.append(h("span", { class: `art-tag ${d.art}` }, d.art), ` ${plural.v ? "liczba mnoga" : ART_NAME[d.art]} – rzeczownik „${d.noun}”`);
    else if (d.kind === "bare-noun") {
      hint.append("Rzeczownik bez rodzajnika? Dodaj: ");
      for (const a of ARTICLES) hint.append(h("button", { class: `pill art-${a}`, type: "button", onclick: () => { de.input.value = `${a} ${v}`; detect(); } }, a));
    } else if (d.kind === "verb") hint.append("Czasownik / wyrażenie – bez rodzajnika.");
  }
  de.input.addEventListener("input", detect);
  sel.addEventListener("change", () => { newCat.hidden = sel.value !== "__new"; if (!newCat.hidden) newCat.focus(); });
  detect();

  const saveBtn = h("button", { class: "btn primary", type: "button" }, editing ? "Zapisz zmiany" : "Dodaj słówko");
  saveBtn.addEventListener("click", () => {
    const f = { de: normalizeDe(de.input.value), pl: pl.value.replace(/\s+/g, " ").trim(), emoji: emoji.value.trim(), plural: plural.v, cat: sel.value };
    if (f.cat === "__new") {
      const name = newCat.value.trim();
      f.cat = name ? slugCat(name) : "";
      f.catName = name;
    } else if (f.cat === OWN_DEFAULT_CAT) f.catName = "Moje słówka";
    const errs = validateWord(f, editing && editing.id);
    if (errs.length) { err.hidden = false; err.innerHTML = errs.map(esc).join("<br>"); return; }
    err.hidden = true;
    saveCustomWord(f, editing && editing.id);
    if (typeof haptic === "function") haptic("success");
    toast(editing ? "Zapisano" : `Dodano: ${f.de}`);
    onSaved && onSaved();
  });

  return h("div", { class: "card word-form" },
    h("label", null, "Po niemiecku"), de.input, de.keys, hint, pluralPill,
    h("label", null, "Po polsku"), pl,
    h("label", null, "Kategoria"), sel, newCat,
    h("label", null, "Emoji (opcjonalnie)"), emoji,
    h("div", { class: "muted", style: "font-size:12px;margin-top:4px" }, "Tylko jeśli naprawdę pasuje. Pokaże się dopiero po odpowiedzi, żeby nie zdradzać słówka."),
    err, saveBtn,
    editing ? h("button", { class: "btn ghost", type: "button", onclick: () => ownWordsScreen() }, "Anuluj") : null);
}

function ownWordsScreen(editId) {
  const c = customStore();
  const editing = editId ? c.words.find((w) => w.id === editId) : null;
  show(editing ? "Edytuj słówko" : "Moje słówka", (el) => {
    el.append(wordForm(editing, () => ownWordsScreen()));
    if (editing) return;

    el.append(h("div", { class: "section-title" }, `Dodane przez Ciebie (${c.words.length})`));
    if (!c.words.length) el.append(h("div", { class: "card muted" }, "Jeszcze nic. Dodane słówka pojawią się w fiszkach, quizie, Memory, der/die/das, sprawdzianie i dyktandzie."));
    const byCat = {};
    for (const w of c.words) (byCat[w.cat] = byCat[w.cat] || []).push(w);
    for (const cat of Object.keys(byCat)) {
      el.append(h("div", { class: "card own-list" },
        h("b", null, SET_NAMES[cat] || cat),
        byCat[cat].map((w) => h("div", { class: "own-row" },
          h("div", { class: "own-txt" }, h("b", null, `${w.emoji ? w.emoji + " " : ""}${w.de}`), h("small", null, w.pl)),
          h("button", { class: "pill", onclick: () => ownWordsScreen(w.id) }, "Edytuj"),
          h("button", { class: "pill danger", onclick: () => { if (confirm(`Usunąć „${w.de}”?`)) { deleteCustomWord(w.id); ownWordsScreen(); } } }, "Usuń")))));
    }

    el.append(h("div", { class: "section-title" }, "Przenieś na inne urządzenie"));
    const out = h("textarea", { class: "text-input multi mono", readonly: "readonly", rows: "4" });
    out.value = exportJSON();
    const shareBtn = navigator.share ? h("button", { class: "btn ghost", onclick: () => navigator.share({ title: "Moje słówka – Niemiecki B2", text: exportJSON() }).catch(() => {}) }, "Udostępnij (AirDrop, Wiadomości…)") : null;
    el.append(h("div", { class: "card" },
      h("div", { class: "muted", style: "font-size:13px;margin-bottom:8px" }, "1. Skopiuj albo udostępnij ten tekst.", h("br"), "2. Na drugim urządzeniu otwórz „Moje słówka”, wklej go niżej i dotknij „Importuj”."),
      out,
      h("button", { class: "btn primary", onclick: () => copyText(exportJSON()).then((ok) => { if (!ok) { out.focus(); out.select(); } toast(ok ? "Skopiowano" : "Zaznaczono – skopiuj ręcznie"); }) }, "Kopiuj"),
      shareBtn,
      h("button", { class: "btn ghost", onclick: () => downloadJSON() }, "Zapisz jako plik")));

    const inp = h("textarea", { class: "text-input multi mono", rows: "4", placeholder: "Wklej tutaj skopiowany tekst {\"app\":\"niemiecki-b2\"…}" });
    const res = h("div", { class: "muted", style: "margin-top:8px" });
    const file = h("input", { type: "file", accept: ".json,application/json,text/plain", hidden: true });
    file.addEventListener("change", () => {
      const f = file.files && file.files[0];
      if (!f) return;
      f.text().then((t) => { inp.value = t; });
    });
    el.append(h("div", { class: "card" },
      inp,
      h("button", { class: "btn primary", onclick: () => {
        const r = importJSON(inp.value);
        if (r.error) { res.className = "warn"; res.textContent = r.error; return; }
        toast(`Dodano ${r.added}, zaktualizowano ${r.updated}`);
        ownWordsScreen();
        setTimeout(() => {
          const note = screenEl.querySelector && screenEl.querySelector(".import-note");
          if (note) note.textContent = `Import: dodano ${r.added}, zaktualizowano ${r.updated}, pominięto ${r.skipped}.`;
        }, 0);
      } }, "Importuj"),
      h("button", { class: "btn ghost", onclick: () => file.click() }, "Wczytaj plik…"),
      file, res, h("div", { class: "import-note muted" })));
  });
}

function downloadJSON() {
  try {
    const blob = new Blob([exportJSON()], { type: "application/json" });
    const a = h("a", { href: URL.createObjectURL(blob), download: "moje-slowka.json" });
    document.body.append(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  } catch (e) { toast("Nie udało się zapisać pliku"); }
}

rebuildWords();

EXTRA_MODES.push({
  id: "own", name: "Moje słówka", badge: "+", color: "#a5b4fc", run: () => ownWordsScreen(),
  desc: () => (customStore().words.length ? `${customStore().words.length} dodanych` : "Dodaj własne słówka"),
});
