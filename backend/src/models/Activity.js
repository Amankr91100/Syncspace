import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    board: { type: mongoose.Schema.Types.ObjectId, ref: 'Board' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    message: { type: String, required: true },
  },
  { timestamps: true }
);

activitySchema.index({ workspace: 1, createdAt: -1 });

export default mongoose.model('Activity', activitySchema);
