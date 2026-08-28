import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import prisma from '../prismaClient';

export const checkLicense = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const pharmacyId = req.user?.pharmacyId;

    if (!pharmacyId) {
      // If it's a SUPERADMIN, bypass license check
      if (req.user?.role === 'SUPERADMIN') {
        return next();
      }
      return res.status(403).json({ error: 'User does not belong to a pharmacy' });
    }

    const activeLicense = await prisma.license.findFirst({
      where: {
        pharmacyId,
        status: 'ACTIVE',
        endDate: { gte: new Date() } // not expired
      }
    });

    if (!activeLicense) {
      return res.status(403).json({ error: 'LICENSE_EXPIRED', message: 'La licencia de la farmacia está inactiva o ha expirado.' });
    }

    next();
  } catch (error) {
    console.error('License check error:', error);
    res.status(500).json({ error: 'Internal server error validating license' });
  }
};
