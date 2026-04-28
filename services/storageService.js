(function(window) {
  'use strict';

  const SCHEMA_VERSION = 4;

  const DEFAULT_CATEGORIES = [
    { id: 'core', name: '核心持股', label: '核心', shortLabel: '核心' },
    { id: 'rotation', name: '輪動 / 波段', label: '波段', shortLabel: '波段' },
    { id: 'other', name: '其他', label: '其他', shortLabel: '其他' },
  ];

  const DEFAULT_SETTINGS = Object.freeze({
    feeRate: 0.1425,
    discount: 1,
    taxRate: 0.3,
    dayTradeTaxRate: 0.15,
    minFee: 20,
  });

  const KEYS = Object.freeze({
    schemaVersion: 'tw_stock_schema_version_v1',
    transactions: 'tw_stock_tx_v6',
    cashBook: 'tw_stock_cashbook_v1',
    profitAdjustments: 'tw_stock_profit_adjustments_v1',
    settings: 'tw_stock_settings_v6',
    customStocks: 'tw_stock_custom_v6',
    prices: 'tw_stock_prices_v6',
    priceStatus: 'tw_stock_status_v6',
    priceUpdateTime: 'tw_stock_time_v6',
    priceUpdateTimestamp: 'tw_stock_time_ts_v6',
    priceUpdateError: 'tw_stock_price_update_error_v1',
    priceUpdateAttemptTimestamp: 'tw_stock_price_update_attempt_ts_v1',
    priceUpdatePartial: 'tw_stock_price_update_partial_v1',
    priceUpdateMissingCount: 'tw_stock_price_update_missing_count_v1',
    portfolios: 'tw_stock_portfolios_v1',
    currentPortfolioId: 'tw_stock_current_portfolio_v1',
    stockNames: 'tw_stock_names_v1',
    categories: 'tw_stock_categories_v1',
    auth: 'tw_stock_auth_v1',
    savedUsername: 'tw_stock_saved_username',
    helpAutoOpen: 'tw_stock_help_autopen_v1',
    helpSeen: 'tw_stock_help_seen_v1',
    gdriveClientId: 'tw_stock_gdrive_client_id_v1',
    cloudMeta: 'tw_stock_cloud_meta_v1',
    globalIndexTimeTimestamp: 'tw_stock_global_time_ts_v1',
    globalIndexUpdateError: 'tw_stock_global_update_error_v1',
    globalIndexUpdatePartial: 'tw_stock_global_update_partial_v1',
    globalIndexUpdateMissingCount: 'tw_stock_global_update_missing_count_v1',
    globalIndexUpdateAttemptTimestamp: 'tw_stock_global_update_attempt_ts_v1',
    institutionalOiData: 'tw_stock_institutional_oi_data_v1',
    institutionalOiLastUpdate: 'tw_stock_institutional_oi_time_v1',
    institutionalOiAttemptTs: 'tw_stock_institutional_oi_attempt_ts_v1',
    institutionalOiError: 'tw_stock_institutional_oi_error_v1',
    chipCache: 'tw_stock_chip_cache_v2',
    chipLastQuery: 'tw_stock_chip_last_query_v1',
    chipLastUpdate: 'tw_stock_chip_last_update_v1',
    chipError: 'tw_stock_chip_error_v1',
    stockRiskCache: 'tw_stock_risk_cache_v1',
    stockRiskLastQuery: 'tw_stock_risk_last_query_v1',
    stockRiskLastUpdate: 'tw_stock_risk_last_update_v1',
    stockRiskError: 'tw_stock_risk_error_v1',
  });

  const BACKUP_FIELDS = Object.freeze({
    transactions: 'tx',
    cashBook: 'cashBook',
    profitAdjustments: 'profitAdjustments',
    settings: 'settings',
    customStocks: 'custom',
    prices: 'prices',
    priceStatus: 'status',
    priceUpdateTime: 'time',
    portfolios: 'portfolios',
    currentPortfolioId: 'currentPortfolioId',
    stockNames: 'names',
    categories: 'categories',
  });

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function safeParseJSON(raw, fallback) {
    if (raw == null || raw === '') return clone(fallback);
    try {
      const value = JSON.parse(raw);
      return value == null ? clone(fallback) : value;
    } catch (_) {
      return clone(fallback);
    }
  }

  function getJSON(keyName, fallback) {
    return safeParseJSON(localStorage.getItem(KEYS[keyName]), fallback);
  }

  function setJSON(keyName, value) {
    localStorage.setItem(KEYS[keyName], JSON.stringify(value));
  }

  function getString(keyName, fallback = '') {
    const value = localStorage.getItem(KEYS[keyName]);
    return value == null ? fallback : value;
  }

  function setString(keyName, value) {
    localStorage.setItem(KEYS[keyName], String(value ?? ''));
  }

  function getNumber(keyName, fallback = 0) {
    const raw = localStorage.getItem(KEYS[keyName]);
    if (raw == null || raw === '') return fallback;
    const value = Number(raw);
    return Number.isFinite(value) ? value : fallback;
  }

  function getFlag(keyName) {
    return localStorage.getItem(KEYS[keyName]) === '1';
  }

  function setFlag(keyName, value) {
    localStorage.setItem(KEYS[keyName], value ? '1' : '0');
  }

  function remove(keyName) {
    localStorage.removeItem(KEYS[keyName]);
  }

  function normalizeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function normalizeObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  }

  function normalizeCategories(value) {
    const raw = Array.isArray(value) && value.length ? value : DEFAULT_CATEGORIES;
    return raw.map((c) => ({
      id: String(c?.id || c?.name || '').trim() || `cat_${Date.now()}`,
      name: String(c?.name || c?.label || c?.id || '').trim() || '未命名分類',
      label: String(c?.label || c?.name || c?.id || '').trim() || '未命名分類',
      shortLabel: String(c?.shortLabel || c?.label || c?.name || c?.id || '').trim() || '其他',
    }));
  }

  function normalizePortfolios(value) {
    let portfolios = normalizeArray(value).filter(p => p && typeof p === 'object' && p.id && p.name);
    if (!portfolios.some(p => p.id === 'main')) {
      portfolios = [{ id: 'main', name: '我的帳戶' }, ...portfolios.filter(p => p.id !== 'main')];
    }
    return portfolios;
  }

  function normalizeBackupPayload(payload, currentState = {}) {
    if (!payload || typeof payload !== 'object') throw new Error('備份檔內容格式不正確。');
    const fields = BACKUP_FIELDS;
    const portfolios = normalizePortfolios(payload[fields.portfolios]);
    let currentPortfolioId = typeof payload[fields.currentPortfolioId] === 'string' && payload[fields.currentPortfolioId]
      ? payload[fields.currentPortfolioId]
      : (currentState.currentPortfolioId || 'main');
    if (!portfolios.some(p => p.id === currentPortfolioId)) currentPortfolioId = 'main';
    return {
      transactions: normalizeArray(payload[fields.transactions]),
      cashBook: normalizeArray(payload[fields.cashBook]),
      profitAdjustments: normalizeArray(payload[fields.profitAdjustments]),
      settings: Object.assign({}, DEFAULT_SETTINGS, normalizeObject(payload[fields.settings] || currentState.settings)),
      customStocks: normalizeArray(payload[fields.customStocks]),
      prices: normalizeObject(payload[fields.prices]),
      priceStatus: normalizeObject(payload[fields.priceStatus]),
      priceUpdateTime: typeof payload[fields.priceUpdateTime] === 'string' ? payload[fields.priceUpdateTime] : '',
      portfolios,
      currentPortfolioId,
      stockNames: normalizeObject(payload[fields.stockNames]),
      categories: normalizeCategories(payload[fields.categories]),
      version: Number(payload.version || payload.schemaVersion || 0) || 0,
    };
  }

  function buildBackupPayload(state) {
    const fields = BACKUP_FIELDS;
    return {
      schemaVersion: SCHEMA_VERSION,
      version: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      [fields.transactions]: normalizeArray(state.transactions),
      [fields.cashBook]: normalizeArray(state.cashBook),
      [fields.profitAdjustments]: normalizeArray(state.profitAdjustments),
      [fields.settings]: Object.assign({}, DEFAULT_SETTINGS, normalizeObject(state.settings)),
      [fields.customStocks]: normalizeArray(state.customStocks),
      [fields.prices]: normalizeObject(state.latestPrices || state.prices),
      [fields.priceStatus]: normalizeObject(state.latestStatus || state.priceStatus),
      [fields.priceUpdateTime]: String(state.lastUpdateTime || state.priceUpdateTime || ''),
      [fields.portfolios]: normalizePortfolios(state.portfolios),
      [fields.currentPortfolioId]: state.currentPortfolioId || 'main',
      [fields.stockNames]: normalizeObject(state.nameMap || state.stockNames),
      [fields.categories]: normalizeCategories(state.categories),
    };
  }

  function saveCoreData(state) {
    setJSON('transactions', normalizeArray(state.transactions));
    setJSON('cashBook', normalizeArray(state.cashBook));
    setJSON('profitAdjustments', normalizeArray(state.profitAdjustments));
    setJSON('portfolios', normalizePortfolios(state.portfolios));
    setString('currentPortfolioId', state.currentPortfolioId || 'main');
    setJSON('stockNames', normalizeObject(state.nameMap || state.stockNames));
    setJSON('categories', normalizeCategories(state.categories));
    setString('schemaVersion', SCHEMA_VERSION);
  }

  function saveSettings(settings) {
    setJSON('settings', Object.assign({}, DEFAULT_SETTINGS, normalizeObject(settings)));
    setString('schemaVersion', SCHEMA_VERSION);
  }

  function saveMarketData(state) {
    setJSON('customStocks', normalizeArray(state.customStocks));
    setJSON('prices', normalizeObject(state.latestPrices || state.prices));
    setJSON('priceStatus', normalizeObject(state.latestStatus || state.priceStatus));
    setString('priceUpdateTime', state.lastUpdateTime || state.priceUpdateTime || '');
    setString('priceUpdateTimestamp', state.lastUpdateTimestamp || state.priceUpdateTimestamp || 0);
    setString('schemaVersion', SCHEMA_VERSION);
  }

  function saveInstitutionalOiData(state) {
    setJSON('institutionalOiData', normalizeObject(state.institutionalOiData));
    setString('institutionalOiLastUpdate', state.institutionalOiLastUpdate || '');
    setString('institutionalOiAttemptTs', state.institutionalOiAttemptTs || 0);
    setString('institutionalOiError', state.institutionalOiError || '');
    setString('schemaVersion', SCHEMA_VERSION);
  }

  function saveChipData(state) {
    setJSON('chipCache', normalizeObject(state.chipCache));
    setString('chipLastQuery', state.chipLastQuery || state.chipQueryCode || '');
    setString('chipLastUpdate', state.chipLastUpdate || '');
    setString('chipError', state.chipError || '');
    setString('schemaVersion', SCHEMA_VERSION);
  }

  function saveStockRiskData(state) {
    setJSON('stockRiskCache', normalizeObject(state.stockRiskCache));
    setString('stockRiskLastQuery', state.stockRiskLastQuery || state.chipQueryCode || '');
    setString('stockRiskLastUpdate', state.stockRiskLastUpdate || '');
    setString('stockRiskError', state.stockRiskError || '');
    setString('schemaVersion', SCHEMA_VERSION);
  }

  function applyBackupPayload(payload, vm) {
    const normalized = normalizeBackupPayload(payload, vm || {});
    vm.transactions = normalized.transactions;
    vm.cashBook = normalized.cashBook;
    vm.profitAdjustments = normalized.profitAdjustments;
    vm.settings = normalized.settings;
    vm.customStocks = normalized.customStocks;
    vm.latestPrices = normalized.prices;
    vm.latestStatus = normalized.priceStatus;
    vm.lastUpdateTime = normalized.priceUpdateTime;
    vm.portfolios = normalized.portfolios;
    vm.currentPortfolioId = normalized.currentPortfolioId;
    vm.nameMap = normalized.stockNames;
    vm.categories = normalized.categories;

    saveCoreData(vm);
    saveSettings(vm.settings);
    saveMarketData(vm);
  }

  function loadInitialState() {
    const portfolios = normalizePortfolios(getJSON('portfolios', []));
    let currentPortfolioId = getString('currentPortfolioId', 'main') || 'main';
    if (!portfolios.some(p => p.id === currentPortfolioId)) currentPortfolioId = 'main';
    return {
      gdriveCloudMeta: normalizeObject(getJSON('cloudMeta', {})),
      gdriveClientId: getString('gdriveClientId', ''),
      portfolios,
      currentPortfolioId,
      transactions: normalizeArray(getJSON('transactions', [])),
      cashBook: normalizeArray(getJSON('cashBook', [])),
      profitAdjustments: normalizeArray(getJSON('profitAdjustments', [])),
      globalIndicesLastTs: getNumber('globalIndexTimeTimestamp', null),
      globalIndicesError: getFlag('globalIndexUpdateError'),
      globalIndicesPartial: getFlag('globalIndexUpdatePartial'),
      globalIndicesMissingCount: getNumber('globalIndexUpdateMissingCount', 0),
      globalIndicesAttemptTs: getNumber('globalIndexUpdateAttemptTimestamp', null),
      lastUpdateTimestamp: getNumber('priceUpdateTimestamp', 0),
      lastPriceUpdateError: getString('priceUpdateError', ''),
      lastPriceUpdateAttemptTs: getNumber('priceUpdateAttemptTimestamp', 0),
      lastPriceUpdatePartial: getFlag('priceUpdatePartial'),
      lastPriceUpdateMissingCount: getNumber('priceUpdateMissingCount', 0),
      settings: Object.assign({}, DEFAULT_SETTINGS, normalizeObject(getJSON('settings', DEFAULT_SETTINGS))),
      customStocks: normalizeArray(getJSON('customStocks', [])),
      latestPrices: normalizeObject(getJSON('prices', {})),
      latestStatus: normalizeObject(getJSON('priceStatus', {})),
      lastUpdateTime: getString('priceUpdateTime', ''),
      securityConfig: normalizeObject(getJSON('auth', null)),
      savedUsername: getString('savedUsername', ''),
      nameMap: normalizeObject(getJSON('stockNames', {})),
      categories: normalizeCategories(getJSON('categories', DEFAULT_CATEGORIES)),
      institutionalOiData: normalizeObject(getJSON('institutionalOiData', {})),
      institutionalOiLastUpdate: getString('institutionalOiLastUpdate', ''),
      institutionalOiAttemptTs: getNumber('institutionalOiAttemptTs', 0),
      institutionalOiError: getString('institutionalOiError', ''),
      chipCache: normalizeObject(getJSON('chipCache', { version: 2, stocks: {} })),
      chipLastQuery: getString('chipLastQuery', ''),
      chipLastUpdate: getString('chipLastUpdate', ''),
      chipError: getString('chipError', ''),
      stockRiskCache: normalizeObject(getJSON('stockRiskCache', { version: 2, stocks: {} })),
      stockRiskLastQuery: getString('stockRiskLastQuery', ''),
      stockRiskLastUpdate: getString('stockRiskLastUpdate', ''),
      stockRiskError: getString('stockRiskError', ''),
    };
  }

  function migrate() {
    // Centralized migration hook. Existing v1/v6 localStorage keys are still the canonical keys;
    // future migrations should be added here instead of scattered through app/services.
    try {
      const state = loadInitialState();
      saveCoreData(state);
      saveSettings(state.settings);
      saveMarketData(state);
    } catch (e) {
      console.warn('[StockStorage] migration skipped:', e);
    }
  }

  window.StockStorage = {
    SCHEMA_VERSION,
    KEYS,
    BACKUP_FIELDS,
    DEFAULT_SETTINGS,
    DEFAULT_CATEGORIES,
    getJSON,
    setJSON,
    getString,
    setString,
    getNumber,
    getFlag,
    setFlag,
    remove,
    normalizeArray,
    normalizeObject,
    normalizeCategories,
    normalizePortfolios,
    loadInitialState,
    buildBackupPayload,
    normalizeBackupPayload,
    applyBackupPayload,
    saveCoreData,
    saveSettings,
    saveMarketData,
    saveInstitutionalOiData,
    saveChipData,
    saveStockRiskData,
    migrate,
  };

  migrate();
})(window);
