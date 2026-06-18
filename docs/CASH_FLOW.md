# Cash Flow

## Maqsad

Cash qatlami real pul harakatini `cash_transactions` orqali saqlaydi. Dashboard va cash reportlar shu registrga tayanadi, `payments.cash_amount`ga emas.

## Oqim

```text
open shift
-> posted payment / expense
-> cash transaction
-> cash report
-> reconciliation
-> Z report
-> close shift
```

## Qayerda ishlaydi

- Cashbox controller: `app/Http/Controllers/Api/CashboxController.php`
- Cash shift controller: `app/Http/Controllers/Api/CashShiftController.php`
- Cash report controller: `app/Http/Controllers/Api/CashReportController.php`
- Open action: `app/Actions/OpenCashShiftAction.php`
- Close action: `app/Actions/CloseCashShiftAction.php`
- Report action: `app/Actions/BuildCashReportAction.php`

## Asosiy jadvallar

- `cashboxes`
- `cash_shifts`
- `cash_transactions`

## Shift ochish

Endpoint:

- `POST /api/v1/cashboxes/{cashbox}/open-shift`

Kiruvchi payload odatda:

```json
{
  "shift_number": "S-001",
  "opening_balance": "0.00"
}
```

Natija:

- cashbox uchun `open` statusli `cash_shift` yaratiladi
- bitta cashboxda bir vaqtning o'zida faqat bitta open shift bo'lishi mumkin

## Cash transaction qayerdan keladi

### Paymentdan

`PostPaymentAction` payment posted bo'lganda:

- paymentda `cashbox_id` bo'lsa
- va shu cashboxda open shift bo'lsa

har bir payment line uchun `cash_transactions` yaratadi.

### Expensedan

Expense posted/reconciliation oqimlari cash chiqim transactionlariga olib keladi.

### Reversaldan

Reversed payment alohida reversal/correction yozuvlariga sabab bo'lishi mumkin.

## Cash report

Endpointlar:

- `GET /api/v1/cash-reports`
- `GET /api/v1/cash-reports/summary`

Qo'llab-quvvatlanadigan filterlar:

- `branch_id`
- `cashbox_id`
- `cash_shift_id`
- `payment_method_id`
- `employee_id`
- `date_from`
- `date_to`

## Cash report javobi

```json
{
  "data": {
    "income": [],
    "expense": [],
    "summary": {
      "opening_balance": "0.00",
      "cash_income": "0.00",
      "card_income": "0.00",
      "cash_expense": "0.00",
      "refunds": "0.00",
      "bank_deposit": "0.00",
      "expected_balance": "0.00"
    }
  }
}
```

`BuildCashReportAction` ichida:

- `income` va `expense` transaction ro'yxatlari qaytariladi
- `summary` posted `cash_transactions` asosida yig'iladi
- enum-cast qilingan transaction type'lar normalize qilinadi

## Branch cheklovi

`CashReportController` `BranchScope`dan foydalanadi:

- admin har qanday branchni ko'ra oladi
- oddiy user faqat o'z branchini ko'ra oladi

## Reconciliation commandlar

- `cash:reconcile`
  Posted payment bor, lekin cash transaction yo'q holatlarni topadi.
- `sequences:check`
  To'g'ridan-to'g'ri cash emas, lekin document numbering integrity uchun report beradi.
- `documents:reconcile-balances`
  Cash emas, lekin payment allocation va document balance mosligini tekshiradi.

## Close shift

Endpoint:

- `POST /api/v1/cash-shifts/{cashShift}/close`

Close flow:

1. expected balance hisoblanadi
2. actual closing balance saqlanadi
3. difference yoziladi
4. Z-report bog'lanishi mumkin
5. shift `closed` bo'ladi

## Muhim qaror

Haqiqiy cash reporting uchun oldinga qarab source-of-truth:

- `cash_transactions`

Compatibility maydonlari:

- `payments.cash_amount`
- `payments.plastic_amount`

hali saqlangan, lekin report logikasi shu maydonlarga tayanmasligi kerak.
