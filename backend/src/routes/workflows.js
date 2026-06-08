import express from 'express';
import prisma from '../lib/db.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { loadSpreadsheet } from '../middleware/spreadsheetAccess.js';

const router = express.Router({ mergeParams: true });

router.use(authMiddleware);
router.use(loadSpreadsheet);

router.get('/', async (req, res) => {
  try {
    const workflows = await prisma.workflow.findMany({
      where: { spreadsheetId: req.spreadsheet.id },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ workflows });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar workflows.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, trigger, action } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Nome do workflow é obrigatório.' });

    const workflow = await prisma.workflow.create({
      data: {
        name: name.trim(),
        trigger: trigger || { type: 'manual' },
        action: action || { type: 'notify', message: '' },
        spreadsheetId: req.spreadsheet.id,
      },
    });
    res.status(201).json({ message: 'Workflow criado.', workflow });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar workflow.' });
  }
});

router.put('/:workflowId', async (req, res) => {
  try {
    const { workflowId } = req.params;
    const existing = await prisma.workflow.findFirst({
      where: { id: workflowId, spreadsheetId: req.spreadsheet.id },
    });
    if (!existing) return res.status(404).json({ error: 'Workflow não encontrado.' });

    const { name, trigger, action } = req.body;
    const workflow = await prisma.workflow.update({
      where: { id: workflowId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(trigger !== undefined && { trigger }),
        ...(action !== undefined && { action }),
      },
    });
    res.json({ message: 'Workflow actualizado.', workflow });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao actualizar workflow.' });
  }
});

router.delete('/:workflowId', async (req, res) => {
  try {
    const { workflowId } = req.params;
    const existing = await prisma.workflow.findFirst({
      where: { id: workflowId, spreadsheetId: req.spreadsheet.id },
    });
    if (!existing) return res.status(404).json({ error: 'Workflow não encontrado.' });

    await prisma.workflow.delete({ where: { id: workflowId } });
    res.json({ message: 'Workflow removido.' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover workflow.' });
  }
});

export default router;
