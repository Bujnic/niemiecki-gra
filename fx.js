"use strict";

/* ================= Efekty: wibracje, dźwięki, konfetti ================= */

const motionOK = () =>
  S.settings.motion !== false && !(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

function applyMotion() {
  document.body.classList.toggle("no-motion", S.settings.motion === false);
}

/* --- Wibracje ---
   Android/Chrome: navigator.vibrate.
   iOS 17.4+/18 (Safari nie ma vibrate): kliknięcie <label> z <input type="checkbox" switch>
   wywołuje systemowy „tik” – działa tylko w obsłudze dotknięcia. */
let hapticLabel = null;
function iosHapticEl() {
  if (hapticLabel) return hapticLabel;
  const input = document.createElement("input");
  input.type = "checkbox";
  input.setAttribute("switch", "");
  input.id = "haptic-switch";
  input.tabIndex = -1;
  input.setAttribute("aria-hidden", "true");
  hapticLabel = document.createElement("label");
  hapticLabel.htmlFor = "haptic-switch";
  hapticLabel.className = "haptic-hidden";
  hapticLabel.setAttribute("aria-hidden", "true");
  hapticLabel.append(input);
  document.body.append(hapticLabel);
  return hapticLabel;
}
const VIBRATE = { light: 8, success: [12, 40, 12], error: [35, 30, 35] };
function haptic(kind = "light") {
  if (S.settings.haptics === false) return;
  try {
    if (navigator.vibrate) { navigator.vibrate(VIBRATE[kind] || 10); return; }
    if (IS_IOS) iosHapticEl().click();
  } catch (e) { /* brak */ }
}

/* --- Dźwięki (WebAudio, ciche, domyślnie wyłączone) --- */
let audioCtx = null;
const SFX = {
  ok: [[660, 0, 0.09], [990, 0.07, 0.12]],
  bad: [[220, 0, 0.18, "triangle"]],
  flip: [[520, 0, 0.05]],
  tick: [[1200, 0, 0.03]],
  badge: [[660, 0, 0.1], [880, 0.09, 0.1], [1320, 0.18, 0.2]],
  combo: [[784, 0, 0.08], [1047, 0.07, 0.08], [1319, 0.14, 0.14]],
};
function sfx(kind) {
  if (!S.settings.sound) return;
  const notes = SFX[kind];
  if (!notes) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const t0 = audioCtx.currentTime;
    for (const [f, at, dur, type] of notes) {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = type || "sine";
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0 + at);
      g.gain.exponentialRampToValueAtTime(0.07, t0 + at + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + dur);
      o.connect(g).connect(audioCtx.destination);
      o.start(t0 + at);
      o.stop(t0 + at + dur + 0.02);
    }
  } catch (e) { /* brak audio */ }
}

/* --- Konfetti (tylko transform/opacity) --- */
const CONFETTI_COLORS = ["#f5b400", "#22c55e", "#3b82f6", "#ef4444", "#a855f7", "#f97316"];
function confetti(n = 36) {
  if (!motionOK()) return;
  const layer = h("div", { class: "confetti", "aria-hidden": "true" });
  for (let k = 0; k < n; k++) {
    const x = (Math.random() - 0.5) * 340;
    const y = -(160 + Math.random() * 260);
    const r = (Math.random() - 0.5) * 900;
    const p = h("i", { style: `background:${pick(CONFETTI_COLORS)};left:${45 + Math.random() * 10}%;--x:${x.toFixed(0)}px;--y:${y.toFixed(0)}px;--r:${r.toFixed(0)}deg;animation-delay:${(Math.random() * 0.12).toFixed(2)}s` });
    layer.append(p);
  }
  document.body.append(layer);
  setTimeout(() => layer.remove(), 1600);
}

function celebrate(label) {
  confetti();
  sfx("combo");
  haptic("success");
  if (label) {
    const b = h("div", { class: "combo-pop" }, label);
    document.body.append(b);
    setTimeout(() => b.remove(), 1200);
  }
}

/* --- Licznik XP --- */
let xpShown = null, xpRaf = null;
function tickXP() {
  const chip = $("#xpChip");
  if (!chip) return;
  const target = S.xp;
  if (xpShown == null || !motionOK() || target < xpShown || typeof requestAnimationFrame !== "function") {
    xpShown = target;
    chip.textContent = `${target} XP`;
    return;
  }
  if (target === xpShown) return;
  chip.classList.remove("bump");
  void chip.offsetWidth;
  chip.classList.add("bump");
  const from = xpShown, start = performance.now(), dur = 600;
  cancelAnimationFrame(xpRaf);
  const step = (now) => {
    const t = Math.min(1, (now - start) / dur);
    xpShown = Math.round(from + (target - from) * (1 - Math.pow(1 - t, 3)));
    chip.textContent = `${xpShown} XP`;
    if (t < 1) xpRaf = requestAnimationFrame(step);
  };
  xpRaf = requestAnimationFrame(step);
}

document.addEventListener("DOMContentLoaded", applyMotion);
