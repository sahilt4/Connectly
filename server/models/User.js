import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      match: [/^[a-z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'],
      index: true,
    },
    publicId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
      index: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    avatar: {
      type: String,
      default: '',
    },
    banner: {
      type: String,
      default: '',
    },
    bio: {
      type: String,
      default: '',
      maxlength: [250, 'Bio cannot exceed 250 characters'],
    },
    customStatus: {
      type: String,
      default: '',
      maxlength: [100, 'Custom status cannot exceed 100 characters'],
    },
    statusEmoji: {
      type: String,
      default: '🟢',
    },
    statusPreset: {
      type: String,
      enum: ['available', 'busy', 'studying', 'gaming', 'custom'],
      default: 'available',
    },
    closeFriends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      default: null,
    },
    emailVerificationExpires: {
      type: Date,
      default: null,
    },
    passwordResetToken: {
      type: String,
      default: null,
    },
    passwordResetExpires: {
      type: Date,
      default: null,
    },
    privacy: {
      onlineStatus: {
        type: String,
        enum: ['everyone', 'nobody'],
        default: 'everyone',
      },
      readReceipts: {
        type: Boolean,
        default: true,
      },
      profilePicture: {
        type: String,
        enum: ['everyone', 'nobody'],
        default: 'everyone',
      },
      whoCanMessage: {
        type: String,
        enum: ['everyone', 'contacts'],
        default: 'everyone',
      },
      storyVisibility: {
        type: String,
        enum: ['everyone', 'closeFriends', 'nobody'],
        default: 'everyone',
      },
      whoCanConnect: {
        type: String,
        enum: ['everyone', 'nobody'],
        default: 'everyone',
      },
      lastSeen: {
        type: String,
        enum: ['everyone', 'nobody'],
        default: 'everyone',
      },
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Return safe user object without password
userSchema.methods.toSafeObject = function (viewerUser = null) {
  const user = this.toObject();
  delete user.password;
  delete user.emailVerificationToken;
  delete user.emailVerificationExpires;
  delete user.passwordResetToken;
  delete user.passwordResetExpires;

  // Apply privacy filters if viewer is another user
  if (viewerUser && viewerUser._id.toString() !== user._id.toString()) {
    if (user.privacy?.onlineStatus === 'nobody') {
      user.isOnline = false;
      user.lastActive = null;
    }
    if (user.privacy?.lastSeen === 'nobody') {
      user.lastActive = null;
    }
    if (user.privacy?.profilePicture === 'nobody') {
      user.avatar = '';
    }
  }

  return user;
};

const User = mongoose.model('User', userSchema);
export default User;
