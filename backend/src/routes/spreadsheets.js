import express from 'express';
import prisma from '../lib/db.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

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
    include: { appConfig: true },
  });
  if (!spreadsheet) return res.status(404).json({ error: 'Planilha não encontrada.' });
  res.json({ spreadsheet });
});

// Upload endpoint removed: spreadsheet import handled elsewhere or disabled.

router.put('/:id', async (req, res) => {
  try {
    const { fileName } = req.body;
    if (!fileName?.trim()) {
      return res.status(400).json({ error: 'Nome da planilha é obrigatório.' });
    }

    const existing = await prisma.spreadsheet.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: { appConfig: true },
    });
    if (!existing) return res.status(404).json({ error: 'Planilha não encontrada.' });

    const spreadsheet = await prisma.spreadsheet.update({
      where: { id: existing.id },
      data: { fileName: fileName.trim() },
      include: { appConfig: true },
    });

    // System name conversion removed: do not update appConfig.systemName/dashboardSetup here.

    res.json({ message: 'Planilha actualizada.', spreadsheet });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao actualizar planilha.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const existing = await prisma.spreadsheet.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!existing) return res.status(404).json({ error: 'Planilha não encontrada.' });

    await prisma.spreadsheet.delete({ where: { id: existing.id } });
    res.json({ message: 'Planilha eliminada.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao eliminar planilha.' });
  }
});

export default router;
