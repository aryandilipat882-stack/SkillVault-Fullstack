import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 140 },
  description: { type: String, required: true, trim: true, maxlength: 8000 },
  tags: [{ type: String, trim: true, lowercase: true, maxlength: 30 }],
  resourceUrl: { type: String, trim: true, default: '' },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

export default mongoose.model('Post', postSchema);
