/* 帳本 v2.1 — 總覽 / 紀錄 / 比較 / 設定 + i18n + 密碼鎖 */
(function () {
  'use strict';

  const state = {
    view: 'overview',
    month: U.monthKey(new Date()),
    quarter: (function () {
      const d = new Date();
      return d.getFullYear() + '-Q' + (Math.floor(d.getMonth() / 3) + 1);
    })(),
    compareMode: 'stmt',
    ledgerFilter: 'all',
    editingId: null,
    locked: false
  };

  const els = {};
  const T = I18N.t;

  /* 內建贊助連結 */
  const SUPPORT_URL = 'https://buymeacoffee.com/charmcharm123';

  /* ──────────────────────────────────────────────
   * 聚合
   * ────────────────────────────────────────────── */

  function sum(entries) {
    return entries.reduce(function (a, e) { return a + e.amount; }, 0);
  }

  function groupByCategory(entries) {
    const map = DB.categoryMap();
    const acc = {};
    entries.forEach(function (e) {
      const id = e.categoryId;
      if (!acc[id]) {
        const c = map[id] || { id: id, name: '未分類', nameEn: 'Uncategorized', emoji: '📌', color: '#A79E8C' };
        acc[id] = {
          id: id, name: I18N.catName(c), raw: c, emoji: c.emoji, icon: c.icon, color: c.color,
          budget: c.budget || 0, value: 0, count: 0
        };
      }
      acc[id].value += e.amount;
      acc[id].count += 1;
    });
    return Object.keys(acc).map(function (k) { return acc[k]; })
      .sort(function (a, b) { return b.value - a.value; });
  }

  function groupByDay(entries) {
    const byDate = {};
    entries.forEach(function (e) {
      if (!byDate[e.date]) byDate[e.date] = [];
      byDate[e.date].push(e);
    });
    return Object.keys(byDate).sort().reverse().map(function (date) {
      const list = byDate[date].sort(function (a, b) { return b.createdAt - a.createdAt; });
      return { date: date, entries: list, total: sum(list) };
    });
  }

  function monthStats(key) {
    const entries = DB.entriesInMonth(key);
    const total = sum(entries);
    const prevKey = U.shiftMonth(key, -1);
    const prevTotal = sum(DB.entriesInMonth(prevKey));
    const days = U.daysInMonth(key);
    const now = new Date();
    const isCurrent = key === U.monthKey(now);
    const daysElapsed = isCurrent ? now.getDate() : days;

    const catMap = {};
    groupByCategory(entries).forEach(function (c) { catMap[c.id] = c; });

    const stmt = DB.categories(false).map(function (c) {
      const actual = catMap[c.id] ? catMap[c.id].value : 0;
      return {
        id: c.id, name: I18N.catName(c), emoji: c.emoji, icon: c.icon, color: c.color,
        budget: c.budget || 0,
        actual: actual,
        count: catMap[c.id] ? catMap[c.id].count : 0,
        variance: actual - (c.budget || 0)
      };
    }).filter(function (r) { return r.actual > 0 || r.budget > 0; });

    const budgetSum = stmt.reduce(function (a, r) { return a + r.budget; }, 0);

    return {
      key: key, entries: entries, total: total, count: entries.length,
      prevKey: prevKey, prevTotal: prevTotal,
      days: days, daysElapsed: daysElapsed, isCurrent: isCurrent,
      categories: groupByCategory(entries),
      stmt: stmt,
      budgetSum: budgetSum
    };
  }

  /* ── 季度工具 ──────────────────────────────────── */

  function parseQuarter(key) {
    const p = String(key).split('-Q');
    return { y: Number(p[0]), q: Number(p[1]) };
  }

  function shiftQuarter(key, d) {
    const p = parseQuarter(key);
    let y = p.y;
    let q = p.q + d;
    while (q > 4) { q -= 4; y += 1; }
    while (q < 1) { q += 4; y -= 1; }
    return y + '-Q' + q;
  }

  function quarterRange(key) {
    const p = parseQuarter(key);
    const m1 = (p.q - 1) * 3 + 1;
    const m2 = m1 + 2;
    const mk2 = p.y + '-' + U.pad(m2);
    return {
      start: p.y + '-' + U.pad(m1) + '-01',
      end: mk2 + '-' + U.pad(U.daysInMonth(mk2))
    };
  }

  function quarterEntries(key) {
    const r = quarterRange(key);
    return DB.entriesInRange(r.start, r.end);
  }

  function quarterStats(key) {
    const entries = quarterEntries(key);
    const total = sum(entries);
    const prevKey = shiftQuarter(key, -1);
    const prevTotal = sum(quarterEntries(prevKey));
    const p = parseQuarter(key);
    const lyKey = (p.y - 1) + '-Q' + p.q;
    const lyTotal = sum(quarterEntries(lyKey));

    const quarters = [];
    let k = shiftQuarter(key, -7);
    for (let i = 0; i < 8; i++) {
      quarters.push({
        key: k,
        label: I18N.fmtQuarterShort(k),
        value: sum(quarterEntries(k))
      });
      k = shiftQuarter(k, 1);
    }
    const avg = quarters.reduce(function (a, q) { return a + q.value; }, 0) / 8;

    return {
      key: key, entries: entries, total: total, count: entries.length,
      prevKey: prevKey, prevTotal: prevTotal,
      lyKey: lyKey, lyTotal: lyTotal,
      quarters: quarters, avg: avg,
      categories: groupByCategory(entries)
    };
  }

  function deltaChip(nowV, beforeV, label) {
    const d = nowV - beforeV;
    let pctText = '—';
    if (beforeV > 0) pctText = U.pct((d / beforeV) * 100);
    else if (nowV > 0) pctText = T('gen.added');
    const dir = Math.abs(d) < 0.005 ? 'flat' : d > 0 ? 'up' : 'down';
    return {
      dir: dir,
      text: label + ' ' + (dir === 'flat' ? T('gen.flat') : (d > 0 ? '↑ ' : '↓ ') + U.fmtNum(Math.abs(d)) + '（' + pctText + '）')
    };
  }

  /* ──────────────────────────────────────────────
   * DOM 小工具
   * ────────────────────────────────────────────── */

  function moneyUnit() {
    return DB.getSettings().currency || 'HK$';
  }

  function heroAmount(value) {
    const parts = U.fmtNum(value).split('.');
    const wrap = U.h('div', { class: 'hero__amount' });
    wrap.appendChild(U.h('span', { class: 'unit', text: moneyUnit() }));
    wrap.appendChild(document.createTextNode(parts[0]));
    if (parts[1]) wrap.appendChild(U.h('span', { class: 'dec', text: '.' + parts[1] }));
    return wrap;
  }

  function amountInline(value, cls) {
    return U.h('span', { class: cls || 'row__amount' }, [
      U.h('span', { class: 'unit', text: moneyUnit() }),
      document.createTextNode(U.fmtNum(value))
    ]);
  }

  /* 分類圖示：優先 Fluent 3D PNG，退回 Twemoji SVG，再退回 emoji */
  function iconImg(icon, style) {
    return U.h('img', {
      src: 'icons/cat/' + icon + '.png',
      alt: '',
      style: style,
      onerror: function (ev) {
        const img = ev.target;
        img.onerror = function () {
          img.onerror = null;
          img.style.display = 'none';
        };
        img.src = 'icons/cat/' + icon + '.svg';
      }
    });
  }

  function catIcon(c, sizeCls) {
    const cls = sizeCls || 'cat-tile';
    const bg = c && c.color ? { background: c.color + '22' } : null;
    const imgStyle = { width: '84%', height: '84%', objectFit: 'contain' };
    if (c && c.iconData) {
      return U.h('div', { class: cls, style: bg }, [
        U.h('img', { src: c.iconData, alt: '', style: imgStyle })
      ]);
    }
    if (c && c.icon) {
      return U.h('div', { class: cls, style: bg }, [
        iconImg(c.icon, imgStyle)
      ]);
    }
    return U.h('div', { class: cls, style: bg, text: (c && c.emoji) || '📌' });
  }

  /* 圖片 → 縮到 128px 內的 PNG dataURL */
  function processImageFile(blob, cb) {
    const reader = new FileReader();
    reader.onload = function () {
      const img = new Image();
      img.onload = function () {
        const max = 128;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        try {
          cb(null, canvas.toDataURL('image/png'));
        } catch (e) {
          cb(e || new Error('encode'));
        }
      };
      img.onerror = function () { cb(new Error('read')); };
      img.src = reader.result;
    };
    reader.onerror = function () { cb(new Error('read')); };
    reader.readAsDataURL(blob);
  }

  function setCategoryIcon(cat, iconData) {
    DB.upsertCategory(Object.assign({}, cat, { iconData: iconData }));
    toast(T('ico.saved'));
    render();
  }

  /* 貼上模式：下一次貼上圖片套用到目標類別 */
  let pasteTargetCat = null;

  function bindPasteIcon() {
    document.addEventListener('paste', function (ev) {
      if (!pasteTargetCat) return;
      const items = ev.clipboardData && ev.clipboardData.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type && items[i].type.indexOf('image') === 0) {
          const blob = items[i].getAsFile();
          if (!blob) continue;
          ev.preventDefault();
          const target = pasteTargetCat;
          pasteTargetCat = null;
          processImageFile(blob, function (err, data) {
            if (err || !data) return toast(T('ico.readFail'));
            setCategoryIcon(target, data);
          });
          closeSheet();
          return;
        }
      }
    });
  }

  function openIconSheet(cat) {
    const sheet = els.sheet;
    U.clear(sheet);
    sheet.appendChild(U.h('div', { class: 'sheet__grip' }));
    sheet.appendChild(U.h('div', { class: 'sheet__head' }, [
      U.h('h2', {
        class: 'sheet__title',
        text: T('ico.title') + ' · ' + I18N.catName(cat)
      }),
      U.h('button', {
        class: 'icon-btn', type: 'button',
        html: '<svg viewBox="0 0 24 24" fill="none"><path d="M7 7l10 10M17 7 7 17" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
        onclick: function () {
          pasteTargetCat = null;
          closeSheet();
        }
      })
    ]));

    const fileInput = U.h('input', {
      type: 'file', accept: 'image/*',
      style: { display: 'none' }
    });
    fileInput.addEventListener('change', function () {
      const f = fileInput.files && fileInput.files[0];
      if (!f) return;
      processImageFile(f, function (err, data) {
        if (err || !data) return toast(T('ico.readFail'));
        setCategoryIcon(cat, data);
        closeSheet();
      });
    });

    const list = U.h('div', { class: 'set-form', style: { padding: '8px 0 4px' } }, [
      fileInput,
      U.h('button', {
        class: 'btn btn--primary btn--block', type: 'button',
        text: '🖼️ ' + T('ico.upload'),
        onclick: function () { fileInput.click(); }
      }),
      U.h('button', {
        class: 'btn btn--ghost btn--block', type: 'button',
        text: '📋 ' + T('ico.paste'),
        onclick: function () {
          pasteTargetCat = cat;
          toast(T('ico.pasteHint'), 4200);
          closeSheet();
        }
      }),
      U.h('button', {
        class: 'btn btn--ghost btn--block', type: 'button',
        text: '😊 ' + T('ico.emoji'),
        onclick: function () {
          cycleEmoji(cat);
          closeSheet();
        }
      })
    ]);
    if (cat.iconData) {
      list.appendChild(U.h('button', {
        class: 'btn btn--danger btn--block', type: 'button',
        text: T('ico.clear'),
        onclick: function () {
          setCategoryIcon(cat, '');
          closeSheet();
        }
      }));
    }
    sheet.appendChild(list);

    els.overlay.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function catTile(catId) {
    const c = DB.getCategory(catId) || { emoji: '📌', icon: '', color: '#A79E8C' };
    return catIcon(c);
  }

  function devRow(opts) {
    const delta = opts.delta;
    const maxAbs = Math.max(Math.abs(delta), opts.scale || Math.abs(delta) || 1);
    const ratio = Math.min(1, Math.abs(delta) / (maxAbs || 1));
    const dir = Math.abs(delta) < 0.005 ? 'flat' : delta > 0 ? 'up' : 'down';
    const barW = (ratio * 50).toFixed(2) + '%';
    return U.h('div', { class: 'dev' }, [
      U.h('div', { class: 'dev__head' }, [
        U.h('span', { text: opts.label || '' }),
        U.h('span', {
          class: 'dev__delta is-' + dir,
          text: dir === 'flat' ? T('gen.flat')
            : (delta > 0 ? '+' : '−') + U.fmtNum(Math.abs(delta)) + (opts.pct ? '（' + opts.pct + '）' : '')
        })
      ]),
      U.h('div', { class: 'dev__ruler' }, [
        U.h('div', { class: 'dev__center' }),
        U.h('div', {
          class: 'dev__bar is-' + dir,
          style: dir === 'flat' ? { display: 'none' } : { width: barW }
        })
      ])
    ]);
  }

  /* AI 分析卡（本機統計拆解） */
  function insightCard(nowEntries, prevEntries, prevLabelKey) {
    const ins = Insights.buildInsight(nowEntries, prevEntries, {
      unit: moneyUnit(),
      prevLabel: T(prevLabelKey)
    });
    const card = U.h('div', { class: 'card insight' });
    card.appendChild(U.h('div', { class: 'insight__head' }, [
      U.h('span', { class: 'insight__badge', text: 'AI' }),
      U.h('p', { class: 'section__title', text: T('ins.title') })
    ]));
    card.appendChild(U.h('p', { class: 'insight__headline', text: ins.headline }));
    if (ins.bullets.length) {
      const ul = U.h('ul', { class: 'insight__list' });
      ins.bullets.forEach(function (b) {
        ul.appendChild(U.h('li', { text: b }));
      });
      card.appendChild(ul);
    }
    return card;
  }

  function emptyState(title, text) {
    return U.h('div', { class: 'empty' }, [
      U.h('div', {
        class: 'empty__mark',
        html: '<svg viewBox="0 0 24 24"><path d="M5 6h14M5 12h14M5 18h9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
      }),
      U.h('p', { class: 'empty__title', text: title }),
      U.h('p', { class: 'empty__text', text: text })
    ]);
  }

  function entryRow(e) {
    const c = DB.getCategory(e.categoryId) || { name: '未分類', nameEn: 'Uncategorized', emoji: '📌' };
    return U.h('button', {
      class: 'row', type: 'button',
      onclick: function () { openEntrySheet(e); }
    }, [
      catTile(e.categoryId),
      U.h('div', {}, [
        U.h('div', { class: 'row__name', text: e.note ? e.note : I18N.catName(c) }),
        U.h('div', { class: 'row__sub', text: I18N.relativeDay(e.date) + ' · ' + I18N.catName(c) })
      ]),
      amountInline(e.amount)
    ]);
  }

  function chevSVG(dir) {
    return '<svg viewBox="0 0 24 24" fill="none"><path d="' +
      (dir < 0 ? 'M14.5 6.5 9 12l5.5 5.5' : 'M9.5 6.5 15 12l-5.5 5.5') +
      '" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  /* ──────────────────────────────────────────────
   * 頂欄
   * ────────────────────────────────────────────── */

  function renderTopbar() {
    const left = els.topbarLeft;
    const center = els.topbarCenter;
    const right = els.topbarRight;
    U.clear(center);
    left.hidden = true;
    right.hidden = true;
    left.onclick = null;
    right.onclick = null;

    if (state.view === 'overview') {
      center.appendChild(U.h('p', {
        class: 'topbar__eyebrow',
        text: I18N.fmtDateWeek(U.todayYMD())
      }));
      center.appendChild(U.h('h1', { class: 'topbar__title', text: T('title.monthlySummary') }));
    } else if (state.view === 'ledger') {
      left.hidden = false;
      right.hidden = false;
      left.innerHTML = chevSVG(-1);
      right.innerHTML = chevSVG(1);
      left.setAttribute('aria-label', 'prev');
      right.setAttribute('aria-label', 'next');
      left.onclick = function () { state.month = U.shiftMonth(state.month, -1); render(); };
      right.onclick = function () { state.month = U.shiftMonth(state.month, 1); render(); };
      center.appendChild(U.h('p', { class: 'topbar__eyebrow', text: T('title.ledger') }));
      center.appendChild(U.h('h1', {
        class: 'topbar__title',
        html: '<span class="num">' + I18N.fmtMonth(state.month) + '</span>'
      }));
    } else if (state.view === 'compare') {
      left.hidden = false;
      right.hidden = false;
      left.innerHTML = chevSVG(-1);
      right.innerHTML = chevSVG(1);
      left.onclick = function () {
        if (state.compareMode === 'quarter') state.quarter = shiftQuarter(state.quarter, -1);
        else state.month = U.shiftMonth(state.month, -1);
        render();
      };
      right.onclick = function () {
        if (state.compareMode === 'quarter') state.quarter = shiftQuarter(state.quarter, 1);
        else state.month = U.shiftMonth(state.month, 1);
        render();
      };
      center.appendChild(U.h('p', {
        class: 'topbar__eyebrow',
        text: state.compareMode === 'quarter' ? T('title.quarterReview') : T('title.compare')
      }));
      center.appendChild(U.h('h1', {
        class: 'topbar__title',
        html: state.compareMode === 'quarter'
          ? '<span class="num">' + I18N.fmtQuarter(state.quarter) + '</span>'
          : '<span class="num">' + I18N.fmtMonth(state.month) + '</span>'
      }));
    } else if (state.view === 'settings') {
      center.appendChild(U.h('p', { class: 'topbar__eyebrow', text: T('title.storedLocal') }));
      center.appendChild(U.h('h1', { class: 'topbar__title', text: T('title.settings') }));
    }
  }

  /* ──────────────────────────────────────────────
   * 畫面：總覽
   * ────────────────────────────────────────────── */

  function renderOverview() {
    const root = els.viewOverview;
    U.clear(root);

    const monthKey = U.monthKey(new Date());
    const st = monthStats(monthKey);
    const unit = moneyUnit();
    const budget = st.budgetSum;
    const spentRatio = budget > 0 ? st.total / budget : 0;

    const hero = U.h('div', { class: 'card hero' });
    hero.appendChild(U.h('p', { class: 'hero__label', text: T('overview.monthSpent') }));
    hero.appendChild(heroAmount(st.total));
    const row = U.h('div', { class: 'hero__row' });
    const c1 = deltaChip(st.total, st.prevTotal, T('overview.vsLastMonth'));
    row.appendChild(U.h('div', { class: 'chip is-' + c1.dir }, [
      U.h('i', { class: 'chip__dot' }), U.h('span', { text: c1.text })
    ]));
    row.appendChild(U.h('div', { class: 'chip' }, [
      U.h('span', {
        text: T('overview.entriesDaily', {
          count: st.count,
          amount: unit + U.fmtNum(st.total / (st.daysElapsed || 1))
        })
      })
    ]));
    hero.appendChild(row);
    root.appendChild(hero);

    const sec0 = U.h('div', { class: 'section' });
    sec0.appendChild(U.h('div', { class: 'section__head' }, [
      U.h('p', { class: 'section__title', text: T('overview.budgetPace') }),
      U.h('span', {
        class: 'section__meta',
        html: budget > 0
          ? T('overview.monthlyBudget') + ' <b>' + unit + U.fmtNum(budget) + '</b>'
          : T('overview.noBudget')
      })
    ]));

    const paceCard = U.h('div', { class: 'card' });
    const pace = U.h('div', { class: 'pace' });
    const fig = U.h('div', { class: 'pace__figure' });
    fig.appendChild(Charts.budgetRing({
      size: 140, used: st.total,
      budget: budget > 0 ? budget : (st.total || 1)
    }));
    fig.appendChild(U.h('div', { class: 'pace__center' }, [
      U.h('div', {
        class: 'pace__pct ' + (spentRatio > 1 ? 'is-over' : 'is-ok'),
        text: budget > 0 ? Math.round(spentRatio * 100) + '%' : '—'
      }),
      U.h('div', { class: 'pace__sub', text: T('overview.used') })
    ]));
    pace.appendChild(fig);

    const stats = U.h('div', { class: 'pace__stats' });
    if (budget > 0) {
      const left = budget - st.total;
      stats.appendChild(U.h('div', {}, [
        U.h('div', { class: 'pace__stat-label', text: left >= 0 ? T('overview.budgetLeft') : T('overview.overBy') }),
        U.h('div', { class: 'pace__stat-value ' + (left >= 0 ? 'is-ok' : 'is-over') }, [
          U.h('span', { class: 'unit', text: unit }),
          document.createTextNode(U.fmtNum(Math.abs(left)))
        ])
      ]));
      const projected = st.total / (st.daysElapsed || 1) * st.days;
      stats.appendChild(U.h('div', {}, [
        U.h('div', { class: 'pace__stat-label', text: T('overview.projected') }),
        U.h('div', { class: 'pace__stat-value ' + (projected > budget ? 'is-over' : '') }, [
          U.h('span', { class: 'unit', text: unit }),
          document.createTextNode(U.fmtNum(Math.round(projected)))
        ])
      ]));
      stats.appendChild(U.h('div', {}, [
        U.h('div', { class: 'pace__stat-label', text: T('overview.daysLeft') }),
        U.h('div', { class: 'pace__stat-value' }, [
          document.createTextNode(T('overview.daysUnit', { n: st.days - st.daysElapsed }))
        ])
      ]));
    } else {
      stats.appendChild(U.h('div', {}, [
        U.h('div', { class: 'pace__stat-label', text: T('overview.monthSpent') }),
        U.h('div', { class: 'pace__stat-value' }, [
          U.h('span', { class: 'unit', text: unit }),
          document.createTextNode(U.fmtNum(st.total))
        ])
      ]));
      stats.appendChild(U.h('p', { class: 'hint', text: T('overview.setBudgetHint') }));
    }
    pace.appendChild(stats);
    paceCard.appendChild(pace);
    sec0.appendChild(paceCard);
    root.appendChild(sec0);

    const sec1 = U.h('div', { class: 'section' });
    sec1.appendChild(U.h('div', { class: 'section__head' }, [
      U.h('p', { class: 'section__title', text: T('overview.varianceBoard') }),
      U.h('span', {
        class: 'section__meta',
        text: budget > 0 ? T('overview.mostVsBudget') : T('overview.mostVsLastMonth')
      })
    ]));

    if (!st.entries.length) {
      sec1.appendChild(emptyState(T('overview.emptyTitle'), T('overview.emptyText')));
      root.appendChild(sec1);
    } else {
      const rows = [];
      if (budget > 0) {
        st.stmt.forEach(function (r) {
          if (r.budget <= 0) return;
          rows.push({
            id: r.id, name: r.name, emoji: r.emoji, icon: r.icon, color: r.color,
            value: r.actual,
            delta: r.variance,
            pct: U.pct((r.variance / r.budget) * 100),
            note: T('overview.budgetOf', { amount: unit + U.fmtNum(r.budget) })
          });
        });
      } else {
        const prevMap = {};
        groupByCategory(DB.entriesInMonth(st.prevKey)).forEach(function (c) { prevMap[c.id] = c; });
        st.categories.forEach(function (c) {
          const prev = prevMap[c.id] ? prevMap[c.id].value : 0;
          rows.push({
            id: c.id, name: c.name, emoji: c.emoji, icon: c.icon, color: c.color,
            value: c.value,
            delta: c.value - prev,
            pct: prev > 0 ? U.pct(((c.value - prev) / prev) * 100) : null,
            note: T('overview.lastMonthOf', { amount: unit + U.fmtNum(prev) })
          });
        });
      }
      rows.sort(function (a, b) { return Math.abs(b.delta) - Math.abs(a.delta); });
      const top = rows.slice(0, 4);
      const scale = Math.max.apply(null, top.map(function (r) { return Math.abs(r.delta); }).concat([1]));
      const list = U.h('div', { class: 'rank-list' });
      top.forEach(function (r) {
        const card = U.h('div', { class: 'rank' });
        card.appendChild(U.h('div', { class: 'rank__top' }, [
          catIcon(r),
          U.h('div', {}, [
            U.h('div', { class: 'rank__name', text: r.name }),
            U.h('div', { class: 'rank__sub', text: r.note })
          ]),
          amountInline(r.value, 'rank__amount')
        ]));
        card.appendChild(devRow({
          label: budget > 0 ? T('overview.devBudget') : T('overview.devLastMonth'),
          delta: r.delta, pct: r.pct, scale: scale
        }));
        list.appendChild(card);
      });
      sec1.appendChild(list);
      root.appendChild(sec1);

      const sparkDays = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        sparkDays.push(U.ymd(d));
      }
      const sparkVals = sparkDays.map(function (k) { return sum(DB.entriesInRange(k, k)); });
      const sparkLabels = sparkDays.map(function (k) {
        return String(U.parseYMD(k).getDate());
      });
      const sec2 = U.h('div', { class: 'section' });
      sec2.appendChild(U.h('div', { class: 'section__head' }, [
        U.h('p', { class: 'section__title', text: T('overview.recent14') }),
        U.h('span', {
          class: 'section__meta',
          html: T('overview.total') + ' <b>' + unit + U.fmtNum(sparkVals.reduce(function (a, b) { return a + b; }, 0)) + '</b>'
        })
      ]));
      const card2 = U.h('div', { class: 'card spark-card' });
      const host2 = U.h('div', { class: 'chart-host' });
      host2.appendChild(Charts.trend(sparkVals, {
        width: 520, height: 186,
        labels: sparkLabels
      }));
      card2.appendChild(host2);
      sec2.appendChild(card2);
      root.appendChild(sec2);

      const sec3 = U.h('div', { class: 'section' });
      const recent = st.entries.slice().sort(function (a, b) {
        return (b.date + String(b.createdAt)).localeCompare(a.date + String(a.createdAt));
      }).slice(0, 5);
      sec3.appendChild(U.h('div', { class: 'section__head' }, [
        U.h('p', { class: 'section__title', text: T('overview.recent') }),
        U.h('span', { class: 'section__meta', text: T('overview.moreInLedger') })
      ]));
      const list3 = U.h('div', { class: 'rows' });
      recent.forEach(function (e) { list3.appendChild(entryRow(e)); });
      sec3.appendChild(list3);
      root.appendChild(sec3);
    }

    const foot = U.h('div', { class: 'footer-note' });
    foot.appendChild(U.h('p', { style: { margin: '0 0 12px' }, text: T('sup.enjoy') }));
    foot.appendChild(U.h('button', {
      class: 'btn btn--ghost btn--sm',
      type: 'button',
      text: '☕ ' + T('sup.button'),
      onclick: function () { window.open(SUPPORT_URL, '_blank', 'noopener'); }
    }));
    foot.appendChild(U.h('p', {
      style: { margin: '16px 0 0' },
      text: T('overview.footer')
    }));
    root.appendChild(foot);
  }

  /* ──────────────────────────────────────────────
   * 畫面：紀錄
   * ────────────────────────────────────────────── */

  function renderLedger() {
    const root = els.viewLedger;
    U.clear(root);

    const st = monthStats(state.month);
    const unit = moneyUnit();

    const used = {};
    st.entries.forEach(function (e) { used[e.categoryId] = true; });
    const filters = U.h('div', { class: 'filters' });
    filters.appendChild(U.h('button', {
      class: 'f-chip' + (state.ledgerFilter === 'all' ? ' is-on' : ''),
      type: 'button',
      text: T('ledger.all'),
      onclick: function () { state.ledgerFilter = 'all'; render(); }
    }));
    DB.categories(false).forEach(function (c) {
      if (!used[c.id] && state.ledgerFilter !== c.id) return;
      filters.appendChild(U.h('button', {
        class: 'f-chip' + (state.ledgerFilter === c.id ? ' is-on' : ''),
        type: 'button',
        text: I18N.catName(c),
        onclick: function () {
          state.ledgerFilter = state.ledgerFilter === c.id ? 'all' : c.id;
          render();
        }
      }));
    });
    root.appendChild(filters);

    const summary = U.h('div', { class: 'card hero', style: { paddingTop: '18px', paddingBottom: '16px' } });
    summary.appendChild(U.h('p', { class: 'hero__label', text: T('ledger.monthTotal') }));
    const filtered = state.ledgerFilter === 'all'
      ? st.entries
      : st.entries.filter(function (e) { return e.categoryId === state.ledgerFilter; });
    summary.appendChild(heroAmount(sum(filtered)));
    const row = U.h('div', { class: 'hero__row' });
    row.appendChild(U.h('div', { class: 'chip' }, [
      U.h('span', {
        text: state.ledgerFilter !== 'all'
          ? T('ledger.entriesFiltered', {
              count: filtered.length,
              name: I18N.catName(DB.getCategory(state.ledgerFilter))
            })
          : T('ledger.entriesOnly', { count: filtered.length })
      })
    ]));
    if (state.ledgerFilter === 'all') {
      const c1 = deltaChip(st.total, st.prevTotal, T('overview.vsLastMonth'));
      row.appendChild(U.h('div', { class: 'chip is-' + c1.dir }, [
        U.h('i', { class: 'chip__dot' }), U.h('span', { text: c1.text })
      ]));
    }
    summary.appendChild(row);
    root.appendChild(summary);

    if (!filtered.length) {
      root.appendChild(emptyState(T('ledger.emptyTitle'), T('ledger.emptyText')));
      return;
    }

    groupByDay(filtered).forEach(function (day) {
      root.appendChild(U.h('div', { class: 'day-label' }, [
        U.h('span', { text: I18N.fmtDateWeek(day.date) }),
        U.h('span', { text: T('ledger.daySpent', { amount: unit + U.fmtNum(day.total) }) })
      ]));
      const list = U.h('div', { class: 'rows' });
      day.entries.forEach(function (e) { list.appendChild(entryRow(e)); });
      root.appendChild(list);
    });
  }

  /* ──────────────────────────────────────────────
   * 畫面：比較
   * ────────────────────────────────────────────── */

  function renderCompare() {
    const root = els.viewCompare;
    U.clear(root);

    const seg = U.h('div', { class: 'seg' });
    [['stmt', T('cmp.statement')], ['month', T('cmp.monthly')], ['quarter', T('cmp.quarterly')]].forEach(function (m) {
      seg.appendChild(U.h('button', {
        class: 'seg__btn' + (state.compareMode === m[0] ? ' is-on' : ''),
        type: 'button',
        text: m[1],
        onclick: function () { state.compareMode = m[0]; render(); }
      }));
    });
    root.appendChild(seg);

    if (state.compareMode === 'stmt') renderStmt(root);
    else if (state.compareMode === 'month') renderMonthCompare(root);
    else renderQuarterCompare(root);
  }

  function renderStmt(root) {
    const st = monthStats(state.month);
    const unit = moneyUnit();

    if (!st.stmt.length) {
      root.appendChild(emptyState(T('cmp.emptyStmt'), T('cmp.emptyStmtText')));
      return;
    }

    const table = U.h('div', { class: 'stmt' });
    table.appendChild(U.h('div', { class: 'stmt__head' }, [
      U.h('span', { text: T('cmp.colCategory') }),
      U.h('span', { text: T('cmp.colBudget') }),
      U.h('span', { text: T('cmp.colActual') }),
      U.h('span', { text: T('cmp.colVariance') })
    ]));

    st.stmt.forEach(function (r) {
      const varClass = r.variance > 0.5 ? 'is-over' : r.variance < -0.5 ? 'is-under' : 'is-flat';
      const flagText = r.variance > 0.5
        ? '▲ +' + U.fmtNum(r.variance)
        : r.variance < -0.5
          ? '▼ −' + U.fmtNum(Math.abs(r.variance))
          : '—';
      table.appendChild(U.h('button', {
        class: 'stmt__row',
        type: 'button',
        onclick: function () { promptBudget(r); }
      }, [
        U.h('div', { class: 'stmt__cat' }, [
          catIcon({ icon: r.icon, emoji: r.emoji }, 'stmt__emoji'),
          U.h('div', { class: 'stmt__name', text: r.name })
        ]),
        U.h('div', {
          class: 'stmt__num',
          text: r.budget > 0 ? U.fmtNum(r.budget) : '—',
          style: r.budget <= 0 ? { color: 'var(--faint)' } : null
        }),
        U.h('div', { class: 'stmt__num is-actual', text: U.fmtNum(r.actual) }),
        U.h('div', { class: 'stmt__var' }, [
          U.h('span', {
            class: 'flag ' + varClass,
            text: r.budget > 0 ? flagText : T('cmp.noBudget')
          })
        ])
      ]));
    });

    const totalBudget = st.stmt.reduce(function (a, r) { return a + r.budget; }, 0);
    const totalVar = st.total - totalBudget;
    table.appendChild(U.h('div', { class: 'stmt__foot' }, [
      U.h('span', { text: T('cmp.grandTotal') }),
      U.h('span', { text: totalBudget > 0 ? U.fmtNum(totalBudget) : '—' }),
      U.h('span', { text: U.fmtNum(st.total) }),
      U.h('span', {
        class: totalBudget > 0 ? (totalVar > 0 ? 'is-var-over' : 'is-var-under') : '',
        text: totalBudget > 0 ? (totalVar > 0 ? '+' : '−') + U.fmtNum(Math.abs(totalVar)) : '—'
      })
    ]));
    root.appendChild(table);
    root.appendChild(U.h('p', { class: 'hint', text: T('cmp.stmtHint') }));

    const withBudget = st.stmt.filter(function (r) { return r.budget > 0; });
    if (withBudget.length >= 2) {
      const sec = U.h('div', { class: 'section' });
      sec.appendChild(U.h('div', { class: 'section__head' }, [
        U.h('p', { class: 'section__title', text: T('cmp.budgetVsActual') }),
        U.h('span', { class: 'section__meta', text: T('cmp.paleBudget') })
      ]));
      const card = U.h('div', { class: 'card' });
      const host = U.h('div', { class: 'chart-host' });
      host.appendChild(Charts.pairedColumns(withBudget.slice(0, 10).map(function (r) {
        return { label: r.name, budget: r.budget, actual: r.actual, color: r.color };
      }), { width: 520, height: 190 }));
      card.appendChild(host);
      sec.appendChild(card);
      root.appendChild(sec);
    }
  }

  function promptBudget(r) {
    const raw = prompt(T('ask.setBudget', { name: r.name }), r.budget > 0 ? String(r.budget) : '');
    if (raw == null) return;
    DB.setCategoryBudget(r.id, U.parseAmount(raw));
    toast(T('msg.budgetUpdated', { name: r.name }));
    render();
  }

  function renderMonthCompare(root) {
    const st = monthStats(state.month);
    const unit = moneyUnit();

    const hero = U.h('div', { class: 'card hero' });
    hero.appendChild(U.h('p', {
      class: 'hero__label',
      text: T('cmp.monthTotalLabel', { month: I18N.fmtMonth(state.month) })
    }));
    hero.appendChild(heroAmount(st.total));
    const row = U.h('div', { class: 'hero__row' });
    const c1 = deltaChip(st.total, st.prevTotal, T('cmp.vsMonth', { month: I18N.fmtMonth(st.prevKey) }));
    row.appendChild(U.h('div', { class: 'chip is-' + c1.dir }, [
      U.h('i', { class: 'chip__dot' }), U.h('span', { text: c1.text })
    ]));
    row.appendChild(U.h('div', { class: 'chip' }, [
      U.h('span', { text: T('ledger.entriesOnly', { count: st.count }) })
    ]));
    hero.appendChild(row);
    root.appendChild(hero);

    if (!st.entries.length) {
      root.appendChild(emptyState(T('cmp.emptyMonth'), T('cmp.emptyMonthText')));
      return;
    }

    root.appendChild(insightCard(st.entries, DB.entriesInMonth(st.prevKey), 'ins.prevMonth'));

    const months = [];
    let k = U.shiftMonth(state.month, -11);
    for (let i = 0; i < 12; i++) {
      months.push({
        key: k,
        label: String(U.parseMonthKey(k).getMonth() + 1),
        value: sum(DB.entriesInMonth(k))
      });
      k = U.shiftMonth(k, 1);
    }
    const avg = months.reduce(function (a, m) { return a + m.value; }, 0) / 12;

    const sec1 = U.h('div', { class: 'section' });
    sec1.appendChild(U.h('div', { class: 'section__head' }, [
      U.h('p', { class: 'section__title', text: T('cmp.last12') }),
      U.h('span', {
        class: 'section__meta',
        html: T('cmp.monthlyAvg') + ' <b>' + unit + U.fmtNum(avg) + '</b>'
      })
    ]));
    const card1 = U.h('div', { class: 'card' });
    const host1 = U.h('div', { class: 'chart-host' });
    host1.appendChild(Charts.columns(months.map(function (m) {
      return {
        label: m.label, value: m.value,
        color: m.key === state.month ? '#5FD3A6' : 'rgba(95,211,166,0.34)',
        muted: m.value <= 0
      };
    }), { width: 520, height: 195, avg: avg, avgLabel: T('cmp.monthlyAvg'), showLabelsEvery: 1 }));
    card1.appendChild(host1);
    sec1.appendChild(card1);
    root.appendChild(sec1);

    const sec2 = U.h('div', { class: 'section' });
    sec2.appendChild(U.h('div', { class: 'section__head' }, [
      U.h('p', { class: 'section__title', text: T('cmp.catMonthCmp') }),
      U.h('span', {
        class: 'section__meta',
        text: T('cmp.comparedWith', { month: I18N.fmtMonth(st.prevKey) })
      })
    ]));

    const prevMap = {};
    groupByCategory(DB.entriesInMonth(st.prevKey)).forEach(function (c) { prevMap[c.id] = c; });
    const rows = st.categories.map(function (c) {
      const prev = prevMap[c.id] ? prevMap[c.id].value : 0;
      return {
        id: c.id, name: c.name, emoji: c.emoji, icon: c.icon, color: c.color,
        value: c.value, prev: prev, delta: c.value - prev,
        pct: prev > 0 ? U.pct(((c.value - prev) / prev) * 100) : null
      };
    }).sort(function (a, b) { return Math.abs(b.delta) - Math.abs(a.delta); });

    const scale = Math.max.apply(null, rows.map(function (r) { return Math.abs(r.delta); }).concat([1]));
    const list = U.h('div', { class: 'rank-list' });
    rows.slice(0, 8).forEach(function (r) {
      const card = U.h('div', { class: 'rank' });
      card.appendChild(U.h('div', { class: 'rank__top' }, [
        catIcon(r),
        U.h('div', {}, [
          U.h('div', { class: 'rank__name', text: r.name }),
          U.h('div', {
            class: 'rank__sub',
            text: T('overview.lastMonthOf', { amount: unit + U.fmtNum(r.prev) })
          })
        ]),
        amountInline(r.value, 'rank__amount')
      ]));
      card.appendChild(devRow({
        label: T('cmp.devVsLastMonth'),
        delta: r.delta, pct: r.pct, scale: scale
      }));
      list.appendChild(card);
    });
    sec2.appendChild(list);
    root.appendChild(sec2);
  }

  function renderQuarterCompare(root) {
    const st = quarterStats(state.quarter);
    const unit = moneyUnit();

    const hero = U.h('div', { class: 'card hero' });
    hero.appendChild(U.h('p', {
      class: 'hero__label',
      text: T('cmp.quarterTotalLabel', { quarter: I18N.fmtQuarter(state.quarter) })
    }));
    hero.appendChild(heroAmount(st.total));
    const row = U.h('div', { class: 'hero__row' });
    const c1 = deltaChip(st.total, st.prevTotal, T('cmp.vsQuarter', { quarter: I18N.fmtQuarter(st.prevKey) }));
    row.appendChild(U.h('div', { class: 'chip is-' + c1.dir }, [
      U.h('i', { class: 'chip__dot' }), U.h('span', { text: c1.text })
    ]));
    const c2 = deltaChip(st.total, st.lyTotal, T('cmp.vsSameQuarter'));
    row.appendChild(U.h('div', { class: 'chip is-' + c2.dir }, [
      U.h('i', { class: 'chip__dot' }), U.h('span', { text: c2.text })
    ]));
    row.appendChild(U.h('div', { class: 'chip' }, [
      U.h('span', {
        text: T('cmp.quarterAvg') + ' ' + unit + U.fmtNum(Math.round(st.avg)) + ' · ' + T('ledger.entriesOnly', { count: st.count })
      })
    ]));
    hero.appendChild(row);
    root.appendChild(hero);

    if (!st.entries.length) {
      root.appendChild(emptyState(T('cmp.emptyQuarter'), T('cmp.emptyQuarterText')));
      return;
    }

    root.appendChild(insightCard(st.entries, quarterEntries(st.prevKey), 'ins.prevQuarter'));

    /* 近 8 季節奏 */
    const sec1 = U.h('div', { class: 'section' });
    sec1.appendChild(U.h('div', { class: 'section__head' }, [
      U.h('p', { class: 'section__title', text: T('cmp.last8Q') }),
      U.h('span', {
        class: 'section__meta',
        html: T('cmp.dashedAvgQ') + ' <b>' + unit + U.fmtNum(Math.round(st.avg)) + '</b>'
      })
    ]));
    const card1 = U.h('div', { class: 'card' });
    const host1 = U.h('div', { class: 'chart-host' });
    host1.appendChild(Charts.columns(st.quarters.map(function (q) {
      return {
        label: q.label,
        value: q.value,
        color: q.key === state.quarter ? '#5FD3A6' : 'rgba(95,211,166,0.34)',
        muted: q.value <= 0
      };
    }), { width: 520, height: 195, avg: st.avg, avgLabel: T('cmp.quarterAvg'), showLabelsEvery: 1 }));
    card1.appendChild(host1);
    sec1.appendChild(card1);
    root.appendChild(sec1);

    /* 各季偏差（與季均） */
    const sec2 = U.h('div', { class: 'section' });
    sec2.appendChild(U.h('div', { class: 'section__head' }, [
      U.h('p', { class: 'section__title', text: T('cmp.quarterVariance') }),
      U.h('span', { class: 'section__meta', text: T('cmp.distFromQAvg') })
    ]));
    const maxAbs = Math.max.apply(null, st.quarters.map(function (q) {
      return Math.abs(q.value - st.avg);
    }).concat([1]));
    const list2 = U.h('div', { class: 'rank-list' });
    st.quarters.slice().reverse().forEach(function (q) {
      const delta = q.value - st.avg;
      const card = U.h('div', { class: 'rank' });
      card.appendChild(U.h('div', { class: 'rank__top' }, [
        U.h('div', {
          class: 'cat-tile',
          text: I18N.fmtQuarterShort(q.key),
          style: { fontSize: '12px', fontWeight: '700', color: 'var(--ink-soft)' }
        }),
        U.h('div', {}, [
          U.h('div', { class: 'rank__name', text: I18N.fmtQuarter(q.key) }),
          U.h('div', { class: 'rank__sub', text: T('cmp.quarterAvg') + ' ' + unit + U.fmtNum(Math.round(st.avg)) })
        ]),
        amountInline(q.value, 'rank__amount')
      ]));
      card.appendChild(devRow({
        label: T('cmp.devVsQAvg'),
        delta: delta,
        pct: st.avg > 0 ? U.pct((delta / st.avg) * 100) : null,
        scale: maxAbs
      }));
      list2.appendChild(card);
    });
    sec2.appendChild(list2);
    root.appendChild(sec2);

    /* 類別季比（與上季） */
    const sec3 = U.h('div', { class: 'section' });
    sec3.appendChild(U.h('div', { class: 'section__head' }, [
      U.h('p', { class: 'section__title', text: T('cmp.catQuarterCmp') }),
      U.h('span', {
        class: 'section__meta',
        text: T('cmp.vsQuarter', { quarter: I18N.fmtQuarter(st.prevKey) })
      })
    ]));
    const prevMap = {};
    groupByCategory(quarterEntries(st.prevKey)).forEach(function (c) { prevMap[c.id] = c; });
    const rows = st.categories.map(function (c) {
      const prev = prevMap[c.id] ? prevMap[c.id].value : 0;
      return {
        id: c.id, name: c.name, emoji: c.emoji, icon: c.icon,
        value: c.value, prev: prev, delta: c.value - prev,
        pct: prev > 0 ? U.pct(((c.value - prev) / prev) * 100) : null
      };
    }).sort(function (a, b) { return Math.abs(b.delta) - Math.abs(a.delta); });
    const scale = Math.max.apply(null, rows.map(function (r) { return Math.abs(r.delta); }).concat([1]));
    const list3 = U.h('div', { class: 'rank-list' });
    rows.slice(0, 8).forEach(function (r) {
      const card = U.h('div', { class: 'rank' });
      card.appendChild(U.h('div', { class: 'rank__top' }, [
        catIcon(r),
        U.h('div', {}, [
          U.h('div', { class: 'rank__name', text: r.name }),
          U.h('div', {
            class: 'rank__sub',
            text: T('cmp.priorQuarterOf', { amount: unit + U.fmtNum(r.prev) })
          })
        ]),
        amountInline(r.value, 'rank__amount')
      ]));
      card.appendChild(devRow({
        label: T('cmp.devVsLastQuarter'),
        delta: r.delta, pct: r.pct, scale: scale
      }));
      list3.appendChild(card);
    });
    sec3.appendChild(list3);
    root.appendChild(sec3);
  }

  /* ──────────────────────────────────────────────
   * 畫面：設定
   * ────────────────────────────────────────────── */

  function renderSettings() {
    const root = els.viewSettings;
    U.clear(root);
    const s = DB.getSettings();
    const list = U.h('div', { class: 'set-list' });

    /* 語言 */
    const langCard = U.h('div', { class: 'set-card' });
    const langForm = U.h('div', { class: 'set-form' }, [
      U.h('div', { class: 'field__label', text: T('set.language') }),
      U.h('div', { class: 'seg' })
    ]);
    const langSeg = langForm.querySelector('.seg');
    [['zh', '中文'], ['en', 'English']].forEach(function (L) {
      langSeg.appendChild(U.h('button', {
        class: 'seg__btn' + ((s.lang || 'zh') === L[0] ? ' is-on' : ''),
        type: 'button',
        text: L[1],
        onclick: function () {
          DB.updateSettings({ lang: L[0] });
          I18N.setLang(L[0]);
          document.documentElement.lang = L[0] === 'en' ? 'en' : 'zh-TW';
          toast(L[0] === 'en' ? 'Language updated' : '介面已切換');
          render();
        }
      }));
    });
    langCard.appendChild(langForm);
    list.appendChild(langCard);

    /* 貨幣 */
    const curCard = U.h('div', { class: 'set-card' });
    const curForm = U.h('div', { class: 'set-form' }, [
      U.h('div', { class: 'field__label', text: T('set.currency') }),
      U.h('div', { class: 'seg' })
    ]);
    const seg = curForm.querySelector('.seg');
    ['HK$', 'NT$', 'US$', '¥', '€', '£'].forEach(function (cur) {
      seg.appendChild(U.h('button', {
        class: 'seg__btn' + (s.currency === cur ? ' is-on' : ''),
        type: 'button',
        text: cur,
        onclick: function () {
          DB.updateSettings({ currency: cur });
          toast(T('msg.currencySet', { v: cur }));
          render();
        }
      }));
    });
    curCard.appendChild(curForm);
    list.appendChild(curCard);

    /* 月預算 */
    const budCard = U.h('div', { class: 'set-card' });
    const budForm = U.h('div', { class: 'set-form' }, [
      U.h('div', { class: 'field__label', text: T('set.monthlyBudget') })
    ]);
    const budInput = U.h('input', {
      class: 'input', type: 'number', inputmode: 'decimal', min: '0',
      placeholder: T('set.budgetPlaceholder'),
      value: s.monthlyBudget ? String(s.monthlyBudget) : ''
    });
    budInput.addEventListener('change', function () {
      const v = U.parseAmount(budInput.value);
      DB.updateSettings({ monthlyBudget: v });
      toast(v > 0 ? T('msg.monthBudgetSet') : T('msg.monthBudgetOff'));
      render();
    });
    budForm.appendChild(budInput);
    budForm.appendChild(U.h('p', { class: 'hint', text: T('set.catBudgetHint') }));
    budCard.appendChild(budForm);
    list.appendChild(budCard);

    /* 密碼鎖 */
    const secCard = U.h('div', { class: 'set-card' });
    const secForm = U.h('div', { class: 'set-form' }, [
      U.h('div', { class: 'field__label', text: T('sec.title') }),
      U.h('div', { class: 'set-row', style: { padding: '0', border: '0' } }, [
        U.h('div', {}, [
          U.h('div', { class: 'set-row__name', text: T('sec.password') }),
          U.h('div', { class: 'set-row__desc', text: T('sec.hint') })
        ]),
        U.h('span', {
          class: 'set-row__value',
          style: { color: s.pinEnabled ? 'var(--mint)' : 'var(--muted)' },
          text: s.pinEnabled ? T('sec.enabled') : T('sec.disabled')
        })
      ]),
      U.h('button', {
        class: 'btn btn--ghost btn--block',
        type: 'button',
        text: s.pinEnabled ? T('sec.disable') : T('sec.enable'),
        onclick: function () {
          if (s.pinEnabled) openPinSheet('disable');
          else openPinSheet('enable');
        }
      })
    ]);
    if (s.pinEnabled) {
      secForm.appendChild(U.h('button', {
        class: 'btn btn--ghost btn--block',
        type: 'button',
        text: T('sec.change'),
        onclick: function () { openPinSheet('change'); }
      }));
    }
    secCard.appendChild(secForm);
    list.appendChild(secCard);

    /* 分類管理 */
    const catCard = U.h('div', { class: 'set-card' });
    catCard.appendChild(U.h('div', { class: 'set-form' }, [
      U.h('div', { class: 'field__label', text: T('set.categories') })
    ]));

    DB.categories(true).forEach(function (c) {
      catCard.appendChild(U.h('div', { class: 'cat-manage-row' }, [
        catIcon(c),
        U.h('input', {
          class: 'input',
          value: I18N.catName(c),
          maxlength: '12',
          onchange: function (ev) {
            const v = ev.target.value.trim();
            if (!v) return;
            const patch = Object.assign({}, c);
            if (I18N.getLang() === 'en') patch.nameEn = v;
            else patch.name = v;
            DB.upsertCategory(patch);
            toast(T('msg.catUpdated'));
          }
        }),
        U.h('input', {
          class: 'input budget', type: 'number', inputmode: 'decimal', min: '0',
          placeholder: T('set.budgetPh'),
          value: c.budget > 0 ? String(c.budget) : '',
          onchange: function (ev) {
            DB.setCategoryBudget(c.id, U.parseAmount(ev.target.value));
            toast(T('msg.budgetCatUpdated'));
          }
        }),
        U.h('button', {
          class: 'mini-btn', type: 'button',
          title: c.archived ? 'restore' : 'archive',
          html: c.archived
            ? '<svg viewBox="0 0 24 24" fill="none"><path d="M5 12l4 4 10-10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
            : '<svg viewBox="0 0 24 24" fill="none"><path d="M4 7h16M7 7l1 12h8l1-12M10 7V5h4v2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
          onclick: function () {
            DB.upsertCategory(Object.assign({}, c, { archived: !c.archived }));
            render();
          }
        }),
        U.h('button', {
          class: 'mini-btn', type: 'button', title: 'delete',
          html: '<svg viewBox="0 0 24 24" fill="none"><path d="M6 7h12M9 7V5h6v2M8 7l1 12h6l1-12" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
          onclick: function () {
            if (DB.categories(true).length <= 1) return toast(T('msg.keepOneCat'));
            if (confirm(T('ask.deleteCat', { name: I18N.catName(c) }))) {
              DB.removeCategory(c.id);
              toast(T('msg.catDeleted'));
              render();
            }
          }
        })
      ]));
      // 點圖示可更換（上傳／貼上圖片或 emoji）
      catCard.lastChild.querySelector('.cat-tile').addEventListener('click', function () {
        openIconSheet(c);
      });
    });

    const addForm = U.h('div', { class: 'set-form' });
    addForm.appendChild(U.h('button', {
      class: 'btn btn--ghost btn--sm btn--block',
      type: 'button',
      text: T('set.addCategory'),
      onclick: function () {
        const name = prompt(T('ask.catName'));
        if (!name) return;
        const cat = {
          id: U.uid(),
          name: name.trim().slice(0, 12),
          emoji: '✨', icon: '',
          color: '#A79E8C',
          budget: 0, archived: false
        };
        if (I18N.getLang() === 'en') { cat.nameEn = cat.name; cat.name = name.trim().slice(0, 12); }
        DB.upsertCategory(cat);
        toast(T('msg.catAdded'));
        render();
      }
    }));
    catCard.appendChild(addForm);
    list.appendChild(catCard);

    /* 資料 */
    const dataCard = U.h('div', { class: 'set-card' });
    dataCard.appendChild(U.h('div', { class: 'set-form' }, [
      U.h('div', { class: 'field__label', text: T('set.data') }),
      U.h('p', { class: 'hint', text: T('set.dataHint') }),
      U.h('button', {
        class: 'btn btn--ghost btn--block', type: 'button',
        text: T('set.export'), onclick: exportData
      }),
      U.h('button', {
        class: 'btn btn--ghost btn--block', type: 'button',
        text: T('set.import'), onclick: importData
      }),
      U.h('button', {
        class: 'btn btn--ghost btn--block', type: 'button',
        text: T('set.sample'),
        onclick: function () {
          if (confirm(T('ask.sample'))) {
            const n = DB.loadSampleData();
            toast(T('msg.sampleLoaded', { n: n }));
            render();
          }
        }
      }),
      U.h('button', {
        class: 'btn btn--danger btn--block', type: 'button',
        text: T('set.erase'),
        onclick: function () {
          if (confirm(T('ask.erase'))) {
            DB.reset();
            toast(T('msg.cleared'));
            render();
          }
        }
      })
    ]));
    list.appendChild(dataCard);

    /* 關於 + 贊助 */
    const about = U.h('div', { class: 'set-card' });
    about.appendChild(U.h('div', { class: 'set-form' }, [
      U.h('div', { class: 'field__label', text: T('title.about') }),
      U.h('p', { class: 'hint', text: T('set.aboutHint') }),
      U.h('button', {
        class: 'btn btn--ghost btn--sm btn--block', type: 'button',
        text: T('set.install'), onclick: installPWA
      }),
      U.h('button', {
        class: 'btn btn--primary btn--block',
        type: 'button',
        style: { marginTop: '6px' },
        text: '☕ ' + T('sup.button'),
        onclick: function () { window.open(SUPPORT_URL, '_blank', 'noopener'); }
      }),
      U.h('p', { class: 'hint', text: T('sup.enjoy') })
    ]));
    list.appendChild(about);

    root.appendChild(list);
    root.appendChild(U.h('p', { class: 'footer-note', text: T('set.footer') }));
  }

  function exportData() {
    const blob = new Blob([DB.exportJSON()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ledger-backup-' + U.todayYMD() + '.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 500);
    toast(T('msg.backupDownloaded'));
  }

  function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.addEventListener('change', function () {
      const file = input.files && input.files[0];
      if (!file) return;
      if (!confirm(T('ask.import'))) return;
      const reader = new FileReader();
      reader.onload = function () {
        try {
          DB.importJSON(String(reader.result));
          toast(T('msg.imported'));
          render();
        } catch (e) {
          toast(T('msg.importFailed', { e: (e && e.message) || '' }));
        }
      };
      reader.readAsText(file);
    });
    input.click();
  }

  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
  });

  function installPWA() {
    const sheet = els.sheet;
    U.clear(sheet);
    sheet.appendChild(U.h('div', { class: 'sheet__grip' }));
    sheet.appendChild(U.h('div', { class: 'sheet__head' }, [
      U.h('h2', { class: 'sheet__title', text: T('inst.title') }),
      U.h('button', {
        class: 'icon-btn', type: 'button',
        html: '<svg viewBox="0 0 24 24" fill="none"><path d="M7 7l10 10M17 7 7 17" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
        onclick: closeSheet
      })
    ]));

    // 支援一鍵安裝的瀏覽器（Chrome / Edge 等）
    if (deferredPrompt) {
      sheet.appendChild(U.h('button', {
        class: 'btn btn--primary btn--block',
        type: 'button',
        text: '⚡ ' + T('inst.auto'),
        onclick: function () {
          deferredPrompt.prompt();
          deferredPrompt.userChoice.then(function () { deferredPrompt = null; });
          closeSheet();
        }
      }));
      sheet.appendChild(U.h('p', { class: 'hint', style: { textAlign: 'center' }, text: T('inst.note') }));
    }

    const ua = navigator.userAgent || '';
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isAnd = /Android/i.test(ua);
    const mine = isIOS ? 'ios' : isAnd ? 'and' : 'desk';

    function stepGroup(titleKey, stepKeys, highlight) {
      const box = U.h('div', { class: 'inst-group' + (highlight ? ' is-hi' : '') });
      const head = U.h('div', { class: 'inst-group__title' });
      if (highlight) head.appendChild(U.h('span', { class: 'inst-badge', text: T('inst.yourDevice') }));
      head.appendChild(U.h('span', { text: T(titleKey) }));
      box.appendChild(head);
      const ol = U.h('ol', { class: 'inst-steps' });
      stepKeys.forEach(function (k) {
        ol.appendChild(U.h('li', { text: T(k) }));
      });
      box.appendChild(ol);
      return box;
    }

    const groups = [
      { id: 'ios', title: 'inst.iosTitle', steps: ['inst.ios1', 'inst.ios2', 'inst.ios3'] },
      { id: 'and', title: 'inst.andTitle', steps: ['inst.and1', 'inst.and2', 'inst.and3'] },
      { id: 'desk', title: 'inst.deskTitle', steps: ['inst.desk1', 'inst.desk2'] }
    ];
    // 目前裝置排最前
    groups.sort(function (a, b) {
      return (a.id === mine ? -1 : 0) - (b.id === mine ? -1 : 0);
    });

    const wrap = U.h('div', { class: 'inst-wrap' });
    groups.forEach(function (g) {
      wrap.appendChild(stepGroup(g.title, g.steps, g.id === mine));
    });
    sheet.appendChild(wrap);
    sheet.appendChild(U.h('p', { class: 'hint', text: T('inst.note') }));

    els.overlay.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  /* ──────────────────────────────────────────────
   * 密碼鎖
   * ────────────────────────────────────────────── */

  function pinDots(n) {
    const wrap = U.h('div', { class: 'pin-dots' });
    for (let i = 0; i < 4; i++) {
      wrap.appendChild(U.h('i', { class: 'pin-dot' + (i < n ? ' is-on' : '') }));
    }
    return wrap;
  }

  function pinPad(onDigit, onBack) {
    const pad = U.h('div', { class: 'keypad' });
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back'].forEach(function (k) {
      if (k === 'back') {
        pad.appendChild(U.h('button', {
          class: 'key key--util', type: 'button', 'aria-label': 'back',
          html: '<svg viewBox="0 0 24 24" fill="none"><path d="M9 6h9.5A1.5 1.5 0 0 1 20 7.5v9a1.5 1.5 0 0 1-1.5 1.5H9L3.8 12.4a.6.6 0 0 1 0-.8L9 6Z" stroke="currentColor" stroke-width="1.7"/><path d="M11.5 10l4 4M15.5 10l-4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
          onclick: onBack
        }));
      } else if (k === 'clear') {
        pad.appendChild(U.h('button', {
          class: 'key key--util', type: 'button',
          text: T('sec.clear'),
          style: { fontSize: '13px', fontWeight: '650' },
          onclick: function () { onDigit(''); }
        }));
      } else {
        pad.appendChild(U.h('button', {
          class: 'key', type: 'button', text: k,
          onclick: function () { onDigit(k); }
        }));
      }
    });
    return pad;
  }

  /* mode: enable | disable | change */
  function openPinSheet(mode) {
    const flow = {
      step: mode === 'enable' ? 'set1' : 'verify',
      pin: '',
      first: '',
      mode: mode
    };

    function draw() {
      const sheet = els.sheet;
      U.clear(sheet);
      sheet.appendChild(U.h('div', { class: 'sheet__grip' }));

      let title, sub;
      if (flow.step === 'verify') { title = T('sec.enterCurrent'); sub = T('sec.lockSub'); }
      else if (flow.step === 'set1') { title = T('sec.setPin'); sub = T('sec.lockSub'); }
      else { title = T('sec.setPinAgain'); sub = T('sec.lockSub'); }

      sheet.appendChild(U.h('div', { class: 'sheet__head' }, [
        U.h('h2', { class: 'sheet__title', text: title }),
        U.h('button', {
          class: 'icon-btn', type: 'button', title: 'close',
          html: '<svg viewBox="0 0 24 24" fill="none"><path d="M7 7l10 10M17 7 7 17" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
          onclick: closeSheet
        })
      ]));

      sheet.appendChild(U.h('div', { class: 'pin-stage' }, [
        U.h('p', { class: 'pin-sub', text: sub }),
        pinDots(flow.pin.length)
      ]));

      sheet.appendChild(pinPad(function (k) {
        if (k === '') { flow.pin = ''; draw(); return; }
        if (flow.pin.length >= 4) return;
        flow.pin += k;
        draw();
        if (flow.pin.length === 4) setTimeout(step, 140);
      }, function () {
        flow.pin = flow.pin.slice(0, -1);
        draw();
      }));
    }

    function step() {
      if (flow.step === 'verify') {
        if (!DB.verifyPin(flow.pin)) {
          flow.pin = '';
          toast(T('sec.pinWrong'));
          draw();
          return;
        }
        if (flow.mode === 'disable') {
          DB.clearPin();
          closeSheet();
          toast(T('sec.pinOff'));
          render();
          return;
        }
        flow.step = 'set1';
        flow.pin = '';
        draw();
        return;
      }
      if (flow.step === 'set1') {
        flow.first = flow.pin;
        flow.pin = '';
        flow.step = 'set2';
        draw();
        return;
      }
      if (flow.pin === flow.first) {
        DB.setPin(flow.pin);
        closeSheet();
        toast(T('sec.pinSet'));
        render();
      } else {
        flow.pin = '';
        flow.first = '';
        flow.step = 'set1';
        toast(T('sec.pinMismatch'));
        draw();
      }
    }

    els.overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    draw();
  }

  /* 全螢幕鎖定 */
  function showLock() {
    state.locked = true;
    let pin = '';
    const lock = els.lock;
    U.clear(lock);
    lock.hidden = false;

    lock.appendChild(U.h('div', { class: 'lock-inner' }, [
      U.h('div', {
        class: 'lock-mark',
        html: '<svg viewBox="0 0 24 24" fill="none"><rect x="5" y="10" width="14" height="10" rx="2.5" stroke="currentColor" stroke-width="1.8"/><path d="M8 10V7.5a4 4 0 0 1 8 0V10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
      }),
      U.h('h2', { class: 'lock-title', text: T('sec.lockTitle') }),
      U.h('p', { class: 'pin-sub', text: T('sec.enterPin') }),
      pinDots(0),
      pinPad(function (k) {
        if (k === '') { pin = ''; redraw(); return; }
        if (pin.length >= 4) return;
        pin += k;
        redraw();
        if (pin.length === 4) {
          setTimeout(function () {
            if (DB.verifyPin(pin)) {
              state.locked = false;
              lock.hidden = true;
            } else {
              pin = '';
              toast(T('sec.pinWrong'));
              redraw();
            }
          }, 140);
        }
      }, function () {
        pin = pin.slice(0, -1);
        redraw();
      })
    ]));

    function redraw() {
      const dots = lock.querySelector('.pin-dots');
      if (dots) dots.replaceWith(pinDots(pin.length));
    }
  }

  /* ──────────────────────────────────────────────
   * 記帳 Sheet
   * ────────────────────────────────────────────── */

  const draft = { amount: '', categoryId: 'meal', date: U.todayYMD(), note: '' };

  function openEntrySheet(entry) {
    state.editingId = entry ? entry.id : null;
    if (entry) {
      draft.amount = String(entry.amount);
      draft.categoryId = entry.categoryId;
      draft.date = entry.date;
      draft.note = entry.note || '';
    } else {
      draft.amount = '';
      draft.date = U.todayYMD();
      draft.note = '';
      const first = DB.categories(false)[0];
      draft.categoryId = first ? first.id : 'misc';
    }
    renderSheet();
    els.overlay.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeSheet() {
    els.overlay.hidden = true;
    document.body.style.overflow = '';
    state.editingId = null;
  }

  function renderSheet() {
    const sheet = els.sheet;
    U.clear(sheet);
    sheet.appendChild(U.h('div', { class: 'sheet__grip' }));

    sheet.appendChild(U.h('div', { class: 'sheet__head' }, [
      U.h('h2', {
        class: 'sheet__title',
        text: state.editingId ? T('title.editEntry') : T('title.newEntry')
      }),
      U.h('div', { class: 'sheet__actions' }, [
        state.editingId ? U.h('button', {
          class: 'icon-btn icon-btn--danger',
          type: 'button',
          html: '<svg viewBox="0 0 24 24" fill="none"><path d="M6 7h12M9 7V5h6v2M8 7l1 12h6l1-12" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
          onclick: function () {
            if (confirm(T('ask.deleteEntry'))) {
              DB.removeEntry(state.editingId);
              toast(T('msg.deleted'));
              closeSheet();
              render();
            }
          }
        }) : null,
        U.h('button', {
          class: 'icon-btn', type: 'button',
          html: '<svg viewBox="0 0 24 24" fill="none"><path d="M7 7l10 10M17 7 7 17" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>',
          onclick: closeSheet
        })
      ])
    ]));

    const amountStage = U.h('div', { class: 'amount-stage' });
    amountStage.appendChild(U.h('div', { class: 'amount-stage__label', text: T('entry.amount') }));
    amountStage.appendChild(U.h('div', {
      class: 'amount-stage__value' + (U.parseAmount(draft.amount) <= 0 ? ' is-zero' : '')
    }, [
      U.h('span', { class: 'unit', text: moneyUnit() }),
      document.createTextNode(draft.amount === '' ? '0' : draft.amount)
    ]));
    sheet.appendChild(amountStage);

    const pad = U.h('div', { class: 'keypad' });
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back'].forEach(function (k) {
      if (k === 'back') {
        pad.appendChild(U.h('button', {
          class: 'key key--util', type: 'button', 'aria-label': T('entry.backspace'),
          html: '<svg viewBox="0 0 24 24" fill="none"><path d="M9 6h9.5A1.5 1.5 0 0 1 20 7.5v9a1.5 1.5 0 0 1-1.5 1.5H9L3.8 12.4a.6.6 0 0 1 0-.8L9 6Z" stroke="currentColor" stroke-width="1.7"/><path d="M11.5 10l4 4M15.5 10l-4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
          onclick: function () {
            draft.amount = draft.amount.slice(0, -1);
            renderSheet();
          }
        }));
      } else {
        pad.appendChild(U.h('button', {
          class: 'key', type: 'button', text: k,
          onclick: function () { pushKey(k); }
        }));
      }
    });
    sheet.appendChild(pad);

    sheet.appendChild(U.h('div', { class: 'field-label', text: T('entry.category') }));
    const grid = U.h('div', { class: 'cat-grid' });
    DB.categories(false).forEach(function (c) {
      const chip = U.h('button', {
        class: 'cat-chip' + (draft.categoryId === c.id ? ' is-on' : ''),
        type: 'button',
        onclick: function () {
          draft.categoryId = c.id;
          renderSheet();
        }
      }, [
        c.iconData
          ? U.h('img', {
              src: c.iconData,
              alt: '',
              style: { width: '36px', height: '36px', objectFit: 'contain' }
            })
          : c.icon
            ? iconImg(c.icon, { width: '36px', height: '36px', objectFit: 'contain' })
            : U.h('div', { class: 'cat-chip__emoji', text: c.emoji }),
        U.h('div', { class: 'cat-chip__name', text: I18N.catName(c) })
      ]);
      grid.appendChild(chip);
    });
    sheet.appendChild(grid);

    const fields = U.h('div', { class: 'fields', style: { marginTop: '16px' } });
    const dateField = U.h('div', { class: 'field' }, [
      U.h('div', { class: 'field__label', text: T('entry.date') })
    ]);
    const dateInput = U.h('input', { class: 'input', type: 'date', value: draft.date });
    dateInput.addEventListener('change', function () {
      draft.date = dateInput.value || U.todayYMD();
    });
    dateField.appendChild(dateInput);

    const noteField = U.h('div', { class: 'field field--full' }, [
      U.h('div', { class: 'field__label', text: T('entry.note') })
    ]);
    const noteInput = U.h('input', {
      class: 'input', type: 'text', maxlength: '30',
      placeholder: T('entry.notePh'), value: draft.note
    });
    noteInput.addEventListener('input', function () { draft.note = noteInput.value; });
    noteField.appendChild(noteInput);

    fields.appendChild(dateField);
    fields.appendChild(noteField);
    sheet.appendChild(fields);

    sheet.appendChild(U.h('button', {
      class: 'btn btn--primary btn--block',
      type: 'button',
      style: { marginTop: '20px' },
      text: state.editingId ? T('entry.saveChanges') : T('entry.save'),
      onclick: saveEntry
    }));
  }

  function pushKey(k) {
    if (k === '.') {
      if (draft.amount.indexOf('.') >= 0) return;
      draft.amount = (draft.amount || '0') + '.';
    } else {
      if (draft.amount === '0') draft.amount = '';
      const next = draft.amount + k;
      if (/^\d*\.?\d{0,2}$/.test(next) && next.replace('.', '').length <= 9) {
        draft.amount = next;
      }
    }
    renderSheet();
  }

  function saveEntry() {
    const amount = U.parseAmount(draft.amount);
    if (amount <= 0) return toast(T('msg.enterAmount'));
    if (!draft.categoryId) return toast(T('msg.pickCategory'));
    const payload = {
      amount: amount,
      categoryId: draft.categoryId,
      date: draft.date || U.todayYMD(),
      note: (draft.note || '').trim()
    };
    if (state.editingId) {
      DB.updateEntry(state.editingId, payload);
      toast(T('msg.updated'));
    } else {
      DB.addEntry(payload);
      toast(T('msg.saved', { amount: moneyUnit() + U.fmtNum(amount) }));
    }
    closeSheet();
    render();
  }

  /* ──────────────────────────────────────────────
   * 雜項
   * ────────────────────────────────────────────── */

  let toastTimer = null;
  function toast(msg, ms) {
    const t = els.toast;
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, ms || 2200);
  }

  function switchView(view) {
    state.view = view;
    document.querySelectorAll('.tab[data-tab]').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-tab') === view);
    });
    render();
    window.scrollTo(0, 0);
  }

  function render() {
    renderTopbar();
    const map = {
      overview: [els.viewOverview, renderOverview],
      ledger: [els.viewLedger, renderLedger],
      compare: [els.viewCompare, renderCompare],
      settings: [els.viewSettings, renderSettings]
    };
    Object.keys(map).forEach(function (v) {
      const active = state.view === v;
      map[v][0].hidden = !active;
      if (active) map[v][1]();
    });
  }

  function bind() {
    document.querySelectorAll('.tab[data-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        switchView(btn.getAttribute('data-tab'));
      });
    });
    els.btnAdd.addEventListener('click', function () { openEntrySheet(null); });
    els.overlayScrim.addEventListener('click', closeSheet);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !els.overlay.hidden) closeSheet();
    });
    bindPasteIcon();
  }

  function init() {
    els.topbarLeft = document.getElementById('topbar-left');
    els.topbarCenter = document.getElementById('topbar-center');
    els.topbarRight = document.getElementById('topbar-right');
    els.viewOverview = document.getElementById('view-overview');
    els.viewLedger = document.getElementById('view-ledger');
    els.viewCompare = document.getElementById('view-compare');
    els.viewSettings = document.getElementById('view-settings');
    els.overlay = document.getElementById('overlay');
    els.overlayScrim = document.getElementById('overlay-scrim');
    els.sheet = document.getElementById('sheet');
    els.toast = document.getElementById('toast');
    els.btnAdd = document.getElementById('btn-add');
    els.lock = document.getElementById('lock');

    const s = DB.getSettings();
    I18N.setLang(s.lang || 'zh');
    document.documentElement.lang = (s.lang === 'en') ? 'en' : 'zh-TW';

    bind();
    render();

    if (s.pinEnabled && s.pinHash) showLock();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(function (err) {
        console.warn('sw register failed', err);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
