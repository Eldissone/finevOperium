import '../index.css';
import { apiFetch, requireAuth } from './api.js';
import { loadAndApplyTheme } from './lib/app-theme.js';

const PAGE_SIZE = 15;
let allRecords = [];
let filteredRecords = [];
let currentPage = 1;
let columns = [];
let spreadsheetId = null;
let appConfig = null;

document.addEventListener('DOMContentLoaded', async () => {
  await requireAuth();

  spreadsheetId = new URLSearchParams(window.location.search).get('id');
  if (!spreadsheetId) { window.location.href = '/src/page/dashboard.html'; return; }

  document.getElementById('back-link').href = `/src/page/dashboard.html`;
  document.getElementById('form-link').href = `/src/page/app-form.html?id=${spreadsheetId}`;
  document.getElementById('empty-form-link').href = `/src/page/app-form.html?id=${spreadsheetId}`;

  const manageLink = document.getElementById('manage-link');
  if (manageLink) manageLink.href = `/src/page/system-manage.html?id=${spreadsheetId}`;

  try {
    appConfig = await loadAndApplyTheme(spreadsheetId);

    if (appConfig && !appConfig.isPublished) {
      window.location.href = `/src/page/system-wizard.html?id=${spreadsheetId}`;
      return;
    }

    const [sheetData, recordsData] = await Promise.all([
      apiFetch(`/api/spreadsheets/${spreadsheetId}`),
      apiFetch(`/api/spreadsheets/${spreadsheetId}/records`),
    ]);

    const spreadsheet = sheetData.spreadsheet;
    const analysis = spreadsheet.analysis || {};
    columns = analysis.columns || [];
    allRecords = recordsData.records || [];
    filteredRecords = [...allRecords];

    const title = appConfig?.dashboardSetup?.appTitle || appConfig?.systemName || spreadsheet.fileName;
    document.getElementById('dash-title').textContent = title;

    renderStats(analysis, allRecords, appConfig);
    renderCharts(analysis, allRecords, appConfig);
    renderTableHead();
    renderPage();

    document.getElementById('search-input').addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      filteredRecords = allRecords.filter((r) =>
        Object.values(r.data).some((v) => String(v ?? '').toLowerCase().includes(q))
      );
      currentPage = 1;
      renderPage();
    });

    document.getElementById('btn-prev').addEventListener('click', () => {
      if (currentPage > 1) { currentPage--; renderPage(); }
    });
    document.getElementById('btn-next').addEventListener('click', () => {
      if (currentPage * PAGE_SIZE < filteredRecords.length) { currentPage++; renderPage(); }
    });

    document.getElementById('table-body').addEventListener('click', onTableAction);

  } catch (err) {
    document.getElementById('dash-title').textContent = 'Erro ao carregar';
    console.error(err);
  }
});

async function onTableAction(e) {
  const editBtn = e.target.closest('[data-edit]');
  const delBtn = e.target.closest('[data-delete]');
  if (editBtn) {
    window.location.href = `/src/page/app-form.html?id=${spreadsheetId}&recordId=${editBtn.dataset.edit}`;
    return;
  }
  if (delBtn) {
    if (!confirm('Eliminar este registo permanentemente?')) return;
    try {
      await apiFetch(`/api/spreadsheets/${spreadsheetId}/records/${delBtn.dataset.delete}`, { method: 'DELETE' });
      allRecords = allRecords.filter((r) => r.id !== delBtn.dataset.delete);
      filteredRecords = filteredRecords.filter((r) => r.id !== delBtn.dataset.delete);
      renderPage();
      const analysis = (await apiFetch(`/api/spreadsheets/${spreadsheetId}`)).spreadsheet.analysis;
      renderStats(analysis, allRecords, appConfig);
    } catch (err) {
      alert(err.message);
    }
  }
}

function renderStats(analysis, records, config) {
  const statsRow = document.getElementById('stats-row');
  const kpis = (config?.dashboardSetup?.kpis || analysis.suggestedKpis || []).filter((k) => k.enabled !== false);
  const numericCols = (analysis.columns || []).filter((c) => c.type === 'number');

  const stats = [];
  for (const kpi of kpis.slice(0, 3)) {
    if (kpi.metric === 'count') {
      stats.push({ icon: 'table_rows', label: kpi.label, value: records.length });
    } else if (kpi.metric === 'sum' && kpi.column) {
      const total = records.reduce((acc, r) => {
        const v = parseFloat(r.data[kpi.column]);
        return acc + (isNaN(v) ? 0 : v);
      }, 0);
      stats.push({
        icon: 'calculate',
        label: kpi.label,
        value: total.toLocaleString('pt-BR', { maximumFractionDigits: 2 }),
      });
    }
  }

  if (stats.length < 3) {
    stats.push({
      icon: 'category',
      label: 'Sector',
      value: analysis.sectorLabel || '—',
    });
  }

  statsRow.innerHTML = stats.map((s) => `
    <div class="glass-card p-6 flex items-center gap-4">
      <span class="material-symbols-outlined text-3xl text-primary">${s.icon}</span>
      <div>
        <p class="text-xs text-text-muted font-medium uppercase tracking-wider">${s.label}</p>
        <p class="text-2xl font-display font-bold text-text mt-0.5">${s.value}</p>
      </div>
    </div>
  `).join('');
}

function renderCharts(analysis, records, config) {
  const COLORS = ['#FF7A00', '#FF9533', '#ffb366', '#ffd0a3', '#ffe8cc', '#FF5500', '#cc5f00'];
  const cols = analysis.columns || [];
  const charts = config?.dashboardSetup?.charts || {};
  const primary = config?.themeSetup?.primaryColor || '#FF7A00';

  const barCfg = charts.bar || {};
  const barCol = barCfg.enabled !== false && barCfg.column
    ? cols.find((c) => c.name === barCfg.column)
    : cols.find((c) => c.type === 'number');

  const barCtx = document.getElementById('chart-bar');
  if (barCol && records.length && barCfg.enabled !== false) {
    const top20 = records.slice(0, 20);
    document.getElementById('chart1-title').textContent = `${barCol.name} (primeiros 20)`;
    new Chart(barCtx, {
      type: 'bar',
      data: {
        labels: top20.map((_, i) => `#${i + 1}`),
        datasets: [{
          label: barCol.name,
          data: top20.map((r) => parseFloat(r.data[barCol.name]) || 0),
          backgroundColor: primary,
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } },
      },
    });
  } else {
    barCtx?.closest('.glass-card')?.classList.add('hidden');
  }

  const doughCfg = charts.doughnut || {};
  const doughCol = doughCfg.enabled !== false && doughCfg.column
    ? cols.find((c) => c.name === doughCfg.column)
    : cols.find((c) => c.type === 'text');

  const doughnutCtx = document.getElementById('chart-doughnut');
  if (doughCol && records.length && doughCfg.enabled !== false) {
    const freq = {};
    records.forEach((r) => {
      const v = String(r.data[doughCol.name] ?? 'N/A');
      freq[v] = (freq[v] || 0) + 1;
    });
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 7);
    document.getElementById('chart2-title').textContent = `Distribuição — ${doughCol.name}`;
    new Chart(doughnutCtx, {
      type: 'doughnut',
      data: {
        labels: sorted.map(([k]) => k),
        datasets: [{ data: sorted.map(([, v]) => v), backgroundColor: COLORS, borderWidth: 2 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } } },
      },
    });
  } else {
    doughnutCtx?.closest('.glass-card')?.classList.add('hidden');
  }
}

function renderTableHead() {
  const head = document.getElementById('table-head');
  if (!columns.length) return;
  head.innerHTML = `<tr>
    ${columns.map((c) => `<th class="text-left py-2 px-3 text-text-muted font-medium whitespace-nowrap">${c.name}</th>`).join('')}
    <th class="text-right py-2 px-3 text-text-muted font-medium w-28">Acções</th>
  </tr>`;
}

function renderPage() {
  const tbody = document.getElementById('table-body');
  const empty = document.getElementById('table-empty');
  const pageInfo = document.getElementById('page-info');
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  const total = filteredRecords.length;

  if (total === 0) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    pageInfo.textContent = '';
    btnPrev.disabled = true;
    btnNext.disabled = true;
    return;
  }

  empty.classList.add('hidden');
  const start = (currentPage - 1) * PAGE_SIZE;
  const page = filteredRecords.slice(start, start + PAGE_SIZE);

  tbody.innerHTML = page.map((r) => `
    <tr class="border-t border-border hover:bg-surface-highlight transition-colors">
      ${columns.map((c) => `<td class="py-2 px-3 whitespace-nowrap">${r.data[c.name] ?? '—'}</td>`).join('')}
      <td class="py-2 px-3 text-right whitespace-nowrap">
        <button type="button" data-edit="${r.id}" class="text-primary text-xs font-semibold hover:underline mr-2">Editar</button>
        <button type="button" data-delete="${r.id}" class="text-red-500 text-xs font-semibold hover:underline">Apagar</button>
      </td>
    </tr>
  `).join('');

  const lastPage = Math.ceil(total / PAGE_SIZE);
  pageInfo.textContent = `Página ${currentPage} de ${lastPage} (${total} registos)`;
  btnPrev.disabled = currentPage === 1;
  btnNext.disabled = currentPage >= lastPage;
}
