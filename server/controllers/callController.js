import Call from '../models/Call.js';
import Notification from '../models/Notification.js';

// @desc    Log a completed or missed call
// @route   POST /api/calls/log
// @access  Private
export const logCall = async (req, res, next) => {
  try {
    const { recipientId, status, duration, startedAt, endedAt } = req.body;

    const call = await Call.create({
      caller: req.user._id,
      recipient: recipientId,
      callType: 'audio',
      status: status || 'completed',
      duration: duration || 0,
      startedAt: startedAt || new Date(),
      endedAt: endedAt || new Date(),
    });

    // If missed or declined, create notification for recipient
    if (status === 'missed') {
      await Notification.create({
        recipient: recipientId,
        sender: req.user._id,
        type: 'call_missed',
        title: 'Missed Audio Call',
        body: `You missed an audio call from ${req.user.name}.`,
        data: { callId: call._id },
      });

      const io = req.app.get('io');
      if (io) {
        io.to(`user:${recipientId}`).emit('notification_received', {
          type: 'call_missed',
          sender: req.user,
          callId: call._id,
        });
      }
    }

    const populatedCall = await Call.findById(call._id)
      .populate('caller', 'name username avatar')
      .populate('recipient', 'name username avatar');

    res.status(201).json({
      success: true,
      call: populatedCall,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's call history
// @route   GET /api/calls/history
// @access  Private
export const getCallHistory = async (req, res, next) => {
  try {
    const calls = await Call.find({
      $or: [{ caller: req.user._id }, { recipient: req.user._id }],
    })
      .populate('caller', 'name username avatar')
      .populate('recipient', 'name username avatar')
      .sort({ createdAt: -1 })
      .limit(50);

    const formattedCalls = calls.map((c) => {
      const isCaller = c.caller._id.toString() === req.user._id.toString();
      const peer = isCaller ? c.recipient : c.caller;
      return {
        ...c.toObject(),
        isCaller,
        peer,
      };
    });

    res.status(200).json({
      success: true,
      calls: formattedCalls,
    });
  } catch (error) {
    next(error);
  }
};
