import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../prismaClient';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-me';

// Register Pharmacy and its Admin user
router.post('/register', async (req: Request, res: Response) => {
  const { pharmacyName, cuit, email, password, address, city } = req.body;

  try {
    // 1. Check if pharmacy/user already exists
    const existingPharmacy = await prisma.pharmacy.findUnique({ where: { cuit } });
    if (existingPharmacy) {
      return res.status(400).json({ error: 'Pharmacy with this CUIT already exists' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    // 2. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Create Pharmacy and User in a transaction
    const result = await prisma.$transaction(async (prismaClient) => {
      const pharmacy = await prismaClient.pharmacy.create({
        data: {
          name: pharmacyName,
          cuit,
          email,
          address,
          city,
        },
      });

      const user = await prismaClient.user.create({
        data: {
          name: 'Admin ' + pharmacyName,
          email,
          password: hashedPassword,
          role: 'PHARMACY_ADMIN',
          pharmacyId: pharmacy.id,
        },
      });

      return { pharmacy, user };
    });

    res.status(201).json({ message: 'Registration successful', pharmacy: result.pharmacy.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, pharmacyId: user.pharmacyId },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({ token, role: user.role, pharmacyId: user.pharmacyId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
