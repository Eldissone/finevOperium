import '../index.css';
import { apiFetch, requireAuth } from './api.js';

document.addEventListener('DOMContentLoaded', async () => {
  const logoutBtn = document.getElementById('logout-btn');
  const userNameDisplay = document.getElementById('user-name');
  const orgNameDisplay = document.getElementById('org-name');
  const statSheets = document.getElementById('stat-sheets');
  const statRows = document.getElementById('stat-rows');
  const statSector = document.getElementById('stat-sector');
  const sheetsList = document.getElementById('sheets-list');

  const user = await requireAuth();

  if (userNameDisplay) userNameDisplay.textContent = user.name || user.email.split('@')[0];
  if (orgNameDisplay && user.organization) orgNameDisplay.textContent = user.organization.name;

  try {
    const data = await apiFetch('/api/dashboard');
    const { stats, recentSpreadsheets } = data;

    if (statSheets) statSheets.textContent = stats.spreadsheets;
    if (statRows) statRows.textContent = stats.totalRows.toLocaleString('pt-AO');
    if (statSector) statSector.textContent = stats.lastSector || '—';

    if (recentSpreadsheets.length === 0) {
      sheetsList.innerHTML = `
        <div class="glass-card p-8 text-center col-span-full">
          <span class="material-symbols-outlined text-4xl text-text-muted mb-3">table_chart</span>
          <p class="text-text-muted mb-4">Ainda não importou nenhuma planilha.</p>
          <a href="/src/page/upload.html" class="inline-block bg-primary text-white font-bold py-2 px-6 rounded-lg">Importar primeira planilha</a>
        </div>
      `;
    } else {
      sheetsList.innerHTML = recentSpreadsheets.map((s) => `
        <a href="/src/page/spreadsheet.html?id=${s.id}" class="glass-card p-5 block hover:border-primary/50 transition-colors">
          <div class="flex items-start justify-between gap-2">
            <span class="material-symbols-outlined text-primary">description</span>
            <span class="text-xs text-text-muted">${new Date(s.createdAt).toLocaleDateString('pt-AO')}</span>
          </div>
          <h3 class="font-semibold mt-3 truncate">${s.fileName}</h3>
          <p class="text-sm text-text-muted mt-1">${s.rowCount} linhas · ${s.columnCount} colunas</p>
          ${s.sectorLabel ? `<span class="inline-block mt-3 text-xs px-2 py-1 rounded bg-primary/10 text-primary">${s.sectorLabel}</span>` : ''}
        </a>
      `).join('');
    }
  } catch (err) {
    console.error(err);
  }

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
});
