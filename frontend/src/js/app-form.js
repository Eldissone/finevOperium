import '../index.css';
import { apiFetch, requireAuth } from './api.js';
import { loadAndApplyTheme } from './lib/app-theme.js';
import { buildRecordPayload, renderFormFields } from './lib/record-utils.js';

document.addEventListener('DOMContentLoaded', async () => {
  await requireAuth();

  const urlParams = new URLSearchParams(window.location.search);
  const spreadsheetId = urlParams.get('id');
  const recordId = urlParams.get('recordId');
  const isEdit = Boolean(recordId);

  if (!spreadsheetId) {
    window.location.href = '/src/page/dashboard.html';
    return;
  }

  const backLink = document.getElementById('back-link');
  const titleEl = document.getElementById('form-title');
  const subtitleEl = document.getElementById('form-subtitle');
  const formFieldsEl = document.getElementById('form-fields');
  const formEl = document.getElementById('dynamic-form');
  const statusMsg = document.getElementById('status-msg');
  const submitBtn = formEl?.querySelector('button[type="submit"]');

  backLink.href = `/src/page/app-dashboard.html?id=${spreadsheetId}`;

  try {
    await loadAndApplyTheme(spreadsheetId);

    const [sheetData, configData] = await Promise.all([
      apiFetch(`/api/spreadsheets/${spreadsheetId}`),
      apiFetch(`/api/spreadsheets/${spreadsheetId}/config`),
    ]);

    const spreadsheet = sheetData.spreadsheet;
    const config = configData.config;

    if (config && !config.isPublished) {
      window.location.href = `/src/page/system-wizard.html?id=${spreadsheetId}`;
      return;
    }

    const fields = config?.formSetup?.fields
      || spreadsheet.analysis?.suggestedFormFields
      || [];

    let existingRecord = null;
    if (isEdit) {
      const { records } = await apiFetch(`/api/spreadsheets/${spreadsheetId}/records`);
      existingRecord = records.find((r) => r.id === recordId);
      if (!existingRecord) throw new Error('Registo não encontrado.');
    }

    titleEl.textContent = isEdit
      ? `Editar — ${spreadsheet.fileName}`
      : `Novo Registo — ${spreadsheet.fileName}`;
    if (subtitleEl) {
      subtitleEl.textContent = isEdit
        ? 'Actualize os campos e guarde as alterações.'
        : 'Preencha os dados para adicionar um novo registo.';
    }
    if (submitBtn) {
      submitBtn.innerHTML = `<span class="material-symbols-outlined text-sm">save</span> ${isEdit ? 'Actualizar' : 'Salvar'} Registo`;
    }

    if (fields.length === 0) {
      formFieldsEl.innerHTML = '<p class="text-text-muted text-sm text-center">Nenhum campo configurado.</p>';
      return;
    }

    renderFormFields(formFieldsEl, fields, existingRecord?.data || {});

    formEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      const recordData = buildRecordPayload(formEl, fields);

      for (const f of fields.filter((x) => x.required && x.visible !== false)) {
        if (recordData[f.name] == null || recordData[f.name] === '') {
          statusMsg.textContent = `O campo "${f.name}" é obrigatório.`;
          statusMsg.className = 'text-sm text-red-500 text-center font-medium block';
          return;
        }
      }

      try {
        if (isEdit) {
          await apiFetch(`/api/spreadsheets/${spreadsheetId}/records/${recordId}`, {
            method: 'PUT',
            body: JSON.stringify(recordData),
          });
          statusMsg.textContent = 'Registo actualizado!';
        } else {
          await apiFetch(`/api/spreadsheets/${spreadsheetId}/records`, {
            method: 'POST',
            body: JSON.stringify(recordData),
          });
          statusMsg.textContent = 'Registo criado com sucesso!';
          formEl.reset();
        }
        statusMsg.className = 'text-sm text-green-600 text-center font-medium block';
        setTimeout(() => {
          if (isEdit) window.location.href = `/src/page/app-dashboard.html?id=${spreadsheetId}`;
          else statusMsg.className = 'hidden';
        }, 1500);
      } catch (err) {
        statusMsg.textContent = err.message || 'Erro ao guardar.';
        statusMsg.className = 'text-sm text-red-500 text-center font-medium block';
      }
    });
  } catch (error) {
    titleEl.textContent = 'Erro ao carregar formulário';
    console.error(error);
  }
});
