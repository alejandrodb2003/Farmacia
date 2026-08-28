import { Router, Request, Response } from 'express';
import prisma from '../prismaClient';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Protect all medication routes (only logged in users can search or add)
router.use(authenticateToken);

// 1. Get medication by barcode
router.get('/barcode/:barcode', async (req: Request, res: Response) => {
  try {
    const { barcode } = req.params;
    const medication = await prisma.medication.findUnique({
      where: { barcode: barcode as string },
    });

    if (!medication) {
      return res.status(404).json({ message: 'Medication not found in global catalog.' });
    }

    res.json(medication);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 2. Add new medication to the global catalog
router.post('/', async (req: Request, res: Response) => {
  const { barcode, name, genericName, laboratory, presentation } = req.body;

  try {
    const existing = await prisma.medication.findUnique({ where: { barcode: barcode as string } });
    if (existing) {
      return res.status(400).json({ error: 'Medication with this barcode already exists' });
    }

    const medication = await prisma.medication.create({
      data: {
        barcode,
        name,
        genericName,
        laboratory,
        presentation,
      },
    });

    res.status(201).json(medication);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 3. Search medications by name or generic name (useful if barcode is unreadable)
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    const medications = await prisma.medication.findMany({
      where: {
        OR: [
          { name: { contains: q as string } },
          { genericName: { contains: q as string } },
        ],
      },
      take: 20, // Limit results
    });

    res.json(medications);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
