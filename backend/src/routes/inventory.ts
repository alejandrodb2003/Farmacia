import { Router, Response } from 'express';
import prisma from '../prismaClient';
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth';

const router = Router();

// Only authenticated pharmacy users can manage inventory
router.use(authenticateToken);
// router.use(requireRole('PHARMACY_ADMIN')); // If we want to restrict, but EMPLOYEE can also manage stock.

// 1. Get my pharmacy's inventory
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const pharmacyId = req.user?.pharmacyId;
    if (!pharmacyId) return res.status(403).json({ error: 'User does not belong to a pharmacy' });

    const inventory = await prisma.inventoryItem.findMany({
      where: { pharmacyId },
      include: {
        medication: true,
      },
      orderBy: {
        expirationDate: 'asc',
      },
    });

    res.json(inventory);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 2. Add an item to inventory (Scanned by barcode)
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const pharmacyId = req.user?.pharmacyId;
    if (!pharmacyId) return res.status(403).json({ error: 'User does not belong to a pharmacy' });

    const { medicationId, batch, expirationDate, quantity } = req.body;

    // Optional: check if an entry with the exact same medicationId and expirationDate exists, 
    // and just increment quantity instead of creating a new row.
    const existingItem = await prisma.inventoryItem.findFirst({
      where: {
        pharmacyId,
        medicationId,
        batch,
        expirationDate: new Date(expirationDate),
      }
    });

    if (existingItem) {
      const updated = await prisma.inventoryItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + Number(quantity) }
      });
      return res.status(200).json(updated);
    }

    const newItem = await prisma.inventoryItem.create({
      data: {
        pharmacyId,
        medicationId,
        batch,
        expirationDate: new Date(expirationDate),
        quantity: Number(quantity),
      },
    });

    res.status(201).json(newItem);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 3. Update quantity or subtract items (when sold/discarded)
router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const pharmacyId = req.user?.pharmacyId;
    const { id } = req.params;
    const { quantity } = req.body;

    const item = await prisma.inventoryItem.findUnique({ where: { id: id as string } });
    if (!item || item.pharmacyId !== pharmacyId) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    const updated = await prisma.inventoryItem.update({
      where: { id: id as string },
      data: { quantity: Number(quantity) },
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 4. Delete an item entirely
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const pharmacyId = req.user?.pharmacyId;
    const { id } = req.params;

    const item = await prisma.inventoryItem.findUnique({ where: { id: id as string } });
    if (!item || item.pharmacyId !== pharmacyId) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    await prisma.inventoryItem.delete({ where: { id: id as string } });

    res.json({ message: 'Item deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
