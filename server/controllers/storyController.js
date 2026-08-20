import Story from '../models/Story.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';

// @desc    Create a new story (image/video/text)
// @route   POST /api/stories
// @access  Private
export const createStory = async (req, res, next) => {
  try {
    let {
      mediaType,
      mediaUrl,
      textContent,
      textBackground,
      caption,
      stickers,
      privacy,
    } = req.body;

    // Handle file upload if present
    if (req.file) {
      mediaUrl = `/uploads/${req.file.filename}`;
      const isVideo = req.file.mimetype.startsWith('video');
      mediaType = isVideo ? 'video' : 'image';
    }

    if (!mediaType) {
      mediaType = textContent ? 'text' : 'image';
    }

    if (mediaType !== 'text' && !mediaUrl) {
      return res.status(400).json({
        success: false,
        message: 'Media URL or file is required for photo/video stories.',
      });
    }

    if (mediaType === 'text' && !textContent) {
      return res.status(400).json({
        success: false,
        message: 'Text content is required for text stories.',
      });
    }

    // Parse stickers if stringified
    let parsedStickers = [];
    if (stickers) {
      parsedStickers = typeof stickers === 'string' ? JSON.parse(stickers) : stickers;
    }

    // Stories expire strictly after 24 hours
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const story = await Story.create({
      author: req.user._id,
      mediaType,
      mediaUrl: mediaUrl || '',
      textContent: textContent || '',
      textBackground: textBackground || 'from-emerald-500 to-teal-700',
      caption: caption || '',
      stickers: parsedStickers,
      privacy: privacy || 'everyone',
      expiresAt,
    });

    const populatedStory = await Story.findById(story._id).populate(
      'author',
      'name username avatar'
    );

    // Emit real-time socket event if io is available
    const io = req.app.get('io');
    if (io) {
      io.emit('new_story', {
        story: populatedStory,
        authorId: req.user._id,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Story shared successfully (expires in 24h).',
      story: populatedStory,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all active stories grouped by user for feed
// @route   GET /api/stories/feed
// @access  Private
export const getStoriesFeed = async (req, res, next) => {
  try {
    const now = new Date();
    const currentUser = await User.findById(req.user._id);

    // Fetch accepted connections
    const Connection = (await import('../models/Connection.js')).default;
    const connections = await Connection.find({
      $or: [{ requester: req.user._id }, { recipient: req.user._id }],
      status: 'accepted',
    });

    const connectionIds = connections.map((c) =>
      c.requester.toString() === req.user._id.toString()
        ? c.recipient.toString()
        : c.requester.toString()
    );

    // Include the user's own ID
    connectionIds.push(req.user._id.toString());

    // Fetch all unexpired stories for connected users and self
    const activeStories = await Story.find({
      expiresAt: { $gt: now },
      author: { $in: connectionIds },
    })
      .populate('author', 'name username avatar closeFriends')
      .populate('viewers.user', 'name username avatar')
      .populate('reactions.user', 'name username avatar')
      .sort({ createdAt: 1 });

    // Filter stories based on privacy rules
    const visibleStories = activeStories.filter((story) => {
      const isAuthor = story.author._id.toString() === req.user._id.toString();
      if (isAuthor) return true;

      if (story.privacy === 'closeFriends') {
        // Only visible if current user is in author's closeFriends list
        return story.author.closeFriends?.some(
          (cf) => cf.toString() === req.user._id.toString()
        );
      }
      return true;
    });

    // Group stories by author
    const storiesByAuthorMap = new Map();

    visibleStories.forEach((story) => {
      const authorId = story.author._id.toString();
      const isOwn = authorId === req.user._id.toString();
      const hasViewed = story.viewers.some(
        (v) => v.user && v.user._id.toString() === req.user._id.toString()
      );

      if (!storiesByAuthorMap.has(authorId)) {
        storiesByAuthorMap.set(authorId, {
          author: story.author,
          isOwn,
          allViewed: true,
          stories: [],
          latestStoryAt: story.createdAt,
        });
      }

      const group = storiesByAuthorMap.get(authorId);
      if (!hasViewed && !isOwn) {
        group.allViewed = false;
      }
      group.stories.push({
        ...story.toObject(),
        hasViewed,
      });
      group.latestStoryAt = story.createdAt;
    });

    const feed = Array.from(storiesByAuthorMap.values()).sort((a, b) => {
      // Put own stories first, then unviewed, then recent
      if (a.isOwn) return -1;
      if (b.isOwn) return 1;
      if (!a.allViewed && b.allViewed) return -1;
      if (a.allViewed && !b.allViewed) return 1;
      return new Date(b.latestStoryAt) - new Date(a.latestStoryAt);
    });

    res.status(200).json({
      success: true,
      feed,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    View a story
// @route   POST /api/stories/:id/view
// @access  Private
export const viewStory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const story = await Story.findById(id);

    if (!story) {
      return res.status(404).json({ success: false, message: 'Story not found' });
    }

    const alreadyViewed = story.viewers.some(
      (v) => v.user.toString() === req.user._id.toString()
    );

    if (!alreadyViewed && story.author.toString() !== req.user._id.toString()) {
      story.viewers.push({
        user: req.user._id,
        viewedAt: new Date(),
      });
      await story.save();
    }

    res.status(200).json({
      success: true,
      viewersCount: story.viewers.length,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    React to a story
// @route   POST /api/stories/:id/react
// @access  Private
export const reactToStory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      return res.status(400).json({ success: false, message: 'Emoji is required' });
    }

    const story = await Story.findById(id).populate('author', 'name username');
    if (!story) {
      return res.status(404).json({ success: false, message: 'Story not found' });
    }

    // Check existing reaction from user
    const existingIndex = story.reactions.findIndex(
      (r) => r.user.toString() === req.user._id.toString()
    );

    if (existingIndex > -1) {
      story.reactions[existingIndex].emoji = emoji;
      story.reactions[existingIndex].createdAt = new Date();
    } else {
      story.reactions.push({
        user: req.user._id,
        emoji,
        createdAt: new Date(),
      });
    }

    await story.save();

    // Create notification if reacting to someone else's story
    if (story.author._id.toString() !== req.user._id.toString()) {
      await Notification.create({
        recipient: story.author._id,
        sender: req.user._id,
        type: 'story_reaction',
        title: `${req.user.name} reacted ${emoji} to your story`,
        body: story.caption || 'Story reaction',
        data: { storyId: story._id, emoji },
      });

      const io = req.app.get('io');
      if (io) {
        io.to(`user:${story.author._id}`).emit('notification_received', {
          type: 'story_reaction',
          sender: req.user,
          emoji,
          storyId: story._id,
        });
      }
    }

    res.status(200).json({
      success: true,
      reactions: story.reactions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reply to a story (creates direct chat message)
// @route   POST /api/stories/:id/reply
// @access  Private
export const replyToStory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Reply text is required' });
    }

    const story = await Story.findById(id).populate('author', 'name username');
    if (!story) {
      return res.status(404).json({ success: false, message: 'Story not found' });
    }

    const recipientId = story.author._id;

    // Record reply on story
    story.replies.push({
      user: req.user._id,
      text: text.trim(),
      createdAt: new Date(),
    });
    await story.save();

    // Find or create conversation with story author
    let conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, recipientId], $size: 2 },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user._id, recipientId],
        unreadCounts: { [recipientId.toString()]: 0, [req.user._id.toString()]: 0 },
      });
    }

    // Send story reply message into chat
    const storyMediaPreview = story.mediaType === 'text' ? `Story: "${story.textContent.slice(0, 40)}..."` : `Replying to your story 📸`;
    const message = await Message.create({
      conversationId: conversation._id,
      sender: req.user._id,
      recipient: recipientId,
      text: `💬 *Replying to story:* "${storyMediaPreview}"\n\n${text.trim()}`,
      type: 'text',
      status: 'sent',
    });

    conversation.lastMessage = message._id;
    conversation.lastMessageAt = new Date();
    const currentUnread = conversation.unreadCounts.get(recipientId.toString()) || 0;
    conversation.unreadCounts.set(recipientId.toString(), currentUnread + 1);
    await conversation.save();

    // Emit socket events
    const io = req.app.get('io');
    if (io) {
      io.to(`conversation:${conversation._id}`).emit('new_message', { message });
      io.to(`user:${recipientId}`).emit('new_message', { message, conversationId: conversation._id });
    }

    res.status(200).json({
      success: true,
      message: 'Reply sent as a message.',
      chatMessage: message,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a story (author only)
// @route   DELETE /api/stories/:id
// @access  Private
export const deleteStory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const story = await Story.findById(id);

    if (!story) {
      return res.status(404).json({ success: false, message: 'Story not found' });
    }

    if (story.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized to delete this story' });
    }

    await Story.findByIdAndDelete(id);

    const io = req.app.get('io');
    if (io) {
      io.emit('story_deleted', { storyId: id, authorId: req.user._id });
    }

    res.status(200).json({
      success: true,
      message: 'Story deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
