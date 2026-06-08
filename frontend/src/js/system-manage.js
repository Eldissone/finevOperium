import '../index.css';
import { apiFetch, requireAuth } from './api.js';
import { applyAppTheme } from './lib/app-theme.js';

let spreadsheetId = null;
let spreadsheet = null;
let config = null;
let workflows = [];

document.addEventListener('DOMContentLoaded', async () => {
  await requireAuth();
  spreadsheetId = new URLSearchParams(window.location.search).get('id');
  if (!spreadsheetId) { window.location.href = '/src/page/dashboard.html'; return; }

  document.getElementById('back-link').href = `/src/page/dashboard.html`;
  document.getElementById('open-app-link').href = `/src/page/app-dashboard.html?id=${spreadsheetId}`;

  await loadAll();
  bindTabs();
  bindSave();
  bindWorkflows();
});

async function loadAll() {
  const [sheetRes, configRes, wfRes] = await Promise.all([
    apiFetch(`/api/spreadsheets/${spreadsheetId}`),
    apiFetch(`/api/spreadsheets/${spreadsheetId}/config`),
    apiFetch(`/api/spreadsheets/${spreadsheetId}/workflows`),
  ]);
  spreadsheet = sheetRes.spreadsheet;
  config = configRes.config;
  workflows = wfRes.workflows || [];
  fillForm();
  if (config.themeSetup) applyAppTheme(config.themeSetup);
}

function fillForm() {
  const t = config.themeSetup || {};
  document.getElementById('m-system-name').value = config.systemName || '';
  document.getElementById('m-primary-color').value = t.primaryColor || '#FF7A00';
  document.getElementById('m-primary-color-text').value = t.primaryColor || '#FF7A00';
  document.getElementById('m-theme-mode').value = t.mode || 'light';
  document.getElementById('m-theme-font').value = t.fontFamily || 'everett';

  const d = config.dashboardSetup || {};
  document.getElementById('m-dash-title').value = d.appTitle || spreadsheet.fileName;
  const cols = spreadsheet.analysis?.columns || [];
  document.getElementById('m-kpis').innerHTML = (d.kpis || []).map((k, i) => `
    <li class="flex gap-2 text-sm"><input type="checkbox" data-kpi="${i}" ${k.enabled !== false ? 'checked' : ''} /> ${k.label}</li>
  `).join('');
  fillSelect('m-bar-column', cols.filter((c) => c.type === 'number'), d.charts?.bar?.column);
  fillSelect('m-doughnut-column', cols, d.charts?.doughnut?.column);
  document.getElementById('m-bar-enabled').checked = d.charts?.bar?.enabled !== false;
  document.getElementById('m-doughnut-enabled').checked = d.charts?.doughnut?.enabled !== false;

  document.getElementById('m-fields').innerHTML = (config.formSetup?.fields || []).map((f, i) => `
    <div class="flex gap-4 text-sm py-2 border-b border-border">
      <span class="flex-1 font-medium">${f.name}</span>
      <label><input type="checkbox" data-f="${i}" data-p="visible" ${f.visible !== false ? 'checked' : ''} /> Visível</label>
      <label><input type="checkbox" data-f="${i}" data-p="required" ${f.required ? 'checked' : ''} /> Obrig.</label>
    </div>
  `).join('');

  renderWorkflowsList();
}

function fillSelect(id, columns, selected) {
  document.getElementById(id).innerHTML = columns.map((c) =>
    `<option value="${c.name}" ${c.name === selected ? 'selected' : ''}>${c.name}</option>`
  ).join('');
}

function renderWorkflowsList() {
  document.getElementById('m-workflows-list').innerHTML = workflows.length
    ? workflows.map((w) => `
      <li class="border border-border rounded-lg p-4 space-y-2" data-wf-id="${w.id}">
        <input type="text" class="wf-name w-full bg-surface-highlight border border-border rounded px-3 py-2 text-sm font-semibold" value="${esc(w.name)}" />
        <input type="text" class="wf-msg w-full bg-surface-highlight border border-border rounded px-3 py-2 text-sm" value="${esc(w.action?.message || '')}" placeholder="Acção / mensagem" />
        <button type="button" class="wf-delete text-xs text-red-500" data-id="${w.id}">Eliminar</button>
      </li>
    `).join('')
    : '<p class="text-sm text-text-muted">Nenhum workflow. Adicione um para automatizar tarefas.</p>';
}

function esc(s) {
  return String(s ?? '').replace(/"/g, '&quot;');
}

function bindTabs() {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((b) => {
        b.classList.remove('border-primary', 'text-primary');
        b.classList.add('border-transparent', 'text-text-muted');
      });
      btn.classList.add('border-primary', 'text-primary');
      btn.classList.remove('border-transparent', 'text-text-muted');
      document.querySelectorAll('.tab-panel').forEach((p) => p.classList.add('hidden'));
      document.getElementById(`tab-${btn.dataset.tab}`).classList.remove('hidden');
    });
  });
}

function collectConfig() {
  const d = config.dashboardSetup || {};
  const kpis = (d.kpis || []).map((k, i) => {
    const cb = document.querySelector(`[data-kpi="${i}"]`);
    return { ...k, enabled: cb ? cb.checked : true };
  });
  const fields = (config.formSetup?.fields || []).map((f, i) => {
    const vis = document.querySelector(`[data-f="${i}"][data-p="visible"]`);
    const req = document.querySelector(`[data-f="${i}"][data-p="required"]`);
    return { ...f, visible: vis?.checked !== false, required: !!req?.checked };
  });

  return {
    systemName: document.getElementById('m-system-name').value.trim(),
    themeSetup: {
      primaryColor: document.getElementById('m-primary-color-text').value,
      mode: document.getElementById('m-theme-mode').value,
      fontFamily: document.getElementById('m-theme-font').value,
    },
    dashboardSetup: {
      appTitle: document.getElementById('m-dash-title').value.trim(),
      kpis,
      charts: {
        bar: { enabled: document.getElementById('m-bar-enabled').checked, column: document.getElementById('m-bar-column').value },
        doughnut: { enabled: document.getElementById('m-doughnut-enabled').checked, column: document.getElementById('m-doughnut-column').value },
      },
    },
    formSetup: { fields },
  };
}

function bindSave() {
  const color = document.getElementById('m-primary-color');
  const colorText = document.getElementById('m-primary-color-text');
  color.addEventListener('input', () => { colorText.value = color.value; applyAppTheme(collectConfig().themeSetup); });
  colorText.addEventListener('input', () => { color.value = colorText.value; });
  ['m-theme-mode', 'm-theme-font'].forEach((id) => {
    document.getElementById(id).addEventListener('change', () => applyAppTheme(collectConfig().themeSetup));
  });

  document.getElementById('btn-save-config').addEventListener('click', async () => {
    const st = document.getElementById('manage-status');
    try {
      const payload = collectConfig();
      const { config: updated } = await apiFetch(`/api/spreadsheets/${spreadsheetId}/config`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      config = updated;
      applyAppTheme(config.themeSetup);
      await saveWorkflowEdits();
      st.textContent = 'Guardado com sucesso.';
      st.className = 'text-sm text-green-600 self-center';
    } catch (err) {
      st.textContent = err.message;
      st.className = 'text-sm text-red-500 self-center';
    }
  });
}

async function saveWorkflowEdits() {
  const items = document.querySelectorAll('#m-workflows-list [data-wf-id]');
  for (const li of items) {
    const id = li.dataset.wfId;
    const name = li.querySelector('.wf-name')?.value?.trim();
    const message = li.querySelector('.wf-msg')?.value;
    await apiFetch(`/api/spreadsheets/${spreadsheetId}/workflows/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, action: { type: 'notify', message } }),
    });
  }
}

function bindWorkflows() {
  document.getElementById('m-add-workflow').addEventListener('click', async () => {
    const { workflow } = await apiFetch(`/api/spreadsheets/${spreadsheetId}/workflows`, {
      method: 'POST',
      body: JSON.stringify({ name: 'Novo workflow', action: { type: 'notify', message: '' } }),
    });
    workflows.push(workflow);
    renderWorkflowsList();
  });

  document.getElementById('m-workflows-list').addEventListener('click', async (e) => {
    const del = e.target.closest('.wf-delete');
    if (!del) return;
    if (!confirm('Remover este workflow?')) return;
    await apiFetch(`/api/spreadsheets/${spreadsheetId}/workflows/${del.dataset.id}`, { method: 'DELETE' });
    workflows = workflows.filter((w) => w.id !== del.dataset.id);
    renderWorkflowsList();
  });
}
