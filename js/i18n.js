/* 多語系：中文 / English */
(function (global) {
  'use strict';

  const dict = {
    /* 導覽與頂欄 */
    'nav.overview': ['總覽', 'Overview'],
    'nav.ledger': ['紀錄', 'Ledger'],
    'nav.compare': ['比較', 'Compare'],
    'nav.settings': ['設定', 'Settings'],
    'title.monthlySummary': ['本月結算', 'Monthly Summary'],
    'title.ledger': ['流水紀錄', 'Ledger'],
    'title.compare': ['期間比較', 'Compare'],
    'title.quarterReview': ['季度比較', 'Quarter Review'],
    'title.settings': ['設定', 'Settings'],
    'title.about': ['關於帳本', 'About'],
    'title.storedLocal': ['全部存在這台裝置', 'Stored on this device'],
    'title.newEntry': ['記一筆', 'New Entry'],
    'title.editEntry': ['編輯紀錄', 'Edit Entry'],

    /* 總覽 */
    'overview.monthSpent': ['本月支出', 'Spent this month'],
    'overview.vsLastMonth': ['比上月', 'vs last month'],
    'overview.entriesDaily': ['{count} 筆 · 日均 {amount}', '{count} entries · daily avg {amount}'],
    'overview.budgetPace': ['預算進度', 'Budget pace'],
    'overview.monthlyBudget': ['月預算', 'Monthly budget'],
    'overview.noBudget': ['尚未設定預算', 'No budget set'],
    'overview.used': ['已使用', 'used'],
    'overview.budgetLeft': ['預算剩餘', 'Budget left'],
    'overview.overBy': ['已超支', 'Over by'],
    'overview.projected': ['月底推估', 'Projected end'],
    'overview.daysLeft': ['距月底', 'Days left'],
    'overview.daysUnit': ['{n} 天', '{n} days'],
    'overview.setBudgetHint': ['到「比較 → 結算表」點預算欄位，即可為每個類別設預算，開始追蹤偏差。', 'Open Compare → Statement and tap the budget column to set per-category budgets.'],
    'overview.varianceBoard': ['偏差榜', 'Variance Board'],
    'overview.mostVsBudget': ['偏離預算最多', 'Largest vs budget'],
    'overview.mostVsLastMonth': ['偏離上月最多', 'Largest vs last month'],
    'overview.emptyTitle': ['這個月還沒有紀錄', 'No records this month'],
    'overview.emptyText': ['按右下角「＋」記第一筆，資料只留在這台裝置。或到設定載入示範資料。', 'Tap ＋ to record your first entry. Data stays on this device. You can also load sample data in Settings.'],
    'overview.budgetOf': ['預算 {amount}', 'Budget {amount}'],
    'overview.lastMonthOf': ['上月 {amount}', 'Last month {amount}'],
    'overview.devBudget': ['偏離預算', 'vs budget'],
    'overview.devLastMonth': ['偏離上月', 'vs last month'],
    'overview.recent14': ['近 14 日', 'Last 14 days'],
    'overview.total': ['合計', 'Total'],
    'overview.recent': ['最近紀錄', 'Recent'],
    'overview.moreInLedger': ['更多請到紀錄', 'More in Ledger'],
    'overview.footer': ['資料以本機儲存保存，不經過任何伺服器。更換裝置前請先匯出備份。', 'Data is stored locally on this device, never on a server. Export a backup before switching devices.'],

    /* 紀錄 */
    'ledger.all': ['全部', 'All'],
    'ledger.monthTotal': ['本月合計', 'This month'],
    'ledger.entriesOnly': ['{count} 筆', '{count} entries'],
    'ledger.entriesFiltered': ['{count} 筆 · {name}', '{count} entries · {name}'],
    'ledger.daySpent': ['支出 {amount}', 'Spent {amount}'],
    'ledger.emptyTitle': ['這個月沒有紀錄', 'No records this month'],
    'ledger.emptyText': ['切換其他月份或篩選，或按右下角「＋」記一筆。', 'Try another month or filter, or tap ＋ to add an entry.'],

    /* 比較 */
    'cmp.statement': ['結算表', 'Statement'],
    'cmp.monthly': ['月比', 'Monthly'],
    'cmp.quarterly': ['季比', 'Quarterly'],
    'cmp.colCategory': ['類別', 'Category'],
    'cmp.colBudget': ['預算', 'Budget'],
    'cmp.colActual': ['實際', 'Actual'],
    'cmp.colVariance': ['偏差', 'Variance'],
    'cmp.grandTotal': ['支出總計', 'Total'],
    'cmp.noBudget': ['未設預算', 'No budget'],
    'cmp.stmtHint': ['點一列可設定該類別的月預算。偏差＝實際−預算，▲ 超支 ▼ 省下。', 'Tap a row to set its monthly budget. Variance = actual − budget. ▲ over ▼ under.'],
    'cmp.budgetVsActual': ['預算對照', 'Budget vs Actual'],
    'cmp.paleBudget': ['淡＝預算　亮＝實際', 'Pale = budget · Bright = actual'],
    'cmp.emptyStmt': ['沒有可結算的項目', 'Nothing to settle yet'],
    'cmp.emptyStmtText': ['先記幾筆支出，或到設定為類別設定預算。', 'Record some spending first, or set category budgets in Settings.'],
    'cmp.monthTotalLabel': ['{month} 總支出', '{month} total spending'],
    'cmp.quarterTotalLabel': ['{quarter} 總支出', '{quarter} total spending'],
    'cmp.vsMonth': ['比 {month}', 'vs {month}'],
    'cmp.vsQuarter': ['比 {quarter}', 'vs {quarter}'],
    'cmp.vsSameQuarter': ['比去年同期', 'vs same quarter last year'],
    'cmp.last12': ['近 12 個月', 'Last 12 months'],
    'cmp.monthlyAvg': ['月均', 'Monthly avg'],
    'cmp.catMonthCmp': ['類別月比', 'Categories vs last month'],
    'cmp.comparedWith': ['與 {month}', 'Compared with {month}'],
    'cmp.devVsLastMonth': ['與上月偏差', 'vs last month'],
    'cmp.last8Q': ['近 8 季', 'Last 8 quarters'],
    'cmp.quarterAvg': ['季均', 'Quarterly avg'],
    'cmp.quarterRhythm': ['各季節奏', 'Quarterly Rhythm'],
    'cmp.dashedAvgQ': ['虛線＝季均', 'Dashed = quarter avg'],
    'cmp.quarterVariance': ['各季偏差', 'Quarterly Variance'],
    'cmp.distFromQAvg': ['與季均的差距', 'Distance from quarter avg'],
    'cmp.devVsQAvg': ['偏離季均', 'vs quarter avg'],
    'cmp.catQuarterCmp': ['類別季比', 'Categories vs last quarter'],
    'cmp.priorQuarterOf': ['上季 {amount}', 'Prior quarter {amount}'],
    'cmp.devVsLastQuarter': ['與上季偏差', 'vs last quarter'],
    'cmp.quarterMonths': ['本季各月', 'Months in this quarter'],
    'cmp.emptyMonth': ['這個月沒有紀錄', 'No records this month'],
    'cmp.emptyMonthText': ['切換其他月份看看。', 'Try another month.'],
    'cmp.emptyQuarter': ['這一季沒有紀錄', 'No records this quarter'],
    'cmp.emptyQuarterText': ['切換其他季度看看。', 'Try another quarter.'],

    /* 設定 */
    'set.language': ['介面語言', 'Interface language'],
    'set.currency': ['貨幣符號', 'Currency'],
    'set.monthlyBudget': ['每月總預算（0 表示不設）', 'Monthly budget (0 = none)'],
    'set.budgetPlaceholder': ['例如 30000', 'e.g. 30000'],
    'set.catBudgetHint': ['各類別的預算請在「比較 → 結算表」點該列設定。', 'Set per-category budgets in Compare → Statement by tapping a row.'],
    'set.categories': ['類別與預算', 'Categories & budgets'],
    'set.budgetPh': ['預算', 'Budget'],
    'set.addCategory': ['＋ 新增類別', '+ Add category'],
    'set.data': ['資料', 'Data'],
    'set.dataHint': ['所有紀錄只存放在這台裝置的瀏覽器裡。更換手機前請先匯出備份。', 'All records live in this device’s browser storage. Export a backup before changing phones.'],
    'set.export': ['匯出備份（JSON）', 'Export backup (JSON)'],
    'set.import': ['匯入備份', 'Import backup'],
    'set.sample': ['載入示範資料', 'Load sample data'],
    'set.erase': ['清除所有資料', 'Erase all data'],
    'set.aboutHint': ['PWA 記帳本 · 離線可用 · 可安裝到主畫面。分類依家庭開支表設計：餐費、雜費、住房、交通、學費、差餉、工人薪金、石油汽、洗衣、寵物等 34 項。', 'A PWA expense ledger · works offline · installable to your home screen. 34 household categories: meals, groceries, housing, transport, tuition, rates, helper salary, LPG, laundry, pets, and more.'],
    'set.install': ['安裝到主畫面', 'Install to home screen'],
    'set.footer': ['版本 2.1 · 不收集任何個人資料', 'Version 2.1 · No personal data collected'],

    /* 記帳 */
    'entry.amount': ['金額', 'Amount'],
    'entry.category': ['類別', 'Category'],
    'entry.date': ['日期', 'Date'],
    'entry.note': ['備註（選填）', 'Note (optional)'],
    'entry.notePh': ['例如：午餐、隧道費', 'e.g. lunch, tunnel toll'],
    'entry.save': ['儲存', 'Save'],
    'entry.saveChanges': ['儲存修改', 'Save changes'],
    'entry.backspace': ['退格', 'Backspace'],
    'entry.close': ['關閉', 'Close'],
    'entry.delete': ['刪除', 'Delete'],

    /* 通用 */
    'gen.flat': ['持平', 'level'],
    'gen.added': ['新增', 'new'],
    'gen.noChange': ['持平', 'level'],
    'gen.unset': ['—', '—'],

    /* 對話框與提示 */
    'msg.saved': ['已記下 {amount}', 'Saved {amount}'],
    'msg.updated': ['已更新', 'Updated'],
    'msg.deleted': ['已刪除', 'Deleted'],
    'msg.enterAmount': ['請輸入金額', 'Enter an amount'],
    'msg.pickCategory': ['請選擇類別', 'Pick a category'],
    'msg.budgetUpdated': ['已更新「{name}」預算', 'Budget updated for {name}'],
    'msg.currencySet': ['貨幣已設為 {v}', 'Currency set to {v}'],
    'msg.monthBudgetSet': ['月預算已更新', 'Monthly budget updated'],
    'msg.monthBudgetOff': ['已停用月預算', 'Monthly budget disabled'],
    'msg.catUpdated': ['已更新類別', 'Category updated'],
    'msg.budgetCatUpdated': ['已更新預算', 'Budget updated'],
    'msg.catDeleted': ['已刪除類別', 'Category deleted'],
    'msg.keepOneCat': ['至少保留一個類別', 'Keep at least one category'],
    'msg.catAdded': ['已新增類別', 'Category added'],
    'msg.sampleLoaded': ['已載入 {n} 筆示範資料', 'Loaded {n} sample entries'],
    'msg.cleared': ['已清除', 'Cleared'],
    'msg.backupDownloaded': ['備份已下載', 'Backup downloaded'],
    'msg.imported': ['匯入完成', 'Import complete'],
    'msg.importFailed': ['匯入失敗：{e}', 'Import failed: {e}'],
    'msg.installHint': ['請用手機瀏覽器選單的「加入主畫面」', 'Use your browser menu → “Add to Home Screen”'],
    'msg.langSet': ['介面已切換', 'Language updated'],

    'ask.sample': ['將以示範資料覆蓋現有紀錄，確定嗎？', 'This replaces your current records with sample data. Continue?'],
    'ask.import': ['匯入備份會覆蓋這台裝置目前的全部資料（含分類、預算、圖示），確定嗎？', 'Importing replaces ALL data on this device (categories, budgets, icons). Continue?'],
    'ask.erase': ['確定清除全部紀錄？此動作無法復原。', 'Erase ALL records? This cannot be undone.'],
    'ask.deleteCat': ['刪除「{name}」？其紀錄會移到其他類別。', 'Delete “{name}”? Its records move to another category.'],
    'ask.deleteEntry': ['刪除這筆紀錄？', 'Delete this entry?'],
    'ask.catName': ['類別名稱', 'Category name'],
    'ask.setBudget': ['「{name}」每月預算（輸入 0 取消預算）', 'Monthly budget for “{name}” (enter 0 to clear)'],

    'btn.yes': ['確定', 'OK'],
    'btn.cancel': ['取消', 'Cancel'],

    /* 密碼鎖 */
    'sec.title': ['安全', 'Security'],
    'sec.password': ['密碼鎖', 'Password lock'],
    'sec.enabled': ['已啟用', 'Enabled'],
    'sec.disabled': ['已停用', 'Disabled'],
    'sec.enable': ['啟用密碼鎖', 'Enable password lock'],
    'sec.disable': ['停用密碼鎖', 'Disable password lock'],
    'sec.change': ['更改密碼', 'Change password'],
    'sec.setPin': ['設定 4 位數密碼', 'Set a 4-digit PIN'],
    'sec.setPinAgain': ['再輸入一次確認', 'Enter again to confirm'],
    'sec.enterPin': ['輸入密碼', 'Enter PIN'],
    'sec.pinMismatch': ['兩次輸入不一致，請重設', 'PINs don’t match, try again'],
    'sec.pinWrong': ['密碼錯誤', 'Wrong PIN'],
    'sec.pinSet': ['密碼鎖已啟用', 'Password lock enabled'],
    'sec.pinOff': ['密碼鎖已停用', 'Password lock disabled'],
    'sec.enterCurrent': ['輸入目前密碼', 'Enter current PIN'],
    'sec.hint': ['開啟後每次打開 App 都要輸入 4 位數密碼。這是本機的簡單防護，資料仍以一般檔案存放。', 'When on, a 4-digit PIN is required each time you open the app. Casual local protection — data is still stored as a plain local file.'],
    'sec.lockTitle': ['帳本已鎖定', 'Ledger Locked'],
    'sec.lockSub': ['輸入密碼以繼續', 'Enter your PIN to continue'],
    'sec.clear': ['清除', 'Clear'],

    /* AI 分析（本機統計拆解，免費） */
    'ins.title': ['AI 分析', 'AI Insights'],
    'ins.prevMonth': ['上月', 'last month'],
    'ins.prevQuarter': ['上季', 'last quarter'],
    'ins.headUp': ['總支出比{prev}多 {amount}（{pct}），主要來自 {names}。', 'Spending is up {amount} ({pct}) vs {prev}, mainly from {names}.'],
    'ins.headDown': ['總支出比{prev}少 {amount}（{pct}），主要是 {names}。', 'Spending is down {amount} ({pct}) vs {prev}, mainly {names}.'],
    'ins.headFlat': ['總支出與{prev}大致持平。', 'Spending is about level vs {prev}.'],
    'ins.freqLess': ['少 {n} 筆', '{n} fewer entries'],
    'ins.freqMore': ['多 {n} 筆', '{n} more entries'],
    'ins.freqSame': ['同為 {n} 筆', 'same {n} entries'],
    'ins.avgUp': ['單次貴 {amount}', 'per-entry +{amount}'],
    'ins.avgDown': ['單次省 {amount}', 'per-entry −{amount}'],
    'ins.avgSame': ['單次差不多', 'per-entry about the same'],
    'ins.newItem': ['本期新出現（{n} 筆）', 'new this period ({n} entries)'],
    'ins.goneItem': ['本期沒有紀錄', 'no entries this period'],
    'ins.but': ['，但', ', but '],
    'ins.and': ['、', ', '],
    'ins.nameJoin': ['、', ', '],
    'ins.dash': [' — ', ' — '],

    /* 贊助 */
    'sup.button': ['請作者喝杯咖啡', 'Buy me a coffee'],
    'sup.enjoy': ['這個 App 對你有幫助嗎？', 'Is this app helpful to you?'],

    /* 類別圖示 */
    'ico.title': ['類別圖示', 'Category icon'],
    'ico.upload': ['上傳圖片', 'Upload image'],
    'ico.paste': ['貼上圖片', 'Paste image'],
    'ico.pasteHint': ['已進入貼上模式：複製圖片後按 Ctrl+V（手機長按輸入框選貼上），或再點此取消。', 'Paste mode: copy an image then press Ctrl+V (or long-press → Paste on phones). Tap again to cancel.'],
    'ico.emoji': ['換一個 emoji 插圖', 'Cycle emoji icon'],
    'ico.clear': ['移除自訂圖片', 'Remove custom image'],
    'ico.saved': ['圖示已更新', 'Icon updated'],
    'ico.readFail': ['圖片讀取失敗，請換一張', 'Could not read that image'],
    'ico.big': ['圖片太大，請換小一點的', 'Image too large']
  };

  let lang = 'zh';

  function setLang(l) {
    lang = l === 'en' ? 'en' : 'zh';
  }

  function getLang() {
    return lang;
  }

  function t(key, params) {
    const row = dict[key];
    let s = row ? row[lang === 'en' ? 1 : 0] : key;
    if (params) {
      Object.keys(params).forEach(function (k) {
        s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), params[k]);
      });
    }
    return s;
  }

  /* 日期格式 */
  const EN_MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const EN_MONTH_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const EN_DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function fmtDateShort(ymd) {
    const d = U.parseYMD(ymd);
    return lang === 'en'
      ? EN_MONTH[d.getMonth()] + ' ' + d.getDate()
      : (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日';
  }

  function fmtDateWeek(ymd) {
    const d = U.parseYMD(ymd);
    return lang === 'en'
      ? EN_DAY[d.getDay()] + ', ' + EN_MONTH[d.getMonth()] + ' ' + d.getDate()
      : (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日 · 週' + U.WEEKDAYS[d.getDay()];
  }

  function fmtDateFull(ymd) {
    const d = U.parseYMD(ymd);
    return lang === 'en'
      ? EN_MONTH_FULL[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear()
      : d.getFullYear() + ' 年 ' + (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日';
  }

  function fmtMonth(monthKey) {
    const d = U.parseMonthKey(monthKey);
    return lang === 'en'
      ? EN_MONTH_FULL[d.getMonth()] + ' ' + d.getFullYear()
      : d.getFullYear() + ' 年 ' + (d.getMonth() + 1) + ' 月';
  }

  function fmtMonthShort(monthKey) {
    const d = U.parseMonthKey(monthKey);
    return lang === 'en'
      ? EN_MONTH[d.getMonth()] + ' ' + d.getFullYear()
      : (d.getMonth() + 1) + ' 月';
  }

  function fmtYear(year) {
    return lang === 'en' ? String(year) : String(year) + ' 年';
  }

  function fmtQuarter(qkey) {
    const p = String(qkey).split('-Q');
    return lang === 'en' ? p[0] + ' Q' + p[1] : p[0] + ' 年 Q' + p[1];
  }

  function fmtQuarterShort(qkey) {
    const p = String(qkey).split('-Q');
    return p[0].slice(2) + 'Q' + p[1];
  }

  function relativeDay(ymd) {
    const t0 = U.parseYMD(U.todayYMD()).getTime();
    const d0 = U.parseYMD(ymd).getTime();
    const diff = Math.round((t0 - d0) / 86400000);
    if (diff === 0) return lang === 'en' ? 'Today' : '今天';
    if (diff === 1) return lang === 'en' ? 'Yesterday' : '昨天';
    if (diff === 2) return lang === 'en' ? '2 days ago' : '前天';
    if (diff > 0 && diff < 7) return lang === 'en' ? diff + ' days ago' : diff + ' 天前';
    return fmtDateShort(ymd);
  }

  function catName(c) {
    if (!c) return '';
    return (lang === 'en' && c.nameEn) ? c.nameEn : c.name;
  }

  global.I18N = {
    setLang, getLang, t,
    fmtDateShort, fmtDateWeek, fmtDateFull, fmtMonth, fmtMonthShort, fmtYear,
    fmtQuarter, fmtQuarterShort,
    relativeDay,
    catName
  };
  global.t = t;
})(window);
