import '../index.css';
import { apiFetch, requireAuth } from './api.js';

let recentSpreadsheets = [];

document.addEventListener('DOMContentLoaded', async () => {
  const logoutBtn = document.getElementById('logout-btn');
  const userNameDisplay = document.getElementById('user-name');
  const orgNameDisplay = document.getElementById('org-name');
  const statSheets = document.getElementById('stat-sheets');
  const statRows = document.getElementById('stat-rows');
  const statSector = document.getElementById('stat-sector');
  const sheetsList = document.getElementById('sheets-list');
  const sheetsStatus = document.getElementById('sheets-status');
  const editModal = document.getElementById('edit-modal');
  const editForm = document.getElementById('edit-form');

  const user = await requireAuth();

  if (userNameDisplay) {
    userNameDisplay.textContent = user.name || user.email.split('@')[0];
    if (orgNameDisplay && user.organization) orgNameDisplay.textContent = user.organization.name;
  }

  bindModal(editModal, editForm, sheetsStatus);
  bindSheetActions(sheetsList, sheetsStatus);

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await apiFetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/src/page/login.html';
      } catch (err) {
        console.error(err);
      }
    });
  }

  await loadDashboard({ statSheets, statRows, statSector, sheetsList, sheetsStatus });
});

async function loadDashboard(els) {
  try {
    const data = await apiFetch('/api/dashboard');
    recentSpreadsheets = data.recentSpreadsheets || [];

    if (els.statSheets) els.statSheets.textContent = data.stats.spreadsheets;
    if (els.statRows) els.statRows.textContent = data.stats.totalRows.toLocaleString('pt-AO');
    if (els.statSector) els.statSector.textContent = data.stats.lastSector || '—';

    renderSheetsList(els.sheetsList, recentSpreadsheets);
    if (els.sheetsStatus) els.sheetsStatus.textContent = '';
  } catch (err) {
    console.error(err);
    if (els.sheetsStatus) {
      els.sheetsStatus.textContent = err.message;
      els.sheetsStatus.className = 'text-sm text-red-500';
    }
  }
}

function renderSheetsList(container, sheets) {
  if (!container) return;

    if (sheets.length === 0) {
    container.innerHTML = `
      <div class="glass-card p-8 text-center col-span-full">
        <span class="material-symbols-outlined text-4xl text-text-muted mb-3">table_chart</span>
        <p class="text-text-muted mb-4">Ainda não existem planilhas importadas.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = sheets.map((s) => {
    const openHref = s.isPublished
      ? `/src/page/app-dashboard.html?id=${s.id}`
      : `/src/page/system-wizard.html?id=${s.id}`;
    const statusBadge = s.isPublished
      ? '<span class="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">Publicado</span>'
      : '<span class="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700">Rascunho</span>';

    return `
      <article class="glass-card p-5 flex flex-col" data-sheet-id="${s.id}">
        <div class="flex items-start justify-between gap-2">
          <span class="material-symbols-outlined text-primary">description</span>
          <div class="flex flex-col items-end gap-1">
            ${statusBadge}
            <span class="text-xs text-text-muted">${new Date(s.createdAt).toLocaleDateString('pt-AO')}</span>
          </div>
        </div>
        <h3 class="font-semibold mt-3 truncate sheet-name">${escapeHtml(s.fileName)}</h3>
        <p class="text-sm text-text-muted mt-1">${s.rowCount} linhas · ${s.columnCount} colunas</p>
        ${s.sectorLabel ? `<span class="inline-block mt-2 text-xs px-2 py-1 rounded bg-primary/10 text-primary w-fit">${escapeHtml(s.sectorLabel)}</span>` : ''}
        <div class="mt-auto pt-4 flex flex-wrap gap-2 border-t border-border mt-4">
          <a href="${openHref}" class="flex-1 text-center text-sm font-semibold py-2 px-3 rounded-lg bg-primary/10 text-primary hover:bg-primary/20">Abrir</a>
          <a href="${openHref}" class="text-sm font-semibold py-2 px-3 rounded-lg border border-border hover:bg-surface-highlight">Detalhes</a>
          <button type="button" data-action="edit" data-id="${s.id}" data-name="${escapeAttr(s.fileName)}" class="text-sm font-semibold py-2 px-3 rounded-lg border border-border hover:bg-surface-highlight">Renomear</button>
          <button type="button" data-action="delete" data-id="${s.id}" data-name="${escapeAttr(s.fileName)}" class="text-sm font-semibold py-2 px-3 rounded-lg text-red-500 border border-red-200 hover:bg-red-50">Apagar</button>
        </div>
      </article>
    `;
  }).join('');
}

function bindSheetActions(container, statusEl) {
  container?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const { action, id, name } = btn.dataset;
    if (action === 'edit') {
      openEditModal(id, name);
      return;
    }
    if (action === 'delete') {
      if (!confirm(`Eliminar "${name}" e todos os registos associados?`)) return;
      try {
        await apiFetch(`/api/spreadsheets/${id}`, { method: 'DELETE' });
        setStatus(statusEl, 'Planilha eliminada.', 'success');
        await reloadDashboard(statusEl);
      } catch (err) {
        setStatus(statusEl, err.message, 'error');
      }
    }
  });
}

function bindModal(modal, form, statusEl) {
  const cancelBtn = document.getElementById('edit-cancel');
  const idInput = document.getElementById('edit-sheet-id');
  const nameInput = document.getElementById('edit-file-name');

  cancelBtn?.addEventListener('click', closeEditModal);
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeEditModal();
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = idInput.value;
    const fileName = nameInput.value.trim();
    if (!fileName) return;

    try {
      await apiFetch(`/api/spreadsheets/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ fileName }),
      });
      closeEditModal();
      setStatus(statusEl, 'Planilha renomeada.', 'success');
      await reloadDashboard(statusEl);
    } catch (err) {
      setStatus(statusEl, err.message, 'error');
    }
  });
}

function openEditModal(id, name) {
  document.getElementById('edit-sheet-id').value = id;
  document.getElementById('edit-file-name').value = name;
  document.getElementById('edit-modal').classList.remove('hidden');
  document.getElementById('edit-file-name').focus();
}

function closeEditModal() {
  document.getElementById('edit-modal')?.classList.add('hidden');
  document.getElementById('edit-form')?.reset();
}

async function reloadDashboard(statusEl) {
  const data = await apiFetch('/api/dashboard');
  recentSpreadsheets = data.recentSpreadsheets || [];
  document.getElementById('stat-sheets').textContent = data.stats.spreadsheets;
  document.getElementById('stat-rows').textContent = data.stats.totalRows.toLocaleString('pt-AO');
  document.getElementById('stat-sector').textContent = data.stats.lastSector || '—';
  renderSheetsList(document.getElementById('sheets-list'), recentSpreadsheets);
}

function setStatus(el, msg, type) {
  if (!el) return;
  el.textContent = msg;
  el.className = type === 'error' ? 'text-sm text-red-500' : 'text-sm text-green-600';
  setTimeout(() => { el.textContent = ''; el.className = 'text-sm text-text-muted'; }, 3000);
}

function escapeHtml(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(str) {
  return String(str ?? '').replace(/"/g, '&quot;');
}
