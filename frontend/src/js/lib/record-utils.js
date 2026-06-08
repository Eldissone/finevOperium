export function buildRecordPayload(formEl, fields) {
  const formData = new FormData(formEl);
  const recordData = {};
  formData.forEach((value, key) => {
    const fieldConfig = fields.find((f) => f.name === key);
    if (fieldConfig?.type === 'number' && value !== '') {
      recordData[key] = Number(value);
    } else {
      recordData[key] = value || null;
    }
  });
  return recordData;
}

export function renderFormFields(container, fields, values = {}) {
  const visible = [...fields].filter((f) => f.visible !== false).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  container.innerHTML = visible.map((field) => {
    const val = values[field.name] ?? '';
    const req = field.required ? 'required' : '';
    let inputHtml = '';
    if (field.type === 'number') {
      inputHtml = `<input type="number" step="any" id="field-${field.name}" name="${field.name}" value="${val}" ${req} class="w-full bg-surface-highlight border border-border rounded px-4 py-2 focus:outline-none focus:border-primary">`;
    } else if (field.type === 'date') {
      const dateVal = val ? String(val).slice(0, 10) : '';
      inputHtml = `<input type="date" id="field-${field.name}" name="${field.name}" value="${dateVal}" ${req} class="w-full bg-surface-highlight border border-border rounded px-4 py-2 focus:outline-none focus:border-primary">`;
    } else {
      inputHtml = `<input type="text" id="field-${field.name}" name="${field.name}" value="${escapeAttr(val)}" ${req} class="w-full bg-surface-highlight border border-border rounded px-4 py-2 focus:outline-none focus:border-primary">`;
    }
    return `
      <div>
        <label class="block text-sm font-medium mb-1" for="field-${field.name}">${field.name}${field.required ? ' *' : ''}</label>
        ${inputHtml}
      </div>
    `;
  }).join('');
}

function escapeAttr(str) {
  return String(str ?? '').replace(/"/g, '&quot;');
}
