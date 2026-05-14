(function(window) {
  'use strict';

  let __gdriveTokenClient = null;
  let __gdriveTokenClientCid = null;

  const __GDRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
  const BACKUP_FILE_NAME = 'tw_stock_backup.json';
  const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3/files';
  const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3/files';

  function __getDefaultGDriveClientId() {
    return String(window.STOCK_TRACKER_GOOGLE_CLIENT_ID || window.STOCK_APP_DEFAULT_GOOGLE_CLIENT_ID || '').trim();
  }

  function escapeDriveQueryValue(value) {
    return String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  function toMs(value) {
    const n = Date.parse(value || '');
    return Number.isFinite(n) ? n : 0;
  }

  function sortBackupFiles(files) {
    return (Array.isArray(files) ? files : [])
      .filter(f => f && f.id)
      .sort((a, b) => {
        const byModified = toMs(b.modifiedTime) - toMs(a.modifiedTime);
        if (byModified) return byModified;
        return String(b.id || '').localeCompare(String(a.id || ''));
      });
  }

  async function safeTrashDuplicateFiles(accessToken, filesToTrash) {
    const files = Array.isArray(filesToTrash) ? filesToTrash : [];
    await Promise.all(files.map(async (file) => {
      try {
        await fetch(`${DRIVE_API_BASE}/${encodeURIComponent(file.id)}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json; charset=UTF-8'
          },
          body: JSON.stringify({ trashed: true })
        });
      } catch (e) {
        console.warn('[GDrive backup] duplicate cleanup skipped:', e);
      }
    }));
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
      try { return JSON.parse(localStorage.getItem(window.StockStorage.KEYS.cloudMeta) || '{}') || {}; }
      catch(e) { return {}; }
    },

    _writeCloudMeta(patch) {
      const cur = this._readCloudMeta();
      const next = Object.assign({}, cur, patch || {});
      localStorage.setItem(window.StockStorage.KEYS.cloudMeta, JSON.stringify(next));
      this.gdriveCloudMeta = next;
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
            cloudBackupFileId: '',
            cloudBackupDuplicateCount: 0,
            lastCloudErrorAt: '',
            lastCloudErrorMessage: ''
          });
          this.openInfoModal('雲端狀態', `雲端目前沒有找到備份檔（${BACKUP_FILE_NAME}）。`);
          return;
        }
        this._writeCloudMeta({
          cloudFileExists: true,
          cloudFileModifiedTime: info.modifiedTime || '',
          cloudBackupFileId: info.id || '',
          cloudBackupDuplicateCount: Math.max(0, Number(info.duplicateCount || 0)),
          lastCloudErrorAt: '',
          lastCloudErrorMessage: ''
        });
        const duplicateText = info.duplicateCount ? `\n\n已偵測到 ${info.duplicateCount} 個舊的重複備份檔，系統已改以最新修改的備份檔為準。下次上傳成功後會自動整理成單一備份檔。` : '';
        this.openInfoModal('雲端狀態', `雲端最後修改時間：${this.formatDateTime ? this.formatDateTime(info.modifiedTime) : (info.modifiedTime || '—')}${duplicateText}`);
      } catch(e) {
        this._writeCloudMeta({ lastCloudErrorAt: new Date().toISOString(), lastCloudErrorMessage: e?.message || String(e || '雲端狀態刷新失敗') });
        this.openInfoModal('雲端狀態', `發生未預期錯誤：${e?.message || e}`);
      } finally {
        this.gdriveBusy = false;
        this.gdriveBusyText = '';
      }
    },

    getDefaultGDriveClientId() { return __getDefaultGDriveClientId(); },

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
      this.openInfoModal('已儲存', '自訂 Google OAuth Client ID 已儲存，之後會優先使用這組設定。');
    },

    clearGDriveClientId() {
      localStorage.removeItem(window.StockStorage.KEYS.gdriveClientId);
      this.gdriveClientId = '';
      this.gdriveClientIdInput = '';
      __gdriveTokenClient = null;
      __gdriveTokenClientCid = null;
      const hasDefault = !!__getDefaultGDriveClientId();
      this.openInfoModal('已清除', hasDefault ? '已清除自訂 Client ID，之後會改用網站內建的預設 Client ID。' : '已清除 Google OAuth Client ID。目前尚未設定網站預設 Client ID。');
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
          // 只選帳號，不強制每次 consent；避免 B 裝置沿用瀏覽器目前登入的其他 Google 帳號。
          __gdriveTokenClient.requestAccessToken({ prompt: 'select_account' });
        } catch (e) {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          reject(new Error('無法啟動授權流程。請允許彈出視窗（Popup）後再試一次。'));
        }
      });
      return token;
    },

    async _listBackupFiles(accessToken) {
      const q = encodeURIComponent(`name='${escapeDriveQueryValue(BACKUP_FILE_NAME)}' and 'appDataFolder' in parents and trashed=false`);
      let pageToken = '';
      const files = [];
      do {
        const url = `${DRIVE_API_BASE}?spaces=appDataFolder&q=${q}&fields=nextPageToken,files(id,name,modifiedTime,createdTime,size)&pageSize=100${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` }});
        if (!res.ok) {
          const t = await res.text().catch(() => '');
          throw new Error(`Drive 查詢失敗（${res.status}）${t ? '：' + t : ''}`);
        }
        const j = await res.json();
        files.push(...(Array.isArray(j.files) ? j.files : []));
        pageToken = j.nextPageToken || '';
      } while (pageToken);
      return sortBackupFiles(files);
    },

    async _findBackupFileId(accessToken) {
      const files = await this._listBackupFiles(accessToken);
      if (!files.length) return null;
      const latest = files[0];
      return Object.assign({}, latest, {
        duplicateCount: Math.max(0, files.length - 1),
        allFiles: files
      });
    },

    _buildBackupPayload() { return window.StockStorage.buildBackupPayload(this); },

    async uploadToGDrive() {
      this.gdriveBusy = true;
      this.gdriveBusyText = '正在授權／連線…';
      try {
        const accessToken = await this._ensureGDriveAccessToken();
        const payload = this._buildBackupPayload();
        const fileInfo = await this._findBackupFileId(accessToken);
        const fileId = fileInfo && fileInfo.id ? fileInfo.id : null;
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
          ? `${DRIVE_UPLOAD_BASE}/${encodeURIComponent(fileId)}?uploadType=multipart&fields=id,modifiedTime`
          : `${DRIVE_UPLOAD_BASE}?uploadType=multipart&fields=id,modifiedTime`;
        const method = fileId ? 'PATCH' : 'POST';
        const res = await fetch(uploadUrl, {
          method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`
          },
          body: multipartBody
        });
        if (!res.ok) {
          const t = await res.text().catch(()=>'');
          throw new Error(`上傳失敗（${res.status}）${t ? '：' + t : ''}`);
        }
        let uploadInfo = null;
        try { uploadInfo = await res.json(); } catch(_) { uploadInfo = null; }

        if (fileInfo && Array.isArray(fileInfo.allFiles) && fileInfo.allFiles.length > 1) {
          await safeTrashDuplicateFiles(accessToken, fileInfo.allFiles.slice(1));
        }

        const nowIso = new Date().toISOString();
        this._writeCloudMeta({
          lastCloudUploadAt: nowIso,
          lastAction: 'upload',
          cloudFileExists: true,
          cloudBackupFileId: (uploadInfo && uploadInfo.id) || fileId || '',
          cloudBackupDuplicateCount: 0,
          lastCloudErrorAt: '',
          lastCloudErrorMessage: '',
          cloudFileModifiedTime: (uploadInfo && uploadInfo.modifiedTime) ? uploadInfo.modifiedTime : (fileInfo && fileInfo.modifiedTime ? fileInfo.modifiedTime : '')
        });
        this.openInfoModal('上傳成功', '已將資料備份到 Google 雲端，並已整理同名重複備份檔。');
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
        const fileInfo = await this._findBackupFileId(accessToken);
        const fileId = fileInfo && fileInfo.id ? fileInfo.id : null;
        if (!fileId) {
          this.openInfoModal('回復失敗', `雲端找不到備份檔案（${BACKUP_FILE_NAME}）。`);
          return;
        }
        const url = `${DRIVE_API_BASE}/${encodeURIComponent(fileId)}?alt=media`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` }});
        if (!res.ok) throw new Error(`下載失敗（${res.status}）`);
        const payload = await res.json();
        window.StockStorage.applyBackupPayload(payload, this);
        const nowIso = new Date().toISOString();
        this._writeCloudMeta({
          lastCloudRestoreAt: nowIso,
          lastAction: 'restore',
          cloudFileExists: true,
          cloudBackupFileId: fileId,
          cloudBackupDuplicateCount: Math.max(0, Number(fileInfo.duplicateCount || 0)),
          lastCloudErrorAt: '',
          lastCloudErrorMessage: '',
          cloudFileModifiedTime: (fileInfo && fileInfo.modifiedTime) ? fileInfo.modifiedTime : (this.gdriveCloudMeta && this.gdriveCloudMeta.cloudFileModifiedTime ? this.gdriveCloudMeta.cloudFileModifiedTime : '')
        });
        const duplicateText = fileInfo.duplicateCount ? `（已偵測到 ${fileInfo.duplicateCount} 個舊的重複備份檔，本次已使用最新修改的備份檔。）` : '';
        this.openInfoModal('回復成功', `已從雲端回復資料${duplicateText}，將重新整理以套用所有狀態。`);
        setTimeout(() => window.location.reload(), 600);
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
