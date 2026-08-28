const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const ACTIVE_PRINCIPLES = ['Ibuprofeno', 'Paracetamol', 'Amoxicilina', 'Losartan', 'Levotiroxina', 'Clonazepam', 'Enalapril', 'Omeprazol', 'Aspirina', 'Metformina'];
const LABS = ['Bayer', 'Roemmers', 'Raffo', 'Bagó', 'Elea', 'Casasco', 'Gador', 'Baliarda', 'Bernabó', 'Montpellier'];
const PRESENTATIONS = ['Comp. x 10', 'Comp. x 30', 'Comp. x 60', 'Jarabe 100ml', 'Gotas 20ml', 'Inyectable'];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log('Seeding Database...');

  // Create 2 users (Pharmacies)
  const password = await bcrypt.hash('123456', 10);
  
  const pharm1 = await prisma.pharmacy.create({
    data: {
      name: 'Farmacia Central',
      cuit: '30-11111111-1',
      email: 'central@farmacia.com',
      city: 'Buenos Aires',
      users: {
        create: {
          email: 'central@farmacia.com',
          password,
          name: 'Juan Central',
          role: 'SUPERADMIN'
        }
      }
    }
  });

  const pharm2 = await prisma.pharmacy.create({
    data: {
      name: 'Farmacia Del Pueblo',
      cuit: '30-22222222-2',
      email: 'pueblo@farmacia.com',
      city: 'Cordoba',
      users: {
        create: {
          email: 'pueblo@farmacia.com',
          password,
          name: 'Maria Pueblo'
        }
      }
    }
  });

  // Generate 200 Medications
  console.log('Generating 200 medications...');
  const medications = [];
  for (let i = 0; i < 200; i++) {
    const p = getRandomItem(ACTIVE_PRINCIPLES);
    const lab = getRandomItem(LABS);
    const pres = getRandomItem(PRESENTATIONS);
    
    // Barcode: fake EAN 13
    const barcode = '779' + Math.floor(1000000000 + Math.random() * 9000000000).toString();
    
    try {
      const med = await prisma.medication.create({
        data: {
          barcode,
          name: `${p} ${lab}`,
          genericName: p,
          laboratory: lab,
          presentation: pres
        }
      });
      medications.push(med);
    } catch (err) {
      // Ignore barcode duplicates
    }
  }

  // Generate some stock
  console.log('Generating stock...');
  for (let i = 0; i < 50; i++) {
    // Random stock for Pharm1
    await prisma.inventoryItem.create({
      data: {
        batch: `L-${Math.floor(Math.random() * 1000)}`,
        expirationDate: new Date(Date.now() + Math.random() * 10000000000), // Random future
        quantity: Math.floor(Math.random() * 50) + 1,
        pharmacyId: pharm1.id,
        medicationId: getRandomItem(medications).id
      }
    });

    // Random stock for Pharm2
    await prisma.inventoryItem.create({
      data: {
        batch: `L-${Math.floor(Math.random() * 1000)}`,
        expirationDate: new Date(Date.now() + Math.random() * 10000000000), // Random future
        quantity: Math.floor(Math.random() * 50) + 1,
        pharmacyId: pharm2.id,
        medicationId: getRandomItem(medications).id
      }
    });
  }

  // Create an expiring soon stock for red de vencimientos
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  
  await prisma.inventoryItem.create({
    data: {
      batch: 'L-EXPIRE-SOON',
      expirationDate: nextMonth,
      quantity: 15,
      pharmacyId: pharm2.id,
      medicationId: medications[0].id
    }
  });

  console.log('Seeding completed.');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
