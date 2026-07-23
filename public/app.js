/* ── State ─────────────────────────────────────────────── */
const API_BASE = '../api';
let sendingState = {};

/* ── SweetAlert2 helpers ──────────────────────────────── */
const toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2500,
  timerProgressBar: true,
});

/* ── Scroll handler for top app bar elevation ─────────── */
let scrollHandler = () => {
  const header = document.querySelector('.app-header');
  if (!header) return;
  header.classList.toggle('scrolled', window.scrollY > 8);
};
document.addEventListener('scroll', scrollHandler, { passive: true });
scrollHandler();

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
  try { return JSON.parse(text); } catch (_) { throw new Error(text); }
}

function $(sel, ctx) { return (ctx || document).querySelector(sel); }

/* ─────────────────────────────────────────────────────────
   ── CONTACTS
   ───────────────────────────────────────────────────────── */
async function loadContacts() {
  const data = await api('GET', '/contacts.php?limit=500');
  const tbody = $('#contacts-tbody');
  tbody.innerHTML = '';
  (data.data || []).forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${esc(c.name)}</td>
      <td>${esc(c.email)}</td>
      <td><span class="badge badge-${c.status}">${c.status}</span></td>
      <td>${c.created_at || ''}</td>
      <td>
        <button class="btn btn-sm btn-danger" onclick="deleteContact(${c.id})">Delete</button>
      </td>`;
    tbody.appendChild(tr);
  });
  $('#contacts-count').textContent = (data.data || []).length + ' contacts';
}

async function deleteContact(id) {
  const { isConfirmed } = await Swal.fire({
    title: 'Delete contact?',
    text: 'This contact will be permanently removed.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Delete',
    confirmButtonColor: '#F2B8B5',
    cancelButtonText: 'Cancel',
  });
  if (!isConfirmed) return;
  await api('DELETE', '/contacts.php?id=' + id);
  loadContacts();
}

// CSV import
$('#csv-file').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    const text = ev.target.result;
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) {
      Swal.fire({ icon: 'error', title: 'Invalid CSV', text: 'CSV must have a header row + data rows' });
      return;
    }
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const nameIdx = headers.indexOf('name');
    const emailIdx = headers.indexOf('email');
    if (emailIdx === -1) {
      Swal.fire({ icon: 'error', title: 'Missing Column', text: 'CSV must have an "email" column' });
      return;
    }
    const contacts = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim());
      const email = cols[emailIdx];
      if (!email) continue;
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
      <div class="flex gap-8 mt-8">
        <button class="btn btn-sm" onclick="editTemplate(${t.id})">Edit</button>
        <button class="btn btn-sm btn-danger" onclick="deleteTemplate(${t.id})">Delete</button>
      </div>`;
    container.appendChild(card);
  });
}

async function deleteTemplate(id) {
  const { isConfirmed } = await Swal.fire({
    title: 'Delete template?',
    text: 'This template will be permanently removed.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Delete',
    confirmButtonColor: '#F2B8B5',
    cancelButtonText: 'Cancel',
  });
  if (!isConfirmed) return;
  await api('DELETE', '/templates.php?id=' + id);
  loadTemplates();
}

$('#template-save-btn').addEventListener('click', async () => {
  const id = $('#template-id').value;
  const data = {
    name: $('#template-name').value.trim(),
    subject: $('#template-subject').value.trim(),
    body_html: $('#template-body').value,
  };
  if (!data.name || !data.subject) {
    Swal.fire({ icon: 'error', title: 'Validation', text: 'Name and subject are required' });
    return;
  }
  if (id) {
    await api('PUT', '/templates.php?id=' + id, data);
  } else {
    await api('POST', '/templates.php', data);
  }
  toast.fire({ icon: 'success', title: 'Template saved' });
  closeModal();
  loadTemplates();
});

async function editTemplate(id) {
  const data = await api('GET', '/templates.php?id=' + id);
  openTemplateModal(data);
}

$('#template-new-btn').addEventListener('click', () => openTemplateModal());

function openTemplateModal(tpl) {
  $('#template-id').value = tpl ? tpl.id : '';
  $('#template-name').value = tpl ? tpl.name : '';
  $('#template-subject').value = tpl ? tpl.subject : '';
  $('#template-body').value = tpl ? tpl.body_html : '';
  $('#template-modal').classList.add('open');
}

// Asset picker: insert asset into body
async function refreshAssetPicker() {
  const select = $('#template-asset-picker');
  const prevVal = select.value;
  select.innerHTML = '<option value=""> </option>';
  try {
    const assets = await api('GET', '/assets.php');
    (assets || []).forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.url;
      opt.textContent = `${a.label} (${a.type})`;
      opt.dataset.type = a.type;
      select.appendChild(opt);
    });
    select.value = prevVal;
  } catch (_) {}
}

$('#template-asset-picker').addEventListener('change', function() {
  const url = this.value;
  if (!url) return;
  const opt = this.options[this.selectedIndex];
  const type = opt.dataset.type || 'logo';
  const textarea = $('#template-body');
  const imgTag = `<img src="${esc(url)}" alt="" style="max-width:100%;height:auto;display:block;margin:16px 0;" />`;
  if (type === 'footer') {
    textarea.value += '\n' + imgTag;
  } else {
    textarea.value = imgTag + '\n' + textarea.value;
  }
  this.value = '';
});

/* ─────────────────────────────────────────────────────────
   ── SETTINGS (SMTP)
   ───────────────────────────────────────────────────────── */
async function loadSmtpAccounts() {
  const data = await api('GET', '/smtp.php');
  const tbody = $('#smtp-tbody');
  tbody.innerHTML = '';
  (data || []).forEach(a => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${esc(a.label)}</td>
      <td>${esc(a.email)}</td>
      <td>${a.daily_limit}</td>
      <td>${a.created_at || ''}</td>
      <td>
        <button class="btn btn-sm btn-danger" onclick="deleteSmtp(${a.id})">Delete</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

async function deleteSmtp(id) {
  const { isConfirmed } = await Swal.fire({
    title: 'Delete SMTP account?',
    text: 'This SMTP account will be permanently removed.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Delete',
    confirmButtonColor: '#F2B8B5',
    cancelButtonText: 'Cancel',
  });
  if (!isConfirmed) return;
  await api('DELETE', '/smtp.php?id=' + id);
  loadSmtpAccounts();
}

$('#smtp-save-btn').addEventListener('click', async () => {
  const data = {
    label: $('#smtp-label').value.trim(),
    email: $('#smtp-email').value.trim(),
    app_password: $('#smtp-password').value.trim(),
    daily_limit: parseInt($('#smtp-limit').value) || 400,
  };
  if (!data.label || !data.email || !data.app_password) {
    Swal.fire({ icon: 'error', title: 'Validation', text: 'Label, email, and app password are required' });
    return;
  }
  await api('POST', '/smtp.php', data);
  toast.fire({ icon: 'success', title: 'SMTP account added' });
  closeModal();
  loadSmtpAccounts();
});

$('#smtp-new-btn').addEventListener('click', () => {
  $('#smtp-modal').classList.add('open');
  $('#smtp-label').value = '';
  $('#smtp-email').value = '';
  $('#smtp-password').value = '';
  $('#smtp-limit').value = '400';
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
      <div class="flex gap-8 mt-8">
        <button class="btn btn-sm" onclick="openCampaign(${c.id})">Manage</button>
        <button class="btn btn-sm btn-danger" onclick="deleteCampaign(${c.id})">Delete</button>
      </div>`;
    container.appendChild(card);
  });
}

async function deleteCampaign(id) {
  const { isConfirmed } = await Swal.fire({
    title: 'Delete campaign?',
    text: 'This campaign and all its data will be permanently removed.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Delete',
    confirmButtonColor: '#F2B8B5',
    cancelButtonText: 'Cancel',
  });
  if (!isConfirmed) return;
  await api('DELETE', '/campaigns.php?id=' + id);
  loadCampaigns();
}

// Create campaign (via FAB)
$('#campaign-create-btn').addEventListener('click', async () => {
  const { value: name, isConfirmed } = await Swal.fire({
    title: 'New Campaign',
    input: 'text',
    inputLabel: 'Campaign name',
    inputPlaceholder: 'My Campaign',
    showCancelButton: true,
    confirmButtonText: 'Create',
    cancelButtonText: 'Cancel',
    inputValidator: (value) => !value?.trim() ? 'Campaign name required' : null,
  });
  if (!isConfirmed || !name) return;
  const result = await api('POST', '/campaigns.php', { name: name.trim() });
  toast.fire({ icon: 'success', title: 'Campaign created' });
  openCampaign(result.id);
});

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
  const { isConfirmed } = await Swal.fire({
    title: 'Remove attachment?',
    text: 'This file will be detached from the campaign.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Remove',
    confirmButtonColor: '#F2B8B5',
    cancelButtonText: 'Cancel',
  });
  if (!isConfirmed) return;
  await api('DELETE', '/campaign_attachments.php?id=' + id);
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
  if (pendingCount > 50) {
    const { isConfirmed } = await Swal.fire({
      title: 'Start sending?',
      text: `This will send to ${pendingCount} recipients. Continue?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Start Sending',
      cancelButtonText: 'Cancel',
    });
    if (!isConfirmed) return;
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
  const { isConfirmed } = await Swal.fire({
    title: 'Stop campaign?',
    text: 'Unsent recipients will remain pending.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Stop',
    confirmButtonColor: '#F2B8B5',
    cancelButtonText: 'Cancel',
  });
  if (!isConfirmed) return;
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
    if (counts.pending === 0) {
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
      if ((updatedCampaign.counts || {}).pending === 0) {
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

/* ─────────────────────────────────────────────────────────
   ── INIT
   ───────────────────────────────────────────────────────── */
showScreen('campaigns');

const templateModal = $('#template-modal');
const observer = new MutationObserver(() => {
  if (templateModal.classList.contains('open')) refreshAssetPicker();
});
observer.observe(templateModal, { attributes: true, attributeFilter: ['class'] });
