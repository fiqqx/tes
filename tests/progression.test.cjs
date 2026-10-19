/* Pengujian kontrak balancing, transaksi atomik, probabilitas batas dan ekspor browser. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { Equipment, UpgradeSystem, RefineSystem, EnchantSystem, MVPDropCalculator, refineBonus } = require('../systems/equipment-progression.js');

function gear(overrides = {}) {
  return new Equipment({ id: 'sword-1', templateId: 'astral-sword', name: 'Astral Sword', type: 'Weapon', baseStats: { ATK: 100 }, upgradeGrowth: { ATK: 3 }, ...overrides });
}
function wallet(overrides = {}) {
  return { zeny: 1000000000, materials: { phracon: 10000, orideconFragment: 10000, oridecon: 10000, elunium: 10000,
    blessedOre: 10, protectionStone: 10, luminaStone: 10000, emberfallStone: 10000 }, ...overrides };
}
function sequence(...values) {
  let index = 0;
  return () => { assert(index < values.length, 'RNG called more often than expected'); return values[index++]; };
}
function close(actual, expected) { assert(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`); }
function unchangedOnFailure(operation, objects) {
  const before = JSON.stringify(objects);
  const result = operation();
  assert.equal(result.ok, false);
  assert.equal(JSON.stringify(objects), before);
  return result;
}

// Constructor bounds, nested cloning and the final stat formula.
{
  const source = { baseStats: { ATK: 100 }, upgradeGrowth: { ATK: 3 },
    enchantSlots: [{ stat: 'ATK_PERCENT', value: .05, city: 'Emberfall' }, { stat: 'ATK', value: 10 }, null],
    cardSlots: [{ id: 'wolf', flatStats: { ATK: 20 }, percentStats: { ATK: .10 } }, null] };
  const equipment = gear({ ...source, upgradeLevel: 10, refineLevel: 5 });
  close(refineBonus(5), .225);
  close(equipment.getStats().ATK, (130 * 1.225 + 30) * 1.15);
  close(equipment.getStatComponents().flatStats.ATK, 130 * 1.225 + 30);
  close(equipment.getStatComponents().percentStats.ATK, .15);
  source.baseStats.ATK = 999; source.cardSlots[0].flatStats.ATK = 999; source.enchantSlots[1].value = 999;
  assert.equal(equipment.baseStats.ATK, 100);
  assert.equal(equipment.cardSlots[0].flatStats.ATK, 20);
  assert.equal(equipment.enchantSlots[1].value, 10);
  assert.equal(equipment.cardSlots.length, 2);
  for (const value of [-1, 201, 1.5, NaN, Infinity, '5']) assert.throws(() => gear({ upgradeLevel: value }));
  for (const value of [-1, 16, NaN]) assert.throws(() => gear({ refineLevel: value }));
  assert.throws(() => gear({ type: 'Sword' }));
  assert.throws(() => gear({ baseStats: null }));
  assert.throws(() => gear({ enchantSlots: new Array(3) }));
  assert.throws(() => gear({ cardSlots: [] }));
  assert.throws(() => gear({ cardSlotCount: 1000000000 }));
  assert.throws(() => gear({ cardSlots: [null, null, null] }));
  assert.throws(() => gear({ cardSlots: [{ id: 'bad', flatStats: { ATK: -1 } }] }));
  assert.throws(() => gear({ isDamaged: 1 }));
  assert.deepEqual(new Equipment(equipment.toJSON()).toJSON(), equipment.toJSON());
}

// Strengthening has deterministic per-target costs and does not wrap past 200.
{
  const system = new UpgradeSystem(), equipment = gear(), funds = wallet();
  assert.deepEqual(system.quote(equipment).costs, { zeny: 120, materials: { orideconFragment: 2 } });
  const result = system.upgrade(equipment, funds);
  assert.equal(result.outcome, 'success'); assert.equal(equipment.upgradeLevel, 1);
  assert.equal(funds.zeny, 1000000000 - 120); assert.equal(funds.materials.orideconFragment, 9998);
  const armor = gear({ type: 'Armor', upgradeLevel: 20 });
  assert.deepEqual(system.quote(armor).costs, { zeny: 520, materials: { phracon: 3 } });
  const maximum = gear({ upgradeLevel: 200 });
  assert.equal(unchangedOnFailure(() => system.upgrade(maximum, funds), [maximum, funds]).error.code, 'MAX_LEVEL');
  const noFunds = wallet({ zeny: 0 });
  unchangedOnFailure(() => system.upgrade(equipment, noFunds), [equipment, noFunds]);
  const noOre = wallet(); noOre.materials.orideconFragment = 1;
  unchangedOnFailure(() => system.upgrade(equipment, noOre), [equipment, noOre]);
  const badOre = wallet(); badOre.materials.orideconFragment = NaN;
  unchangedOnFailure(() => system.upgrade(equipment, badOre), [equipment, badOre]);
  const badFunds = wallet({ zeny: Infinity });
  unchangedOnFailure(() => system.upgrade(equipment, badFunds), [equipment, badFunds]);
  const damaged = gear({ isDamaged: true });
  unchangedOnFailure(() => system.upgrade(damaged, funds), [damaged, funds]);
}

// Guaranteed +1..+4 skip RNG; target +5 uses p=.5 and a conditional failure roll.
{
  const guaranteed = new RefineSystem({ rng: () => { throw new Error('must not draw'); } });
  const equipment = gear(), funds = wallet();
  for (let level = 1; level <= 4; level++) {
    assert.equal(guaranteed.refine(equipment, funds).outcome, 'success'); assert.equal(equipment.refineLevel, level);
  }
  const quote = guaranteed.quote(equipment);
  close(quote.successRate, .5); close(quote.outcomeProbabilities.stay, .35);
  close(quote.outcomeProbabilities.downgrade, .125); close(quote.outcomeProbabilities.damaged, .025);
  assert.deepEqual(quote.costs, { zeny: 250000, materials: { oridecon: 3 } });
  const cases = [
    { rng: sequence(.499999), outcome: 'success', level: 5, damaged: false },
    { rng: sequence(.5, .699999), outcome: 'stay', level: 4, damaged: false },
    { rng: sequence(.5, .7), outcome: 'downgrade', level: 3, damaged: false },
    { rng: sequence(.999, .949999), outcome: 'downgrade', level: 3, damaged: false },
    { rng: sequence(.5, .95), outcome: 'damaged', level: 4, damaged: true }
  ];
  for (const sample of cases) {
    const item = gear({ refineLevel: 4 }), resources = wallet();
    const result = new RefineSystem({ rng: sample.rng }).refine(item, resources);
    assert.equal(result.outcome, sample.outcome); assert.equal(item.refineLevel, sample.level);
    assert.equal(item.isDamaged, sample.damaged); assert.equal(resources.materials.oridecon, 9997);
    assert.equal(resources.zeny, 999750000);
  }
  assert.equal(guaranteed.quote(gear({ type: 'Accessory', refineLevel: 8 })).costs.materials.elunium, 5);
  close(guaranteed.quote(gear({ refineLevel: 8 })).conditionalFailure.damaged, .10);
  close(guaranteed.quote(gear({ refineLevel: 12 })).conditionalFailure.damaged, .15);
  assert.equal(guaranteed.quote(gear({ refineLevel: 14 })).successRate, .05);
  const maximum = gear({ refineLevel: 15 });
  unchangedOnFailure(() => guaranteed.refine(maximum, funds), [maximum, funds]);
}

// Protection items have separate guarantees and each is consumed once per attempt.
{
  let item = gear({ refineLevel: 4 }), funds = wallet();
  let system = new RefineSystem({ rng: sequence(.9, .94) });
  let result = system.refine(item, funds, { useBlessedOre: true });
  assert.equal(result.outcome, 'stay'); assert.equal(funds.materials.blessedOre, 9);
  item = gear({ refineLevel: 4 }); funds = wallet();
  result = new RefineSystem({ rng: sequence(.9, .99) }).refine(item, funds, { useBlessedOre: true });
  assert.equal(result.outcome, 'damaged');
  item = gear({ refineLevel: 4 }); funds = wallet();
  result = new RefineSystem({ rng: sequence(.9, .9) }).refine(item, funds, { useProtectionStone: true });
  assert.equal(result.outcome, 'downgrade'); assert.equal(item.isDamaged, false);
  assert.equal(funds.materials.protectionStone, 9);
  item = gear({ refineLevel: 4 }); funds = wallet();
  result = new RefineSystem({ rng: sequence(.99, .999) }).refine(item, funds, { useBlessedOre: true, useProtectionStone: true });
  assert.equal(result.outcome, 'stay'); assert.equal(item.refineLevel, 4); assert.equal(item.isDamaged, false);
  close(result.outcomeProbabilities.stay, .5);
  funds.materials.protectionStone = 0;
  unchangedOnFailure(() => system.refine(item, funds, { useProtectionStone: true }), [item, funds]);
  unchangedOnFailure(() => system.refine(item, funds, { useBlessedOre: 'yes' }), [item, funds]);
}

// Safe Refine is an expensive deterministic recipe, restricted to targets +5..+8.
{
  const system = new RefineSystem({ rng: () => { throw Error('Safe must not draw'); } });
  const item = gear({ refineLevel: 4 }), funds = wallet();
  let quote = system.quote(item, { safe: true });
  assert.equal(quote.costMultiplier, 4); assert.equal(quote.successRate, 1);
  assert.deepEqual(quote.costs, { zeny: 1000000, materials: { oridecon: 12 } });
  assert.equal(system.refine(item, funds, { safe: true }).outcome, 'success'); assert.equal(item.refineLevel, 5);
  assert.equal(system.quote(gear({ refineLevel: 5 }), { safe: true }).costMultiplier, 5);
  assert.equal(system.quote(gear({ refineLevel: 6 }), { safe: true }).costMultiplier, 7);
  assert.equal(system.quote(gear({ refineLevel: 7 }), { safe: true }).costMultiplier, 8);
  for (const level of [0, 3, 8, 14]) assert.equal(system.quote(gear({ refineLevel: level }), { safe: true }).ok, false);
  unchangedOnFailure(() => system.refine(item, funds, { safe: true, useBlessedOre: true }), [item, funds]);
}

// Invalid RNG, including a bad second roll, must leave costs and equipment untouched.
{
  for (const rng of [() => NaN, () => Infinity, () => -1, () => 1, sequence(.9, NaN), () => { throw Error('RNG down'); }]) {
    const item = gear({ refineLevel: 4 }), funds = wallet();
    assert.equal(unchangedOnFailure(() => new RefineSystem({ rng }).refine(item, funds), [item, funds]).error.code, 'INVALID_RANDOM');
  }
}

// Damaged gear stays equippable but blocks every progression method until repair.
{
  const system = new RefineSystem(), item = gear({ upgradeLevel: 20, refineLevel: 8, isDamaged: true,
    enchantSlots: [{ stat: 'STR', value: 12, city: 'Lumina' }, null, null] });
  const funds = wallet(), duplicate = gear({ id: 'sword-2' }), inventory = [item, duplicate];
  assert(item.getStats().ATK > 100);
  unchangedOnFailure(() => system.refine(item, funds), [item, funds]);
  unchangedOnFailure(() => new UpgradeSystem().upgrade(item, funds), [item, funds]);
  unchangedOnFailure(() => new EnchantSystem().enchant(item, funds, 'Lumina'), [item, funds]);
  unchangedOnFailure(() => system.repair(item, funds, inventory, item.id), [item, funds, inventory]);
  for (const patch of [{ templateId: 'other' }, { bound: true }, { isDamaged: true }, { upgradeLevel: 1 }, { refineLevel: 1 },
    { enchantSlots: [{ stat: 'STR', value: 1 }, null, null] }, { cardSlots: [{ id: 'card' }] }]) {
    const bad = gear({ id: 'bad', ...patch }), entries = [item, bad];
    unchangedOnFailure(() => system.repair(item, funds, entries, 'bad'), [item, funds, entries]);
  }
  const empty = wallet({ zeny: 0 });
  unchangedOnFailure(() => system.repair(item, empty, inventory, duplicate.id), [item, empty, inventory]);
  const result = system.repair(item, funds, inventory, duplicate.id);
  assert.equal(result.outcome, 'repaired'); assert.equal(result.costs.zeny, 200000);
  assert.equal(item.isDamaged, false); assert.equal(item.refineLevel, 8); assert.equal(item.upgradeLevel, 20);
  assert.equal(item.enchantSlots[0].value, 12); assert.deepEqual(inventory, [item]);
  unchangedOnFailure(() => system.repair(item, funds, inventory, 'missing'), [item, funds, inventory]);
}

// City pools, inclusive ranges, duplicate rolls and the doubled price of one locked slot.
{
  const item = gear(), funds = wallet();
  const lumina = new EnchantSystem({ rng: sequence(0, 0, .999999, .999999, 0, 0) });
  let result = lumina.enchant(item, funds, 'Lumina');
  assert.equal(result.outcome, 'rerolled'); assert.equal(funds.materials.luminaStone, 9995); assert.equal(funds.zeny, 999995000);
  assert.deepEqual(item.enchantSlots, [{ stat: 'STR', value: 1, city: 'Lumina' }, { stat: 'LUK', value: 12, city: 'Lumina' }, { stat: 'STR', value: 1, city: 'Lumina' }]);
  const locked = { ...item.enchantSlots[1] };
  const emberfall = new EnchantSystem({ rng: sequence(0, 0, .999999, .999999) });
  result = emberfall.enchant(item, funds, 'Emberfall', 1);
  assert.equal(result.costs.zeny, 10000); assert.equal(result.costs.materials.emberfallStone, 10);
  assert.deepEqual(item.enchantSlots[1], locked);
  assert.deepEqual(item.enchantSlots[0], { stat: 'ATK_PERCENT', value: .005, city: 'Emberfall' });
  assert.deepEqual(item.enchantSlots[2], { stat: 'CRIT_DMG_PERCENT', value: .06, city: 'Emberfall' });
  const hp = gear();
  new EnchantSystem({ rng: sequence(.45, 0, .749999, .999999, .75, 0) }).enchant(hp, funds, 'Emberfall');
  assert.equal(hp.enchantSlots[0].stat, 'HP_PERCENT'); assert.equal(hp.enchantSlots[0].value, .01);
  assert.equal(hp.enchantSlots[1].value, .05); assert.equal(hp.enchantSlots[2].stat, 'CRIT_DMG_PERCENT');
  for (const lock of [-1, 3, .5, [0, 1], '1', undefined]) {
    // undefined is the default no-lock parameter and therefore valid, checked separately below.
    if (lock !== undefined) unchangedOnFailure(() => emberfall.enchant(item, funds, 'Lumina', lock), [item, funds]);
  }
  const empty = gear(); unchangedOnFailure(() => emberfall.enchant(empty, funds, 'Lumina', 0), [empty, funds]);
  unchangedOnFailure(() => emberfall.enchant(item, funds, 'Unknown'), [item, funds]);
  const low = wallet({ zeny: 9999 }); unchangedOnFailure(() => emberfall.enchant(item, low, 'Lumina', 0), [item, low]);
  const rngBroken = new EnchantSystem({ rng: sequence(0, 0, .5, NaN) });
  unchangedOnFailure(() => rngBroken.enchant(item, funds, 'Lumina'), [item, funds]);
}

// Contribution shares total 1; last hit is only 3%, zero categories are redistributed.
const parties = [
  { id: 'A', damageDealt: 60, damageTaken: 10, healingDone: 0, firstHit: true, lastHit: false },
  { id: 'B', damageDealt: 30, damageTaken: 60, healingDone: 20, firstHit: false, lastHit: false },
  { id: 'C', damageDealt: 10, damageTaken: 30, healingDone: 80, firstHit: false, lastHit: true }
];
{
  const calculator = new MVPDropCalculator();
  const result = calculator.calculate(parties);
  result.scores.forEach((party, index) => close(party.score, [.365, .325, .310][index]));
  close(result.totalScore, 1); close(result.activeWeight, 1);
  const noHealing = parties.map(party => ({ ...party, healingDone: 0 }));
  const adjusted = calculator.calculate(noHealing);
  close(adjusted.activeWeight, .8); close(adjusted.totalScore, 1);
  const tie = [
    { id: 'X', damageDealt: 0, damageTaken: 0, healingDone: 0, firstHit: true, lastHit: false },
    { id: 'Y', damageDealt: 0, damageTaken: 0, healingDone: 0, firstHit: true, lastHit: false }
  ];
  assert.equal(calculator.calculate(tie).scores[0].score, .5);
  const excluded = calculator.calculate(parties.map(party => ({ ...party, eligible: party.id !== 'B' })));
  assert.equal(excluded.scores.length, 2); assert.equal(excluded.excludedPartyCount, 1); close(excluded.totalScore, 1);
  const huge = parties.map(party => ({ ...party, damageDealt: 1e308 }));
  assert.equal(calculator.calculate(huge).ok, true); close(calculator.calculate(huge).totalScore, 1);
  assert.equal(calculator.calculate([...parties, parties[0]]).ok, false);
  for (const metric of ['damageDealt', 'damageTaken', 'healingDone']) {
    for (const value of [NaN, Infinity, -1, '10']) assert.equal(calculator.calculate([{ ...parties[0], [metric]: value }]).ok, false);
  }
  assert.equal(calculator.calculate([{ ...parties[0], firstHit: 1 }]).ok, false);
  assert.equal(calculator.calculate([{ ...parties[0], eligible: 'yes' }]).ok, false);
}

// Rare-drop gate and recipient selection are separate draws with exact boundary behavior.
{
  assert.equal(new MVPDropCalculator({ rng: sequence(.01) }).roll(parties).dropped, false);
  assert.equal(new MVPDropCalculator({ rng: sequence(.009999, 0) }).roll(parties).winnerId, 'A');
  assert.equal(new MVPDropCalculator({ rng: sequence(.009, .365) }).roll(parties).winnerId, 'B');
  const contribution = new MVPDropCalculator().calculate(parties);
  const thirdPartyBoundary = (contribution.scores[0].score + contribution.scores[1].score) / contribution.totalScore;
  assert.equal(new MVPDropCalculator({ rng: sequence(.009, thirdPartyBoundary) }).roll(parties).winnerId, 'C');
  assert.equal(new MVPDropCalculator({ rng: sequence(.999999) }).roll(parties, { rareDropChance: 1 }).winnerId, 'C');
  const neverRandom = new MVPDropCalculator({ rng: () => { throw Error('No draw expected'); } });
  assert.equal(neverRandom.roll(parties, { rareDropChance: 0 }).dropped, false);
  assert.equal(neverRandom.roll([]).reason, 'NO_CONTRIBUTION');
  const allzero = [{ id: 'Z', damageDealt: 0, damageTaken: 0, healingDone: 0, firstHit: false, lastHit: false }];
  assert.equal(neverRandom.calculate(allzero).totalScore, 0);
  assert.equal(neverRandom.roll(allzero, { rareDropChance: 1 }).reason, 'NO_CONTRIBUTION');
  for (const chance of [-1, 1.01, NaN, Infinity]) assert.equal(neverRandom.roll(parties, { rareDropChance: chance }).ok, false);
  assert.equal(neverRandom.roll(parties, null).ok, false);
  assert.equal(new MVPDropCalculator({ rng: sequence(.009, 1) }).roll(parties).error.code, 'INVALID_RANDOM');
  assert.deepEqual(parties[0], { id: 'A', damageDealt: 60, damageTaken: 10, healingDone: 0, firstHit: true, lastHit: false });
}

// Script also exposes the same public API in a normal browser without CommonJS.
{
  const context = { window: {} };
  context.globalThis = context.window;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../systems/equipment-progression.js'), 'utf8'), context);
  assert.equal(typeof context.window.EquipmentProgression.Equipment, 'function');
  assert.equal(typeof context.window.EquipmentProgression.MVPDropCalculator, 'function');
}

console.log('PASS: modular progression — stat formula, upgrade costs/caps, refine probability boundaries, protections, safe refine, repair, transaction atomicity, enchant pools/lock, weighted MVP rarity gate, invalid inputs and browser/CommonJS exports.');
