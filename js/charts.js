/* SVG 圖表 — 預算環、結算柱、分歧偏差、趨勢線。無外部依賴。 */
(function (global) {
  'use strict';

  function svgRoot(w, h, cls) {
    const s = U.svg('svg', {
      viewBox: '0 0 ' + w + ' ' + h,
      width: w, height: h,
      'aria-hidden': 'true'
    });
    if (cls) s.setAttribute('class', cls);
    return s;
  }

  function polar(cx, cy, r, deg) {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function arcPath(cx, cy, rOuter, rInner, startDeg, endDeg) {
    const large = endDeg - startDeg > 180 ? 1 : 0;
    const o1 = polar(cx, cy, rOuter, startDeg);
    const o2 = polar(cx, cy, rOuter, endDeg);
    const i1 = polar(cx, cy, rInner, endDeg);
    const i2 = polar(cx, cy, rInner, startDeg);
    return [
      'M', o1.x.toFixed(2), o1.y.toFixed(2),
      'A', rOuter, rOuter, 0, large, 1, o2.x.toFixed(2), o2.y.toFixed(2),
      'L', i1.x.toFixed(2), i1.y.toFixed(2),
      'A', rInner, rInner, 0, large, 0, i2.x.toFixed(2), i2.y.toFixed(2),
      'Z'
    ].join(' ');
  }

  /**
   * 預算環：單圈進度，可過量（>100% 顯示紅色續段）
   * opts: { size, used, budget, color, warnColor, trackColor }
   */
  function budgetRing(opts) {
    const o = opts || {};
    const size = o.size || 132;
    const cx = size / 2, cy = size / 2;
    const r = size * 0.38;
    const w = size * 0.115;
    const budget = Math.max(0, o.budget || 0);
    const used = Math.max(0, o.used || 0);
    const ratio = budget > 0 ? used / budget : 0;

    const s = svgRoot(size, size, 'chart-ring');

    s.appendChild(U.svg('circle', {
      cx: cx, cy: cy, r: r,
      fill: 'none',
      stroke: o.trackColor || 'rgba(239,234,224,0.12)',
      'stroke-width': w
    }));

    if (budget > 0 && used > 0) {
      const capped = Math.min(1, ratio);
      const warnFrom = Math.min(capped, 1);
      if (capped > 0) {
        s.appendChild(U.svg('path', {
          d: arcPath(cx, cy, r + w / 2, r - w / 2, 0, Math.max(0.01, capped * 360)),
          fill: o.color || '#5FD3A6'
        }));
      }
      if (ratio > 1) {
        // 超支續段
        s.appendChild(U.svg('path', {
          d: arcPath(cx, cy, r + w / 2, r - w / 2, 0, Math.max(0.01, Math.min(1, ratio - 1) * 360)),
          fill: o.warnColor || '#FF7A66',
          opacity: '.92'
        }));
      }
    }
    return s;
  }

  /**
   * 消費羅盤：刻度環 + 分段甜甜圈
   * segments: [{ label, value, color, key }]
   */
  function donut(segments, opts) {
    const o = opts || {};
    const size = o.size || 300;
    const cx = size / 2, cy = size / 2;
    const rOuter = size * 0.395;
    const rInner = size * 0.272;
    const rTick = size * 0.428;
    const total = segments.reduce(function (a, s) { return a + Math.max(0, s.value); }, 0);
    const tickColor = o.tickColor || 'rgba(239,234,224,0.22)';
    const baseColor = o.baseColor || 'rgba(239,234,224,0.08)';

    const s = svgRoot(size, size, 'chart-donut');

    const ticks = U.svg('g', {});
    for (let i = 0; i < 36; i++) {
      const deg = i * 10;
      const long = i % 3 === 0;
      const p1 = polar(cx, cy, rTick - (long ? 7 : 3.5), deg);
      const p2 = polar(cx, cy, rTick, deg);
      ticks.appendChild(U.svg('line', {
        x1: p1.x.toFixed(2), y1: p1.y.toFixed(2),
        x2: p2.x.toFixed(2), y2: p2.y.toFixed(2),
        stroke: tickColor,
        'stroke-width': long ? 1.4 : 0.9,
        'stroke-linecap': 'round'
      }));
    }
    s.appendChild(ticks);

    s.appendChild(U.svg('circle', {
      cx: cx, cy: cy, r: (rOuter + rInner) / 2,
      fill: 'none', stroke: baseColor,
      'stroke-width': rOuter - rInner
    }));

    if (total <= 0) return s;

    let angle = 0;
    segments.forEach(function (seg) {
      const v = Math.max(0, seg.value);
      if (v <= 0) return;
      const sweep = (v / total) * 360;
      const gap = sweep > 6 ? 1.1 : 0;
      const path = U.svg('path', {
        d: arcPath(cx, cy, rOuter, rInner, angle + gap / 2, angle + sweep - gap / 2),
        fill: seg.color || '#A79E8C',
        opacity: o.dimOthers && o.focusKey && seg.key !== o.focusKey ? 0.28 : 1
      });
      path.style.transition = 'opacity .2s ease';
      s.appendChild(path);
      angle += sweep;
    });
    return s;
  }

  /**
   * 柱狀圖（月／日）— 實際 vs 預算可疊加目標線
   * bars: [{ label, value, color?, muted? }]
   * opts: { width, height, avg, avgLabel, showLabelsEvery, labelColor, target }
   */
  function columns(bars, opts) {
    const o = opts || {};
    const width = o.width || 520;
    const height = o.height || 190;
    const padL = 8, padR = 8, padT = 18, padB = 26;
    const innerW = width - padL - padR;
    const innerH = height - padT - padB;
    const n = bars.length || 1;
    const slot = innerW / n;
    const gap = Math.min(10, slot * 0.28);
    const barW = Math.max(3, slot - gap);
    const labelColor = o.labelColor || 'rgba(239,234,224,0.45)';
    const warnColor = o.warnColor || '#FF7A66';

    const maxV = Math.max.apply(null, bars.map(function (b) { return b.value || 0; })
      .concat([o.avg || 0, o.target || 0, 1]));

    const s = svgRoot(width, height, 'chart-cols');

    function refLine(v, text, color, dash) {
      if (v == null || v <= 0) return;
      const y = padT + innerH - (v / maxV) * innerH;
      s.appendChild(U.svg('line', {
        x1: padL, x2: width - padR, y1: y.toFixed(2), y2: y.toFixed(2),
        stroke: color, 'stroke-width': 1, 'stroke-dasharray': dash, opacity: '.75'
      }));
      const lbl = U.svg('text', {
        x: width - padR, y: (y - 6).toFixed(2),
        'text-anchor': 'end',
        fill: color, 'font-size': '10', 'font-weight': '600'
      });
      lbl.textContent = text;
      s.appendChild(lbl);
    }

    refLine(o.avg, o.avgLabel || '平均', warnColor, '3 4');
    refLine(o.target, o.targetLabel || '預算', '#5FD3A6', '2 5');

    bars.forEach(function (b, i) {
      const v = Math.max(0, b.value || 0);
      const hgt = v <= 0 ? 0 : Math.max(2, (v / maxV) * innerH);
      const x = padL + i * slot + (slot - barW) / 2;
      const y = padT + innerH - hgt;
      const color = b.color || (b.muted ? 'rgba(239,234,224,0.18)' : '#5FD3A6');

      if (hgt > 0) {
        s.appendChild(U.svg('rect', {
          x: x.toFixed(2), y: y.toFixed(2),
          width: barW.toFixed(2), height: hgt.toFixed(2),
          rx: Math.min(5, barW / 2),
          fill: color
        }));
      }

      const every = o.showLabelsEvery || (n > 16 ? 2 : 1);
      if (i % every === 0 || i === n - 1) {
        const t = U.svg('text', {
          x: (x + barW / 2).toFixed(2),
          y: height - 8,
          'text-anchor': 'middle',
          fill: labelColor,
          'font-size': '10'
        });
        t.textContent = b.label;
        s.appendChild(t);
      }
    });
    return s;
  }

  /**
   * 交錯結算柱：預算(淡) + 實際(亮) 成對
   * rows: [{ label, budget, actual, color }]
   */
  function pairedColumns(rows, opts) {
    const o = opts || {};
    const width = o.width || 520;
    const height = o.height || 200;
    const padL = 8, padR = 8, padT = 16, padB = 26;
    const innerW = width - padL - padR;
    const innerH = height - padT - padB;
    const n = rows.length || 1;
    const slot = innerW / n;
    const pairW = Math.min(26, slot * 0.72);
    const barW = pairW / 2 - 1.5;
    const labelColor = o.labelColor || 'rgba(239,234,224,0.45)';

    const maxV = Math.max.apply(null, rows.reduce(function (a, r) {
      return a.concat([r.budget || 0, r.actual || 0]);
    }, [1]));

    const s = svgRoot(width, height, 'chart-paired');

    rows.forEach(function (r, i) {
      const cx = padL + i * slot + slot / 2;
      const bh = Math.max(0, (r.budget / maxV) * innerH);
      const ah = Math.max(0, (r.actual / maxV) * innerH);

      if (bh > 0) {
        s.appendChild(U.svg('rect', {
          x: (cx - pairW / 2).toFixed(2),
          y: (padT + innerH - bh).toFixed(2),
          width: barW.toFixed(2), height: bh.toFixed(2),
          rx: 3, fill: 'rgba(239,234,224,0.16)'
        }));
      }
      if (ah > 0) {
        s.appendChild(U.svg('rect', {
          x: (cx + 1.5).toFixed(2),
          y: (padT + innerH - ah).toFixed(2),
          width: barW.toFixed(2), height: ah.toFixed(2),
          rx: 3, fill: r.color || '#5FD3A6'
        }));
      }

      const t = U.svg('text', {
        x: cx.toFixed(2), y: height - 8,
        'text-anchor': 'middle',
        fill: labelColor, 'font-size': '10'
      });
      t.textContent = r.label;
      s.appendChild(t);
    });
    return s;
  }

  /** 向上取整到好看的刻度（1/1.5/2/2.5/5/10 × 10ⁿ） */
  function niceCeil(v) {
    if (v <= 0) return 1;
    const exp = Math.floor(Math.log10(v));
    const base = Math.pow(10, exp);
    const n = v / base;
    const steps = [1, 1.5, 2, 2.5, 5, 10];
    for (let i = 0; i < steps.length; i++) {
      if (n <= steps[i] + 1e-9) return steps[i] * base;
    }
    return 10 * base;
  }

  /**
   * 趨勢圖：量度尺（Y 軸刻度）＋ 每天分界（垂直分隔）＋ 面積折線
   * opts: { width, height, labels, color, labelColor, gridColor, unit? }
   */
  function trend(values, opts) {
    const o = opts || {};
    const width = o.width || 520;
    const height = o.height || 178;
    const padL = 10, padR = 56, padT = 18, padB = 26;
    const innerW = width - padL - padR;
    const innerH = height - padT - padB;
    const n = values.length;
    const color = o.color || '#5FD3A6';
    const labelColor = o.labelColor || 'rgba(239,234,224,0.55)';
    const gridColor = o.gridColor || 'rgba(239,234,224,0.10)';
    const dividerColor = o.dividerColor || 'rgba(239,234,224,0.07)';
    const maxV = niceCeil(Math.max.apply(null, values.concat([1])));

    const s = svgRoot(width, height, 'chart-trend');

    const xAt = function (i) {
      return padL + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
    };
    const yAt = function (v) {
      return padT + innerH - (v / maxV) * innerH;
    };

    /* 量度尺：水平刻度線 + 右側金額標籤 */
    const steps = 4;
    for (let g = 0; g <= steps; g++) {
      const v = (maxV / steps) * g;
      const y = yAt(v);
      s.appendChild(U.svg('line', {
        x1: padL, x2: padL + innerW,
        y1: y.toFixed(2), y2: y.toFixed(2),
        stroke: g === 0 ? 'rgba(239,234,224,0.22)' : gridColor,
        'stroke-width': g === 0 ? 1.2 : 1
      }));
      const lbl = U.svg('text', {
        x: padL + innerW + 8,
        y: (y + 4).toFixed(2),
        'text-anchor': 'start',
        fill: labelColor,
        'font-size': '15',
        'font-weight': '600'
      });
      lbl.textContent = U.fmtNum(Math.round(v * 100) / 100);
      s.appendChild(lbl);
    }

    /* 每天的分界：垂直細線 + 日期標籤 */
    const labels = o.labels || [];
    for (let i = 0; i < n; i++) {
      const x = xAt(i);
      s.appendChild(U.svg('line', {
        x1: x.toFixed(2), x2: x.toFixed(2),
        y1: padT, y2: padT + innerH,
        stroke: dividerColor,
        'stroke-width': 1
      }));
      if (labels[i] != null) {
        const t = U.svg('text', {
          x: x.toFixed(2),
          y: height - 7,
          'text-anchor': 'middle',
          fill: labelColor,
          'font-size': '15',
          'font-weight': '600'
        });
        t.textContent = labels[i];
        s.appendChild(t);
      }
    }

    if (!n) return s;

    /* 面積 + 折線 */
    const pts = values.map(function (v, i) {
      return [xAt(i), yAt(Math.max(0, v))];
    });
    const line = pts.map(function (p, i) {
      return (i ? 'L' : 'M') + p[0].toFixed(2) + ' ' + p[1].toFixed(2);
    }).join(' ');
    const area = line +
      ' L' + pts[pts.length - 1][0].toFixed(2) + ' ' + (padT + innerH) +
      ' L' + pts[0][0].toFixed(2) + ' ' + (padT + innerH) + ' Z';

    const gradId = 'trendfill' + Math.random().toString(36).slice(2, 7);
    const defs = U.svg('defs');
    const grad = U.svg('linearGradient', { id: gradId, x1: 0, y1: 0, x2: 0, y2: 1 });
    grad.appendChild(U.svg('stop', { offset: '0%', 'stop-color': color, 'stop-opacity': '.32' }));
    grad.appendChild(U.svg('stop', { offset: '100%', 'stop-color': color, 'stop-opacity': '0' }));
    defs.appendChild(grad);
    s.appendChild(defs);

    s.appendChild(U.svg('path', { d: area, fill: 'url(#' + gradId + ')' }));
    s.appendChild(U.svg('path', {
      d: line,
      fill: 'none',
      stroke: color,
      'stroke-width': 2.6,
      'stroke-linejoin': 'round',
      'stroke-linecap': 'round'
    }));

    const last = pts[pts.length - 1];
    s.appendChild(U.svg('circle', {
      cx: last[0].toFixed(2), cy: last[1].toFixed(2), r: 4.2, fill: color
    }));

    return s;
  }

  global.Charts = {
    budgetRing, donut, columns, pairedColumns, trend, arcPath, polar
  };
})(window);
