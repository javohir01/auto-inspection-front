# Avto Ko'rik Frontend

Bu repository texnik ko'rik tizimining yagona SPA frontend qismi. U backend API bilan ishlaydi, role-based menyu beradi, va foydalanuvchini quyidagi oqimlar bo'yicha olib yuradi:

1. Login
2. Dashboard
3. Mijozlar
4. Avtomobillar
5. Hujjatlar: texnik ko'rik, gaz, sug'urta, tonirovka
6. To'lovlar
7. Xarajatlar
8. Admin/moderator kataloglari

Backend repository:

- `/home/javohir/projects/vehicle-api`

Asosiy ishchi manzil:

- `http://localhost:8088`

## 1. Frontend nima qiladi

Frontend backend bilan to'g'ridan-to'g'ri form field darajasida ishlaydi. U:

- login orqali Sanctum token oladi
- tokenni `localStorage`da saqlaydi
- CRUD ekranlarda Laravel resource response'larini ko'rsatadi
- wizard ichida counterparty, vehicle, xizmat hujjati va payment oqimini ketma-ket yaratadi
- payment yaratishda yangi `lines` va `allocations` payloadini yuboradi
- list va dashboardlarda legacy compatibility maydonlarini ham ko'ra oladi

## 2. Repository xaritasi

Muhim kataloglar:

- `src/api`
  HTTP klient va CRUD service factory.
- `src/stores`
  Pinia storelar. Hozir eng asosiy store `auth`.
- `src/router`
  Sahifalar va role guardlar.
- `src/layouts`
  Umumiy shell.
- `src/views`
  Har bir ekran.
- `src/components`
  Qayta ishlatiladigan UI bo'laklar.
- `src/composables`
  Reusable logic.
- `src/mock`
  Mock backend. Default holatda o'chirilgan, lekin dev/test paytida yoqish mumkin.
- `src/types`
  Frontend ichidagi API entity interfeyslari.

## 3. Asosiy fayllar

### `src/api/http.ts`

Bu yerda:

- `axios` instance yaratiladi
- `VITE_API_URL` olinadi
- Bearer token har bir requestga qo'shiladi
- 401 bo'lsa token o'chiriladi va login sahifasiga qaytiladi

### `src/api/services.ts`

Bu yerda `resource<T>()` factory bor. Har bir API resurs uchun:

- `list`
- `get`
- `create`
- `update`
- `remove`

metodlari hosil qilinadi.

Shu fayl mock mode va real API o'rtasida switch qiladi.

### `src/stores/auth.ts`

Auth store quyidagilarni boshqaradi:

- `login`
- `fetchMe`
- `logout`
- `isAuthenticated`
- `isAdmin`
- `isMock`

### `src/composables/useCrud.ts`

List/create/update/delete ekranlaridagi umumiy state shu yerda:

- `items`
- `form`
- `loading`
- `saving`
- `dialogVisible`
- `openCreate`
- `openEdit`
- `save`
- `remove`

### `src/composables/paymentCompat.ts`

Bu frontendning backend bilan eng muhim bridge fayli:

- `buildPaymentPayload()`
  frontend form state'dan backend kutayotgan `lines` va `allocations` payloadini yig'adi
- `getPaymentBreakdown()`
  `lines` bo'lsa ulardan, bo'lmasa legacy `cash_amount/plastic_amount`dan breakdown hisoblaydi
- `getPrimaryInspectionDocumentId()`
  payment allocation ichidan document id topadi

## 4. Viewlar nima qiladi

### `views/Login.vue`

- telefon va parol qabul qiladi
- `auth.login()` ni chaqiradi
- muvaffaqiyatli bo'lsa dashboardga o'tadi

### `views/Dashboard.vue`

- admin bo'lsa system-wide countlarni ko'rsatadi
- header bilan bir xil `cash-balance` endpointidan kunlik qoldiq, naqd, terminal va xarajat summalarini ko'rsatadi
- `cash-balance:refresh` eventida header bilan birga qayta yuklanadi

### `views/Wizard.vue`

4 bosqichli oqim:

1. Counterparty tanlash yoki yaratish
2. Vehicle tanlash yoki yaratish
3. Inspection document yaratish
4. Ixtiyoriy payment yaratish

Bu ekran backendga ketma-ket bir nechta request yuboradi.

### `views/Payments.vue`

- payment list
- create/update dialog
- payment create paytida `payment-methods`ni olib, `buildPaymentPayload()` orqali payload yig'adi
- backend paymentni darhol `posted` qiladi, shu sabab posted payment edit/delete UI'da yopilgan
- saqlashdan keyin headerdagi kunlik balans refresh qilinadi

### `views/Documents.vue`

- inspection document list
- branch/date/license plate filterlari

### `views/Expenses.vue`

- expense CRUD
- xarajat asosi optionlardan tanlanadi, `Boshqa` tanlansa qo'lda kiritiladi
- expense saqlanganda backend operator/kassir kunlik balansidan yechadi

### `views/Counterparties.vue`, `Vehicles.vue`

- reference + operational ma'lumotlar CRUD sahifalari

### `views/Branches.vue`, `Users.vue`, `Catalogs.vue`

- admin/moderator ekranlari

## 5. Frontend qanday data yuboradi

### Login

```json
{
  "phone": "+998901112233",
  "password": "password"
}
```

### Counterparty create

```json
{
  "full_name": "Olimov Vali",
  "phone": "+998935554433",
  "region_id": 1,
  "district_id": 1,
  "address": "Chilonzor 19-kvartal, 5-uy",
  "basis_type": "Jismoniy shaxs"
}
```

### Vehicle create

```json
{
  "counterparty_id": 1,
  "vehicle_model_id": 2,
  "license_plate": "01A123BC",
  "manufacture_year": 2024,
  "current_fuel_type_id": 1
}
```

### Service document create

Wizarddagi `Hujjat turlari` ro‘yxatida texnik ko‘rik, gaz, sug‘urta va tonirovka turlari tanlanadi. Sug‘urta va tonirovka uchun forma hozircha umumiy hujjat formasining ixcham varianti: agar faqat shu oddiy turlar tanlansa, `Akt №` va `Yoqilg‘i turi` foydalanuvchidan so‘ralmaydi, lekin backend contract majburiy bo‘lgani uchun avtomatik to‘ldiriladi.

Wizardda bir nechta hujjat turini tanlash mumkin. Birinchi tanlangan tur asosiy `inspection_documents.document_type_id` sifatida yuboriladi, tanlangan barcha turlar esa shu hujjatga bog‘langan `generated_documents` yozuvlari sifatida saqlanadi. Umumiy summa tanlangan hujjat turlari narxlarining yig‘indisi sifatida ko‘rsatiladi.

Avtomobil yaratish bosqichida rusum selecti yonidagi `+` tugmasi orqali yangi rusum qo‘shib, darhol tanlab ketish mumkin.

```json
{
  "doc_number": "DOC-0001",
  "act_number": "ACT-0001",
  "date": "2026-06-18",
  "branch_id": 1,
  "vehicle_id": 1,
  "counterparty_id": 1,
  "fuel_type_id": 1,
  "document_type_id": 1,
  "employee_id": 1,
  "status": "completed",
  "gas_cylinder": {
    "type": "metan",
    "manufacturer_country": "Uzbekistan",
    "cylinder_number": "GB-123456",
    "volume_liters": 80,
    "weight_kg": 72.5,
    "manufacture_year": 2024,
    "working_pressure": 200,
    "test_pressure": 300
  }
}
```

### Payment create

Frontend hozir backendga quyidagi forward-compatible payload yuboradi:

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
  "receipt_type": "FTK",
  "lines": [
    { "payment_method_id": 1, "amount": 10000 }
  ],
  "allocations": [
    { "inspection_document_id": 1, "amount": 10000, "allocation_type": "payment" }
  ]
}
```

Backend bu payloadni `draft` qilib yaratadi va shu request ichida `posted` qiladi. Hozircha ishchi payment methodlar `CASH`, `UZCARD`, `HUMO`; Payme/Click UI va API helperlari frontdan olib tashlangan.

## 6. Frontend qanday data oladi

Frontend Laravel resource shape'ga tayangan:

```json
{ "data": ... }
```

Eng muhim response'lar:

- `/me`
  current user va uning branchi
- `/payment-methods`
  active `cash/card` metodlar: `CASH`, `UZCARD`, `HUMO`
- `/payments`
  legacy + new register maydonlar birga
- `/cash-balance`
  header uchun kunlik naqd/terminal/xarajat/seyf/qoldiq
- `/safe-deposits`
  kassir/operator kunlik balansidan branch umumiy seyfiga topshirish
- `/inspection-documents`
  branch, vehicle, counterparty, totals, items, generated documents
- `/cash-reports`
  `income`, `expense`, `summary`

## 7. Role va route nazorati

Frontend route guardlar:

- login qilinmagan user protected route'ga kira olmaydi
- `meta.roles` bo'yicha role filter ishlaydi
- menyu ham role asosida filtrlab ko'rsatiladi

Amaliy taqsimot:

- `admin`
  hamma sahifalar
- `cashier`
  operational sahifalar
- `moderator`
  reference/katalog sahifalar

## 8. Mock va real backend

Default holat:

- `VITE_USE_MOCKS=false`

Shuning uchun frontend real backend bilan ishlaydi.

Mock kerak bo'lsa:

- `.env` ichida `VITE_USE_MOCKS=true`
- yoki `localStorage.vehicle_mock_mode=true`

Mock layer fayli:

- `src/mock/backend.ts`

Eslatma:

- `src/composables/backend.ts` va `src/composables/services.ts` compatibility qoldiqlari sifatida turibdi
- amaldagi ishchi data layer `src/api/*` va `src/mock/backend.ts`

## 9. O'qish tartibi

Frontendni tez tushunish uchun:

1. `src/router/index.ts`
2. `src/stores/auth.ts`
3. `src/api/http.ts`
4. `src/api/services.ts`
5. `src/composables/paymentCompat.ts`
6. `src/views/Wizard.vue`
7. `src/views/Payments.vue`
8. `src/views/Dashboard.vue`

## 10. Qo'shimcha docs

Project-level docs:

- `/home/javohir/projects/vehicle-front/docs`
- `/home/javohir/projects/vehicle-api/docs`

Backendni tushunish uchun ayniqsa muhim:

- `/home/javohir/projects/vehicle-api/README.md`
- `/home/javohir/projects/vehicle-api/docs/PAYMENT_FLOW.md`
- `/home/javohir/projects/vehicle-api/docs/CASH_FLOW.md`
- `/home/javohir/projects/vehicle-api/docs/LEGACY_COLUMNS.md`
