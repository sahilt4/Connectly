import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import Block from '../models/Block.js';
import Call from '../models/Call.js';

// Map of userId -> Set of socket IDs
const onlineUsers = new Map();

export const initSocket = (io) => {
  // Socket Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(' ')[1] ||
        socket.handshake.query?.token;

      if (!token) {
        return next(new Error('Authentication error: No token provided.'));
      }

      const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_nova_communication_mvp_2026';
      const decoded = jwt.verify(token, secret);
      const user = await User.findById(decoded.id).select(
        'name username publicId avatar bio customStatus statusEmoji statusPreset privacy'
      );

      if (!user) {
        return next(new Error('Authentication error: User not found.'));
      }

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token.'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user._id.toString();

    // Register user in online tracking map
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // Join personal user room
    socket.join(`user:${userId}`);

    // Update user status in DB
    await User.findByIdAndUpdate(userId, {
      isOnline: true,
      lastActive: new Date(),
    });

    // Broadcast online status if user privacy allows
    if (socket.user.privacy?.onlineStatus !== 'nobody') {
      socket.broadcast.emit('user_status_changed', {
        userId,
        isOnline: true,
        lastActive: new Date(),
        customStatus: socket.user.customStatus,
        statusEmoji: socket.user.statusEmoji,
      });
    }

    // Send currently online user list to connected socket
    const onlineUserList = Array.from(onlineUsers.keys());
    socket.emit('online_users_list', onlineUserList);

    // 1. Join Conversation Room
    socket.on('join_conversation', ({ conversationId }) => {
      if (conversationId) {
        socket.join(`conversation:${conversationId}`);
      }
    });

    // 2. Leave Conversation Room
    socket.on('leave_conversation', ({ conversationId }) => {
      if (conversationId) {
        socket.leave(`conversation:${conversationId}`);
      }
    });

    // 3. Typing Indicators
    socket.on('typing_start', ({ conversationId, recipientId }) => {
      if (conversationId) {
        socket.to(`conversation:${conversationId}`).emit('user_typing', {
          conversationId,
          userId,
          name: socket.user.name,
          username: socket.user.username,
        });
      }
      if (recipientId) {
        io.to(`user:${recipientId}`).emit('user_typing', {
          conversationId,
          userId,
          name: socket.user.name,
          username: socket.user.username,
        });
      }
    });

    socket.on('typing_stop', ({ conversationId, recipientId }) => {
      if (conversationId) {
        socket.to(`conversation:${conversationId}`).emit('user_stop_typing', {
          conversationId,
          userId,
        });
      }
      if (recipientId) {
        io.to(`user:${recipientId}`).emit('user_stop_typing', {
          conversationId,
          userId,
        });
      }
    });

    // 4. Real-time Message Sending via Socket
    socket.on('send_message', async (data, callback) => {
      try {
        const { conversationId, recipientId, text, type, media, replyToId, audioDuration, waveform } = data;

        let conv;
        let targetRecipientId = recipientId;

        if (conversationId) {
          conv = await Conversation.findOne({
            _id: conversationId,
            participants: userId,
          });
          if (conv) {
            targetRecipientId = conv.participants.find(
              (p) => p.toString() !== userId
            );
          }
        } else if (recipientId) {
          conv = await Conversation.findOne({
            participants: { $all: [userId, recipientId], $size: 2 },
          });

          if (!conv) {
            conv = await Conversation.create({
              participants: [userId, recipientId],
              unreadCounts: new Map([[userId, 0], [recipientId, 0]]),
            });
          }
        }

        if (!conv || !targetRecipientId) {
          if (typeof callback === 'function') callback({ error: 'Invalid conversation.' });
          return;
        }

        // Determine message type
        let determinedType = type || 'text';
        if (!type && media?.url) {
          if (media.fileType?.startsWith('image/')) determinedType = 'image';
          else if (media.fileType?.startsWith('video/')) determinedType = 'video';
          else if (media.fileType?.startsWith('audio/')) determinedType = 'audio';
          else determinedType = 'file';
        }

        const isRecipientOnline = onlineUsers.has(targetRecipientId.toString());

        const newMsg = await Message.create({
          conversationId: conv._id,
          sender: userId,
          recipient: targetRecipientId,
          text: text || '',
          type: determinedType,
          media: media || { url: '', fileName: '', fileType: '', fileSize: 0 },
          audioDuration: audioDuration || 0,
          waveform: waveform || [],
          replyTo: replyToId || null,
          status: isRecipientOnline ? 'delivered' : 'sent',
        });

        conv.lastMessage = newMsg._id;
        conv.lastMessageAt = new Date();
        const cur = conv.unreadCounts?.get(targetRecipientId.toString()) || 0;
        conv.unreadCounts.set(targetRecipientId.toString(), cur + 1);
        await conv.save();

        const populatedMsg = await Message.findById(newMsg._id)
          .populate('sender', 'name username avatar')
          .populate('recipient', 'name username avatar')
          .populate({
            path: 'replyTo',
            select: 'text type media sender audioDuration',
            populate: { path: 'sender', select: 'name username' },
          });

        // Broadcast to conversation room
        io.to(`conversation:${conv._id}`).emit('new_message', {
          message: populatedMsg,
          conversationId: conv._id,
        });

        // Also emit directly to recipient personal room
        io.to(`user:${targetRecipientId}`).emit('new_message', {
          message: populatedMsg,
          conversationId: conv._id,
        });

        if (typeof callback === 'function') callback({ success: true, message: populatedMsg });
      } catch (err) {
        if (typeof callback === 'function') callback({ error: err.message });
      }
    });

    // 5. Message Read / Seen Status
    socket.on('mark_seen', async ({ conversationId, messageIds }) => {
      try {
        if (conversationId) {
          await Message.updateMany(
            {
              conversationId,
              recipient: userId,
              status: { $ne: 'seen' },
            },
            { status: 'seen' }
          );

          socket.to(`conversation:${conversationId}`).emit('messages_seen', {
            conversationId,
            seenBy: userId,
            seenAt: new Date(),
          });
        }
      } catch (err) {
        console.error('Socket mark_seen error:', err);
      }
    });

    // ==========================================
    // 6. WebRTC AUDIO CALL SIGNALING
    // ==========================================
    socket.on('call_start', ({ recipientId, offer, callType = 'audio' }) => {
      io.to(`user:${recipientId}`).emit('incoming_call', {
        caller: {
          _id: socket.user._id,
          name: socket.user.name,
          username: socket.user.username,
          avatar: socket.user.avatar,
        },
        offer,
        callType,
        timestamp: new Date(),
      });
    });

    socket.on('call_accepted', ({ callerId, answer }) => {
      io.to(`user:${callerId}`).emit('call_answered', {
        answer,
        recipient: {
          _id: socket.user._id,
          name: socket.user.name,
          avatar: socket.user.avatar,
        },
      });
    });

    socket.on('call_rejected', ({ callerId, reason }) => {
      io.to(`user:${callerId}`).emit('call_declined', {
        recipientId: userId,
        reason: reason || 'declined',
      });
    });

    socket.on('call_end', ({ peerId, duration }) => {
      io.to(`user:${peerId}`).emit('call_ended', {
        by: userId,
        duration,
      });
    });

    socket.on('ice_candidate', ({ targetUserId, candidate }) => {
      io.to(`user:${targetUserId}`).emit('ice_candidate', {
        senderId: userId,
        candidate,
      });
    });

    // ==========================================
    // 7. Status & Presence Updates
    // ==========================================
    socket.on('update_custom_status', ({ customStatus, statusEmoji, statusPreset }) => {
      socket.broadcast.emit('user_status_changed', {
        userId,
        isOnline: true,
        customStatus,
        statusEmoji,
        statusPreset,
      });
    });

    // ==========================================
    // 8. Disconnect Handler
    // ==========================================
    socket.on('disconnect', async () => {
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);

          // Update user last active in DB
          await User.findByIdAndUpdate(userId, {
            isOnline: false,
            lastActive: new Date(),
          });

          // Broadcast offline event if privacy allows
          if (socket.user.privacy?.onlineStatus !== 'nobody') {
            socket.broadcast.emit('user_status_changed', {
              userId,
              isOnline: false,
              lastActive: new Date(),
            });
          }
        }
      }
    });
  });
};
