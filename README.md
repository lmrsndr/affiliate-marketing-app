# BundleBee Affiliate Marketing App

This repository contains a Vue 3/Vite frontend and an Express/Mongoose backend.

## Project Structure

- `frontend/` - Vue 3 app built with Vite.
- `backend/` - Express API using MongoDB through Mongoose.

## Prerequisites

- Node.js 20+ recommended.
- npm 10+ recommended.
- A reachable MongoDB database for the backend.
- Google OAuth credentials if testing Google login.

## Environment Files

Backend:

```bash
cp backend/.env.example backend/.env
```

Frontend:

```bash
cp frontend/.env.example frontend/.env
```

For local development, set `frontend/.env` to point at the backend API root:

```bash
VITE_API_URL=http://localhost:5000/api
```

## Install

Install each package separately:

```bash
npm --prefix frontend ci
npm --prefix backend ci
```

Do not use `--force` for normal installation.

### Backend Multer/GridFS Note

The backend currently uses `multer-gridfs-storage@5.0.2`, whose peer dependency is declared as `multer@^1.4.2`. The package has not been updated for the newer Multer LTS peer range, so npm may print a peer warning.

The stabilisation change pins backend Multer to `1.4.4`, the latest non-prerelease version that satisfies `multer-gridfs-storage`'s stale peer range and allows `npm ci` without `--force` or `--legacy-peer-deps`.

This is a temporary compatibility pin, not the proper long-term fix. `multer@1.4.4` is deprecated, and the long-term fix is to replace `multer-gridfs-storage` with a maintained upload path, such as direct `multer` memory/disk storage plus the MongoDB GridFS bucket API or S3, then upgrade to Multer 2.x.

## Run Locally

Start the backend:

```bash
npm --prefix backend run start
```

Start the frontend dev server in another terminal:

```bash
npm --prefix frontend run dev
```

Default local URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`
- Backend health: `http://localhost:5000/api/health`

## Build

Build the frontend:

```bash
npm --prefix frontend run build
```

The Vite production build output is `frontend/dist/`.

## Deployment Notes

This project is split into two deployable parts:

- Frontend: static Vue/Vite site from `frontend/dist/`.
- Backend: Node/Express API from `backend/server.js`.

### Frontend Deployment

Install and build from the repository root:

```bash
npm --prefix frontend ci
npm --prefix frontend run build
```

Publish the generated `frontend/dist/` directory as the static site output. The frontend dev server is Vite and defaults to `http://localhost:5173`:

```bash
npm --prefix frontend run dev
```

Set `VITE_API_URL` at build time. It must point at the backend API root and include `/api`:

```bash
VITE_API_URL=https://api.example.com/api
```

For local development:

```bash
VITE_API_URL=http://localhost:5000/api
```

### Backend Deployment

Install and start from the repository root:

```bash
npm --prefix backend ci
npm --prefix backend run start
```

The backend start command runs:

```bash
node server.js
```

The backend listens on `PORT`, defaulting to `5000` when `PORT` is unset. It requires a reachable MongoDB database through `MONGO_URI`; startup exits if `MONGO_URI` or required auth secrets are missing.

### Backend Environment Variables

Required for backend startup:

- `NODE_ENV`
- `PORT`
- `MONGO_URI`
- `SESSION_SECRET`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`

Required for correct production browser/API behavior:

- `FRONTEND_URL`
- `CORS_ORIGINS`
- `COOKIE_DOMAIN`
- `COOKIE_NAME`

Required for email delivery in production:

- `EMAIL_ZOHO`
- `PASS_ZOHO`

Required for accounting receipt/invoice upload and signed URL features:

- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_S3_BUCKET_NAME`

Optional or feature-specific:

- `JWT_OTP_SECRET`
- `EMAIL_USER`
- `EMAIL_HOST`
- `EMAIL_PORT`
- `EMAIL_SECURE`
- `EMAIL_PASS`
- `CLOUDFLARE_WORKER_URL`
- `MONGO_FLE_MASTER_KEY`
- `DEBUG_2FA_CONTEXT`

Use [backend/.env.example](/home/s-ndrlm-r/Projects/affiliate-marketing-app/backend/.env.example) and [frontend/.env.example](/home/s-ndrlm-r/Projects/affiliate-marketing-app/frontend/.env.example) as the source of truth for local placeholder values. Do not put real secrets in the repository.

### Production Checklist

- Set `NODE_ENV=production`.
- Configure `MONGO_URI` to a production MongoDB database reachable from the backend host.
- Set strong unique values for `SESSION_SECRET`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, and preferably `JWT_OTP_SECRET`.
- Set `FRONTEND_URL` to the public frontend origin.
- Set `VITE_API_URL` to the public backend API root, including `/api`, before building the frontend.
- Set `COOKIE_DOMAIN` only when cookies must be shared across the production domain/subdomains.
- Confirm backend CORS allows the deployed frontend origin.
- Configure Google OAuth redirect URI to match the deployed backend callback.
- Configure email credentials if password reset or email 2FA are enabled.
- Configure S3 credentials if accounting file upload/signing endpoints are enabled.
- Run `npm --prefix frontend run build`.
- Run backend syntax checks or tests before deploying.
- Confirm health endpoints after deploy: `/health`, `/api/health`, and `/api/ready`.

### Current Deployment Unknowns

- No Docker, Render, Vercel, Netlify, or Cloudflare config files are committed, so this repo documents generic Node/static deployment commands only.
- The backend currently includes a hardcoded CORS allowlist for `bundlebee.co.uk` subdomains and localhost in `backend/server.js`; deploying to a different production domain needs a CORS review.
- The backend has no real automated test command yet; `npm --prefix backend test` is still a placeholder.

## Tests

The backend currently has no real test command:

```bash
npm --prefix backend test
```

This exits with `Error: no test specified`.

## Auth Smoke Checklist

Until automated backend tests exist, use this checklist after auth middleware changes:

1. Start the backend with a valid `backend/.env`.
2. Sign in through the frontend or local auth endpoint and complete any required 2FA.
3. Confirm `GET /api/user/profile` returns the authenticated user and does not return a 500.
4. Confirm `GET /api/user/profile` without cookies or a bearer token returns 401.
5. Confirm an admin-only route rejects a normal user with 403.
6. Confirm an admin token can access `GET /api/admin/analytics`.
7. Confirm a partner token can access `GET /api/partner/analytics` and cannot access admin routes.

## Security Follow-Up

The frontend still stores access tokens in `localStorage`/`sessionStorage` in some flows. That increases impact if an XSS bug is introduced. Keep the current behavior until it can be redesigned and tested separately; the safer long-term direction is cookie-only auth with `HttpOnly`, `Secure`, `SameSite` cookies, CSRF protection for state-changing requests, and removal of bearer-token persistence from browser storage.
