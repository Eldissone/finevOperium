import prisma from '../lib/db.js';

export async function loadSpreadsheet(req, res, next) {
  const spreadsheetId = req.params.spreadsheetId || req.params.id;
  try {
    const spreadsheet = await prisma.spreadsheet.findFirst({
      where: { id: spreadsheetId, userId: req.user.id },
      include: { appConfig: true },
    });
    if (!spreadsheet) {
      return res.status(404).json({ error: 'Planilha não encontrada ou sem permissão.' });
    }
    req.spreadsheet = spreadsheet;
    next();
  } catch {
    res.status(500).json({ error: 'Erro ao verificar planilha.' });
  }
}
