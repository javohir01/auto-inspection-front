# Payment Flow

## Maqsad

Payment qatlami inspection document summasini qabul qilish, uni payment line'lar bo'yicha bo'lish, documentlarga allocation qilish, va kerak bo'lsa cash/fiscal qatlamlarga uzatish uchun ishlatiladi.

## Oqim

```text
inspection document
-> calculation
-> payment create
-> payment lines
-> allocations
-> payment post
-> cash transaction
-> fiscal receipt
```

## Qayerda ishlaydi

- Controller: `app/Http/Controllers/Api/PaymentController.php`
- Validation: `app/Http/Requests/PaymentRequest.php`
- Create: `app/Actions/CreatePaymentAction.php`
- Post: `app/Actions/PostPaymentAction.php`
- Reverse: `app/Actions/ReversePaymentAction.php`
- Resource: `app/Http/Resources/PaymentResource.php`

## Kiruvchi payload formatlari

### Legacy-compatible

```json
{
  "inspection_document_id": 1,
  "branch_id": 1,
  "counterparty_id": 1,
  "date": "2026-06-18",
  "total_amount": 10000,
  "cash_amount": 10000,
  "plastic_amount": 0,
  "receipt_type": "FTK"
}
```

### Forward-compatible

```json
{
  "inspection_document_id": 1,
  "branch_id": 1,
  "counterparty_id": 1,
  "date": "2026-06-18",
  "payment_type": "regular",
  "status": "draft",
  "total_amount": 10000,
  "cash_amount": 10000,
  "plastic_amount": 0,
  "lines": [
    { "payment_method_id": 1, "amount": 10000 }
  ],
  "allocations": [
    { "inspection_document_id": 1, "amount": 10000, "allocation_type": "payment" }
  ]
}
```

## Validation qoidalari

`PaymentRequest` quyidagilarni tekshiradi:

- `branch_id` va `counterparty_id` majburiy
- `date` majburiy
- `total_amount >= 0`
- agar `lines` berilgan bo'lsa, line amountlar yig'indisi `total_amount`ga teng bo'lishi kerak
- agar `lines` berilmagan bo'lsa, `cash_amount + plastic_amount = total_amount`
- `allocations` bo'lsa, har birida `inspection_document_id` va `amount` bo'lishi kerak

## Resource shape

Payment response frontendga quyidagilarni qaytaradi:

- identity: `id`
- legacy reference: `inspection_document_id`
- relationlar: `inspection_document`, `branch`, `cashbox`, `counterparty`, `employee`
- timing: `date`, `paid_at`, `posted_at`, `cancelled_at`
- state: `payment_type`, `status`
- money: `total_amount`, `cash_amount`, `plastic_amount`
- compatibility: `receipt_type`, `z_report_id`
- registers: `lines`, `allocations`, `cash_transactions`

## Yaratishdan keyingi holat

`CreatePaymentAction` ikki xil yo'lni qo'llab-quvvatlaydi:

- `lines/allocations` yuborilgan bo'lsa, ularni bevosita ishlatadi
- legacy `cash_amount/plastic_amount/inspection_document_id` yuborilgan bo'lsa:
  - `CASH` va `UZCARD` payment methodlari asosida `payment_lines` hosil qiladi
  - `inspection_document_id` asosida `payment_allocations` hosil qiladi

## Posting

Posting `POST /api/v1/payments/{payment}/post` bilan qilinadi.

Posting vaqtida:

1. payment row `lockForUpdate()` bilan olinadi
2. status `draft` ekanligi tekshiriladi
3. line sum va allocation sum qayta tekshiriladi
4. cashbox ko'rsatilgan bo'lsa open shift tekshiriladi
5. status `posted`ga o'tadi
6. `cash_transactions` yoziladi

## Reverse

`POST /api/v1/payments/{payment}/reverse`

Bu flow:

- paymentni `reversed` holatga olib o'tadi
- kerak bo'lsa reversal cash transaction yaratadi
- posted to'lovni bevosita edit qilish o'rniga correction sifatida ishlatiladi

## Frontend nuqtai nazari

Frontend:

- list va dashboard uchun `cash_amount`, `plastic_amount`ni hali o'qiydi
- create/update uchun `lines` va `allocations` yuborishni boshlagan
- `payment-methods` endpointidan `CASH`, `UZCARD`, `HUMO`, `BANK`, `REFUND` ni olib ishlatadi

## Muhim qaror

Legacy payment maydonlari hali response va requestda saqlanadi. Lekin kelajakda register truth:

- `payment_lines`
- `payment_allocations`

bo'ladi.
