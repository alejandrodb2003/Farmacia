import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-me';

export let io: Server;

export const initSocket = (httpServer: HttpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: '*', // Adjust for production
      methods: ['GET', 'POST']
    }
  });

  // Authentication middleware for sockets
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error'));

    jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
      if (err) return next(new Error('Authentication error'));
      socket.data.user = decoded;
      next();
    });
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.data.user.userId}`);
    const pharmacyId = socket.data.user.pharmacyId;

    // Join a room specific to this pharmacy to receive direct alerts
    if (pharmacyId) {
      socket.join(`pharmacy_${pharmacyId}`);
    }

    // Join the global chat room
    socket.join('global_chat');

    socket.on('send_global_message', (data) => {
      // Broadcast to everyone in global_chat
      io.to('global_chat').emit('receive_global_message', {
        userId: socket.data.user.userId,
        pharmacyId: pharmacyId,
        message: data.message,
        timestamp: new Date()
      });
    });

    socket.on('send_private_message', (data) => {
      const { toPharmacyId, message } = data;
      // Send only to the target pharmacy room
      io.to(`pharmacy_${toPharmacyId}`).emit('receive_private_message', {
        fromPharmacyId: pharmacyId,
        message,
        timestamp: new Date()
      });
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.data.user.userId}`);
    });
  });
};
