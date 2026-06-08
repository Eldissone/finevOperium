import '../index.css';
import { apiFetch, requireAuth } from './api.js';
import { applyAppTheme } from './lib/app-theme.js';

const TOTAL_STEPS = 4;
let currentStep = 1;
let spreadsheet = null;
let config = null;
let wizardWorkflows = [];

document.addEventListener('DOMContentLoaded', async () => {
  await requireAuth();
  const id = new URLSearchParams(window.location.search).get('id');
  if (!id) { window.location.href = '/src/page/dashboard.html'; return; }

  await loadData(id);
  bindControls(id);
  showStep(1);
});

async function loadData(id) {
  const [sheetRes, configRes] = await Promise.all([
    apiFetch(`/api/spreadsheets/${id}`),
    apiFetch(`/api/spreadsheets/${id}/config`),
  ]);
  spreadsheet = sheetRes.spreadsheet;
  config = configRes.config;
  if (!config.dashboardSetup?.kpis?.length && spreadsheet.analysis?.suggestedKpis) {
    config.dashboardSetup = {
      ...config.dashboardSetup,
      kpis: spreadsheet.analysis.suggestedKpis.map((k) => ({ ...k, enabled: true })),
    };
  }

  if (config.isPublished) {
    window.location.href = `/src/page/app-dashboard.html?id=${id}`;
    return;
  }

  renderReview();
  populateTheme();
  populateDashboard();
  populateFields();
  loadWorkflowsFromAnalysis();
}

function renderReview() {
  const a = spreadsheet.analysis || {};
  document.getElementById('review-summary').innerHTML = `
    <div class="flex items-start gap-4">
      <span class="material-symbols-outlined text-primary text-3xl">analytics</span>
      <div>
        <h2 class="font-display text-xl font-bold">${a.sectorLabel || 'Sistema'}</h2>
        <p class="text-sm text-text-muted mt-1">${spreadsheet.fileName} · ${spreadsheet.rowCount} linhas · ${spreadsheet.columnCount} colunas</p>
      </div>
    </div>
    <ul class="text-sm space-y-1 text-text-muted">
      ${(a.columns || []).map((c) => `<li>• ${c.name} <span class="capitalize">(${c.type})</span></li>`).join('')}
    </ul>
  `;
}

function populateTheme() {
  const t = config.themeSetup || {};
  document.getElementById('system-name').value = config.systemName || '';
  document.getElementById('primary-color').value = t.primaryColor || '#FF7A00';
  document.getElementById('primary-color-text').value = t.primaryColor || '#FF7A00';
  document.getElementById('theme-mode').value = t.mode || 'light';
  document.getElementById('theme-font').value = t.fontFamily || 'everett';
  previewTheme();
}

function previewTheme() {
  applyAppTheme(getThemeFromForm());
  document.getElementById('theme-preview').innerHTML =
    `<span class="text-primary font-bold">Pré-visualização</span> — cor e fonte aplicadas nesta página.`;
}

function populateDashboard() {
  const d = config.dashboardSetup || {};
  const cols = spreadsheet.analysis?.columns || [];
  document.getElementById('dash-title-input').value = d.appTitle || spreadsheet.fileName;

  const kpisEl = document.getElementById('kpis-config');
  const kpis = d.kpis || spreadsheet.analysis?.suggestedKpis || [];
  kpisEl.innerHTML = kpis.map((k, i) => `
    <li class="flex items-center gap-2">
      <input type="checkbox" data-kpi-index="${i}" ${k.enabled !== false ? 'checked' : ''} />
      <span class="text-sm">${k.label}</span>
    </li>
  `).join('');

  const numericOpts = cols.filter((c) => c.type === 'number');
  const textOpts = cols.filter((c) => c.type !== 'number');
  fillColumnSelect('chart-bar-column', numericOpts, d.charts?.bar?.column);
  fillColumnSelect('chart-doughnut-column', textOpts, d.charts?.doughnut?.column);
  document.getElementById('chart-bar-enabled').checked = d.charts?.bar?.enabled !== false;
  document.getElementById('chart-doughnut-enabled').checked = d.charts?.doughnut?.enabled !== false;
}

function fillColumnSelect(id, columns, selected) {
  const sel = document.getElementById(id);
  sel.innerHTML = columns.map((c) =>
    `<option value="${c.name}" ${c.name === selected ? 'selected' : ''}>${c.name}</option>`
  ).join('') || '<option value="">—</option>';
}

function populateFields() {
  const fields = config.formSetup?.fields || [];
  const el = document.getElementById('fields-config');
  el.innerHTML = fields.map((f, i) => `
    <div class="flex flex-wrap items-center gap-3 text-sm border-b border-border pb-2">
      <span class="font-medium flex-1 min-w-[120px]">${f.name}</span>
      <label class="flex items-center gap-1"><input type="checkbox" data-field="${i}" data-prop="visible" ${f.visible !== false ? 'checked' : ''} /> Visível</label>
      <label class="flex items-center gap-1"><input type="checkbox" data-field="${i}" data-prop="required" ${f.required ? 'checked' : ''} /> Obrigatório</label>
    </div>
  `).join('');
}

function loadWorkflowsFromAnalysis() {
  const suggested = spreadsheet.analysis?.suggestedWorkflows || [];
  wizardWorkflows = suggested.map((w) => ({
    name: w.name,
    trigger: { type: 'schedule', description: w.description },
    action: { type: 'notify', message: w.description || w.name },
  }));
  renderWorkflowsConfig();
}

function renderWorkflowsConfig() {
  document.getElementById('workflows-config').innerHTML = wizardWorkflows.map((w, i) => `
    <li class="border border-border rounded-lg p-3 space-y-2">
      <input type="text" data-wf-index="${i}" data-wf-field="name" value="${escapeHtml(w.name)}" class="w-full bg-surface-highlight border border-border rounded px-3 py-1.5 text-sm font-semibold" />
      <input type="text" data-wf-index="${i}" data-wf-field="message" value="${escapeHtml(w.action?.message || '')}" placeholder="Mensagem / descrição da acção" class="w-full bg-surface-highlight border border-border rounded px-3 py-1.5 text-sm" />
      <button type="button" data-wf-remove="${i}" class="text-xs text-red-500">Remover</button>
    </li>
  `).join('');
}

function escapeHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

function getThemeFromForm() {
  return {
    primaryColor: document.getElementById('primary-color-text').value,
    mode: document.getElementById('theme-mode').value,
    fontFamily: document.getElementById('theme-font').value,
  };
}

function collectPayload() {
  const d = config.dashboardSetup || {};
  const kpis = (d.kpis || []).map((k, i) => {
    const cb = document.querySelector(`[data-kpi-index="${i}"]`);
    return { ...k, enabled: cb ? cb.checked : true };
  });

  const fields = (config.formSetup?.fields || []).map((f, i) => {
    const visible = document.querySelector(`[data-field="${i}"][data-prop="visible"]`);
    const required = document.querySelector(`[data-field="${i}"][data-prop="required"]`);
    return {
      ...f,
      visible: visible ? visible.checked : true,
      required: required ? required.checked : false,
    };
  });

  wizardWorkflows.forEach((_, i) => {
    const nameInp = document.querySelector(`[data-wf-index="${i}"][data-wf-field="name"]`);
    const msgInp = document.querySelector(`[data-wf-index="${i}"][data-wf-field="message"]`);
    if (nameInp) wizardWorkflows[i].name = nameInp.value.trim() || wizardWorkflows[i].name;
    if (msgInp) wizardWorkflows[i].action = { type: 'notify', message: msgInp.value };
  });

  return {
    systemName: document.getElementById('system-name').value.trim(),
    themeSetup: getThemeFromForm(),
    dashboardSetup: {
      appTitle: document.getElementById('dash-title-input').value.trim(),
      kpis,
      charts: {
        bar: {
          enabled: document.getElementById('chart-bar-enabled').checked,
          column: document.getElementById('chart-bar-column').value || null,
        },
        doughnut: {
          enabled: document.getElementById('chart-doughnut-enabled').checked,
          column: document.getElementById('chart-doughnut-column').value || null,
        },
      },
    },
    formSetup: { fields },
    workflows: wizardWorkflows.filter((w) => w.name?.trim()),
  };
}

function bindControls(id) {
  const color = document.getElementById('primary-color');
  const colorText = document.getElementById('primary-color-text');
  color?.addEventListener('input', () => { colorText.value = color.value; previewTheme(); });
  colorText?.addEventListener('input', () => { color.value = colorText.value; previewTheme(); });
  ['theme-mode', 'theme-font'].forEach((elId) => {
    document.getElementById(elId)?.addEventListener('change', previewTheme);
  });

  document.getElementById('btn-add-workflow')?.addEventListener('click', () => {
    wizardWorkflows.push({ name: 'Novo workflow', trigger: { type: 'manual' }, action: { type: 'notify', message: '' } });
    renderWorkflowsConfig();
  });

  document.getElementById('workflows-config')?.addEventListener('click', (e) => {
    const rm = e.target.closest('[data-wf-remove]');
    if (rm) {
      wizardWorkflows.splice(Number(rm.dataset.wfRemove), 1);
      renderWorkflowsConfig();
    }
  });

  document.getElementById('btn-prev-step')?.addEventListener('click', () => showStep(currentStep - 1));
  document.getElementById('btn-next-step')?.addEventListener('click', () => showStep(currentStep + 1));
  document.getElementById('btn-publish')?.addEventListener('click', async () => {
    const status = document.getElementById('wizard-status');
    status.textContent = 'A gerar sistema...';
    status.className = 'text-center text-sm mt-4 text-primary';
    try {
      const payload = collectPayload();
      await apiFetch(`/api/spreadsheets/${id}/config/publish`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      window.location.href = `/src/page/app-dashboard.html?id=${id}`;
    } catch (err) {
      status.textContent = err.message;
      status.className = 'text-center text-sm mt-4 text-red-500';
    }
  });
}

function showStep(step) {
  currentStep = Math.max(1, Math.min(TOTAL_STEPS, step));
  document.querySelectorAll('.wizard-step').forEach((el) => {
    el.classList.toggle('hidden', Number(el.dataset.step) !== currentStep);
  });
  document.getElementById('step-indicator').textContent = `Passo ${currentStep}/${TOTAL_STEPS}`;
  document.getElementById('progress-bar').style.width = `${(currentStep / TOTAL_STEPS) * 100}%`;
  document.getElementById('btn-prev-step').disabled = currentStep === 1;
  document.getElementById('btn-next-step').classList.toggle('hidden', currentStep === TOTAL_STEPS);
  document.getElementById('btn-publish').classList.toggle('hidden', currentStep !== TOTAL_STEPS);
}
