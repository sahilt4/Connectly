import mongoose from 'mongoose';

const storyViewerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    viewedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const storyReactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    emoji: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const storyReplySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      required: true,
      maxlength: 500,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const storySchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    mediaType: {
      type: String,
      enum: ['image', 'video', 'text'],
      required: true,
    },
    mediaUrl: {
      type: String,
      default: '',
    },
    textContent: {
      type: String,
      default: '',
      maxlength: 500,
    },
    textBackground: {
      type: String,
      default: 'from-emerald-500 to-teal-700',
    },
    caption: {
      type: String,
      default: '',
      maxlength: 300,
    },
    stickers: [
      {
        emoji: String,
        x: Number,
        y: Number,
        scale: { type: Number, default: 1 },
      },
    ],
    privacy: {
      type: String,
      enum: ['everyone', 'closeFriends', 'selected'],
      default: 'everyone',
    },
    allowedViewers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    viewers: [storyViewerSchema],
    reactions: [storyReactionSchema],
    replies: [storyReplySchema],
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index to automatically remove stories once expired after 24h
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Story = mongoose.model('Story', storySchema);
export default Story;
