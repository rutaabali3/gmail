/* ── State ─────────────────────────────────────────────── */
const API_BASE = '../api';
let sendingState = {};

/* ── Lightweight Toast & Notification Helpers ──────────── */
const toast = (typeof Swal !== 'undefined' && Swal.mixin) ? Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2500,
  timerProgressBar: true,
}) : {
  fire: (opts) => showNotification(opts?.title || opts?.text || '', opts?.icon || 'info')
};

function showNotification(msg, type = 'info') {
  if (typeof Swal !== 'undefined' && Swal.fire) {
    try {
      toast.fire({ icon: type, title: msg });
      return;
    } catch (_) {}
  }
  let box = document.getElementById('native-toast-box');
  if (!box) {
    box = document.createElement('div');
    box.id = 'native-toast-box';
    box.style.cssText = 'position:fixed;top:18px;right:18px;z-index:999999;display:flex;flex-direction:column;gap:8px;pointer-events:none;';
    document.body.appendChild(box);
  }
  const el = document.createElement('div');
  const color = type === 'success' ? '#10b981' : (type === 'error' ? '#f87171' : (type === 'warning' ? '#f59e0b' : '#6366f1'));
  const icon = type === 'success' ? 'check_circle' : (type === 'error' ? 'error' : (type === 'warning' ? 'warning' : 'info'));
  el.style.cssText = 'background:#1e293b;color:#f8fafc;border:1px solid #334155;border-radius:8px;padding:10px 16px;box-shadow:0 6px 18px rgba(0,0,0,0.35);font-size:13.5px;font-weight:500;display:flex;align-items:center;gap:8px;pointer-events:auto;transition:opacity 0.2s;';
  el.innerHTML = `<span class="material-symbols-outlined" style="color:${color};font-size:18px;">${icon}</span><span>${esc(msg)}</span>`;
  box.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 250);
  }, 2500);
}

/* ── Universal Native Confirm Dialog ────────────────────── */
function confirmDialog({ title = 'Confirm Action', text = 'Are you sure?', confirmText = 'Confirm', isDanger = true }) {
  const modal = $('#confirm-modal');
  if (!modal) return Promise.resolve(window.confirm(text));

  return new Promise((resolve) => {
    $('#confirm-modal-title').textContent = title;
    $('#confirm-modal-text').textContent = text;
    const confirmBtn = $('#confirm-modal-btn');
    const cancelBtn = $('#confirm-modal-cancel-btn');
    confirmBtn.textContent = confirmText;
    confirmBtn.className = isDanger ? 'btn btn-danger' : 'btn btn-primary';

    const cleanup = () => {
      modal.classList.remove('open');
      confirmBtn.removeEventListener('click', onConfirm);
      cancelBtn.removeEventListener('click', onCancel);
    };
    const onConfirm = () => { cleanup(); resolve(true); };
    const onCancel = () => { cleanup(); resolve(false); };

    confirmBtn.addEventListener('click', onConfirm);
    cancelBtn.addEventListener('click', onCancel);
    modal.classList.add('open');
  });
}

/* ── Throttled 60fps Scroll handler for top app bar ──────── */
let scrollTicking = false;
window.addEventListener('scroll', () => {
  if (!scrollTicking) {
    window.requestAnimationFrame(() => {
      const header = document.querySelector('.app-header');
      if (header) header.classList.toggle('scrolled', window.scrollY > 8);
      scrollTicking = false;
    });
    scrollTicking = true;
  }
}, { passive: true });

/* ── Navigation ────────────────────────────────────────── */
const screens = document.querySelectorAll('.screen');
const navBtns = document.querySelectorAll('.app-header nav button');

function showScreen(name) {
  screens.forEach(s => s.classList.remove('active'));
  const el = document.getElementById('screen-' + name);
  if (el) el.classList.add('active');
  navBtns.forEach(b => b.classList.toggle('active', b.dataset.screen === name));

  if (name === 'campaigns') loadCampaigns();
  if (name === 'contacts') loadContacts();
  if (name === 'templates') loadTemplates();
  if (name === 'settings') loadSmtpAccounts();
}

navBtns.forEach(btn => {
  btn.addEventListener('click', () => showScreen(btn.dataset.screen));
});

/* ── Fetch helpers ─────────────────────────────────────── */
async function api(method, path, body) {
  const opts = { method, headers: { 'Accept': 'application/json' } };
  if (body instanceof FormData) {
    opts.body = body;
  } else if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(API_BASE + path, opts);
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (_) {
    if (!res.ok) throw new Error(text || `Request failed with status ${res.status}`);
    return text;
  }
  if (!res.ok) {
    const errorMsg = data && (data.error || data.message) ? (data.error || data.message) : `Request failed with status ${res.status}`;
    throw new Error(errorMsg);
  }
  return data;
}

function $(sel, ctx) { return (ctx || document).querySelector(sel); }

/* ─────────────────────────────────────────────────────────
   ── CONTACTS
   ───────────────────────────────────────────────────────── */
let selectedContactIds = new Set();
let currentContactsList = [];

function updateContactSelectionUI() {
  const bulkActions = $('#contacts-bulk-actions');
  const selectedCountEl = $('#contacts-selected-count');
  const selectAllCb = $('#contacts-select-all');

  const count = selectedContactIds.size;
  if (selectedCountEl) {
    selectedCountEl.textContent = `${count} selected`;
  }

  if (bulkActions) {
    if (count > 0) {
      bulkActions.style.setProperty('display', 'inline-flex', 'important');
    } else {
      bulkActions.style.setProperty('display', 'none', 'important');
    }
  }

  if (selectAllCb) {
    const totalVisible = currentContactsList.length;
    if (totalVisible === 0 || count === 0) {
      selectAllCb.checked = false;
      selectAllCb.indeterminate = false;
    } else if (count >= totalVisible) {
      selectAllCb.checked = true;
      selectAllCb.indeterminate = false;
    } else {
      selectAllCb.checked = false;
      selectAllCb.indeterminate = true;
    }
  }
}

async function loadContacts() {
  const data = await api('GET', '/contacts.php?limit=500');
  const tbody = $('#contacts-tbody');
  tbody.innerHTML = '';
  currentContactsList = data.data || [];

  // Filter out any IDs that no longer exist
  const existingIds = new Set(currentContactsList.map(c => c.id));
  selectedContactIds = new Set([...selectedContactIds].filter(id => existingIds.has(id)));

  if (currentContactsList.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted" style="padding:24px;">No contacts found.</td></tr>';
  } else {
    currentContactsList.forEach(c => {
      const tr = document.createElement('tr');
      const isChecked = selectedContactIds.has(c.id);
      tr.innerHTML = `
        <td style="width:40px; text-align:center;">
          <input type="checkbox" class="contact-select-cb" data-id="${c.id}" ${isChecked ? 'checked' : ''} style="accent-color: var(--md-sys-color-primary, #6366f1); cursor: pointer; width: 16px; height: 16px;">
        </td>
        <td><strong>${esc(c.name || '—')}</strong></td>
        <td>${esc(c.email)}</td>
        <td><span class="badge badge-${c.status}">${c.status}</span></td>
        <td class="text-sm text-muted">${c.created_at || ''}</td>
        <td style="text-align:right;">
          <button class="btn btn-sm btn-danger" onclick="deleteContact(${c.id})">
            <span class="material-symbols-outlined" style="font-size:16px;">delete</span>
            Delete
          </button>
        </td>`;
      tbody.appendChild(tr);
    });
  }
  $('#contacts-count').textContent = currentContactsList.length + ' contacts';
  updateContactSelectionUI();
}

async function deleteContact(id) {
  const confirmed = await confirmDialog({
    title: 'Delete Contact?',
    text: 'This contact will be permanently removed.',
    confirmText: 'Delete',
    isDanger: true,
  });
  if (!confirmed) return;
  try {
    await api('DELETE', '/contacts.php?id=' + id);
    selectedContactIds.delete(id);
    showNotification('Contact deleted', 'success');
    loadContacts();
  } catch (err) {
    showNotification(err.message || 'Failed to delete contact', 'error');
  }
}

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim().replace(/^["']|["']$/g, '').trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^["']|["']$/g, '').trim());
  return result;
}

// CSV import
$('#csv-file').addEventListener('change', function(e) {
  const file = e.target.files[0];
  const labelEl = document.getElementById('csv-file-label');
  if (labelEl) {
    labelEl.textContent = file ? `Selected: ${file.name} (${formatBytes(file.size)})` : 'Click or drop a CSV or TXT file here';
  }
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    let text = ev.target.result || '';
    text = text.replace(/^\uFEFF/, ''); // Strip BOM
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) {
      showNotification('CSV must have a header row + data rows', 'error');
      return;
    }
    const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase());
    const nameIdx = headers.indexOf('name');
    const emailIdx = headers.indexOf('email');
    if (emailIdx === -1) {
      Swal.fire({ icon: 'error', title: 'Missing Column', text: 'CSV must have an "email" column' });
      return;
    }
    const contacts = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]);
      const email = cols[emailIdx];
      if (!email || !email.includes('@')) continue;
      contacts.push({ email, name: nameIdx >= 0 ? cols[nameIdx] : '' });
    }
    if (!contacts.length) {
      Swal.fire({ icon: 'error', title: 'No Contacts', text: 'No valid contacts found in CSV' });
      return;
    }
    $('#csv-preview').innerHTML = `<strong>${contacts.length}</strong> contacts parsed (showing first 10):<br>` +
      contacts.slice(0, 10).map(c => `${esc(c.email)} (${esc(c.name || 'no name')})`).join('<br>');
    $('#csv-preview').classList.remove('hidden');
    $('#csv-import-btn').classList.remove('hidden');
    $('#csv-import-btn').dataset.contacts = JSON.stringify(contacts);
  };
  reader.readAsText(file);
});

$('#csv-import-btn').addEventListener('click', async function() {
  const contacts = JSON.parse(this.dataset.contacts || '[]');
  let imported = 0, skipped = 0;
  for (const c of contacts) {
    try {
      await api('POST', '/contacts.php', c);
      imported++;
    } catch (_) { skipped++; }
  }
  toast.fire({ icon: 'success', title: `Imported ${imported} contacts${skipped ? ', ' + skipped + ' skipped' : ''}` });
  $('#csv-preview').classList.add('hidden');
  this.classList.add('hidden');
  $('#csv-file').value = '';
  loadContacts();
});

// Add single contact
$('#contact-add-btn').addEventListener('click', async () => {
  const email = $('#contact-email').value.trim();
  const name = $('#contact-name').value.trim();
  if (!email) {
    Swal.fire({ icon: 'error', title: 'Validation', text: 'Email is required' });
    return;
  }
  await api('POST', '/contacts.php', { email, name });
  toast.fire({ icon: 'success', title: 'Contact added' });
  $('#contact-email').value = '';
  $('#contact-name').value = '';
  loadContacts();
});

// Bulk selection and deletion listeners
$('#contacts-select-all')?.addEventListener('change', (e) => {
  const checked = e.target.checked;
  if (checked) {
    currentContactsList.forEach(c => selectedContactIds.add(c.id));
  } else {
    selectedContactIds.clear();
  }
  document.querySelectorAll('.contact-select-cb').forEach(cb => {
    cb.checked = checked;
  });
  updateContactSelectionUI();
});

$('#contacts-tbody')?.addEventListener('change', (e) => {
  if (e.target && e.target.classList.contains('contact-select-cb')) {
    const id = parseInt(e.target.dataset.id, 10);
    if (e.target.checked) {
      selectedContactIds.add(id);
    } else {
      selectedContactIds.delete(id);
    }
    updateContactSelectionUI();
  }
});

$('#contacts-bulk-delete-btn')?.addEventListener('click', async () => {
  const count = selectedContactIds.size;
  if (count === 0) return;

  const confirmed = await confirmDialog({
    title: `Delete ${count} Contact${count > 1 ? 's' : ''}?`,
    text: `Are you sure you want to permanently delete ${count} selected contact${count > 1 ? 's' : ''}? This action cannot be undone.`,
    confirmText: `Delete (${count})`,
    isDanger: true,
  });
  if (!confirmed) return;

  try {
    const res = await api('DELETE', '/contacts.php', { ids: Array.from(selectedContactIds) });
    const deletedCount = res && res.deleted !== undefined ? res.deleted : count;
    showNotification(`${deletedCount} contact(s) deleted`, 'success');
    selectedContactIds.clear();
    loadContacts();
  } catch (err) {
    showNotification(err.message || 'Failed to delete contacts', 'error');
  }
});

/* ─────────────────────────────────────────────────────────
   ── TEMPLATES
   ───────────────────────────────────────────────────────── */
async function loadTemplates() {
  const data = await api('GET', '/templates.php');
  const container = $('#templates-list');
  container.innerHTML = '';
  (data || []).forEach(t => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h3>${esc(t.name)}</h3>
      <p>Subject: ${esc(t.subject)}</p>
      <p class="text-sm text-muted">Created: ${t.created_at || ''}</p>
      <div class="flex gap-8 mt-8 border-top-subtle" style="padding-top:12px;">
        <button class="btn btn-sm btn-outline-primary" onclick="editTemplate(${t.id})">
          <span class="material-symbols-outlined" style="font-size:16px;">edit</span> Edit
        </button>
        <button class="btn btn-sm btn-danger" onclick="deleteTemplate(${t.id})">
          <span class="material-symbols-outlined" style="font-size:16px;">delete</span> Delete
        </button>
      </div>`;
    container.appendChild(card);
  });
}

async function deleteTemplate(id) {
  const confirmed = await confirmDialog({
    title: 'Delete Template?',
    text: 'This template will be permanently removed.',
    confirmText: 'Delete',
    isDanger: true,
  });
  if (!confirmed) return;
  await api('DELETE', '/templates.php?id=' + id);
  showNotification('Template deleted', 'success');
  loadTemplates();
}

async function editTemplate(id) {
  try {
    const data = await api('GET', '/templates.php?id=' + id);
    openTemplateModal(data);
  } catch (err) {
    showNotification(err.message || 'Failed to load template', 'error');
  }
}

$('#template-new-btn').addEventListener('click', () => openTemplateModal());

async function openTemplateModal(tpl = null) {
  const isEdit = !!tpl;
  $('#template-modal-title').textContent = isEdit ? 'Edit Template' : 'New Template';
  $('#template-id').value = isEdit ? tpl.id : '';
  $('#template-name').value = isEdit ? (tpl.name || '') : '';
  $('#template-subject').value = isEdit ? (tpl.subject || '') : '';
  $('#template-body').value = isEdit ? (tpl.body_html || '') : '';
  
  const previewBox = $('#template-preview-box');
  if (previewBox) {
    previewBox.classList.add('hidden');
    previewBox.innerHTML = '';
  }

  refreshAssetPicker();
  $('#template-modal').classList.add('open');
  setTimeout(() => $('#template-name').focus(), 50);
}

async function refreshAssetPicker() {
  const select = $('#template-asset-picker');
  if (!select) return;
  select.innerHTML = '<option value="">Select an asset to insert into HTML...</option>';
  try {
    const assets = await api('GET', '/assets.php') || [];
    assets.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.url;
      opt.textContent = `${a.label} (${a.type})`;
      opt.dataset.type = a.type;
      select.appendChild(opt);
    });
  } catch (_) {}
}

const assetSelect = $('#template-asset-picker');
if (assetSelect) {
  assetSelect.addEventListener('change', function() {
    const url = this.value;
    if (!url) return;
    const opt = this.options[this.selectedIndex];
    const type = opt ? (opt.dataset.type || 'logo') : 'logo';
    const bodyTextarea = $('#template-body');
    const imgTag = `<img src="${esc(url)}" alt="" style="max-width:100%;height:auto;display:block;margin:16px 0;" />`;
    if (type === 'footer') {
      bodyTextarea.value += '\n' + imgTag;
    } else {
      bodyTextarea.value = imgTag + '\n' + bodyTextarea.value;
    }
    this.value = '';
    showNotification('Asset inserted into template body', 'info');
  });
}

const tplPreviewToggleBtn = $('#template-preview-toggle-btn');
if (tplPreviewToggleBtn) {
  tplPreviewToggleBtn.addEventListener('click', () => {
    const previewBox = $('#template-preview-box');
    const bodyTextarea = $('#template-body');
    if (!previewBox || !bodyTextarea) return;
    previewBox.classList.toggle('hidden');
    if (!previewBox.classList.contains('hidden')) {
      previewBox.innerHTML = bodyTextarea.value || '<p class="text-muted" style="margin:0;">(Empty body)</p>';
    }
  });
}

$('#template-save-btn').addEventListener('click', async () => {
  const id = $('#template-id').value;
  const name = $('#template-name').value.trim();
  const subject = $('#template-subject').value.trim();
  const body_html = $('#template-body').value;

  if (!name) {
    showNotification('Template name is required', 'error');
    $('#template-name').focus();
    return;
  }
  if (!subject) {
    showNotification('Subject line is required', 'error');
    $('#template-subject').focus();
    return;
  }

  const payload = { name, subject, body_html };
  try {
    if (id) {
      await api('PUT', '/templates.php?id=' + id, payload);
      showNotification('Template updated', 'success');
    } else {
      await api('POST', '/templates.php', payload);
      showNotification('Template created', 'success');
    }
    closeModal();
    loadTemplates();
  } catch (err) {
    showNotification(err.message || 'Failed to save template', 'error');
  }
});

/* ─────────────────────────────────────────────────────────
   ── SETTINGS (SMTP)
   ───────────────────────────────────────────────────────── */
async function loadSmtpAccounts() {
  const data = await api('GET', '/smtp.php');
  const tbody = $('#smtp-tbody');
  tbody.innerHTML = '';
  if (!data || !data.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No SMTP accounts configured yet. Tap Add Account.</td></tr>';
    return;
  }
  (data || []).forEach(a => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${esc(a.label)}</strong></td>
      <td>${esc(a.email)}</td>
      <td>${a.daily_limit}</td>
      <td>${a.created_at || ''}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary me-1" onclick="editSmtp(${a.id})">
          <span class="material-symbols-outlined" style="font-size:16px;">edit</span> Edit
        </button>
        <button class="btn btn-sm btn-danger" onclick="deleteSmtp(${a.id})">
          <span class="material-symbols-outlined" style="font-size:16px;">delete</span> Delete
        </button>
      </td>`;
    tbody.appendChild(tr);
  });
}

async function editSmtp(id) {
  try {
    const a = await api('GET', '/smtp.php?id=' + id);
    openSmtpModal(a);
  } catch (e) {
    showNotification(e.message || 'Failed to load SMTP account', 'error');
  }
}

async function deleteSmtp(id) {
  const confirmed = await confirmDialog({
    title: 'Delete SMTP Account?',
    text: 'This SMTP account will be permanently removed.',
    confirmText: 'Delete',
    isDanger: true,
  });
  if (!confirmed) return;
  await api('DELETE', '/smtp.php?id=' + id);
  showNotification('SMTP account deleted', 'success');
  loadSmtpAccounts();
}

$('#smtp-new-btn').addEventListener('click', () => openSmtpModal());

function openSmtpModal(account = null) {
  const isEdit = !!account;
  $('#smtp-modal-title').textContent = isEdit ? 'Edit SMTP Account' : 'Add SMTP Account';
  $('#smtp-id').value = isEdit ? account.id : '';
  $('#smtp-label').value = isEdit ? (account.label || '') : '';
  $('#smtp-email').value = isEdit ? (account.email || '') : '';
  $('#smtp-password').value = '';
  $('#smtp-password').placeholder = isEdit ? '•••••••••••• (Leave blank to keep)' : '16-character App Password';
  const pwdLabel = $('#smtp-password-label');
  if (pwdLabel) {
    pwdLabel.textContent = isEdit ? 'App Password (leave blank to keep current)' : 'App Password';
  }
  $('#smtp-limit').value = isEdit ? (account.daily_limit || 400) : 400;

  $('#smtp-modal').classList.add('open');
  setTimeout(() => $('#smtp-label').focus(), 50);
}

$('#smtp-save-btn').addEventListener('click', async () => {
  const id = $('#smtp-id').value;
  const label = $('#smtp-label').value.trim();
  const email = $('#smtp-email').value.trim();
  const app_password = $('#smtp-password').value.trim();
  const daily_limit = parseInt($('#smtp-limit').value) || 400;

  if (!label) {
    showNotification('Account label is required', 'error');
    $('#smtp-label').focus();
    return;
  }
  if (!email || !email.includes('@')) {
    showNotification('Valid email address is required', 'error');
    $('#smtp-email').focus();
    return;
  }
  if (!id && !app_password) {
    showNotification('App password is required for new accounts', 'error');
    $('#smtp-password').focus();
    return;
  }

  const payload = { label, email, daily_limit };
  if (app_password) payload.app_password = app_password;

  try {
    if (id) {
      await api('PUT', '/smtp.php?id=' + id, payload);
      showNotification('SMTP account updated', 'success');
    } else {
      await api('POST', '/smtp.php', payload);
      showNotification('SMTP account added', 'success');
    }
    closeModal();
    loadSmtpAccounts();
  } catch (err) {
    showNotification(err.message || 'Failed to save SMTP account', 'error');
  }
});

/* ─────────────────────────────────────────────────────────
   ── CAMPAIGNS
   ───────────────────────────────────────────────────────── */
async function loadCampaigns() {
  const data = await api('GET', '/campaigns.php');
  const container = $('#campaigns-list');
  container.innerHTML = '';
  if (!data || !data.length) {
    container.innerHTML = '<p class="text-muted">No campaigns yet. Tap + to create one.</p>';
    return;
  }
  (data || []).forEach(c => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="flex justify-between items-center">
        <div>
          <h3>${esc(c.name)}</h3>
          <p class="text-sm text-muted">${c.template_name ? 'Template: ' + esc(c.template_name) : 'No template'}</p>
          <p class="text-sm text-muted">${c.smtp_label ? 'SMTP: ' + esc(c.smtp_label) : 'No SMTP'}</p>
        </div>
        <span class="badge badge-${c.status}">${c.status}</span>
      </div>
      <div class="flex gap-8 mt-8 border-top-subtle" style="padding-top:12px;">
        <button class="btn btn-sm btn-primary" onclick="openCampaign(${c.id})">
          <span class="material-symbols-outlined" style="font-size:16px;">tune</span> Manage
        </button>
        <button class="btn btn-sm btn-danger" onclick="deleteCampaign(${c.id})">
          <span class="material-symbols-outlined" style="font-size:16px;">delete</span> Delete
        </button>
      </div>`;
    container.appendChild(card);
  });
}

async function deleteCampaign(id) {
  const confirmed = await confirmDialog({
    title: 'Delete Campaign?',
    text: 'This campaign and all its recipients will be permanently removed.',
    confirmText: 'Delete',
    isDanger: true,
  });
  if (!confirmed) return;
  await api('DELETE', '/campaigns.php?id=' + id);
  showNotification('Campaign deleted', 'success');
  loadCampaigns();
}

function openCampaignModal() {
  const modal = $('#campaign-modal');
  const input = $('#campaign-name-input');
  if (input) input.value = '';
  if (modal) {
    modal.classList.add('open');
    setTimeout(() => { if (input) input.focus(); }, 50);
  }
}

// Create campaign (via FAB or New Campaign button)
const fabBtn = $('#campaign-create-btn');
if (fabBtn) fabBtn.addEventListener('click', openCampaignModal);

const newCampaignBtn = $('#campaign-new-btn');
if (newCampaignBtn) newCampaignBtn.addEventListener('click', openCampaignModal);

const saveCampaignBtn = $('#campaign-create-save-btn');
if (saveCampaignBtn) {
  saveCampaignBtn.addEventListener('click', async () => {
    const input = $('#campaign-name-input');
    const name = input ? input.value.trim() : '';
    if (!name) {
      showNotification('Campaign name is required', 'error');
      if (input) input.focus();
      return;
    }
    try {
      const result = await api('POST', '/campaigns.php', { name });
      showNotification('Campaign created', 'success');
      closeModal();
      openCampaign(result.id);
    } catch (err) {
      showNotification(err.message || 'Failed to create campaign', 'error');
    }
  });
}

const campaignNameInput = $('#campaign-name-input');
if (campaignNameInput) {
  campaignNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const saveBtn = $('#campaign-create-save-btn');
      if (saveBtn) saveBtn.click();
    }
  });
}

async function openCampaign(id) {
  const [campaign, templates, smtpAccounts] = await Promise.all([
    api('GET', '/campaigns.php?id=' + id),
    api('GET', '/templates.php'),
    api('GET', '/smtp.php'),
  ]);
  if (campaign.error) {
    Swal.fire({ icon: 'error', title: 'Error', text: campaign.error });
    return;
  }

  $('#campaign-detail').classList.remove('hidden');
  $('#campaign-manage-id').value = id;
  $('#campaign-detail-name').textContent = campaign.name;
  $('#campaign-status-badge').textContent = campaign.status;
  $('#campaign-status-badge').className = 'badge badge-' + campaign.status;
  $('#campaign-delay').value = campaign.delay_ms || 1500;

  const tplSelect = $('#campaign-template');
  tplSelect.innerHTML = '<option value=""> </option>';
  (templates || []).forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = t.name;
    if (campaign.template_id == t.id) opt.selected = true;
    tplSelect.appendChild(opt);
  });

  const smtpSelect = $('#campaign-smtp');
  smtpSelect.innerHTML = '<option value=""> </option>';
  (smtpAccounts || []).forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = `${s.label} (${s.email})`;
    if (campaign.smtp_account_id == s.id) opt.selected = true;
    smtpSelect.appendChild(opt);
  });

  renderAttachments(campaign.attachments || []);

  const counts = campaign.counts || { total: 0, pending: 0, sent: 0, failed: 0, skipped: 0 };
  $('#campaign-count-total').textContent = counts.total;
  $('#campaign-count-pending').textContent = counts.pending;
  $('#campaign-count-sent').textContent = counts.sent;
  $('#campaign-count-failed').textContent = counts.failed;
  $('#campaign-count-skipped').textContent = counts.skipped;

  if (counts.total > 0) {
    const pct = Math.round(((counts.sent + counts.failed + counts.skipped) / counts.total) * 100);
    $('#campaign-progress').style.width = pct + '%';
  } else {
    $('#campaign-progress').style.width = '0%';
  }

  $('#campaign-log').innerHTML = '';

  const isSending = campaign.status === 'sending';
  const isPaused = campaign.status === 'paused';
  const isDone = campaign.status === 'done';
  $('#campaign-start-btn').classList.toggle('hidden', isSending || isDone);
  $('#campaign-pause-btn').classList.toggle('hidden', !isSending);
  $('#campaign-stop-btn').classList.toggle('hidden', !isSending && !isPaused);
  $('#campaign-save-config-btn').classList.remove('hidden');

  showScreen('campaign-detail-screen');
}

$('#campaign-save-config-btn').addEventListener('click', async () => {
  const id = $('#campaign-manage-id').value;
  const data = {
    template_id: $('#campaign-template').value || null,
    smtp_account_id: $('#campaign-smtp').value || null,
    delay_ms: parseInt($('#campaign-delay').value) || 1500,
  };
  await api('PUT', '/campaigns.php?id=' + id, data);
  toast.fire({ icon: 'success', title: 'Campaign config saved' });
  openCampaign(id);
});

$('#campaign-back-btn').addEventListener('click', () => {
  $('#campaign-detail').classList.add('hidden');
  showScreen('campaigns');
});

/* ── Attachments ────────────────────────────────────── */
function renderAttachments(attachments) {
  const container = $('#attachment-list');
  container.innerHTML = '';
  (attachments || []).forEach(a => {
    const div = document.createElement('div');
    div.className = 'attachment-item';
    div.innerHTML = `
      <span>${esc(a.original_filename)} (${formatBytes(a.size_bytes)})</span>
      <span class="remove-att" onclick="removeAttachment(${a.id})">&times;</span>`;
    container.appendChild(div);
  });
}

async function removeAttachment(id) {
  const confirmed = await confirmDialog({
    title: 'Remove attachment?',
    text: 'This file will be detached from the campaign.',
    confirmText: 'Remove',
    isDanger: true,
  });
  if (!confirmed) return;
  await api('DELETE', '/campaign_attachments.php?id=' + id);
  showNotification('Attachment removed', 'info');
  const campaignId = $('#campaign-manage-id').value;
  openCampaign(campaignId);
}

$('#attachment-upload-btn').addEventListener('click', async () => {
  const fileInput = $('#attachment-file');
  const files = fileInput.files;
  if (!files.length) {
    Swal.fire({ icon: 'error', title: 'No files', text: 'Select files to upload first' });
    return;
  }
  const campaignId = $('#campaign-manage-id').value;
  let uploaded = 0;
  for (const file of files) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'attachment');
    formData.append('campaign_id', campaignId);
    try {
      await api('POST', '/upload.php', formData);
      uploaded++;
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Upload failed', text: e.message });
    }
  }
  if (uploaded > 0) {
    toast.fire({ icon: 'success', title: `${uploaded} attachment(s) uploaded` });
  }
  fileInput.value = '';
  openCampaign(campaignId);
});

/* ── Sending Loop ───────────────────────────────────── */
$('#campaign-start-btn').addEventListener('click', async () => {
  const id = $('#campaign-manage-id').value;
  const campaign = await api('GET', '/campaigns.php?id=' + id);
  if (!campaign.template_id) {
    Swal.fire({ icon: 'error', title: 'Configuration', text: 'Select a template first' });
    return;
  }
  if (!campaign.smtp_account_id) {
    Swal.fire({ icon: 'error', title: 'Configuration', text: 'Select an SMTP account first' });
    return;
  }

  const pendingCount = (campaign.counts || {}).pending || 0;
  if (pendingCount === 0) {
    Swal.fire({
      icon: 'warning',
      title: 'No Pending Recipients',
      text: 'There are no pending recipients in this campaign. Add active contacts first or click "Save Config" to sync newly added contacts.'
    });
    return;
  }

  if (pendingCount > 50) {
    const confirmed = await confirmDialog({
      title: 'Start Sending Campaign?',
      text: `This will send emails to ${pendingCount} recipients. Do you want to continue?`,
      confirmText: 'Start Sending',
      isDanger: false,
    });
    if (!confirmed) return;
  }

  await api('PUT', '/campaigns.php?id=' + id, { status: 'sending' });
  startSendingLoop(id);
});

$('#campaign-pause-btn').addEventListener('click', async () => {
  const id = $('#campaign-manage-id').value;
  await api('PUT', '/campaigns.php?id=' + id, { status: 'paused' });
  if (sendingState[id]) sendingState[id].stopRequested = true;
  openCampaign(id);
});

$('#campaign-stop-btn').addEventListener('click', async () => {
  const id = $('#campaign-manage-id').value;
  const confirmed = await confirmDialog({
    title: 'Stop Campaign?',
    text: 'Unsent recipients will remain pending. Do you want to stop?',
    confirmText: 'Stop Campaign',
    isDanger: true,
  });
  if (!confirmed) return;
  await api('PUT', '/campaigns.php?id=' + id, { status: 'draft' });
  if (sendingState[id]) sendingState[id].stopRequested = true;
  openCampaign(id);
});

async function startSendingLoop(campaignId) {
  const logEl = $('#campaign-log');
  const progEl = $('#campaign-progress');

  sendingState[campaignId] = {
    running: true,
    stopRequested: false,
  };

  let consecutiveFails = 0;

  const loop = async () => {
    if (sendingState[campaignId].stopRequested) {
      sendingState[campaignId].running = false;
      return;
    }

    const campaign = await api('GET', '/campaigns.php?id=' + campaignId);
    if (campaign.status !== 'sending') {
      sendingState[campaignId].running = false;
      return;
    }

    const counts = campaign.counts || {};
    if (counts.total > 0 && counts.pending === 0) {
      logEl.innerHTML +=
        '<div class="log-entry log-sent">All recipients processed. Campaign complete.</div>';
      logEl.scrollTop = logEl.scrollHeight;
      await api('PUT', '/campaigns.php?id=' + campaignId, { status: 'done' });
      sendingState[campaignId].running = false;
      openCampaign(campaignId);
      return;
    }

    let pendingRecipients = [];
    try {
      pendingRecipients = await api('GET',
        `/campaign_recipients.php?campaign_id=${campaignId}&status=pending&limit=1`);
    } catch (_) {}

    if (!pendingRecipients || !pendingRecipients.length) {
      const updatedCampaign = await api('GET', '/campaigns.php?id=' + campaignId);
      if ((updatedCampaign.counts || {}).total > 0 && (updatedCampaign.counts || {}).pending === 0) {
        logEl.innerHTML +=
          '<div class="log-entry log-sent">All done!</div>';
        logEl.scrollTop = logEl.scrollHeight;
        await api('PUT', '/campaigns.php?id=' + campaignId, { status: 'done' });
      }
      sendingState[campaignId].running = false;
      openCampaign(campaignId);
      return;
    }

    const recipient = pendingRecipients[0];
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';

    try {
      const result = await api('POST', '/send.php', {
        campaign_recipient_id: recipient.id,
      });

      if (result.success) {
        logEntry.classList.add('log-sent');
        logEntry.textContent = `[${recipient.id}] ${recipient.contact_email} — Sent`;
        consecutiveFails = 0;
      } else {
        logEntry.classList.add('log-failed');
        logEntry.textContent = `[${recipient.id}] ${recipient.contact_email} — ${result.error || 'Failed'}`;
        consecutiveFails++;

        if (result.error && result.error.includes('Daily limit reached')) {
          logEl.appendChild(logEntry);
          logEl.innerHTML += '<div class="log-entry log-failed"><strong>Daily limit reached. Pausing campaign.</strong></div>';
          logEl.scrollTop = logEl.scrollHeight;
          await api('PUT', '/campaigns.php?id=' + campaignId, { status: 'paused' });
          sendingState[campaignId].running = false;
          openCampaign(campaignId);
          Swal.fire({ icon: 'warning', title: 'Daily Limit', text: 'Daily limit reached for this SMTP account. Campaign paused.' });
          return;
        }

        if (result.paused) {
          sendingState[campaignId].stopRequested = true;
        }
      }
    } catch (e) {
      logEntry.classList.add('log-failed');
      logEntry.textContent = `[${recipient.id}] ${recipient.contact_email} — Error: ${e.message}`;
      consecutiveFails++;
    }

    logEl.appendChild(logEntry);
    logEl.scrollTop = logEl.scrollHeight;

    if (consecutiveFails >= 5) {
      logEl.innerHTML += '<div class="log-entry log-failed"><strong>Paused: 5 consecutive failures. Please check SMTP settings.</strong></div>';
      logEl.scrollTop = logEl.scrollHeight;
      await api('PUT', '/campaigns.php?id=' + campaignId, { status: 'paused' });
      sendingState[campaignId].running = false;
      openCampaign(campaignId);
      Swal.fire({ icon: 'error', title: 'Auto-Paused', text: 'Campaign paused after 5 consecutive failures. Check SMTP settings.' });
      return;
    }

    const updated = await api('GET', '/campaigns.php?id=' + campaignId);
    const c = updated.counts || {};
    const total = c.total || 1;
    const done = (c.sent || 0) + (c.failed || 0) + (c.skipped || 0);
    const pct = Math.round((done / total) * 100);
    progEl.style.width = pct + '%';

    $('#campaign-count-pending').textContent = c.pending || 0;
    $('#campaign-count-sent').textContent = c.sent || 0;
    $('#campaign-count-failed').textContent = c.failed || 0;
    $('#campaign-count-skipped').textContent = c.skipped || 0;

    const delayMs = campaign.delay_ms || 1500;
    await new Promise(r => setTimeout(r, delayMs));

    loop();
  };

  loop();
}

/* ─────────────────────────────────────────────────────────
   ── UTILITY
   ───────────────────────────────────────────────────────── */
function esc(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function closeModal() {
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
}

document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', function(e) {
    if (e.target === this) closeModal();
  });
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

/* ── Theme Switcher ─────────────────────────────────────── */
const themeToggleBtn = $('#theme-toggle-btn');
function initTheme() {
  const savedTheme = localStorage.getItem('app-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
}
function updateThemeIcon(theme) {
  if (!themeToggleBtn) return;
  const icon = themeToggleBtn.querySelector('.theme-icon');
  if (icon) icon.textContent = theme === 'light' ? 'dark_mode' : 'light_mode';
  themeToggleBtn.setAttribute('title', theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode');
}
if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('app-theme', next);
    updateThemeIcon(next);
  });
}
initTheme();

/* ─────────────────────────────────────────────────────────
   ── INIT
   ───────────────────────────────────────────────────────── */
showScreen('campaigns');

const templateModal = $('#template-modal');
if (templateModal) {
  const observer = new MutationObserver(() => {
    if (templateModal.classList.contains('open')) refreshAssetPicker();
  });
  observer.observe(templateModal, { attributes: true, attributeFilter: ['class'] });
}
