/* 本地資料層 — 全部存在瀏覽器 localStorage，不上傳任何伺服器 */
(function (global) {
  'use strict';

  const KEY = 'ledger.v2';

  /* 依使用者試算表的真實開支分類（24 項＋10 項生活類）— icon 為圖示檔名 */
  const DEFAULT_CATEGORIES = [
    { id: 'meal',       name: '餐費',     nameEn: 'Meals',         emoji: '☕️', icon: 'meal',      color: '#E08A5B', budget: 0, archived: false },
    { id: 'drink',      name: '飲料',     nameEn: 'Drinks',        emoji: '🧋', icon: 'drink',     color: '#E7C46B', budget: 0, archived: false },
    { id: 'misc',       name: '雜費',     nameEn: 'Misc',          emoji: '📦', icon: 'misc',      color: '#A79E8C', budget: 0, archived: false },
    { id: 'clothing',   name: '治裝',     nameEn: 'Clothing',      emoji: '👔', icon: 'clothing',  color: '#B98BD9', budget: 0, archived: false },
    { id: 'housing',    name: '住房',     nameEn: 'Housing',       emoji: '🏠', icon: 'housing',   color: '#8FA6FF', budget: 0, archived: false },
    { id: 'transport',  name: '交通',     nameEn: 'Transport',     emoji: '🚗', icon: 'transport', color: '#6FB6E0', budget: 0, archived: false },
    { id: 'tuition',    name: '學費',     nameEn: 'Tuition',       emoji: '🎒', icon: 'tuition',   color: '#FF8FA3', budget: 0, archived: false },
    { id: 'fun',        name: '娛樂',     nameEn: 'Fun',           emoji: '🎮', icon: 'fun',       color: '#A98BF0', budget: 0, archived: false },
    { id: 'health',     name: '醫療',     nameEn: 'Health',        emoji: '💊', icon: 'health',    color: '#62C9B2', budget: 0, archived: false },
    { id: 'telecom',    name: '電信網路', nameEn: 'Telecom',       emoji: '📱', icon: 'telecom',   color: '#87A6C9', budget: 0, archived: false },
    { id: 'water',      name: '水費',     nameEn: 'Water',         emoji: '💧', icon: 'water',     color: '#5EC2E8', budget: 0, archived: false },
    { id: 'power',      name: '電費',     nameEn: 'Electricity',   emoji: '⚡️', icon: 'power',     color: '#F0C05A', budget: 0, archived: false },
    { id: 'gas',        name: '瓦斯',     nameEn: 'Gas',           emoji: '🔥', icon: 'gas',       color: '#FF9A5B', budget: 0, archived: false },
    { id: 'insurance',  name: '保險',     nameEn: 'Insurance',     emoji: '🛡️', icon: 'insurance', color: '#7DC98A', budget: 0, archived: false },
    { id: 'tax',        name: '稅金',     nameEn: 'Tax',           emoji: '💰', icon: 'tax',       color: '#C9B58F', budget: 0, archived: false },
    { id: 'parking',    name: '停車場',   nameEn: 'Parking',       emoji: '🅿️', icon: 'parking',   color: '#7FA8D9', budget: 0, archived: false },
    { id: 'tunnel',     name: '隧道',     nameEn: 'Tunnels',       emoji: '🚇', icon: 'tunnel',    color: '#9AB0A8', budget: 0, archived: false },
    { id: 'fuel',       name: '入油',     nameEn: 'Fuel',          emoji: '⛽️', icon: 'fuel',      color: '#FF7A66', budget: 0, archived: false },
    { id: 'carcare',    name: '驗車及保', nameEn: 'Car care',      emoji: '🔧', icon: 'carcare',   color: '#C08A6A', budget: 0, archived: false },
    { id: 'salary',     name: '工人薪金', nameEn: 'Helper salary', emoji: '👷', icon: 'salary',    color: '#98C97F', budget: 0, archived: false },
    { id: 'rates',      name: '差餉',     nameEn: 'Rates',         emoji: '🧾', icon: 'rates',     color: '#BDB49F', budget: 0, archived: false },
    { id: 'household',  name: '家庭用品', nameEn: 'Household',     emoji: '🧹', icon: 'household', color: '#A8C98F', budget: 0, archived: false },
    { id: 'homeuse',    name: '家用',     nameEn: 'Home use',      emoji: '🏡', icon: 'homeuse',   color: '#B99FD9', budget: 0, archived: false },
    { id: 'lpg',        name: '石油汽',   nameEn: 'LPG',           emoji: '🛢️', icon: 'lpg',       color: '#E8906A', budget: 0, archived: false },
    /* 國外家庭開支常見、原表未含的生活類項目 */
    { id: 'laundry',    name: '洗衣',     nameEn: 'Laundry',       emoji: '🧺', icon: 'laundry',   color: '#7FC8C0', budget: 0, archived: false },
    { id: 'pets',       name: '寵物',     nameEn: 'Pets',          emoji: '🐾', icon: 'pets',      color: '#D9A05B', budget: 0, archived: false },
    { id: 'beauty',     name: '美容理髮', nameEn: 'Beauty',        emoji: '💇', icon: 'beauty',    color: '#E38BA8', budget: 0, archived: false },
    { id: 'fitness',    name: '健身',     nameEn: 'Fitness',       emoji: '👟', icon: 'fitness',   color: '#8BD46E', budget: 0, archived: false },
    { id: 'subs',       name: '訂閱',     nameEn: 'Subscriptions', emoji: '💳', icon: 'subs',      color: '#7E9CE8', budget: 0, archived: false },
    { id: 'gifts',      name: '禮物捐款', nameEn: 'Gifts & giving',emoji: '🎁', icon: 'gifts',     color: '#D8776E', budget: 0, archived: false },
    { id: 'travel',     name: '旅遊',     nameEn: 'Travel',        emoji: '✈️', icon: 'travel',    color: '#5FB8D8', budget: 0, archived: false },
    { id: 'repairs',    name: '居家維修', nameEn: 'Home repairs',  emoji: '🔨', icon: 'repairs',   color: '#B99A6B', budget: 0, archived: false },
    { id: 'alcohol',    name: '煙酒',     nameEn: 'Alcohol & tobacco', emoji: '🍷', icon: 'alcohol', color: '#B5697A', budget: 0, archived: false },
    { id: 'childcare',  name: '托嬰',     nameEn: 'Childcare',     emoji: '🍼', icon: 'childcare', color: '#74B8A8', budget: 0, archived: false }
  ];

  const DEFAULT_SETTINGS = {
    currency: 'HK$',
    monthlyBudget: 0,
    lang: 'zh',
    catSchema: 2,
    pinEnabled: false,
    pinHash: '',
    pinSalt: '',
    createdAt: Date.now()
  };

  function blankState() {
    return {
      version: 2,
      entries: [],
      categories: DEFAULT_CATEGORIES.map(function (c) { return Object.assign({}, c); }),
      settings: Object.assign({}, DEFAULT_SETTINGS)
    };
  }

  /* v1 → v2 分類 id 對照（若使用者曾用舊版記帳） */
  const LEGACY_MAP = {
    food: 'meal', drink: 'drink', transport: 'transport', home: 'housing',
    daily: 'household', fun: 'fun', health: 'health', telecom: 'telecom',
    insurance: 'insurance', tax: 'tax', other: 'misc'
  };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return normalize(JSON.parse(raw));
      const legacy = localStorage.getItem('ledger.v1');
      if (legacy) return migrateV1(JSON.parse(legacy));
      return blankState();
    } catch (e) {
      console.warn('load failed', e);
      return blankState();
    }
  }

  function migrateV1(data) {
    const out = blankState();
    if (data && Array.isArray(data.entries)) {
      out.entries = data.entries.map(function (e) {
        const mapped = LEGACY_MAP[e.categoryId] || (DEFAULT_CATEGORIES.some(function (c) { return c.id === e.categoryId; }) ? e.categoryId : 'misc');
        return cleanEntry(Object.assign({}, e, { categoryId: mapped }));
      });
    }
    if (data && data.settings) {
      out.settings = Object.assign(out.settings, data.settings, {
        currency: data.settings.currency === 'NT$' ? 'HK$' : (data.settings.currency || 'HK$')
      });
    }
    try { localStorage.setItem(KEY, JSON.stringify(out)); } catch (e) { /* ignore */ }
    return out;
  }

  function normalize(data) {
    const base = blankState();
    if (!data || typeof data !== 'object') return base;
    const defaultsById = {};
    DEFAULT_CATEGORIES.forEach(function (c) { defaultsById[c.id] = c; });

    const categories = (Array.isArray(data.categories) && data.categories.length
      ? data.categories
      : base.categories
    ).map(function (c) {
      const clean = cleanCategory(c);
      const d = defaultsById[clean.id];
      if (d) {
        // 舊資料沒有 nameEn / icon 欄位時，由內建預設補上
        if (!clean.nameEn) clean.nameEn = d.nameEn;
        if (!clean.icon) clean.icon = d.icon;
      }
      return clean;
    });

    // 一次性遷移：把之後新增的內建分類補進既有清單（不覆蓋使用者已有的）
    const catSchema = Number((data.settings && data.settings.catSchema) || 1);
    if (catSchema < 2) {
      const have = {};
      categories.forEach(function (c) { have[c.id] = true; });
      DEFAULT_CATEGORIES.forEach(function (d) {
        if (!have[d.id]) categories.push(cleanCategory(d));
      });
    }

    return {
      version: 2,
      entries: Array.isArray(data.entries) ? data.entries.filter(validEntry).map(cleanEntry) : [],
      categories: categories,
      settings: Object.assign({}, DEFAULT_SETTINGS, data.settings || {}, { catSchema: 2 })
    };
  }

  function validEntry(e) {
    return e && typeof e.amount === 'number' && isFinite(e.amount) && e.date;
  }

  function cleanEntry(e) {
    return {
      id: String(e.id || U.uid()),
      amount: Math.round(Number(e.amount) * 100) / 100,
      categoryId: String(e.categoryId || 'misc'),
      date: String(e.date),
      note: String(e.note || ''),
      createdAt: Number(e.createdAt) || Date.now(),
      updatedAt: Number(e.updatedAt) || Number(e.createdAt) || Date.now()
    };
  }

  function cleanCategory(c) {
    return {
      id: String(c.id || U.uid()),
      name: String(c.name || '未命名'),
      nameEn: String(c.nameEn || ''),
      icon: String(c.icon || ''),
      iconData: String(c.iconData || ''),
      emoji: String(c.emoji || '📌'),
      color: String(c.color || '#A79E8C'),
      budget: Math.max(0, Number(c.budget) || 0),
      archived: !!c.archived
    };
  }

  let state = load();

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('save failed', e);
    }
  }

  function reset() {
    state = blankState();
    save();
    return state;
  }

  /* ── entries ─────────────────────────────────── */

  function addEntry(input) {
    const now = Date.now();
    const entry = cleanEntry({
      id: U.uid(),
      amount: input.amount,
      categoryId: input.categoryId,
      date: input.date,
      note: input.note || '',
      createdAt: now,
      updatedAt: now
    });
    state.entries.push(entry);
    save();
    return entry;
  }

  function updateEntry(id, patch) {
    const idx = state.entries.findIndex(function (e) { return e.id === id; });
    if (idx < 0) return null;
    const merged = cleanEntry(Object.assign({}, state.entries[idx], patch, { id: id, updatedAt: Date.now() }));
    state.entries[idx] = merged;
    save();
    return merged;
  }

  function removeEntry(id) {
    const before = state.entries.length;
    state.entries = state.entries.filter(function (e) { return e.id !== id; });
    save();
    return state.entries.length < before;
  }

  function getEntry(id) {
    return state.entries.find(function (e) { return e.id === id; }) || null;
  }

  function allEntries() {
    return state.entries.slice();
  }

  function entriesInRange(startDate, endDate) {
    return state.entries.filter(function (e) {
      return e.date >= startDate && e.date <= endDate;
    });
  }

  function entriesInMonth(monthKeyValue) {
    const start = monthKeyValue + '-01';
    const end = monthKeyValue + '-' + U.pad(U.daysInMonth(monthKeyValue));
    return entriesInRange(start, end);
  }

  function entriesInYear(year) {
    return entriesInRange(year + '-01-01', year + '-12-31');
  }

  /* ── categories ──────────────────────────────── */

  function categories(includeArchived) {
    return state.categories.filter(function (c) {
      return includeArchived ? true : !c.archived;
    });
  }

  function categoryMap() {
    const m = {};
    state.categories.forEach(function (c) { m[c.id] = c; });
    return m;
  }

  function getCategory(id) {
    return state.categories.find(function (c) { return c.id === id; }) || null;
  }

  function upsertCategory(cat) {
    const clean = cleanCategory(cat);
    const idx = state.categories.findIndex(function (c) { return c.id === clean.id; });
    if (idx >= 0) state.categories[idx] = clean;
    else state.categories.push(clean);
    save();
    return clean;
  }

  function removeCategory(id) {
    if (state.categories.length <= 1) return false;
    state.categories = state.categories.filter(function (c) { return c.id !== id; });
    const ids = state.categories.map(function (c) { return c.id; });
    const fallback = ids.indexOf('misc') >= 0 ? 'misc' : ids[0];
    state.entries.forEach(function (e) {
      if (e.categoryId === id || ids.indexOf(e.categoryId) < 0) e.categoryId = fallback;
    });
    save();
    return true;
  }

  function setCategoryBudget(id, amount) {
    const c = getCategory(id);
    if (!c) return null;
    c.budget = Math.max(0, Number(amount) || 0);
    save();
    return c;
  }

  /* ── settings ────────────────────────────────── */

  function getSettings() {
    return Object.assign({}, state.settings);
  }

  function updateSettings(patch) {
    state.settings = Object.assign({}, state.settings, patch);
    save();
    return getSettings();
  }

  /* ── 密碼鎖（本機簡單防護）───────────────────── */

  function hashPin(pin, salt) {
    let h1 = 0x811c9dc5;
    let h2 = 0x01000193;
    const s = String(salt) + '|' + String(pin);
    for (let round = 0; round < 400; round++) {
      for (let i = 0; i < s.length; i++) {
        h1 ^= s.charCodeAt(i) + round;
        h1 = Math.imul(h1, 0x01000193) >>> 0;
        h2 = Math.imul(h2 ^ h1, 0x85ebca6b) >>> 0;
      }
    }
    return (h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0'));
  }

  function ensureSalt() {
    if (!state.settings.pinSalt) {
      state.settings.pinSalt = U.uid() + U.uid();
      save();
    }
    return state.settings.pinSalt;
  }

  function setPin(pin) {
    const salt = ensureSalt();
    state.settings.pinHash = hashPin(pin, salt);
    state.settings.pinEnabled = true;
    save();
  }

  function verifyPin(pin) {
    if (!state.settings.pinHash) return false;
    return hashPin(pin, state.settings.pinSalt) === state.settings.pinHash;
  }

  function clearPin() {
    state.settings.pinEnabled = false;
    state.settings.pinHash = '';
    save();
  }

  /* ── import / export ─────────────────────────── */

  function exportJSON() {
    return JSON.stringify(state, null, 2);
  }

  function importJSON(text) {
    const data = JSON.parse(text);
    if (!data || typeof data !== 'object' || !Array.isArray(data.entries)) {
      throw new Error('檔案格式不正確');
    }
    state = normalize(data);
    save();
    return state;
  }

  /* ── 示範資料（對應香港家庭開支結構）─────────── */

  function loadSampleData() {
    const weights = {
      meal: 4500, drink: 800, misc: 2100, clothing: 600, housing: 12500,
      transport: 1200, tuition: 5000, fun: 900, health: 600, telecom: 500,
      water: 220, power: 700, gas: 180, insurance: 2400, tax: 1200,
      parking: 400, tunnel: 250, fuel: 1400, carcare: 500, salary: 4800,
      rates: 1100, household: 500, homeuse: 800, lpg: 150
    };
    const notes = {
      meal: ['早餐', '午餐', '晚餐', '買菜', '茶餐廳'], drink: ['咖啡', '奶茶', '手搖'],
      misc: ['雜項', '文具'], clothing: ['衣服', '鞋'], housing: ['房租', '管理費'],
      transport: ['地鐵', '巴士', '的士'], tuition: ['學費', '補習'], fun: ['電影', '訂閱'],
      health: ['看診', '藥'], telecom: ['月費', '寬頻'], water: ['水費'], power: ['電費'],
      gas: ['煤氣'], insurance: ['保費', '醫保'], tax: ['稅'], parking: ['停車'],
      tunnel: ['隧道費'], fuel: ['入油'], carcare: ['驗車', '車保'], salary: ['薪金'],
      rates: ['差餉'], household: ['日用品'], homeuse: ['家用'], lpg: ['石油汽']
    };
    const single = { housing: 1, tuition: 1, insurance: 1, tax: 1, rates: 1, salary: 1, power: 1, water: 1, gas: 1, lpg: 1, telecom: 1 };

    const entries = [];
    const today = new Date();
    for (let back = 320; back >= 0; back--) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - back);
      const dateStr = U.ymd(d);
      const day = d.getDate();
      Object.keys(weights).forEach(function (id) {
        const monthly = weights[id];
        if (single[id]) {
          // 固定月結項目：落在每月特定幾天
          if (day === 1 || day === 3 || day === 8 || day === 15) {
            const p = { meal: 0, housing: day === 3 ? 1 : 0, tuition: day === 8 ? 1 : 0, insurance: day === 8 ? 1 : 0,
              tax: day === 15 ? 1 : 0, rates: day === 15 ? 1 : 0, salary: day === 1 ? 1 : 0, power: day === 8 ? 1 : 0,
              water: day === 8 ? 1 : 0, gas: day === 8 ? 1 : 0, lpg: day === 8 ? 1 : 0, telecom: day === 1 ? 1 : 0 };
            if (p[id]) {
              const jitter = 1 + (Math.random() - 0.5) * 0.12;
              entries.push({
                id: U.uid() + id + back,
                amount: Math.round(monthly * jitter / 2) * 2,
                categoryId: id,
                date: dateStr,
                note: (notes[id] || ['支出'])[0],
                createdAt: d.getTime(),
                updatedAt: d.getTime()
              });
            }
          }
          return;
        }
        // 日常項目：每日 0–2 筆
        const count = Math.random() < 0.45 ? 0 : 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < count; i++) {
          const base = monthly / 30;
          const amount = Math.max(8, Math.round((base * (0.5 + Math.random() * 1.6)) / 2) * 2);
          const noteList = notes[id] || ['支出'];
          entries.push({
            id: U.uid() + id + back + '_' + i,
            amount: amount,
            categoryId: id,
            date: dateStr,
            note: noteList[Math.floor(Math.random() * noteList.length)],
            createdAt: d.getTime(),
            updatedAt: d.getTime()
          });
        }
      });
    }

    state.entries = entries.map(cleanEntry);
    // 依示範資料設定預算（月預算總額與各類預算）
    const budgetScale = 0.92; // 讓實際略高於預算，偏差才看得出來
    state.categories.forEach(function (c) {
      if (weights[c.id]) c.budget = Math.round(weights[c.id] * budgetScale / 10) * 10;
    });
    state.settings.monthlyBudget = Math.round(
      Object.keys(weights).reduce(function (a, k) { return a + weights[k]; }, 0) * budgetScale / 100
    ) * 100;
    save();
    return state.entries.length;
  }

  global.DB = {
    load, save, reset,
    addEntry, updateEntry, removeEntry, getEntry,
    allEntries, entriesInRange, entriesInMonth, entriesInYear,
    categories, categoryMap, getCategory, upsertCategory, removeCategory,
    setCategoryBudget,
    getSettings, updateSettings,
    setPin, verifyPin, clearPin,
    exportJSON, importJSON, loadSampleData,
    DEFAULT_CATEGORIES
  };
})(window);
