import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import prisma from './lib/db.js';
import authRoutes from './routes/auth.js';
import spreadsheetRoutes from './routes/spreadsheets.js';
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

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.get('/api/dashboard', authMiddleware, async (req, res) => {
  try {
    const spreadsheets = await prisma.spreadsheet.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    res.json({
      stats: {
        spreadsheets: spreadsheets.length,
        totalRows: spreadsheets.reduce((sum, s) => sum + s.rowCount, 0),
        lastSector: spreadsheets[0]?.analysis?.sectorLabel || null,
      },
      recentSpreadsheets: spreadsheets.map((s) => ({
        id: s.id,
        fileName: s.fileName,
        rowCount: s.rowCount,
        columnCount: s.columnCount,
        sectorLabel: s.analysis?.sectorLabel,
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
