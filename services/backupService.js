(function(window) {
  'use strict';
  let __gdriveTokenClient = null;
  let __gdriveTokenClientCid = null;
  const __GDRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
  window.StockBackupService = {
            confirmExport() { const dataStr = JSON.stringify(window.StockStorage.buildBackupPayload(this)); const blob = new Blob([dataStr], {type: "application/json"}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${this.exportFileName || 'backup'}.json`; a.click(); URL.revokeObjectURL(url); this.showExportModal = false; },
    
            onRestoreBackupFileChange(e) { const file = e?.target?.files?.[0]; if (!file) return; this.restoreFileName = file.name || ''; this.restoreFileObject = file; },
    
            _applyBackupPayload(payload) { window.StockStorage.applyBackupPayload(payload, this); try { this.recomputeAllTradesAndValidate(); } catch (_) {} },
    
            _readCloudMeta() { try { return JSON.parse(localStorage.getItem(window.StockStorage.KEYS.cloudMeta) || '{}') || {}; } catch(e) { return {}; } },
    
            _writeCloudMeta(patch) { const cur = this._readCloudMeta(); const next = Object.assign({}, cur, patch || {}); localStorage.setItem(window.StockStorage.KEYS.cloudMeta, JSON.stringify(next)); this.gdriveCloudMeta = next; },
    
            async refreshGDriveCloudMeta() { this.gdriveBusy = true; this.gdriveBusyText = '正在取得雲端狀態…'; try { const accessToken = await this._ensureGDriveAccessToken(); const info = await this._findBackupFileId(accessToken); if (!info) { this._writeCloudMeta({ cloudFileModifiedTime: '', cloudFileExists: false }); this.openInfoModal('雲端狀態', '雲端目前沒有找到備份檔（tw_stock_backup.json）。'); return; } this._writeCloudMeta({ cloudFileExists: true, cloudFileModifiedTime: info.modifiedTime || '' }); this.openInfoModal('雲端狀態', '雲端最後修改時間。'); } catch(e) { this.openInfoModal('雲端狀態', `發生未預期錯誤：${e?.message || e}`); } finally { this.gdriveBusy = false; this.gdriveBusyText = ''; } },
    
            saveGDriveClientId() { const cid = (this.gdriveClientIdInput || '').trim(); if (!cid) { this.openInfoModal('提示', '請先輸入 Google OAuth Client ID。'); return; } localStorage.setItem(window.StockStorage.KEYS.gdriveClientId, cid); this.gdriveClientId = cid; this.openInfoModal('已儲存', 'Google OAuth Client ID 已儲存。'); },
    
            clearGDriveClientId() { localStorage.removeItem(window.StockStorage.KEYS.gdriveClientId); this.gdriveClientId = ''; this.gdriveClientIdInput = ''; this.openInfoModal('已清除', '已清除 Google OAuth Client ID。'); },
    
            async _ensureGDriveAccessToken() { const cid = (this.gdriveClientId || '').trim(); if (!cid) throw new Error('缺少 Google OAuth Client ID。'); if (!window.google || !google.accounts || !google.accounts.oauth2) { throw new Error('Google Identity Services 尚未載入，請稍後再試。'); } if (!__gdriveTokenClient || __gdriveTokenClientCid !== cid) { __gdriveTokenClient = google.accounts.oauth2.initTokenClient({ client_id: cid, scope: __GDRIVE_SCOPE, callback: () => {} }); __gdriveTokenClientCid = cid; } const token = await new Promise((resolve, reject) => { let finished = false; const timer = setTimeout(() => { if (finished) return; finished = true; reject(new Error('授權逾時。請確認已允許彈出視窗（Popup），並完成帳戶選擇／驗證後再試一次。')); }, 120000); __gdriveTokenClient.callback = (resp) => { if (finished) return; finished = true; clearTimeout(timer); if (resp && resp.access_token) resolve(resp.access_token); else reject(new Error(resp?.error_description || resp?.error || '授權失敗')); }; try { // ✅ 跟 888 一樣：不強制每次都 consent，避免反覆觸發 Google 的再次驗證流程
                        __gdriveTokenClient.requestAccessToken(); } catch (e) { if (finished) return; finished = true; clearTimeout(timer); reject(new Error('無法啟動授權流程。請允許彈出視窗（Popup）後再試一次。')); } }); return token; },
    
            async _findBackupFileId(accessToken) { const q = encodeURIComponent("name='tw_stock_backup.json' and 'appDataFolder' in parents and trashed=false"); const url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&fields=files(id,name,modifiedTime)&pageSize=1`; const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` }}); if (!res.ok) throw new Error(`Drive 查詢失敗（${res.status}）`); const j = await res.json(); return (j.files && j.files[0] && j.files[0].id) ? { id: j.files[0].id, modifiedTime: j.files[0].modifiedTime || '' } : null; },
    
            _buildBackupPayload() { return window.StockStorage.buildBackupPayload(this); },
    
            async uploadToGDrive() { this.gdriveBusy = true; this.gdriveBusyText = '正在授權／連線…'; try { const accessToken = await this._ensureGDriveAccessToken(); const payload = this._buildBackupPayload(); const fileInfo = await this._findBackupFileId(accessToken); const fileId = fileInfo && fileInfo.id ? fileInfo.id : null; const boundary = '-------314159265358979323846'; const metadata = fileId ? { name: 'tw_stock_backup.json' } : { name: 'tw_stock_backup.json', parents: ['appDataFolder'] }; const multipartBody = `--${boundary}\r\n` + `Content-Type: application/json; charset=UTF-8\r\n\r\n` + `${JSON.stringify(metadata)}\r\n` + `--${boundary}\r\n` + `Content-Type: application/json; charset=UTF-8\r\n\r\n` + `${JSON.stringify(payload)}\r\n` + `--${boundary}--`; const uploadUrl = fileId ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart&fields=id,modifiedTime` : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,modifiedTime`; const method = fileId ? 'PATCH' : 'POST'; const res = await fetch(uploadUrl, { method, headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': `multipart/related; boundary=${boundary}` }, body: multipartBody }); if (!res.ok) { const t = await res.text().catch(()=>''); throw new Error(`上傳失敗（${res.status}）${t ? '：' + t : ''}`); } let uploadInfo = null; try { uploadInfo = await res.json(); } catch(_) { uploadInfo = null; } const nowIso = new Date().toISOString(); this._writeCloudMeta({ lastCloudUploadAt: nowIso, lastAction: 'upload', cloudFileExists: true, cloudFileModifiedTime: (uploadInfo && uploadInfo.modifiedTime) ? uploadInfo.modifiedTime : (fileInfo && fileInfo.modifiedTime ? fileInfo.modifiedTime : '') }); this.openInfoModal('上傳成功', '已將資料備份到 Google 雲端。'); } catch (e) { this.openInfoModal('上傳失敗', `發生未預期錯誤：${e?.message || e}`); } finally { this.gdriveBusy = false; this.gdriveBusyText = ''; } },
    
            async restoreFromGDrive() { this.gdriveBusy = true; this.gdriveBusyText = '正在授權／下載備份…'; try { const accessToken = await this._ensureGDriveAccessToken(); const fileInfo = await this._findBackupFileId(accessToken); const fileId = fileInfo && fileInfo.id ? fileInfo.id : null; if (!fileId) { this.openInfoModal('回復失敗', '雲端找不到備份檔案（tw_stock_backup.json）。'); return; } const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`; const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` }}); if (!res.ok) throw new Error(`下載失敗（${res.status}）`); const payload = await res.json(); window.StockStorage.applyBackupPayload(payload, this); const nowIso = new Date().toISOString(); this._writeCloudMeta({ lastCloudRestoreAt: nowIso, lastAction: 'restore', cloudFileExists: true, cloudFileModifiedTime: (fileInfo && fileInfo.modifiedTime) ? fileInfo.modifiedTime : (this.gdriveCloudMeta && this.gdriveCloudMeta.cloudFileModifiedTime ? this.gdriveCloudMeta.cloudFileModifiedTime : '') }); this.openInfoModal('回復成功', '已從雲端回復資料，將重新整理以套用所有狀態。'); setTimeout(() => window.location.reload(), 600); } catch (e) { this.openInfoModal('回復失敗', `發生未預期錯誤：${e?.message || e}`); } finally { this.gdriveBusy = false; this.gdriveBusyText = ''; } },
                            addCategory() {
                const raw = String(this.newCategoryName || '').trim();
                if (!raw) return;
                if (!Array.isArray(this.categories)) this.categories = [];
                // Prevent duplicates by name
                if (this.categories.some(c => (c && String(c.name || '').trim()) === raw)) { this.newCategoryName = ''; return; }
                const id = 'cat_' + Date.now();
                this.categories.push({ id, name: raw, label: raw, shortLabel: raw });
                this.newCategoryName = '';
                localStorage.setItem(window.StockStorage.KEYS.categories, JSON.stringify(this.categories));
                // Auto select new category
                this.newTx.category = id;
            }
  };
})(window);
