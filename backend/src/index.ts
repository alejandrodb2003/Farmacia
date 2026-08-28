import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import medicationRoutes from './routes/medications';
import inventoryRoutes from './routes/inventory';
import networkRoutes from './routes/network';
import billingRoutes from './routes/billing';
import settingsRoutes from './routes/settings';
import adminRoutes from './routes/admin';
import chatRoutes from './routes/chat';
import { initSocket } from './socket';
import { createServer } from 'http';

const app = express();
const port = process.env.PORT || 3001;
const httpServer = createServer(app);

initSocket(httpServer);

app.use(cors());
app.use(express.json());

import { authenticateToken } from './middleware/auth';
import { checkLicense } from './middleware/checkLicense';

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/medications', authenticateToken, medicationRoutes);
app.use('/api/inventory', authenticateToken, checkLicense, inventoryRoutes);
app.use('/api/network', authenticateToken, checkLicense, networkRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

httpServer.listen(Number(port), '0.0.0.0', () => {
  console.log(`Server running at http://localhost:${port}`);
});
