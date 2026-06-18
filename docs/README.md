# Documentation Map

Bu katalog backend va umumiy loyiha arxitekturasi uchun amaliy hujjatlar to'plami.

Qaysi fayl nimaga kerak:

- `ARCHITECTURE_AUDIT.md`
  Dastlabki audit va nima uchun hozirgi arxitektura shu ko'rinishga kelgani.
- `DB_ARCHITECTURE.md`
  Ma'lumotlar bazasi qaysi qatlamlarga bo'lingani va source-of-truth qayerda ekanini tushuntiradi.
- `ERD.md`
  Asosiy entity relation xaritasi.
- `MIGRATION_PLAN.md`
  Phase 1-5 nima qo'shganini va migration xavfsizlik qarorlarini ko'rsatadi.
- `LEGACY_COLUMNS.md`
  Qaysi maydonlar compatibility uchun saqlanayotganini va qachon olib tashlanishini ko'rsatadi.
- `PAYMENT_FLOW.md`
  Payment yaratish, posting, allocation va fiscal bog'lanish oqimi.
- `CASH_FLOW.md`
  Cashbox, shift, cash transaction va cash report oqimi.
- `FISCAL_FLOW.md`
  Fiscal provider abstractions va failure semantics.

## Hujjatlarni o'qish tartibi

Agar tizimni birinchi marta o'rganayotgan bo'lsangiz:

1. `../README.md`
2. `DB_ARCHITECTURE.md`
3. `ERD.md`
4. `PAYMENT_FLOW.md`
5. `CASH_FLOW.md`
6. `LEGACY_COLUMNS.md`

## Frontend bilan bog'liq joylar

Frontend repository:

- `/home/javohir/projects/vehicle-front`

Frontend bilan to'g'ridan-to'g'ri bog'liq hujjatlar:

- `LEGACY_COLUMNS.md`
- `PAYMENT_FLOW.md`
- `CASH_FLOW.md`

Sababi:

- frontend ko'p joyda legacy fieldlarni ham ko'rsatadi
- payment create payloadi compatibility va new-register formatni parallel qo'llaydi
- dashboard va reports `payments`, `cash-reports`, `expenses` contractlariga tayanadi

## Hozirgi holat bo'yicha eng muhim factlar

- `payment_lines` va `payment_allocations` forward-compatible source-of-truth
- `cash_transactions` cash reporting uchun source-of-truth
- `cash_amount` va `plastic_amount` hali compatibility maydonlari
- branch access `BranchScope` orqali qo'llanadi
- reconciliation commandlari dry-run first printsipida ishlaydi
