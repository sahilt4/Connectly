import User from '../models/User.js';
import Block from '../models/Block.js';
import Connection from '../models/Connection.js';
import path from 'path';

// @desc    Search users by name, username, or public ID
// @route   GET /api/users/search
// @access  Private
export const searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(200).json({
        success: true,
        users: [],
      });
    }

    const searchQuery = q.trim().toLowerCase();

    // Get list of blocked users
    const blocks = await Block.find({
      $or: [{ blocker: req.user._id }, { blocked: req.user._id }],
    });

    const excludedUserIds = [
      req.user._id,
      ...blocks.map((b) => (b.blocker.toString() === req.user._id.toString() ? b.blocked : b.blocker)),
    ];

    const searchRegex = new RegExp(searchQuery, 'i');

    const users = await User.find({
      _id: { $nin: excludedUserIds },
      $or: [
        { username: searchRegex },
        { name: searchRegex },
        { publicId: searchRegex },
      ],
    })
      .limit(20)
      .select('name username publicId avatar bio customStatus statusEmoji statusPreset isOnline lastActive privacy');

    const sanitizedUsers = users.map((user) => user.toSafeObject(req.user));

    res.status(200).json({
      success: true,
      users: sanitizedUsers,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get public user profile & connection status
// @route   GET /api/users/:id
// @access  Private
export const getUserProfile = async (req, res, next) => {
  try {
    const targetUserId = req.params.id;

    // Check if target user has blocked current user or vice versa
    const isBlocked = await Block.findOne({
      $or: [
        { blocker: req.user._id, blocked: targetUserId },
        { blocker: targetUserId, blocked: req.user._id },
      ],
    });

    const user = await User.findById(targetUserId).select(
      'name username publicId avatar banner bio customStatus statusEmoji statusPreset isOnline lastActive privacy closeFriends createdAt'
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    const safeUser = user.toSafeObject(req.user);
    safeUser.isBlocked = !!isBlocked;
    safeUser.isBlockedByMe = isBlocked?.blocker.toString() === req.user._id.toString();

    // Check connection status
    const connection = await Connection.findOne({
      $or: [
        { requester: req.user._id, recipient: targetUserId },
        { requester: targetUserId, recipient: req.user._id },
      ],
    });

    if (connection) {
      safeUser.connectionStatus = connection.status; // 'pending' | 'accepted' | 'rejected'
      safeUser.connectionId = connection._id;
      safeUser.isConnectionRequester = connection.requester.toString() === req.user._id.toString();
    } else {
      safeUser.connectionStatus = 'none';
      safeUser.connectionId = null;
      safeUser.isConnectionRequester = false;
    }

    // Check if in close friends
    const currentUser = await User.findById(req.user._id);
    safeUser.isCloseFriend = currentUser.closeFriends?.some(
      (cf) => cf.toString() === targetUserId
    ) || false;

    res.status(200).json({
      success: true,
      user: safeUser,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user profile by QR code public ID
// @route   GET /api/users/qr/:publicId
// @access  Private
export const getUserByPublicId = async (req, res, next) => {
  try {
    const { publicId } = req.params;
    const user = await User.findOne({ publicId: publicId.toUpperCase().trim() }).select(
      'name username publicId avatar banner bio customStatus statusEmoji statusPreset isOnline lastActive privacy createdAt'
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No user found with this QR ID.',
      });
    }

    const safeUser = user.toSafeObject(req.user);

    // Check connection status
    const connection = await Connection.findOne({
      $or: [
        { requester: req.user._id, recipient: user._id },
        { requester: user._id, recipient: req.user._id },
      ],
    });

    if (connection) {
      safeUser.connectionStatus = connection.status;
      safeUser.connectionId = connection._id;
      safeUser.isConnectionRequester = connection.requester.toString() === req.user._id.toString();
    } else {
      safeUser.connectionStatus = 'none';
      safeUser.connectionId = null;
    }

    res.status(200).json({
      success: true,
      user: safeUser,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update current user profile (Name, Username, Avatar, Bio, Status, Banner)
// @route   PUT /api/users/profile
// @access  Private
export const updateProfile = async (req, res, next) => {
  try {
    const { name, username, avatar, banner, bio, customStatus, statusEmoji, statusPreset } = req.body;
    const user = await User.findById(req.user._id);

    if (username && username.toLowerCase().trim() !== user.username) {
      const cleanUsername = username.toLowerCase().trim();
      const existingUser = await User.findOne({ username: cleanUsername });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'This username is already taken. Please choose another.',
        });
      }
      user.username = cleanUsername;
    }

    if (name) user.name = name.trim();
    if (avatar !== undefined) user.avatar = avatar;
    if (banner !== undefined) user.banner = banner;
    if (bio !== undefined) user.bio = bio;
    if (customStatus !== undefined) user.customStatus = customStatus;
    if (statusEmoji !== undefined) user.statusEmoji = statusEmoji;
    if (statusPreset !== undefined) user.statusPreset = statusPreset;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: user.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle user in Close Friends list
// @route   POST /api/users/close-friends/:userId
// @access  Private
export const toggleCloseFriend = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(req.user._id);

    const existsIndex = user.closeFriends.findIndex((id) => id.toString() === userId);
    let isCloseFriend = false;

    if (existsIndex > -1) {
      user.closeFriends.splice(existsIndex, 1);
      isCloseFriend = false;
    } else {
      user.closeFriends.push(userId);
      isCloseFriend = true;
    }

    await user.save();

    res.status(200).json({
      success: true,
      isCloseFriend,
      message: isCloseFriend ? 'Added to Close Friends' : 'Removed from Close Friends',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change password
// @route   PUT /api/users/change-password
// @access  Private
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new passwords.',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters.',
      });
    }

    const user = await User.findById(req.user._id).select('+password');

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect.',
      });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update privacy settings
// @route   PUT /api/users/privacy
// @access  Private
export const updatePrivacySettings = async (req, res, next) => {
  try {
    const {
      onlineStatus,
      readReceipts,
      profilePicture,
      whoCanMessage,
      storyVisibility,
      whoCanConnect,
      lastSeen,
    } = req.body;

    const user = await User.findById(req.user._id);

    if (onlineStatus !== undefined) user.privacy.onlineStatus = onlineStatus;
    if (readReceipts !== undefined) user.privacy.readReceipts = readReceipts;
    if (profilePicture !== undefined) user.privacy.profilePicture = profilePicture;
    if (whoCanMessage !== undefined) user.privacy.whoCanMessage = whoCanMessage;
    if (storyVisibility !== undefined) user.privacy.storyVisibility = storyVisibility;
    if (whoCanConnect !== undefined) user.privacy.whoCanConnect = whoCanConnect;
    if (lastSeen !== undefined) user.privacy.lastSeen = lastSeen;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Privacy settings updated.',
      privacy: user.privacy,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload user avatar
// @route   POST /api/users/avatar
// @access  Private
export const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file uploaded.',
      });
    }

    const avatarUrl = `/uploads/${req.file.filename}`;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: avatarUrl },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Avatar uploaded successfully.',
      avatar: avatarUrl,
      user: user.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};
