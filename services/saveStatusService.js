(function(window) {
  'use strict';

  const AUTOSAVE_DELAY_MS = 650;

  function initialState() {
    return {
      state: 'saved', // saved | dirty | saving | error
      scope: '資料',
      lastSavedAt: Date.now(),
      lastAttemptAt: Date.now(),
      errorMessage: '',
      timer: null,
      ready: false,
    };
  }

  function clearTimer(vm) {
    if (vm && vm.saveStatus && vm.saveStatus.timer) {
      clearTimeout(vm.saveStatus.timer);
      vm.saveStatus.timer = null;
    }
  }

  function ensure(vm) {
    if (!vm.saveStatus) vm.saveStatus = initialState();
    return vm.saveStatus;
  }

  function markDirty(vm, scope) {
    const s = ensure(vm);
    if (!s.ready) return;
    if (s.state !== 'saving') s.state = 'dirty';
    s.scope = scope || s.scope || '資料';
    s.errorMessage = '';
  }

  function markSaving(vm, scope) {
    const s = ensure(vm);
    clearTimer(vm);
    s.state = 'saving';
    s.scope = scope || s.scope || '資料';
    s.lastAttemptAt = Date.now();
    s.errorMessage = '';
  }

  function markSaved(vm, scope) {
    const s = ensure(vm);
    clearTimer(vm);
    s.state = 'saved';
    s.scope = scope || s.scope || '資料';
    s.lastSavedAt = Date.now();
    s.errorMessage = '';
  }

  function markError(vm, error, scope) {
    const s = ensure(vm);
    clearTimer(vm);
    s.state = 'error';
    s.scope = scope || s.scope || '資料';
    s.errorMessage = (error && error.message) ? error.message : String(error || 'localStorage 儲存失敗');
  }

  function runSave(vm, scope, saveFn) {
    try {
      markSaving(vm, scope);
      if (typeof saveFn === 'function') saveFn();
      markSaved(vm, scope);
      return true;
    } catch (error) {
      console.error('[StockSaveStatus] save failed:', error);
      markError(vm, error, scope);
      return false;
    }
  }

  function schedule(vm, scope, saveFn) {
    const s = ensure(vm);
    if (!s.ready) return;
    markDirty(vm, scope);
    clearTimer(vm);
    s.timer = setTimeout(() => {
      runSave(vm, scope, saveFn || (() => {
        window.StockStorage.saveCoreData(vm);
        window.StockStorage.saveSettings(vm.settings);
        window.StockStorage.saveMarketData(vm);
      }));
    }, AUTOSAVE_DELAY_MS);
  }

  function formatTime(ts) {
    if (!ts) return '';
    try {
      return new Date(ts).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    } catch (_) {
      return '';
    }
  }

  function label(status) {
    const s = status || {};
    if (s.state === 'saving') return `正在儲存${s.scope ? ' ' + s.scope : ''}…`;
    if (s.state === 'dirty') return `有未儲存${s.scope ? ' ' + s.scope : ''}`;
    if (s.state === 'error') return '儲存失敗';
    const t = formatTime(s.lastSavedAt);
    return t ? `已儲存 ${t}` : '已儲存';
  }

  function icon(status) {
    const state = status && status.state;
    if (state === 'saving') return 'fa-solid fa-spinner fa-spin';
    if (state === 'dirty') return 'fa-regular fa-clock';
    if (state === 'error') return 'fa-solid fa-triangle-exclamation';
    return 'fa-solid fa-circle-check';
  }

  function colorClass(status) {
    const state = status && status.state;
    if (state === 'saving') return 'bg-blue-50/95 text-blue-700 border-blue-200';
    if (state === 'dirty') return 'bg-amber-50/95 text-amber-700 border-amber-200';
    if (state === 'error') return 'bg-red-50/95 text-red-700 border-red-200';
    return 'bg-emerald-50/95 text-emerald-700 border-emerald-200';
  }

  window.StockSaveStatus = {
    AUTOSAVE_DELAY_MS,
    initialState,
    markDirty,
    markSaving,
    markSaved,
    markError,
    runSave,
    schedule,
    label,
    icon,
    colorClass,
    formatTime,
    clearTimer,
  };
})(window);
