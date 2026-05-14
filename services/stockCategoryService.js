(function(window) {
  'use strict';

  const DEFAULT_CATEGORY_MASTER = Object.freeze({
    sectors: ['電子', '金融', '傳產', '生技', '航運', '觀光', '營建', '綠能', '其他'],
    industries: ['PCB', '半導體', 'IC設計', '封測', '被動元件', '散熱', '光通訊', '電源供應器', '伺服器', '記憶體', '重電', '電線電纜', '工具機', '機器人', '汽車零組件', '電動車', '軍工', '航太', '營建', '水泥', '鋼鐵', '塑化', '紡織', '食品', '航運', '航空', '觀光餐飲', '金融', '生技醫療', '醫材', '遊戲', '資安', '軟體服務', 'ETF', '其他'],
    themes: ['AI伺服器', 'ASIC', 'CPO', 'CoWoS', '先進封裝', 'ABF載板', 'HDI', 'PCB', 'CCL', '高頻高速材料', '散熱', '水冷', '電源供應器', '光通訊', '矽光子', '網通', '記憶體', 'HBM', '半導體設備', '探針卡', '機器人', '低軌衛星', '電動車', '充電樁', '車用電子', '軍工', '無人機', '航太', '重電', '儲能', '綠電', '碳權', '蘋果供應鏈', '輝達供應鏈', '台積電供應鏈', '鴻海集團', '廣達集團', '華碩集團', '宏碁集團', '高殖利率', '資產股', '內需消費', '政策概念', '處置股', '當沖熱門股', 'ETF', '其他']
  });

  const STOCK_CATEGORY_PRESETS = Object.freeze({
    '2330': { sector: '電子', industry: '半導體', mainTheme: '台積電供應鏈', themes: ['半導體', 'CoWoS', 'AI伺服器', '台積電供應鏈'] },
    '2317': { sector: '電子', industry: '伺服器', mainTheme: 'AI伺服器', themes: ['AI伺服器', '電動車', '鴻海集團', '輝達供應鏈'] },
    '2454': { sector: '電子', industry: 'IC設計', mainTheme: 'IC設計', themes: ['半導體', '手機晶片', 'AI邊緣運算'] },
    '2308': { sector: '電子', industry: '電源供應器', mainTheme: '重電', themes: ['重電', '電源供應器', '電動車', '儲能'] },
    '2382': { sector: '電子', industry: '伺服器', mainTheme: 'AI伺服器', themes: ['AI伺服器', '輝達供應鏈', '廣達集團'] },
    '3231': { sector: '電子', industry: '伺服器', mainTheme: 'AI伺服器', themes: ['AI伺服器', '輝達供應鏈'] },
    '6669': { sector: '電子', industry: '伺服器', mainTheme: 'AI伺服器', themes: ['AI伺服器', '輝達供應鏈'] },
    '3017': { sector: '電子', industry: '散熱', mainTheme: '散熱', themes: ['散熱', 'AI伺服器', '輝達供應鏈'] },
    '3324': { sector: '電子', industry: '散熱', mainTheme: '散熱', themes: ['散熱', '水冷', 'AI伺服器'] },
    '2421': { sector: '電子', industry: '散熱', mainTheme: '散熱', themes: ['散熱', 'AI伺服器'] },
    '2313': { sector: '電子', industry: 'PCB', mainTheme: 'PCB', themes: ['PCB', 'HDI', '低軌衛星', '蘋果供應鏈'] },
    '4958': { sector: '電子', industry: 'PCB', mainTheme: 'PCB', themes: ['PCB', 'HDI', 'AI伺服器', '蘋果供應鏈'] },
    '3044': { sector: '電子', industry: 'PCB', mainTheme: 'PCB', themes: ['PCB', 'HDI'] },
    '3037': { sector: '電子', industry: 'PCB', mainTheme: 'PCB', themes: ['PCB', '高頻高速材料', 'AI伺服器'] },
    '3189': { sector: '電子', industry: 'PCB', mainTheme: 'PCB', themes: ['PCB', 'ABF載板', 'AI伺服器'] },
    '6269': { sector: '電子', industry: 'PCB', mainTheme: 'PCB', themes: ['PCB', 'ABF載板', 'AI伺服器'] },
    '2368': { sector: '電子', industry: '被動元件', mainTheme: '被動元件', themes: ['被動元件', '車用電子'] },
    '2327': { sector: '電子', industry: '被動元件', mainTheme: '被動元件', themes: ['被動元件', '車用電子', 'AI伺服器'] },
    '2492': { sector: '電子', industry: '光通訊', mainTheme: '光通訊', themes: ['光通訊', 'CPO', '矽光子', 'AI伺服器'] },
    '3081': { sector: '電子', industry: '光通訊', mainTheme: '光通訊', themes: ['光通訊', 'CPO', '矽光子'] },
    '2603': { sector: '航運', industry: '航運', mainTheme: '航運', themes: ['貨櫃航運'] },
    '2609': { sector: '航運', industry: '航運', mainTheme: '航運', themes: ['貨櫃航運'] },
    '2615': { sector: '航運', industry: '航運', mainTheme: '航運', themes: ['貨櫃航運'] },
    '2881': { sector: '金融', industry: '金融', mainTheme: '金融', themes: ['金融', '高殖利率'] },
    '2882': { sector: '金融', industry: '金融', mainTheme: '金融', themes: ['金融', '高殖利率'] },
    '0050': { sector: '其他', industry: 'ETF', mainTheme: 'ETF', themes: ['ETF', '台股大盤'] },
    '0056': { sector: '其他', industry: 'ETF', mainTheme: '高殖利率', themes: ['ETF', '高殖利率'] },
    '00878': { sector: '其他', industry: 'ETF', mainTheme: '高殖利率', themes: ['ETF', '高殖利率'] }
  });


  const HOT_STOCK_CATEGORY_DATABASE_2026 = Object.freeze({
    meta: {
      name: '台股熱門族群表 2026',
      version: 1,
      updatedAt: '2026-05-06',
      description: '以 AI 資料中心、半導體、PCB/CCL、散熱/水冷、光通訊/CPO、重電、機器人、軍工、被動元件、航運金融等常見台股題材整理。題材分類會隨市場輪動改變，匯入後仍建議依你的交易邏輯手動修正主族群。'
    },
    categoryMaster: {
      sectors: ['電子', '金融', '傳產', '生技', '航運', '觀光', '營建', '綠能', '其他'],
      industries: ['半導體', 'IC設計', '封測', '半導體設備', '探針卡', 'PCB', 'CCL', '伺服器', '散熱', '光通訊', '網通', '電源供應器', '被動元件', '記憶體', '重電', '電線電纜', '機器人', '汽車零組件', '航太', '軍工', '金融', '航運', 'ETF', '其他'],
      themes: ['AI伺服器', 'ASIC', 'CPO', 'CoWoS', '先進封裝', 'ABF載板', 'HDI', 'PCB', 'CCL', '高頻高速材料', '散熱', '水冷', '電源供應器', '光通訊', '矽光子', '網通', '記憶體', 'HBM', '半導體設備', '探針卡', '機器人', '低軌衛星', '電動車', '車用電子', '軍工', '無人機', '航太', '重電', '儲能', '綠電', '蘋果供應鏈', '輝達供應鏈', '台積電供應鏈', '鴻海集團', '廣達集團', '高殖利率', 'ETF']
    },
    stocks: {
      '2330': { sector: '電子', industry: '半導體', mainTheme: '台積電供應鏈', themes: ['半導體', 'CoWoS', '先進封裝', 'AI伺服器', '台積電供應鏈'] },
      '2303': { sector: '電子', industry: '半導體', mainTheme: '半導體', themes: ['半導體', '晶圓代工', '成熟製程'] },
      '2454': { sector: '電子', industry: 'IC設計', mainTheme: 'ASIC', themes: ['IC設計', 'ASIC', 'AI伺服器', 'AI邊緣運算'] },
      '3034': { sector: '電子', industry: 'IC設計', mainTheme: 'IC設計', themes: ['IC設計', '高速傳輸', 'AI伺服器'] },
      '5274': { sector: '電子', industry: 'IC設計', mainTheme: 'ASIC', themes: ['IC設計', 'ASIC', 'AI伺服器', '輝達供應鏈'] },
      '3443': { sector: '電子', industry: 'IC設計', mainTheme: 'ASIC', themes: ['IC設計', 'ASIC', 'AI伺服器'] },
      '3661': { sector: '電子', industry: '記憶體', mainTheme: '記憶體', themes: ['記憶體', 'HBM', 'AI伺服器'] },
      '2344': { sector: '電子', industry: '記憶體', mainTheme: '記憶體', themes: ['記憶體', 'DRAM', '低基期'] },
      '2408': { sector: '電子', industry: '記憶體', mainTheme: '記憶體', themes: ['記憶體', 'DRAM', '低基期'] },
      '8299': { sector: '電子', industry: '記憶體', mainTheme: '記憶體', themes: ['記憶體', '儲存', 'AI伺服器'] },
      '3711': { sector: '電子', industry: '封測', mainTheme: '先進封裝', themes: ['封測', '先進封裝', 'CoWoS', '台積電供應鏈'] },
      '2449': { sector: '電子', industry: '封測', mainTheme: '封測', themes: ['封測', 'AI伺服器', '台積電供應鏈'] },
      '3264': { sector: '電子', industry: '探針卡', mainTheme: '探針卡', themes: ['探針卡', '半導體設備', 'AI伺服器'] },
      '6223': { sector: '電子', industry: '探針卡', mainTheme: '探針卡', themes: ['探針卡', '半導體設備', '台積電供應鏈'] },
      '6515': { sector: '電子', industry: '探針卡', mainTheme: '探針卡', themes: ['探針卡', '半導體設備', '先進封裝'] },
      '3131': { sector: '電子', industry: '半導體設備', mainTheme: '半導體設備', themes: ['半導體設備', 'CoWoS', '台積電供應鏈'] },
      '3583': { sector: '電子', industry: '半導體設備', mainTheme: '半導體設備', themes: ['半導體設備', '先進封裝'] },
      '2467': { sector: '電子', industry: '半導體設備', mainTheme: '半導體設備', themes: ['半導體設備', '台積電供應鏈'] },
      '2317': { sector: '電子', industry: '伺服器', mainTheme: 'AI伺服器', themes: ['AI伺服器', '電動車', '鴻海集團', '輝達供應鏈'] },
      '2382': { sector: '電子', industry: '伺服器', mainTheme: 'AI伺服器', themes: ['AI伺服器', '輝達供應鏈', '廣達集團'] },
      '3231': { sector: '電子', industry: '伺服器', mainTheme: 'AI伺服器', themes: ['AI伺服器', '輝達供應鏈'] },
      '6669': { sector: '電子', industry: '伺服器', mainTheme: 'AI伺服器', themes: ['AI伺服器', '輝達供應鏈'] },
      '2356': { sector: '電子', industry: '伺服器', mainTheme: 'AI伺服器', themes: ['AI伺服器', '電腦品牌', '低基期'] },
      '2376': { sector: '電子', industry: '伺服器', mainTheme: 'AI伺服器', themes: ['AI伺服器', '主機板', '輝達供應鏈'] },
      '2377': { sector: '電子', industry: '伺服器', mainTheme: 'AI伺服器', themes: ['AI伺服器', '主機板', '電競'] },
      '3017': { sector: '電子', industry: '散熱', mainTheme: '散熱', themes: ['散熱', '水冷', 'AI伺服器', '輝達供應鏈'] },
      '3324': { sector: '電子', industry: '散熱', mainTheme: '散熱', themes: ['散熱', '水冷', 'AI伺服器'] },
      '2421': { sector: '電子', industry: '散熱', mainTheme: '散熱', themes: ['散熱', 'AI伺服器'] },
      '3653': { sector: '電子', industry: '散熱', mainTheme: '散熱', themes: ['散熱', 'AI伺服器'] },
      '2308': { sector: '電子', industry: '電源供應器', mainTheme: '電源供應器', themes: ['電源供應器', 'AI資料中心', '電動車', '儲能', '重電'] },
      '2313': { sector: '電子', industry: 'PCB', mainTheme: 'PCB', themes: ['PCB', 'HDI', '低軌衛星', '蘋果供應鏈'] },
      '4958': { sector: '電子', industry: 'PCB', mainTheme: 'PCB', themes: ['PCB', 'HDI', 'AI伺服器', '蘋果供應鏈'] },
      '3044': { sector: '電子', industry: 'PCB', mainTheme: 'PCB', themes: ['PCB', 'HDI'] },
      '3037': { sector: '電子', industry: 'PCB', mainTheme: 'PCB', themes: ['PCB', 'CCL', '高頻高速材料', 'AI伺服器'] },
      '6274': { sector: '電子', industry: 'CCL', mainTheme: 'CCL', themes: ['CCL', '高頻高速材料', 'AI伺服器'] },
      '6213': { sector: '電子', industry: 'CCL', mainTheme: 'CCL', themes: ['CCL', '高頻高速材料', 'AI伺服器'] },
      '2383': { sector: '電子', industry: 'PCB', mainTheme: 'PCB', themes: ['PCB', '高頻高速材料', 'AI伺服器'] },
      '3189': { sector: '電子', industry: 'PCB', mainTheme: 'ABF載板', themes: ['PCB', 'ABF載板', 'AI伺服器'] },
      '6269': { sector: '電子', industry: 'PCB', mainTheme: 'ABF載板', themes: ['PCB', 'ABF載板', 'AI伺服器'] },
      '2368': { sector: '電子', industry: '被動元件', mainTheme: '被動元件', themes: ['被動元件', '車用電子'] },
      '2327': { sector: '電子', industry: '被動元件', mainTheme: '被動元件', themes: ['被動元件', '車用電子', 'AI伺服器'] },
      '2492': { sector: '電子', industry: '光通訊', mainTheme: '光通訊', themes: ['光通訊', 'CPO', '矽光子', 'AI伺服器'] },
      '3081': { sector: '電子', industry: '光通訊', mainTheme: '光通訊', themes: ['光通訊', 'CPO', '矽光子'] },
      '3363': { sector: '電子', industry: '光通訊', mainTheme: '光通訊', themes: ['光通訊', 'CPO', '矽光子'] },
      '4979': { sector: '電子', industry: '光通訊', mainTheme: '光通訊', themes: ['光通訊', 'CPO', '矽光子'] },
      '2345': { sector: '電子', industry: '網通', mainTheme: '網通', themes: ['網通', 'AI伺服器', '資料中心'] },
      '6285': { sector: '電子', industry: '網通', mainTheme: '網通', themes: ['網通', 'AI伺服器'] },
      '2049': { sector: '傳產', industry: '機器人', mainTheme: '機器人', themes: ['機器人', '自動化', '精密傳動'] },
      '2359': { sector: '電子', industry: '機器人', mainTheme: '機器人', themes: ['機器人', '自動化', '視覺辨識'] },
      '4576': { sector: '傳產', industry: '機器人', mainTheme: '機器人', themes: ['機器人', '自動化'] },
      '1504': { sector: '傳產', industry: '重電', mainTheme: '重電', themes: ['重電', '電網', '儲能'] },
      '1513': { sector: '傳產', industry: '重電', mainTheme: '重電', themes: ['重電', '電線電纜', '儲能'] },
      '1514': { sector: '傳產', industry: '重電', mainTheme: '重電', themes: ['重電', '電線電纜'] },
      '1605': { sector: '傳產', industry: '電線電纜', mainTheme: '重電', themes: ['重電', '電線電纜', '電網'] },
      '2634': { sector: '傳產', industry: '航太', mainTheme: '軍工', themes: ['軍工', '航太', '無人機'] },
      '8033': { sector: '電子', industry: '軍工', mainTheme: '軍工', themes: ['軍工', '航太', '無人機'] },
      '2630': { sector: '航運', industry: '航空', mainTheme: '航空', themes: ['航空', '旅遊復甦'] },
      '2603': { sector: '航運', industry: '航運', mainTheme: '航運', themes: ['航運', '貨櫃航運'] },
      '2609': { sector: '航運', industry: '航運', mainTheme: '航運', themes: ['航運', '貨櫃航運'] },
      '2615': { sector: '航運', industry: '航運', mainTheme: '航運', themes: ['航運', '貨櫃航運'] },
      '2881': { sector: '金融', industry: '金融', mainTheme: '金融', themes: ['金融', '高殖利率'] },
      '2882': { sector: '金融', industry: '金融', mainTheme: '金融', themes: ['金融', '高殖利率'] },
      '2884': { sector: '金融', industry: '金融', mainTheme: '金融', themes: ['金融', '高殖利率'] },
      '2891': { sector: '金融', industry: '金融', mainTheme: '金融', themes: ['金融', '高殖利率'] },
      '0050': { sector: '其他', industry: 'ETF', mainTheme: 'ETF', themes: ['ETF', '台股大盤'] },
      '0056': { sector: '其他', industry: 'ETF', mainTheme: '高殖利率', themes: ['ETF', '高殖利率'] },
      '00878': { sector: '其他', industry: 'ETF', mainTheme: '高殖利率', themes: ['ETF', '高殖利率'] },
      '00919': { sector: '其他', industry: 'ETF', mainTheme: '高殖利率', themes: ['ETF', '高殖利率'] }
    }
  });

  function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
  function cleanText(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
  function uniqueList(list) {
    const seen = new Set();
    return (Array.isArray(list) ? list : []).map(cleanText).filter(Boolean).filter(item => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  function normalizeMaster(value) {
    const src = value && typeof value === 'object' ? value : {};
    return {
      sectors: uniqueList(Array.isArray(src.sectors) ? src.sectors : DEFAULT_CATEGORY_MASTER.sectors),
      industries: uniqueList(Array.isArray(src.industries) ? src.industries : DEFAULT_CATEGORY_MASTER.industries),
      themes: uniqueList(Array.isArray(src.themes) ? src.themes : DEFAULT_CATEGORY_MASTER.themes)
    };
  }
  function normalizeCategory(value, fallbackSource) {
    const v = value && typeof value === 'object' ? value : {};
    const sector = cleanText(v.sector) || '其他';
    const industry = cleanText(v.industry) || '其他';
    const themes = uniqueList(v.themes);
    const mainTheme = cleanText(v.mainTheme) || themes[0] || industry || '未分類';
    return {
      sector,
      industry,
      mainTheme,
      themes: uniqueList([mainTheme, ...themes]).slice(0, 8),
      customTags: uniqueList(v.customTags),
      source: cleanText(v.source) || fallbackSource || 'auto',
      updatedAt: cleanText(v.updatedAt) || new Date().toISOString().slice(0, 10)
    };
  }
  function getCategory(stockCategories, code) {
    const c = cleanText(code);
    if (!c) return normalizeCategory({ sector: '其他', industry: '其他', mainTheme: '未分類', themes: [] }, 'unclassified');
    const manual = stockCategories && stockCategories[c];
    if (manual) return normalizeCategory(manual, manual.source || 'manual');
    const preset = STOCK_CATEGORY_PRESETS[c];
    if (preset) return normalizeCategory(preset, 'auto');
    return normalizeCategory({ sector: '其他', industry: '其他', mainTheme: '未分類', themes: [] }, 'unclassified');
  }
  function saveManualCategory(stockCategories, code, category) {
    const c = cleanText(code);
    if (!c) return stockCategories || {};
    return Object.assign({}, stockCategories || {}, {
      [c]: normalizeCategory(Object.assign({}, category || {}, { source: 'manual', updatedAt: new Date().toISOString().slice(0, 10) }), 'manual')
    });
  }
  function normalizeStockCategoryMap(map, source) {
    const out = {};
    const src = map && typeof map === 'object' ? map : {};
    Object.keys(src).forEach(code => {
      const c = cleanText(code);
      if (!c) return;
      out[c] = normalizeCategory(Object.assign({}, src[code] || {}, { source: source || src[code]?.source || 'imported' }), source || 'imported');
    });
    return out;
  }
  function normalizeDatabasePayload(payload) {
    const raw = payload && typeof payload === 'object' ? payload : {};
    const stocks = raw.stocks || raw.stockCategories || raw.categoriesByCode || raw.data || {};
    return {
      meta: Object.assign({ name: '族群資料庫', version: 1, importedAt: new Date().toISOString() }, raw.meta || {}),
      categoryMaster: normalizeMaster(raw.categoryMaster || raw.master || {}),
      stocks: normalizeStockCategoryMap(stocks, 'imported')
    };
  }
  function buildDatabasePayload(stockCategories, categoryMaster, meta) {
    return {
      meta: Object.assign({
        name: '我的台股族群資料庫',
        version: 1,
        exportedAt: new Date().toISOString(),
        format: 'tw-stock-tracker-category-db-v1'
      }, meta || {}),
      categoryMaster: normalizeMaster(categoryMaster),
      stocks: normalizeStockCategoryMap(stockCategories, 'imported')
    };
  }
  function mergeDatabase(stockCategories, categoryMaster, payload, options) {
    const db = normalizeDatabasePayload(payload);
    const mode = options && options.mode === 'overwrite' ? 'overwrite' : 'merge';
    const source = options && options.source ? options.source : 'imported';
    const current = stockCategories && typeof stockCategories === 'object' ? clone(stockCategories) : {};
    const out = mode === 'overwrite' ? {} : current;
    Object.keys(db.stocks).forEach(code => {
      if (mode === 'merge' && out[code] && String(out[code].source || '') === 'manual') return;
      out[code] = normalizeCategory(Object.assign({}, db.stocks[code], { source, updatedAt: new Date().toISOString().slice(0, 10) }), source);
    });
    const currentMaster = normalizeMaster(categoryMaster || {});
    const nextMaster = normalizeMaster({
      sectors: [...(currentMaster.sectors || []), ...(db.categoryMaster.sectors || [])],
      industries: [...(currentMaster.industries || []), ...(db.categoryMaster.industries || [])],
      themes: [...(currentMaster.themes || []), ...(db.categoryMaster.themes || [])]
    });
    return { stockCategories: out, categoryMaster: nextMaster, importedCount: Object.keys(db.stocks).length, meta: db.meta };
  }

  function sourceLabel(source) {
    if (source === 'manual') return '手動';
    if (source === 'auto') return '自動';
    if (source === 'imported') return '匯入';
    return '未分類';
  }

  window.StockCategoryService = {
    DEFAULT_CATEGORY_MASTER: clone(DEFAULT_CATEGORY_MASTER),
    STOCK_CATEGORY_PRESETS: clone(STOCK_CATEGORY_PRESETS),
    HOT_STOCK_CATEGORY_DATABASE_2026: clone(HOT_STOCK_CATEGORY_DATABASE_2026),
    normalizeMaster,
    normalizeCategory,
    getCategory,
    saveManualCategory,
    normalizeDatabasePayload,
    buildDatabasePayload,
    mergeDatabase,
    sourceLabel,
    uniqueList,
    cleanText
  };
})(window);
