import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';
import prisma from './prismaClient';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-me';

export let io: Server;

// Redis clients for Socket.io adapter
const pubClient = createClient({ url: 'redis://localhost:6379' });
const subClient = pubClient.duplicate();

// Redis client for our custom state (Presence)
const stateClient = pubClient.duplicate();

export const initSocket = async (httpServer: HttpServer) => {
  await Promise.all([
    pubClient.connect(),
    subClient.connect(),
    stateClient.connect()
  ]);

  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    },
    adapter: createAdapter(pubClient, subClient)
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

  const broadcastUsersList = async () => {
    try {
      const usersHash = await stateClient.hGetAll('active_users');
      const usersList = Object.values(usersHash).map(val => JSON.parse(val));
      io.emit('users_list', usersList);
    } catch (err) {
      console.error(err);
    }
  };

  io.on('connection', async (socket) => {
    const userId = socket.data.user.userId;
    console.log(`User connected: ${userId} on socket ${socket.id}`);

    // Join a room with their userId so we can route messages to them across multiple devices
    socket.join(userId);

    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        include: { pharmacy: true }
      });

      if (dbUser) {
        const userInfo = {
          userId: dbUser.id,
          userName: dbUser.name,
          pharmacyId: dbUser.pharmacyId,
          pharmacyName: dbUser.pharmacy?.name || 'Superadmin',
          lastSeen: new Date()
        };

        socket.data.userInfo = userInfo;
        
        // Save in Redis Hash (key: active_users, field: userId, value: JSON)
        await stateClient.hSet('active_users', userId, JSON.stringify(userInfo));
        await broadcastUsersList();
      }
    } catch (err) {
      console.error('Error fetching user info for socket', err);
    }

    const pharmacyId = socket.data.user.pharmacyId;
    if (pharmacyId) {
      socket.join(`pharmacy_${pharmacyId}`);
    }
    socket.join('global_chat');

    // Módulo B: Mensajería Grupal (Global)
    socket.on('send_global_message', async (data) => {
      const payload = {
        id: Math.random().toString(), // temporary until db sync
        userId: socket.data.userInfo?.userId,
        userName: socket.data.userInfo?.userName,
        pharmacyId: socket.data.userInfo?.pharmacyId,
        pharmacyName: socket.data.userInfo?.pharmacyName,
        message: data.message,
        timestamp: new Date()
      };
      // Emite a todos los nodos vía Redis Adapter
      io.to('global_chat').emit('receive_global_message', payload);
    });

    // Módulo B & D: Mensajería 1 a 1 y Persistencia
    socket.on('send_private_message', async (data, callback) => {
      const { toUserId, message } = data;
      const fromUserId = socket.data.userInfo?.userId;

      if (!fromUserId || !toUserId) return;

      try {
        // 1. Encontrar o crear conversación
        let conversation = await prisma.conversation.findFirst({
          where: {
            type: 'DIRECT',
            members: {
              every: {
                userId: { in: [fromUserId, toUserId] }
              }
            }
          }
        });

        if (!conversation) {
          conversation = await prisma.conversation.create({
            data: {
              type: 'DIRECT',
              members: {
                create: [
                  { userId: fromUserId },
                  { userId: toUserId }
                ]
              }
            }
          });
        }

        // 2. Persistir mensaje
        const dbMsg = await prisma.message.create({
          data: {
            conversationId: conversation.id,
            senderId: fromUserId,
            content: message,
            status: 'SENT'
          }
        });

        const payload = {
          id: dbMsg.id,
          conversationId: conversation.id,
          fromUserId,
          fromUserName: socket.data.userInfo?.userName,
          fromPharmacyName: socket.data.userInfo?.pharmacyName,
          toUserId,
          message: dbMsg.content,
          status: dbMsg.status,
          timestamp: dbMsg.createdAt
        };

        // 3. Enviar al destinatario en tiempo real
        io.to(toUserId).emit('receive_private_message', payload);

        // 4. Enviar a otros dispositivos del emisor
        socket.to(fromUserId).emit('receive_private_message', payload);

        // 5. Confirmar envío exitoso (ACK al remitente)
        if (typeof callback === 'function') {
          callback({ status: 'ok', data: payload });
        } else {
          // Fallback emit if no callback
          socket.emit('receive_private_message', payload);
        }

      } catch (err) {
        console.error("Error sending private message", err);
        if (typeof callback === 'function') {
          callback({ status: 'error', error: 'Internal server error' });
        }
      }
    });

    // Módulo B: Confirmación de lectura (Read Receipts)
    socket.on('mark_as_read', async (data) => {
      const { messageId, fromUserId } = data;
      try {
        await prisma.message.update({
          where: { id: messageId },
          data: { status: 'READ' }
        });
        // Notificar al emisor original que su mensaje fue leído
        io.to(fromUserId).emit('message_read_receipt', { messageId, readBy: userId });
      } catch (e) {}
    });

    // Módulo C: Typing Indicators
    socket.on('typing_start', (data) => {
      const { toUserId } = data;
      io.to(toUserId).emit('user_typing', { userId, userName: socket.data.userInfo?.userName, isTyping: true });
    });

    socket.on('typing_end', (data) => {
      const { toUserId } = data;
      io.to(toUserId).emit('user_typing', { userId, userName: socket.data.userInfo?.userName, isTyping: false });
    });

    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${userId}`);
      // Remove from Redis if there are no more sockets for this user across the cluster
      // A full proper implementation checks if `io.in(userId).allSockets()` is empty
      const socketsForUser = await io.in(userId).fetchSockets();
      if (socketsForUser.length === 0) {
        await stateClient.hDel('active_users', userId);
        await broadcastUsersList();
      }
    });
  });
};
