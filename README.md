# Setil

Monorepo for a Chrome Extension frontend and a FastAPI backend.

## Layout

- `apps/extension`: Chrome Extension built with React, Vite, and Manifest V3
- `apps/backend`: FastAPI backend prepared for Vercel Serverless and Neon Postgres
- `packages/shared`: Shared TypeScript interfaces and utilities

## Getting started

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Start the extension dev server:

   ```bash
   pnpm dev:extension
   ```

3. Run the backend locally:

   ```bash
   pnpm dev:backend
   ```

4. Set `DATABASE_URL` and `JWT_SECRET` in `.env` before connecting the backend to DB.