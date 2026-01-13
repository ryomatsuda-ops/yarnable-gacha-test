// ======================
// ① 景品リスト（画像なし）
// ======================
const prizes = [
  { id: "ssr", name: "特賞：Yarnable体験会＠野尻湖＋ルアー＋ステッカー", rarity: "", weight: 1 },
  { id: "a",   name: "A賞：Yarnable体験会＠光進丸2day＋ステッカー",     rarity: "", weight: 4 },
  { id: "b",   name: "B賞：ロイヤルブルー社製ルアー＋ステッカー",       rarity: "", weight: 15 },
  { id: "c",   name: "C賞：タオル＋ステッカー",                         rarity: "", weight: 30 },
  { id: "d",   name: "D賞：ステッカー",                                 rarity: "", weight: 50 },
];

// ======================
// ② 在庫の初期値（デモ用）
// ======================
const DEFAULT_INVENTORY = {
  ssr: 5,
  a:   5,
  b:   40,
  c:   50,
  d:   100,
};

const STORAGE_KEY_INVENTORY = "yarnable_gacha_inventory_v1";

// 深いコピー用のユーティリティ
function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// ローカルストレージから在庫を読み込み
function loadInventory() {
  const raw = localStorage.getItem(STORAGE_KEY_INVENTORY);
  if (!raw) return clone(DEFAULT_INVENTORY);
  try {
    const parsed = JSON.parse(raw);
    const inv = clone(DEFAULT_INVENTORY);
    for (const key of Object.keys(parsed)) {
      if (key in inv) inv[key] = parsed[key];
    }
    return inv;
  } catch (e) {
    console.error("在庫データが壊れていたので初期化します", e);
    return clone(DEFAULT_INVENTORY);
  }
}

// 在庫を保存
function saveInventory(inv) {
  localStorage.setItem(STORAGE_KEY_INVENTORY, JSON.stringify(inv));
}

// ======================
// ③ 重み付きランダム抽選（在庫0の景品は除外）
// ======================
function rollPrize(inventory) {
  let available = prizes.filter(p => (inventory[p.id] || 0) > 0);

  if (excludeHighPrizes) {
    available = available.filter(p => p.id !== "ssr" && p.id !== "a");
  }

  if (available.length === 0) return null;

  const totalWeight = available.reduce((sum, p) => sum + p.weight, 0);
  let r = Math.random() * totalWeight;

  for (const p of available) {
    if (r < p.weight) return p;
    r -= p.weight;
  }
  return available[available.length - 1];
}

// ======================
// ④ 画面制御
// ======================
const btn       = document.getElementById("rollButton");
const resetBtn  = document.getElementById("resetButton");
const rerollBtn = document.getElementById("rerollButton");
const statusEl  = document.getElementById("status");
const invEl     = document.getElementById("inventory");

let inventory = loadInventory();

// ★直前に当たった景品を覚えておく
let lastPrize = null;

// ★特賞・A賞を今後の抽選から外すフラグ
let excludeHighPrizes = false;

// 在庫表示
function renderInventory() {
  invEl.innerHTML = "";
  prizes.forEach(p => {
    const row = document.createElement("div");
    row.className = "inventory-item";
    const left = document.createElement("div");
    left.textContent = `${p.rarity} ${p.name}`;
    const right = document.createElement("div");
    const count = inventory[p.id] ?? 0;
    right.textContent = `残り: ${count}`;
    row.appendChild(left);
    row.appendChild(right);
    invEl.appendChild(row);
  });
}

// 初期表示
renderInventory();

// ======================
// 在庫リセットボタン（※ガチャの外で1回だけ登録）
// ======================
resetBtn.addEventListener("click", () => {
  inventory = clone(DEFAULT_INVENTORY);
  saveInventory(inventory);
  renderInventory();

  // 辞退モードも解除して通常に戻す（好みで消してOK）
  excludeHighPrizes = false;
  lastPrize = null;

  btn.disabled = false;
  statusEl.textContent = "在庫を初期状態に戻しました。";
});

// ======================
// 特賞・A賞を辞退して別賞だけを狙うボタン（※外で1回だけ登録）
// ======================
rerollBtn.addEventListener("click", () => {
  if (!lastPrize) {
    statusEl.textContent = "直前に当選した景品がありません。ガチャを回してから押してください。";
    return;
  }

  if (lastPrize.id !== "ssr" && lastPrize.id !== "a") {
    statusEl.textContent = "このボタンは、特賞またはA賞を辞退するときだけ使えます。";
    return;
  }

  // 在庫を元に戻す
  inventory[lastPrize.id] = (inventory[lastPrize.id] || 0) + 1;
  saveInventory(inventory);
  renderInventory();

  // 今後はB/C/Dのみ
  excludeHighPrizes = true;

  statusEl.textContent = `${lastPrize.name} を辞退しました。今後は B賞・C賞・D賞のみが抽選されます。`;

  lastPrize = null;
  btn.disabled = false;
});

// ======================
// ガチャボタン押下
// ======================
btn.addEventListener("click", () => {
  const anyStockLeft = prizes.some(p => (inventory[p.id] || 0) > 0);
  if (!anyStockLeft) {
    statusEl.textContent = "すべての景品が在庫切れです。";
    btn.disabled = false;
    return;
  }

  btn.disabled = false;
  statusEl.innerHTML = `
    <div class="spinner"></div>
    <div>抽選中...</div>
  `;

  setTimeout(() => {
    const prize = rollPrize(inventory);
    if (!prize) {
      statusEl.textContent = "すべての景品が在庫切れです。";
      btn.disabled = false;
      return;
    }

    // 在庫を1つ減らす
    inventory[prize.id] = (inventory[prize.id] || 0) - 1;
    saveInventory(inventory);
    renderInventory();

    // 直前当選を記録（辞退用）
    lastPrize = prize;

    statusEl.innerHTML = `
      <div class="result">おめでとうございます！！</div>
      <div class="prize-name">${prize.name}</div>
    `;

    // ★ここ重要：次も回せるように戻す
    btn.disabled = false;
  }, 1500);
});


