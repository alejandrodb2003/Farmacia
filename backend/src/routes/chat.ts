import { Router, Response } from 'express';
import prisma from '../prismaClient';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

// Get conversations for current user
router.get('/conversations', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(403).json({ error: 'Unauthorized' });

    const conversations = await prisma.conversation.findMany({
      where: {
        members: {
          some: { userId }
        }
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, pharmacy: { select: { name: true } } } }
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    res.json(conversations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get messages for a specific user (1-to-1)
router.get('/messages/:peerUserId', async (req: AuthRequest, res: Response) => {
  try {
    const myUserId = req.user?.userId;
    const { peerUserId } = req.params;
    const { before_message_id, limit = '50' } = req.query;

    if (!myUserId) return res.status(403).json({ error: 'Unauthorized' });

    // Find the conversation
    const conversation = await prisma.conversation.findFirst({
      where: {
        type: 'DIRECT',
        AND: [
          { members: { some: { userId: myUserId } } },
          { members: { some: { userId: peerUserId } } }
        ]
      }
    });

    if (!conversation) {
      return res.json([]); // No chat history yet
    }

    let cursorQuery = {};
    if (before_message_id) {
      cursorQuery = {
        cursor: { id: before_message_id as string },
        skip: 1 // Skip the cursor itself
      };
    }

    const messages = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      take: -Number(limit), // take from the end (most recent before cursor)
      ...cursorQuery,
      orderBy: { createdAt: 'asc' } // return in chronological order
    });

    // Mark as read for any unread messages sent by peer
    const unreadMessages = messages.filter(m => m.senderId === peerUserId && m.status !== 'READ');
    if (unreadMessages.length > 0) {
      await prisma.message.updateMany({
        where: { id: { in: unreadMessages.map(m => m.id) } },
        data: { status: 'READ' }
      });
      // (The socket layer should ideal broadcast this back, but we handle it passively here)
    }

    res.json(messages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
