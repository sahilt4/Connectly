import mongoose from 'mongoose';

const reactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    emoji: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    text: {
      type: String,
      default: '',
      trim: true,
    },
    type: {
      type: String,
      enum: ['text', 'image', 'video', 'audio', 'file', 'system'],
      default: 'text',
    },
    media: {
      url: { type: String, default: '' },
      fileName: { type: String, default: '' },
      fileType: { type: String, default: '' },
      fileSize: { type: Number, default: 0 },
    },
    audioDuration: {
      type: Number,
      default: 0,
    },
    waveform: {
      type: [Number],
      default: [],
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'seen'],
      default: 'sent',
      index: true,
    },
    reactions: [reactionSchema],
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
      index: true,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    isDeletedForSender: {
      type: Boolean,
      default: false,
    },
    isDeletedForEveryone: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ conversationId: 1, createdAt: -1 });

const Message = mongoose.model('Message', messageSchema);
export default Message;
