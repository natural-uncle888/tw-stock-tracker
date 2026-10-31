(function(window) {
  'use strict';

  let __gdriveTokenClient = null;
  let __gdriveTokenClientCid = null;
  const __GDRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata openid email';
  const BACKUP_FILE_NAME = 'tw_stock_backup.json';
  // 歷史版另外建立不可變的 AppDataFolder 檔案；維持舊版最新備份檔名相容。
  const HISTORY_PREFIX = 'tw_stock_history_v1_';
  const DEVICE_ID_KEY_FALLBACK = 'tw_stock_gdrive_device_id_v1';

  function __getDefaultGDriveClientId() {
    return String(window.STOCK_TRACKER_GOOGLE_CLIENT_ID || window.STOCK_APP_DEFAULT_GOOGLE_CLIENT_ID || '').trim();
  }

  function safeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function safeObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  }

  function shortClientId(clientId) {
    const raw = String(clientId || '').trim();
    if (!raw) return '';
    return raw.length <= 18 ? raw : `${raw.slice(0, 6)}…${raw.slice(-12)}`;
  }

  function formatTime(value) {
    if (!value) return '—';
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    try {
      return d.toLocaleString('zh-TW', { hour12: false });
    } catch (_) {
      return d.toLocaleString();
    }
  }

  // 對 JSON 物件做穩定序列化，避免只因物件鍵值順序不同而誤判雲端內容不一致。
  function stableJson(value) {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(item => stableJson(item)).join(',')}]`;
    const keys = Object.keys(value).filter(key => typeof value[key] !== 'undefined').sort();
    return `{${keys.map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }

  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function makeId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return `device_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  function detectDeviceName() {
    const ua = navigator.userAgent || '';
    const platform = navigator.platform || '';
    let os = platform || 'Unknown device';
    if (/iPhone/i.test(ua)) os = 'iPhone';
    else if (/iPad/i.test(ua)) os = 'iPad';
    else if (/Android/i.test(ua)) os = 'Android';
    else if (/Windows/i.test(ua)) os = 'Windows';
    else if (/Mac OS|Macintosh/i.test(ua)) os = 'Mac';

    let browser = 'Browser';
    if (/Edg\//i.test(ua)) browser = 'Edge';
    else if (/OPR\//i.test(ua)) browser = 'Opera';
    else if (/Firefox\//i.test(ua)) browser = 'Firefox';
    else if (/Chrome\//i.test(ua)) browser = 'Chrome';
    else if (/Safari\//i.test(ua)) browser = 'Safari';
    return `${os} / ${browser}`;
  }



  function compactDriveErrorText(text) {
    const raw = String(text || '').trim();
    if (!raw) return '';
    try {
      const parsed = JSON.parse(raw);
      const msg = parsed && parsed.error && parsed.error.message ? String(parsed.error.message).trim() : '';
      if (msg) return msg;
    } catch (_) {}
    return raw.length > 500 ? `${raw.slice(0, 500)}…` : raw;
  }

  function makeDriveHttpError(prefix, res, text) {
    const detail = compactDriveErrorText(text);
    const err = new Error(`${prefix}（${res.status}）${detail ? '：' + detail : ''}`);
    err.status = res.status;
    err.responseText = text || '';
    return err;
  }

  function isDriveFileGoneError(err) {
    return Number(err && err.status) === 404;
  }

  function buildSummaryMessage(prefix, info, summary) {
    const lines = [prefix];
    if (info && info.modifiedTime) lines.push(`雲端檔案時間：${formatTime(info.modifiedTime)}`);
    if (summary && summary.exportedAt) lines.push(`備份建立時間：${formatTime(summary.exportedAt)}`);
    if (summary && summary.deviceName) lines.push(`備份來源裝置：${summary.deviceName}`);
    if (summary && summary.clientIdSourceText) lines.push(`備份使用：${summary.clientIdSourceText}`);
    if (summary) lines.push(`內容：交易 ${summary.txCount} 筆、資金 ${summary.cashBookCount} 筆、帳本 ${summary.portfolioCount} 個`);
    if (info && Number(info.duplicateCount || 0) > 1) lines.push(`提醒：雲端找到 ${info.duplicateCount} 個同名備份，已自動選擇最新的一個。`);
    return lines.join('\n');
  }

  window.StockBackupService = {
    confirmExport() {
      const dataStr = JSON.stringify(window.StockStorage.buildBackupPayload(this));
      const blob = new Blob([dataStr], {type: 'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.exportFileName || 'backup'}.json`;
      a.click();
      URL.revokeObjectURL(url);
      try { this._writeCloudMeta({ lastLocalDownloadAt: new Date().toISOString(), lastAction: 'download' }); } catch(_) {}
      this.showExportModal = false;
    },

    onRestoreBackupFileChange(e) {
      const file = e?.target?.files?.[0];
      if (!file) return;
      this.restoreFileName = file.name || '';
      this.restoreFileObject = file;
    },

    _applyBackupPayload(payload) {
      window.StockStorage.applyBackupPayload(payload, this);
      try { this.recomputeAllTradesAndValidate(); } catch (_) {}
    },

    _readCloudMeta() {
      try { return JSON.parse(localStorage.getItem(window.StockStorage.KEYS.cloudMeta) || '{}') || {}; } catch(e) { return {}; }
    },

    _writeCloudMeta(patch) {
      const cur = this._readCloudMeta();
      const next = Object.assign({}, cur, patch || {});
      localStorage.setItem(window.StockStorage.KEYS.cloudMeta, JSON.stringify(next));
      this.gdriveCloudMeta = next;
    },

    _getDeviceId() {
      const key = (window.StockStorage && window.StockStorage.KEYS && window.StockStorage.KEYS.gdriveDeviceId)
        ? window.StockStorage.KEYS.gdriveDeviceId
        : DEVICE_ID_KEY_FALLBACK;
      let id = '';
      try { id = localStorage.getItem(key) || ''; } catch (_) { id = ''; }
      if (!id) {
        id = makeId();
        try { localStorage.setItem(key, id); } catch (_) {}
      }
      return id;
    },

    _getDeviceName() {
      return detectDeviceName();
    },

    _summarizeBackupPayload(payload) {
      const fields = window.StockStorage.BACKUP_FIELDS || {};
      const meta = safeObject(payload && (payload.backupMeta || payload.cloudBackupMeta));
      const tx = safeArray(payload && payload[fields.transactions || 'tx']);
      const cashBook = safeArray(payload && payload[fields.cashBook || 'cashBook']);
      const portfolios = safeArray(payload && payload[fields.portfolios || 'portfolios']);
      const clientIdSource = String(meta.clientIdSource || payload?.backupClientIdSource || '').trim();
      const clientIdSourceText = clientIdSource === 'custom'
        ? '自訂 Client ID'
        : (clientIdSource === 'default' ? '網站預設 Client ID' : '未記錄 Client ID');
      return {
        exportedAt: meta.exportedAt || payload?.exportedAt || payload?.backupExportedAt || '',
        deviceId: meta.deviceId || payload?.backupDeviceId || '',
        deviceName: meta.deviceName || payload?.backupDeviceName || '',
        clientIdSource,
        clientIdSourceText,
        clientIdHint: meta.clientIdHint || payload?.backupClientIdHint || '',
        txCount: tx.length,
        cashBookCount: cashBook.length,
        portfolioCount: portfolios.length,
        currentPortfolioId: payload && payload[fields.currentPortfolioId || 'currentPortfolioId'] ? payload[fields.currentPortfolioId || 'currentPortfolioId'] : '',
      };
    },

    _decorateBackupPayload(payload) {
      const nowIso = new Date().toISOString();
      const clientId = this.getGDriveEffectiveClientId();
      const source = this.getGDriveClientIdSource();
      const deviceId = this._getDeviceId();
      const deviceName = this._getDeviceName();
      const summary = this._summarizeBackupPayload(payload);
      const backupMeta = {
        app: 'tw-stock-tracker',
        fileName: BACKUP_FILE_NAME,
        exportedAt: payload.exportedAt || nowIso,
        uploadedAt: nowIso,
        deviceId,
        deviceName,
        clientIdSource: source,
        clientIdHint: shortClientId(clientId),
        txCount: summary.txCount,
        cashBookCount: summary.cashBookCount,
        portfolioCount: summary.portfolioCount,
        currentPortfolioId: summary.currentPortfolioId,
      };
      return Object.assign({}, payload, {
        backupMeta,
        backupDeviceId: deviceId,
        backupDeviceName: deviceName,
        backupClientIdSource: source,
        backupClientIdHint: shortClientId(clientId),
        backupUploadedAt: nowIso,
      });
    },

    async refreshGDriveCloudMeta() {
      this.gdriveBusy = true;
      this.gdriveBusyText = '正在取得雲端狀態…';
      try {
        const accessToken = await this._ensureGDriveAccessToken();
        const info = await this._findBackupFileId(accessToken);
        if (!info) {
          this._writeCloudMeta({
            cloudFileModifiedTime: '',
            cloudFileExists: false,
            cloudFileId: '',
            cloudDuplicateCount: 0,
            cloudBackupExportedAt: '',
            cloudBackupDeviceName: '',
            cloudBackupDeviceId: '',
            cloudBackupClientIdSource: '',
            cloudBackupClientIdHint: '',
            cloudBackupTxCount: 0,
            cloudBackupCashBookCount: 0,
            cloudBackupPortfolioCount: 0,
            lastCloudErrorAt: '',
            lastCloudErrorMessage: ''
          });
          const email = this._readCloudMeta().googleAccountEmail || '無法確認（請檢查 Google 授權）';
          this.openInfoModal('雲端狀態', `目前授權 Google 帳號：${email}\n在此帳號及此網站的 AppDataFolder 中沒有找到備份。\n請先核對電腦與手機選擇的是同一個 Google 帳號，並確認兩台都是更新後的網站；不要急著上傳覆蓋。`);
          return;
        }

        let summary = null;
        try {
          const payload = await this._downloadBackupPayload(accessToken, info.id);
          summary = this._summarizeBackupPayload(payload);
        } catch (_) {
          summary = null;
        }

        this._writeCloudMeta({
          cloudFileExists: true,
          cloudFileId: info.id || '',
          cloudFileModifiedTime: info.modifiedTime || '',
          cloudDuplicateCount: info.duplicateCount || 1,
          cloudBackupExportedAt: summary ? summary.exportedAt : '',
          cloudBackupDeviceName: summary ? summary.deviceName : '',
          cloudBackupDeviceId: summary ? summary.deviceId : '',
          cloudBackupClientIdSource: summary ? summary.clientIdSource : '',
          cloudBackupClientIdHint: summary ? summary.clientIdHint : '',
          cloudBackupTxCount: summary ? summary.txCount : 0,
          cloudBackupCashBookCount: summary ? summary.cashBookCount : 0,
          cloudBackupPortfolioCount: summary ? summary.portfolioCount : 0,
          lastCloudErrorAt: '',
          lastCloudErrorMessage: ''
        });

        const email = this._readCloudMeta().googleAccountEmail || '無法確認';
        this.openInfoModal('雲端狀態', buildSummaryMessage(`Google 帳號：${email}\n已找到雲端最新備份。`, info, summary));
      } catch(e) {
        this._writeCloudMeta({ lastCloudErrorAt: new Date().toISOString(), lastCloudErrorMessage: e?.message || String(e || '雲端狀態刷新失敗') });
        this.openInfoModal('雲端狀態', `發生未預期錯誤：${e?.message || e}`);
      } finally {
        this.gdriveBusy = false;
        this.gdriveBusyText = '';
      }
    },

    getDefaultGDriveClientId() {
      return __getDefaultGDriveClientId();
    },

    getGDriveEffectiveClientId() {
      // Cross-device sync must use the same OAuth application on every device.
      // When this deployment has a built-in Client ID, always prefer it and ignore
      // any old per-device custom override. A custom Client ID is only a fallback
      // for self-hosted copies that do not define a built-in Client ID.
      const builtIn = __getDefaultGDriveClientId();
      if (builtIn) return builtIn;
      return (this.gdriveClientId || '').trim();
    },

    getGDriveClientIdSource() {
      if (__getDefaultGDriveClientId()) return 'default';
      return (this.gdriveClientId || '').trim() ? 'custom' : 'none';
    },

    saveGDriveClientId() {
      const cid = (this.gdriveClientIdInput || '').trim();
      if (!cid) {
        this.openInfoModal('提示', '目前網站已內建固定的 Google Client ID，跨裝置會自動使用同一組設定。');
        return;
      }
      localStorage.setItem(window.StockStorage.KEYS.gdriveClientId, cid);
      this.gdriveClientId = cid;
      this.gdriveClientIdInput = cid;
      __gdriveTokenClient = null;
      __gdriveTokenClientCid = null;
      if (__getDefaultGDriveClientId()) {
        this.openInfoModal('已儲存', '已保留這組自訂 Client ID 作為備用；目前此網站為了確保手機、平板與桌機共用同一份雲端備份，會固定使用網站內建 Client ID。');
      } else {
        this.openInfoModal('已儲存', '自訂 Google OAuth Client ID 已儲存。');
      }
    },

    clearGDriveClientId() {
      localStorage.removeItem(window.StockStorage.KEYS.gdriveClientId);
      this.gdriveClientId = '';
      this.gdriveClientIdInput = '';
      __gdriveTokenClient = null;
      __gdriveTokenClientCid = null;
      const hasDefault = !!__getDefaultGDriveClientId();
      this.openInfoModal('已清除', hasDefault ? '已清除自訂 Client ID，之後會改用網站內建的預設 Client ID。請確認其他裝置也使用同一個設定。' : '已清除 Google OAuth Client ID。目前尚未設定網站預設 Client ID。');
    },

    async _ensureGDriveAccessToken() {
      const cid = this.getGDriveEffectiveClientId();
      if (!cid) throw new Error('缺少 Google OAuth Client ID。請在 index.html 內設定網站預設 Client ID，或在安全性設定中輸入自訂 Client ID。');
      if (!window.google || !google.accounts || !google.accounts.oauth2) {
        throw new Error('Google Identity Services 尚未載入，請稍後再試。');
      }
      if (!__gdriveTokenClient || __gdriveTokenClientCid !== cid) {
        __gdriveTokenClient = google.accounts.oauth2.initTokenClient({
          client_id: cid,
          scope: __GDRIVE_SCOPE,
          callback: () => {}
        });
        __gdriveTokenClientCid = cid;
      }
      const token = await new Promise((resolve, reject) => {
        let finished = false;
        const timer = setTimeout(() => {
          if (finished) return;
          finished = true;
          reject(new Error('授權逾時。請確認已允許彈出視窗（Popup），並完成帳戶選擇／驗證後再試一次。'));
        }, 120000);
        __gdriveTokenClient.callback = (resp) => {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          if (resp && resp.access_token) resolve(resp.access_token);
          else reject(new Error(resp?.error_description || resp?.error || '授權失敗'));
        };
        try {
          // 跨裝置備份最常見的誤判來源之一是瀏覽器自動沿用另一個
          // 已登入的 Google 帳號。每次雲端操作都讓使用者明確選擇帳號，
          // 確保手機 / 平板 / 桌機真的進到同一個 Drive AppDataFolder。
          __gdriveTokenClient.requestAccessToken({ prompt: 'select_account' });
        } catch (e) {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          reject(new Error('無法啟動授權流程。請允許彈出視窗（Popup）後再試一次。'));
        }
      });
      // 每次操作顯示實際授權的帳號。若換了 Google 帳號，清除「本機顯示的」
      // 舊帳號雲端狀態（不會刪除或改動任何帳號的 Drive 檔案）。
      try {
        const res = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const profile = await res.json();
          if (profile && profile.email) {
            const email = String(profile.email).trim();
            const previous = String(this._readCloudMeta().googleAccountEmail || '').trim();
            if (previous && previous.toLowerCase() !== email.toLowerCase()) {
              this._writeCloudMeta({
                cloudFileExists: false, cloudFileId: '', cloudFileModifiedTime: '',
                cloudDuplicateCount: 0, cloudBackupDeviceName: '', cloudBackupDeviceId: '',
                cloudBackupTxCount: 0, cloudBackupCashBookCount: 0,
                lastCloudUploadAt: '', lastCloudRestoreAt: '', lastAction: ''
              });
            }
            this._writeCloudMeta({ googleAccountEmail: email, googleAccountCheckedAt: new Date().toISOString() });
          }
        } else {
          this._writeCloudMeta({ googleAccountEmail: '', googleAccountCheckedAt: '' });
        }
      } catch (_) {
        this._writeCloudMeta({ googleAccountEmail: '', googleAccountCheckedAt: '' });
      }
      return token;
    },

    _validateCloudRestorePayload(payload) {
      const fields = window.StockStorage.BACKUP_FIELDS || {};
      const txField = fields.transactions || 'tx';
      const cashField = fields.cashBook || 'cashBook';
      if (!payload || typeof payload !== 'object' || Array.isArray(payload) ||
          !Array.isArray(payload[txField]) || !Array.isArray(payload[cashField])) {
        throw new Error('備份檔缺少有效的交易或資金紀錄，已停止回復以保護目前資料。');
      }
      if (payload.portfolios !== undefined && !Array.isArray(payload.portfolios)) {
        throw new Error('備份帳本格式不正確，已取消回復。');
      }
      const version = Number(payload.schemaVersion || payload.version || 0);
      if (version > window.StockStorage.SCHEMA_VERSION) {
        throw new Error('這份備份是較新版系統產生的，請先升級網站再回復。');
      }
      window.StockStorage.normalizeBackupPayload(payload, this);
      return payload;
    },

    _downloadBackupJson(payload, fileName) {
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    },

    async _listDriveBackupEntries(accessToken) {
      // 搜尋所有 appDataFolder 檔案並在本機過濾，可找到舊版同名檔及新歷史版本。
      const fields = encodeURIComponent('nextPageToken,incompleteSearch,files(id,name,description,modifiedTime,createdTime,size)');
      let pageToken = '';
      const files = [];
      do {
        const pagePart = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '';
        const url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&fields=${fields}&pageSize=100${pagePart}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` }});
        if (!res.ok) throw makeDriveHttpError('Drive 版本查詢失敗', res, await res.text().catch(() => ''));
        const j = await res.json();
        if (j.incompleteSearch) throw new Error('Drive 檔案查詢不完整，請稍後重試。');
        files.push(...safeArray(j.files).filter(f => f && f.id &&
          (f.name === BACKUP_FILE_NAME || String(f.name).startsWith(HISTORY_PREFIX))));
        pageToken = j.nextPageToken || '';
      } while (pageToken);
      return files;
    },

    async _archiveBackupPayload(accessToken, payload, reason, sourceInfo) {
      this._validateCloudRestorePayload(payload);
      const now = new Date();
      const stamp = now.toISOString().replace(/[-:.]/g, '');
      const fileName = `${HISTORY_PREFIX}${stamp}_${makeId().replace(/[^A-Za-z0-9_-]/g, '').slice(-12)}.json`;
      const summary = this._summarizeBackupPayload(payload);
      const description = JSON.stringify({
        kind: reason, originalTime: sourceInfo?.modifiedTime || '',
        deviceName: summary.deviceName || this._getDeviceName(),
        txCount: summary.txCount, cashBookCount: summary.cashBookCount,
        portfolioCount: summary.portfolioCount
      });
      const boundary = `stockHistory_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const metadata = { name: fileName, parents: ['appDataFolder'], description };
      const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(payload)}\r\n--${boundary}--`;
      const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,createdTime,modifiedTime', {
        method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': `multipart/related; boundary=${boundary}` }, body
      });
      if (!res.ok) throw makeDriveHttpError('建立雲端安全版本失敗，原有資料不會被覆蓋', res, await res.text().catch(() => ''));
      const result = await res.json();
      if (!result || !result.id) throw new Error('雲端沒有回傳安全版本識別碼，已停止覆蓋／回復。');
      // 不只依賴上傳成功回應；從雲端重新下載比對後，才允許真正覆蓋。
      const verified = await this._downloadBackupPayload(accessToken, result.id);
      this._validateCloudRestorePayload(verified);
      if (JSON.stringify(verified) !== JSON.stringify(payload)) {
        throw new Error('新建立的雲端安全版本與原資料不一致。為避免資料遺失，已取消後續覆蓋／回復。');
      }
      return result;
    },

    async openGDriveHistory() {
      this.showGDriveHistoryModal = true;
      this.gdriveHistoryVisibleCount = 20;
      await this.loadGDriveHistory();
    },

    async loadGDriveHistory() {
      if (this.gdriveBusy) return;
      this.gdriveBusy = true;
      this.gdriveBusyText = '正在讀取雲端歷史版本…';
      this.gdriveHistoryError = '';
      try {
        const accessToken = await this._ensureGDriveAccessToken();
        const files = await this._listDriveBackupEntries(accessToken);
        const main = files.filter(f => f.name === BACKUP_FILE_NAME)
          .sort((a, b) => Date.parse(b.modifiedTime || b.createdTime || 0) - Date.parse(a.modifiedTime || a.createdTime || 0));
        const newestId = main.length ? main[0].id : '';
        const rows = files.map(f => {
          let desc = {};
          try { desc = safeObject(JSON.parse(f.description || '{}')); } catch (_) {}
          const kind = f.name === BACKUP_FILE_NAME ? (f.id === newestId ? 'latest' : 'legacy') :
            (desc.kind === 'before-restore' ? 'checkpoint' : 'archive');
          return {
            id: f.id, name: f.name, kind,
            time: f.name === BACKUP_FILE_NAME ? (f.modifiedTime || f.createdTime || '') : (f.createdTime || f.modifiedTime || ''),
            deviceName: desc.deviceName || '',
            txCount: Number.isFinite(Number(desc.txCount)) ? Number(desc.txCount) : null,
            cashBookCount: Number.isFinite(Number(desc.cashBookCount)) ? Number(desc.cashBookCount) : null
          };
        });
        rows.sort((a, b) => Date.parse(b.time || 0) - Date.parse(a.time || 0));
        this.gdriveHistory = rows;
        this.gdriveHistoryAccountEmail = this._readCloudMeta().googleAccountEmail || '';
      } catch (e) {
        this.gdriveHistory = [];
        this.gdriveHistoryError = e?.message || String(e);
      } finally {
        this.gdriveBusy = false;
        this.gdriveBusyText = '';
      }
    },

    async _authorizeHistoryAction() {
      const accessToken = await this._ensureGDriveAccessToken();
      const current = String(this._readCloudMeta().googleAccountEmail || '').toLowerCase();
      const listed = String(this.gdriveHistoryAccountEmail || '').toLowerCase();
      if (listed && (!current || listed !== current)) {
        throw new Error('這次選擇的 Google 帳號與版本列表不同。請重新整理歷史列表並選擇正確帳號。');
      }
      return accessToken;
    },

    async downloadGDriveHistoryVersion(entry) {
      if (!entry || !entry.id || this.gdriveBusy) return;
      this.gdriveBusy = true;
      this.gdriveBusyText = '正在下載歷史版本…';
      try {
        const token = await this._authorizeHistoryAction();
        const payload = this._validateCloudRestorePayload(await this._downloadBackupPayload(token, entry.id));
        const stamp = String(entry.time || new Date().toISOString()).replace(/[^0-9]/g, '').slice(0, 14);
        this._downloadBackupJson(payload, `台股損益管理-雲端版本-${stamp || 'backup'}.json`);
        this.openInfoModal('已準備下載', '已產生指定版本的 JSON 備份，請確認瀏覽器下載已完成並妥善保存。此操作不會修改本機資料。');
      } catch (e) {
        this.openInfoModal('下載失敗', e?.message || String(e));
      } finally { this.gdriveBusy = false; this.gdriveBusyText = ''; }
    },

    async restoreGDriveHistoryVersion(entry) {
      if (!entry || !entry.id || this.gdriveBusy) return;
      this.gdriveBusy = true;
      this.gdriveBusyText = '正在驗證歷史備份…';
      try {
        const accessToken = await this._authorizeHistoryAction();
        const payload = await this._downloadBackupPayload(accessToken, entry.id);
        const restored = await this._performCloudRestore(accessToken, payload, entry, 'history');
        if (restored) this.showGDriveHistoryModal = false;
      } catch (e) {
        this.openInfoModal('回復失敗', e?.message || String(e));
      } finally { this.gdriveBusy = false; this.gdriveBusyText = ''; }
    },

    async _performCloudRestore(accessToken, rawPayload, entry, source) {
      const payload = this._validateCloudRestorePayload(rawPayload);
      const summary = this._summarizeBackupPayload(payload);
      const email = this._readCloudMeta().googleAccountEmail || '目前授權帳號';
      const approved = await window.StockDialog.confirm({
        variant: 'danger', icon: 'fa-clock-rotate-left', eyebrow: '雲端歷史版本・安全救援',
        title: source === 'history' ? '確定要回復這個歷史版本？' : '確定要回復雲端最新備份？',
        description: '回復將取代本機資料；系統會先將目前裝置資料另存成雲端「救援快照」，確定保存成功後才執行。',
        account: email,
        details: [
          { label: '版本時間', value: formatTime(entry.time || entry.modifiedTime) },
          { label: '來源裝置', value: summary.deviceName || entry.deviceName || '舊版備份' },
          { label: '交易紀錄', value: `${summary.txCount} 筆` },
          { label: '資金紀錄', value: `${summary.cashBookCount} 筆` },
          { label: '投資帳本', value: `${summary.portfolioCount} 個` }
        ],
        note: { tone: 'danger', title: '不是合併資料', description: '不同裝置新增的交易不會自動合併。回復完成後，雲端「最新備份」不會自動改成這個歷史版本。' },
        tip: '系統會先建立救援快照；仍建議額外下載本機 JSON 保存。若雲端安全快照建立失敗，回復會自動中止。',
        cancelText: '先不要回復', confirmText: '建立救援快照並回復'
      });
      if (!approved) return false;
      // 先備份這台裝置的完整狀態；未成功絕對不覆蓋本機資料。
      const rollbackPayload = this._buildBackupPayload();
      this.gdriveBusyText = '正在建立本機資料救援快照…';
      await this._archiveBackupPayload(accessToken, rollbackPayload, 'before-restore', null);
      this.gdriveBusyText = '正在回復資料…';
      try {
        window.StockStorage.applyBackupPayload(payload, this);
        try { this.recomputeAllTradesAndValidate(); } catch (_) {}
      } catch (e) {
        try { window.StockStorage.applyBackupPayload(rollbackPayload, this); } catch (_) {}
        throw new Error(`回復資料發生錯誤：${e?.message || e}。已嘗試還原原有本機資料；雲端救援快照仍保留，可從歷史版本救援。`);
      }
      this._writeCloudMeta({
        lastCloudRestoreAt: new Date().toISOString(), lastAction: 'restore',
        lastRestoredVersionId: entry.id, lastCloudErrorAt: '', lastCloudErrorMessage: ''
      });
      this.openInfoModal('回復成功', `已回復指定版本（${formatTime(entry.time || entry.modifiedTime)}）。回復前的本機資料已保存成雲端「救援快照」。\n交易 ${summary.txCount} 筆、資金 ${summary.cashBookCount} 筆。網頁將重新整理。`);
      setTimeout(() => window.location.reload(), 1000);
      return true;
    },

    async _findAllBackupFiles(accessToken) {
      const files = (await this._listDriveBackupEntries(accessToken)).filter(f => f.name === BACKUP_FILE_NAME);
      files.sort((a, b) => Date.parse(b.modifiedTime || b.createdTime || 0) - Date.parse(a.modifiedTime || a.createdTime || 0));
      return files;
    },

    async _findBackupFileId(accessToken) {
      const files = await this._findAllBackupFiles(accessToken);
      if (!files.length) return null;
      const latest = files[0];
      return {
        id: latest.id,
        name: latest.name || BACKUP_FILE_NAME,
        modifiedTime: latest.modifiedTime || '',
        createdTime: latest.createdTime || '',
        size: latest.size || '',
        duplicateCount: files.length,
        files
      };
    },

    _buildBackupPayload() {
      return this._decorateBackupPayload(window.StockStorage.buildBackupPayload(this));
    },

    async _removeDuplicateBackupFiles(accessToken, keepFileId, files) {
      const candidates = safeArray(files).filter(f => f && f.id && f.id !== keepFileId);
      let removed = 0;
      for (const file of candidates) {
        try {
          await window.StockBackupService._deleteDriveFile.call(this, accessToken, file.id);
          removed += 1;
        } catch (_) {
          // A duplicate cleanup failure must not make a successful backup fail.
        }
      }
      return removed;
    },

    async _downloadBackupPayload(accessToken, fileId) {
      const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` }});
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw makeDriveHttpError('下載失敗', res, text);
      }
      return await res.json();
    },

    async _verifyUploadedBackup(accessToken, fileId, expectedPayload) {
      if (!fileId) throw new Error('Google Drive 沒有回傳備份檔案 ID，無法驗證上傳結果。');

      const expectedJson = stableJson(expectedPayload);
      let lastReason = '尚未取得雲端檔案內容。';

      // Drive 更新後立即讀取通常會成功；保留短暫重試，避免讀取索引延遲造成誤判。
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          if (attempt > 0) await wait(500 * attempt);

          let verifyId = fileId;
          let metaRes = await fetch(
            `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(verifyId)}?fields=id,name,mimeType,modifiedTime,size,trashed`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          if (!metaRes.ok) {
            const text = await metaRes.text().catch(() => '');
            throw makeDriveHttpError('讀取上傳檔案資訊失敗', metaRes, text);
          }
          let metadata = await metaRes.json();
          if (metadata.trashed || metadata.name !== BACKUP_FILE_NAME) {
            throw new Error('雲端回傳的檔案名稱或狀態不正確。');
          }

          let downloaded = this._validateCloudRestorePayload(
            await this._downloadBackupPayload(accessToken, verifyId)
          );

          // 若 AppDataFolder 中有同名檔，確認「其他裝置會找到的最新檔」
          // 也確實是本次上傳內容，避免只更新到舊的重複檔案。
          const latestInfo = await this._findBackupFileId(accessToken);
          if (!latestInfo || !latestInfo.id) {
            throw new Error('上傳後重新查詢時，找不到最新雲端備份檔。');
          }
          if (latestInfo.id !== verifyId) {
            const latestPayload = this._validateCloudRestorePayload(
              await this._downloadBackupPayload(accessToken, latestInfo.id)
            );
            if (stableJson(latestPayload) !== expectedJson) {
              lastReason = '雲端存在另一個較新的同名備份，該檔案內容仍不是本次資料。';
              continue;
            }
            verifyId = latestInfo.id;
            downloaded = latestPayload;
            metaRes = await fetch(
              `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(verifyId)}?fields=id,name,mimeType,modifiedTime,size,trashed`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            if (!metaRes.ok) {
              const text = await metaRes.text().catch(() => '');
              throw makeDriveHttpError('讀取最新備份資訊失敗', metaRes, text);
            }
            metadata = await metaRes.json();
            if (metadata.trashed || metadata.name !== BACKUP_FILE_NAME) {
              throw new Error('最新雲端備份檔名稱或狀態不正確。');
            }
          }

          if (stableJson(downloaded) !== expectedJson) {
            lastReason = '重新下載的雲端內容與本機準備上傳的資料不同。';
            continue;
          }

          const summary = this._summarizeBackupPayload(downloaded);
          const expectedSummary = this._summarizeBackupPayload(expectedPayload);
          if (summary.deviceId !== expectedSummary.deviceId ||
              summary.exportedAt !== expectedSummary.exportedAt ||
              summary.txCount !== expectedSummary.txCount ||
              summary.cashBookCount !== expectedSummary.cashBookCount ||
              summary.portfolioCount !== expectedSummary.portfolioCount) {
            lastReason = '雲端備份的裝置識別或資料筆數與本機不一致。';
            continue;
          }

          return {
            id: verifyId,
            metadata,
            summary,
            verifiedAt: new Date().toISOString()
          };
        } catch (error) {
          lastReason = error?.message || String(error || '雲端驗證失敗');
          if (Number(error && error.status) === 401 || Number(error && error.status) === 403) throw error;
        }
      }

      throw new Error(
        `上傳請求已送出，但系統無法確認雲端最新檔案是否已完整更新：${lastReason}\n為避免誤覆蓋其他裝置資料，這次不會標示為「備份成功」。請先按「刷新雲端狀態」確認，不要連續重複上傳。`
      );
    },

    async uploadToGDrive() {
      this.gdriveBusy = true;
      this.gdriveBusyText = '正在授權／連線…';
      try {
        const accessToken = await this._ensureGDriveAccessToken();
        this.gdriveBusyText = '正在尋找雲端最新備份…';
        const fileInfo = await this._findBackupFileId(accessToken);
        const fileId = fileInfo && fileInfo.id ? fileInfo.id : null;
        const payload = this._buildBackupPayload();
        const summary = this._summarizeBackupPayload(payload);
        let remotePayload = null;
        if (fileId) {
          // A second device must not silently replace a newer backup produced
          // by the first device. Keep the remote file untouched on cancel.
          remotePayload = this._validateCloudRestorePayload(await this._downloadBackupPayload(accessToken, fileId));
          const remote = this._summarizeBackupPayload(remotePayload);
          if (!remote.deviceId || remote.deviceId !== summary.deviceId) {
            const email = this._readCloudMeta().googleAccountEmail || '目前授權帳號';
            const approved = await window.StockDialog.confirm({
              variant: 'danger', icon: 'fa-cloud-arrow-up', eyebrow: '跨裝置備份保護',
              title: '確定要覆蓋雲端備份？',
              description: '目前 Google 雲端已有其他裝置建立的備份，請先確認要保留哪一台裝置的資料。',
              account: email,
              details: [
                { label: '雲端備份來源', value: remote.deviceName || '另一個裝置／舊版本' },
                { label: '雲端最後更新', value: formatTime(fileInfo.modifiedTime) },
                { label: '雲端交易筆數', value: `${remote.txCount} 筆` },
                { label: '這台裝置交易筆數', value: `${summary.txCount} 筆` }
              ],
              note: {
                tone: 'danger', title: '雲端原有資料將被覆蓋',
                description: '這次上傳會以「目前裝置」的完整帳本取代雲端備份，不會自動合併兩台裝置的交易。'
              },
              tip: '如果尚未先從雲端回復，建議按「先不要上傳」，先下載本機 JSON 備份再檢查資料。',
              cancelText: '先不要上傳', confirmText: '確認覆蓋雲端'
            });
            if (!approved) {
              this.openInfoModal('已取消上傳', '雲端資料沒有被修改。請先確認哪台裝置的資料最完整。');
              return;
            }
          }
        }
        // 先將即將被取代的最新備份存成獨立版本；失敗就不執行 PATCH。
        if (fileId) {
          this.gdriveBusyText = '正在保存覆蓋前的歷史版本…';
          await this._archiveBackupPayload(accessToken, remotePayload, 'before-upload', fileInfo);
        }
        const boundary = `stockBackup_${Date.now()}_${Math.random().toString(36).slice(2)}`;

        const sendCreate = async () => {
          const metadata = { name: BACKUP_FILE_NAME, parents: ['appDataFolder'] };
          // 新檔建立仍使用 multipart，將檔案 metadata 與 JSON 內容一次送出。
          const body =
            `--${boundary}\r\n` +
            `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
            `${JSON.stringify(metadata)}\r\n` +
            `--${boundary}\r\n` +
            `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
            `${JSON.stringify(payload)}\r\n` +
            `--${boundary}--\r\n`;
          this.gdriveBusyText = '正在建立雲端備份…';
          const res = await fetch(
            'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime,createdTime,size',
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': `multipart/related; boundary=${boundary}`
              },
              body
            }
          );
          if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw makeDriveHttpError('建立雲端備份失敗', res, text);
          }
          const result = await res.json().catch(() => null);
          if (!result || !result.id) throw new Error('Google Drive 未回傳新備份檔案 ID。');
          return result;
        };

        const sendUpdate = async (targetFileId) => {
          // 更新既有檔案時只傳送媒體內容（JSON），避免 multipart PATCH
          // 在部分瀏覽器／代理環境下出現 metadata 與內容未同步更新的情況。
          this.gdriveBusyText = '正在更新雲端最新備份…';
          const uploadUrl =
            `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(targetFileId)}` +
            '?uploadType=media&fields=id,name,modifiedTime,createdTime,size';
          const res = await fetch(uploadUrl, {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json; charset=UTF-8'
            },
            body: JSON.stringify(payload)
          });
          if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw makeDriveHttpError('更新雲端備份失敗', res, text);
          }
          return await res.json().catch(() => ({ id: targetFileId }));
        };

        let uploadInfo = null;
        let recreatedCloudFile = false;
        try {
          uploadInfo = fileId ? await sendUpdate(fileId) : await sendCreate();
        } catch (uploadError) {
          // 舊 fileId 已失效時，保留前面建立的歷史版本，再建立新備份檔。
          if (fileId && isDriveFileGoneError(uploadError)) {
            recreatedCloudFile = true;
            this._writeCloudMeta({
              cloudFileExists: false,
              cloudFileId: '',
              cloudFileModifiedTime: '',
              cloudDuplicateCount: 0,
              lastCloudErrorAt: new Date().toISOString(),
              lastCloudErrorMessage: '原 Google Drive 備份檔已不存在，已改為重新建立新備份。'
            });
            this.gdriveBusyText = '原雲端備份已不存在，正在重新建立…';
            uploadInfo = await sendCreate();
          } else {
            throw uploadError;
          }
        }

        const uploadedFileId = (uploadInfo && uploadInfo.id) ? uploadInfo.id : (fileId || '');
        if (!uploadedFileId) throw new Error('上傳後沒有取得可驗證的雲端檔案 ID。');

        this.gdriveBusyText = '正在重新下載雲端資料，核對備份內容…';
        const verified = await window.StockBackupService._verifyUploadedBackup.call(this, accessToken, uploadedFileId, payload);
        const finalFileId = verified.id;
        const modifiedTime = verified.metadata.modifiedTime || (uploadInfo && uploadInfo.modifiedTime) || new Date().toISOString();
        const verifiedSummary = verified.summary;

        // 只有重新下載、比對內容及確認它是雲端最新同名檔後，才寫入成功狀態。
        const knownDuplicates = fileInfo && fileInfo.files ? fileInfo.files.length : 0;
        const resultingCount = Math.max(1, knownDuplicates + (fileId ? 0 : 1));

        const nowIso = new Date().toISOString();
        this._writeCloudMeta({
          lastCloudUploadAt: nowIso,
          lastAction: 'upload',
          cloudFileExists: true,
          cloudFileId: finalFileId,
          cloudFileModifiedTime: modifiedTime,
          cloudDuplicateCount: resultingCount,
          cloudBackupExportedAt: verifiedSummary.exportedAt || payload.exportedAt || nowIso,
          cloudBackupDeviceName: verifiedSummary.deviceName || this._getDeviceName(),
          cloudBackupDeviceId: verifiedSummary.deviceId || this._getDeviceId(),
          cloudBackupClientIdSource: verifiedSummary.clientIdSource || this.getGDriveClientIdSource(),
          cloudBackupClientIdHint: verifiedSummary.clientIdHint || shortClientId(this.getGDriveEffectiveClientId()),
          cloudBackupTxCount: verifiedSummary.txCount,
          cloudBackupCashBookCount: verifiedSummary.cashBookCount,
          cloudBackupPortfolioCount: verifiedSummary.portfolioCount,
          lastCloudVerifiedAt: verified.verifiedAt,
          lastCloudUploadVerified: true,
          lastCloudErrorAt: '',
          lastCloudErrorMessage: ''
        });
        const msgInfo = Object.assign({}, fileInfo || {}, {
          id: finalFileId, modifiedTime, duplicateCount: resultingCount
        });
        const prefix = recreatedCloudFile
          ? '原 Google Drive 備份檔已不存在，系統已重新建立備份，並完成重新下載核對。'
          : '已將目前這台裝置的資料備份到 Google 雲端，且已重新下載核對內容一致。';
        const email = this._readCloudMeta().googleAccountEmail || '無法確認';
        const msg = buildSummaryMessage(
          `Google 帳號：${email}\n${prefix}\n驗證時間：${formatTime(verified.verifiedAt)}`,
          msgInfo,
          verifiedSummary
        );
        this.openInfoModal('上傳並驗證成功', msg);
      } catch (e) {
        this._writeCloudMeta({
          lastCloudErrorAt: new Date().toISOString(),
          lastCloudErrorMessage: e?.message || String(e || '上傳失敗'),
          lastCloudUploadVerified: false
        });
        this.openInfoModal('雲端備份未完成確認', `這次沒有標示為備份成功。\n${e?.message || e}\n\n請先刷新雲端狀態，確認最新備份的時間與資料筆數，再決定是否重試。`);
      } finally {
        this.gdriveBusy = false;
        this.gdriveBusyText = '';
      }
    },



    async _deleteDriveFile(accessToken, fileId) {
      const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`;
      const res = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok && res.status !== 404) {
        const text = await res.text().catch(() => '');
        throw new Error(`刪除雲端備份失敗（${res.status}）${text ? '：' + text : ''}`);
      }
      return true;
    },

    async deleteGDriveBackup() {
      this.gdriveBusy = true;
      this.gdriveBusyText = '正在授權／刪除雲端備份…';
      try {
        const accessToken = await this._ensureGDriveAccessToken();
        this.gdriveBusyText = '正在尋找雲端備份檔…';
        const files = await this._findAllBackupFiles(accessToken);
        if (!files.length) {
          this._writeCloudMeta({
            cloudFileExists: false,
            cloudFileId: '',
            cloudFileModifiedTime: '',
            cloudDuplicateCount: 0,
            cloudBackupExportedAt: '',
            cloudBackupDeviceName: '',
            cloudBackupDeviceId: '',
            cloudBackupClientIdSource: '',
            cloudBackupClientIdHint: '',
            cloudBackupTxCount: 0,
            cloudBackupCashBookCount: 0,
            cloudBackupPortfolioCount: 0,
            lastCloudErrorAt: '',
            lastCloudErrorMessage: '',
            lastAction: 'delete'
          });
          this.openInfoModal('沒有雲端備份', `Google Drive 目前沒有找到備份檔（${BACKUP_FILE_NAME}）。`);
          return;
        }

        this.gdriveBusyText = files.length > 1 ? `正在刪除 ${files.length} 個雲端備份檔…` : '正在刪除雲端備份檔…';
        for (const file of files) {
          if (file && file.id) {
            // Use the service method directly so this works even when the Vue app
            // has not exposed a wrapper method for the internal helper.
            await window.StockBackupService._deleteDriveFile.call(this, accessToken, file.id);
          }
        }

        const nowIso = new Date().toISOString();
        this._writeCloudMeta({
          lastCloudDeleteAt: nowIso,
          lastAction: 'delete',
          cloudFileExists: false,
          cloudFileId: '',
          cloudFileModifiedTime: '',
          cloudDuplicateCount: 0,
          cloudBackupExportedAt: '',
          cloudBackupDeviceName: '',
          cloudBackupDeviceId: '',
          cloudBackupClientIdSource: '',
          cloudBackupClientIdHint: '',
          cloudBackupTxCount: 0,
          cloudBackupCashBookCount: 0,
          cloudBackupPortfolioCount: 0,
          lastCloudErrorAt: '',
          lastCloudErrorMessage: ''
        });
        this.openInfoModal('已移除雲端備份', files.length > 1 ? `已刪除 Google Drive AppDataFolder 內 ${files.length} 個同名備份檔。` : '已刪除 Google Drive AppDataFolder 內的雲端備份檔。');
      } catch (e) {
        this._writeCloudMeta({ lastCloudErrorAt: new Date().toISOString(), lastCloudErrorMessage: e?.message || String(e || '刪除雲端備份失敗') });
        this.openInfoModal('刪除失敗', `發生未預期錯誤：${e?.message || e}`);
      } finally {
        this.gdriveBusy = false;
        this.gdriveBusyText = '';
      }
    },

    async restoreFromGDrive() {
      this.gdriveBusy = true;
      this.gdriveBusyText = '正在授權／下載備份…';
      try {
        const accessToken = await this._ensureGDriveAccessToken();
        this.gdriveBusyText = '正在尋找雲端最新備份…';
        const fileInfo = await this._findBackupFileId(accessToken);
        const fileId = fileInfo && fileInfo.id ? fileInfo.id : null;
        if (!fileId) {
          const email = this._readCloudMeta().googleAccountEmail || '無法確認';
          this.openInfoModal('回復失敗', `目前授權 Google 帳號：${email}\n沒有找到此網站的雲端備份（${BACKUP_FILE_NAME}）。\n請確認電腦與手機都選同一個 Google 帳號，且使用更新後的同一個網站。Google AppDataFolder 是隱藏空間，無法在一般雲端硬碟畫面直接看到。`);
          return;
        }
        this.gdriveBusyText = '正在下載雲端最新備份…';
        let payload = null;
        try {
          payload = await this._downloadBackupPayload(accessToken, fileId);
        } catch (downloadError) {
          if (isDriveFileGoneError(downloadError)) {
            this._writeCloudMeta({
              cloudFileExists: false,
              cloudFileId: '',
              cloudFileModifiedTime: '',
              cloudDuplicateCount: 0,
              cloudBackupExportedAt: '',
              cloudBackupDeviceName: '',
              cloudBackupDeviceId: '',
              cloudBackupClientIdSource: '',
              cloudBackupClientIdHint: '',
              cloudBackupTxCount: 0,
              cloudBackupCashBookCount: 0,
              cloudBackupPortfolioCount: 0,
              lastCloudErrorAt: new Date().toISOString(),
              lastCloudErrorMessage: 'Google Drive 備份檔已不存在或已被刪除。'
            });
            this.openInfoModal('回復失敗', 'Google Drive 找到的備份檔已不存在或已被刪除。請先在仍有完整資料的裝置按「上傳到 Google 雲端」重新建立備份，再回到這台裝置執行回復。');
            return;
          }
          throw downloadError;
        }
        await this._performCloudRestore(accessToken, payload, {
          id: fileId, time: fileInfo.modifiedTime || '', deviceName: ''
        }, 'latest');
      } catch (e) {
        this._writeCloudMeta({ lastCloudErrorAt: new Date().toISOString(), lastCloudErrorMessage: e?.message || String(e || '回復失敗') });
        this.openInfoModal('回復失敗', `發生未預期錯誤：${e?.message || e}`);
      } finally {
        this.gdriveBusy = false;
        this.gdriveBusyText = '';
      }
    },

    addCategory() {
      const raw = String(this.newCategoryName || '').trim();
      if (!raw) return;
      if (!Array.isArray(this.categories)) this.categories = [];
      if (this.categories.some(c => (c && String(c.name || '').trim()) === raw)) {
        this.newCategoryName = '';
        return;
      }
      const id = 'cat_' + Date.now();
      this.categories.push({ id, name: raw, label: raw, shortLabel: raw });
      this.newCategoryName = '';
      localStorage.setItem(window.StockStorage.KEYS.categories, JSON.stringify(this.categories));
      this.newTx.category = id;
    }
  };
})(window);
