import * as XLSX from 'xlsx';

const SECTOR_KEYWORDS = {
  stock: ['stock', 'estoque', 'inventario', 'inventário', 'produto', 'sku', 'quantidade', 'qtd', 'armazem', 'armazém'],
  logistics: ['entrega', 'frete', 'rota', 'motorista', 'viagem', 'destino', 'origem', 'logistica', 'logística'],
  projects: ['obra', 'projeto', 'tarefa', 'progresso', 'orcamento', 'orçamento', 'equipa', 'equipe'],
  hr: ['funcionario', 'funcionário', 'salario', 'salário', 'rh', 'presenca', 'presença', 'ferias', 'férias'],
  finance: ['valor', 'preco', 'preço', 'total', 'fatura', 'pagamento', 'receita', 'despesa', 'iva'],
  fuel: ['combustivel', 'combustível', 'litro', 'abastecimento', 'bomba'],
};

const SECTOR_LABELS = {
  stock: 'Stock & Inventário',
  logistics: 'Logística',
  projects: 'Obras & Projectos',
  hr: 'Recursos Humanos',
  finance: 'Finanças',
  fuel: 'Combustível',
  operations: 'Operações Gerais',
};

function normalizeHeader(value) {
  return String(value ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function inferColumnType(values) {
  const sample = values.filter((v) => v !== null && v !== undefined && String(v).trim() !== '').slice(0, 50);
  if (sample.length === 0) return 'text';
  const numeric = sample.filter((v) => !Number.isNaN(Number(String(v).replace(',', '.')))).length;
  const dates = sample.filter((v) => !Number.isNaN(new Date(v).getTime()) && String(v).length >= 6).length;
  if (numeric / sample.length > 0.8) return 'number';
  if (dates / sample.length > 0.6) return 'date';
  return 'text';
}

function detectSector(columns) {
  const haystack = columns.map((c) => normalizeHeader(c.name)).join(' ');
  const scores = Object.entries(SECTOR_KEYWORDS).map(([sector, words]) => ({
    sector,
    score: words.reduce((acc, word) => (haystack.includes(normalizeHeader(word)) ? acc + 1 : acc), 0),
  }));
  scores.sort((a, b) => b.score - a.score);
  return scores[0]?.score > 0 ? scores[0].sector : 'operations';
}

export function analyzeWorkbook(buffer, fileName) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('Ficheiro sem folhas legíveis.');

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false });
  if (!rows.length) throw new Error('Planilha vazia.');

  const headerRow = rows[0].map((cell, i) =>
    cell != null && String(cell).trim() !== '' ? String(cell).trim() : `coluna_${i + 1}`
  );
  const dataRows = rows.slice(1).filter((row) => row.some((cell) => cell !== null && String(cell).trim() !== ''));

  const columns = headerRow.map((name, colIndex) => {
    const columnValues = dataRows.map((row) => row[colIndex]);
    return {
      name,
      type: inferColumnType(columnValues),
      sampleValues: columnValues.filter((v) => v != null).slice(0, 3),
    };
  });

  const sector = detectSector(columns);
  const numericCols = columns.filter((c) => c.type === 'number');

  return {
    fileName,
    sheetName,
    rowCount: dataRows.length,
    columnCount: columns.length,
    analysis: {
      sector,
      sectorLabel: SECTOR_LABELS[sector],
      columns,
      suggestedKpis: [
        { label: 'Total de registos', metric: 'count' },
        ...(numericCols[0] ? [{ label: `Soma — ${numericCols[0].name}`, metric: 'sum', column: numericCols[0].name }] : []),
      ],
      suggestedWorkflows: [
        { name: 'Relatório semanal', description: 'Exportar resumo operacional por e-mail' },
        ...(sector === 'stock' ? [{ name: 'Alerta de ruptura', description: 'Notificar stock abaixo do mínimo' }] : []),
      ],
      suggestedFormFields: columns.map((col) => ({
        name: col.name,
        type: col.type === 'number' ? 'number' : col.type === 'date' ? 'date' : 'text',
      })),
      generatedAt: new Date().toISOString(),
    },
    previewRows: dataRows.slice(0, 10).map((row) => {
      const record = {};
      headerRow.forEach((header, i) => { record[header] = row[i] ?? null; });
      return record;
    }),
  };
}
