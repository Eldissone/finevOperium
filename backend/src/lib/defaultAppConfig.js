/** Configuração inicial gerada a partir da análise da planilha */
export function buildDefaultAppConfig(analysis, fileName) {
  const columns = analysis?.columns || [];
  const numericCols = columns.filter((c) => c.type === 'number');
  const textCols = columns.filter((c) => c.type === 'text');

  const formFields =
    analysis?.suggestedFormFields?.length > 0
      ? analysis.suggestedFormFields
      : columns.map((c) => ({
          name: c.name,
          type: c.type === 'number' ? 'number' : c.type === 'date' ? 'date' : 'text',
        }));

  return {
    systemName: analysis?.sectorLabel || fileName,
    themeSetup: {
      primaryColor: '#FF7A00',
      mode: 'light',
      fontFamily: 'everett',
    },
    dashboardSetup: {
      appTitle: fileName,
      kpis: (analysis?.suggestedKpis || [{ label: 'Total de registos', metric: 'count' }]).map((k) => ({
        ...k,
        enabled: true,
      })),
      charts: {
        bar: { enabled: Boolean(numericCols[0]), column: numericCols[0]?.name ?? null },
        doughnut: { enabled: Boolean(textCols[0]), column: textCols[0]?.name ?? null },
      },
    },
    formSetup: {
      fields: formFields.map((f, i) => ({
        name: f.name,
        type: f.type,
        required: false,
        visible: true,
        order: i,
      })),
    },
    isPublished: false,
  };
}

export function buildDefaultWorkflows(analysis) {
  return (analysis?.suggestedWorkflows || []).map((w, i) => ({
    name: w.name,
    trigger: { type: 'schedule', description: w.description || 'Manual' },
    action: { type: 'notify', message: w.description || w.name },
    sortOrder: i,
  }));
}
