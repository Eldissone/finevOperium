import '../index.css';
import { apiFetch, requireAuth } from './api.js';

document.addEventListener('DOMContentLoaded', async () => {
  await requireAuth();
  const id = new URLSearchParams(window.location.search).get('id');
  if (!id) { window.location.href = '/src/page/dashboard.html'; return; }

  const titleEl = document.getElementById('sheet-title');
  const metaEl = document.getElementById('sheet-meta');
  const columnsEl = document.getElementById('columns-list');
  const previewEl = document.getElementById('preview-table');
  const kpisEl = document.getElementById('kpis-list');
  const workflowsEl = document.getElementById('workflows-list');

  try {
    const { spreadsheet } = await apiFetch(`/api/spreadsheets/${id}`);
    const { analysis, previewRows, fileName, rowCount, columnCount, sheetName } = spreadsheet;

    titleEl.textContent = fileName;
    metaEl.textContent = `${sheetName || 'Folha 1'} · ${rowCount} linhas · ${analysis.sectorLabel}`;

    columnsEl.innerHTML = analysis.columns.map((c) => `
      <div class="glass-card p-4"><div class="font-medium">${c.name}</div><div class="text-xs text-text-muted">${c.type}</div></div>
    `).join('');

    kpisEl.innerHTML = analysis.suggestedKpis.map((k) => `<li class="text-sm">${k.label}</li>`).join('');
    workflowsEl.innerHTML = analysis.suggestedWorkflows.map((w) => `
      <li class="glass-card p-4 text-sm"><strong>${w.name}</strong><p class="text-text-muted mt-1">${w.description}</p></li>
    `).join('');

    const headers = analysis.columns.map((c) => c.name);
    previewEl.innerHTML = previewRows?.length ? `
      <table class="w-full text-sm">
        <thead><tr>${headers.map((h) => `<th class="text-left py-2 px-3 text-text-muted">${h}</th>`).join('')}</tr></thead>
        <tbody>${previewRows.map((row) => `<tr>${headers.map((h) => `<td class="py-2 px-3">${row[h] ?? '—'}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>
    ` : '<p class="text-text-muted">Sem pré-visualização.</p>';
  } catch (err) {
    titleEl.textContent = 'Erro';
    metaEl.textContent = err.message;
  }
});
