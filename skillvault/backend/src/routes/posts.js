import { Router } from 'express';
import mongoose from 'mongoose';
import Post from '../models/Post.js';
import { protect } from '../middleware/auth.js';

const router = Router();
const cleanTags = (tags) => [...new Set((Array.isArray(tags) ? tags : String(tags || '').split(',')).map(t => String(t).trim().toLowerCase()).filter(Boolean))].slice(0, 8);
const validId = (id) => mongoose.isValidObjectId(id);

router.get('/', async (req, res, next) => {
  try {
    const filter = {};
    const q = String(req.query.q || '').trim();
    const tag = String(req.query.tag || '').trim().toLowerCase();
    if (q) filter.$or = [{ title: { $regex: q, $options: 'i' } }, { description: { $regex: q, $options: 'i' } }, { tags: { $regex: q, $options: 'i' } }];
    if (tag) filter.tags = tag;
    const posts = await Post.find(filter).populate('author', 'name').sort({ createdAt: -1 }).limit(100);
    res.json({ posts });
  } catch (err) { next(err); }
});

router.post('/', protect, async (req, res, next) => {
  try {
    const title = String(req.body.title || '').trim();
    const description = String(req.body.description || '').trim();
    const resourceUrl = String(req.body.resourceUrl || '').trim();
    if (!title || !description) return res.status(400).json({ message: 'Title and description are required.' });
    if (resourceUrl && !/^https?:\/\//i.test(resourceUrl)) return res.status(400).json({ message: 'Resource link must start with http:// or https://.' });
    const post = await Post.create({ title, description, resourceUrl, tags: cleanTags(req.body.tags), author: req.user.id });
    await post.populate('author', 'name');
    res.status(201).json({ post });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid post ID.' });
    const post = await Post.findById(req.params.id).populate('author', 'name');
    if (!post) return res.status(404).json({ message: 'Post not found.' });
    res.json({ post });
  } catch (err) { next(err); }
});

router.put('/:id', protect, async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid post ID.' });
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found.' });
    if (String(post.author) !== req.user.id) return res.status(403).json({ message: 'You can edit only your own posts.' });
    const title = String(req.body.title || '').trim();
    const description = String(req.body.description || '').trim();
    const resourceUrl = String(req.body.resourceUrl || '').trim();
    if (!title || !description) return res.status(400).json({ message: 'Title and description are required.' });
    if (resourceUrl && !/^https?:\/\//i.test(resourceUrl)) return res.status(400).json({ message: 'Resource link must start with http:// or https://.' });
    post.title = title; post.description = description; post.resourceUrl = resourceUrl; post.tags = cleanTags(req.body.tags);
    await post.save(); await post.populate('author', 'name');
    res.json({ post });
  } catch (err) { next(err); }
});

router.delete('/:id', protect, async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid post ID.' });
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found.' });
    if (String(post.author) !== req.user.id) return res.status(403).json({ message: 'You can delete only your own posts.' });
    await post.deleteOne();
    res.json({ message: 'Post deleted.' });
  } catch (err) { next(err); }
});
export default router;
