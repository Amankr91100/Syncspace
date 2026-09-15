import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, default: 'Untitled document' },
    content: { type: String, default: '' }, // HTML from the rich text editor
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastEditedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // Incremented on every save. Clients send the version they started from so a
    // stale write can be rejected instead of silently overwriting someone else.
    version: { type: Number, default: 0 },
  },
  { timestamps: true }
);

documentSchema.index({ title: 'text', content: 'text' });

export default mongoose.model('Document', documentSchema);
