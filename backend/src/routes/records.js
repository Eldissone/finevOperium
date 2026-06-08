import express from 'express';
import prisma from '../lib/db.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router({ mergeParams: true });

router.use(authMiddleware);

// Middleware para verificar se a planilha existe e pertence ao utilizador
async function checkSpreadsheet(req, res, next) {
  const { spreadsheetId } = req.params;
  try {
    const spreadsheet = await prisma.spreadsheet.findFirst({
      where: { id: spreadsheetId, userId: req.user.id },
    });
    if (!spreadsheet) {
      return res.status(404).json({ error: 'Planilha não encontrada ou sem permissão.' });
    }
    req.spreadsheet = spreadsheet;
    next();
  } catch (err) {
    res.status(500).json({ error: 'Erro ao verificar planilha.' });
  }
}

router.use(checkSpreadsheet);

// Listar registos de uma planilha
router.get('/', async (req, res) => {
  try {
    const records = await prisma.record.findMany({
      where: { spreadsheetId: req.params.spreadsheetId },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ records });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar registos.' });
  }
});

// Criar um novo registo (ex: via formulário dinâmico)
router.post('/', async (req, res) => {
  try {
    const data = req.body; // JSON dinâmico vindo do formulário
    const record = await prisma.record.create({
      data: {
        spreadsheetId: req.params.spreadsheetId,
        data: data,
      },
    });
    res.status(201).json({ message: 'Registo criado com sucesso.', record });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar registo.' });
  }
});

// Atualizar um registo existente
router.put('/:recordId', async (req, res) => {
  try {
    const { recordId } = req.params;
    const data = req.body;
    
    // Certificar que o registo existe e pertence à planilha atual
    const existing = await prisma.record.findFirst({
      where: { id: recordId, spreadsheetId: req.params.spreadsheetId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Registo não encontrado.' });
    }

    const record = await prisma.record.update({
      where: { id: recordId },
      data: { data: data },
    });

    res.json({ message: 'Registo atualizado com sucesso.', record });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar registo.' });
  }
});

// Apagar um registo
router.delete('/:recordId', async (req, res) => {
  try {
    const { recordId } = req.params;
    
    const existing = await prisma.record.findFirst({
      where: { id: recordId, spreadsheetId: req.params.spreadsheetId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Registo não encontrado.' });
    }

    await prisma.record.delete({
      where: { id: recordId },
    });

    res.json({ message: 'Registo apagado com sucesso.' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao apagar registo.' });
  }
});

export default router;
