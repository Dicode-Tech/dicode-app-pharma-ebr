# Changelog

All notable changes to Dicode EBR are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased] — 2026-02-20

### Added — Backend

- **Authentication middleware** (`src/middleware/auth.js`) — `authenticate` preHandler verifies JWT from `httpOnly` cookie; `requireRole(...roles)` factory returns a preHandler that enforces role-based access
- **Auth routes** (`src/routes/auth.js`) — `POST /api/v1/auth/login` (bcrypt password check, JWT issued as httpOnly cookie, 24 h expiry), `POST /api/v1/auth/logout` (clears cookie), `GET /api/v1/auth/me` (session restore from cookie)
- **User management routes** (`src/routes/users.js`) — Admin-only CRUD: `GET /` (list all users), `POST /` (create with bcrypt hash), `PUT /:id` (update name/role/status/password), `DELETE /:id` (soft-deactivate); self-deactivation and self-deletion guarded
- **`users` table** (`database/schema.sql`) — `id`, `email` (unique), `password_hash`, `full_name`, `role` (CHECK constraint on 5 roles), `is_active`, timestamps
- **`@fastify/cookie@9`** added to dependencies (compatible with Fastify 4.x)
- **`bcryptjs`** seeder usage — `scripts/seed.js` now calls `seedUsers()`, creating one demo account per role (`Password1!`): `admin@ebr.local`, `manager@ebr.local`, `supervisor@ebr.local`, `operator@ebr.local`, `qa@ebr.local`

### Added — Frontend

- **`AuthContext`** (`src/context/AuthContext.tsx`) — React context providing `user`, `loading`, `login()`, `logout()`, `hasRole()` to the whole app; restores session via `GET /auth/me` on mount
- **`ProtectedRoute`** component (`src/components/ProtectedRoute.tsx`) — Redirects unauthenticated users to `/login`; accepts optional `roles` prop to enforce role-level access
- **`Login` page** (`src/pages/Login.tsx`) — Branded login form; expandable "Demo accounts" panel pre-fills credentials for all 5 seed users
- **`AdminPanel` page** (`src/pages/AdminPanel.tsx`) — Tabbed administration interface:
  - **Users tab** — user table with add/edit/deactivate modals; role badges; self-protection (cannot delete or deactivate own account)
  - **Roles tab** — read-only permission matrix showing all 5 roles × all application actions (User Management, Batches, Recipes, Integrations & Audit Trail) with green checkmarks and gray dashes; footer note explaining server-side enforcement

### Changed — Backend

- **`src/index.js`** — Registered `@fastify/cookie` plugin; registered `/api/v1/auth` and `/api/v1/users` routes; CORS `origin` changed from `true` to `['http://localhost:5173']`
- **`src/routes/batches.js`** — All routes protected with `preHandler` arrays (`allRoles`, `writers`, `managers`); `performed_by`/`created_by`/`generated_by` now sourced from `request.user.full_name` (JWT) instead of request body
- **`src/routes/recipes.js`** — GET routes require authentication; POST/PUT/DELETE restricted to `admin` and `batch_manager`; `created_by` sourced from `request.user.full_name`
- **`src/routes/integrations.js`** — All routes now require authentication

### Changed — Frontend

- **`src/main.tsx`** — Wrapped in `<AuthProvider>`; all routes wrapped in `<ProtectedRoute>`; added `/login` and `/admin` routes
- **`src/components/Layout.tsx`** — Sidebar footer shows logged-in user name, role label, and "Sign out" button; Admin Panel nav link visible only to `admin` role
- **`src/services/api.ts`** — Added `withCredentials: true` to Axios instance; added 401 response interceptor that redirects to `/login`; added `authService` (login/logout/getMe) and `userService` (CRUD); `batchService.startBatch`, `completeBatch`, `cancelBatch`, `generateReport` no longer accept a `performedBy` argument (identity comes from the JWT cookie)
- **`src/types/index.ts`** — Added `UserRole`, `AuthUser`, `UserRecord` types
- **`src/pages/BatchDetail.tsx`** — `OPERATOR` constant removed; all `performed_by` values sourced from `useAuth().user.full_name`
- **`src/pages/BatchCreate.tsx`** — `created_by` default changed from `'Demo User'` to `useAuth().user.full_name`

---

## [Unreleased] — 2026-02-19

### Added — Backend

- **Database schema** (`database/schema.sql`) — Extended with pharma-specific columns:
  - `step_type` (`manual` | `measurement` | `verification` | `equipment_check`) on recipe and batch steps
  - `expected_value`, `actual_value`, `unit` for measurement steps
  - `requires_signature`, `signature_data` for 21 CFR Part 11 e-signature support
  - `pdf_reports` table to track generated batch record PDFs
  - `step_id` and `ip_address` on `audit_logs` for step-level traceability
- **DB lifecycle scripts** (`scripts/`)
  - `migrate.js` — Applies `schema.sql` against the configured database
  - `rollback.js` — Drops all tables in reverse dependency order
  - `seed.js` — Populates two realistic pharma recipes with fully typed steps and five demo batches in varied states (completed ×2, active ×1, draft ×1, cancelled ×1)
- **Batch routes** (`src/routes/batches.js`) — Major additions:
  - `POST /batches` now copies recipe steps into `batch_steps` when `recipe_id` is provided (transactional)
  - `GET /batches` and `GET /batches/:id` now return `total_steps` and `completed_steps` counts
  - `POST /batches/:id/steps/:stepId/sign` — Records e-signature data, performer, actual value and writes audit log entry with `action = 'step_signed'`
  - `PUT /batches/:id/steps/:stepId` — Now records `actual_value` and writes per-step audit log entries
  - `GET /batches/:id/audit` — Returns full audit trail for a single batch
  - `GET /batches/audit/all` — Returns paginated global audit trail across all batches
  - `POST /batches/:id/report` — Generates a PDF batch record via Puppeteer and records it in `pdf_reports`
  - `GET /batches/:id/report/download` — Streams the generated PDF as `application/pdf`
  - `POST /batches/:id/cancel` now accepts an optional `reason` field
- **OPC-UA simulation service** (`src/services/opcua.js`) — Realistic simulated pharma process variables that drift sinusoidally over time: reactor temperature, mixer speed, relative humidity, vessel pressure, dryer outlet temperature, batch weight
- **Integration routes** (`src/routes/integrations.js`) — Replaced static stubs with live data from simulation service:
  - `GET /integrations/status` — Returns simulated connected state and session info
  - `GET /integrations/readings` — Returns six live process variable readings with setpoint and tolerance
  - `GET /integrations/equipment` — Returns four equipment items with calibration and cleaning dates
  - `GET /integrations/alarms` — Surfaces occasional simulated low-priority alarms
- **PDF generator service** (`src/services/pdf-generator.js`) — Puppeteer + Handlebars pipeline; generates a GMP-styled A4 PDF with batch identification table, ordered step table (with inline signature images), audit trail section, and QA approval signature blocks
- **Batch record PDF template** (`templates/batch-report.hbs`) — Full HTML/CSS template styled to resemble a real pharmaceutical batch record; GMP banner, step type colour coding, signature image rendering, controlled document footer
- **Recipe routes** (`src/routes/recipes.js`) — `POST /recipes` wraps creation of recipe and its steps in a single database transaction
- **`@fastify/static`** added to dependencies for future static file serving support
- **ESLint v9 flat config** (`eslint.config.mjs`) — Migrated from legacy `.eslintrc` format
- **Root `.gitignore`** covering `node_modules`, `.env` files, build output, PDF storage, OS and editor artefacts

### Added — Frontend

- **`StepCard` component** (`src/components/StepCard.tsx`) — Interactive, expandable step card with a visual state machine (`pending` → `in_progress` → `completed` / `skipped`); shows step type badge, expected vs actual values, operator notes textarea, measurement input, and Start / Mark Complete / Sign & Complete actions
- **`SignaturePad` component** (`src/components/SignaturePad.tsx`) — Native Canvas e-signature capture (mouse and touch); shows legal attestation text with operator name, timestamp, Clear / Cancel / Sign & Complete controls; returns PNG data URL
- **`OfflineIndicator` component** (`src/components/OfflineIndicator.tsx`) — Fixed banner that appears when the browser goes offline
- **`useOffline` hook** (`src/hooks/useOffline.ts`) — Listens to `navigator.onLine` / `window online|offline` events
- **`RecipeList` page** (`src/pages/RecipeList.tsx`) — Card grid of all recipes with name, product, version, description and link to detail
- **`RecipeDetail` page** (`src/pages/RecipeDetail.tsx`) — Full recipe viewer: step list with type badges, expected values, instructions, duration, signature indicators; summary cards for total steps, estimated time, and signatures required; "Use This Recipe" button that navigates to batch creation pre-filled with `recipe_id`
- **`AuditTrail` page** (`src/pages/AuditTrail.tsx`) — Paginated table of audit log entries; supports per-batch view (via `?batch=<id>` query param) and global view; action badges colour-coded by type; detail column expands `JSONB` details
- **`IntegrationStatus` page** (`src/pages/IntegrationStatus.tsx`) — Live OPC-UA dashboard; process variable cards with setpoint gauge bars, green/red tolerance indicator; equipment status table; active alarm section; auto-refreshes every 5 seconds via `setInterval`

### Changed — Backend

- `puppeteer` upgraded `^21.6.1` → `^24.15.0` (eliminates deprecation warning)
- `eslint` upgraded `^8.55.0` → `^9.0.0` (eliminates deprecation warning); `@eslint/js` added as peer

### Changed — Frontend

- **`BatchDetail` page** — Fully rewired:
  - Step buttons now call `batchService.updateStep()` and `batchService.signStep()`
  - Steps rendered via `StepCard` with full interactivity
  - Step progress bar (`completed / total`)
  - "Generate Report" / "Download PDF" button for completed batches
  - "Audit Trail" shortcut button linking to per-batch audit view
- **`BatchCreate` page** — Added recipe selector dropdown; auto-populates `product_name` from selected recipe; shows step count preview; reads `?recipe_id` from URL query param (for "Use This Recipe" flow)
- **`Dashboard` page** — Added OPC-UA connection status banner with alarm count; active batch section with per-batch step progress bars; step completion percentage column in recent batches table
- **`Layout` component** — Added nav items: Recipes, Integrations, Audit Trail; added `OfflineIndicator`; added GMP compliance badge in header
- **`main.tsx`** — Registered routes: `/recipes`, `/recipes/:id`, `/audit`, `/integrations`
- **`src/types/index.ts`** — Extended `Batch` (added `total_steps`, `completed_steps`, `recipe_id`); extended `BatchStep` (added `step_type`, `expected_value`, `actual_value`, `unit`, `requires_signature`, `signature_data`, `instructions`); added `Recipe`, `RecipeStep`, `AuditLogEntry`, `SignStepRequest`, `OpcReading`, `Equipment`, `Alarm`; updated `CreateBatchRequest` to include `recipe_id`
- **`src/services/api.ts`** — Added `batchService.signStep`, `getBatchAuditLog`, `getAllAuditLogs`, `generateReport`, `getReportDownloadUrl`; added `recipeService` (getAllRecipes, getRecipe, createRecipe, updateRecipe, deleteRecipe); added `integrationService` (getStatus, getReadings, getEquipment, getAlarms)

### Fixed

- Vite dev proxy added (`vite.config.ts`): frontend `/api/*` requests now forwarded to `http://localhost:3000/api/v1/*`, resolving the 404 errors caused by a port and path mismatch between frontend and backend
- Frontend `VITE_API_URL` default changed from `http://localhost:3001/api` to `/api` (relative), enabling the Vite proxy to work correctly
- `database/schema.sql` was incorrectly created as an empty directory; replaced with the correct SQL file
- `eslint@8` deprecation warnings eliminated by upgrading to ESLint v9 flat config
- `puppeteer@21` deprecation warning eliminated by upgrading to v24

---

## [0.2.0] — 2026-02-18

### Added

- Complete React 18 frontend (Vite + TypeScript + Tailwind CSS)
- `Dashboard` page with batch statistics cards and recent batches table
- `BatchList` page with search and status filter
- `BatchCreate` page with form validation
- `BatchDetail` page with step list (buttons non-functional at this stage)
- `Layout` component with sidebar navigation (Dashboard, Batches, New Batch)
- `Badge` and `Button` UI components
- Axios-based `api.ts` service layer with batch CRUD and step update calls
- TypeScript types for `Batch`, `BatchStep`, `CreateBatchRequest`, `UpdateStepRequest`
- React Router v6 with routes for `/`, `/batches`, `/batches/new`, `/batches/:id`

---

## [0.1.0] — 2026-02-18

### Added

- Fastify backend scaffolding with `@fastify/cors` and `@fastify/websocket`
- PostgreSQL connection via `pg` pool
- Batch, recipe, and integration route stubs registered in `src/index.js`
- Docker Compose orchestration: TimescaleDB (PostgreSQL 15), Redis, backend, frontend services
- Health check endpoint `GET /health`
- Global error handler and 404 handler
- `package.json` with full dependency list: `bullmq`, `ioredis`, `node-opcua`, `puppeteer`, `handlebars`, `bcryptjs`, `jsonwebtoken`, `pino`, `joi`, `date-fns`
