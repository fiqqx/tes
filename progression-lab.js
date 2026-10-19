/* Standalone UI: all inventory and progression belong to this page session. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const api = globalThis.EquipmentProgression;
  if (!api) {
    $('load-error').hidden = false;
    $('load-error').textContent = 'Modul progression belum termuat. Jalankan dari folder game lengkap, pastikan systems/equipment-progression.js tersedia, lalu muat ulang.';
    document.querySelectorAll('button, input, select').forEach(control => { control.disabled = true; });
    return;
  }

  const number = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 });
  const percent = value => `${number.format(value * 100)}%`;
  const materialNames = {
    phracon: 'Phracon', orideconFragment: 'Oridecon Fragment', oridecon: 'Oridecon',
    elunium: 'Elunium', blessedOre: 'Blessed Ore', protectionStone: 'Protection Stone',
    luminaStone: 'Lumina Stone', emberfallStone: 'Emberfall Stone'
  };
  const statNames = { ATK_PERCENT: 'ATK', HP_PERCENT: 'HP', CRIT_DMG_PERCENT: 'Crit DMG' };
  const templates = {
    weapon: { templateId: 'lab-dawnblade', name: 'Dawnblade', type: 'Weapon', baseStats: { ATK: 200, DEF: 0, HP: 0 }, upgradeGrowth: { ATK: 3 }, glyph: '⚔' },
    armor: { templateId: 'lab-verdant-mail', name: 'Verdant Mail', type: 'Armor', baseStats: { ATK: 0, DEF: 120, HP: 1000 }, upgradeGrowth: { DEF: 2, HP: 20 }, glyph: '♜' },
    accessory: { templateId: 'lab-solstice-ring', name: 'Solstice Ring', type: 'Accessory', baseStats: { ATK: 70, DEF: 20, HP: 250 }, upgradeGrowth: { ATK: 1, DEF: .5, HP: 5 }, glyph: '◇' }
  };
  const upgradeSystem = new api.UpgradeSystem();
  const refineSystem = new api.RefineSystem();
  const enchantSystem = new api.EnchantSystem();
  const mvpSystem = new api.MVPDropCalculator();
  let equipment, wallet, selected = 'weapon', duplicateCount = 0, battleCount = 0, conditionalCount = 0;

  function element(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  }

  /** Reset only this lab's objects; the main game localStorage is never accessed. */
  function resetLab() {
    equipment = Object.fromEntries(Object.entries(templates).map(([key, template]) => [key, new api.Equipment({
      ...template, id: `lab-${key}`, upgradeLevel: 40, refineLevel: 4, bound: true,
      isDamaged: false, enchantSlots: [null, null, null], cardSlots: [null, null]
    })]));
    wallet = { zeny: 2000000000, materials: { phracon: 20000, orideconFragment: 20000, oridecon: 20000,
      elunium: 20000, blessedOre: 500, protectionStone: 500, luminaStone: 5000, emberfallStone: 5000 } };
    selected = 'weapon'; duplicateCount = 0; battleCount = 0; conditionalCount = 0;
    $('equipment-type').value = selected;
    $('enchant-city').value = 'Lumina'; $('enchant-lock').value = '';
    document.querySelector('[name="refine-mode"][value="normal"]').checked = true;
    $('blessed-ore').checked = false; $('protection-stone').checked = false;
    $('event-log').replaceChildren();
    createPartyInputs(); render(); renderMvp();
    showMvpResult('Setiap kontribusi punya tempat.', 'Tekan roll untuk menguji rare drop 1% per pertarungan.');
    log('Lab', 'Lab siap. Tiga equipment dimulai pada upgrade 40 dan refine +4.', 'success');
  }

  function currentEquipment() { return equipment[selected]; }
  function lockIndex() { return $('enchant-lock').value === '' ? null : Number($('enchant-lock').value); }
  function refineOptions() {
    const safe = document.querySelector('[name="refine-mode"]:checked').value === 'safe';
    return { safe, useBlessedOre: !safe && $('blessed-ore').checked, useProtectionStone: !safe && $('protection-stone').checked };
  }
  function canAfford(costs) {
    return wallet.zeny >= costs.zeny && Object.entries(costs.materials).every(([key, amount]) => (wallet.materials[key] || 0) >= amount);
  }
  function costDescription(costs) {
    return [`${number.format(costs.zeny)} Zeny`, ...Object.entries(costs.materials).map(([key, amount]) => `${number.format(amount)} ${materialNames[key] || key}`)].join(' + ');
  }

  /** Quotes come from the same system that performs transactions, so cost previews stay accurate. */
  function renderCost(target, quote, button) {
    target.replaceChildren();
    if (!quote.ok) {
      target.textContent = quote.error.message; button.disabled = true;
      button.title = quote.error.message; return;
    }
    const tokens = [[quote.costs.zeny, 'Zeny'], ...Object.entries(quote.costs.materials).map(([key, amount]) => [amount, materialNames[key] || key])];
    tokens.forEach(([amount, label]) => {
      const token = element('span', 'cost-token');
      token.append(element('b', '', number.format(amount)), ` ${label}`); target.append(token);
    });
    button.disabled = !canAfford(quote.costs);
    button.title = button.disabled ? 'Material atau Zeny lab tidak mencukupi. Gunakan Reset lab untuk mengisi ulang.' : '';
  }

  /** Recompute the UI from the current equipment after every action and option change. */
  function render() {
    const gear = currentEquipment();
    $('wallet-summary').replaceChildren();
    [[wallet.zeny, 'ZENY', '◉'], [wallet.materials[gear.type === 'Weapon' ? 'oridecon' : 'elunium'], gear.type === 'Weapon' ? 'ORIDECON' : 'ELUNIUM', '◇'],
      [wallet.materials[$('enchant-city').value === 'Lumina' ? 'luminaStone' : 'emberfallStone'], 'ENCHANT STONE', '✧']].forEach(([value, label, glyph]) => {
      const item = element('div', 'wallet-value'); item.title = `${number.format(value)} ${label}`;
      const display = value >= 1000000000 ? `${number.format(value / 1000000000)} Miliar` : number.format(value);
      item.append(element('span', '', label), element('i', 'wallet-icon', glyph), element('b', '', display));
      $('wallet-summary').append(item);
    });
    $('material-list').replaceChildren();
    Object.entries(wallet.materials).forEach(([key, amount]) => {
      const row = element('div', 'material-row'); row.append(element('span', '', materialNames[key] || key), element('strong', '', number.format(amount)));
      $('material-list').append(row);
    });
    $('equipment-glyph').textContent = templates[selected].glyph;
    $('equipment-name').textContent = `${gear.name} +${gear.refineLevel}`;
    $('equipment-detail').textContent = `Upgrade ${gear.upgradeLevel} / 200 · Refine ${percent(api.refineBonus(gear.refineLevel))}`;
    $('equipment-status').textContent = gear.isDamaged ? 'Damaged · perlu diperbaiki' : 'Siap ditempa';
    $('equipment-status').className = `state-badge${gear.isDamaged ? ' damaged' : ''}`;
    $('equipment-stats').replaceChildren();
    const displayedStats = gear.getStats();
    for (const [stat, value] of Object.entries(displayedStats)) {
      if (value === 0) continue;
      const row = element('div', 'stat-row'); row.append(element('span', '', stat), element('strong', '', number.format(value)));
      $('equipment-stats').append(row);
    }
    if (typeof gear.getStatComponents === 'function') {
      for (const [stat, value] of Object.entries(gear.getStatComponents().percentStats)) {
        if (value === 0 || displayedStats[stat]) continue;
        const row = element('div', 'stat-row');
        row.append(element('span', '', `${stat.replaceAll('_', ' ')} bonus`), element('strong', '', `+${percent(value)}`));
        $('equipment-stats').append(row);
      }
    }
    const upgradeQuote = upgradeSystem.quote(gear);
    $('upgrade-current').textContent = gear.upgradeLevel;
    $('upgrade-next').textContent = gear.upgradeLevel < 200 ? gear.upgradeLevel + 1 : 'MAX';
    renderCost($('upgrade-cost'), upgradeQuote, $('upgrade-button'));
    const safeRadio = document.querySelector('[name="refine-mode"][value="safe"]');
    safeRadio.disabled = gear.isDamaged || gear.refineLevel < 4 || gear.refineLevel >= 8;
    if (safeRadio.disabled && safeRadio.checked) document.querySelector('[name="refine-mode"][value="normal"]').checked = true;
    const options = refineOptions();
    $('blessed-ore').disabled = options.safe || gear.isDamaged;
    $('protection-stone').disabled = options.safe || gear.isDamaged;
    const refineQuote = refineSystem.quote(gear, options);
    $('refine-target').textContent = gear.refineLevel < 15 ? `+${gear.refineLevel} → +${gear.refineLevel + 1}` : '+15 MAX';
    $('refine-success').textContent = refineQuote.ok ? `${percent(refineQuote.successRate)} sukses` : 'Tidak tersedia';
    $('refine-risk').replaceChildren();
    if (refineQuote.ok) {
      const names = { success: 'Sukses', stay: 'Tetap', downgrade: 'Turun', damaged: 'Rusak' };
      Object.entries(refineQuote.outcomeProbabilities).forEach(([key, probability]) => {
        $('refine-risk').append(element('span', '', `${names[key]} ${percent(probability)}`));
      });
    }
    renderCost($('refine-cost'), refineQuote, $('refine-button'));
    $('refine-note').textContent = gear.isDamaged ? 'Progression berhenti sementara. Lab menyediakan duplikat bersih gratis; biaya perbaikan tetap dipotong.' : options.safe ? 'Safe Refine menjamin sukses. Biaya normal dikali ceil(2 / peluang normal).' : 'Peluang di atas adalah peluang per percobaan. Proteksi mengalihkan risiko gagal menjadi tetap.';
    $('repair-button').hidden = !gear.isDamaged;
    $('repair-button').textContent = `Perbaiki · 1 duplikat + ${number.format(25000 * gear.refineLevel)} Zeny`;
    $('repair-button').disabled = wallet.zeny < 25000 * gear.refineLevel;
    Array.from($('enchant-lock').options).forEach((option, index) => { if (index > 0) option.disabled = gear.enchantSlots[index - 1] === null; });
    if (lockIndex() !== null && gear.enchantSlots[lockIndex()] === null) $('enchant-lock').value = '';
    const city = $('enchant-city').value;
    $('city-description').textContent = city === 'Lumina' ? 'STR, DEX, AGI, VIT, INT, LUK: masing-masing 1–12, bobot jenis sama.' : 'ATK 0,5–3% (45%), HP 1–5% (30%), Crit DMG 1–6% (25%).';
    $('enchant-slots').replaceChildren();
    gear.enchantSlots.forEach((slot, index) => {
      const locked = lockIndex() === index;
      const card = element('div', `enchant-slot${locked ? ' locked' : ''}${slot ? '' : ' empty'}`);
      const label = element('div', 'enchant-slot-label', `SLOT 0${index + 1}`);
      if (locked) label.append(element('span', 'lock-symbol', '▣ LOCKED'));
      const isPercent = slot && slot.stat.endsWith('_PERCENT');
      card.append(label, element('strong', '', slot ? `+${isPercent ? percent(slot.value) : number.format(slot.value)} ${statNames[slot.stat] || slot.stat}` : 'Belum ada'),
        element('small', '', slot ? `${slot.city} enchantment` : 'Roll untuk membuka atribut'));
      $('enchant-slots').append(card);
    });
    renderCost($('enchant-cost'), enchantSystem.quote(gear, city, lockIndex()), $('enchant-button'));
  }

  function announce(message) { $('live-feedback').textContent = message; }
  function log(kind, message, state = '') {
    const entry = element('li', state);
    entry.append(element('time', 'log-time', new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })), element('span', 'log-kind', kind), element('span', '', message));
    $('event-log').prepend(entry);
    while ($('event-log').children.length > 30) $('event-log').lastElementChild.remove();
    announce(message);
  }

  /** Handle system receipts without disguising failed refine outcomes as successful gear progression. */
  function runAction(kind, action) {
    try {
      const receipt = action();
      if (!receipt.ok) { log(kind, receipt.error.message, 'error'); render(); return; }
      const name = currentEquipment().name;
      const messages = {
        upgrade: `${name} mencapai upgrade ${currentEquipment().upgradeLevel}.`,
        success: `${name} berhasil refine +${currentEquipment().refineLevel}.`,
        stay: `Refine ${name} gagal; tetap +${currentEquipment().refineLevel}.`,
        downgrade: `Refine ${name} gagal; turun ke +${currentEquipment().refineLevel}.`,
        damaged: `Refine ${name} gagal; equipment rusak pada +${currentEquipment().refineLevel}. Perbaiki untuk melanjutkan.`,
        rerolled: `${name} menerima enchant ${$('enchant-city').value}${lockIndex() === null ? '' : `, slot ${lockIndex() + 1} dipertahankan`}.`,
        repaired: `${name} diperbaiki. Satu duplikat bersih dikonsumsi, seluruh progres dipertahankan.`
      };
      const key = receipt.action === 'upgrade' ? 'upgrade' : receipt.outcome;
      log(kind, `${messages[key] || 'Tindakan selesai'} Biaya: ${costDescription(receipt.costs)}.`, ['stay', 'downgrade', 'damaged'].includes(receipt.outcome) ? 'error' : 'success');
      render();
    } catch (error) { log(kind, `Tindakan dibatalkan: ${error.message}`, 'error'); }
  }

  /** Generate editable, labelled party inputs; First/Last Hit radio groups allow one party each. */
  function createPartyInputs() {
    $('party-rows').replaceChildren();
    const defaults = [
      { id: 'A', damageDealt: 600000, damageTaken: 10000, healingDone: 0 },
      { id: 'B', damageDealt: 300000, damageTaken: 60000, healingDone: 20000 },
      { id: 'C', damageDealt: 100000, damageTaken: 30000, healingDone: 80000 }
    ];
    defaults.forEach((party, index) => {
      const row = element('tr'); const nameCell = element('td');
      nameCell.append(element('span', `party-dot ${party.id.toLowerCase()}`), `Party ${party.id}`); row.append(nameCell);
      for (const [key, label] of [['damageDealt', 'Damage dealt'], ['damageTaken', 'Damage taken'], ['healingDone', 'Healing done']]) {
        const cell = element('td'), input = element('input');
        input.type = 'number'; input.min = '0'; input.max = '1000000000000'; input.step = '1';
        input.value = party[key]; input.dataset.party = party.id; input.dataset.metric = key;
        input.setAttribute('aria-label', `${label} Party ${party.id}`); input.addEventListener('input', renderMvp);
        cell.append(input); row.append(cell);
      }
      for (const [key, defaultIndex, label] of [['firstHit', 0, 'First hit'], ['lastHit', 2, 'Last hit']]) {
        const cell = element('td'), input = element('input');
        input.type = 'radio'; input.name = key; input.value = party.id; input.checked = index === defaultIndex;
        input.setAttribute('aria-label', `${label} Party ${party.id}`); input.addEventListener('change', renderMvp);
        cell.append(input); row.append(cell);
      }
      const weightCell = element('td'); weightCell.append(element('span', 'weight-value', '—'));
      const track = element('div', 'weight-track'); track.setAttribute('aria-hidden', 'true'); track.append(element('span')); weightCell.append(track);
      weightCell.dataset.partyScore = party.id; row.append(weightCell); $('party-rows').append(row);
    });
  }

  function readParties() {
    let valid = true;
    const parties = ['A', 'B', 'C'].map(id => {
      const party = { id, firstHit: document.querySelector('[name="firstHit"]:checked').value === id, lastHit: document.querySelector('[name="lastHit"]:checked').value === id };
      for (const key of ['damageDealt', 'damageTaken', 'healingDone']) {
        const input = document.querySelector(`[data-party="${id}"][data-metric="${key}"]`);
        party[key] = input.valueAsNumber;
        const isValid = input.validity.valid && Number.isFinite(party[key]);
        input.setAttribute('aria-invalid', String(!isValid)); if (!isValid) valid = false;
      }
      return party;
    });
    return valid ? parties : null;
  }

  function renderMvp() {
    const parties = readParties();
    const result = parties ? mvpSystem.calculate(parties) : null;
    const valid = Boolean(result && result.ok && result.totalScore > 0);
    $('mvp-roll').disabled = !valid; $('mvp-conditional').disabled = !valid;
    document.querySelectorAll('[data-party-score]').forEach(cell => {
      const item = result && result.ok ? result.scores.find(score => score.id === cell.dataset.partyScore) : null;
      cell.querySelector('.weight-value').textContent = item ? percent(item.score) : '—';
      cell.querySelector('.weight-track span').style.width = `${item ? item.score * 100 : 0}%`;
    });
    $('mvp-formula').textContent = !parties ? 'Masukkan bilangan bulat 0–1.000.000.000.000 pada semua kolom kontribusi.' : 'S = 45% × share damage + 25% × share tank + 20% × share heal + 7% × first hit + 3% × last hit. Kategori kosong didistribusikan ulang. P(rare party) = 1% × bobot party.';
  }

  function showMvpResult(title, detail, winner = false) {
    $('mvp-result').className = `mvp-result${winner ? ' winner' : ''}`;
    $('mvp-result').replaceChildren(element('strong', '', title), element('span', '', detail));
  }

  /** The normal action gates rarity at 1%; the explicitly labelled test uses 100% only for recipient sampling. */
  function rollMvp(conditional) {
    const parties = readParties(); if (!parties) return;
    const result = mvpSystem.roll(parties, { rareDropChance: conditional ? 1 : .01 });
    if (!result.ok) { log('MVP', result.error.message, 'error'); return; }
    if (conditional) conditionalCount++; else battleCount++;
    if (result.dropped) {
      const winner = result.scores.find(party => party.id === result.winnerId);
      const title = conditional ? `Tes penerima #${conditionalCount}: Party ${result.winnerId}` : `Rare drop #${battleCount}: Party ${result.winnerId}!`;
      const detail = conditional ? `Simulasi bersyarat: diasumsikan rare drop sudah muncul. Bobot Party ${result.winnerId} ${percent(winner.score)}. Bukan hadiah game.` : `Gate 1% berhasil. Party ${result.winnerId} memenangkan undian kontribusi dengan bobot ${percent(winner.score)}.`;
      showMvpResult(title, detail, true); log('MVP', `${title}. ${detail}`, 'success');
    } else {
      const title = result.reason === 'NO_CONTRIBUTION' ? 'Tidak ada kontribusi yang memenuhi syarat.' : `Pertarungan #${battleCount}: belum ada rare drop.`;
      const detail = 'Tidak ada pemenang. Peluang kemunculan tetap 1% pada setiap pertarungan, tanpa pity counter.';
      showMvpResult(title, detail); log('MVP', `${title} ${detail}`);
    }
  }

  $('equipment-type').addEventListener('change', () => { selected = $('equipment-type').value; render(); });
  document.querySelectorAll('[name="refine-mode"]').forEach(input => input.addEventListener('change', () => {
    if (input.value === 'safe' && input.checked) { $('blessed-ore').checked = false; $('protection-stone').checked = false; } render();
  }));
  ['blessed-ore', 'protection-stone', 'enchant-city', 'enchant-lock'].forEach(id => $(id).addEventListener('change', render));
  $('upgrade-button').addEventListener('click', () => runAction('Upgrade', () => upgradeSystem.upgrade(currentEquipment(), wallet)));
  $('refine-button').addEventListener('click', () => runAction('Refine', () => refineSystem.refine(currentEquipment(), wallet, refineOptions())));
  $('enchant-button').addEventListener('click', () => runAction('Enchant', () => enchantSystem.enchant(currentEquipment(), wallet, $('enchant-city').value, lockIndex())));
  $('repair-button').addEventListener('click', () => runAction('Repair', () => {
    const gear = currentEquipment(), id = `lab-duplicate-${++duplicateCount}`;
    const inventory = [new api.Equipment({ ...templates[selected], id, bound: false, upgradeLevel: 0, refineLevel: 0, isDamaged: false, enchantSlots: [null, null, null], cardSlots: [null, null] })];
    return refineSystem.repair(gear, wallet, inventory, id);
  }));
  $('mvp-roll').addEventListener('click', () => rollMvp(false));
  $('mvp-conditional').addEventListener('click', () => rollMvp(true));
  $('reset-lab').addEventListener('click', resetLab);
  resetLab();
})();
