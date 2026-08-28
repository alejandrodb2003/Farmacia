import { Router, Request, Response } from 'express';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
// @ts-ignore
import Afip from '@afipsdk/afip.js';
import prisma from '../prismaClient';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

import fs from 'fs';
import path from 'path';

// Helper to get MP and AFIP instances from DB config
async function getClients() {
  const settings = await prisma.systemSettings.findUnique({ where: { id: 'singleton' } });
  
  const mpToken = settings?.mpAccessToken || process.env.MERCADOPAGO_ACCESS_TOKEN || 'TEST-TOKEN';
  const mpClient = new MercadoPagoConfig({ accessToken: mpToken });

  const resFolder = './afip_res';
  if (!fs.existsSync(resFolder)) fs.mkdirSync(resFolder);

  // Write certs from DB to disk if they exist, so afip.js can read them
  if (settings?.afipCert) fs.writeFileSync(path.join(resFolder, 'cert.pem'), settings.afipCert);
  if (settings?.afipKey) fs.writeFileSync(path.join(resFolder, 'key.pem'), settings.afipKey);

  const afipConfig: any = {
    CUIT: settings?.afipCuit ? parseInt(settings.afipCuit) : 20111111112,
    res_folder: resFolder,
    cert: 'cert.pem',
    key: 'key.pem',
    production: process.env.NODE_ENV === 'production'
  };
  const afip = new Afip(afipConfig);

  return { mpClient, afip };
}

// 1. Generate Checkout Link for a License
router.post('/checkout', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { mpClient } = await getClients();
    const pharmacyId = req.user?.pharmacyId;
    if (!pharmacyId) return res.status(403).json({ error: 'Not a pharmacy user' });

    const pharmacy = await prisma.pharmacy.findUnique({ where: { id: pharmacyId } });

    // Create a pending license record
    const today = new Date();
    const oneYearLater = new Date();
    oneYearLater.setFullYear(today.getFullYear() + 1);

    const pendingLicense = await prisma.license.create({
      data: {
        pharmacyId,
        startDate: today,
        endDate: oneYearLater,
        status: 'PENDING'
      }
    });

    const settings = await prisma.systemSettings.findUnique({ where: { id: 'singleton' } });
    const price = settings?.licensePrice || 15000;

    const preference = new Preference(mpClient);
    const result = await preference.create({
      body: {
        items: [
          {
            id: 'license_annual',
            title: 'Suscripción Anual PharmaShare',
            quantity: 1,
            unit_price: price,
            currency_id: 'ARS'
          }
        ],
        payer: {
          email: pharmacy?.email,
        },
        external_reference: pendingLicense.id, // We use this in the webhook to identify the license
        back_urls: {
          success: 'http://localhost:3000/dashboard?payment=success',
          failure: 'http://localhost:3000/dashboard?payment=failure',
          pending: 'http://localhost:3000/dashboard?payment=pending'
        },
        auto_return: 'approved'
      }
    });

    res.json({ init_point: result.init_point });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error generating checkout' });
  }
});

// 2. Webhook to receive payment notification and generate AFIP Invoice
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const { type, data } = req.body;

    if (type === 'payment') {
      const { mpClient, afip } = await getClients();
      const paymentId = data.id;
      const paymentInfo = new Payment(mpClient);
      const payment = await paymentInfo.get({ id: paymentId });

      if (payment.status === 'approved' && payment.external_reference) {
        const licenseId = payment.external_reference;

        // Update license to active
        const license = await prisma.license.update({
          where: { id: licenseId },
          data: {
            status: 'ACTIVE',
            mpPaymentId: paymentId.toString()
          },
          include: { pharmacy: true }
        });

        // 3. Generate Electronic Invoice via AFIP
        try {
          const settings = await prisma.systemSettings.findUnique({ where: { id: 'singleton' } });
          const ptoVta = settings?.afipPtoVta || 1;
          const price = settings?.licensePrice || 15000;

          const lastVoucher = await afip.ElectronicBilling.getLastVoucher(ptoVta, 11); // Tipo Comprobante 11 (Factura C)
          const newVoucherNumber = lastVoucher + 1;
          
          const date = new Date(Date.now() - ((new Date()).getTimezoneOffset() * 60000)).toISOString().split('T')[0];

          const invoiceData = {
            'CantReg': 1,  
            'PtoVta': ptoVta,  
            'CbteTipo': 11, // 11 = Factura C
            'Concepto': 2, // 2 = Servicios
            'DocTipo': 80, // 80 = CUIT
            'DocNro': Number(license.pharmacy.cuit.replace(/[^0-9]/g, '')),
            'CbteDesde': newVoucherNumber,
            'CbteHasta': newVoucherNumber,
            'CbteFch': parseInt(date.replace(/-/g, '')),
            'ImpTotal': price,
            'ImpTotConc': 0,
            'ImpNeto': price,
            'ImpOpEx': 0,
            'ImpIVA': 0,
            'ImpTrib': 0,
            'FchServDesde': parseInt(date.replace(/-/g, '')),
            'FchServHasta': parseInt(date.replace(/-/g, '')),
            'FchVtoPago': parseInt(date.replace(/-/g, '')),
            'MonId': 'PES',
            'MonCotiz': 1
          };

          const afipRes = await afip.ElectronicBilling.createVoucher(invoiceData);
          
          // Save AFIP CAE in database
          await prisma.license.update({
            where: { id: licenseId },
            data: {
              afipInvoice: `CAE: ${afipRes.CAE}, Vto: ${afipRes.CAEFchVto}`
            }
          });

          console.log(`Invoice generated successfully for pharmacy: ${license.pharmacy.name}. CAE: ${afipRes.CAE}`);

        } catch (afipError) {
          console.error('Error generating AFIP Invoice:', afipError);
          // Payment was successful, but AFIP failed. You might want to handle this gracefully (e.g. queue it).
        }
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Webhook Error');
  }
});

// 3. Get License status for a pharmacy
router.get('/license', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const pharmacyId = req.user?.pharmacyId;
    if (!pharmacyId) return res.status(403).json({ error: 'Not a pharmacy user' });

    const activeLicense = await prisma.license.findFirst({
      where: {
        pharmacyId,
        status: 'ACTIVE',
        endDate: { gte: new Date() } // Not expired
      },
      orderBy: { endDate: 'desc' }
    });

    res.json(activeLicense || { status: 'NO_ACTIVE_LICENSE' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
