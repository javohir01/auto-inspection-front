# Fiscal Flow

Bu hujjat fiskal qatlam backendda qanday joylashganini va payment jarayoni bilan qanday bog'langanini tushuntiradi.

## Maqsad

Fiskal modulning vazifasi:

- payment yoki refund uchun fiskal chek yaratish
- tashqi provider bilan muloqot qilish
- natijani ichki bazada saqlash
- muvaffaqiyatsiz urinishlarni kuzatish

Muhim nuqta: fiskal qatlam payment registrining o'rnini bosmaydi. Pul hisobi alohida, fiskal qayd alohida.

## Asosiy Komponentlar

### Interface

Backend providerlarni bitta contract ortiga yashiradi:

- `FiscalProviderInterface`

Undagi asosiy metodlar:

- `checkConnection()`
- `createSaleReceipt()`
- `createRefundReceipt()`
- `getReceipt()`
- `getZReport()`

### Providerlar

Loyihada uch turdagi provider mavjud:

- `InvFiscalProvider`
- `FtkFiscalProvider`
- `FakeFiscalProvider`

Amaldagi holat:

- INV va FTK implementatsiyalari xavfsiz stub ko'rinishida
- ular credential yoki real API tafsilotisiz fail-fast qiladi
- `FakeFiscalProvider` lokal va test oqimlari uchun ishlatiladi

## Baza Jadvallari

Fiskal qatlam quyidagi jadvallarga tayanadi:

- `fiscal_devices`
- `fiscal_receipts`
- `z_reports`

### `fiscal_devices`

Saqlaydi:

- provider turi
- filial yoki qurilma konteksti
- identifikatorlar
- encrypted credentials
- faol holat

### `fiscal_receipts`

Saqlaydi:

- qaysi payment yoki refund bilan bog'liqligi
- provider
- request payload
- response payload
- status
- external receipt id
- xato tavsifi

Odatdagi statuslar:

- `pending`
- `success`
- `failed`

### `z_reports`

Kun yoki smena bo'yicha provider Z-hisobot natijasini saqlaydi.

## Payment Bilan Bog'lanish

Amaldagi mantiqda payment posting va fiskal jarayon alohida mas'uliyatlarga ega.

1. Payment backendga keladi.
2. Backend payment header, line, allocationlarni transaction ichida saqlaydi.
3. Zarur bo'lsa fiskal receipt uchun yozuv yaratiladi.
4. Providerga chiqish amalga oshiriladi.
5. Javobga qarab `fiscal_receipts` yangilanadi.

Muhim qoida:

- provider xatoga uchrasa paymentning o'zi o'chirilmaydi
- xatolik `fiscal_receipts.status=failed` ko'rinishida qoladi

Bu yondashuv kassa hisobini fiskal tashqi tizimdagi vaqtinchalik xatolardan ajratadi.

## Sale Receipt Oqimi

Tipik sale flow:

1. foydalanuvchi payment yaratadi
2. backend uni post qiladi
3. fiskallashtirilishi kerak bo'lsa `pending` receipt yaratiladi
4. provider payload tayyorlanadi
5. provider sale receipt qaytaradi
6. receipt `success` holatiga o'tadi va tashqi identifikator saqlanadi

Yozuvlarda odatda quyidagilar bo'ladi:

- branch
- device
- payment summary
- method breakdown
- document reference
- timestamps

## Refund Receipt Oqimi

Refund yoki reversal bo'lsa:

1. refund payment yoki allocation yaratiladi
2. `createRefundReceipt()` ishlatiladi
3. oldingi receipt bilan bog'lanish saqlanishi mumkin
4. provider javobi alohida refund receipt sifatida qayd etiladi

Bu qaytimni oddiy sale bilan aralashtirmaslikka yordam beradi.

## Z-Report Oqimi

Z-report oqimi odatda smena yoki kun yakuniga yaqin ishlaydi:

1. qurilma tanlanadi
2. providerdan Z-report olinadi
3. `z_reports` ga yoziladi
4. audit yozuvi qoldiriladi

Bu jarayon cash reconciliation bilan bir xil narsa emas. Z-report fiskal qurilma kesimidagi tashqi hisobot, cash report esa ichki registr hisobi.

## Xavfsizlik Qoidalari

- plain credential JSON ichida ochiq saqlanmaydi
- credentiallar encrypted cast yoki maxfiy saqlash mexanizmi orqali yuradi
- request/response payloadlarda secretlar maskalanishi kerak
- fake provider productionda avtomatik yoqilmaydi

`services.fiscal.fake_enabled` faqat kerakli muhitlarda ishlatiladi.

## Audit

Fiskal operatsiyalar auditga yozilishi kerak, ayniqsa:

- receipt create attempt
- receipt success
- receipt fail
- z-report olish

Backendda bu uchun audit writer/action qatlami mavjud.

## Frontend Nima Bilishi Kerak

Frontend uchun muhim jihatlar:

- payment muvaffaqiyatli saqlangan bo'lsa ham fiscal status keyinroq `failed` bo'lishi mumkin
- shuning uchun UI payment status va fiscal statusni ajratib ko'rsatishi kerak
- operatorga retry yoki manual follow-up uchun sabab ko'rsatilishi kerak

API response ichida ideal holda quyidagilar ajratiladi:

- payment holati
- fiscal receipt holati
- error message yoki provider reference

## Amaldagi Cheklov

Hozirgi kod holatida:

- provider contract va model qatlamlari tayyor
- INV/FTK real integratsiyasi hali to'liq ulanmagan
- fake provider bilan lokal oqimni tekshirish mumkin

Shuning uchun production ulanishi uchun providerga xos request/response mappingni yakunlash kerak bo'ladi, lekin arxitektura va saqlash modeli bunga tayyor.
