// ======================
// ① 景品リスト
// ======================
// id: 在庫テーブルと紐付けるためのキー
const prizes = [
  { id: "ssr", name: "体験会＠野尻湖＋ルアー＋ステッカー", rarity: "", weight: 1, },
  { id: "a",   name: "体験会＠光進丸＋ステッカー", rarity: "", weight: 10, },
  { id: "b",   name: "ルアー＋ステッカー",   rarity: "", weight: 15 },
  { id: "c",   name: "ステッカー",     rarity: "", weight: 15 },
  { id: "d",   name: "ボールペン",      rarity: "", weight: 59, },
];

// ======================
// ② 在庫の初期値（デモ用）
//    将来はここを Firebase の値で上書きするイメージ
// ======================
const DEFAULT_INVENTORY = {
  ssr: 12,  // 数量
  a:   10,　// 数量
  b:   30,　// 数量
  c:   200, // 数量
  d:   200, // 数量
};

const STORAGE_KEY_INVENTORY = "yarnable_gacha_inventory_v1";
const STORAGE_KEY_PLAYED    = "yarnable_gacha_played_v1";

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
    // 足りないキーがあれば補完（将来、景品追加したとき用）
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

//★ 1回プレイ済みフラグ
//★ function isAlreadyPlayed() {
//★  return localStorage.getItem(STORAGE_KEY_PLAYED) === "1"; // ← 常に "まだプレイしていない"
//★ }
//★ function setPlayed() {
//★   localStorage.setItem(STORAGE_KEY_PLAYED, "1"); // 何もしない
//★ }

// ======================
// ③ 重み付きランダム抽選（在庫0の景品は除外）
// ======================
function rollPrize(inventory) {
  // まず在庫がある景品だけ
  let available = prizes.filter(p => (inventory[p.id] || 0) > 0);

  // ★特賞を除外するモードの場合はここで弾く
  if (excludeHighPrizes) {
    available = available.filter(p => p.id !== "ssr" && p.id !== "a");
  }

  if (available.length === 0) {
    return null; // 全部在庫切れ
  }

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
const btn      = document.getElementById("rollButton");
const statusEl = document.getElementById("status");
const invEl    = document.getElementById("inventory");

let inventory = loadInventory();

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

//★ すでにこの端末で1回使われていたらボタン無効化
//★ if (isAlreadyPlayed()) {
//★   btn.disabled = true;
//★  statusEl.textContent = "この端末ではすでに1回プレイ済みです。";
//★ }

// ★追加：直前に当たった景品を覚えておく
let lastPrize = null;

// ★追加：特賞・A賞を今後の抽選から外すフラグ
let excludeHighPrizes = false;

// ガチャボタン押下
btn.addEventListener("click", () => {
// ======================
// 在庫リセットボタン
// ======================
const resetBtn = document.getElementById("resetButton");

resetBtn.addEventListener("click", () => {
  // 在庫を初期値に戻す
  inventory = clone(DEFAULT_INVENTORY);
  saveInventory(inventory);
  renderInventory();

  // ボタンの状態リセット（何回でも引ける仕様なら触らなくてOK）
  btn.disabled = false;
  statusEl.textContent = "在庫を初期状態に戻しました。";

  // もし「1回制限」を消していないなら、プレイ済みフラグも消す
  // localStorage.removeItem(STORAGE_KEY_PLAYED);
});




// ======================
// 特賞・A賞を辞退して別賞だけを狙うボタン
// ======================
const rerollBtn = document.getElementById("rerollButton");

rerollBtn.addEventListener("click", () => {
  // 直前に何も当たっていない場合
  if (!lastPrize) {
    statusEl.textContent = "直前に当選した景品がありません。ガチャを回してから押してください。";
    return;
  }

  // 対象は「特賞(ssr)」と「A賞(a)」だけ
  if (lastPrize.id !== "ssr" && lastPrize.id !== "a") {
    statusEl.textContent = "このボタンは、特賞またはA賞を辞退するときだけ使えます。";
    return;
  }

  // 在庫を元に戻す
  inventory[lastPrize.id] = (inventory[lastPrize.id] || 0) + 1;
  saveInventory(inventory);
  renderInventory();

  // 今後の抽選から特賞・A賞を外す
  excludeHighPrizes = true;

  statusEl.textContent = `${lastPrize.name} を辞退しました。今後は B賞・C賞・D賞のみが抽選されます。`;

  // 辞退処理が終わったので、最後の景品情報はクリア
  lastPrize = null;
});




//★  if (isAlreadyPlayed()) {
//★    // 念のため二重チェック
//★    statusEl.textContent = "この端末ではすでに1回プレイ済みです。";
//★    btn.disabled = true;
//★    return;
//★  }



  // 在庫切れチェック（全景品0ならエラー）
  const anyStockLeft = prizes.some(p => (inventory[p.id] || 0) > 0);
  if (!anyStockLeft) {
    statusEl.textContent = "すべての景品が在庫切れです。";
    btn.disabled = true;
    return;
  }

  btn.disabled = true;
  statusEl.innerHTML = `
    <div class="spinner"></div>
    <div>抽選中...</div>
  `;

  setTimeout(() => {
    const prize = rollPrize(inventory);
    if (!prize) {
      statusEl.textContent = "すべての景品が在庫切れです。";
      btn.disabled = true;
      return;
    }

    // 在庫を1つ減らす
    inventory[prize.id] = (inventory[prize.id] || 0) - 1;
    saveInventory(inventory);
    renderInventory();



    // この端末では1回のみ
//★    setPlayed();

statusEl.innerHTML = `
  <div class="prize-name">${prize.name}</div>

  ${prize.image ? `<img src="${prize.image}" style="margin-top:5px;max-width:40%;border-radius:12px;">` : ""}
`;


    btn.disabled = true;
  }, 1500);
});



