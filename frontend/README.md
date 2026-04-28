# BundleBee Frontend

Vue 3 frontend built with Vite. This is not a Create React App project.

## Environment

Create a local environment file:

```bash
cp .env.example .env
```

For local backend development:

```bash
VITE_API_URL=http://localhost:5000/api
```

For production, set `VITE_API_URL` before building. It must point at the deployed backend API root, including `/api`:

```bash
VITE_API_URL=https://api.example.com/api
```

## Install

From the repository root:

```bash
npm --prefix frontend ci
```

Or from this directory:

```bash
npm ci
```

## Development

From the repository root:

```bash
npm --prefix frontend run dev
```

Default Vite dev URL: `http://localhost:5173`.

## Build

From the repository root:

```bash
npm --prefix frontend run build
```

Build output: `frontend/dist/`.

## Preview Production Build

```bash
npm --prefix frontend run preview
```

## Deployment

Use this command for a production build:

```bash
npm --prefix frontend run build
```

Deploy the contents of `frontend/dist/` as a static site. The backend is not bundled into the frontend; all API calls use `VITE_API_URL`.

## Production Checklist

- Set `VITE_API_URL` to the deployed backend API root, including `/api`.
- Run `npm --prefix frontend ci`.
- Run `npm --prefix frontend run build`.
- Deploy `frontend/dist/`.
- Confirm the deployed frontend can reach the backend health/API routes.
