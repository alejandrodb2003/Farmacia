import { Router, Response } from 'express';
import prisma from '../prismaClient';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import bcrypt from 'bcrypt';

const router = Router();

// =======================
// PHARMACIES CRUD
// =======================

router.get('/pharmacies', authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const pharmacies = await prisma.pharmacy.findMany({
      include: {
        users: {
          select: { id: true, name: true, email: true, role: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(pharmacies);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/pharmacies', authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, cuit, email, phone, address, city } = req.body;
    
    // Check if CUIT exists
    const existing = await prisma.pharmacy.findUnique({ where: { cuit } });
    if (existing) {
      return res.status(400).json({ error: 'Ya existe una farmacia con ese CUIT' });
    }

    const pharmacy = await prisma.pharmacy.create({
      data: { name, cuit, email, phone, address, city }
    });
    res.status(201).json(pharmacy);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/pharmacies/:id', authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, cuit, email, phone, address, city } = req.body;
    const pharmacy = await prisma.pharmacy.update({
      where: { id },
      data: { name, cuit, email, phone, address, city }
    });
    res.json(pharmacy);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =======================
// USERS CRUD
// =======================

router.get('/users', authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, pharmacyId: true, pharmacy: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/users', authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, password, role, pharmacyId } = req.body;
    
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || 'USER',
        pharmacyId: pharmacyId || null
      },
      select: { id: true, name: true, email: true, role: true, pharmacyId: true }
    });
    res.status(201).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/users/:id', authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, email, role, pharmacyId, password } = req.body;
    
    let dataToUpdate: any = { name, email, role, pharmacyId };
    
    if (password) {
      dataToUpdate.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: { id: true, name: true, email: true, role: true, pharmacyId: true }
    });
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
