import Block from '../models/Block.js';
import Report from '../models/Report.js';
import User from '../models/User.js';

// @desc    Block a user
// @route   POST /api/safety/block
// @access  Private
export const blockUser = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const currentUserId = req.user._id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID to block is required.',
      });
    }

    if (userId.toString() === currentUserId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot block yourself.',
      });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    const existingBlock = await Block.findOne({
      blocker: currentUserId,
      blocked: userId,
    });

    if (existingBlock) {
      return res.status(400).json({
        success: false,
        message: 'This user is already blocked.',
      });
    }

    await Block.create({
      blocker: currentUserId,
      blocked: userId,
    });

    res.status(200).json({
      success: true,
      message: `Blocked @${targetUser.username}.`,
      blockedUserId: userId,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Unblock a user
// @route   POST /api/safety/unblock
// @access  Private
export const unblockUser = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const currentUserId = req.user._id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID to unblock is required.',
      });
    }

    const result = await Block.findOneAndDelete({
      blocker: currentUserId,
      blocked: userId,
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Block relationship not found.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'User unblocked successfully.',
      unblockedUserId: userId,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get list of blocked users
// @route   GET /api/safety/blocked
// @access  Private
export const getBlockedUsers = async (req, res, next) => {
  try {
    const blocks = await Block.find({ blocker: req.user._id })
      .populate('blocked', 'name username publicId avatar')
      .sort({ createdAt: -1 });

    const blockedUsers = blocks.map((b) => b.blocked).filter(Boolean);

    res.status(200).json({
      success: true,
      blockedUsers,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Report a user
// @route   POST /api/safety/report
// @access  Private
export const reportUser = async (req, res, next) => {
  try {
    const { reportedUserId, reason, details } = req.body;
    const reporterId = req.user._id;

    if (!reportedUserId || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Reported user ID and reason are required.',
      });
    }

    if (reportedUserId.toString() === reporterId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot report yourself.',
      });
    }

    const targetUser = await User.findById(reportedUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    const report = await Report.create({
      reporter: reporterId,
      reported: reportedUserId,
      reason,
      details: details ? details.trim() : '',
    });

    res.status(201).json({
      success: true,
      message: 'Report submitted successfully. Thank you for keeping the community safe.',
      reportId: report._id,
    });
  } catch (error) {
    next(error);
  }
};
