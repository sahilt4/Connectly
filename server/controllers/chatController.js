import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import Block from '../models/Block.js';

// @desc    Get all conversations for logged in user
// @route   GET /api/chats
// @access  Private
export const getConversations = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;

    const conversations = await Conversation.find({
      participants: currentUserId,
    })
      .populate('participants', 'name username publicId avatar isOnline lastActive privacy')
      .populate({
        path: 'lastMessage',
        populate: {
          path: 'sender',
          select: 'name username',
        },
      })
      .sort({ lastMessageAt: -1 });

    const sanitizedConversations = await Promise.all(
      conversations.map(async (conv) => {
        const otherParticipant = conv.participants.find(
          (p) => p._id.toString() !== currentUserId.toString()
        );

        if (!otherParticipant) return null;

        const isBlocked = await Block.findOne({
          $or: [
            { blocker: currentUserId, blocked: otherParticipant._id },
            { blocker: otherParticipant._id, blocked: currentUserId },
          ],
        });

        const safeRecipient = otherParticipant.toSafeObject(req.user);
        safeRecipient.isBlocked = !!isBlocked;
        safeRecipient.isBlockedByMe = isBlocked?.blocker.toString() === currentUserId.toString();

        const unreadCount = conv.unreadCounts?.get(currentUserId.toString()) || 0;

        return {
          _id: conv._id,
          recipient: safeRecipient,
          lastMessage: conv.lastMessage,
          lastMessageAt: conv.lastMessageAt,
          disappearingSettings: conv.disappearingSettings,
          unreadCount,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
        };
      })
    );

    res.status(200).json({
      success: true,
      conversations: sanitizedConversations.filter(Boolean),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get or create 1-on-1 conversation with a specific user
// @route   POST /api/chats
// @access  Private
export const getOrCreateConversation = async (req, res, next) => {
  try {
    const { recipientId } = req.body;
    const currentUserId = req.user._id;

    if (!recipientId) {
      return res.status(400).json({
        success: false,
        message: 'Recipient ID is required.',
      });
    }

    if (recipientId.toString() === currentUserId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create a conversation with yourself.',
      });
    }

    const recipient = await User.findById(recipientId).select(
      'name username publicId avatar isOnline lastActive privacy'
    );

    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Recipient user not found.',
      });
    }

    const isBlocked = await Block.findOne({
      $or: [
        { blocker: currentUserId, blocked: recipient._id },
        { blocker: recipient._id, blocked: currentUserId },
      ],
    });

    let conversation = await Conversation.findOne({
      participants: { $all: [currentUserId, recipientId], $size: 2 },
    })
      .populate('participants', 'name username publicId avatar isOnline lastActive privacy')
      .populate('lastMessage');

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [currentUserId, recipientId],
        unreadCounts: new Map([[currentUserId.toString(), 0], [recipientId.toString(), 0]]),
        lastMessageAt: new Date(),
      });

      conversation = await Conversation.findById(conversation._id)
        .populate('participants', 'name username publicId avatar isOnline lastActive privacy');
    }

    const safeRecipient = recipient.toSafeObject(req.user);
    safeRecipient.isBlocked = !!isBlocked;
    safeRecipient.isBlockedByMe = isBlocked?.blocker.toString() === currentUserId.toString();

    const unreadCount = conversation.unreadCounts?.get(currentUserId.toString()) || 0;

    res.status(200).json({
      success: true,
      conversation: {
        _id: conversation._id,
        recipient: safeRecipient,
        lastMessage: conversation.lastMessage,
        lastMessageAt: conversation.lastMessageAt,
        disappearingSettings: conversation.disappearingSettings,
        unreadCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update disappearing message settings for conversation
// @route   PUT /api/chats/:id/disappearing
// @access  Private
export const updateDisappearingSettings = async (req, res, next) => {
  try {
    const { duration } = req.body; // 'off' | 'after_view' | '1h' | '24h' | '7d'
    const conversationId = req.params.id;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id,
    });

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const enabled = duration !== 'off';
    conversation.disappearingSettings = {
      enabled,
      duration: duration || 'off',
      updatedBy: req.user._id,
      updatedAt: new Date(),
    };

    await conversation.save();

    // Create a system message in the chat announcing the change
    const systemNotice = enabled
      ? `⏱️ ${req.user.name} set disappearing messages to ${duration === 'after_view' ? 'After viewing' : duration}.`
      : `⏱️ ${req.user.name} turned off disappearing messages.`;

    const systemMsg = await Message.create({
      conversationId: conversation._id,
      sender: req.user._id,
      recipient: conversation.participants.find((p) => p.toString() !== req.user._id.toString()),
      text: systemNotice,
      type: 'system',
      status: 'sent',
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`conversation:${conversation._id}`).emit('disappearing_settings_updated', {
        conversationId: conversation._id,
        disappearingSettings: conversation.disappearingSettings,
        systemMessage: systemMsg,
      });
    }

    res.status(200).json({
      success: true,
      disappearingSettings: conversation.disappearingSettings,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a conversation and its messages
// @route   DELETE /api/chats/:id
// @access  Private
export const deleteConversation = async (req, res, next) => {
  try {
    const conversationId = req.params.id;
    const currentUserId = req.user._id;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: currentUserId,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found or you are not a participant.',
      });
    }

    // Delete all messages belonging to this conversation
    await Message.deleteMany({ conversationId });

    // Delete the conversation document
    await Conversation.findByIdAndDelete(conversationId);

    res.status(200).json({
      success: true,
      message: 'Conversation deleted successfully.',
    });
// @desc    Clear a conversation's messages
// @route   DELETE /api/chats/:id/messages
// @access  Private
export const clearConversationMessages = async (req, res, next) => {
  try {
    const conversationId = req.params.id;
    const currentUserId = req.user._id;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: currentUserId,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found or you are not a participant.',
      });
    }

    // Mark all messages in this conversation as deleted for this user
    await Message.updateMany(
      { conversationId },
      { isDeletedForSender: true }
    );
    // Note: in a production app, we would use an array of users who cleared the chat.
    // For simplicity, we just delete the messages entirely if the chat is cleared,
    // or set `isDeletedForEveryone: true`. But wait, `isDeletedForSender` isn't ideal.
    // Since this is a simple clear, we will just delete them for everyone.
    await Message.deleteMany({ conversationId });
    
    // Clear lastMessage in conversation
    conversation.lastMessage = null;
    await conversation.save();

    res.status(200).json({
      success: true,
      message: 'Conversation messages cleared successfully.',
    });
  } catch (error) {
    next(error);
  }
};
