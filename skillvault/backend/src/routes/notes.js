import { Router } from 'express';
import mongoose from 'mongoose';
import Note from '../models/Note.js';
import { protect } from '../middleware/auth.js';

const router = Router();
router.use(protect);
router.get('/', async (req, res, next) => {
  try { const notes = await Note.find({ user: req.user.id }).sort({ updatedAt: -1 }); res.json({ notes }); }
  catch (err) { next(err); }
});
router.post('/', async (req, res, next) => {
  try {
    const title = String(req.body.title || '').trim(); const content = String(req.body.content || '').trim();
    if (!title || !content) return res.status(400).json({ message: 'Title and content are required.' });
    const note = await Note.create({ title, content, user: req.user.id }); res.status(201).json({ note });
  } catch (err) { next(err); }
});
router.delete('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid note ID.' });
    const note = await Note.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!note) return res.status(404).json({ message: 'Note not found.' });
    res.json({ message: 'Note deleted.' });
  } catch (err) { next(err); }
});
export default router;
