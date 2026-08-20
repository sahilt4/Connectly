import mongoose from 'mongoose';

const callSchema = new mongoose.Schema(
  {
    caller: {
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
    callType: {
      type: String,
      enum: ['audio'],
      default: 'audio',
    },
    status: {
      type: String,
      enum: ['missed', 'completed', 'declined', 'busy'],
      required: true,
      index: true,
    },
    duration: {
      type: Number,
      default: 0, // In seconds
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

callSchema.index({ caller: 1, recipient: 1, createdAt: -1 });

const Call = mongoose.model('Call', callSchema);
export default Call;
