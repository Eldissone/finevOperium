import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../lib/db.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { email, password, name, organizationName } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
    if (password.length < 8) return res.status(400).json({ error: 'A palavra-passe deve ter pelo menos 8 caracteres.' });
    if (await prisma.user.findUnique({ where: { email } })) {
      return res.status(400).json({ error: 'Email já está em uso.' });
    }

    const passwordHash = await bcrypt.hash(password, await bcrypt.genSalt(10));
    const orgName = organizationName?.trim() || `Organização de ${name?.trim() || email.split('@')[0]}`;

    await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({ data: { name: orgName } });
      await tx.user.create({
        data: { email, passwordHash, name, organizationId: organization.id },
      });
    });

    res.status(201).json({ message: 'Utilizador registado com sucesso!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email e senha são obrigatórios.' });

    const user = await prisma.user.findUnique({ where: { email }, include: { organization: true } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(400).json({ error: 'Credenciais inválidas.' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      maxAge: 8 * 60 * 60 * 1000,
    });

    res.json({
      message: 'Login efetuado com sucesso',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        organization: user.organization ? { id: user.organization.id, name: user.organization.name } : null,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logout efetuado com sucesso' });
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, email: true, name: true, role: true,
        organization: { select: { id: true, name: true } },
      },
    });
    if (!user) return res.status(404).json({ error: 'Utilizador não encontrado.' });
    res.json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

export default router;
