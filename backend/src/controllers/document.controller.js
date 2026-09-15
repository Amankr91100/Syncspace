import Document from '../models/Document.js';
import asyncHandler from '../utils/asyncHandler.js';
import { required } from '../utils/validate.js';
import { logActivity } from '../services/notify.service.js';

export const listDocuments = asyncHandler(async (req, res) => {
  const docs = await Document.find({ workspace: req.workspace._id })
    .sort({ updatedAt: -1 })
    .populate('lastEditedBy', 'name avatar')
    .select('title updatedAt lastEditedBy version');
  res.json(docs);
});

export const createDocument = asyncHandler(async (req, res) => {
  const doc = await Document.create({
    title: req.body.title || 'Untitled document',
    content: req.body.content || '',
    workspace: req.workspace._id,
    createdBy: req.user._id,
    lastEditedBy: req.user._id,
  });
  const io = req.app.get('io');
  io.to(`workspace:${req.workspace._id}`).emit('document:created', doc);
  await logActivity(io, { workspace: req.workspace._id, user: req.user._id, message: `${req.user.name} created the document ${doc.title}` });
  res.status(201).json(doc);
});

export const getDocument = asyncHandler(async (req, res) => {
  const doc = await Document.findById(req.params.documentId).populate('lastEditedBy', 'name avatar');
  if (!doc || String(doc.workspace) !== String(req.workspace._id)) {
    return res.status(404).json({ message: 'Document not found' });
  }
  res.json(doc);
});

/**
 * Save a document. The client sends the `version` it loaded; if the stored
 * version has moved on, the write is rejected with 409 and the caller gets the
 * current copy back — so two editors can't silently clobber each other.
 */
export const updateDocument = asyncHandler(async (req, res) => {
  const doc = await Document.findById(req.params.documentId);
  if (!doc || String(doc.workspace) !== String(req.workspace._id)) {
    return res.status(404).json({ message: 'Document not found' });
  }

  const clientVersion = Number(req.body.version);
  if (!Number.isNaN(clientVersion) && clientVersion < doc.version) {
    return res.status(409).json({ message: 'Someone else saved this document first', document: doc });
  }

  if (req.body.title !== undefined) doc.title = req.body.title;
  if (req.body.content !== undefined) doc.content = req.body.content;
  doc.lastEditedBy = req.user._id;
  doc.version += 1;
  await doc.save();
  await doc.populate('lastEditedBy', 'name avatar');

  const io = req.app.get('io');
  // Everyone in the doc room gets the new copy; the sender ignores its own echo.
  io.to(`doc:${doc._id}`).emit('document:updated', { document: doc, by: String(req.user._id) });
  io.to(`workspace:${req.workspace._id}`).emit('document:list-changed', { documentId: doc._id });
  res.json(doc);
});

export const deleteDocument = asyncHandler(async (req, res) => {
  const doc = await Document.findById(req.params.documentId);
  if (!doc || String(doc.workspace) !== String(req.workspace._id)) {
    return res.status(404).json({ message: 'Document not found' });
  }
  await Document.findByIdAndDelete(doc._id);
  req.app.get('io').to(`workspace:${req.workspace._id}`).emit('document:deleted', { documentId: doc._id });
  res.json({ message: 'Document deleted' });
});
