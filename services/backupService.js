(function(window) {
  'use strict';

  let __gdriveTokenClient = null;
  let __gdriveTokenClientCid = null;
  const __GDRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
  const BACKUP_FILE_NAME = 'tw_stock_backup.json';
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
            cloudDuplicateCount: 0,
            cloudBackupExportedAt: '',
            cloudBackupDeviceName: '',
            cloudBackupDeviceId: '',
            cloudBackupClientIdSource: '',
            lastCloudErrorAt: '',
            lastCloudErrorMessage: ''
          });
          this.openInfoModal('雲端狀態', `雲端目前沒有找到備份檔（${BACKUP_FILE_NAME}）。`);
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

        this.openInfoModal('雲端狀態', buildSummaryMessage('已找到雲端最新備份。', info, summary));
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
      const custom = (this.gdriveClientId || '').trim();
      return custom || __getDefaultGDriveClientId();
    },

    getGDriveClientIdSource() {
      return (this.gdriveClientId || '').trim() ? 'custom' : (__getDefaultGDriveClientId() ? 'default' : 'none');
    },

    saveGDriveClientId() {
      const cid = (this.gdriveClientIdInput || '').trim();
      if (!cid) {
        this.openInfoModal('提示', '不填也可以使用網站內建的預設 Client ID；只有想改用自己的 Google Cloud 專案時才需要輸入。');
        return;
      }
      localStorage.setItem(window.StockStorage.KEYS.gdriveClientId, cid);
      this.gdriveClientId = cid;
      this.gdriveClientIdInput = cid;
      __gdriveTokenClient = null;
      __gdriveTokenClientCid = null;
      this.openInfoModal('已儲存', '自訂 Google OAuth Client ID 已儲存。跨裝置備份時，每台裝置都必須使用同一組 Client ID。');
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
          // 不強制每次都 consent，避免反覆觸發 Google 的再次驗證流程。
          __gdriveTokenClient.requestAccessToken();
        } catch (e) {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          reject(new Error('無法啟動授權流程。請允許彈出視窗（Popup）後再試一次。'));
        }
      });
      return token;
    },

    async _findAllBackupFiles(accessToken) {
      const q = encodeURIComponent(`name='${BACKUP_FILE_NAME}' and 'appDataFolder' in parents and trashed=false`);
      const orderBy = encodeURIComponent('modifiedTime desc');
      const fields = encodeURIComponent('nextPageToken,files(id,name,modifiedTime,createdTime,size,md5Checksum)');
      let pageToken = '';
      const files = [];
      do {
        const tokenPart = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '';
        const url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&orderBy=${orderBy}&fields=${fields}&pageSize=100${tokenPart}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` }});
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(`Drive 查詢失敗（${res.status}）${text ? '：' + text : ''}`);
        }
        const j = await res.json();
        files.push(...safeArray(j.files));
        pageToken = j.nextPageToken || '';
      } while (pageToken);
      files.sort((a, b) => new Date(b.modifiedTime || b.createdTime || 0) - new Date(a.modifiedTime || a.createdTime || 0));
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

    async _downloadBackupPayload(accessToken, fileId) {
      const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` }});
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`下載失敗（${res.status}）${text ? '：' + text : ''}`);
      }
      return await res.json();
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
        const boundary = '-------314159265358979323846';
        const metadata = fileId ? { name: BACKUP_FILE_NAME } : { name: BACKUP_FILE_NAME, parents: ['appDataFolder'] };
        const multipartBody =
          `--${boundary}\r\n` +
          `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
          `${JSON.stringify(metadata)}\r\n` +
          `--${boundary}\r\n` +
          `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
          `${JSON.stringify(payload)}\r\n` +
          `--${boundary}--`;
        const uploadUrl = fileId
          ? `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(fileId)}?uploadType=multipart&fields=id,name,modifiedTime,createdTime,size`
          : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime,createdTime,size`;
        const method = fileId ? 'PATCH' : 'POST';
        this.gdriveBusyText = fileId ? '正在更新雲端最新備份…' : '正在建立雲端備份…';
        const res = await fetch(uploadUrl, {
          method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`
          },
          body: multipartBody
        });
        if (!res.ok) {
          const t = await res.text().catch(() => '');
          throw new Error(`上傳失敗（${res.status}）${t ? '：' + t : ''}`);
        }
        let uploadInfo = null;
        try { uploadInfo = await res.json(); } catch(_) { uploadInfo = null; }
        const nowIso = new Date().toISOString();
        const modifiedTime = (uploadInfo && uploadInfo.modifiedTime) ? uploadInfo.modifiedTime : nowIso;
        this._writeCloudMeta({
          lastCloudUploadAt: nowIso,
          lastAction: 'upload',
          cloudFileExists: true,
          cloudFileId: (uploadInfo && uploadInfo.id) ? uploadInfo.id : (fileId || ''),
          cloudFileModifiedTime: modifiedTime,
          cloudDuplicateCount: fileInfo ? (fileInfo.duplicateCount || 1) : 1,
          cloudBackupExportedAt: summary.exportedAt || payload.exportedAt || nowIso,
          cloudBackupDeviceName: summary.deviceName || this._getDeviceName(),
          cloudBackupDeviceId: summary.deviceId || this._getDeviceId(),
          cloudBackupClientIdSource: summary.clientIdSource || this.getGDriveClientIdSource(),
          cloudBackupClientIdHint: summary.clientIdHint || shortClientId(this.getGDriveEffectiveClientId()),
          cloudBackupTxCount: summary.txCount,
          cloudBackupCashBookCount: summary.cashBookCount,
          cloudBackupPortfolioCount: summary.portfolioCount,
          lastCloudErrorAt: '',
          lastCloudErrorMessage: ''
        });
        const msg = buildSummaryMessage('已將目前這台裝置的資料備份到 Google 雲端。', Object.assign({}, fileInfo || {}, { modifiedTime }), summary);
        this.openInfoModal('上傳成功', msg);
      } catch (e) {
        this._writeCloudMeta({ lastCloudErrorAt: new Date().toISOString(), lastCloudErrorMessage: e?.message || String(e || '上傳失敗') });
        this.openInfoModal('上傳失敗', `發生未預期錯誤：${e?.message || e}`);
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
          this.openInfoModal('回復失敗', `雲端找不到備份檔案（${BACKUP_FILE_NAME}）。請確認每台裝置使用同一個 Google 帳號與同一個 Client ID。`);
          return;
        }
        this.gdriveBusyText = '正在下載雲端最新備份…';
        const payload = await this._downloadBackupPayload(accessToken, fileId);
        const summary = this._summarizeBackupPayload(payload);
        window.StockStorage.applyBackupPayload(payload, this);
        try { this.recomputeAllTradesAndValidate(); } catch (_) {}
        const nowIso = new Date().toISOString();
        this._writeCloudMeta({
          lastCloudRestoreAt: nowIso,
          lastAction: 'restore',
          cloudFileExists: true,
          cloudFileId: fileId,
          cloudFileModifiedTime: (fileInfo && fileInfo.modifiedTime) ? fileInfo.modifiedTime : '',
          cloudDuplicateCount: fileInfo ? (fileInfo.duplicateCount || 1) : 1,
          cloudBackupExportedAt: summary.exportedAt || payload.exportedAt || '',
          cloudBackupDeviceName: summary.deviceName || '',
          cloudBackupDeviceId: summary.deviceId || '',
          cloudBackupClientIdSource: summary.clientIdSource || '',
          cloudBackupClientIdHint: summary.clientIdHint || '',
          cloudBackupTxCount: summary.txCount,
          cloudBackupCashBookCount: summary.cashBookCount,
          cloudBackupPortfolioCount: summary.portfolioCount,
          lastCloudErrorAt: '',
          lastCloudErrorMessage: ''
        });
        this.openInfoModal('回復成功', buildSummaryMessage('已從 Google 雲端最新備份回復資料，將重新整理以套用所有狀態。', fileInfo, summary));
        setTimeout(() => window.location.reload(), 900);
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
