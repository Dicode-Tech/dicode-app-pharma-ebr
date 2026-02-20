# Multi-Tenant & Client-Specific Deployments Strategy

This document outlines how Dicode EBR can scale across multiple pharmaceutical laboratories while keeping a single baseline codebase, enabling both centralized SaaS hosting and customer-dedicated deployments.

## 1. Deployment Models

| Model | Description | When to use | Notes |
|-------|-------------|-------------|-------|
| **Shared SaaS (logical multi-tenant)** | Single cluster with tenants partitioned at the data layer. | Small/medium labs, pilot programs, fast rollout. | Requires strict data isolation (Row-Level Security, per-tenant encryption keys, tenant-aware logging). |
| **Dedicated managed instance** | Same baseline deployed per customer (separate infra, same releases). | Labs needing their own validation cadence, network isolation, or on-prem. | Use infrastructure-as-code to keep environments identical; version each customer against the baseline. |
| **Hybrid** | Shared core services + dedicated data plane (e.g., per-tenant DB + shared app tier). | Customers with higher compliance demands but willing to use shared app services. | Simplifies upgrades vs. fully dedicated stacks while keeping data isolated. |

## 2. Baseline & Versioning

- **Single repository / mainline** with semantic releases (e.g., `v1.5.0`).
- Tag customer deployments: `release/v1.5.0-labXYZ` to record validated builds.
- Maintain migration scripts + validation packs per release so each tenant upgrades reproducibly.
- Automate release notes so ops/customer success can map "tenant → version" quickly.

## 3. Tenant-Aware Architecture

### Backend
- `tenant_id` column on every business table + `Row Level Security` policies in PostgreSQL/TimescaleDB.
- Tenant context injected via JWT claims or mTLS cert (backend middleware loads tenant config and enforces scopes).
- Config service or table storing:
  - Feature flags (`planningModuleEnabled`, `opcUaLive`)
  - Regulatory settings (e-signature wording, audit retention)
  - Branding tokens (see below).
- Separate audit/event streams per tenant (Topic naming `audit.<tenant_id>`), allowing export when auditors request logs.

### Frontend
- On login, fetch `/tenant/settings` once and cache in context:
  - Logos, color palette, typography tokens.
  - Copy overrides (e.g., "Batch Record" vs "PROD LOG").
  - Optional modules toggles; hide routes/buttons that tenant hasn’t licensed.
- Assets served from namespaced storage (e.g., `cdn/.../tenants/<tenant_id>/logo.png`).

## 4. Branding Without Forking

1. **Theme tokens** – create a `theme.json` per tenant with primary/secondary colors, fonts, border radius, etc. Feed into CSS variables.
2. **Asset slots** – define placeholders (`<LogoPrimary/>`, `<Watermark/>`) and load the tenant-specific files dynamically.
3. **Content descriptors** – store text blocks (disclaimers, login hero text) as Markdown/JSON per tenant so regulatory language can change without code edits.
4. **Document templates** – PDF/report templates read a tenant-specific Handlebars/HTML file; baseline keeps helpers and data contract stable.

## 5. Isolation & Compliance Considerations

- **Crypto separation**: derive encryption keys per tenant (KMS + tenant ID) for payloads/signatures.
- **Backups**: label snapshots with tenant metadata to enable point-in-time restores per customer.
- **Monitoring**: multi-tenant metrics dashboards segmented by tenant to spot heavy usage or anomalies.
- **Regulatory validation**: publish a Validation Master Plan referencing the baseline version; tenants re-use the same IQ/OQ scripts, only executing PQ on their data.

## 6. Release & Update Workflow

1. Build release candidate from `main` → run automated tests + validation pack.
2. **Shared SaaS upgrade**: roll out in waves, using feature flags for risky modules.
3. **Dedicated instances**: notify each lab, provide release notes + migration checklist. Deploy via IaC pipelines with the same artifacts.
4. Track `tenant_version` table to know exactly which commit/tag runs where.
5. Emergency hotfix: cherry-pick to `hotfix/x.y.z`, release to SaaS first, then offer patch bundles to dedicated tenants.

## 7. Next Steps

- Implement tenant context middleware in backend (`src/middleware/tenant.js`).
- Add `tenant_id` + RLS policies to core tables (users, batches, recipes, audit logs).
- Build `/tenant/settings` endpoint and React context for theming + feature flags.
- Create CI pipeline matrix to run integration tests per tenant config (at least default + high-compliance profile).
