import http from './http';
import { isMockModeEnabled, mockCashBalanceSummary, mockCreate, mockGet, mockList, mockRemove, mockSafeDeposit, mockUpdate } from '@/mock/backend';
import type {
  Branch,
  Region,
  District,
  FuelType,
  DocumentType,
  VehicleModel,
  PaymentMethod,
  User,
  Counterparty,
  Vehicle,
  InspectionDocument,
  GeneratedDocument,
  Payment,
  Expense,
  CashBalance,
  PaginatedResult,
  DashboardSummary,
} from '@/types';
import { toApiDate } from '@/utils/dataFormat';

// Payloads are dynamic form bags, so they are typed loosely on write.
export type Payload = Record<string, any> | FormData;

export interface ResourceApi<T> {
  list(params?: Record<string, unknown>): Promise<T[]>;
  page(params?: Record<string, unknown>, signal?: AbortSignal): Promise<PaginatedResult<T>>;
  get(id: number): Promise<T>;
  create(payload: Payload): Promise<T>;
  update(id: number, payload: Payload): Promise<T>;
  remove(id: number): Promise<void>;
}

interface LaravelCollection<T> {
  data: T[];
  meta?: { total: number; current_page: number; per_page: number; last_page: number };
}

const catalogCache = new Map<string, { expiresAt: number; value: unknown[] }>();
const CATALOG_TTL_MS = 5 * 60 * 1000;
const CACHED_PATHS = new Set(['branches', 'regions', 'districts', 'fuel-types', 'document-types', 'vehicle-models', 'payment-methods']);

function invalidateCatalog(path: string): void {
  for (const key of catalogCache.keys()) if (key.startsWith(`${path}:`)) catalogCache.delete(key);
}

function normalizePage<T>(body: LaravelCollection<T>, requestedPage = 1, requestedRows = 20): PaginatedResult<T> {
  const all = body.data ?? [];
  const data = body.meta ? all : all.slice((requestedPage - 1) * requestedRows, requestedPage * requestedRows);
  return {
    data,
    total: body.meta?.total ?? all.length,
    currentPage: body.meta?.current_page ?? requestedPage,
    perPage: body.meta?.per_page ?? requestedRows,
    lastPage: body.meta?.last_page ?? 1,
  };
}

function cacheKey(path: string, params?: Record<string, unknown>): string {
  return `${path}:${JSON.stringify(params ?? {})}`;
}

// Factory that produces a typed CRUD client for a REST resource.
function resource<T>(path: string): ResourceApi<T> {
  return {
    list: async (params) => {
      const fullParams = { per_page: 500, ...params };
      const key = cacheKey(path, fullParams);
      const cached = CACHED_PATHS.has(path) ? catalogCache.get(key) : undefined;
      if (cached && cached.expiresAt > Date.now()) return cached.value as T[];

      const value = isMockModeEnabled()
        ? await mockList<T>(path as any, fullParams)
        : await http.get(`/${path}`, { params: fullParams }).then((r) => r.data.data as T[]);
      if (CACHED_PATHS.has(path)) catalogCache.set(key, { expiresAt: Date.now() + CATALOG_TTL_MS, value });
      return value;
    },
    page: async (params = {}, signal) => {
      const page = Number(params.page ?? 1);
      const perPage = Number(params.per_page ?? 10);
      if (isMockModeEnabled()) {
        const all = await mockList<T>(path as any, params);
        const start = (page - 1) * perPage;
        return { data: all.slice(start, start + perPage), total: all.length, currentPage: page, perPage, lastPage: Math.max(1, Math.ceil(all.length / perPage)) };
      }
      return http.get<LaravelCollection<T>>(`/${path}`, { params, signal }).then((r) => normalizePage(r.data, page, perPage));
    },
    get: (id) => isMockModeEnabled()
      ? mockGet<T>(path as any, id)
      : http.get(`/${path}/${id}`).then((r) => r.data.data as T),
    create: async (payload) => {
      const result = isMockModeEnabled()
        ? await mockCreate<T>(path as any, payload as Record<string, any>)
        : await http.post(`/${path}`, payload).then((r) => r.data.data as T);
      invalidateCatalog(path);
      return result;
    },
    update: async (id, payload) => {
      const result = isMockModeEnabled()
        ? await mockUpdate<T>(path as any, id, payload as Record<string, any>)
        : await http.put(`/${path}/${id}`, payload).then((r) => r.data.data as T);
      invalidateCatalog(path);
      return result;
    },
    remove: async (id) => {
      if (isMockModeEnabled()) await mockRemove(path as any, id);
      else await http.delete(`/${path}/${id}`);
      invalidateCatalog(path);
    },
  };
}

export const branchesApi = resource<Branch>('branches');
export const regionsApi = resource<Region>('regions');
export const districtsApi = resource<District>('districts');
export const fuelTypesApi = resource<FuelType>('fuel-types');
const documentTypeResource = resource<DocumentType>('document-types');
export const documentTypesApi: ResourceApi<DocumentType> & { downloadBasisDocument(id: number): Promise<Blob> } = {
  ...documentTypeResource,
  create: (payload) => {
    if (isMockModeEnabled()) {
      const values = payload instanceof FormData ? Object.fromEntries(payload.entries()) : payload;
      return documentTypeResource.create({
        ...values,
        price: Number(values.price ?? 120000),
        has_basis_document: payload instanceof FormData && payload.has('basis_document'),
        basis_document_name: payload instanceof FormData
          ? (payload.get('basis_document') as File | null)?.name ?? null
          : null,
      });
    }
    return http.post('/document-types', payload).then((r) => {
      invalidateCatalog('document-types');
      return r.data.data as DocumentType;
    });
  },
  update: (id, payload) => {
    if (isMockModeEnabled()) {
      const values = payload instanceof FormData ? Object.fromEntries(payload.entries()) : payload;
      return documentTypeResource.update(id, {
        ...values,
        price: Number(values.price ?? 120000),
        ...(payload instanceof FormData && payload.has('basis_document')
          ? {
              has_basis_document: true,
              basis_document_name: (payload.get('basis_document') as File | null)?.name ?? null,
            }
          : {}),
      });
    }

    if (payload instanceof FormData) {
      payload.set('_method', 'PUT');
      return http.post(`/document-types/${id}`, payload).then((r) => {
        invalidateCatalog('document-types');
        return r.data.data as DocumentType;
      });
    }

    return http.put(`/document-types/${id}`, payload).then((r) => {
      invalidateCatalog('document-types');
      return r.data.data as DocumentType;
    });
  },
  downloadBasisDocument: (id) => http.get(`/document-types/${id}/basis-document`, {
    responseType: 'blob',
  }).then((r) => r.data as Blob),
};
export const vehicleModelsApi = resource<VehicleModel>('vehicle-models');
export const paymentMethodsApi = resource<PaymentMethod>('payment-methods');
export const usersApi = resource<User>('users');
export const counterpartiesApi = resource<Counterparty>('counterparties');
export const vehiclesApi = resource<Vehicle>('vehicles');
export const inspectionDocumentsApi = resource<InspectionDocument>('inspection-documents');
const generatedDocumentResource = resource<GeneratedDocument>('generated-documents');
const mockPdf = '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<< /Root 1 0 R /Size 4 >>\nstartxref\n186\n%%EOF\n';
export const generatedDocumentsApi: ResourceApi<GeneratedDocument> & { download(id: number): Promise<Blob> } = {
  ...generatedDocumentResource,
  download: (id) => isMockModeEnabled()
    ? Promise.resolve(new Blob([mockPdf], { type: 'application/pdf' }))
    : http.get(`/generated-documents/${id}/download`, { responseType: 'blob' }).then((r) => r.data as Blob),
};
export const paymentsApi = resource<Payment>('payments');
export const expensesApi = resource<Expense>('expenses');

export const cashBalanceApi = {
  summary: (params?: { branch_id?: number | null; employee_id?: number | null; date?: string | null }) => isMockModeEnabled()
    ? mockCashBalanceSummary(params)
    : http.get('/cash-balance', { params }).then((r) => r.data.data as CashBalance),
  safeDeposit: (payload: { branch_id?: number | null; amount: number; date?: string | null; description?: string | null }) => isMockModeEnabled()
    ? mockSafeDeposit(payload)
    : http.post('/safe-deposits', payload).then((r) => r.data.data as { transaction_id: number; summary: CashBalance }),
};

export const dashboardApi = {
  summary: (params?: { branch_id?: number | null }) => isMockModeEnabled()
    ? Promise.all([
        branchesApi.list(), counterpartiesApi.list(), vehiclesApi.list(), usersApi.list().catch(() => []), inspectionDocumentsApi.list(),
      ]).then(([branches, counterparties, vehicles, users, documents]): DashboardSummary => ({
        counts: {
          branches: branches.length, counterparties: counterparties.length, vehicles: vehicles.length,
          users: users.length, documents: documents.length,
          pending_documents: documents.filter((item) => item.status === 'pending').length,
          today_documents: documents.filter((item) => item.date === toApiDate(new Date())).length,
        },
        today_documents: documents.filter((item) => item.date === toApiDate(new Date())).slice(0, 8),
        recent_documents: documents.slice(0, 8),
      }))
    : http.get('/dashboard-summary', { params }).then((r) => r.data.data as DashboardSummary),
};
