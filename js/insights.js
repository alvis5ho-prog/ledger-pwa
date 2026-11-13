/* 洞察引擎 — 本地統計拆解：總額變化來自「次數」還是「單次金額」
   total = 筆數 × 單次均消；delta = 次數影響 + 單次金額影響（精確分解） */
(function (global) {
  'use strict';

  function tally(entries) {
    const m = {};
    entries.forEach(function (e) {
      if (!m[e.categoryId]) m[e.categoryId] = { count: 0, total: 0 };
      m[e.categoryId].count += 1;
      m[e.categoryId].total += e.amount;
    });
    return m;
  }

  function rowsForCompare(nowE, prevE) {
    const nowM = tally(nowE);
    const prevM = tally(prevE);
    const ids = {};
    Object.keys(nowM).forEach(function (k) { ids[k] = true; });
    Object.keys(prevM).forEach(function (k) { ids[k] = true; });

    return Object.keys(ids).map(function (id) {
      const n1 = nowM[id] ? nowM[id].count : 0;
      const t1 = nowM[id] ? nowM[id].total : 0;
      const n0 = prevM[id] ? prevM[id].count : 0;
      const t0 = prevM[id] ? prevM[id].total : 0;
      const a1 = n1 ? t1 / n1 : 0;
      const a0 = n0 ? t0 / n0 : 0;
      return {
        id: id,
        n1: n1, n0: n0, t1: t1, t0: t0, a1: a1, a0: a0,
        delta: t1 - t0,
        freqEffect: (n1 - n0) * a0,
        avgEffect: (a1 - a0) * n1
      };
    }).filter(function (r) {
      return Math.abs(r.delta) > 0.004 || r.n1 > 0 || r.n0 > 0;
    });
  }

  function fmtMoney(n) {
    return U.fmtNum(Math.abs(Math.round(n * 100) / 100));
  }

  function reasonPhrase(r, unit) {
    if (r.n0 === 0 && r.n1 > 0) {
      return I18N.t('ins.newItem', { n: r.n1 });
    }
    if (r.n1 === 0 && r.n0 > 0) {
      return I18N.t('ins.goneItem');
    }

    const parts = [];
    const dCount = r.n1 - r.n0;
    const dAvg = r.a1 - r.a0;

    if (dCount < 0) parts.push(I18N.t('ins.freqLess', { n: -dCount }));
    else if (dCount > 0) parts.push(I18N.t('ins.freqMore', { n: dCount }));
    else parts.push(I18N.t('ins.freqSame', { n: r.n1 }));

    if (Math.abs(dAvg) < 0.005) {
      parts.push(I18N.t('ins.avgSame'));
    } else if (dAvg > 0) {
      parts.push(I18N.t('ins.avgUp', { amount: unit + fmtMoney(dAvg) }));
    } else {
      parts.push(I18N.t('ins.avgDown', { amount: unit + fmtMoney(dAvg) }));
    }

    if (dCount !== 0 && Math.abs(dAvg) >= 0.005 && (dCount > 0) !== (dAvg > 0)) {
      return parts[0] + I18N.t('ins.but') + parts[1];
    }
    return parts.join(I18N.t('ins.and'));
  }

  /**
   * 產生精簡總結
   * nowE / prevE: 兩期的 entries
   * opts: { unit, prevLabel }
   */
  function buildInsight(nowE, prevE, opts) {
    const unit = (opts && opts.unit) || '';
    const prevLabel = (opts && opts.prevLabel) || '';
    const rows = rowsForCompare(nowE, prevE);
    const totalNow = nowE.reduce(function (a, e) { return a + e.amount; }, 0);
    const totalPrev = prevE.reduce(function (a, e) { return a + e.amount; }, 0);
    const delta = totalNow - totalPrev;

    const withName = rows.map(function (r) {
      const c = DB.getCategory(r.id) || { id: r.id };
      r.name = I18N.catName(c);
      return r;
    });

    const movers = withName.slice().sort(function (a, b) {
      return Math.abs(b.delta) - Math.abs(a.delta);
    }).filter(function (r) { return Math.abs(r.delta) > 0.004; });

    let headline;
    if (Math.abs(delta) < 0.005) {
      headline = I18N.t('ins.headFlat', { prev: prevLabel });
    } else {
      const sameDir = movers.filter(function (r) {
        return delta > 0 ? r.delta > 0 : r.delta < 0;
      });
      const topNames = sameDir.slice(0, 2).map(function (r) { return r.name; })
        .join(I18N.t('ins.nameJoin'));
      const pctText = totalPrev > 0 ? U.pct((delta / totalPrev) * 100) : I18N.t('gen.added');
      headline = delta > 0
        ? I18N.t('ins.headUp', {
            prev: prevLabel,
            amount: unit + fmtMoney(delta),
            pct: pctText,
            names: topNames || '—'
          })
        : I18N.t('ins.headDown', {
            prev: prevLabel,
            amount: unit + fmtMoney(delta),
            pct: pctText,
            names: topNames || '—'
          });
    }

    const top = movers.slice(0, 3);
    const bullets = top.map(function (r) {
      const arrow = r.delta > 0 ? '↑' : '↓';
      return r.name + ' ' + arrow + ' ' + unit + fmtMoney(r.delta) +
        I18N.t('ins.dash') + reasonPhrase(r, unit);
    });

    const used = {};
    top.forEach(function (r) { used[r.id] = true; });
    const special = withName.filter(function (r) {
      return ((r.n0 === 0 && r.n1 > 0) || (r.n1 === 0 && r.n0 > 0)) && !used[r.id];
    });
    if (bullets.length < 4 && special.length) {
      const s = special[0];
      bullets.push(
        s.name + ' ' + (s.n1 > 0 ? '+' : '−') + unit + fmtMoney(s.t1 > 0 ? s.t1 : s.t0) +
        I18N.t('ins.dash') + reasonPhrase(s, unit)
      );
    }

    return {
      headline: headline,
      bullets: bullets,
      rows: withName
    };
  }

  global.Insights = {
    buildInsight: buildInsight,
    rowsForCompare: rowsForCompare
  };
})(window);
