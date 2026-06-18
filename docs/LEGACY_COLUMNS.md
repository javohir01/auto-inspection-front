# Legacy Columns

Bu hujjat eski frontend/API contractni buzmaslik uchun saqlanib turgan maydonlarni ko'rsatadi.

Asosiy qoida:

- eski maydon hozircha olib tashlanmaydi
- yangi register/document qatlamlari parallel ishlaydi
- frontend bosqichma-bosqich yangi maydonlarga ko'chadi

## 1. `inspection_documents`

Hali compatibility uchun saqlanayotgan maydonlar:

- `date`
- `document_type_id`
- `status`

Yangi qatlam:

- `document_date`
- `primary_document_type_id`
- `payment_status`
- `subtotal`
- `discount_amount`
- `total_amount`
- `counterparty_snapshot`
- `vehicle_snapshot`
- `tariff_snapshot`

Izoh:

- Frontend wizard hali `date`, `document_type_id`, `status` bilan ishlay oladi.
- Resource esa qo'shimcha yangi maydonlarni ham qaytaradi.
- `CalculateInspectionDocumentAction` hisoblangan summalarni to'ldiradi.

## 2. `payments`

Saqlanayotgan legacy maydonlar:

- `inspection_document_id`
- `date`
- `cash_amount`
- `plastic_amount`
- `receipt_type`
- `z_report_id`

Yangi qatlam:

- `paid_at`
- `payment_type`
- `status`
- `cashbox_id`
- `employee_id`
- `payment_lines`
- `payment_allocations`

Izoh:

- Frontend hozir create payloadda yangi `lines` va `allocations` yuboradi.
- Lekin list/dashboard compatibility uchun `cash_amount` va `plastic_amount` ham mavjud.
- `inspection_document_id` ham hali saqlangan, chunki ko'p ekran shu maydonga tayanadi.

## 3. `expenses`

Saqlanayotgan legacy maydonlar:

- `date`
- `basis`
- `payment_method`

Kelajakdagi yo'nalish:

- `expense_category_id`
- `payment_method_id`
- `spent_at`
- `status`
- `expense_number`

Hozirgi holat:

- expense API hali eski frontend contract bilan ishlaydi
- `expense_categories` va `payment_methods` reference foundation sifatida mavjud

## 4. Reference qatlamdagi compatibility

Phase 1 reference expansion eski payloadlarni buzmasdan yangi nullable maydonlar qo'shdi.

### `branches`

Yangi maydonlar:

- `code`
- `region_id`
- `district_id`
- `address`
- `phone`
- `is_active`

### `counterparties`

Yangi maydonlar:

- `type`
- `short_name`
- `additional_phone`
- `pinfl`
- `tin`
- `passport_series`
- `passport_number`
- `notes`
- `is_active`

### `vehicles`

Yangi/expanded maydonlar:

- `technical_passport_series`
- `technical_passport_number`
- `color`
- `notes`

### `vehicle_models`

- `vehicle_brand_id`
- `is_active`

## 5. Frontend uchun amaliy ma'no

Frontendda quyidagi compatibility strategiya ishlatiladi:

- eski list sahifalari legacy fieldlarni o'qishda davom etadi
- create flow imkon qadar yangi register-friendly payload yuboradi
- backend response esa eski va yangi maydonlarni birga qaytaradi

Bu nimani anglatadi:

- migration bir martalik keskin switch emas
- API consumerlar bosqichma-bosqich yangilanadi

## 6. Nima source-of-truth emas

Quyidagilar forward architecture uchun asosiy truth emas:

- `payments.cash_amount`
- `payments.plastic_amount`
- document debtni saqlab turuvchi qo'lda hisoblangan tashqi fieldlar

Forward truth:

- payment splitlar uchun `payment_lines`
- document balance uchun `payment_allocations`
- cash reporting uchun `cash_transactions`
