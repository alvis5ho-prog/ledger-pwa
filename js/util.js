/* 工具：日期、金額、DOM 小工具 */
(function (global) {
  'use strict';

  const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  /** @param {Date} d */
  function ymd(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function todayYMD() {
    return ymd(new Date());
  }

  function parseYMD(s) {
    const [y, m, d] = String(s).split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  }

  function monthKey(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1);
  }

  function parseMonthKey(s) {
    const [y, m] = String(s).split('-').map(Number);
    return new Date(y, (m || 1) - 1, 1);
  }

  function shiftMonth(key, delta) {
    const d = parseMonthKey(key);
    d.setMonth(d.getMonth() + delta);
    return monthKey(d);
  }

  function daysInMonth(key) {
    const d = parseMonthKey(key);
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  }

  function formatDate(s, opts) {
    const d = parseYMD(s);
    const mode = (opts && opts.mode) || 'long';
    const wk = WEEKDAYS[d.getDay()];
    if (mode === 'short') return (d.getMonth() + 1) + '/' + d.getDate();
    if (mode === 'md') return (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日';
    return d.getFullYear() + ' 年 ' + (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日（' + wk + '）';
  }

  function formatMonthLabel(key) {
    const d = parseMonthKey(key);
    return d.getFullYear() + ' 年 ' + (d.getMonth() + 1) + ' 月';
  }

  function relativeDay(s) {
    const t = parseYMD(todayYMD()).getTime();
    const d = parseYMD(s).getTime();
    const diff = Math.round((t - d) / 86400000);
    if (diff === 0) return '今天';
    if (diff === 1) return '昨天';
    if (diff === 2) return '前天';
    if (diff > 0 && diff < 7) return diff + ' 天前';
    return formatDate(s, { mode: 'md' });
  }

  /**
   * 金額顯示：千分位、最多 2 位小數、去掉尾端 0
   * @param {number} n
   */
  function fmtNum(n) {
    const neg = n < 0;
    const abs = Math.abs(n);
    const rounded = Math.round(abs * 100) / 100;
    const intPart = Math.floor(rounded + 1e-9);
    const frac = rounded - intPart;
    let out;
    if (frac > 0.0001) {
      out = rounded.toFixed(2);
      if (out.endsWith('0')) out = out.slice(0, -1);
    } else {
      out = String(intPart);
    }
    out = out.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return neg ? '-' + out : out;
  }

  function fmtMoney(n, currency) {
    const c = currency == null ? '' : currency;
    return c + fmtNum(n);
  }

  function fmtMoneyParts(n, currency) {
    const c = currency == null ? '' : currency;
    return { unit: c, num: fmtNum(n) };
  }

  function pct(n, digits) {
    const d = digits == null ? 1 : digits;
    const v = Math.round(n * Math.pow(10, d)) / Math.pow(10, d);
    return (v > 0 ? '+' : '') + v.toFixed(d) + '%';
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k === 'class') node.className = v;
        else if (k === 'text') node.textContent = v;
        else if (k === 'html') node.innerHTML = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') {
          node.addEventListener(k.slice(2).toLowerCase(), v);
        } else node.setAttribute(k, v === true ? '' : v);
      }
    }
    if (children != null) {
      const list = Array.isArray(children) ? children : [children];
      for (const c of list) {
        if (c == null || c === false) continue;
        node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      }
    }
    return node;
  }

  function clear(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
    return node;
  }

  function svg(tag, attrs) {
    const NS = 'http://www.w3.org/2000/svg';
    const node = document.createElementNS(NS, tag);
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        node.setAttribute(k, v);
      }
    }
    return node;
  }

  function h(tag, attrs, children) {
    return el(tag, attrs, children);
  }

  function debounce(fn, ms) {
    let t = null;
    return function () {
      const args = arguments;
      const self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, ms || 180);
    };
  }

  function parseAmount(str) {
    const n = parseFloat(String(str).replace(/[,\s]/g, ''));
    return isFinite(n) ? n : 0;
  }

  global.U = {
    WEEKDAYS, pad, ymd, todayYMD, parseYMD, monthKey, parseMonthKey, shiftMonth,
    daysInMonth, formatDate, formatMonthLabel, relativeDay,
    fmtNum, fmtMoney, fmtMoneyParts, pct, uid, clamp, el, h, clear, svg,
    debounce, parseAmount
  };
})(window);
