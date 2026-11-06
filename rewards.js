"use strict";

/* ================= Ukryte nagrody za poziomy =================
   Co 10 poziomów czeka zakryty prezent. Co jest w środku, widać dopiero,
   gdy dojdziesz do tego poziomu i go otworzysz.
   Poziom liczy się z XP (level() w app.js): poziom L wymaga (L-1)² · 50 XP,
   a dobra odpowiedź daje ok. 10 XP. */

const REWARDS = {
  10: { icon: "🍦", name: "Lody Izka" },
  20: { icon: "🍫", name: "Kinderki" },
  30: { icon: "🍦", name: "3× Lody Izka" },
  40: { icon: "🍨", name: "Lód Oskar" },
  50: { icon: "🍔", name: "Maczek" },
  60: { icon: "🧹", name: "Pakiet: cały dzień sprzątania" },
  70: { icon: "🍣", name: "Sushi" },
};
const REWARD_LEVELS = Object.keys(REWARDS).map(Number);
const XP_PER_ANSWER = 10;

function rewardsState() {
  S.rewards = S.rewards || {};
  S.rewards.opened = S.rewards.opened || {};
  S.rewards.claimed = S.rewards.claimed || {};
  return S.rewards;
}
const rewardOpened = (lvl) => rewardsState().opened[lvl];
const rewardClaimed = (lvl) => rewardsState().claimed[lvl];
const rewardUnlocked = (lvl) => level() >= lvl;
const rewardsWaiting = () => REWARD_LEVELS.filter((l) => rewardUnlocked(l) && !rewardClaimed(l));
const nextReward = () => REWARD_LEVELS.find((l) => !rewardUnlocked(l));
const fmtNum = (n) => n.toLocaleString("pl-PL");

/* Powiadomienie, gdy XP przeskoczy próg nagrody. */
const addXPBeforeRewards = addXP;
addXP = function (n) {
  const before = level();
  addXPBeforeRewards(n);
  const after = level();
  const hit = REWARD_LEVELS.filter((l) => before < l && after >= l);
  if (hit.length) setTimeout(() => rewardPop(hit[hit.length - 1]), 900);
};

function rewardPop(lvl) {
  if (typeof haptic === "function") haptic("success");
  if (typeof confetti === "function") confetti(48);
  const pop = h("div", { class: "badge-pop reward-pop", onclick: () => { close(); rewardsScreen(); } },
    h("div", { class: "badge-pop-icon gift-wiggle" }, "🎁"),
    h("div", null,
      h("div", { class: "badge-pop-k" }, `Poziom ${lvl}!`),
      h("b", null, "Ukryta nagroda czeka. Stuknij!")));
  document.body.append(pop);
  const t = setTimeout(close, 5000);
  function close() {
    clearTimeout(t);
    if (!pop.parentNode) return;
    pop.classList.add("out");
    setTimeout(() => pop.remove(), 280);
  }
}

/* Otwieranie prezentu: pudełko się trzęsie, wybucha i pokazuje nagrodę. */
function openGift(lvl) {
  if (!rewardUnlocked(lvl)) return;
  const r = REWARDS[lvl];
  const first = !rewardOpened(lvl);
  const box = h("div", { class: "gift-box" }, "🎁");
  const prize = h("div", { class: "gift-prize", hidden: true },
    h("div", { class: "gift-prize-icon" }, r.icon),
    h("div", { class: "gift-prize-k" }, `Nagroda za poziom ${lvl}`),
    h("div", { class: "gift-prize-name" }, r.name));
  const btns = h("div", { class: "gift-btns", hidden: true },
    rewardClaimed(lvl)
      ? h("div", { class: "muted" }, `Odebrane ${new Date(rewardClaimed(lvl)).toLocaleDateString("pl-PL")}`)
      : h("button", { class: "btn green", onclick: () => claimReward(lvl, overlay) }, "Odbieram!"),
    h("button", { class: "btn ghost", onclick: () => closeOverlay() }, rewardClaimed(lvl) ? "Zamknij" : "Później"));
  const overlay = h("div", { class: "gift-overlay" }, box, prize, btns);
  document.body.append(overlay);

  const reveal = () => {
    box.remove();
    prize.hidden = false;
    btns.hidden = false;
    if (first) {
      rewardsState().opened[lvl] = Date.now();
      save();
      if (typeof celebrate === "function") celebrate();
    }
  };
  if (first && typeof motionOK === "function" && motionOK()) {
    if (typeof haptic === "function") haptic("light");
    box.classList.add("shaking");
    setTimeout(() => { box.classList.add("burst"); if (typeof haptic === "function") haptic("success"); }, 1300);
    setTimeout(reveal, 1650);
  } else reveal();

  function closeOverlay() {
    overlay.classList.add("out");
    setTimeout(() => overlay.remove(), 250);
    rewardsScreen();
  }
  overlay.closeGift = closeOverlay;
}

function claimReward(lvl, overlay) {
  if (!rewardUnlocked(lvl) || rewardClaimed(lvl)) return;
  if (!confirm(`Odbierasz: ${REWARDS[lvl].icon} ${REWARDS[lvl].name}\n\nOdbierz ją naprawdę. Tego nie da się cofnąć.`)) return;
  rewardsState().claimed[lvl] = Date.now();
  save();
  if (typeof celebrate === "function") celebrate("Smacznego! 🎉");
  if (overlay && overlay.closeGift) overlay.closeGift();
  else rewardsScreen();
}

function rewardsScreen() {
  rewardsState();
  const lvl = level();
  const next = nextReward();
  show("Nagrody", (el) => {
    if (next) {
      const from = levelXP(lvl), to = levelXP(next);
      const pct = Math.round(clamp((S.xp - from) / (to - from), 0, 1) * 100);
      const left = to - S.xp;
      el.append(h("div", { class: "card center reward-head" },
        h("div", { class: "gift-big gift-wiggle" }, "🎁"),
        h("div", { class: "reward-next" }, `Niespodzianka na poziomie ${next}`),
        h("div", { class: "bar" }, h("i", { style: `width:${pct}%` })),
        h("small", { class: "muted" }, `Jesteś na poziomie ${lvl}. Brakuje ${fmtNum(left)} XP, czyli ok. ${fmtNum(Math.ceil(left / XP_PER_ANSWER))} dobrych odpowiedzi`)));
    } else {
      el.append(h("div", { class: "card center reward-head" },
        h("div", { class: "gift-big" }, "🏆"),
        h("div", { class: "reward-next" }, "Wszystkie nagrody odblokowane!")));
    }

    el.append(h("div", { class: "reward-list" }, REWARD_LEVELS.map((l) => {
      const r = REWARDS[l];
      const claimed = rewardClaimed(l);
      const opened = rewardOpened(l);
      const open = rewardUnlocked(l);
      const state = claimed ? "claimed" : opened ? "ready" : open ? "waiting" : "locked";
      const need = levelXP(l);
      return h("button", {
        class: `reward-row ${state}`,
        onclick: () => (open ? openGift(l) : toast(`Ta nagroda odkryje się na poziomie ${l}`)),
      },
        h("div", { class: "reward-lvl" }, h("small", null, "poz."), h("b", null, l)),
        h("div", { class: "reward-icon" }, opened || claimed ? r.icon : open ? "🎁" : "❔"),
        h("div", { class: "reward-body" },
          h("b", null, opened || claimed ? r.name : open ? "Prezent do otwarcia!" : "Ukryta nagroda"),
          h("small", null,
            claimed ? `Odebrane ${new Date(claimed).toLocaleDateString("pl-PL")}`
              : opened ? "Stuknij, żeby odebrać"
                : open ? "Stuknij, żeby zobaczyć, co jest w środku"
                  : `${fmtNum(need)} XP · ok. ${fmtNum(Math.round(need / XP_PER_ANSWER))} dobrych odpowiedzi`)),
        h("span", { class: "reward-mark", "aria-hidden": "true" }, claimed ? "✓" : open ? "›" : "🔒"));
    })));

    el.append(h("p", { class: "muted reward-note" },
      "Nie wiadomo, co jest w prezencie, dopóki do niego nie dojdziesz. Nagrodę odbierasz w prawdziwym życiu."));
  });
}

EXTRA_MODES.push({
  id: "rewards", name: "Nagrody", badge: "🎁", color: "#fca5a5",
  run: () => rewardsScreen(),
  count: () => rewardsWaiting().length,
  desc: () => {
    const n = rewardsWaiting().length;
    if (n) return `${n} ${n === 1 ? "nagroda czeka" : n < 5 ? "nagrody czekają" : "nagród czeka"}!`;
    const next = nextReward();
    return next ? `Niespodzianka na poziomie ${next}` : "Wszystko zdobyte";
  },
});
