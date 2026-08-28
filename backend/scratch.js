const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.updateMany({
  where: { email: 'central@farmacia.com' },
  data: { role: 'SUPERADMIN' }
}).then(() => console.log('Done'));
