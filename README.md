# Avto Ko‘rik — Frontend (SPA)

Texnik ko‘rik tizimining yagona frontend ilovasi. **Vue 3 + Vite + PrimeVue 4 + Pinia +
Tailwind CSS 4**. Bitta app rolega qarab (admin / kassir / moderator) turli menyu va
sahifalarni ko‘rsatadi.

> To‘liq tizim hujjati (Docker, API, arxitektura) — `../vehicle-api/README.md`.

---

## Ishga tushirish

### Docker (butun stack bilan birga)
```bash
cd ../vehicle-api && docker compose up -d --build
# Frontend: http://localhost:8088
```

### Lokal (dev rejim)
```bash
npm install
npm run dev        # http://localhost:5173
```
Backend `http://localhost:8000` da ishlayotgan bo‘lishi kerak (Vite `/api` ni proxy qiladi).

### Production build
```bash
npm run build      # -> dist/
npm run preview    # build’ni lokal ko‘rish
```

---

## Loyiha tuzilishi

```
src/
├── api/
│   ├── http.ts          # axios instance: baseURL, Bearer token, 401 interceptor
│   └── services.ts      # har bir resurs uchun CRUD klient (resource<T> factory)
├── stores/
│   └── auth.ts          # Pinia: login / logout / fetchMe, joriy user va token
├── composables/
│   └── useCrud.ts       # qayta ishlatiluvchi CRUD holati (list/create/update/delete + toast/confirm)
├── layouts/
│   └── AppLayout.vue    # sidebar + topbar; menyu rolega qarab filtrlanadi
├── router/
│   └── index.ts         # route’lar + meta.roles + auth/role guard
├── views/               # sahifalar (lazy-load qilinadi)
│   ├── Login.vue
│   ├── Dashboard.vue    # rolega qarab admin statistikasi yoki kunlik hisobot
│   ├── Wizard.vue       # 4 bosqichli "Yangi ko‘rik" (mijoz → avto → hujjat → to‘lov)
│   ├── Documents.vue, Payments.vue, Expenses.vue
│   ├── Counterparties.vue, Vehicles.vue
│   └── Branches.vue, Users.vue, Catalogs.vue   # admin/moderator
├── components/
│   ├── SimpleCatalog.vue       # nom-only CRUD (viloyat, yoqilg‘i, ...)
│   └── DistrictsCatalog.vue    # tuman (viloyat tanlovi bilan)
├── types/index.ts       # API entity TS interfeyslari
├── main.ts              # PrimeVue, Pinia, Router + global komponentlar
└── style.css            # Tailwind import + dark mavzu
```

---

## Muhim sozlamalar

- **Tailwind CSS 4** — `@tailwindcss/vite` plagini orqali (`vite.config.ts`).
  Eski `tailwind.config.js` / `postcss.config.js` yo‘q; `style.css` da `@import "tailwindcss";`.
- **PrimeVue 4** — mavzu `@primeuix/themes/aura`. Komponentlar `main.ts` da global ro‘yxatdan o‘tkazilgan.
- **Dark mode** — `index.html` da `<html class="dark">` (doim yoqilgan).
- **API manzili** — `VITE_API_URL` (default `/api/v1`). Dev’da Vite proxy, Docker’da nginx proxy.
- **Token** — `localStorage` kaliti `vehicle_token`.
- **Yo‘l aliasi** — `@` → `src/` (`vite.config.ts` + `tsconfig.app.json`).

---

## Rollar bo‘yicha ko‘rinish

Menyu va sahifalar `auth.user.role` ga qarab cheklanadi (`router/index.ts` `meta.roles`,
`AppLayout.vue` menyu filtri). To‘liq jadval — `../vehicle-api/README.md`, 6-bo‘lim.

| Rol | Ko‘radigan bo‘limlar |
|-----|----------------------|
| **admin** | Hammasi |
| **cashier** | Dashboard, Yangi ko‘rik, Hujjatlar, To‘lovlar, Mijozlar, Avtomobillar, Xarajatlar |
| **moderator** | Dashboard, Mijozlar, Avtomobillar, Ma’lumotnomalar |

Demo: admin `+998901112233`, kassir `+998901112244`, moderator `+998901112255` — parol `password`.
