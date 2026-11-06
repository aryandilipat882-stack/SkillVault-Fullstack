# SkillVault — Full-Stack Knowledge Sharing App

A beginner-friendly MERN project: React + Vite, Express, MongoDB/Mongoose, JWT.

## Requirements
- Node.js 20+ and npm
- MongoDB local install or MongoDB Atlas connection string

## 1. Configure backend
```bash
cd backend
cp .env.example .env
npm install
npm run dev
```
Edit `backend/.env` and set `MONGODB_URI` and a long random `JWT_SECRET`.
Backend runs at http://localhost:5000.

## 2. Configure frontend (new terminal)
```bash
cd frontend
npm install
npm run dev
```
Open the URL printed by Vite (usually http://localhost:5173).

## Included
- Register/login with hashed passwords and JWT
- Create, list, search, update, delete knowledge posts
- Tag support
- Bookmark/unbookmark posts
- Private personal notes (create/list/delete)
- Responsive interface

## API overview
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/posts?q=&tag=`, `POST /api/posts`, `GET /api/posts/:id`, `PUT /api/posts/:id`, `DELETE /api/posts/:id`
- `GET /api/bookmarks`, `POST /api/bookmarks/:postId`, `DELETE /api/bookmarks/:postId`
- `GET /api/notes`, `POST /api/notes`, `DELETE /api/notes/:id`
- `GET /api/health`

## Before public deployment
Use a strong unique JWT secret, configure production CORS, add rate limiting and email verification, validate all input, and never commit `.env`.
