import { Router, Response } from 'express';
import prisma from '../prismaClient';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { io } from '../socket';

const router = Router();
router.use(authenticateToken);

// 1. Get medications expiring within 6 months from OTHER pharmacies
router.get('/expiring', async (req: AuthRequest, res: Response) => {
  try {
    const pharmacyId = req.user?.pharmacyId;
    if (!pharmacyId) return res.status(403).json({ error: 'User does not belong to a pharmacy' });

    const today = new Date();
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(today.getMonth() + 6);

    const expiringItems = await prisma.inventoryItem.findMany({
      where: {
        pharmacyId: {
          not: pharmacyId, // Exclude own pharmacy
        },
        quantity: {
          gt: 0, // Only items in stock
        },
        expirationDate: {
          gte: today, // Not already expired (optional, depending on business rules)
          lte: sixMonthsFromNow,
        },
      },
      include: {
        medication: true,
        pharmacy: {
          select: {
            id: true,
            name: true,
            city: true,
            address: true,
            phone: true,
          }
        },
      },
      orderBy: {
        expirationDate: 'asc',
      },
    });

    res.json(expiringItems);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 2. Reserve an item for a customer/cadete
router.post('/reserve', async (req: AuthRequest, res: Response) => {
  try {
    const requestingPharmacyId = req.user?.pharmacyId;
    if (!requestingPharmacyId) return res.status(403).json({ error: 'User does not belong to a pharmacy' });

    const { inventoryItemId, notes } = req.body;

    const inventoryItem = await prisma.inventoryItem.findUnique({
      where: { id: inventoryItemId },
      include: { pharmacy: true, medication: true }
    });

    if (!inventoryItem) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    if (inventoryItem.quantity <= 0) {
      return res.status(400).json({ error: 'Item out of stock' });
    }

    // Create reservation
    const reservation = await prisma.reservation.create({
      data: {
        requestingPharmacyId,
        inventoryItemId,
        notes,
        status: 'PENDING',
      },
      include: {
        inventoryItem: {
          include: {
            medication: true
          }
        }
      }
    });

    // Phase 5: Emit WebSocket event to the target pharmacy to alert them!
    io.to(`pharmacy_${inventoryItem.pharmacyId}`).emit('reservation_alert', {
      message: '¡Atención! Una farmacia colega ha derivado un cliente hacia tu sucursal para buscar un medicamento.',
      reservationId: reservation.id,
      medicationName: inventoryItem.medication.name,
      requestingPharmacyId
    });

    res.status(201).json({
      message: 'Reservation created successfully',
      reservation,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 3. Get incoming reservations (customers/cadetes coming to my pharmacy)
router.get('/reservations/incoming', async (req: AuthRequest, res: Response) => {
  try {
    const pharmacyId = req.user?.pharmacyId;

    const reservations = await prisma.reservation.findMany({
      where: {
        inventoryItem: {
          pharmacyId,
        },
      },
      include: {
        inventoryItem: {
          include: {
            medication: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      }
    });

    res.json(reservations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
