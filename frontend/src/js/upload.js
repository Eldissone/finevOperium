import '../index.css';
import { apiFetch, requireAuth } from './api.js';

document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('upload-form');
  const fileInput = document.getElementById('file');
  const dropZone = document.getElementById('drop-zone');
  const statusEl = document.getElementById('upload-status');
  const resultEl = document.getElementById('analysis-result');

  await requireAuth();

  if (dropZone && fileInput) {
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('border-primary'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('border-primary'));
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('border-primary');
      if (e.dataTransfer.files.length) fileInput.files = e.dataTransfer.files;
    });
  }

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!fileInput?.files?.length) {
      statusEl.textContent = 'Seleccione um ficheiro Excel ou CSV.';
      statusEl.className = 'text-red-500 text-sm';
      return;
    }

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    statusEl.textContent = 'A analisar planilha...';
    statusEl.className = 'text-primary text-sm';
    resultEl.classList.add('hidden');

    try {
      const data = await apiFetch('/api/spreadsheets/upload', { method: 'POST', body: formData });
      statusEl.textContent = 'Análise concluída!';
      statusEl.className = 'text-green-600 text-sm';
      const { spreadsheet } = data;
      const a = spreadsheet.analysis;
      resultEl.innerHTML = `
        <div class="glass-card p-6 space-y-4">
          <h3 class="font-display text-xl font-bold">${a.sectorLabel}</h3>
          <p class="text-sm text-text-muted">${spreadsheet.fileName} — ${spreadsheet.rowCount} linhas</p>
          <a href="/src/page/spreadsheet.html?id=${spreadsheet.id}" class="inline-block bg-primary text-white font-bold py-2 px-6 rounded-lg">Ver detalhes</a>
        </div>
      `;
      resultEl.classList.remove('hidden');
    } catch (err) {
      statusEl.textContent = err.message;
      statusEl.className = 'text-red-500 text-sm';
    }
  });
});
