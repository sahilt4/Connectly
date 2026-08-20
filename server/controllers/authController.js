import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { generatePublicId, generateRandomToken } from '../utils/helpers.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/email.js';

const generateToken = (id) => {
  const secret = process.env.JWT_SECRET || 'dev_secret_key_change_in_production_123456';
  return jwt.sign({ id }, secret, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res, next) => {
  try {
    const { name, username, email, password } = req.body;

    if (!name || !username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, username, email, and password.',
      });
    }

    // Check if username or email already exists
    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase().trim() },
        { username: username.toLowerCase().trim() },
      ],
    });

    if (existingUser) {
      if (existingUser.email === email.toLowerCase().trim()) {
        return res.status(400).json({
          success: false,
          message: 'An account with this email address already exists.',
        });
      }
      if (existingUser.username === username.toLowerCase().trim()) {
        return res.status(400).json({
          success: false,
          message: 'This username is already taken. Please choose another.',
        });
      }
    }

    // Generate unique public ID
    let publicId = generatePublicId();
    let idExists = await User.findOne({ publicId });
    while (idExists) {
      publicId = generatePublicId();
      idExists = await User.findOne({ publicId });
    }

    // Verification token
    const verificationToken = generateRandomToken();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await User.create({
      name: name.trim(),
      username: username.toLowerCase().trim(),
      email: email.toLowerCase().trim(),
      password,
      publicId,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
      isEmailVerified: false,
    });

    // Send verification email
    const emailResult = await sendVerificationEmail(user, verificationToken);

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: user.toSafeObject(),
      verificationToken: emailResult.devMode ? verificationToken : undefined,
      message: 'Registration successful! Please check your email to verify your account.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email/username and password.',
      });
    }

    const cleanIdentifier = identifier.toLowerCase().trim();

    // Find user by email or username or publicId
    const user = await User.findOne({
      $or: [
        { email: cleanIdentifier },
        { username: cleanIdentifier },
        { publicId: cleanIdentifier.toUpperCase() },
      ],
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please check your details and try again.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please check your details and try again.',
      });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
      user: user.toSafeObject(),
      message: 'Logged in successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      user: user.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify email address
// @route   POST /api/auth/verify-email
// @access  Public
export const verifyEmail = async (req, res, next) => {
  try {
    const { token, email } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required.',
      });
    }

    const query = {
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() },
    };

    if (email) {
      query.email = email.toLowerCase().trim();
    }

    const user = await User.findOne(query);

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired email verification token.',
      });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Email address verified successfully!',
      user: user.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resend verification email
// @route   POST /api/auth/resend-verification
// @access  Private
export const resendVerification = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Your email address is already verified.',
      });
    }

    const verificationToken = generateRandomToken();
    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    const emailResult = await sendVerificationEmail(user, verificationToken);

    res.status(200).json({
      success: true,
      message: 'Verification link sent to your email address.',
      verificationToken: emailResult.devMode ? verificationToken : undefined,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your email address.',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Always respond with success to prevent user enumeration
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If an account exists with that email, a password reset link has been sent.',
      });
    }

    const resetToken = generateRandomToken();
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const emailResult = await sendPasswordResetEmail(user, resetToken);

    res.status(200).json({
      success: true,
      message: 'If an account exists with that email, a password reset link has been sent.',
      resetToken: emailResult.devMode ? resetToken : undefined,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = async (req, res, next) => {
  try {
    const { token, email, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters.',
      });
    }

    const query = {
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() },
    };

    if (email) {
      query.email = email.toLowerCase().trim();
    }

    const user = await User.findOne(query).select('+password');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset token.',
      });
    }

    user.password = password;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successfully! You can now log in with your new password.',
    });
  } catch (error) {
    next(error);
  }
};
