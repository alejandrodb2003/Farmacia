import { Router, Response } from 'express';
import prisma from '../prismaClient';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// 1. Get Settings (Only Superadmin)
router.get('/', authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    let settings = await prisma.systemSettings.findUnique({ where: { id: 'singleton' } });
    if (!settings) {
      settings = await prisma.systemSettings.create({ data: { id: 'singleton' } });
    }
    res.json(settings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 2. Update Settings (Only Superadmin)
router.put('/', authenticateToken, requireRole('SUPERADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { mpAccessToken, afipCuit, afipCert, afipKey, licensePrice, afipPtoVta } = req.body;

    const settings = await prisma.systemSettings.upsert({
      where: { id: 'singleton' },
      update: { 
        mpAccessToken, afipCuit, afipCert, afipKey,
        licensePrice: licensePrice !== undefined ? Number(licensePrice) : undefined,
        afipPtoVta: afipPtoVta !== undefined ? Number(afipPtoVta) : undefined
      },
      create: { 
        id: 'singleton', mpAccessToken, afipCuit, afipCert, afipKey,
        licensePrice: licensePrice !== undefined ? Number(licensePrice) : 10000,
        afipPtoVta: afipPtoVta !== undefined ? Number(afipPtoVta) : 1
      }
    });

    res.json(settings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
