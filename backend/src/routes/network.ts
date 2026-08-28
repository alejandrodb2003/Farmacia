import { Router, Response } from 'express';
import prisma from '../prismaClient';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { io } from '../socket';
import PDFDocument from 'pdfkit';

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

    const { search } = req.query;

    let whereClause: any = {
      pharmacyId: {
        not: pharmacyId, // Exclude own pharmacy
      },
      quantity: {
        gt: 0, // Only items in stock
      },
      expirationDate: {
        gte: today, // Not already expired
        lte: sixMonthsFromNow,
      },
    };

    if (search && typeof search === 'string' && search.trim() !== '') {
      whereClause.medication = {
        OR: [
          { name: { contains: search } },
          { genericName: { contains: search } },
          { laboratory: { contains: search } }
        ]
      };
    }

    const expiringItems = await prisma.inventoryItem.findMany({
      where: whereClause,
      include: {
        medication: true,
        pharmacy: {
          select: { id: true, name: true, city: true, address: true, phone: true }
        },
      },
      orderBy: { expirationDate: 'asc' },
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

    const { inventoryItemId, notes, pickupMethod, personName } = req.body;

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

    const requestingPharmacy = await prisma.pharmacy.findUnique({ where: { id: requestingPharmacyId } });

    // Generate random 4-digit PIN
    const securityPin = Math.floor(1000 + Math.random() * 9000).toString();

    // Create reservation
    const reservation = await prisma.reservation.create({
      data: {
        requestingPharmacyId,
        inventoryItemId,
        notes,
        pickupMethod: pickupMethod || 'CLIENTE',
        personName,
        securityPin,
        status: 'PENDING',
      },
      include: {
        inventoryItem: {
          include: { medication: true }
        }
      }
    });

    const alertMessage = `${pickupMethod === 'CADETE' ? 'Un cadete' : 'Un cliente'} de la farmacia ${requestingPharmacy?.name} está en camino: ${personName}.`;

    io.to(`pharmacy_${inventoryItem.pharmacyId}`).emit('reservation_alert', {
      message: alertMessage,
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

// 3. Complete a reservation with PIN
router.post('/reservations/:id/complete', async (req: AuthRequest, res: Response) => {
  try {
    const pharmacyId = req.user?.pharmacyId as string;
    const { id } = req.params;
    const { pin } = req.body;

    if (!pharmacyId) return res.status(403).json({ error: 'Unauthorized' });

    const reservation = (await prisma.reservation.findUnique({
      where: { id: id as string },
      include: { inventoryItem: true }
    })) as any;

    if (!reservation) return res.status(404).json({ error: 'Reservation not found' });
    if (reservation.inventoryItem?.pharmacyId !== pharmacyId) return res.status(403).json({ error: 'Unauthorized' });
    if (reservation.status !== 'PENDING') return res.status(400).json({ error: 'Reservation is not pending' });

    if (reservation.securityPin !== pin) {
      return res.status(400).json({ error: 'PIN incorrecto' });
    }

    await prisma.$transaction([
      prisma.reservation.update({
        where: { id: id as string },
        data: { status: 'FULFILLED' }
      }),
      prisma.inventoryItem.update({
        where: { id: reservation.inventoryItemId },
        data: { quantity: { decrement: 1 } }
      })
    ]);

    res.json({ message: 'Reservation completed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 4. Get PDF Ticket
router.get('/reservations/:id/ticket', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const reservation = (await prisma.reservation.findUnique({
      where: { id: id as string },
      include: {
        inventoryItem: {
          include: { medication: true, pharmacy: true }
        }
      }
    })) as any;

    if (!reservation) return res.status(404).send('Not found');
    const reqPharmacy = await prisma.pharmacy.findUnique({ where: { id: reservation.requestingPharmacyId } });

    // Setup 80mm receipt format (approx 226 points wide)
    const doc = new PDFDocument({ size: [226, 400], margin: 10 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="ticket-${id}.pdf"`);
    doc.pipe(res);

    doc.font('Helvetica-Bold').fontSize(14).text('PHARMASHARE', { align: 'center' });
    doc.fontSize(10).text('Ticket de Retiro', { align: 'center' });
    doc.moveDown();

    doc.font('Helvetica-Bold').fontSize(10).text('Origen (Quien retira):');
    doc.font('Helvetica').fontSize(10).text(reqPharmacy?.name || 'Desconocida');
    doc.moveDown();

    doc.font('Helvetica-Bold').text('Destino (Donde buscar):');
    doc.font('Helvetica').text(reservation.inventoryItem.pharmacy.name);
    doc.text(reservation.inventoryItem.pharmacy.address || '');
    doc.moveDown();

    doc.font('Helvetica-Bold').text('Persona / Cadete:');
    doc.font('Helvetica').text(reservation.personName || 'No especificado');
    doc.moveDown();

    doc.font('Helvetica-Bold').text('Medicamento:');
    doc.font('Helvetica').text(reservation.inventoryItem.medication.name);
    doc.text(`Lote: ${reservation.inventoryItem.batch || 'N/A'}`);
    doc.moveDown();

    doc.font('Helvetica-Bold').fontSize(12).text('PIN DE SEGURIDAD', { align: 'center' });
    doc.font('Helvetica-Bold').fontSize(24).text(reservation.securityPin || '----', { align: 'center' });
    
    doc.moveDown();
    doc.font('Helvetica').fontSize(8).text(`ID: ${reservation.id}`, { align: 'center' });
    
    doc.end();

  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});

// 5. Get incoming reservations (customers/cadetes coming to my pharmacy)
router.get('/reservations/incoming', async (req: AuthRequest, res: Response) => {
  try {
    const pharmacyId = req.user?.pharmacyId;

    const reservations = (await prisma.reservation.findMany({
      where: {
        inventoryItem: {
          pharmacyId,
        },
      },
      include: {
        inventoryItem: {
          include: { medication: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })) as any[];

    // We also need the requesting pharmacy name for the frontend
    const reservationsWithPharmacy = await Promise.all(reservations.map(async (r) => {
      const requestingPharmacy = await prisma.pharmacy.findUnique({ where: { id: r.requestingPharmacyId } });
      return {
        ...r,
        requestingPharmacyName: requestingPharmacy?.name
      };
    }));

    res.json(reservationsWithPharmacy);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
