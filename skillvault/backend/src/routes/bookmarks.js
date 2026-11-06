import { Router } from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Post from '../models/Post.js';
import { protect } from '../middleware/auth.js';

const router = Router();
router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate({ path: 'bookmarks', populate: { path: 'author', select: 'name' } });
    res.json({ posts: user.bookmarks || [] });
  } catch (err) { next(err); }
});
router.post('/:postId', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.postId)) return res.status(400).json({ message: 'Invalid post ID.' });
    if (!(await Post.exists({ _id: req.params.postId }))) return res.status(404).json({ message: 'Post not found.' });
    await User.findByIdAndUpdate(req.user.id, { $addToSet: { bookmarks: req.params.postId } });
    res.json({ message: 'Post bookmarked.' });
  } catch (err) { next(err); }
});
router.delete('/:postId', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.postId)) return res.status(400).json({ message: 'Invalid post ID.' });
    await User.findByIdAndUpdate(req.user.id, { $pull: { bookmarks: req.params.postId } });
    res.json({ message: 'Bookmark removed.' });
  } catch (err) { next(err); }
});
export default router;
