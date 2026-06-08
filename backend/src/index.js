import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import prisma from './lib/db.js';
import authRoutes from './routes/auth.js';
import spreadsheetRoutes from './routes/spreadsheets.js';
import recordsRoutes from './routes/records.js';
import appConfigRoutes from './routes/appConfig.js';
import workflowRoutes from './routes/workflows.js';
import { authMiddleware } from './middleware/authMiddleware.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/spreadsheets', spreadsheetRoutes);
app.use('/api/spreadsheets/:spreadsheetId/records', recordsRoutes);
app.use('/api/spreadsheets/:id/config', appConfigRoutes);
app.use('/api/spreadsheets/:spreadsheetId/workflows', workflowRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.get('/api/dashboard', authMiddleware, async (req, res) => {
  try {
    const [allSheets, recentSpreadsheets] = await Promise.all([
      prisma.spreadsheet.findMany({
        where: { userId: req.user.id },
        select: { rowCount: true, analysis: true },
      }),
      prisma.spreadsheet.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        take: 12,
        include: { appConfig: { select: { isPublished: true } } },
      }),
    ]);

    res.json({
      stats: {
        spreadsheets: allSheets.length,
        totalRows: allSheets.reduce((sum, s) => sum + s.rowCount, 0),
        lastSector: recentSpreadsheets[0]?.analysis?.sectorLabel || null,
      },
      recentSpreadsheets: recentSpreadsheets.map((s) => ({
        id: s.id,
        fileName: s.fileName,
        rowCount: s.rowCount,
        columnCount: s.columnCount,
        sectorLabel: s.analysis?.sectorLabel,
        isPublished: s.appConfig?.isPublished ?? false,
        createdAt: s.createdAt,
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

app.listen(port, () => {
  console.log(`🚀 Backend server running on port ${port}`);
});
