# DB Architecture

Bu hujjat backend bazasining amaldagi mantiqiy tuzilishini tushuntiradi: qaysi jadvallar qaysi qatlamga tegishli, haqiqiy source of truth qayerda, va frontend/backend o'rtasida qaysi ma'lumotlar qanday oqadi.

## Arxitektura g'oyasi

Loyiha 1C uslubidagi ajratishga yaqin tuzilgan:

- reference data: doimiy yoki sekin o'zgaradigan ma'lumotlar
- operational documents: foydalanuvchi yaratadigan asosiy hujjatlar
- registers: pul harakati va qarzdorlikni hisoblaydigan registrlar
- fiscal layer: fiskal qurilmalar va cheklar
- audit and numbering: izchillik, jurnal va raqam generatorlari

Amaliy jihatdan tizim quyidagi bloklarga bo'linadi.

## 1. Reference Data

Bu qatlam formalar, selectlar, va snapshotlar uchun asos bo'ladi.

Asosiy jadvallar:

- `branches`
- `regions`
- `districts`
- `users`
- `counterparties`
- `vehicles`
- `vehicle_brands`
- `vehicle_models`
- `fuel_types`
- `document_types`
- `payment_methods`
- `expense_categories`
- `services`
- `service_tariffs`
- `cashboxes`
- `fiscal_devices`

Bu jadvallardagi yozuvlar odatda CRUD orqali boshqariladi va boshqa hujjatlar ularga FK yoki snapshot orqali ulanadi.

## 2. Operational Documents

Bu qatlam foydalanuvchi ish jarayonida yaratadigan obyektlarni saqlaydi.

Asosiy jadvallar:

- `inspection_documents`
- `inspection_document_items`
- `generated_documents`
- `payments`
- `expenses`
- `cash_shifts`

### `inspection_documents`

Bu biznesning markaziy hujjati. U quyidagilarni saqlaydi:

- filial
- kontragent
- transport
- hujjat sanasi
- subtotal, discount, total
- holat
- izohlar

### `inspection_document_items`

Har bir xizmat satri alohida saqlanadi:

- `service_id`
- `tariff_id`
- `quantity`
- `unit_price`
- `line_total`
- snapshot maydonlari

Bu yondashuv sababli umumiy summa hujjatga yoziladi, lekin tarkibi satrlarda turadi.

### `generated_documents`

Asosiy ko'rik hujjati bilan bog'langan print/formal hujjatlar:

- dalolatnoma
- sertifikat
- boshqa document type asosidagi raqamlangan hujjatlar

## 3. Payment Register Layer

Pul qabul qilish jarayoni endi faqat legacy `payments.cash_amount` va `payments.plastic_amount` maydonlariga tayanmaydi. Asosiy hisob quyidagi jadvallarda yuradi:

- `payments`
- `payment_lines`
- `payment_allocations`

### `payments`

Bu payment header:

- kim qabul qildi
- qaysi filialda
- qachon
- umumiy summa
- holat
- izoh

### `payment_lines`

Payment ichidagi real to'lov usullari shu yerda:

- `payment_method_id`
- `amount`
- `cashbox_id` agar naqd bo'lsa
- `direction`
- `status`

Misol:

- 300000 UZS cash
- 200000 UZS card

Bitta payment uchun ikki line bo'lishi mumkin.

### `payment_allocations`

Payment qaysi hujjat qarzini yopayotganini shu jadval ko'rsatadi:

- `payment_id`
- `payment_line_id`
- `inspection_document_id`
- `amount`
- `allocation_type`
- `status`

Shuning uchun qarzdorlik hisobida source of truth aynan allocationlar bo'ladi.

## 4. Cash Register Layer

Naqd pul harakati alohida registr orqali yuradi:

- `cashboxes`
- `cash_shifts`
- `cash_transactions`

### `cash_transactions`

Cash report, kassir nazorati va filial kesimidagi balanslar shu jadvaldan quriladi.

Asosiy transaction turlari:

- payment inflow
- expense outflow
- manual correction yoki reconciliation natijalari

Muhim qoida:

- cash report summalari legacy payment columnlardan emas
- posted `cash_transactions` yozuvlaridan olinadi

## 5. Fiscal Layer

Fiskal blok quyidagi jadvallardan iborat:

- `fiscal_devices`
- `fiscal_receipts`
- `z_reports`

Bu qatlam payment posting jarayonidan keyin yoki shu bilan bog'liq holda ishlaydi, lekin payment registrini almashtirmaydi. Ya'ni:

- payment registr alohida haqiqiy hisob
- fiscal receipt tashqi fiskal tasdiq/qayd

## 6. Audit And Numbering

Kuzatuv va izchillik uchun:

- `audit_logs`
- `document_sequences`

### `document_sequences`

Raqam berish markazlashgan:

- branch
- document type
- year yoki boshqa scope
- current_value

Generated documentlar va boshqa raqam talab qiladigan obyektlar shu qatlamdan foydalanadi.

## Source Of Truth Qoidalari

### Document debt

Hujjat qarzi `inspection_documents` ichida oddiy yozib qo'yilgan maydon emas, allocationlardan hisoblanadigan natijadir.

Formula:

```text
paid_amount =
    sum(posted allocations where allocation_type = payment)
  - sum(posted allocations where allocation_type = refund)

debt_amount = inspection_documents.total_amount - paid_amount
```

Shuning uchun:

- payment borligi hali qarz yopildi degani emas
- allocation bo'lmasa hujjatga tatbiq qilinmagan pul hisoblanadi

### Cash balance

Naqd qoldiq:

```text
cash_balance =
    sum(posted cash inflows)
  - sum(posted cash outflows)
```

Bu `cash_transactions` asosida olinadi.

### Fiscal status

Fiskal muvaffaqiyat yoki xato `fiscal_receipts.status` orqali kuzatiladi. Bu paymentning o'zini bekor qilmaydi.

## Legacy Compatibility

Loyihada eski frontend va eski API payloadlar bilan moslashuv saqlangan.

Hozircha quyidagilar saqlab turilibdi:

- `payments.inspection_document_id`
- `payments.cash_amount`
- `payments.plastic_amount`
- eski payment payload formatlari
- `inspection_documents.date` kabi legacy maydonlar

Lekin yangi biznes hisobi quyidagilarga tayanadi:

- `payment_lines`
- `payment_allocations`
- `cash_transactions`
- `generated_documents`
- `document_sequences`

## Branch Scope

Ko'p jadval filial bilan bog'langan:

- `inspection_documents.branch_id`
- `payments.branch_id`
- `expenses.branch_id`
- `cashboxes.branch_id`
- `cash_shifts.branch_id`
- `cash_transactions.branch_id`

Backend API branch userlar uchun avtomatik scope qo'llaydi. Shu sababli frontend branch user nomidan boshqa filial ma'lumotini so'rasa ham, backend cheklov qo'yadi.

## Transaction Boundaries

Quyidagi operatsiyalar transaction ichida bajarilishi kerak:

- payment yaratish va posting
- line va allocation yozish
- expense posting
- cash shift ochish/yopish
- sequence number olish
- fiscal receipt holatini saqlash

Bu qisman yozilib qolgan ma'lumotlarni kamaytiradi.

## Frontend Uchun Muhim Contractlar

Frontend ko'pincha quyidagi strukturalarni ko'radi:

- inspection document with nested `items`
- payment with nested `lines` va `allocations`
- cash report summary grouped by branch, cashbox, method
- lookup listlar: branches, services, tariffs, payment methods, expense categories

Demak UI formalar endi faqat oddiy summa bilan emas, satrlar va bog'lanishlar bilan ishlashi kerak.

## Yakuniy Xulosa

Amaldagi arxitekturada:

- reference data ma'lumot manbai
- operational documents biznes obyekt
- payment allocations qarzdorlik source of truth
- cash transactions kassa source of truth
- fiscal receipts tashqi fiskal holatni ifodalaydi
- audit va sequence qatlamlari nazorat va izchillik beradi

Shu model backend va frontendning hozirgi ishlashiga mos keladi.
