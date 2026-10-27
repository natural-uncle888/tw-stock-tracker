/* 台股損益管理｜可重複使用的自訂對話框。只回傳使用者明確確認後的結果。 */
(function () {
  'use strict';
  let pending = Promise.resolve();
  let dialogCount = 0;

  function el(tag, cls, value) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (value !== undefined && value !== null) node.textContent = String(value);
    return node;
  }
  function icon(cls) {
    const item = el('i', `fa-solid ${cls}`);
    item.setAttribute('aria-hidden', 'true');
    return item;
  }
  function queue(options) {
    // One at a time: guarantees confirmation never belongs to the wrong operation.
    const next = pending.then(() => display(options));
    pending = next.then(() => undefined, () => undefined);
    return next;
  }
  function display(input) {
    const opt = input || {};
    const kind = opt.kind === 'prompt' ? 'prompt' : (opt.kind === 'alert' ? 'alert' : 'confirm');
    const variant = ['danger', 'warning', 'success', 'info'].includes(opt.variant) ? opt.variant : 'info';
    const id = ++dialogCount;

    return new Promise(resolve => {
      const prevFocus = document.activeElement;
      const prevBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const overlay = el('div', 'stock-dialog-overlay');
      const panel = el('section', 'stock-dialog-panel');
      panel.dataset.variant = variant;
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-modal', 'true');
      panel.setAttribute('aria-labelledby', `sd-title-${id}`);
      panel.setAttribute('aria-describedby', `sd-description-${id}`);
      panel.tabIndex = -1;
      const content = el('div', 'stock-dialog-content');

      let settled = false;
      function finish(value) {
        if (settled) return;
        settled = true;
        document.removeEventListener('keydown', onKeyDown, true);
        overlay.remove();
        document.body.style.overflow = prevBodyOverflow;
        if (prevFocus && prevFocus.isConnected && typeof prevFocus.focus === 'function') {
          try { prevFocus.focus({ preventScroll: true }); } catch (_) { prevFocus.focus(); }
        }
        resolve(value);
      }
      const heading = el('div', 'stock-dialog-heading');
      const bigIcon = el('div', 'stock-dialog-icon');
      const iconClasses = { danger: 'fa-triangle-exclamation', warning: 'fa-cloud-arrow-up', success: 'fa-circle-check', info: 'fa-circle-info' };
      bigIcon.append(icon(opt.icon || iconClasses[variant]));
      heading.append(bigIcon);
      const close = el('button', 'stock-dialog-exit');
      close.type = 'button';
      close.setAttribute('aria-label', '關閉視窗');
      close.append(icon('fa-xmark'));
      close.addEventListener('click', () => finish(kind === 'prompt' ? null : false));
      heading.append(close);
      content.append(heading);
      const label = el('div', 'stock-dialog-kicker');
      label.append(icon('fa-shield-halved'));
      label.append(document.createTextNode(String(opt.eyebrow || (kind === 'alert' ? '系統通知' : '操作確認'))));
      content.append(label);
      const title = el('h2', 'stock-dialog-title', opt.title || '請確認操作');
      title.id = `sd-title-${id}`;
      content.append(title);
      const description = el('p', 'stock-dialog-description', opt.description || '');
      description.id = `sd-description-${id}`;
      content.append(description);

      if (opt.account) {
        const account = el('div', 'stock-dialog-account');
        const accountIcon = el('div', 'stock-dialog-account-icon');
        const googleIcon = el('i', 'fa-brands fa-google');
        googleIcon.setAttribute('aria-hidden', 'true');
        accountIcon.append(googleIcon);
        account.append(accountIcon);
        const info = el('div');
        info.append(el('div', 'stock-dialog-account-caption', '目前授權的 Google 帳號'));
        info.append(el('div', 'stock-dialog-account-email', opt.account));
        account.append(info);
        content.append(account);
      }
      if (Array.isArray(opt.details) && opt.details.length) {
        const grid = el('div', 'stock-dialog-metrics');
        for (const detail of opt.details.slice(0, 8)) {
          const cell = el('div', 'stock-dialog-metric');
          cell.append(el('div', 'stock-dialog-metric-label', detail.label));
          cell.append(el('div', 'stock-dialog-metric-value', detail.value));
          grid.append(cell);
        }
        content.append(grid);
      }
      if (opt.note) {
        const note = el('div', 'stock-dialog-note');
        note.dataset.tone = ['danger', 'warning', 'info', 'success'].includes(opt.note.tone) ? opt.note.tone : 'warning';
        const noteIcon = el('div', 'stock-dialog-note-icon');
        noteIcon.append(icon(opt.note.tone === 'info' ? 'fa-circle-info' : 'fa-triangle-exclamation'));
        note.append(noteIcon);
        const noteText = el('div');
        noteText.append(el('p', 'stock-dialog-note-title', opt.note.title || '請注意'));
        noteText.append(el('p', 'stock-dialog-note-desc', opt.note.description || ''));
        note.append(noteText);
        content.append(note);
      }
      if (opt.tip) {
        const tip = el('p', 'stock-dialog-tip');
        tip.append(icon('fa-circle-info'));
        tip.append(document.createTextNode(String(opt.tip)));
        content.append(tip);
      }
      let field = null;
      let errorLabel = null;
      if (kind === 'prompt') {
        const fieldLabel = el('label', 'stock-dialog-input-label', opt.inputLabel || '新名稱');
        fieldLabel.htmlFor = `sd-input-${id}`;
        content.append(fieldLabel);
        field = el('input', 'stock-dialog-input');
        field.id = `sd-input-${id}`;
        field.type = 'text';
        field.value = String(opt.initialValue ?? '');
        field.placeholder = String(opt.placeholder || '請輸入名稱');
        field.maxLength = Number.isInteger(opt.maxLength) ? opt.maxLength : 120;
        field.autocomplete = 'off';
        content.append(field);
        errorLabel = el('div', 'stock-dialog-input-error');
        errorLabel.setAttribute('aria-live', 'polite');
        content.append(errorLabel);
      }
      panel.append(content);

      const footer = el('div', 'stock-dialog-footer');
      if (kind !== 'alert') {
        const cancelBtn = el('button', 'stock-dialog-btn stock-dialog-btn--secondary', opt.cancelText || '取消');
        cancelBtn.type = 'button';
        cancelBtn.addEventListener('click', () => finish(kind === 'prompt' ? null : false));
        footer.append(cancelBtn);
      }
      const okButton = el('button', 'stock-dialog-btn stock-dialog-btn--primary');
      okButton.type = 'button';
      okButton.append(icon(kind === 'alert' ? 'fa-check' : (kind === 'prompt' ? 'fa-floppy-disk' : 'fa-check')));
      okButton.append(document.createTextNode(String(opt.confirmText || (kind === 'alert' ? '我知道了' : '確認'))));
      okButton.addEventListener('click', () => {
        if (kind === 'prompt') {
          const value = field.value.trim();
          if (!value) { errorLabel.textContent = '名稱不可為空白'; field.focus(); return; }
          finish(value);
        } else finish(true);
      });
      footer.append(okButton);
      panel.append(footer);
      overlay.append(panel);
      document.body.append(overlay);

      // Escape cancels, Enter confirms. Trap Tab focus within the dialog.
      function onKeyDown(event) {
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); finish(kind === 'prompt' ? null : false); }
        else if (event.key === 'Enter' && (kind === 'prompt' || event.target === panel)) {
          event.preventDefault(); event.stopPropagation(); okButton.click();
        } else if (event.key === 'Tab') {
          const focusable = Array.from(panel.querySelectorAll('button:not([disabled]),input:not([disabled])'));
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
      }
      document.addEventListener('keydown', onKeyDown, true);
      setTimeout(() => (field || okButton).focus({ preventScroll: true }), 0);
    });
  }
  window.StockDialog = Object.freeze({
    confirm: (options = {}) => queue({ ...options, kind: 'confirm' }),
    prompt: (options = {}) => queue({ ...options, kind: 'prompt' }),
    alert: (options = {}) => queue({ ...options, kind: 'alert' })
  });
})();
