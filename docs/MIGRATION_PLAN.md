# Migration Plan

Bu hujjat migrationlar va arxitektura bosqichlari hozir qayergacha yetganini amaldagi holat bo'yicha jamlaydi. Maqsad endi reja emas, balki tizim qaysi bosqichda qanday jadval va moslik qoidalari bilan ishlayotganini ko'rsatish.

## Umumiy Yondashuv

Loyiha destructive rewrite qilinmagan. O'zgarishlar bosqichma-bosqich, additive tarzda kiritilgan:

- eski kolonkalarga birdan tegilmagan
- yangi jadvallar yonma-yon qo'shilgan
- backfill yozuvlari migratsiya paytida yaratilgan
- API payloadlar legacy format bilan bir muddat mos holda ushlab turilgan

Shu sababli frontend va backend parallel o'tish davrida ishlay oladi.

## Phase 1: Reference Expansion

Migration:

- `2026_06_18_000001_phase1_reference_expansion.php`

Kiritilgan asosiy o'zgarishlar:

- `vehicle_brands`
- `payment_methods`
- `expense_categories`
- mavjud reference jadvallarga qo'shimcha nullable ustunlar va indexlar

Natija:

- transport markasi alohida reference qatlamga ajratildi
- payment method endi kodlangan va seed qilinadigan obyekt bo'ldi
- expense category reporting uchun tayyorlandi

Moslik qoidalari:

- mavjud jadval strukturasi buzilmagan
- unique constraintlar imkon qadar kechiktirilgan
- soft delete pattern majburan kiritilmagan

## Phase 2: Inspection Documents

Migration:

- `2026_06_18_000002_phase2_inspection_documents.php`

Kiritilgan asosiy jadvallar:

- `services`
- `service_tariffs`
- `inspection_document_items`
- `generated_documents`
- `document_sequences`

`inspection_documents` ga qo'shilgan asosiy yo'nalishlar:

- yangi lifecycle maydonlari
- `document_date`
- snapshotga mos ustunlar
- subtotal/discount/total bilan yanada aniq tuzilma

Natija:

- ko'rik hujjati endi satrli modelga o'tdi
- xizmat va tariflar hujjatdan ajratildi
- print/formal documentlar raqamlangan oqimga ega bo'ldi

Moslik qoidalari:

- legacy `date` va eski statuslar saqlangan
- yangi maydonlar nullable yoki default bo'lgani sababli eski API sinmagan

## Phase 3: Payments And Cash Registers

Migration:

- `2026_06_18_000003_phase3_payments_cash_registers.php`

Kiritilgan asosiy jadvallar:

- `payment_lines`
- `payment_allocations`
- `cashboxes`
- `cash_shifts`
- `cash_transactions`

`payments` jadvali uchun:

- yangi payment modeli header sifatida qoldi
- legacy `cash_amount` va `plastic_amount` saqlanib turdi
- eski yozuvlar line va allocationlarga backfill qilindi

Natija:

- bitta payment ichida bir nechta usul saqlash mumkin bo'ldi
- hujjat qarzi allocations orqali hisoblanadigan bo'ldi
- naqd pul registri alohida kassa qatlamiga ajratildi

Moslik qoidalari:

- eski payload yuborilsa backend uni normalize qiladi
- `inspection_document_id` legacy ko'rinishda hali mavjud
- cash transaction faqat kerakli sharoitlarda yaratiladi

## Phase 4: Fiscal And Audit

Migration:

- `2026_06_18_000004_phase4_fiscal_audit.php`

Kiritilgan asosiy jadvallar:

- `fiscal_devices`
- `fiscal_receipts`
- `z_reports`
- `audit_logs`

Kod qatlamida qo'shilgan asosiy bloklar:

- `FiscalProviderInterface`
- INV, FTK va Fake providerlar
- audit writer action/service

Natija:

- payment va refund fiskallashtirish uchun arxitektura tayyorlandi
- provider xatolari saqlanadigan persistent qatlam paydo bo'ldi
- audit izi muhim operatsiyalar uchun mavjud bo'ldi

Moslik qoidalari:

- real provider integratsiyasi to'liq bo'lmasa ham schema tayyor
- fake provider lokal/test oqimlarini sindirmaydi
- payment posting fiskal xatoda bekor qilinmaydi

## Phase 5: Reconciliation And Branch Scope

Bu bosqichda ko'proq application layer yakunlandi.

Qo'shilgan commandlar:

- `documents:reconcile-balances`
- `cash:reconcile`
- `sequences:check`
- `legacy:migrate-payments`

Qo'shilgan API yo'nalishlari:

- `/api/v1/cash-reports`
- `/api/v1/cash-reports/summary`

Qo'shilgan mantiq:

- inspection documents branch scope
- payments branch scope
- expenses branch scope
- cash reports branch scope

Natija:

- branch user boshqa filial ma'lumotini ko'ra olmaydi
- document debt registrdan tekshirilib chiqiladi
- cash movement registr va hisobotlar bir-biriga solishtiriladi
- eski paymentlar uchun backfill/retry oqimi mavjud

## Amaldagi Source Of Truth

Bosqichlar yakunidan keyin tizim quyidagi qoidalarga tayanadi:

- document debt: `payment_allocations`
- payment method breakdown: `payment_lines`
- cash totals: `cash_transactions`
- formal numbering: `document_sequences`
- fiscal status: `fiscal_receipts`

Eski kolonkalarning bir qismi hali compatibility uchun turibdi, lekin asosiy biznes hisobi endi ularga tayanmaydi.

## Legacy Columns Nega Hali Qolgan

Legacy ustunlar saqlanib turishining sababi:

- eski frontend oqimlari birdan uzilib qolmasligi
- API resource va formalar bosqichma-bosqich yangilanishi
- backfill va reconciliation qayta ishlashi

Misollar:

- `payments.cash_amount`
- `payments.plastic_amount`
- `payments.inspection_document_id`
- ayrim eski sana/status maydonlari

## Qayta Ishga Tushirish Xavfsizligi

Migration va backfilllar quyidagi tamoyillar bilan yozilgan:

- rerun-safe
- additive
- chunked backfill
- imkon qadar reversible

Artisan commandlar ham shunga mos:

- default holatda dry-run
- ma'lumot o'zgartirish uchun `--commit` talab qilinadi

## Frontendga Ta'siri

Frontend endi quyidagilarni hisobga olishi kerak:

- payment form faqat bitta summa emas, `lines` bilan ishlashi mumkin
- document ekranlari itemlar bilan ishlaydi
- cash report alohida endpointdan keladi
- branch user cheklovlari backend tomonidan ham enforced qilinadi

Shuning uchun frontendda compatibility helperlar bor, lekin yangi contractlar ustuvor hisoblanadi.

## Hozirgi Holat

Bosqichlar bo'yicha birinchi katta o'tish yakunlangan:

- reference layer tayyor
- document layer tayyor
- payment/cash register layer tayyor
- fiscal/audit layer tayyor
- reconciliation va branch scope ishlayapti

Keyingi ehtimoliy bosqichlar endi arxitektura qurish emas, balki:

- real fiscal provider integratsiyasini to'ldirish
- frontenddagi legacy payloadlardan to'liq chiqish
- compatibility kolonkalari end-of-life auditini o'tkazish

Demak migratsiya rejasi amalda bajarilgan, hozirgi vazifa esa yangi modelni to'liq ekspluatatsiya qilish va legacy qatlamni ehtiyotkorlik bilan qisqartirishdan iborat.
