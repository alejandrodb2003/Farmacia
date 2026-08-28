import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import prisma from './prismaClient';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-me';

export let io: Server;

// In-memory list of connected users
// We'll store { socketId, userId, userName, pharmacyId, pharmacyName }
const connectedUsers = new Map<string, any>();

export const initSocket = (httpServer: HttpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: '*', // Adjust for production
      methods: ['GET', 'POST']
    }
  });

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error'));

    jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
      if (err) return next(new Error('Authentication error'));
      socket.data.user = decoded;
      next();
    });
  });

  io.on('connection', async (socket) => {
    const userId = socket.data.user.userId;
    console.log(`User connected: ${userId}`);

    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        include: { pharmacy: true }
      });

      if (dbUser) {
        const userInfo = {
          socketId: socket.id,
          userId: dbUser.id,
          userName: dbUser.name,
          pharmacyId: dbUser.pharmacyId,
          pharmacyName: dbUser.pharmacy?.name || 'Superadmin'
        };

        connectedUsers.set(socket.id, userInfo);
        socket.data.userInfo = userInfo;

        // Broadcast updated user list
        io.emit('users_list', Array.from(connectedUsers.values()));
      }
    } catch (err) {
      console.error('Error fetching user info for socket', err);
    }

    const pharmacyId = socket.data.user.pharmacyId;
    if (pharmacyId) {
      socket.join(`pharmacy_${pharmacyId}`);
    }

    socket.join('global_chat');

    socket.on('send_global_message', (data) => {
      io.to('global_chat').emit('receive_global_message', {
        userId: socket.data.userInfo?.userId,
        userName: socket.data.userInfo?.userName,
        pharmacyId: socket.data.userInfo?.pharmacyId,
        pharmacyName: socket.data.userInfo?.pharmacyName,
        message: data.message,
        timestamp: new Date()
      });
    });

    socket.on('send_private_message', (data) => {
      const { toSocketId, message } = data;
      // Send to the target socket
      io.to(toSocketId).emit('receive_private_message', {
        fromSocketId: socket.id,
        fromUserId: socket.data.userInfo?.userId,
        fromUserName: socket.data.userInfo?.userName,
        fromPharmacyName: socket.data.userInfo?.pharmacyName,
        message,
        timestamp: new Date()
      });

      // Send to self so sender sees it too (optional, handled by client usually, but just in case)
      socket.emit('receive_private_message', {
        fromSocketId: socket.id,
        fromUserId: socket.data.userInfo?.userId,
        fromUserName: socket.data.userInfo?.userName,
        fromPharmacyName: socket.data.userInfo?.pharmacyName,
        toSocketId,
        message,
        timestamp: new Date()
      });
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${userId}`);
      connectedUsers.delete(socket.id);
      io.emit('users_list', Array.from(connectedUsers.values()));
    });
  });
};
