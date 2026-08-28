const fs = require('fs');
const archiver = require('archiver');

const output = fs.createWriteStream('update.zip');
const archive = archiver('zip', { zlib: { level: 9 } });

archive.pipe(output);

archive.file('backend/prisma/schema.prisma', { name: 'backend/prisma/schema.prisma' });
archive.file('backend/src/routes/settings.ts', { name: 'backend/src/routes/settings.ts' });
archive.file('backend/src/routes/admin.ts', { name: 'backend/src/routes/admin.ts' });
archive.file('backend/src/index.ts', { name: 'backend/src/index.ts' });
archive.file('backend/src/routes/network.ts', { name: 'backend/src/routes/network.ts' });
archive.file('frontend/src/app/dashboard/admin/page.tsx', { name: 'frontend/src/app/dashboard/admin/page.tsx' });
archive.file('frontend/src/app/dashboard/red/page.tsx', { name: 'frontend/src/app/dashboard/red/page.tsx' });

archive.finalize();
