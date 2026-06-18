# Architecture Audit

Audit date: 2026-06-18

Scope:

- Frontend repository: `/home/javohir/projects/vehicle-front`
- Backend repository: `/home/javohir/projects/vehicle-api`
- Target: migrate the Laravel + Vue ERP toward a 1C-style architecture without destructive migrations and without breaking the existing frontend/API contract.

## Executive Summary

The backend is a young Laravel API with direct CRUD controllers, Eloquent models, FormRequests, API Resources, Sanctum auth, simple string roles, PostgreSQL config, and flat operational tables. It currently supports the approximate domain requested by the frontend, but it does not yet have the accounting/register layers needed for reliable payments, debts, cash shifts, fiscal receipts, document numbering, audit history, or historical document snapshots.

The first implementation phases should add new nullable columns and new tables around the existing schema. Existing columns such as `inspection_documents.date`, `payments.cash_amount`, `payments.plastic_amount`, `payments.receipt_type`, `payments.z_report_id`, `expenses.date`, `expenses.basis`, and `expenses.payment_method` must remain as compatibility fields until frontend/API resources are fully migrated.

## Repository Facts

Backend:

- Laravel: `^13.8`
- PHP: `^8.3`
- Auth: Laravel Sanctum `^4.0`
- Test runner: PHPUnit `^12.5.12` through `php artisan test`
- Formatter: Laravel Pint `^1.27`
- Static analysis: no PHPStan/Larastan package found
- Default DB in config: `sqlite`
- Active local `.env` DB: `pgsql`, database `vehicle_db`
- Queue connection: `database`
- Cache/session drivers: database-backed tables exist
- Fiscal integration: not present
- Spatie Permission: not present
- Role model: simple `users.role` string with custom `role` middleware

Frontend:

- Vue 3, Vite 8, TypeScript, Pinia, Vue Router, PrimeVue, Tailwind CSS, Axios
- API base URL: `VITE_API_URL` fallback `/api/v1`
- Token storage: `localStorage.vehicle_token`
- Current API client expects Laravel resource shape `{ data: ... }`
- Current TypeScript types mirror legacy backend fields.

## Current Backend Architecture

Layers present:

- Routes: `routes/api.php`
- Controllers: `app/Http/Controllers/Api/*Controller.php`
- Form requests: `app/Http/Requests/*Request.php`
- API resources: `app/Http/Resources/*Resource.php`
- Models: `app/Models/*.php`
- Middleware: `EnsureUserHasRole`, `ForceJsonResponse`
- Migrations and seeders under `database`
- Minimal default tests only.

Layers missing:

- Domain services/actions
- Enums
- Policies
- Audit logs
- Events/listeners for financial operations
- Fiscal provider abstraction
- Cashbox/shift domain
- Reconciliation artisan commands
- Dedicated financial/debt register logic

Current authenticated routes:

- `POST /api/v1/login`
- `GET /api/v1/me`
- `POST /api/v1/logout`
- CRUD: `branches`, `regions`, `districts`, `fuel-types`, `document-types`, `vehicle-models`
- CRUD: `counterparties`, `vehicles`, `inspection-documents`, `payments`, `expenses`
- CRUD: `users`, protected by `role:admin`

## Existing Tables

System/auth:

- `cache`, `cache_locks`
- `jobs`, `job_batches`, `failed_jobs`
- `users`, `password_reset_tokens`, `sessions`
- `personal_access_tokens`

Reference/master data:

- `branches`
- `regions`
- `districts`
- `fuel_types`
- `document_types`
- `vehicle_models`

Operational:

- `counterparties`
- `vehicles`
- `inspection_documents`
- `payments`
- `expenses`

## Existing Schema Snapshot

`branches`:

- `id`, `name`, `is_active`, timestamps
- Missing: `code`, `region_id`, `district_id`, `address`, `phone`, soft deletes.

`regions`:

- `id`, `name`, timestamps
- Missing: `code`, `is_active`.

`districts`:

- `id`, `region_id`, `name`, timestamps
- Missing: `code`, `is_active`, unique `(region_id, name)`.

`fuel_types`:

- `id`, `name`, timestamps
- Missing: `code`, `is_active`.

`document_types`:

- `id`, `name`, timestamps
- Missing: `code`, `category`, `is_printable`, `is_active`.

`vehicle_models`:

- `id`, `name`, timestamps
- Missing: `vehicle_brand_id`, `is_active`, scoped unique.

`users`:

- `id`, nullable `branch_id`, `name`, unique `phone`, `role`, `password`, remember token, timestamps
- Missing: `is_active`.
- Role values currently validated as `admin`, `moderator`, `cashier`; target also wants `manager`.

`counterparties`:

- `id`, `full_name`, `phone`, `region_id`, `district_id`, `address`, `basis_type`, timestamps
- Missing: `type`, `short_name`, `additional_phone`, `pinfl`, `tin`, passport fields, `notes`, `is_active`, soft deletes, indexes.
- Current `region_id`, `district_id`, `address`, `basis_type` are required; target wants nullable for some of these.

`vehicles`:

- `id`, `counterparty_id`, `vehicle_model_id`, `license_plate`, `manufacture_year`, nullable `body_number`, nullable `chassis_number`, nullable `engine_number`, `current_fuel_type_id`, timestamps
- Missing: technical passport fields, `color`, `notes`, `is_active`, soft deletes.

`inspection_documents`:

- `id`, `doc_number`, `act_number`, `date`, `branch_id`, `vehicle_id`, `counterparty_id`, `fuel_type_id`, `document_type_id`, `employee_id`, `status`, timestamps
- Current status: `pending`, `completed`
- Missing: `uuid`, `internal_number`, `document_date`, `primary_document_type_id`, `cashier_id`, rich lifecycle statuses, `payment_status`, totals, snapshots, audit users, completed/cancelled timestamps, soft deletes.

`payments`:

- `id`, nullable `inspection_document_id`, `branch_id`, `counterparty_id`, `date`, `total_amount decimal(15,0)`, `cash_amount decimal(15,0)`, `plastic_amount decimal(15,0)`, `receipt_type`, nullable `z_report_id`, timestamps
- Missing: `uuid`, `payment_number`, `cashbox_id`, `employee_id`, `paid_at`, `payment_type`, `status`, `description`, posted/cancelled metadata, soft deletes.
- Current FormRequest uses `(float)` to validate total equals cash plus plastic. This violates the target rule to avoid float for money.

`expenses`:

- `id`, `branch_id`, nullable `employee_id`, `date`, `basis`, `payment_method`, `amount decimal(15,0)`, nullable `description`, timestamps
- Missing: `uuid`, `expense_number`, `cashbox_id`, `cash_shift_id`, `expense_category_id`, `payment_method_id`, `spent_at`, `recipient_name`, `status`, posted/cancelled metadata, soft deletes.

## Current Relationships

Implemented model relationships:

- `Branch`: users, inspectionDocuments, payments, expenses
- `Region`: districts, counterparties
- `District`: region, counterparties
- `Counterparty`: region, district, vehicles, inspectionDocuments, payments
- `FuelType`: vehicles through `current_fuel_type_id`, inspectionDocuments
- `DocumentType`: inspectionDocuments
- `VehicleModel`: vehicles
- `Vehicle`: counterparty, vehicleModel, currentFuelType, inspectionDocuments
- `InspectionDocument`: branch, vehicle, counterparty, fuelType, documentType, employee, payments
- `Payment`: inspectionDocument, branch, counterparty
- `Expense`: branch, employee
- `User`: branch, inspectionDocuments, expenses

Target relationships missing:

- Branch to cashboxes/fiscalDevices
- VehicleModel to vehicleBrand
- InspectionDocument to cashier/items/generatedDocuments/paymentAllocations/payments-through-allocations
- Payment to employee/cashbox/lines/allocations/fiscalReceipts/cashTransactions
- Expense to category/cashbox/cashShift/paymentMethod/cashTransactions
- Cashbox, CashShift, FiscalDevice, FiscalReceipt, ZReport models.

## Problem Areas

1. Financial model is too flat.

   `payments` stores cash/plastic columns directly. There is no `payment_lines`, no allocation register, no posted/cancelled/reversed lifecycle, and no immutable reversal flow.

2. Debt is not derived from a register.

   Debt should be calculated from `inspection_documents.total_amount - posted payment_allocations`. The current schema only links one payment to one document and cannot correctly represent partial payment, one payment to many documents, refunds, or adjustments.

3. Money precision must be corrected.

   Existing money columns are `decimal(15,0)`, while target requires `decimal(18,2)`. `PaymentRequest` casts amounts to float during validation and should be replaced with string/decimal-safe comparison.

4. Operational documents have limited lifecycle.

   Inspection documents only support `pending/completed`; target requires draft, calculation, payment, completion, cancellation, snapshots, generated documents, and numbering.

5. Missing service/tariff model.

   There is no `services`, `service_tariffs`, or `inspection_document_items`. Backend currently cannot calculate totals from server-owned tariff rules.

6. No cashbox or shift register.

   Expenses and payments are not tied to cashboxes, shifts, or immutable cash transactions. Cash reports would currently be reconstructed from legacy payment/expense columns only.

7. Fiscal operations are not modeled.

   `receipt_type` and `z_report_id` are legacy hints, not a fiscal integration model. There are no devices, provider interface, fiscal receipt lifecycle, request/response payloads, or Z-report records.

8. Branch access control is incomplete.

   Only user CRUD is admin-protected. Ordinary users can query arbitrary `branch_id` on documents, payments, expenses, vehicles, and counterparties unless controller logic is added.

9. Deletes are destructive from API perspective.

   Models do not use `SoftDeletes`. Controllers call `delete()` on master and operational records. Target requires preserving operational history.

10. Controllers contain business behavior directly.

   CRUD is thin today, but future financial operations must not live in controllers. Posting, cancellation, reversal, allocation, fiscalization, sequence generation, and reports need services/actions with transactions.

11. API list endpoints are unpaginated.

   Current controllers call `get()`/`all()`. Target reporting and operational screens need filters, sorting, pagination, and indexed queries.

12. Audit trail is absent.

   There is no model/table for status changes, posting/cancellation/reversal, fiscalization, tariff changes, or user/branch changes.

13. Frontend contract is legacy.

   `src/types/index.ts` still uses `Payment.cash_amount/plastic_amount`, `InspectionDocument.status = pending|completed`, and no payment lines/allocations/cash/fiscal types.

14. Mock env mismatch.

   Frontend `.env` uses `VITE_USE_MOCKS=true`, while the mock helper checks `VITE_USE_MOCK === 'true'`.

## Tables To Change

Existing tables should be expanded in reversible additive migrations:

- `branches`
- `regions`
- `districts`
- `users`
- `counterparties`
- `vehicles`
- `vehicle_models`
- `fuel_types`
- `document_types`
- `inspection_documents`
- `payments`
- `expenses`

Compatibility rule:

- Do not drop or rename legacy columns in the first phases.
- Add new nullable columns first.
- Backfill in guarded data migrations.
- Update resources to return both legacy and new fields while frontend is migrated.
- Document all legacy columns in `docs/LEGACY_COLUMNS.md`.

## New Tables

Reference data:

- `vehicle_brands`
- `payment_methods`
- `expense_categories`

Services and tariffs:

- `services`
- `service_tariffs`

Inspection documents:

- `inspection_document_items`
- `generated_documents`
- `document_sequences`

Payment/debt registers:

- `payment_lines`
- `payment_allocations`

Cash:

- `cashboxes`
- `cash_shifts`
- `cash_transactions`

Fiscal:

- `fiscal_devices`
- `fiscal_receipts`
- `z_reports`

Audit:

- `audit_logs`

## API Impact

Existing endpoints to keep working:

- `/api/v1/branches`
- `/api/v1/regions`
- `/api/v1/districts`
- `/api/v1/fuel-types`
- `/api/v1/document-types`
- `/api/v1/vehicle-models`
- `/api/v1/users`
- `/api/v1/counterparties`
- `/api/v1/vehicles`
- `/api/v1/inspection-documents`
- `/api/v1/payments`
- `/api/v1/expenses`

Required compatibility adapters:

- Accept legacy payment payloads with `cash_amount`, `plastic_amount`, `receipt_type`, `z_report_id`.
- Normalize them into `payment_lines`, `payment_allocations`, and fiscal receipt flow.
- Keep `cash_amount` and `plastic_amount` in payment responses temporarily, derived from lines when possible.
- Accept legacy `inspection_documents.date`; backfill and return `document_date`.
- Accept legacy `expenses.date`, `basis`, `payment_method`; map to new `spent_at`, category, and `payment_method_id`.

New endpoints to add after migration tables/actions exist:

- Inspection: calculate, complete, cancel, balance, generated documents
- Payments: post, cancel, reverse, fiscalize
- Counterparty debt: pay debt, debt list
- Expenses: post, reverse
- Cashboxes and shifts
- Cash reports and summary
- Fiscal device check, receipt retrieval, Z-report
- Reference data for services, tariffs, payment methods, expense categories, vehicle brands

## Data Migration Strategy

Phase 1: safe schema expansion

- Add reference columns to `branches`, `regions`, `districts`, `fuel_types`, `document_types`, `users`, `counterparties`, `vehicles`, `vehicle_models`.
- Add `is_active` where missing.
- Add indexes for search/filter fields.
- Add soft delete columns only if the app is updated to use `SoftDeletes`.
- Create `vehicle_brands`, `payment_methods`, `expense_categories`.

Phase 2: operational documents

- Add nullable target columns to `inspection_documents`.
- Backfill `document_date` from legacy `date`.
- Create `services`, `service_tariffs`, `inspection_document_items`, `generated_documents`, `document_sequences`.
- Add document snapshots.

Phase 3: payments and cash

- Add nullable target columns to `payments`.
- Create `payment_lines`, `payment_allocations`, `cashboxes`, `cash_shifts`, `cash_transactions`.
- Backfill legacy `cash_amount` and `plastic_amount` into lines using seeded `payment_methods`.
- Backfill `inspection_document_id` into allocations.

Phase 4: fiscal and audit

- Create `fiscal_devices`, `fiscal_receipts`, `z_reports`, `audit_logs`.
- Add provider interface and fake provider for local/test only.

Phase 5: reconciliation and compatibility cleanup

- Add dry-run artisan commands.
- Reconcile document balances from allocations.
- Reconcile cash registers from posted payments/expenses.
- Update frontend types/forms gradually.
- Drop legacy columns only after all production clients stop sending/reading them and reconciliation passes.

Data migration requirements:

- Use `chunkById`.
- Make backfills idempotent or guarded by existence checks.
- Avoid loading whole datasets into memory.
- Log skipped/inconsistent rows.
- Keep migrations reversible; do not drop legacy columns in reversible expansion phases.

## Implementation Plan

1. Write docs and migration plan.
2. Add reference migrations and seeders.
3. Add operational document migrations.
4. Add payment/debt/cash register migrations.
5. Add fiscal/audit migrations.
6. Add enums and model casts/relations.
7. Add service/action layer with `DB::transaction`.
8. Add request normalization for legacy payloads.
9. Add policies and branch scoping.
10. Add resources/controllers/routes for new operations.
11. Update frontend TypeScript types and payment/expense/document forms.
12. Add feature tests for payment allocation, cash shifts, sequence locking, branch access, snapshots, fiscal failures.
13. Add docs: DB architecture, ERD, payment flow, cash flow, fiscal flow, migration plan, legacy columns.
14. Run backend tests, Pint, frontend build/typecheck.

## Risk Register

- PostgreSQL is the active local driver; migrations should avoid MySQL-specific SQL.
- `lockForUpdate` behavior must be tested on PostgreSQL for document sequences and financial posting.
- Existing frontend depends on legacy fields, so backend resources need a transition period.
- Legacy money scale `decimal(15,0)` may hide cents; migration to `decimal(18,2)` should preserve values as `.00`.
- Adding unique constraints on dirty production data can fail; add indexes first, validate duplicates, then add safe unique constraints.
- Soft deletes require model changes and query updates; adding `deleted_at` alone is not enough.
- Branch scoping can accidentally hide admin reports if implemented as a global scope without escape paths.
- Fake fiscal provider must not be bound automatically in production.
- Large backfills need dry-run commands and logs before commit mode.

## Documentation To Create

- `docs/DB_ARCHITECTURE.md`
- `docs/ERD.md`
- `docs/PAYMENT_FLOW.md`
- `docs/CASH_FLOW.md`
- `docs/FISCAL_FLOW.md`
- `docs/MIGRATION_PLAN.md`
- `docs/LEGACY_COLUMNS.md`

## Test Plan

Required backend coverage:

- Inspection document creation and calculation.
- Full payment for one document.
- Partial payment for one document.
- Cash plus card lines in one payment.
- One payment allocated to multiple documents.
- Old debt payment.
- Reject over-allocation beyond debt.
- Reject payment line sum mismatch.
- Create cash transaction when payment is posted.
- Create reversal transaction when payment is reversed.
- Expense posting creates cash expense transaction.
- Closed shift rejects new transaction.
- One cashbox cannot have two open shifts.
- Document sequence does not duplicate under parallel requests.
- Non-admin users cannot access another branch.
- Admin can access all branches.
- Fiscal failure does not lose payment.
- Completed document snapshots remain stable.
- Cash report balance is correct.

Current test status:

- Only Laravel example tests exist.
- No domain feature tests currently cover the ERP workflows.

## Final Verification Commands

Backend:

- `composer test`
- `php artisan test`
- `vendor/bin/pint --test`

Frontend:

- `npm run build`

Not currently available:

- PHPStan/Larastan
- ESLint script

