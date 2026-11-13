/* 洞察引擎邏輯快速驗證（node 執行） */
global.window = global;

const fs = require('fs');
const path = require('path');
const root = __dirname + '/..';
function load(f) { eval(fs.readFileSync(path.join(root, f), 'utf8')); }

load('js/util.js');
// 最小 I18N / DB 替身
global.I18N = {
  t: (k, p) => {
    const m = {
      'ins.newItem': '本期新出現（{n} 筆）',
      'ins.goneItem': '本期沒有紀錄',
      'ins.freqLess': '少 {n} 筆',
      'ins.freqMore': '多 {n} 筆',
      'ins.freqSame': '同為 {n} 筆',
      'ins.avgUp': '單次貴 {amount}',
      'ins.avgDown': '單次省 {amount}',
      'ins.avgSame': '單次差不多',
      'ins.but': '，但',
      'ins.and': '、',
      'ins.nameJoin': '、',
      'ins.dash': ' — ',
      'ins.headUp': '總支出比{prev}多 {amount}（{pct}），主要來自 {names}。',
      'ins.headDown': '總支出比{prev}少 {amount}（{pct}），主要是 {names}。',
      'ins.headFlat': '總支出與{prev}大致持平。',
      'gen.added': '新增'
    };
    let s = m[k] || k;
    if (p) Object.keys(p).forEach(x => { s = s.replace(new RegExp('\\{' + x + '\\}', 'g'), p[x]); });
    return s;
  },
  catName: (c) => (c && c.name) || '未分類'
};
global.DB = {
  getCategory: (id) => ({ id, name: { meal: '餐費', transport: '交通', gas: '瓦斯', fun: '娛樂' }[id] || id })
};
load('js/insights.js');

// 情境：本月餐費少 2 筆但單次更貴；交通多了 1 筆；瓦斯新出現；娛樂消失
const prev = [
  { categoryId: 'meal', amount: 100 }, { categoryId: 'meal', amount: 100 }, { categoryId: 'meal', amount: 100 },
  { categoryId: 'transport', amount: 50 },
  { categoryId: 'fun', amount: 200 }
];
const now = [
  { categoryId: 'meal', amount: 150 },
  { categoryId: 'transport', amount: 50 }, { categoryId: 'transport', amount: 60 },
  { categoryId: 'gas', amount: 410 }
];

const r = Insights.buildInsight(now, prev, { unit: 'HK$', prevLabel: '上月' });
console.log('HEAD:', r.headline);
r.bullets.forEach(b => console.log(' -', b));

const r2 = Insights.buildInsight(prev, prev, { unit: 'HK$', prevLabel: '上月' });
console.log('FLAT:', r2.headline);
