import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import Block from '../models/Block.js';

// Helper to compute expiration date based on disappearing setting
const getExpirationDate = (durationSetting) => {
  if (!durationSetting || durationSetting === 'off') return null;
  const now = Date.now();
  switch (durationSetting) {
    case '1h':
      return new Date(now + 60 * 60 * 1000);
    case '24h':
      return new Date(now + 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(now + 7 * 24 * 60 * 60 * 1000);
    case 'after_view':
      return new Date(now + 2 * 60 * 1000); // 2 mins after viewing
    default:
      return null;
  }
};

// @desc    Get messages for a conversation (with disappearing cleanup)
// @route   GET /api/messages/:conversationId
// @access  Private
export const getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const currentUserId = req.user._id;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: currentUserId,
    });

    if (!conversation) {
      return res.status(403).json({
        success: false,
        message: 'You are not a participant in this conversation.',
      });
    }

    // Reset unread count for current user
    if (conversation.unreadCounts) {
      conversation.unreadCounts.set(currentUserId.toString(), 0);
      await conversation.save();
    }

    // Cleanup expired messages
    await Message.deleteMany({
      conversationId,
      expiresAt: { $ne: null, $lt: new Date() },
    });

    // Update status to 'seen' for messages sent to current user
    await Message.updateMany(
      {
        conversationId,
        recipient: currentUserId,
        status: { $ne: 'seen' },
      },
      { status: 'seen' }
    );

    const messages = await Message.find({
      conversationId,
      $or: [
        { sender: currentUserId, isDeletedForSender: false },
        { recipient: currentUserId },
      ],
    })
      .populate('sender', 'name username avatar')
      .populate('recipient', 'name username avatar')
      .populate({
        path: 'replyTo',
        select: 'text type media sender audioDuration',
        populate: { path: 'sender', select: 'name username' },
      })
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      messages,
      disappearingSettings: conversation.disappearingSettings,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send a message (Text, Image, Video, Audio/Voice, File)
// @route   POST /api/messages
// @access  Private
export const sendMessage = async (req, res, next) => {
  try {
    const {
      conversationId,
      recipientId,
      text,
      type,
      media,
      replyToId,
      audioDuration,
      waveform,
    } = req.body;
    const senderId = req.user._id;

    if (!text && !media?.url) {
      return res.status(400).json({
        success: false,
        message: 'Message must contain text or an attachment.',
      });
    }

    let conversation;
    let targetRecipientId = recipientId;

    if (conversationId) {
      conversation = await Conversation.findOne({
        _id: conversationId,
        participants: senderId,
      });

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found.',
        });
      }

      targetRecipientId = conversation.participants.find(
        (p) => p.toString() !== senderId.toString()
      );
    } else if (recipientId) {
      conversation = await Conversation.findOne({
        participants: { $all: [senderId, recipientId], $size: 2 },
      });

      if (!conversation) {
        conversation = await Conversation.create({
          participants: [senderId, recipientId],
          unreadCounts: new Map([[senderId.toString(), 0], [recipientId.toString(), 0]]),
        });
      }
    }

    if (!conversation || !targetRecipientId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid conversation or recipient.',
      });
    }

    // Check if blocked
    const isBlocked = await Block.findOne({
      $or: [
        { blocker: senderId, blocked: targetRecipientId },
        { blocker: targetRecipientId, blocked: senderId },
      ],
    });

    if (isBlocked) {
      return res.status(403).json({
        success: false,
        message: 'Cannot send message because one of the users is blocked.',
      });
    }

    // Determine message type
    let determinedType = type || 'text';
    if (!type && media?.url) {
      if (media.fileType?.startsWith('image/')) determinedType = 'image';
      else if (media.fileType?.startsWith('video/')) determinedType = 'video';
      else if (media.fileType?.startsWith('audio/')) determinedType = 'audio';
      else determinedType = 'file';
    }

    // Calculate expiration if disappearing messages are enabled
    const expiresAt = conversation.disappearingSettings?.enabled
      ? getExpirationDate(conversation.disappearingSettings.duration)
      : null;

    const newMessage = await Message.create({
      conversationId: conversation._id,
      sender: senderId,
      recipient: targetRecipientId,
      text: text || '',
      type: determinedType,
      media: media || { url: '', fileName: '', fileType: '', fileSize: 0 },
      audioDuration: audioDuration || 0,
      waveform: waveform || [],
      replyTo: replyToId || null,
      expiresAt,
      status: 'sent',
    });

    // Update conversation
    conversation.lastMessage = newMessage._id;
    conversation.lastMessageAt = new Date();
    const currentUnread = conversation.unreadCounts?.get(targetRecipientId.toString()) || 0;
    conversation.unreadCounts.set(targetRecipientId.toString(), currentUnread + 1);
    await conversation.save();

    const populatedMessage = await Message.findById(newMessage._id)
      .populate('sender', 'name username avatar')
      .populate('recipient', 'name username avatar')
      .populate({
        path: 'replyTo',
        select: 'text type media sender audioDuration',
        populate: { path: 'sender', select: 'name username' },
      });

    res.status(201).json({
      success: true,
      message: populatedMessage,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get shared media, files, audio, and links in a conversation
// @route   GET /api/messages/conversation/:conversationId/media
// @access  Private
export const getSharedMedia = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const currentUserId = req.user._id;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: currentUserId,
    });

    if (!conversation) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const messages = await Message.find({
      conversationId,
      isDeletedForEveryone: false,
    })
      .populate('sender', 'name username')
      .sort({ createdAt: -1 });

    const photosAndVideos = [];
    const audio = [];
    const files = [];
    const links = [];

    const urlRegex = /(https?:\/\/[^\s]+)/g;

    messages.forEach((msg) => {
      if (msg.type === 'image' || msg.type === 'video') {
        photosAndVideos.push(msg);
      } else if (msg.type === 'audio') {
        audio.push(msg);
      } else if (msg.type === 'file') {
        files.push(msg);
      }

      // Check for links in text
      if (msg.text) {
        const matches = msg.text.match(urlRegex);
        if (matches) {
          matches.forEach((url) => {
            links.push({
              _id: msg._id,
              url,
              sender: msg.sender,
              createdAt: msg.createdAt,
            });
          });
        }
      }
    });

    res.status(200).json({
      success: true,
      photosAndVideos,
      audio,
      files,
      links,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Edit a message
// @route   PUT /api/messages/:id
// @access  Private
export const editMessage = async (req, res, next) => {
  try {
    const { text } = req.body;
    const messageId = req.params.id;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message text cannot be empty.',
      });
    }

    const message = await Message.findOne({
      _id: messageId,
      sender: req.user._id,
      isDeletedForEveryone: false,
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found or you cannot edit this message.',
      });
    }

    message.text = text.trim();
    message.isEdited = true;
    await message.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name username avatar')
      .populate('recipient', 'name username avatar')
      .populate({
        path: 'replyTo',
        select: 'text type media sender audioDuration',
        populate: { path: 'sender', select: 'name username' },
      });

    res.status(200).json({
      success: true,
      message: populatedMessage,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a message
// @route   DELETE /api/messages/:id
// @access  Private
export const deleteMessage = async (req, res, next) => {
  try {
    const { deleteForEveryone } = req.body;
    const messageId = req.params.id;
    const currentUserId = req.user._id;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found.',
      });
    }

    const isSender = message.sender.toString() === currentUserId.toString();
    const isRecipient = message.recipient.toString() === currentUserId.toString();

    if (!isSender && !isRecipient) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized.',
      });
    }

    if (deleteForEveryone && isSender) {
      message.isDeletedForEveryone = true;
      message.text = 'This message was deleted';
      message.media = { url: '', fileName: '', fileType: '', fileSize: 0 };
      message.reactions = [];
      await message.save();
    } else {
      if (isSender) {
        message.isDeletedForSender = true;
      }
      await message.save();
    }

    res.status(200).json({
      success: true,
      message: 'Message deleted.',
      messageId: message._id,
      isDeletedForEveryone: message.isDeletedForEveryone,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    React to a message
// @route   POST /api/messages/:id/react
// @access  Private
export const reactToMessage = async (req, res, next) => {
  try {
    const { emoji } = req.body;
    const messageId = req.params.id;
    const currentUserId = req.user._id;

    if (!emoji) {
      return res.status(400).json({
        success: false,
        message: 'Emoji is required.',
      });
    }

    const message = await Message.findById(messageId);

    if (!message || message.isDeletedForEveryone) {
      return res.status(404).json({
        success: false,
        message: 'Message not found.',
      });
    }

    const existingIndex = message.reactions.findIndex(
      (r) => r.userId.toString() === currentUserId.toString() && r.emoji === emoji
    );

    if (existingIndex > -1) {
      message.reactions.splice(existingIndex, 1);
    } else {
      message.reactions = message.reactions.filter(
        (r) => r.userId.toString() !== currentUserId.toString()
      );
      message.reactions.push({ userId: currentUserId, emoji });
    }

    await message.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name username avatar')
      .populate('recipient', 'name username avatar')
      .populate({
        path: 'replyTo',
        select: 'text type media sender audioDuration',
        populate: { path: 'sender', select: 'name username' },
      });

    res.status(200).json({
      success: true,
      message: populatedMessage,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload attachment file (Image, Video, Audio, Doc)
// @route   POST /api/messages/upload
// @access  Private
export const uploadAttachment = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded.',
      });
    }

    const fileUrl = `/uploads/${req.file.filename}`;

    res.status(200).json({
      success: true,
      media: {
        url: fileUrl,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
      },
    });
  } catch (error) {
    next(error);
  }
};
