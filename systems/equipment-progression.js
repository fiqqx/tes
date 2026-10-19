/*
 * Aetheria Equipment Progression — standalone browser / Node prototype.
 * Semua angka merupakan balancing Aetheria, bukan data resmi Ragnarok X.
 * Produksi: jalankan transaksi dan RNG di server; jangan percaya hasil dari klien.
 */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.EquipmentProgression = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const TYPES = Object.freeze(['Weapon', 'Armor', 'Accessory']);
  const REFINE_SUCCESS = Object.freeze([1, 1, 1, 1, .50, .40, .30, .25, .20, .15, .12, .10, .08, .06, .05]);
  const MVP_WEIGHTS = Object.freeze({ damageDealt: .45, damageTaken: .25, healingDone: .20, firstHit: .07, lastHit: .03 });
  const ENCHANT_CITIES = Object.freeze({
    Lumina: Object.freeze({ material: 'luminaStone', pool: Object.freeze([
      ...['STR', 'DEX', 'AGI', 'VIT', 'INT', 'LUK'].map(stat => Object.freeze({ stat, min: 1, max: 12, step: 1, weight: 1 }))
    ]) }),
    Emberfall: Object.freeze({ material: 'emberfallStone', pool: Object.freeze([
      Object.freeze({ stat: 'ATK_PERCENT', min: .005, max: .030, step: .001, weight: 45 }),
      Object.freeze({ stat: 'HP_PERCENT', min: .010, max: .050, step: .001, weight: 30 }),
      Object.freeze({ stat: 'CRIT_DMG_PERCENT', min: .010, max: .060, step: .001, weight: 25 })
    ]) })
  });
  const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  let nextId = 1;

  class ProgressionError extends Error {
    constructor(code, message) { super(message); this.name = 'ProgressionError'; this.code = code; }
  }
  function demand(condition, code, message) {
    if (!condition) throw new ProgressionError(code, message);
  }
  function object(value, label) {
    demand(value !== null && typeof value === 'object' && !Array.isArray(value), 'INVALID_INPUT', `${label} harus berupa objek.`);
  }
  function integer(value, min, max, label) {
    demand(Number.isSafeInteger(value) && value >= min && value <= max, 'INVALID_NUMBER', `${label} harus bilangan bulat ${min}–${max}.`);
  }
  function numeric(value, label) {
    demand(typeof value === 'number' && Number.isFinite(value) && value >= 0, 'INVALID_NUMBER', `${label} harus angka valid >= 0.`);
  }
  function textValue(value, label) {
    demand(typeof value === 'string' && value.trim().length > 0, 'INVALID_INPUT', `${label} wajib diisi.`);
  }
  function statsMap(value, label) {
    object(value, label);
    for (const [key, amount] of Object.entries(value)) {
      demand(/^[A-Z][A-Z0-9_]*$/.test(key), 'INVALID_STAT', `${label}: nama stat tidak valid.`);
      numeric(amount, `${label}.${key}`);
    }
  }
  function enchantSlot(slot) {
    if (slot === null) return;
    object(slot, 'Enchant slot');
    demand(typeof slot.stat === 'string' && /^[A-Z][A-Z0-9_]*$/.test(slot.stat), 'INVALID_STAT', 'Stat enchant tidak valid.');
    numeric(slot.value, 'Enchant value');
    if (slot.city !== undefined) textValue(slot.city, 'Enchant city');
  }
  function cardSlot(slot) {
    if (slot === null) return;
    object(slot, 'Card slot');
    textValue(slot.id, 'Card id');
    if (slot.flatStats !== undefined) statsMap(slot.flatStats, 'Card flatStats');
    if (slot.percentStats !== undefined) statsMap(slot.percentStats, 'Card percentStats');
  }
  function validateEquipment(gear, allowDamaged = false) {
    object(gear, 'Equipment');
    textValue(gear.id, 'Equipment id'); textValue(gear.templateId, 'Template id'); textValue(gear.name, 'Equipment name');
    demand(TYPES.includes(gear.type), 'INVALID_TYPE', 'Tipe equipment tidak didukung.');
    integer(gear.upgradeLevel, 0, 200, 'Upgrade level'); integer(gear.refineLevel, 0, 15, 'Refine level');
    demand(typeof gear.isDamaged === 'boolean' && typeof gear.bound === 'boolean', 'INVALID_INPUT', 'isDamaged dan bound harus boolean.');
    statsMap(gear.baseStats, 'Base stats'); statsMap(gear.upgradeGrowth, 'Upgrade growth');
    demand(Array.isArray(gear.enchantSlots) && gear.enchantSlots.length === 3, 'INVALID_SLOTS', 'Equipment memerlukan 3 enchant slot.');
    demand(Array.isArray(gear.cardSlots) && gear.cardSlots.length >= 1 && gear.cardSlots.length <= 2, 'INVALID_SLOTS', 'Equipment memerlukan 1–2 card slot.');
    // Array berlubang tidak boleh lolos validasi melalui Array#forEach.
    for (let i = 0; i < 3; i++) enchantSlot(gear.enchantSlots[i]);
    for (let i = 0; i < gear.cardSlots.length; i++) cardSlot(gear.cardSlots[i]);
    demand(allowDamaged || !gear.isDamaged, 'DAMAGED_EQUIPMENT', 'Perbaiki equipment sebelum melanjutkan progresi.');
  }
  function copyCard(card) {
    if (card === null) return null;
    return { ...card, ...(card.flatStats ? { flatStats: { ...card.flatStats } } : {}), ...(card.percentStats ? { percentStats: { ...card.percentStats } } : {}) };
  }
  function snapshot(gear) {
    return {
      id: gear.id, templateId: gear.templateId, name: gear.name, type: gear.type,
      baseStats: { ...gear.baseStats }, upgradeGrowth: { ...gear.upgradeGrowth },
      upgradeLevel: gear.upgradeLevel, refineLevel: gear.refineLevel, isDamaged: gear.isDamaged, bound: gear.bound,
      enchantSlots: gear.enchantSlots.map(slot => slot === null ? null : { ...slot }),
      cardSlots: gear.cardSlots.map(copyCard)
    };
  }
  function run(operation) {
    try { return operation(); }
    catch (error) {
      if (!(error instanceof ProgressionError)) throw error;
      return { ok: false, error: { code: error.code, message: error.message } };
    }
  }
  function validateWallet(wallet, costs) {
    object(wallet, 'Wallet'); object(wallet.materials, 'Wallet materials');
    integer(wallet.zeny, 0, Number.MAX_SAFE_INTEGER, 'Zeny');
    demand(wallet.zeny >= costs.zeny, 'INSUFFICIENT_ZENY', 'Zeny tidak mencukupi.');
    for (const [key, count] of Object.entries(costs.materials)) {
      const available = own(wallet.materials, key) ? wallet.materials[key] : 0;
      integer(available, 0, Number.MAX_SAFE_INTEGER, `Material ${key}`);
      demand(available >= count, 'INSUFFICIENT_MATERIALS', `Material ${key} tidak mencukupi.`);
    }
  }
  function debit(wallet, costs) {
    wallet.zeny -= costs.zeny;
    for (const [key, count] of Object.entries(costs.materials)) wallet.materials[key] -= count;
  }
  function random(rng) {
    let value;
    try { value = rng(); } catch (_) { throw new ProgressionError('INVALID_RANDOM', 'Sumber RNG gagal.'); }
    demand(typeof value === 'number' && Number.isFinite(value) && value >= 0 && value < 1, 'INVALID_RANDOM', 'RNG harus menghasilkan angka [0, 1).');
    return value;
  }
  function validateRng(rng) { demand(typeof rng === 'function', 'INVALID_RANDOM', 'rng harus berupa fungsi.'); }
  function refineBonus(level) { integer(level, 0, 15, 'Refine level'); return .03 * level + .003 * level * level; }
  function failureRates(target) {
    if (target <= 4) return { stay: 1, downgrade: 0, damaged: 0 };
    if (target <= 8) return { stay: .70, downgrade: .25, damaged: .05 };
    if (target <= 12) return { stay: .55, downgrade: .35, damaged: .10 };
    return { stay: .40, downgrade: .45, damaged: .15 };
  }

  class Equipment {
    /** Model gear mandiri. Constructor menyalin data agar referensi konfigurasi tidak ikut berubah. */
    constructor(data = {}) {
      object(data, 'Equipment data');
      this.id = data.id === undefined ? `equipment-${nextId++}` : data.id;
      this.templateId = data.templateId === undefined ? this.id : data.templateId;
      this.name = data.name === undefined ? this.templateId : data.name;
      this.type = data.type === undefined ? 'Weapon' : data.type;
      this.baseStats = data.baseStats === undefined ? { ATK: 100 } : { ...data.baseStats };
      this.upgradeGrowth = data.upgradeGrowth === undefined ? { ATK: 3, DEF: 2, HP: 20 } : { ...data.upgradeGrowth };
      this.upgradeLevel = data.upgradeLevel === undefined ? 0 : data.upgradeLevel;
      this.refineLevel = data.refineLevel === undefined ? 0 : data.refineLevel;
      this.isDamaged = data.isDamaged === undefined ? false : data.isDamaged;
      this.bound = data.bound === undefined ? false : data.bound;
      // Validasi sumber sebelum menyalin: null/array tidak boleh berubah menjadi {} secara diam-diam.
      if (data.baseStats !== undefined) statsMap(data.baseStats, 'Base stats');
      if (data.upgradeGrowth !== undefined) statsMap(data.upgradeGrowth, 'Upgrade growth');
      this.enchantSlots = data.enchantSlots === undefined ? [null, null, null] : data.enchantSlots;
      const cardSlotCount = data.cardSlotCount === undefined ? 1 : data.cardSlotCount;
      if (data.cardSlots === undefined) integer(cardSlotCount, 1, 2, 'Card slot count');
      this.cardSlots = data.cardSlots === undefined ? Array(cardSlotCount).fill(null) : data.cardSlots;
      validateEquipment(this, true);
      this.enchantSlots = this.enchantSlots.map(slot => slot === null ? null : { ...slot });
      this.cardSlots = this.cardSlots.map(copyCard);
    }

    /** Komponen gear untuk agregator karakter: jumlahkan flat/persen seluruh gear sebelum persen + Awakening diterapkan sekali. */
    getStatComponents() {
      validateEquipment(this, true);
      const flat = Object.create(null), percentages = Object.create(null);
      for (const stat of new Set([...Object.keys(this.baseStats), ...Object.keys(this.upgradeGrowth)])) {
        flat[stat] = ((this.baseStats[stat] || 0) + (this.upgradeGrowth[stat] || 0) * this.upgradeLevel) * (1 + refineBonus(this.refineLevel));
      }
      const addFlat = (stat, value) => { flat[stat] = (flat[stat] || 0) + value; };
      const addPercent = (stat, value) => {
        const target = stat.endsWith('_PERCENT') ? stat.slice(0, -8) : stat;
        percentages[target] = (percentages[target] || 0) + value;
      };
      for (const slot of this.enchantSlots) {
        if (!slot) continue;
        if (slot.stat.endsWith('_PERCENT')) addPercent(slot.stat, slot.value);
        else addFlat(slot.stat, slot.value);
      }
      for (const card of this.cardSlots) {
        if (!card) continue;
        for (const [stat, value] of Object.entries(card.flatStats || {})) addFlat(stat, value);
        for (const [stat, value] of Object.entries(card.percentStats || {})) addPercent(stat, value);
      }
      for (const [stat, value] of Object.entries(flat)) numeric(value, `Flat ${stat}`);
      for (const [stat, value] of Object.entries(percentages)) numeric(value, `Percent ${stat}`);
      return { flatStats: { ...flat }, percentStats: { ...percentages } };
    }

    /** Diagnostik satu gear saja. Jangan menjumlahkan hasil ini untuk stat karakter: gunakan getStatComponents(). */
    getStats() {
      const { flatStats, percentStats } = this.getStatComponents(), result = {};
      for (const [stat, value] of Object.entries(flatStats)) {
        result[stat] = value * (1 + (percentStats[stat] || 0));
        numeric(result[stat], `Final ${stat}`);
      }
      return result;
    }

    /** Snapshot aman untuk persistensi prototype; server tetap perlu memvalidasi saat dimuat. */
    toJSON() { validateEquipment(this, true); return snapshot(this); }
  }

  class UpgradeSystem {
    /** Biaya target level n; strengthening selalu 100% dan berhenti di level 200. */
    quote(equipment) {
      return run(() => {
        validateEquipment(equipment);
        demand(equipment.upgradeLevel < 200, 'MAX_LEVEL', 'Upgrade sudah mencapai level 200.');
        const target = equipment.upgradeLevel + 1;
        const material = equipment.type === 'Weapon' ? 'orideconFragment' : 'phracon';
        return { ok: true, targetLevel: target, successRate: 1, costs: { zeny: 100 + 20 * target, materials: { [material]: 2 + Math.floor((target - 1) / 20) } } };
      });
    }

    /** Validasi selesai sebelum biaya dipotong; kegagalan validasi tidak mengubah gear/wallet. */
    upgrade(equipment, wallet) {
      return run(() => {
        const quote = this.quote(equipment); if (!quote.ok) return quote;
        validateWallet(wallet, quote.costs);
        const before = snapshot(equipment);
        debit(wallet, quote.costs); equipment.upgradeLevel = quote.targetLevel;
        return { ...quote, action: 'upgrade', outcome: 'success', before, after: snapshot(equipment) };
      });
    }
  }

  class RefineSystem {
    constructor({ rng = Math.random } = {}) { validateRng(rng); this.rng = rng; }

    /** Peluang gagal bersifat kondisional. Safe Refine +5..+8 menjamin hasil dengan tarif ceil(2/p). */
    quote(equipment, options = {}) {
      return run(() => {
        validateEquipment(equipment); object(options, 'Refine options');
        const { safe = false, useBlessedOre = false, useProtectionStone = false } = options;
        for (const value of [safe, useBlessedOre, useProtectionStone]) demand(typeof value === 'boolean', 'INVALID_INPUT', 'Opsi refine harus boolean.');
        demand(equipment.refineLevel < 15, 'MAX_LEVEL', 'Refine sudah mencapai +15.');
        const target = equipment.refineLevel + 1;
        demand(!safe || (target >= 5 && target <= 8), 'SAFE_REFINE_UNAVAILABLE', 'Safe Refine hanya tersedia untuk target +5 sampai +8.');
        demand(!safe || (!useBlessedOre && !useProtectionStone), 'CONFLICTING_OPTIONS', 'Safe Refine tidak menggunakan item proteksi tambahan.');
        const baseSuccess = REFINE_SUCCESS[target - 1];
        const multiplier = safe ? Math.ceil(2 / baseSuccess) : 1;
        const material = equipment.type === 'Weapon' ? 'oridecon' : 'elunium';
        const materials = { [material]: Math.ceil(target / 2) * multiplier };
        if (useBlessedOre) materials.blessedOre = 1;
        if (useProtectionStone) materials.protectionStone = 1;
        const conditionalFailure = { ...failureRates(target) };
        if (useBlessedOre) { conditionalFailure.stay += conditionalFailure.downgrade; conditionalFailure.downgrade = 0; }
        if (useProtectionStone) { conditionalFailure.stay += conditionalFailure.damaged; conditionalFailure.damaged = 0; }
        if (safe) { conditionalFailure.stay = 1; conditionalFailure.downgrade = 0; conditionalFailure.damaged = 0; }
        const successRate = safe ? 1 : baseSuccess;
        return { ok: true, targetLevel: target, safe, successRate, costMultiplier: multiplier,
          conditionalFailure, outcomeProbabilities: { success: successRate, stay: (1 - successRate) * conditionalFailure.stay,
            downgrade: (1 - successRate) * conditionalFailure.downgrade, damaged: (1 - successRate) * conditionalFailure.damaged },
          costs: { zeny: 10000 * target * target * multiplier, materials } };
      });
    }

    /** Dua roll: sukses terlebih dahulu, lalu hasil gagal. Blessed mencegah turun; Protection mencegah rusak. */
    refine(equipment, wallet, options = {}) {
      return run(() => {
        const quote = this.quote(equipment, options); if (!quote.ok) return quote;
        validateWallet(wallet, quote.costs);
        let outcome = 'success';
        if (quote.successRate < 1 && random(this.rng) >= quote.successRate) {
          const failRoll = random(this.rng);
          const rates = quote.conditionalFailure;
          outcome = failRoll < rates.stay ? 'stay' : failRoll < rates.stay + rates.downgrade ? 'downgrade' : 'damaged';
        }
        const before = snapshot(equipment);
        debit(wallet, quote.costs);
        if (outcome === 'success') equipment.refineLevel = quote.targetLevel;
        if (outcome === 'downgrade') equipment.refineLevel -= 1;
        if (outcome === 'damaged') equipment.isDamaged = true;
        return { ...quote, action: 'refine', outcome, before, after: snapshot(equipment) };
      });
    }

    /** Memakan satu duplikat template yang bersih/tidak terikat; gear utama tetap menyimpan seluruh progres. */
    repair(equipment, wallet, inventory, duplicateId) {
      return run(() => {
        validateEquipment(equipment, true);
        demand(equipment.isDamaged, 'NOT_DAMAGED', 'Equipment ini tidak rusak.');
        demand(Array.isArray(inventory), 'INVALID_INPUT', 'Inventory harus berupa array.');
        textValue(duplicateId, 'Duplicate id');
        const index = inventory.findIndex(item => item && item.id === duplicateId);
        demand(index >= 0, 'DUPLICATE_NOT_FOUND', 'Duplikat tidak ditemukan dalam inventory.');
        const duplicate = inventory[index]; validateEquipment(duplicate, true);
        demand(duplicate !== equipment && duplicate.id !== equipment.id, 'INVALID_DUPLICATE', 'Equipment tidak boleh memperbaiki dirinya sendiri.');
        demand(duplicate.templateId === equipment.templateId && duplicate.type === equipment.type, 'INVALID_DUPLICATE', 'Template duplikat harus sama persis.');
        demand(!duplicate.bound && !duplicate.isDamaged && duplicate.upgradeLevel === 0 && duplicate.refineLevel === 0 &&
          duplicate.enchantSlots.every(slot => slot === null) && duplicate.cardSlots.every(slot => slot === null),
        'INVESTED_DUPLICATE', 'Gunakan duplikat bersih: tidak terikat, tidak rusak, tanpa upgrade/refine/enchant/card.');
        const costs = { zeny: 25000 * equipment.refineLevel, materials: {} };
        validateWallet(wallet, costs);
        const before = snapshot(equipment), consumedDuplicate = snapshot(duplicate);
        debit(wallet, costs); inventory.splice(index, 1); equipment.isDamaged = false;
        return { ok: true, action: 'repair', outcome: 'repaired', costs, consumedDuplicate, before, after: snapshot(equipment) };
      });
    }
  }

  class EnchantSystem {
    constructor({ rng = Math.random } = {}) { validateRng(rng); this.rng = rng; }

    /** Maksimum satu lock; lock harus berisi stat dan menggandakan biaya penuh. */
    quote(equipment, city, lockedIndex = null) {
      return run(() => {
        validateEquipment(equipment);
        demand(typeof city === 'string' && own(ENCHANT_CITIES, city), 'UNKNOWN_CITY', 'Kota enchant tidak dikenal.');
        if (lockedIndex !== null) {
          integer(lockedIndex, 0, 2, 'Locked index');
          demand(equipment.enchantSlots[lockedIndex] !== null, 'EMPTY_LOCK', 'Slot kosong tidak dapat dikunci.');
        }
        const multiplier = lockedIndex === null ? 1 : 2;
        return { ok: true, city, lockedIndex, costMultiplier: multiplier,
          costs: { zeny: 5000 * multiplier, materials: { [ENCHANT_CITIES[city].material]: 5 * multiplier } } };
      });
    }

    /** Setiap slot mengambil jenis dan nilai secara independen; stat duplikat diperbolehkan. Lock mempertahankan city asal. */
    enchant(equipment, wallet, city, lockedIndex = null) {
      return run(() => {
        const quote = this.quote(equipment, city, lockedIndex); if (!quote.ok) return quote;
        validateWallet(wallet, quote.costs);
        const pool = ENCHANT_CITIES[city].pool, totalWeight = pool.reduce((sum, entry) => sum + entry.weight, 0);
        const next = equipment.enchantSlots.map((slot, index) => {
          if (index === lockedIndex) return { ...slot };
          const statRoll = random(this.rng) * totalWeight;
          let cumulative = 0, selected = pool[pool.length - 1];
          for (const entry of pool) { cumulative += entry.weight; if (statRoll < cumulative) { selected = entry; break; } }
          const steps = Math.round((selected.max - selected.min) / selected.step) + 1;
          const value = Number((selected.min + Math.floor(random(this.rng) * steps) * selected.step).toFixed(3));
          return { stat: selected.stat, value, city };
        });
        const before = snapshot(equipment);
        debit(wallet, quote.costs); equipment.enchantSlots = next;
        return { ...quote, action: 'enchant', outcome: 'rerolled', before, after: snapshot(equipment) };
      });
    }
  }

  class MVPDropCalculator {
    constructor({ rng = Math.random } = {}) { validateRng(rng); this.rng = rng; }

    /** Normalisasi per kategori, lalu redistribusi bobot kategori kosong. Input harus sudah divalidasi/capped oleh server encounter. */
    calculate(parties) {
      return run(() => {
        demand(Array.isArray(parties), 'INVALID_INPUT', 'Data party harus berupa array.');
        const ids = new Set();
        for (const party of parties) {
          object(party, 'Party'); textValue(party.id, 'Party id');
          demand(!ids.has(party.id), 'DUPLICATE_ID', 'Party id harus unik.'); ids.add(party.id);
          for (const key of ['damageDealt', 'damageTaken', 'healingDone']) numeric(party[key], key);
          for (const key of ['firstHit', 'lastHit']) demand(typeof party[key] === 'boolean', 'INVALID_INPUT', `${key} harus boolean.`);
          if (party.eligible !== undefined) demand(typeof party.eligible === 'boolean', 'INVALID_INPUT', 'eligible harus boolean.');
        }
        const eligible = parties.filter(party => party.eligible !== false);
        const dimensions = Object.create(null); let activeWeight = 0;
        for (const [key, weight] of Object.entries(MVP_WEIGHTS)) {
          // Scaling mencegah overflow untuk input angka besar yang masih finite.
          const maximum = eligible.reduce((max, party) => Math.max(max, Number(party[key])), 0);
          if (maximum === 0) continue;
          const scaledTotal = eligible.reduce((sum, party) => sum + Number(party[key]) / maximum, 0);
          dimensions[key] = { maximum, scaledTotal, weight }; activeWeight += weight;
        }
        const scores = eligible.map(party => {
          const components = {};
          for (const [key, dimension] of Object.entries(dimensions)) {
            components[key] = Number(party[key]) / dimension.maximum / dimension.scaledTotal * dimension.weight;
          }
          const weightedScore = Object.values(components).reduce((sum, value) => sum + value, 0);
          return { id: party.id, score: activeWeight === 0 ? 0 : weightedScore / activeWeight, weightedScore, components };
        });
        return { ok: true, scores, activeWeight, totalScore: activeWeight === 0 ? 0 : scores.reduce((sum, party) => sum + party.score, 0),
          eligiblePartyCount: eligible.length, excludedPartyCount: parties.length - eligible.length };
      });
    }

    /** Gate kelangkaan satu kali per kill, kemudian undian penerima berdasarkan kontribusi; bukan satu drop roll per party. */
    roll(parties, options = {}) {
      return run(() => {
        object(options, 'MVP roll options');
        const { rareDropChance = .01 } = options;
        numeric(rareDropChance, 'Rare drop chance');
        demand(rareDropChance <= 1, 'INVALID_NUMBER', 'Rare drop chance maksimal 1.');
        const calculation = this.calculate(parties); if (!calculation.ok) return calculation;
        if (calculation.totalScore === 0) return { ...calculation, dropped: false, winnerId: null, reason: 'NO_CONTRIBUTION', rareDropChance };
        if (rareDropChance === 0 || (rareDropChance < 1 && random(this.rng) >= rareDropChance)) {
          return { ...calculation, dropped: false, winnerId: null, reason: 'RARITY_GATE_FAILED', rareDropChance };
        }
        const roll = random(this.rng) * calculation.totalScore;
        let cumulative = 0, winnerId = null;
        for (const party of calculation.scores) {
          if (party.score > 0) winnerId = party.id;
          cumulative += party.score;
          if (roll < cumulative) { winnerId = party.id; break; }
        }
        return { ...calculation, dropped: true, winnerId, reason: 'RARE_DROP_AWARDED', rareDropChance };
      });
    }
  }

  return Object.freeze({ Equipment, UpgradeSystem, RefineSystem, EnchantSystem, MVPDropCalculator,
    ProgressionError, REFINE_SUCCESS, MVP_WEIGHTS, ENCHANT_CITIES, refineBonus });
});
