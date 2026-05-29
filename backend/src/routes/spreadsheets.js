import express from 'express';
import multer from 'multer';
import prisma from '../lib/db.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { analyzeWorkbook } from '../lib/spreadsheetAnalyzer.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.use(authMiddleware);

router.get('/', async (req, res) => {
  const spreadsheets = await prisma.spreadsheet.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ spreadsheets });
});

router.get('/:id', async (req, res) => {
  const spreadsheet = await prisma.spreadsheet.findFirst({
    where: { id: req.params.id, userId: req.user.id },
  });
  if (!spreadsheet) return res.status(404).json({ error: 'Planilha não encontrada.' });
  res.json({ spreadsheet });
});

router.post('/upload', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Ficheiro em falta.' });

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const result = analyzeWorkbook(req.file.buffer, req.file.originalname);

    const spreadsheet = await prisma.spreadsheet.create({
      data: {
        fileName: result.fileName,
        sheetName: result.sheetName,
        rowCount: result.rowCount,
        columnCount: result.columnCount,
        status: 'READY',
        analysis: result.analysis,
        previewRows: result.previewRows,
        userId: user.id,
        organizationId: user.organizationId,
      },
    });

    res.status(201).json({
      message: 'Planilha analisada com sucesso.',
      spreadsheet: {
        id: spreadsheet.id,
        fileName: spreadsheet.fileName,
        rowCount: spreadsheet.rowCount,
        columnCount: spreadsheet.columnCount,
        analysis: spreadsheet.analysis,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message || 'Erro ao processar planilha' });
  }
});

export default router;
