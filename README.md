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

Legacy customer dashboards, partner subscriptions, accounting screens, reviews and the recommendation quiz remain in repository history but are hidden from the current navigation.

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
frontend/                     Vue/Vite public site and administrator UI
backend/models/               Mongoose models
backend/routes/shoppingRoutes.js
backend/scripts/migrate-subscription-boxes-to-products.js
backend/server.js             Express entry point
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

The backend currently pins Multer to `1.4.4` because `multer-gridfs-storage` has an outdated peer dependency. This is compatibility debt and should eventually be replaced with a maintained GridFS or S3 upload path.

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

Backend syntax checks:

```bash
npm --prefix backend test
```

Frontend production build:

```bash
npm --prefix frontend run build
```

The backend test command currently performs deterministic JavaScript syntax validation. API integration tests still need to be added.

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

- `backend/server.js` still contains duplicated historical authentication and CORS setup and needs a dedicated refactor.
- Legacy partner, customer, accounting, quiz and review files are still present but hidden.
- Browser access-token persistence should eventually be removed in favour of cookie-only authentication with CSRF protection.
- Real backend integration tests and frontend component tests are not yet present.
- Historical backup and investigation files still need to be removed after the live deployment is confirmed stable.
