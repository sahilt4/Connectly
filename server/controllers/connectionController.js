import Connection from '../models/Connection.js';
import User from '../models/User.js';
import Block from '../models/Block.js';
import Notification from '../models/Notification.js';

// @desc    Send a connection request
// @route   POST /api/connections/request/:recipientId
// @access  Private
export const sendConnectionRequest = async (req, res, next) => {
  try {
    const { recipientId } = req.params;

    if (recipientId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot send a connection request to yourself.',
      });
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Recipient user not found.',
      });
    }

    // Check privacy settings
    if (recipient.privacy?.whoCanConnect === 'nobody') {
      return res.status(403).json({
        success: false,
        message: 'This user is not accepting connection requests.',
      });
    }

    // Check blocks
    const isBlocked = await Block.findOne({
      $or: [
        { blocker: req.user._id, blocked: recipientId },
        { blocker: recipientId, blocked: req.user._id },
      ],
    });

    if (isBlocked) {
      return res.status(403).json({
        success: false,
        message: 'Cannot connect with this user.',
      });
    }

    // Check existing connection
    let connection = await Connection.findOne({
      $or: [
        { requester: req.user._id, recipient: recipientId },
        { requester: recipientId, recipient: req.user._id },
      ],
    });

    if (connection) {
      if (connection.status === 'accepted') {
        return res.status(400).json({
          success: false,
          message: 'You are already connected with this user.',
        });
      }
      if (connection.status === 'pending') {
        return res.status(400).json({
          success: false,
          message: 'A connection request is already pending.',
        });
      }
      // If rejected earlier, restart request
      connection.requester = req.user._id;
      connection.recipient = recipientId;
      connection.status = 'pending';
      await connection.save();
    } else {
      connection = await Connection.create({
        requester: req.user._id,
        recipient: recipientId,
        status: 'pending',
      });
    }

    // Create notification
    await Notification.create({
      recipient: recipientId,
      sender: req.user._id,
      type: 'connection_request',
      title: 'New Connection Request',
      body: `${req.user.name} sent you a connection request.`,
      data: { connectionId: connection._id },
    });

    // Real-time socket dispatch
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${recipientId}`).emit('connection_request_received', {
        connection,
        sender: req.user.toSafeObject(),
      });
    }

    res.status(201).json({
      success: true,
      message: 'Connection request sent successfully.',
      connection,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Accept a connection request
// @route   POST /api/connections/:connectionId/accept
// @access  Private
export const acceptConnectionRequest = async (req, res, next) => {
  try {
    const { connectionId } = req.params;
    const connection = await Connection.findById(connectionId).populate(
      'requester',
      'name username avatar'
    );

    if (!connection) {
      return res.status(404).json({ success: false, message: 'Connection request not found' });
    }

    if (connection.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized action' });
    }

    connection.status = 'accepted';
    await connection.save();

    // Create notification for requester
    await Notification.create({
      recipient: connection.requester._id,
      sender: req.user._id,
      type: 'connection_accepted',
      title: 'Connection Accepted',
      body: `${req.user.name} accepted your connection request.`,
      data: { connectionId: connection._id },
    });

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${connection.requester._id}`).emit('connection_accepted', {
        connection,
        user: req.user.toSafeObject(),
      });
    }

    res.status(200).json({
      success: true,
      message: 'Connection accepted.',
      connection,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject a connection request
// @route   POST /api/connections/:connectionId/reject
// @access  Private
export const rejectConnectionRequest = async (req, res, next) => {
  try {
    const { connectionId } = req.params;
    const connection = await Connection.findById(connectionId);

    if (!connection) {
      return res.status(404).json({ success: false, message: 'Connection request not found' });
    }

    if (
      connection.recipient.toString() !== req.user._id.toString() &&
      connection.requester.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, message: 'Unauthorized action' });
    }

    await Connection.findByIdAndDelete(connectionId);

    res.status(200).json({
      success: true,
      message: 'Connection request removed.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove an established connection
// @route   DELETE /api/connections/:userId
// @access  Private
export const removeConnection = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const connection = await Connection.findOneAndDelete({
      $or: [
        { requester: req.user._id, recipient: userId, status: 'accepted' },
        { requester: userId, recipient: req.user._id, status: 'accepted' },
      ],
    });

    if (!connection) {
      return res.status(404).json({ success: false, message: 'Connection not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Connection removed successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all active connections
// @route   GET /api/connections
// @access  Private
export const getConnections = async (req, res, next) => {
  try {
    const connections = await Connection.find({
      $or: [{ requester: req.user._id }, { recipient: req.user._id }],
      status: 'accepted',
    })
      .populate('requester', 'name username publicId avatar bio customStatus statusEmoji statusPreset isOnline lastActive')
      .populate('recipient', 'name username publicId avatar bio customStatus statusEmoji statusPreset isOnline lastActive')
      .sort({ updatedAt: -1 });

    const formattedList = connections.map((conn) => {
      const isRequester = conn.requester._id.toString() === req.user._id.toString();
      const otherUser = isRequester ? conn.recipient : conn.requester;
      return {
        connectionId: conn._id,
        user: otherUser,
        connectedSince: conn.updatedAt,
      };
    });

    res.status(200).json({
      success: true,
      connections: formattedList,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get pending incoming connection requests
// @route   GET /api/connections/pending
// @access  Private
export const getPendingRequests = async (req, res, next) => {
  try {
    const pending = await Connection.find({
      recipient: req.user._id,
      status: 'pending',
    })
      .populate('requester', 'name username publicId avatar bio customStatus statusEmoji isOnline')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      pendingRequests: pending,
    });
  } catch (error) {
    next(error);
  }
};
