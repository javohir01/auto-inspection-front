# DB Structure

Bu hujjat frontend asosida tiklangan qisqa DB sxema tavsifi. Backend migrationlar repo ichida yo'q, shuning uchun bu schema `inferred`.

Manbalar:

- [src/types/index.ts](/home/javohir/projects/vehicle-front/src/types/index.ts:1)
- [src/views/Wizard.vue](/home/javohir/projects/vehicle-front/src/views/Wizard.vue:1)
- [src/mock/backend.ts](/home/javohir/projects/vehicle-front/src/mock/backend.ts:1)

## Jadvallar

### `branches`
- `id`
- `name`
- `is_active`
- `created_at?`
- `updated_at?`

### `regions`
- `id`
- `name`

### `districts`
- `id`
- `region_id` -> `regions.id`
- `name`

### `fuel_types`
- `id`
- `name`

### `document_types`
- `id`
- `name`

### `vehicle_models`
- `id`
- `name`

### `users`
- `id`
- `branch_id?` -> `branches.id`
- `name`
- `phone`
- `role` = `admin | moderator | cashier`
- `password` (response type'da yo'q, lekin create/edit payload'da bor)
- `created_at?`
- `updated_at?`

### `counterparties`
- `id`
- `full_name`
- `phone`
- `region_id` -> `regions.id`
- `district_id` -> `districts.id`
- `address`
- `basis_type`

### `vehicles`
- `id`
- `counterparty_id` -> `counterparties.id`
- `vehicle_model_id` -> `vehicle_models.id`
- `license_plate`
- `manufacture_year`
- `body_number?`
- `chassis_number?`
- `engine_number?`
- `current_fuel_type_id` -> `fuel_types.id`

### `inspection_documents`
- `id`
- `doc_number`
- `act_number`
- `date`
- `branch_id` -> `branches.id`
- `vehicle_id` -> `vehicles.id`
- `counterparty_id` -> `counterparties.id`
- `fuel_type_id` -> `fuel_types.id`
- `document_type_id` -> `document_types.id`
- `employee_id` -> `users.id`
- `status` = `pending | completed`

### `payments`
- `id`
- `inspection_document_id?` -> `inspection_documents.id`
- `branch_id` -> `branches.id`
- `counterparty_id` -> `counterparties.id`
- `date`
- `total_amount`
- `cash_amount`
- `plastic_amount`
- `receipt_type` = `INV | FTK`
- `z_report_id?`

### `expenses`
- `id`
- `branch_id` -> `branches.id`
- `employee_id?` -> `users.id`
- `date`
- `basis`
- `payment_method`
- `amount`
- `description?`

## Relationshiplar

- `regions` -> `districts`, `counterparties`
- `districts` -> `counterparties`
- `branches` -> `users`, `inspection_documents`, `payments`, `expenses`
- `counterparties` -> `vehicles`, `inspection_documents`, `payments`
- `vehicle_models` -> `vehicles`
- `fuel_types` -> `vehicles`, `inspection_documents`
- `document_types` -> `inspection_documents`
- `users` -> `inspection_documents`, `expenses`
- `vehicles` -> `inspection_documents`
- `inspection_documents` -> `payments`

## Qisqa SQL draft

```sql
branches(id, name, is_active, created_at, updated_at)
regions(id, name)
districts(id, region_id, name)
fuel_types(id, name)
document_types(id, name)
vehicle_models(id, name)
users(id, branch_id, name, phone, role, password, created_at, updated_at)
counterparties(id, full_name, phone, region_id, district_id, address, basis_type)
vehicles(id, counterparty_id, vehicle_model_id, license_plate, manufacture_year, body_number, chassis_number, engine_number, current_fuel_type_id)
inspection_documents(id, doc_number, act_number, date, branch_id, vehicle_id, counterparty_id, fuel_type_id, document_type_id, employee_id, status)
payments(id, inspection_document_id, branch_id, counterparty_id, date, total_amount, cash_amount, plastic_amount, receipt_type, z_report_id)
expenses(id, branch_id, employee_id, date, basis, payment_method, amount, description)
```

## Analiz uchun savollar

1. `users.phone` unique'mi?
2. `vehicles.license_plate` unique'mi?
3. `doc_number` va `act_number` unique'mi?
4. `inspection_documents.counterparty_id` redundant emasmi?
5. `payment_method` va `basis_type` reference table bo'lishi kerakmi?
6. FK `on delete` qoidalari qanday?

