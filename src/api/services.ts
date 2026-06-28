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
} from '@/types';

// Payloads are dynamic form bags, so they are typed loosely on write.
export type Payload = Record<string, any> | FormData;

export interface ResourceApi<T> {
  list(params?: Record<string, unknown>): Promise<T[]>;
  get(id: number): Promise<T>;
  create(payload: Payload): Promise<T>;
  update(id: number, payload: Payload): Promise<T>;
  remove(id: number): Promise<void>;
}

// Factory that produces a typed CRUD client for a REST resource.
function resource<T>(path: string): ResourceApi<T> {
  return {
    list: (params) => isMockModeEnabled()
      ? mockList<T>(path as any, params)
      : http.get(`/${path}`, { params }).then((r) => r.data.data as T[]),
    get: (id) => isMockModeEnabled()
      ? mockGet<T>(path as any, id)
      : http.get(`/${path}/${id}`).then((r) => r.data.data as T),
    create: (payload) => isMockModeEnabled()
      ? mockCreate<T>(path as any, payload as Record<string, any>)
      : http.post(`/${path}`, payload).then((r) => r.data.data as T),
    update: (id, payload) => isMockModeEnabled()
      ? mockUpdate<T>(path as any, id, payload as Record<string, any>)
      : http.put(`/${path}/${id}`, payload).then((r) => r.data.data as T),
    remove: (id) => isMockModeEnabled()
      ? mockRemove(path as any, id)
      : http.delete(`/${path}/${id}`).then(() => undefined),
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
    return http.post('/document-types', payload).then((r) => r.data.data as DocumentType);
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
      return http.post(`/document-types/${id}`, payload).then((r) => r.data.data as DocumentType);
    }

    return http.put(`/document-types/${id}`, payload).then((r) => r.data.data as DocumentType);
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
export const generatedDocumentsApi = resource<GeneratedDocument>('generated-documents');
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
