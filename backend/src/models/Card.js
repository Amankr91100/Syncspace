import mongoose from 'mongoose';

const checklistItemSchema = new mongoose.Schema(
  { text: { type: String, required: true }, done: { type: Boolean, default: false } },
  { _id: true }
);

const activitySchema = new mongoose.Schema(
  {
    message: String,
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const cardSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    list: { type: mongoose.Schema.Types.ObjectId, ref: 'List', required: true, index: true },
    board: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true, index: true },
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    position: { type: Number, default: 0 },
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    dueDate: { type: Date, default: null },
    labels: [{ type: String }],
    checklist: [checklistItemSchema],
    attachments: [{ name: String, url: String }],
    activity: [activitySchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    completed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

cardSchema.index({ list: 1, position: 1 });
cardSchema.index({ title: 'text', description: 'text' });

export default mongoose.model('Card', cardSchema);
