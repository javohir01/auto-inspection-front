import type {
  Branch,
  Counterparty,
  District,
  DocumentType,
  Expense,
  FuelType,
  InspectionDocument,
  Payment,
  PaymentMethod,
  Region,
  User,
  Vehicle,
  VehicleModel,
} from '@/types';

type ResourceName =
  | 'branches'
  | 'regions'
  | 'districts'
  | 'fuel-types'
  | 'document-types'
  | 'vehicle-models'
  | 'payment-methods'
  | 'users'
  | 'counterparties'
  | 'vehicles'
  | 'inspection-documents'
  | 'payments'
  | 'expenses';

type MockUserRecord = User & { password: string };

interface MockDb {
  branches: Branch[];
  regions: Region[];
  districts: District[];
  fuelTypes: FuelType[];
  documentTypes: DocumentType[];
  vehicleModels: VehicleModel[];
  paymentMethods: PaymentMethod[];
  users: MockUserRecord[];
  counterparties: Counterparty[];
  vehicles: Vehicle[];
  inspectionDocuments: InspectionDocument[];
  payments: Payment[];
  expenses: Expense[];
  sessions: Record<string, number>;
}

const DB_KEY = 'vehicle_mock_db';
const MODE_KEY = 'vehicle_mock_mode';
const MOCK_ADMIN_PHONE = '998901112233';
const MOCK_ADMIN_PASSWORD = 'password';
const MOCK_ADMIN_USER: MockUserRecord = {
  id: 1,
  branch_id: 1,
  name: 'Demo Admin',
  phone: `+${MOCK_ADMIN_PHONE}`,
  role: 'admin',
  password: MOCK_ADMIN_PASSWORD,
};

const today = '2026-06-17';

function clone<T>(value: T): T {
  if (value === undefined) {
    return value;
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

function delay<T>(value: T, ms = 120): Promise<T> {
  return new Promise((resolve) => window.setTimeout(() => resolve(clone(value)), ms));
}

function withNull<T>(value: T | undefined): T | null {
  return value ?? null;
}

function seedDb(): MockDb {
  const branches: Branch[] = [
    { id: 1, name: 'Markaziy filial', is_active: true },
    { id: 2, name: 'Sergeli filiali', is_active: true },
  ];

  const regions: Region[] = [
    { id: 22, name_uz: 'Toshkent shahri', name_ru: 'город Ташкент', name_en: 'Tashkent City', name_cyrl: 'Тошкент шаҳри', soato: 1726 },
    { id: 17, name_uz: 'Toshkent viloyati', name_ru: 'Ташкентская область', name_en: 'Tashkent Region', name_cyrl: 'Тошкент вилояти', soato: 1727 },
    { id: 10, name_uz: 'Samarqand viloyati', name_ru: 'Самаркандская область', name_en: 'Samarkand Region', name_cyrl: 'Самарқанд вилояти', soato: 1718 },
  ];

  const districts: District[] = [
    { id: 198, region_id: 22, name_uz: 'Yunusobod tumani', name_ru: 'Юнусабадский район', name_en: 'Yunusobod district', name_cyrl: 'Юнусобод тумани', soato: 1726266 },
    { id: 204, region_id: 22, name_uz: 'Chilonzor tumani', name_ru: 'Чиланзарский район', name_en: 'Chilanzar district', name_cyrl: 'Чилонзор тумани', soato: 1726294 },
    { id: 1701, region_id: 17, name_uz: 'Zangiota tumani', name_ru: 'Зангиатинский район', name_en: 'Zangiota district', name_cyrl: 'Зангиота тумани', soato: 1727235 },
    { id: 1001, region_id: 10, name_uz: 'Samarqand tumani', name_ru: 'Самаркандский район', name_en: 'Samarkand district', name_cyrl: 'Самарқанд тумани', soato: 1718236 },
  ];

  const fuelTypes: FuelType[] = [
    { id: 1, name: 'Benzin' },
    { id: 2, name: 'Gaz' },
    { id: 3, name: 'Dizel' },
    { id: 4, name: 'Elektro' },
  ];

  const documentTypes: DocumentType[] = [
    { id: 1, name: 'TEXOSMOTR' },
    { id: 2, name: 'GAZ AKT' },
    { id: 3, name: 'TEXOSMOTR+GAZ' },
  ];

  const vehicleModels: VehicleModel[] = [
    { id: 1, name: 'Chevrolet Cobalt' },
    { id: 2, name: 'Chevrolet Tracker' },
    { id: 3, name: 'BYD Chazor' },
    { id: 4, name: 'Toyota Corolla' },
  ];

  const paymentMethods: PaymentMethod[] = [
    { id: 1, code: 'CASH', name: 'Naqd', type: 'cash', is_fiscal: true, is_active: true },
    { id: 2, code: 'UZCARD', name: 'Uzcard', type: 'card', is_fiscal: true, is_active: true },
    { id: 3, code: 'HUMO', name: 'Humo', type: 'card', is_fiscal: true, is_active: true },
    { id: 4, code: 'BANK', name: 'Bank', type: 'bank', is_fiscal: false, is_active: true },
  ];

  const users: MockUserRecord[] = [
    MOCK_ADMIN_USER,
    { id: 2, branch_id: 1, name: 'Demo Kassir', phone: '+998901112244', role: 'cashier', password: 'password' },
    { id: 3, branch_id: 1, name: 'Demo Moderator', phone: '+998901112255', role: 'moderator', password: 'password' },
  ];

  const counterparties: Counterparty[] = [
    {
      id: 1,
      full_name: 'Anvar Ergashev',
      phone: '+998901234567',
      region_id: 22,
      district_id: 198,
      address: 'Yunusobod, 12-mavze',
      basis_type: 'Jismoniy shaxs',
    },
    {
      id: 2,
      full_name: 'Samarqand Trans MCHJ',
      phone: '+998971112233',
      region_id: 10,
      district_id: 1001,
      address: 'Samarqand tumani, Industrial hudud',
      basis_type: 'Yuridik shaxs',
    },
  ];

  const vehicles: Vehicle[] = [
    {
      id: 1,
      counterparty_id: 1,
      vehicle_model_id: 1,
      license_plate: '01A123BC',
      vehicle_type: 'Yengil',
      manufacture_year: 2022,
      body_number: 'BODY-001',
      chassis_number: 'CHS-001',
      engine_number: 'ENG-001',
      current_fuel_type_id: 2,
    },
    {
      id: 2,
      counterparty_id: 2,
      vehicle_model_id: 4,
      license_plate: '30B456CD',
      vehicle_type: 'Yuk',
      manufacture_year: 2021,
      body_number: 'BODY-002',
      chassis_number: 'CHS-002',
      engine_number: 'ENG-002',
      current_fuel_type_id: 1,
    },
  ];

  const inspectionDocuments: InspectionDocument[] = [
    {
      id: 1,
      doc_number: 'DOC-2401',
      act_number: 'ACT-2401',
      date: today,
      branch_id: 1,
      vehicle_id: 1,
      counterparty_id: 1,
      fuel_type_id: 2,
      document_type_id: 1,
      employee_id: 1,
      status: 'completed',
    },
    {
      id: 2,
      doc_number: 'DOC-2402',
      act_number: 'ACT-2402',
      date: today,
      branch_id: 2,
      vehicle_id: 2,
      counterparty_id: 2,
      fuel_type_id: 1,
      document_type_id: 2,
      employee_id: 1,
      status: 'pending',
    },
  ];

  const payments: Payment[] = [
    {
      id: 1,
      inspection_document_id: 1,
      branch_id: 1,
      counterparty_id: 1,
      date: today,
      payment_type: 'regular',
      status: 'posted',
      total_amount: 180000,
      cash_amount: 100000,
      plastic_amount: 80000,
      receipt_type: 'FTK',
      z_report_id: 'Z-1001',
      lines: [
        { id: 1, payment_id: 1, payment_method_id: 1, amount: 100000 },
        { id: 2, payment_id: 1, payment_method_id: 2, amount: 80000 },
      ],
      allocations: [
        { id: 1, payment_id: 1, inspection_document_id: 1, amount: 180000, allocation_type: 'payment' },
      ],
    },
    {
      id: 2,
      inspection_document_id: 2,
      branch_id: 2,
      counterparty_id: 2,
      date: today,
      payment_type: 'regular',
      status: 'draft',
      total_amount: 220000,
      cash_amount: 0,
      plastic_amount: 220000,
      receipt_type: 'INV',
      z_report_id: null,
      lines: [
        { id: 1, payment_id: 2, payment_method_id: 2, amount: 220000 },
      ],
      allocations: [
        { id: 1, payment_id: 2, inspection_document_id: 2, amount: 220000, allocation_type: 'payment' },
      ],
    },
  ];

  const expenses: Expense[] = [
    {
      id: 1,
      branch_id: 1,
      employee_id: 1,
      date: today,
      basis: 'Printer qog‘ozi',
      payment_method: 'Naqd',
      amount: 65000,
      description: 'Ofis xarajati',
    },
    {
      id: 2,
      branch_id: 2,
      employee_id: 1,
      date: today,
      basis: 'Internet to‘lovi',
      payment_method: 'Bank o‘tkazmasi',
      amount: 120000,
      description: 'Oylik to‘lov',
    },
  ];

  return {
    branches,
    regions,
    districts,
    fuelTypes,
    documentTypes,
    vehicleModels,
    paymentMethods,
    users,
    counterparties,
    vehicles,
    inspectionDocuments,
    payments,
    expenses,
    sessions: {},
  };
}

function readDb(): MockDb {
  const raw = window.localStorage.getItem(DB_KEY);
  if (!raw) {
    const db = seedDb();
    writeDb(db);
    return db;
  }
  const db = JSON.parse(raw) as MockDb;
  ensureMockCompatibility(db);
  ensureMockAdminUser(db);
  return db;
}

function writeDb(db: MockDb): void {
  window.localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function normalizePhone(value: string): string {
  return value.replace(/\D/g, '');
}

function isMockAdminCredentials(phone: string, password: string): boolean {
  return normalizePhone(phone) === MOCK_ADMIN_PHONE && password === MOCK_ADMIN_PASSWORD;
}

function ensureMockAdminUser(db: MockDb): void {
  const existing = db.users.find((user) => normalizePhone(user.phone) === MOCK_ADMIN_PHONE);
  if (existing) {
    Object.assign(existing, {
      ...MOCK_ADMIN_USER,
      id: existing.id,
      created_at: existing.created_at,
      updated_at: existing.updated_at,
    });
    writeDb(db);
    return;
  }

  db.users.unshift({ ...MOCK_ADMIN_USER, id: nextId(db.users) });
  writeDb(db);
}

function defaultPaymentMethods(): PaymentMethod[] {
  return [
    { id: 1, code: 'CASH', name: 'Naqd', type: 'cash', is_fiscal: true, is_active: true },
    { id: 2, code: 'UZCARD', name: 'Uzcard', type: 'card', is_fiscal: true, is_active: true },
    { id: 3, code: 'HUMO', name: 'Humo', type: 'card', is_fiscal: true, is_active: true },
    { id: 4, code: 'BANK', name: 'Bank', type: 'bank', is_fiscal: false, is_active: true },
  ];
}

function ensureMockCompatibility(db: MockDb): void {
  if (!Array.isArray(db.paymentMethods) || !db.paymentMethods.length) {
    db.paymentMethods = defaultPaymentMethods();
  }

  db.payments = db.payments.map((payment) => normalizePaymentPayload(payment as Record<string, any>, db, payment));
  writeDb(db);
}

function nextId(items: Array<{ id: number }>): number {
  return items.length ? Math.max(...items.map((item) => item.id)) + 1 : 1;
}

function dbKeyFor(path: ResourceName): keyof MockDb {
  switch (path) {
    case 'branches': return 'branches';
    case 'regions': return 'regions';
    case 'districts': return 'districts';
    case 'fuel-types': return 'fuelTypes';
    case 'document-types': return 'documentTypes';
    case 'vehicle-models': return 'vehicleModels';
    case 'payment-methods': return 'paymentMethods';
    case 'users': return 'users';
    case 'counterparties': return 'counterparties';
    case 'vehicles': return 'vehicles';
    case 'inspection-documents': return 'inspectionDocuments';
    case 'payments': return 'payments';
    case 'expenses': return 'expenses';
  }
}

function mapUser(record: MockUserRecord, db: MockDb): User {
  return {
    id: record.id,
    branch_id: record.branch_id,
    branch: withNull(db.branches.find((branch) => branch.id === record.branch_id)) ?? undefined,
    name: record.name,
    phone: record.phone,
    role: record.role,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

function hydrate<T>(path: ResourceName, item: T, db: MockDb): T {
  switch (path) {
    case 'branches':
    case 'regions':
    case 'fuel-types':
    case 'document-types':
    case 'vehicle-models':
    case 'payment-methods':
      return clone(item);
    case 'districts': {
      const district = item as District;
      return {
        ...district,
        region: db.regions.find((region) => region.id === district.region_id),
      } as T;
    }
    case 'users':
      return mapUser(item as MockUserRecord, db) as T;
    case 'counterparties': {
      const counterparty = item as Counterparty;
      return {
        ...counterparty,
        region: db.regions.find((region) => region.id === counterparty.region_id),
        district: db.districts.find((district) => district.id === counterparty.district_id),
      } as T;
    }
    case 'vehicles': {
      const vehicle = item as Vehicle;
      return {
        ...vehicle,
        counterparty: hydrate('counterparties', db.counterparties.find((x) => x.id === vehicle.counterparty_id)!, db) as Counterparty,
        vehicle_model: db.vehicleModels.find((model) => model.id === vehicle.vehicle_model_id),
        current_fuel_type: db.fuelTypes.find((fuel) => fuel.id === vehicle.current_fuel_type_id),
      } as T;
    }
    case 'inspection-documents': {
      const document = item as InspectionDocument;
      return {
        ...document,
        branch: db.branches.find((branch) => branch.id === document.branch_id),
        vehicle: hydrate('vehicles', db.vehicles.find((vehicle) => vehicle.id === document.vehicle_id)!, db) as Vehicle,
        counterparty: hydrate('counterparties', db.counterparties.find((cp) => cp.id === document.counterparty_id)!, db) as Counterparty,
        fuel_type: db.fuelTypes.find((fuel) => fuel.id === document.fuel_type_id),
        document_type: db.documentTypes.find((type) => type.id === document.document_type_id),
        employee: withNull(db.users.find((user) => user.id === document.employee_id)) ? mapUser(db.users.find((user) => user.id === document.employee_id)!, db) : undefined,
      } as T;
    }
    case 'payments': {
      const payment = item as Payment;
      return {
        ...payment,
        inspection_document: payment.inspection_document_id
          ? hydrate('inspection-documents', db.inspectionDocuments.find((doc) => doc.id === payment.inspection_document_id)!, db) as InspectionDocument
          : undefined,
        branch: db.branches.find((branch) => branch.id === payment.branch_id),
        counterparty: hydrate('counterparties', db.counterparties.find((cp) => cp.id === payment.counterparty_id)!, db) as Counterparty,
        lines: payment.lines?.map((line, index) => ({
          ...line,
          id: line.id ?? index + 1,
          payment_id: payment.id,
          payment_method: db.paymentMethods.find((method) => method.id === line.payment_method_id),
        })),
        allocations: payment.allocations?.map((allocation, index) => ({
          ...allocation,
          id: allocation.id ?? index + 1,
          payment_id: payment.id,
          inspection_document: hydrate(
            'inspection-documents',
            db.inspectionDocuments.find((doc) => doc.id === allocation.inspection_document_id)!,
            db,
          ) as InspectionDocument,
        })),
      } as T;
    }
    case 'expenses': {
      const expense = item as Expense;
      return {
        ...expense,
        branch: db.branches.find((branch) => branch.id === expense.branch_id),
        employee: expense.employee_id
          ? mapUser(db.users.find((user) => user.id === expense.employee_id)!, db)
          : undefined,
      } as T;
    }
  }
}

function matchesSearch(value: string, query: string): boolean {
  return value.toLowerCase().includes(query.toLowerCase());
}

function filterItems<T extends { [key: string]: any }>(path: ResourceName, items: T[], params?: Record<string, unknown>): T[] {
  if (!params) return items;

  return items.filter((item) => {
    if (path === 'counterparties' && params.search) {
      const query = String(params.search);
      const ok = matchesSearch(item.full_name ?? '', query) || matchesSearch(item.phone ?? '', query);
      if (!ok) return false;
    }

    if (path === 'vehicles' && params.counterparty_id && Number(item.counterparty_id) !== Number(params.counterparty_id)) {
      return false;
    }

    if (path === 'vehicles' && params.license_plate) {
      const plate = String(params.license_plate).toLowerCase();
      if (!String(item.license_plate ?? '').toLowerCase().includes(plate)) return false;
    }

    if (path === 'inspection-documents' && params.license_plate) {
      const plate = String(params.license_plate).toLowerCase();
      const currentPlate = String(item.vehicle?.license_plate ?? '').toLowerCase();
      if (!currentPlate.includes(plate)) return false;
    }

    if ((path === 'payments' || path === 'expenses' || path === 'inspection-documents') && params.start_date) {
      if (String(item.date) < String(params.start_date)) return false;
    }

    if ((path === 'payments' || path === 'expenses' || path === 'inspection-documents') && params.end_date) {
      if (String(item.date) > String(params.end_date)) return false;
    }

    return true;
  });
}

function normalizeUserPayload(payload: Record<string, any>, existing?: MockUserRecord): MockUserRecord {
  return {
    id: existing?.id ?? payload.id,
    branch_id: payload.branch_id ?? null,
    name: payload.name,
    phone: payload.phone,
    role: payload.role,
    password: payload.password || existing?.password || 'password',
    created_at: existing?.created_at,
    updated_at: new Date().toISOString(),
  };
}

function stripRelations(path: ResourceName, payload: Record<string, any>): Record<string, any> {
  const clean = { ...payload };
  delete clean.branch;
  delete clean.region;
  delete clean.district;
  delete clean.counterparty;
  delete clean.vehicle_model;
  delete clean.current_fuel_type;
  delete clean.vehicle;
  delete clean.fuel_type;
  delete clean.document_type;
  delete clean.employee;
  delete clean.inspection_document;
  delete clean.payment_method;

  if (Array.isArray(clean.lines)) {
    clean.lines = clean.lines.map((line: Record<string, any>) => {
      const nextLine = { ...line };
      delete nextLine.payment_method;
      return nextLine;
    });
  }

  if (Array.isArray(clean.allocations)) {
    clean.allocations = clean.allocations.map((allocation: Record<string, any>) => {
      const nextAllocation = { ...allocation };
      delete nextAllocation.inspection_document;
      return nextAllocation;
    });
  }

  if (path === 'payments') {
    clean.total_amount = Number(clean.cash_amount || 0) + Number(clean.plastic_amount || 0);
    clean.z_report_id = clean.z_report_id || null;
  }

  if (path === 'expenses') {
    clean.description = clean.description || null;
  }

  if (path === 'users' && !clean.password) {
    delete clean.password;
  }

  return clean;
}

function normalizePaymentPayload(
  payload: Record<string, any>,
  db: MockDb,
  existing?: Payment,
): Payment {
  const clean = stripRelations('payments', payload);
  const cashMethod = db.paymentMethods.find((method) => method.code === 'CASH');
  const cardMethod = db.paymentMethods.find((method) => method.code === 'UZCARD') ?? db.paymentMethods.find((method) => method.type === 'card');

  const lines = Array.isArray(clean.lines) && clean.lines.length
    ? clean.lines.map((line: Record<string, any>, index: number) => ({
        id: line.id ?? index + 1,
        payment_id: existing?.id,
        payment_method_id: Number(line.payment_method_id),
        amount: Number(line.amount ?? 0),
        card_terminal_reference: line.card_terminal_reference ?? null,
        external_transaction_id: line.external_transaction_id ?? null,
        notes: line.notes ?? null,
      }))
    : [
        Number(clean.cash_amount || 0) > 0 && cashMethod
          ? { id: 1, payment_id: existing?.id, payment_method_id: cashMethod.id, amount: Number(clean.cash_amount), card_terminal_reference: null, external_transaction_id: null, notes: null }
          : null,
        Number(clean.plastic_amount || 0) > 0 && cardMethod
          ? { id: 2, payment_id: existing?.id, payment_method_id: cardMethod.id, amount: Number(clean.plastic_amount), card_terminal_reference: null, external_transaction_id: null, notes: null }
          : null,
      ].filter((line): line is NonNullable<typeof line> => line !== null);

  const cashAmount = lines
    .filter((line) => db.paymentMethods.find((method) => method.id === line!.payment_method_id)?.code === 'CASH')
    .reduce((sum, line) => sum + Number(line!.amount), 0);
  const plasticAmount = lines
    .filter((line) => db.paymentMethods.find((method) => method.id === line!.payment_method_id)?.type === 'card')
    .reduce((sum, line) => sum + Number(line!.amount), 0);
  const totalAmount = Number(clean.total_amount ?? cashAmount + plasticAmount);

  const allocations = Array.isArray(clean.allocations) && clean.allocations.length
    ? clean.allocations.map((allocation: Record<string, any>, index: number) => ({
        id: allocation.id ?? index + 1,
        payment_id: existing?.id,
        inspection_document_id: Number(allocation.inspection_document_id),
        amount: Number(allocation.amount ?? totalAmount),
        allocation_type: allocation.allocation_type ?? 'payment',
      }))
    : clean.inspection_document_id
      ? [{
          id: 1,
          payment_id: existing?.id,
          inspection_document_id: Number(clean.inspection_document_id),
          amount: totalAmount,
          allocation_type: 'payment',
        }]
      : [];

  const inspectionDocumentId = allocations[0]?.inspection_document_id ?? clean.inspection_document_id ?? null;

  return {
    id: existing?.id ?? clean.id,
    inspection_document_id: inspectionDocumentId ? Number(inspectionDocumentId) : null,
    branch_id: Number(clean.branch_id),
    cashbox_id: clean.cashbox_id ?? null,
    counterparty_id: Number(clean.counterparty_id),
    employee_id: clean.employee_id ?? null,
    date: clean.date,
    paid_at: clean.paid_at ?? null,
    payment_type: clean.payment_type ?? existing?.payment_type ?? 'regular',
    status: clean.status ?? existing?.status ?? 'draft',
    total_amount: totalAmount,
    cash_amount: cashAmount,
    plastic_amount: plasticAmount,
    receipt_type: clean.receipt_type ?? existing?.receipt_type ?? 'FTK',
    z_report_id: clean.z_report_id || null,
    description: clean.description ?? null,
    posted_at: clean.posted_at ?? null,
    cancelled_at: clean.cancelled_at ?? null,
    lines,
    allocations,
  };
}

function resourceItems<T>(db: MockDb, path: ResourceName): T[] {
  return db[dbKeyFor(path)] as T[];
}

export function isMockModeEnabled(): boolean {
  return import.meta.env.VITE_USE_MOCKS === 'true'
    || import.meta.env.VITE_USE_MOCK === 'true'
    || window.localStorage.getItem(MODE_KEY) === 'true';
}

export function enableMockMode(): void {
  window.localStorage.setItem(MODE_KEY, 'true');
  readDb();
}

export function disableMockMode(): void {
  window.localStorage.removeItem(MODE_KEY);
}

export async function createMockAdminUser(payload: { name: string; phone: string; password: string }): Promise<User> {
  enableMockMode();
  const db = readDb();

  if (db.users.some((user) => user.phone === payload.phone)) {
    throw new Error('Bu telefon raqami bilan foydalanuvchi allaqachon mavjud');
  }

  const user: MockUserRecord = {
    id: nextId(db.users),
    branch_id: 1,
    name: payload.name,
    phone: payload.phone,
    role: 'admin',
    password: payload.password,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.users.unshift(user);
  writeDb(db);
  return delay(mapUser(user, db));
}

export async function mockLogin(phone: string, password: string): Promise<{ token: string; user: User }> {
  const db = readDb();
  const user = isMockAdminCredentials(phone, password)
    ? db.users.find((item) => normalizePhone(item.phone) === MOCK_ADMIN_PHONE)
    : null;
  if (!user) {
    throw new Error('Telefon yoki parol noto‘g‘ri');
  }

  const token = `mock-token-${user.id}-${Date.now()}`;
  db.sessions[token] = user.id;
  writeDb(db);
  return delay({ token, user: mapUser(user, db) });
}

export async function mockLogout(token: string | null): Promise<void> {
  if (!token) {
    return delay(undefined);
  }

  const db = readDb();
  delete db.sessions[token];
  writeDb(db);
  return delay(undefined);
}

export async function mockFetchMe(token: string | null): Promise<User> {
  const db = readDb();
  const userId = token ? db.sessions[token] : undefined;
  const user = db.users.find((item) => item.id === userId);

  if (!user) {
    throw new Error('Sessiya topilmadi');
  }

  return delay(mapUser(user, db));
}

export async function mockList<T>(path: ResourceName, params?: Record<string, unknown>): Promise<T[]> {
  const db = readDb();
  const hydrated = resourceItems<any>(db, path).map((item) => hydrate(path, item, db));
  return delay(filterItems(path, hydrated, params));
}

export async function mockGet<T>(path: ResourceName, id: number): Promise<T> {
  const db = readDb();
  const item = resourceItems<any>(db, path).find((entry) => entry.id === id);
  if (!item) {
    throw new Error('Ma’lumot topilmadi');
  }
  return delay(hydrate(path, item, db));
}

export async function mockCreate<T>(path: ResourceName, payload: Record<string, any>): Promise<T> {
  const db = readDb();
  const key = dbKeyFor(path);
  const items = db[key] as Array<Record<string, any>>;
  const clean = stripRelations(path, payload);
  const id = nextId(items as Array<{ id: number }>);

  let created: Record<string, any>;
  if (path === 'users') {
    created = normalizeUserPayload({ ...clean, id });
  } else if (path === 'payments') {
    created = normalizePaymentPayload({ ...payload, id }, db);
  } else {
    created = { ...clean, id };
  }

  items.unshift(created);
  writeDb(db);
  return mockGet(path, id) as Promise<T>;
}

export async function mockUpdate<T>(path: ResourceName, id: number, payload: Record<string, any>): Promise<T> {
  const db = readDb();
  const key = dbKeyFor(path);
  const items = db[key] as Array<Record<string, any>>;
  const index = items.findIndex((item) => item.id === id);

  if (index === -1) {
    throw new Error('Ma’lumot topilmadi');
  }

  const clean = stripRelations(path, payload);
  if (path === 'users') {
    items[index] = normalizeUserPayload({ ...items[index], ...clean, id }, items[index] as MockUserRecord);
  } else if (path === 'payments') {
    items[index] = normalizePaymentPayload({ ...items[index], ...payload, id }, db, items[index] as Payment);
  } else {
    items[index] = { ...items[index], ...clean, id };
  }

  writeDb(db);
  return mockGet(path, id) as Promise<T>;
}

export async function mockRemove(path: ResourceName, id: number): Promise<void> {
  const db = readDb();
  const key = dbKeyFor(path);
  const items = db[key] as Array<Record<string, any>>;
  const nextItems = items.filter((item) => item.id !== id);

  (db[key] as Array<Record<string, any>>) = nextItems;
  writeDb(db);
  return delay(undefined);
}
