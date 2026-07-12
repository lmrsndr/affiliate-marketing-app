# BundleBee Shopping Discovery Platform

BundleBee is a curated UK shopping-discovery platform for useful, unusual and giftable products from independent and specialist brands.

BundleBee does not take payment or fulfil orders. Visitors browse products and collections, then continue to the retailer through an affiliate link. BundleBee may earn commission from qualifying purchases at no extra cost to the customer.

## Current product scope

The active product is deliberately small:

- public product catalogue
- search, filtering and sorting
- brands and curated collections
- affiliate click tracking
- one protected administrator workspace
- products, brands, collections and affiliate-programme management

The old customer dashboard, partner subscription platform, accounting system, reviews and subscription quiz have been retired from the running application.

## Technology

- Frontend: Vue 3 and Vite
- Backend: Node.js and Express
- Database: MongoDB through Mongoose
- Authentication: local or Google login, secure cookies and administrator 2FA

## Main data models

- `Product`
- `Brand`
- `Category`
- `Collection`
- `AffiliateProgramme`

The old `SubscriptionBox` model remains temporarily for migration compatibility.

## Project structure

```text
frontend/                         Vue/Vite public site and administrator UI
backend/server.js                 process startup only
backend/app.js                    Express middleware and active route mounting
backend/config/runtime.js         validated runtime configuration
backend/config/http.js            CORS and cookie policy
backend/config/passport.js        Google Passport strategy
backend/models/                   active Mongoose models
backend/routes/googleAuthRoutes.js
backend/routes/shoppingRoutes.js
backend/scripts/migrate-subscription-boxes-to-products.js
backend/tests/                    deterministic unit tests
.github/workflows/ci.yml          backend checks and frontend production build
```

## Prerequisites

- Node.js 20 or newer
- npm 10 or newer
- MongoDB
- Google OAuth credentials when Google login is enabled

## Environment files

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

For local frontend development:

```env
VITE_API_URL=http://localhost:5000/api
```

Do not commit real credentials.

## Install

```bash
npm --prefix frontend ci
npm --prefix backend ci
```

## Run locally

Terminal 1:

```bash
npm --prefix backend start
```

Terminal 2:

```bash
npm --prefix frontend run dev
```

Default addresses:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`
- Health: `http://localhost:5000/api/health`
- Readiness: `http://localhost:5000/api/ready`

## Validation

Run backend unit tests and syntax checks:

```bash
npm --prefix backend test
```

Build the frontend:

```bash
npm --prefix frontend run build
```

GitHub Actions is configured to run both checks for pushes to `main` and for pull requests.

## Authentication

Public visitors do not need accounts. Local self-registration is disabled.

Only administrators can use the local login and access `/admin`. Google OAuth remains available; non-administrator Google users are returned to the public site.

## Shopping API

Public endpoints:

```text
GET  /api/products
GET  /api/products/:slug
POST /api/products/:id/click
GET  /api/brands
GET  /api/brands/:slug
GET  /api/collections
GET  /api/collections/:slug
```

Administrator endpoints require an authenticated administrator with verified 2FA:

```text
GET/POST       /api/admin/products
PUT/DELETE     /api/admin/products/:id
GET/POST       /api/admin/brands
PUT            /api/admin/brands/:id
GET/POST       /api/admin/collections
PUT            /api/admin/collections/:id
GET/POST       /api/admin/affiliate-programmes
PUT            /api/admin/affiliate-programmes/:id
```

Shopping administration validates required fields, normalises slugs and tag lists, rejects negative prices, and rejects malformed or local/private retailer URLs.

## Migrating old subscription boxes

The public homepage falls back to legacy subscription boxes while the new product collection is empty.

Review the database backup first, then run:

```bash
npm --prefix backend run migrate:shopping
```

The migration:

- creates brands from retailer domains
- converts subscription boxes into products
- preserves click totals
- leaves migrated brands unapproved for manual review
- uses deterministic slugs
- avoids creating duplicate products when rerun

After migration, log in at `/admin`, review each brand and product, then publish approved catalogue entries.

## Operator workflow

1. Research an affiliate programme.
2. Add the programme in the Admin area.
3. Add and approve the brand.
4. Add a product as a draft.
5. Check its price, image, retailer URL and affiliate URL.
6. Add useful tags and assign it to collections.
7. Publish it.
8. Review links and prices regularly.

## Production checklist

- Set `NODE_ENV=production`.
- Configure `MONGO_URI`.
- Set strong `SESSION_SECRET`, `JWT_SECRET`, `JWT_REFRESH_SECRET` and `JWT_OTP_SECRET` values.
- Set `FRONTEND_URL` and `VITE_API_URL` correctly.
- Confirm CORS and cookie-domain settings.
- Configure Google OAuth redirect URLs.
- Run backend validation and the frontend build.
- Back up MongoDB before running the migration.
- Confirm `/api/health` and `/api/ready` after deployment.
- Confirm an unauthenticated visitor can browse products.
- Confirm only administrators can access `/admin` and `/api/admin/*`.

## Known technical debt

- Browser access-token persistence should eventually be removed in favour of cookie-only authentication with CSRF protection.
- API integration tests with a temporary MongoDB database and frontend component tests are still needed.
- `package.json` and lock files still contain some dependencies from the retired accounting, upload and charting features. Remove them together in a dependency-only commit after a successful clean install/build.
- Remaining investigation folders and backup files should be deleted after deployment stability is confirmed.
