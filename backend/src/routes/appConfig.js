import express from 'express';
import prisma from '../lib/db.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { loadSpreadsheet } from '../middleware/spreadsheetAccess.js';
import { buildDefaultAppConfig, buildDefaultWorkflows } from '../lib/defaultAppConfig.js';

const router = express.Router({ mergeParams: true });

router.use(authMiddleware);
router.use(loadSpreadsheet);

async function ensureAppConfig(spreadsheet) {
  if (spreadsheet.appConfig) return spreadsheet.appConfig;

  const defaults = buildDefaultAppConfig(spreadsheet.analysis, spreadsheet.fileName);
  return prisma.appConfig.create({
    data: {
      spreadsheetId: spreadsheet.id,
      systemName: defaults.systemName,
      themeSetup: defaults.themeSetup,
      dashboardSetup: defaults.dashboardSetup,
      formSetup: defaults.formSetup,
      isPublished: false,
    },
  });
}

router.get('/', async (req, res) => {
  try {
    const config = await ensureAppConfig(req.spreadsheet);
    res.json({ config });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao carregar configuração.' });
  }
});

router.put('/', async (req, res) => {
  try {
    const { systemName, themeSetup, dashboardSetup, formSetup, isPublished } = req.body;
    const existing = await ensureAppConfig(req.spreadsheet);

    const config = await prisma.appConfig.update({
      where: { id: existing.id },
      data: {
        ...(systemName !== undefined && { systemName }),
        ...(themeSetup !== undefined && { themeSetup }),
        ...(dashboardSetup !== undefined && { dashboardSetup }),
        ...(formSetup !== undefined && { formSetup }),
        ...(isPublished !== undefined && { isPublished }),
      },
    });

    res.json({ message: 'Configuração guardada.', config });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao guardar configuração.' });
  }
});

/** Publica o sistema: grava config final e cria workflows iniciais se ainda não existirem */
router.post('/publish', async (req, res) => {
  try {
    const { systemName, themeSetup, dashboardSetup, formSetup, workflows: workflowPayload } = req.body;
    const existing = await ensureAppConfig(req.spreadsheet);

    const config = await prisma.appConfig.update({
      where: { id: existing.id },
      data: {
        ...(systemName !== undefined && { systemName }),
        ...(themeSetup !== undefined && { themeSetup }),
        ...(dashboardSetup !== undefined && { dashboardSetup }),
        ...(formSetup !== undefined && { formSetup }),
        isPublished: true,
      },
    });

    const workflowCount = await prisma.workflow.count({
      where: { spreadsheetId: req.spreadsheet.id },
    });

    if (workflowCount === 0) {
      const toCreate =
        Array.isArray(workflowPayload) && workflowPayload.length > 0
          ? workflowPayload
          : buildDefaultWorkflows(req.spreadsheet.analysis);

      if (toCreate.length > 0) {
        await prisma.workflow.createMany({
          data: toCreate.map((w) => ({
            name: w.name,
            trigger: w.trigger || { type: 'manual' },
            action: w.action || { type: 'notify', message: w.description || w.name },
            spreadsheetId: req.spreadsheet.id,
          })),
        });
      }
    }

    const workflows = await prisma.workflow.findMany({
      where: { spreadsheetId: req.spreadsheet.id },
      orderBy: { createdAt: 'asc' },
    });

    res.json({
      message: 'Sistema publicado com sucesso.',
      config,
      workflows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao publicar sistema.' });
  }
});

export default router;
