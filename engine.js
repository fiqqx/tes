(function (global) {
  'use strict';
  var SAVE_KEY = 'aetheria-save-v1';
  var RATES = [100, 100, 95, 85, 75, 65, 55, 45, 35, 25, 20, 15, 12, 10, 8];
  var clone = function (value) { return JSON.parse(JSON.stringify(value)); };
  var clamp = function (value, low, high) { return Math.max(low, Math.min(high, value)); };
  function freeze(value) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.keys(value).forEach(function (key) { freeze(value[key]); });
      Object.freeze(value);
    }
    return value;
  }
  function dayKey(timestamp) { return new Date(timestamp).toISOString().slice(0, 10); }
  function refreshDaily(state, timestamp) {
    var date = dayKey(timestamp);
    if (!state.daily || state.daily.date !== date) {
      state.daily = { date: date, adventures: 0, refines: 0, bossKills: 0 };
      state.quests.forEach(function (quest) { quest.claimed = false; });
    }
  }
  function refineInfo(item) {
    var multiplier = 1 + item.refine * 0.12;
    var nextMultiplier = 1 + Math.min(15, item.refine + 1) * 0.12;
    var stats = function (factor) { return { atk: Math.round(item.baseAtk * factor), def: Math.round(item.baseDef * factor), hp: Math.round((item.baseHp || 0) * factor) }; };
    return {
      chance: item.refine < 15 ? RATES[item.refine] : 0, successRate: item.refine < 15 ? RATES[item.refine] : 0,
      cost: (item.refine + 1) * 4000, zenyCost: (item.refine + 1) * 4000,
      material: item.id === 'weapon' ? 'oridecon' : 'elunium', materialCost: Math.max(1, Math.ceil((item.refine + 1) / 2)),
      protectionCost: 1, maxRefine: 15, currentStats: stats(multiplier), nextStats: stats(nextMultiplier), currentRefine: item.refine, nextRefine: Math.min(15, item.refine + 1)
    };
  }
  function recalculate(state, refill) {
    var atk = 0, def = 0, hp = 0;
    state.equipment.forEach(function (item) {
      item.refineInfo = refineInfo(item);
      item.atk = item.refineInfo.currentStats.atk;
      item.def = item.refineInfo.currentStats.def;
      item.hp = item.refineInfo.currentStats.hp;
      item.power = Math.round(item.atk * 12 + item.def * 14 + item.hp * 0.65);
      item.refineChance = item.refineInfo.chance;
      item.refineCost = item.refineInfo.cost;
      if (item.equipped !== false) { atk += item.atk; def += item.def; hp += item.hp; }
    });
    var player = state.player;
    player.atk = 250 + (player.level - 28) * 15 + atk;
    player.def = 105 + (player.level - 28) * 9 + def;
    player.maxHp = 3200 + (player.level - 28) * 135 + hp;
    player.hp = refill ? player.maxHp : clamp(player.hp || player.maxHp, 1, player.maxHp);
    player.power = Math.round(player.atk * 12 + player.def * 14 + player.level * 84 + player.maxHp * 0.65);
    ['quests', 'achievements'].forEach(function (group) {
      state[group].forEach(function (quest) {
        var counters = group === 'quests' && state.daily ? state.daily : state.stats;
        quest.progress = Math.min(quest.target, counters[quest.stat] || 0);
        quest.completed = quest.progress >= quest.target;
        quest.claimable = quest.completed && !quest.claimed;
      });
    });
    state.unreadMail = state.mail.filter(function (mail) { return !mail.claimed; }).length;
  }
  function initialState(clock) {
    var timestamp = typeof clock === 'function' ? clock() : Date.now();
    var state = {
      version: 1,
      player: { name: 'Aerin', class: 'Knight', title: 'Guardian of the Dawn', level: 28, exp: 3850, maxExp: 6200, hp: 1, maxHp: 1, atk: 0, def: 0, power: 0, avatar: 'knight', vip: 3 },
      currencies: { zeny: 1284500, crystals: 2400 },
      materials: { oridecon: 48, elunium: 32, protection: 5, potion: 12 },
      guild: { name: 'The Wayfarers', level: 7, role: 'Adventurer', contribution: 1250, members: 38, maxMembers: 50, motto: 'One journey. A thousand stories.', rank: 12 },
      equipment: [
        { id: 'weapon', name: 'Dawnbringer', slot: 'Weapon', type: 'Pedang dua tangan', rarity: 'legendary', refine: 4, baseAtk: 180, baseDef: 0, baseHp: 0, icon: 'sword', equipped: true, description: 'Pedang penjaga fajar, ditempa dari cahaya bintang.' },
        { id: 'armor', name: 'Guardian Plate', slot: 'Armor', type: 'Armor berat', rarity: 'epic', refine: 3, baseAtk: 0, baseDef: 92, baseHp: 420, icon: 'armor', equipped: true, description: 'Pelindung kokoh dengan ukiran sumpah para kesatria.' },
        { id: 'shield', name: 'Aegis of Light', slot: 'Shield', type: 'Perisai', rarity: 'epic', refine: 2, baseAtk: 0, baseDef: 68, baseHp: 180, icon: 'shield', equipped: true, description: 'Berkah cahaya melindungi pemiliknya dari serangan musuh.' },
        { id: 'boots', name: 'Windwalker Boots', slot: 'Boots', type: 'Sepatu', rarity: 'rare', refine: 2, baseAtk: 0, baseDef: 36, baseHp: 160, icon: 'boots', equipped: true, description: 'Langkah ringan untuk perjalanan melintasi Aetheria.' },
        { id: 'ring', name: 'Celestial Ring', slot: 'Ring', type: 'Aksesori', rarity: 'epic', refine: 1, baseAtk: 42, baseDef: 12, baseHp: 0, icon: 'ring', equipped: true, description: 'Cincin dengan kristal yang menyimpan kekuatan langit.' },
        { id: 'necklace', name: 'Heart of Aurora', slot: 'Necklace', type: 'Aksesori', rarity: 'rare', refine: 0, baseAtk: 30, baseDef: 18, baseHp: 140, icon: 'gem', equipped: true, description: 'Permata aurora yang menghangatkan jiwa petualang.' }
      ],
      regions: [
        { id: 'forest', name: 'Whispering Forest', subtitle: 'Hutan berbisik', level: 1, recommendedLevel: 25, exp: 1150, zeny: 12000, material: 'oridecon', theme: 'forest', description: 'Jelajahi reruntuhan kuno di balik pepohonan zamrud.' },
        { id: 'volcano', name: 'Emberfall Peaks', subtitle: 'Puncak bara', level: 30, recommendedLevel: 40, exp: 1900, zeny: 21500, material: 'elunium', theme: 'volcano', description: 'Taklukkan makhluk api di kaki gunung yang membara.' },
        { id: 'tundra', name: 'Frostveil Tundra', subtitle: 'Dataran es', level: 40, recommendedLevel: 50, exp: 2800, zeny: 34000, material: 'oridecon', theme: 'tundra', description: 'Temukan rahasia kerajaan salju yang terlupakan.' }
      ],
      bosses: [
        { id: 'verdant', name: 'Verdant Warden', title: 'Guardian of the Ancient Grove', level: 35, region: 'Whispering Forest', regionId: 'forest', hp: 6200, maxHp: 6200, atk: 540, def: 85, element: 'Earth', theme: 'forest', icon: 'tree', status: 'alive', rewards: { zeny: 125000, crystals: 80, exp: 3200, oridecon: 8, elunium: 4 }, description: 'Penjaga hutan purba telah terbangun. Taklukkan amukan akar dan rebut berkah alam.' },
        { id: 'ignis', name: 'Ignis Behemoth', title: 'Tyrant of the Burning Peaks', level: 45, region: 'Emberfall Peaks', regionId: 'volcano', hp: 10800, maxHp: 10800, atk: 740, def: 135, element: 'Fire', theme: 'volcano', icon: 'flame', status: 'alive', rewards: { zeny: 220000, crystals: 120, exp: 5400, oridecon: 12, elunium: 8 }, description: 'Raksasa bara dengan serangan dahsyat. Tingkatkan equipment sebelum menantangnya.' },
        { id: 'frost', name: 'Frostborne Queen', title: 'Sovereign of the Eternal Winter', level: 55, region: 'Frostveil Tundra', regionId: 'tundra', hp: 16400, maxHp: 16400, atk: 1020, def: 190, element: 'Water', theme: 'tundra', icon: 'snowflake', status: 'alive', rewards: { zeny: 360000, crystals: 180, exp: 8200, oridecon: 18, elunium: 12 }, description: 'Penguasa musim dingin abadi menanti penantang terkuat di takhtanya.' }
      ],
      skills: [
        { id: 'slash', name: 'Power Slash', description: 'Serangan pedang yang kuat.', icon: 'sword', cooldown: 0, damage: '115% ATK' },
        { id: 'cleave', name: 'Whirlwind', description: 'Tebasan cahaya dengan damage besar.', icon: 'zap', cooldown: 2, damage: '210% ATK' },
        { id: 'heal', name: 'Restore', description: 'Pulihkan 38% HP maksimum.', icon: 'heart', cooldown: 3, damage: '+38% HP' }
      ],
      quests: [
        { id: 'daily-adventure', title: 'Petualangan Tanpa Batas', description: 'Selesaikan 5 petualangan hari ini', stat: 'adventures', target: 5, claimed: false, rewards: { zeny: 35000, exp: 1200, oridecon: 3 }, icon: 'compass' },
        { id: 'daily-refine', title: 'Sentuhan Sang Pandai Besi', description: 'Lakukan refine equipment 3 kali', stat: 'refines', target: 3, claimed: false, rewards: { zeny: 25000, elunium: 4, protection: 1 }, icon: 'hammer' },
        { id: 'daily-mvp', title: 'Pemburu Legenda', description: 'Kalahkan 1 MVP boss', stat: 'bossKills', target: 1, claimed: false, rewards: { zeny: 60000, crystals: 100, exp: 2000 }, icon: 'crown' }
      ],
      achievements: [
        { id: 'first-refine', title: 'Percikan Pertama', description: 'Berhasil melakukan refine pertama', stat: 'successfulRefines', target: 1, claimed: false, rewards: { crystals: 100 } },
        { id: 'first-mvp', title: 'Nama dalam Legenda', description: 'Kalahkan MVP pertamamu', stat: 'bossKills', target: 1, claimed: false, rewards: { crystals: 200, protection: 2 } },
        { id: 'explorer', title: 'Penjelajah Aetheria', description: 'Selesaikan 20 petualangan', stat: 'adventures', target: 20, claimed: false, rewards: { crystals: 250, oridecon: 10 } }
      ],
      shop: [
        { id: 'oridecon', name: 'Oridecon', description: 'Material refine senjata', price: 3500, currency: 'zeny', icon: 'gem', rarity: 'rare' },
        { id: 'elunium', name: 'Elunium', description: 'Material refine armor & aksesori', price: 2500, currency: 'zeny', icon: 'gem', rarity: 'rare' },
        { id: 'protection', name: 'Protection Stone', description: 'Mencegah penurunan refine saat gagal', price: 80, currency: 'crystals', icon: 'shield', rarity: 'epic' },
        { id: 'potion', name: 'Healing Potion', description: 'Pulihkan 45% HP saat pertarungan', price: 1800, currency: 'zeny', icon: 'flask', rarity: 'common' }
      ],
      events: [
        { id: 'dawn-festival', title: 'Festival of Dawn', subtitle: 'Petualangan baru menantimu', description: 'Kumpulkan hadiah misi harian dan taklukkan MVP.', label: 'EVENT SPESIAL', icon: 'sparkles' },
        { id: 'refine-event', title: 'Forge Your Legacy', subtitle: 'Bangun kekuatanmu', description: 'Upgrade equipment hingga +15 dan jadilah legenda Aetheria.', label: 'REFINE CHALLENGE', icon: 'hammer' }
      ],
      activities: [
        { id: 'welcome', type: 'system', title: 'Selamat datang di Aetheria!', message: 'Perjalanan baru dimulai. Taklukkan duniamu.', text: 'Perjalanan baru dimulai. Taklukkan duniamu.', time: null, timeLabel: 'Baru saja', icon: 'sparkles' },
        { id: 'boss-ready', type: 'boss', title: 'Verdant Warden telah muncul', message: 'MVP boss menanti di Whispering Forest.', text: 'MVP boss menanti di Whispering Forest.', time: null, timeLabel: '2 menit lalu', icon: 'crown' },
        { id: 'gift-ready', type: 'reward', title: 'Hadiah petualang tersedia', message: 'Ambil 300 Crystal dan 5 potion dari kotak surat.', text: 'Ambil 300 Crystal dan 5 potion dari kotak surat.', time: null, timeLabel: '5 menit lalu', icon: 'gift' }
      ],
      mail: [{ id: 'welcome-gift', title: 'Hadiah Petualang Baru', message: 'Selamat datang di Aetheria! Bekal kecil untuk perjalanan besarmu.', claimed: false, rewards: { crystals: 300, potion: 5 } }],
      unreadMail: 1, combat: null, stats: { adventures: 2, refines: 0, successfulRefines: 0, bossKills: 0, totalZenyEarned: 0 },
      daily: { date: dayKey(timestamp), adventures: 2, refines: 0, bossKills: 0 },
      lastAdventure: null, lastRefine: null, settings: { sound: false }, createdAt: timestamp, updatedAt: timestamp
    };
    recalculate(state, true);
    return state;
  }

  function createGame(options) {
    options = options || {};
    var random = typeof options.random === 'function' ? options.random : Math.random;
    var clock = typeof options.now === 'function' ? options.now : Date.now;
    var storage;
    try { storage = options.storage !== undefined ? options.storage : global.localStorage; } catch (error) { storage = null; }
    var listeners = new Set();
    var current = initialState(clock);
    try {
      var raw = storage && storage.getItem(SAVE_KEY);
      var saved = raw && JSON.parse(raw);
      if (saved && saved.version === 1 && saved.player && saved.currencies && saved.materials) {
        if (typeof saved.player.name === 'string') current.player.name = saved.player.name.slice(0, 24) || 'Aerin';
        ['level', 'exp', 'maxExp', 'hp'].forEach(function (key) { if (Number.isFinite(saved.player[key]) && saved.player[key] >= 0) current.player[key] = saved.player[key]; });
        current.player.level = clamp(Math.floor(current.player.level), 28, 99);
        current.player.maxExp = Math.max(6200, current.player.maxExp);
        ['zeny', 'crystals'].forEach(function (key) { if (Number.isFinite(saved.currencies[key])) current.currencies[key] = Math.max(0, Math.floor(saved.currencies[key])); });
        Object.keys(current.materials).forEach(function (key) { if (Number.isFinite(saved.materials[key])) current.materials[key] = Math.max(0, Math.floor(saved.materials[key])); });
        current.equipment.forEach(function (item) {
          var previous = Array.isArray(saved.equipment) && saved.equipment.find(function (entry) { return entry && entry.id === item.id; });
          if (previous && Number.isFinite(previous.refine)) item.refine = clamp(Math.floor(previous.refine), 0, 15);
          if (previous && typeof previous.equipped === 'boolean') item.equipped = previous.equipped;
        });
        Object.keys(current.stats).forEach(function (key) { if (saved.stats && Number.isFinite(saved.stats[key])) current.stats[key] = Math.max(0, Math.floor(saved.stats[key])); });
        if (saved.daily && typeof saved.daily.date === 'string') {
          current.daily.date = saved.daily.date;
          ['adventures', 'refines', 'bossKills'].forEach(function (key) { current.daily[key] = Number.isFinite(saved.daily[key]) ? Math.max(0, Math.floor(saved.daily[key])) : 0; });
        }
        ['quests', 'achievements', 'mail'].forEach(function (group) {
          current[group].forEach(function (entry) {
            var previous = Array.isArray(saved[group]) && saved[group].find(function (item) { return item && item.id === entry.id; });
            if (previous && previous.claimed === true) entry.claimed = true;
          });
        });
        if (Array.isArray(saved.activities)) current.activities = saved.activities.filter(function (entry) { return entry && typeof entry.title === 'string' && typeof entry.message === 'string'; }).slice(0, 16);
        if (saved.guild && Number.isFinite(saved.guild.contribution)) current.guild.contribution = Math.max(0, Math.floor(saved.guild.contribution));
        if (saved.settings && typeof saved.settings.sound === 'boolean') current.settings.sound = saved.settings.sound;
        if (Number.isFinite(saved.createdAt)) current.createdAt = saved.createdAt;
        if (saved.combat && current.bosses.some(function (boss) { return boss.id === saved.combat.bossId; })) {
          var combat = saved.combat;
          if (['hp', 'maxHp', 'playerHp', 'turn'].every(function (key) { return Number.isFinite(combat[key]) && combat[key] >= 0; }) && combat.maxHp > 0 && Array.isArray(combat.log)) {
            current.combat = { bossId: combat.bossId, hp: Math.min(combat.hp, combat.maxHp), maxHp: combat.maxHp, playerHp: combat.playerHp, turn: Math.floor(combat.turn), won: combat.won === true, lost: combat.lost === true, active: combat.won !== true && combat.lost !== true, cooldowns: { slash: 0, cleave: 0, heal: 0 }, log: combat.log.filter(function (entry) { return typeof entry === 'string'; }).slice(0, 12), reward: combat.reward || null };
            ['cleave', 'heal'].forEach(function (key) { if (combat.cooldowns && Number.isFinite(combat.cooldowns[key])) current.combat.cooldowns[key] = clamp(Math.floor(combat.cooldowns[key]), 0, 4); });
          }
        }
        refreshDaily(current, clock());
        recalculate(current, false);
        if (current.combat) current.combat.playerHp = clamp(current.combat.playerHp, 0, current.player.maxHp);
      }
    } catch (error) { current = initialState(clock); }
    current = freeze(current);

    function publish(next) {
      recalculate(next, false);
      next.updatedAt = clock();
      current = freeze(next);
      try { if (storage) storage.setItem(SAVE_KEY, JSON.stringify(current)); } catch (error) { /* Storage may be unavailable in private browsing. */ }
      listeners.forEach(function (listener) { try { listener(current); } catch (error) { /* A view cannot interrupt completed game actions. */ } });
    }
    function activity(state, type, title, message, icon) {
      state.activities.unshift({ id: type + '-' + clock() + '-' + Math.floor(random() * 100000), type: type, title: title, message: message, text: message, icon: icon || 'sparkles', time: clock(), timeLabel: 'Baru saja' });
      state.activities = state.activities.slice(0, 16);
    }
    function reward(state, rewards) {
      var levels = 0;
      Object.keys(rewards).forEach(function (key) {
        var amount = rewards[key];
        if (!Number.isFinite(amount) || amount <= 0) return;
        if (key === 'zeny' || key === 'crystals') { state.currencies[key] += amount; if (key === 'zeny') state.stats.totalZenyEarned += amount; }
        else if (key === 'exp') state.player.exp += amount;
        else if (Object.prototype.hasOwnProperty.call(state.materials, key)) state.materials[key] += amount;
      });
      while (state.player.exp >= state.player.maxExp && state.player.level < 99) {
        state.player.exp -= state.player.maxExp;
        state.player.level += 1;
        state.player.maxExp = Math.round(state.player.maxExp * 1.12 / 10) * 10;
        levels += 1;
      }
      if (levels) {
        recalculate(state, true);
        if (state.combat && state.combat.active) state.combat.playerHp = state.player.maxHp;
        activity(state, 'level', 'Level naik!', 'Sekarang kamu mencapai level ' + state.player.level + '.', 'sparkles');
      }
      return levels;
    }
    function failure(message) { return { ok: false, message: message }; }

    function dispatch(action, payload) {
      if (action && typeof action === 'object') { payload = Object.assign({}, action.payload || {}, action); action = action.type || action.action; }
      payload = payload || {};
      if (action === 'reset') return reset();
      var next = clone(current), result;
      refreshDaily(next, clock());
      if (action === 'refine') {
        var item = next.equipment.find(function (entry) { return entry.id === payload.itemId; });
        if (!item) return failure('Pilih equipment yang ingin di-refine.');
        var details = refineInfo(item);
        if (item.refine >= 15) return failure('Equipment ini telah mencapai refine maksimum +15.');
        if (next.currencies.zeny < details.cost) return failure('Zeny tidak cukup untuk melakukan refine.');
        if (next.materials[details.material] < details.materialCost) return failure('Material ' + (details.material === 'oridecon' ? 'Oridecon' : 'Elunium') + ' tidak cukup.');
        if (payload.useProtection && next.materials.protection < details.protectionCost) return failure('Protection Stone tidak cukup.');
        next.currencies.zeny -= details.cost;
        next.materials[details.material] -= details.materialCost;
        if (payload.useProtection) next.materials.protection -= details.protectionCost;
        var previous = item.refine, success = random() * 100 < details.chance, downgraded = false;
        if (success) { item.refine += 1; next.stats.successfulRefines += 1; }
        else if (!payload.useProtection && item.refine >= 5) { item.refine -= 1; downgraded = true; }
        next.stats.refines += 1;
        next.daily.refines += 1;
        var message = success ? 'Refine berhasil! ' + item.name + ' kini +' + item.refine + '.' : downgraded ? 'Refine gagal. ' + item.name + ' turun menjadi +' + item.refine + '.' : 'Refine gagal. Level equipment tetap +' + item.refine + (payload.useProtection ? ' berkat Protection Stone.' : '.');
        result = { ok: true, success: success, message: message, itemId: item.id, refine: item.refine, previousRefine: previous, protected: !!payload.useProtection, downgraded: downgraded, cost: details };
        next.lastRefine = Object.assign({ time: clock() }, result);
        activity(next, 'refine', success ? 'Refine berhasil!' : 'Refine gagal', message, 'hammer');
      } else if (action === 'adventure') {
        if (next.combat && next.combat.active) return failure('Selesaikan pertarungan MVP terlebih dahulu.');
        var region = next.regions.find(function (entry) { return entry.id === (payload.regionId || 'forest'); });
        if (!region) return failure('Wilayah tidak ditemukan.');
        if (next.player.level < region.level) return failure('Wilayah ini terbuka pada level ' + region.level + '.');
        var rewards = { zeny: Math.round(region.zeny * (0.85 + random() * 0.3)), exp: region.exp };
        rewards[region.material] = 1 + Math.floor(random() * 3);
        if (random() < 0.22) rewards.potion = 1;
        next.stats.adventures += 1;
        next.daily.adventures += 1;
        var levels = reward(next, rewards);
        recalculate(next, true);
        var encounters = ['mengalahkan sekelompok monster liar', 'menemukan peti peninggalan kuno', 'menyelamatkan seorang pengelana', 'menuntaskan patroli di reruntuhan'];
        var encounter = encounters[Math.floor(random() * encounters.length)];
        var adventureMessage = 'Kamu ' + encounter + ' di ' + region.name + '. +' + rewards.zeny.toLocaleString('id-ID') + ' Zeny dan +' + rewards.exp.toLocaleString('id-ID') + ' EXP!';
        result = { ok: true, message: adventureMessage, rewards: rewards, regionId: region.id, leveledUp: levels > 0 };
        next.lastAdventure = Object.assign({ time: clock() }, result);
        activity(next, 'adventure', 'Petualangan selesai', adventureMessage, 'compass');
      } else if (action === 'startBoss') {
        var boss = next.bosses.find(function (entry) { return entry.id === payload.bossId; });
        if (!boss) return failure('MVP boss tidak ditemukan.');
        if (next.combat && next.combat.active) return failure('Selesaikan atau tinggalkan pertarungan yang sedang berlangsung.');
        next.combat = { bossId: boss.id, hp: boss.hp, maxHp: boss.hp, playerHp: next.player.maxHp, turn: 0, won: false, lost: false, active: true, cooldowns: { slash: 0, cleave: 0, heal: 0 }, log: ['Pertarungan melawan ' + boss.name + ' dimulai!'], reward: null };
        next.player.hp = next.player.maxHp;
        result = { ok: true, message: 'Pertarungan melawan ' + boss.name + ' dimulai!' };
      } else if (action === 'attackBoss' || action === 'usePotion') {
        var combat = next.combat;
        if (!combat || !combat.active || combat.won || combat.lost) return failure('Tidak ada pertarungan aktif. Pilih MVP untuk ditantang.');
        var target = next.bosses.find(function (entry) { return entry.id === combat.bossId; });
        var skillId = action === 'usePotion' ? 'potion' : (payload.skillId || 'slash');
        var skill = next.skills.find(function (entry) { return entry.id === skillId; });
        if (!skill && skillId !== 'potion') return failure('Skill tidak ditemukan.');
        if (skillId === 'potion' && next.materials.potion < 1) return failure('Healing Potion habis. Beli di Merchant.');
        if (combat.cooldowns[skillId] > 0) return failure('Skill belum siap. Tunggu ' + combat.cooldowns[skillId] + ' giliran lagi.');
        if ((skillId === 'heal' || skillId === 'potion') && combat.playerHp >= next.player.maxHp) return failure('HP kamu masih penuh.');
        Object.keys(combat.cooldowns).forEach(function (key) { combat.cooldowns[key] = Math.max(0, combat.cooldowns[key] - 1); });
        combat.turn += 1;
        var dealt = 0, healed = 0, critical = false;
        if (skillId === 'heal' || skillId === 'potion') {
          healed = Math.min(next.player.maxHp - combat.playerHp, Math.round(next.player.maxHp * (skillId === 'heal' ? 0.38 : 0.45)));
          combat.playerHp += healed;
          if (skillId === 'potion') next.materials.potion -= 1;
          else combat.cooldowns.heal = skill.cooldown;
          combat.log.unshift((skillId === 'potion' ? 'Healing Potion' : skill.name) + ' memulihkan ' + healed + ' HP.');
        } else {
          critical = random() < 0.18;
          dealt = Math.max(1, Math.round((next.player.atk * (skillId === 'cleave' ? 2.1 : 1.15) - target.def * 0.45) * (0.92 + random() * 0.16) * (critical ? 1.6 : 1)));
          combat.hp = Math.max(0, combat.hp - dealt);
          if (skillId === 'cleave') combat.cooldowns.cleave = skill.cooldown;
          combat.log.unshift(skill.name + (critical ? ' CRITICAL!' : '') + ' menghasilkan ' + dealt + ' damage.');
        }
        var taken = 0;
        if (combat.hp === 0) {
          combat.won = true; combat.active = false; combat.reward = clone(target.rewards);
          next.stats.bossKills += 1;
          next.daily.bossKills += 1;
          reward(next, target.rewards);
          combat.log.unshift('VICTORY! ' + target.name + ' dikalahkan. Hadiah MVP diterima!');
          activity(next, 'boss', 'MVP! ' + target.name + ' ditaklukkan', '+' + target.rewards.zeny.toLocaleString('id-ID') + ' Zeny, +' + target.rewards.crystals + ' Crystal, dan material langka.', 'crown');
        } else {
          var enraged = combat.turn % 4 === 0;
          taken = Math.max(60, Math.round((target.atk - next.player.def * 0.42) * (enraged ? 1.7 : 1) * (0.9 + random() * 0.2)));
          combat.playerHp = Math.max(0, combat.playerHp - taken);
          combat.log.unshift(target.name + (enraged ? ' mengamuk! ' : ' menyerang: ') + taken + ' damage.');
          if (combat.playerHp === 0) {
            combat.lost = true; combat.active = false;
            combat.log.unshift('Kamu terjatuh. Perkuat equipment dan coba kembali!');
            activity(next, 'battle', 'Pertarungan berakhir', 'Kalah melawan ' + target.name + '. Refine equipment untuk memperkuat karakter.', 'shield');
          }
        }
        next.player.hp = Math.max(1, combat.playerHp);
        combat.log = combat.log.slice(0, 12);
        result = { ok: true, message: combat.won ? 'MVP! ' + target.name + ' berhasil dikalahkan!' : combat.lost ? 'Kamu kalah. Refine equipment lalu coba lagi!' : dealt ? 'Memberikan ' + dealt + ' damage' + (critical ? ' CRITICAL!' : '.') : 'Memulihkan ' + healed + ' HP.', damage: dealt, damageTaken: taken, healed: healed, critical: critical, won: combat.won, lost: combat.lost, rewards: combat.won ? clone(target.rewards) : null };
      } else if (action === 'fleeBoss' || action === 'closeCombat') {
        if (next.combat && next.combat.active) activity(next, 'battle', 'Mundur dari pertarungan', 'Kamu kembali dengan selamat. Siapkan equipment dan coba lagi.', 'shield');
        next.combat = null;
        recalculate(next, true);
        result = { ok: true, message: 'Kembali ke kota dengan selamat.' };
      } else if (action === 'claimQuest' || action === 'claimAchievement') {
        var group = action === 'claimQuest' ? next.quests : next.achievements;
        var quest = group.find(function (item) { return item.id === (payload.questId || payload.achievementId); });
        if (!quest) return failure('Misi tidak ditemukan.');
        if (quest.claimed) return failure('Hadiah ini sudah diambil.');
        var questCounters = action === 'claimQuest' ? next.daily : next.stats;
        if ((questCounters[quest.stat] || 0) < quest.target) return failure('Selesaikan misi ini terlebih dahulu.');
        quest.claimed = true;
        reward(next, quest.rewards);
        activity(next, 'reward', 'Hadiah misi diterima', quest.title + ' selesai. Hadiah telah masuk ke inventori.', 'gift');
        result = { ok: true, message: 'Hadiah "' + quest.title + '" berhasil diambil!', rewards: clone(quest.rewards) };
      } else if (action === 'buy') {
        var product = next.shop.find(function (entry) { return entry.id === payload.itemId; });
        if (!product) return failure('Item tidak tersedia di toko.');
        var quantity = payload.quantity === undefined ? 1 : Number(payload.quantity);
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) return failure('Jumlah pembelian harus antara 1 hingga 999.');
        var total = product.price * quantity;
        if (next.currencies[product.currency] < total) return failure((product.currency === 'zeny' ? 'Zeny' : 'Crystal') + ' tidak cukup.');
        next.currencies[product.currency] -= total;
        next.materials[product.id] += quantity;
        result = { ok: true, message: 'Berhasil membeli ' + quantity + ' ' + product.name + '.', quantity: quantity, cost: total };
        activity(next, 'shop', 'Pembelian berhasil', result.message, 'shopping-bag');
      } else if (action === 'equip') {
        var equipment = next.equipment.find(function (entry) { return entry.id === payload.itemId; });
        if (!equipment) return failure('Equipment tidak ditemukan.');
        if (next.combat && next.combat.active) return failure('Equipment tidak dapat diubah saat bertarung.');
        equipment.equipped = payload.equipped === undefined ? !equipment.equipped : !!payload.equipped;
        result = { ok: true, message: equipment.name + (equipment.equipped ? ' digunakan.' : ' dilepas.') };
      } else if (action === 'claimMail') {
        var mails = next.mail.filter(function (entry) { return !entry.claimed && (!payload.mailId || entry.id === payload.mailId); });
        if (!mails.length) return failure('Tidak ada hadiah surat yang belum diambil.');
        var mailRewards = {};
        mails.forEach(function (entry) { entry.claimed = true; Object.keys(entry.rewards).forEach(function (key) { mailRewards[key] = (mailRewards[key] || 0) + entry.rewards[key]; }); });
        reward(next, mailRewards);
        activity(next, 'reward', 'Hadiah surat diterima', 'Bekal petualangan telah masuk ke inventori.', 'gift');
        result = { ok: true, message: 'Semua hadiah surat berhasil diambil!', rewards: mailRewards };
      } else if (action === 'rename') {
        var name = typeof payload.name === 'string' ? payload.name.trim().slice(0, 24) : '';
        if (!name) return failure('Nama karakter tidak boleh kosong.');
        next.player.name = name;
        result = { ok: true, message: 'Nama karakter diubah menjadi ' + name + '.' };
      } else if (action === 'contributeGuild') {
        if (next.currencies.zeny < 10000) return failure('Diperlukan 10.000 Zeny untuk kontribusi guild.');
        next.currencies.zeny -= 10000; next.guild.contribution += 100;
        result = { ok: true, message: 'Kontribusi +100! Terima kasih telah mendukung ' + next.guild.name + '.' };
        activity(next, 'guild', 'Kontribusi guild', result.message, 'flag');
      } else if (action === 'toggleSound') {
        next.settings.sound = !next.settings.sound;
        result = { ok: true, message: 'Suara ' + (next.settings.sound ? 'diaktifkan.' : 'dinonaktifkan.') };
      } else return failure('Aksi tidak dikenali.');
      publish(next);
      return result;
    }
    function reset() { publish(initialState(clock)); return { ok: true, message: 'Petualangan baru dimulai. Selamat datang kembali di Aetheria!' }; }
    return {
      getState: function () { return current; },
      getRefineInfo: function (itemId, useProtection) {
        var item = current.equipment.find(function (entry) { return entry.id === itemId; });
        if (!item) return null;
        var info = refineInfo(item);
        info.useProtection = !!useProtection;
        info.canAfford = current.currencies.zeny >= info.cost && current.materials[info.material] >= info.materialCost && (!useProtection || current.materials.protection >= info.protectionCost);
        return info;
      },
      subscribe: function (listener) {
        if (typeof listener !== 'function') throw new TypeError('Subscriber harus berupa fungsi.');
        listeners.add(listener);
        return function () { listeners.delete(listener); };
      }, dispatch: dispatch, reset: reset
    };
  }
  global.AetheriaEngine = Object.freeze({ createGame: createGame, saveKey: SAVE_KEY });
})(typeof window !== 'undefined' ? window : globalThis);
