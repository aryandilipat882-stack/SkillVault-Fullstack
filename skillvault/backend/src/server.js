import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import postRoutes from './routes/posts.js';
import bookmarkRoutes from './routes/bookmarks.js';
import noteRoutes from './routes/notes.js';

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));


app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'SkillVault API' }));
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/notes', noteRoutes);
app.use((_req, res) => res.status(404).json({ message: 'Route not found.' }));
app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.code === 11000) return res.status(409).json({ message: 'That value already exists.' });
  res.status(500).json({ message: 'Server error. Check backend terminal.' });
});

const port = process.env.PORT || 5000;
try { await connectDB(); app.listen(port, () => console.log(`SkillVault API running on http://localhost:${port}`)); }
catch (err) { console.error('Could not start server:', err.message); process.exit(1); }
