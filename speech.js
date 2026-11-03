"use strict";

/* ================= Rozpoznawanie mowy (wspólne) ================= */

const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent || "") || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const IS_STANDALONE = navigator.standalone === true || (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches);

function speechSupport() {
  if (!SR) {
    return {
      ok: false,
      msg: IS_IOS
        ? (IS_STANDALONE
          ? "W aplikacji otwartej z ikonki iOS nie udostępnia rozpoznawania mowy. Otwórz grę w Safari (link: bujnic.github.io/niemiecki-gra) – tam mikrofon działa."
          : "Ta przeglądarka nie obsługuje rozpoznawania mowy. Na iPhonie użyj Safari i włącz Siri oraz dyktowanie (Ustawienia → Siri).")
        : "Ta przeglądarka nie obsługuje rozpoznawania mowy. Na Macu użyj Chrome albo Safari (Firefox nie ma tej funkcji).",
    };
  }
  if (location.protocol === "file:") {
    return { ok: true, warn: "Plik otwarty z dysku – przeglądarka może zablokować mikrofon. Jeśli nie działa, otwórz grę przez link w internecie." };
  }
  if (IS_IOS && IS_STANDALONE) {
    return { ok: true, warn: "Z ikonki na ekranie początkowym iOS czasem blokuje mikrofon. Jeśli nie działa – otwórz grę w Safari." };
  }
  return { ok: true };
}

function speechErrorMsg(code) {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return IS_IOS && IS_STANDALONE
        ? "iOS nie pozwala na mikrofon w aplikacji z ikonki. Otwórz grę w Safari i spróbuj tam."
        : "Brak dostępu do mikrofonu. Zezwól na mikrofon (Safari: aA → Ustawienia witryny → Mikrofon; Chrome: ikona kłódki przy adresie). Na iPhonie włącz też Siri i dyktowanie.";
    case "no-speech": return "Nic nie usłyszałem – mów trochę głośniej i spróbuj jeszcze raz.";
    case "audio-capture": return "Nie znaleziono mikrofonu.";
    case "network": return "Rozpoznawanie mowy potrzebuje internetu – sprawdź połączenie.";
    case "language-not-supported": return "Rozpoznawanie mowy nie obsługuje tu niemieckiego.";
    case "aborted": return "";
    default: return "Rozpoznawanie mowy nie zadziałało (" + code + "). Spróbuj jeszcze raz albo wpisz odpowiedź.";
  }
}

/*
  createRecognizer({ onUpdate(final, interim), onEnd(final), onError(msg), maxMs })
  start() musi być wywołane z dotknięcia (iOS).
*/
function createRecognizer(opts) {
  let rec = null, listening = false, finalText = "", timer = null, gotError = false;
  const stopTimer = () => { clearTimeout(timer); timer = null; };
  function start() {
    if (!SR) { opts.onError && opts.onError(speechSupport().msg); return false; }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    finalText = "";
    gotError = false;
    rec = new SR();
    rec.lang = "de-DE";
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      let fin = "", interim = "";
      for (let i = 0; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) fin += t + " ";
        else interim += t + " ";
      }
      finalText = fin.trim();
      opts.onUpdate && opts.onUpdate(finalText, interim.trim());
    };
    rec.onerror = (e) => {
      gotError = true;
      const msg = speechErrorMsg(e.error);
      if (msg) opts.onError && opts.onError(msg, e.error);
    };
    rec.onend = () => {
      listening = false;
      stopTimer();
      opts.onEnd && opts.onEnd(finalText, gotError);
    };
    try {
      rec.start();
      listening = true;
      timer = setTimeout(stop, opts.maxMs || 60000);
      return true;
    } catch (err) {
      opts.onError && opts.onError(speechErrorMsg("start"));
      return false;
    }
  }
  function stop() {
    stopTimer();
    if (rec && listening) { try { rec.stop(); } catch (e) { /* */ } }
  }
  function abort() {
    stopTimer();
    if (rec) { rec.onend = null; try { rec.abort(); } catch (e) { /* */ } }
    listening = false;
  }
  return { start, stop, abort, get listening() { return listening; }, get text() { return finalText; } };
}

/* Przycisk mikrofonu z obsługą stanu + pole transkrypcji. */
function micWidget({ onDone, maxMs, allowTyping = true, typingLabel = "Wolę wpisać" }) {
  const sup = speechSupport();
  const live = h("div", { class: "transcript muted" }, sup.ok ? "Dotknij mikrofonu i mów po niemiecku." : "");
  const msg = h("div", { class: sup.ok ? (sup.warn ? "info-box" : "") : "warn", hidden: !(sup.msg || sup.warn) }, sup.msg || sup.warn || "");
  const micLabel = h("span", { class: "mic-label" }, "Mów");
  const mic = h("button", { class: "mic-btn", "aria-label": "Mikrofon", hidden: !sup.ok }, h("span", { class: "mic-dot" }), micLabel);
  const typing = germanInput({ multiline: true, placeholder: "Wpisz odpowiedź po niemiecku" });
  const typeWrap = h("div", { hidden: sup.ok }, typing.input, typing.keys, h("button", { class: "btn primary", onclick: () => { if (typing.input.value.trim()) onDone(typing.input.value.trim(), "typed"); } }, "Gotowe"));
  const typeToggle = allowTyping && sup.ok ? h("button", { class: "btn small ghost", style: "margin-top:10px", onclick: () => { typeWrap.hidden = false; typeToggle.remove(); r.abort(); setState(false); } }, typingLabel) : null;
  let lastText = "";
  const r = createRecognizer({
    maxMs,
    onUpdate: (fin, interim) => {
      lastText = (fin + " " + interim).trim();
      live.classList.remove("muted");
      live.innerHTML = `${esc(fin)} <span class="interim">${esc(interim)}</span>`;
    },
    onError: (m, code) => {
      msg.hidden = false;
      msg.className = "warn";
      msg.textContent = m;
      if (code === "not-allowed" || code === "service-not-allowed") { typeWrap.hidden = false; if (typeToggle) typeToggle.remove(); }
    },
    onEnd: (fin) => {
      setState(false);
      const text = (fin || lastText).trim();
      if (text) onDone(text, "spoken");
    },
  });
  function setState(on) {
    mic.classList.toggle("on", on);
    micLabel.textContent = on ? "Stop" : "Mów";
  }
  mic.addEventListener("click", () => {
    if (r.listening) { r.stop(); return; }
    msg.hidden = !sup.warn;
    if (sup.warn) { msg.className = "info-box"; msg.textContent = sup.warn; }
    lastText = "";
    live.textContent = "Słucham…";
    if (r.start()) setState(true);
  });
  const el = h("div", { class: "mic-wrap" }, msg, mic, live, typeToggle, typeWrap);
  return { el, abort: () => r.abort() };
}

/* ================= Mówienie ================= */

RENDERERS.speak = (el, step, ctx) => {
  const target = step.text;
  const listen = h("button", { class: "btn small ghost", onclick: () => speak(target, S.settings.slowTTS ? 0.65 : 0.9) }, "▶ Posłuchaj wzoru");
  const w = micWidget({
    maxMs: 45000,
    typingLabel: "Nie mogę mówić – wpiszę",
    onDone: (text, how) => {
      w.abort();
      const d = wordDiff(text, target);
      const missed = d.total - d.exact - d.typo;
      const pct = Math.max(0, Math.round(((d.exact + d.typo * 0.75) / Math.max(1, d.total)) * 100) - Math.min(20, d.extra * 3));
      S.stats.speakBest = Math.max(S.stats.speakBest || 0, pct);
      S.stats.speakCount = (S.stats.speakCount || 0) + 1;
      save();
      w.el.remove();
      ctx.done({
        ok: pct >= 80,
        given: text,
        expected: null,
        explain: `<div class="score-line">Wynik: <b>${pct}%</b> · trafione słowa: ${d.exact + d.typo}/${d.total}${missed ? ` · pominięte: ${missed}` : ""}</div>` +
          `<div class="diff words">${d.html}</div><div class="muted" style="font-size:13px">zielone = trafione · żółte = prawie · podkreślone = nie usłyszałem · przekreślone = dodatkowe${how === "typed" ? " · (wpisane)" : ""}</div>`,
        after: `<i>${esc(target)}</i>`,
      });
    },
  });
  el.append(
    h("div", { class: "prompt pop" },
      h("div", { class: "hint" }, "Przeczytaj na głos"),
      h("div", { class: "sent", style: "margin-top:8px" }, target),
      h("div", { style: "margin-top:12px" }, listen)),
    w.el);
  cleanup = (() => { const prev = cleanup; return () => { w.abort(); prev && prev(); }; })();
};

const speakStep = (text) => ({ kind: "speak", text, xp: 15 });

const SPEAK_SOURCES = [
  { id: "interview", name: "Odpowiedzi z rozmowy (zdanie po zdaniu)" },
  { id: "sentences", name: "Zdania z ćwiczeń" },
  { id: "words", name: "Słówka" },
];

function speakItems(n) {
  const src = S.settings.speakSource || "interview";
  if (src === "words") return shuffle(activeWords().map((w) => w.de)).slice(0, n);
  if (src === "sentences") return shuffle(SENTENCES).slice(0, n);
  const start = Math.floor(Math.random() * TEXTS.length);
  const out = [];
  for (let k = 0; k < TEXTS.length && out.length < n; k++) out.push(...plainSentences(TEXTS[(start + k) % TEXTS.length].a));
  return out.slice(0, n);
}
function speakAvailable() {
  const src = S.settings.speakSource || "interview";
  return src === "words" ? activeWords().length : src === "sentences" ? SENTENCES.length : INTERVIEW_SENTENCES().length;
}

function speakSetup() {
  const sup = speechSupport();
  setupScreen({
    id: "speak", title: "Mówienie",
    info: () => h("div", null,
      "Czytasz na głos, a telefon sprawdza, które słowa zrozumiał. Możesz najpierw posłuchać wzoru.",
      !sup.ok ? h("div", { class: "warn" }, sup.msg, " Możesz ćwiczyć, wpisując tekst.") : sup.warn ? h("div", { class: "info-box" }, sup.warn) : null,
      h("div", { class: "muted", style: "font-size:13px;margin-top:8px" }, "Rozpoznawanie mowy działa przez internet (usługa Apple/Google).")),
    count: { label: "Ile zdań", presets: [3, 5, 10, 0], def: 5, available: speakAvailable },
    options: (refresh) => [h("div", { class: "section-title" }, "Co czytać"), sourcePills("speakSource", SPEAK_SOURCES, "interview", refresh)],
    buttons: [{ label: (n) => `Start (${n})`, run: (n) => runSession({ key: "speak", title: "Mówienie", steps: speakItems(n).map(speakStep), back: speakSetup, again: speakSetup }) }],
  });
}

EXTRA_MODES.push({ id: "speak", name: "Mówienie", badge: "◉", color: "#86efac", run: () => speakSetup(), desc: "Czytaj na głos – telefon sprawdza" });
