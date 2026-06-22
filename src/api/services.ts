import http from './http';
import { isMockModeEnabled, mockCreate, mockGet, mockList, mockRemove, mockUpdate } from '@/mock/backend';
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
  Payment,
  Expense,
} from '@/types';

// Payloads are dynamic form bags, so they are typed loosely on write.
export type Payload = Record<string, any>;

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
      ? mockCreate<T>(path as any, payload)
      : http.post(`/${path}`, payload).then((r) => r.data.data as T),
    update: (id, payload) => isMockModeEnabled()
      ? mockUpdate<T>(path as any, id, payload)
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
export const documentTypesApi = resource<DocumentType>('document-types');
export const vehicleModelsApi = resource<VehicleModel>('vehicle-models');
export const paymentMethodsApi = resource<PaymentMethod>('payment-methods');
export const usersApi = resource<User>('users');
export const counterpartiesApi = resource<Counterparty>('counterparties');
export const vehiclesApi = resource<Vehicle>('vehicles');
export const inspectionDocumentsApi = resource<InspectionDocument>('inspection-documents');
export const paymentsApi = resource<Payment>('payments');
export const expensesApi = resource<Expense>('expenses');

export interface OnlinePaymentLink {
  provider: 'payme' | 'click';
  url: string;
  amount_due: string;
  inspection_document_id: number;
  test_mode: boolean;
}

export interface OnlinePaymentResult {
  provider: 'payme' | 'click';
  paid: boolean;
  payment_status: string;
  amount: string;
  inspection_document_id: number;
}

// Online payment (Payme / Click).
export const onlinePaymentApi = {
  // Generate a hosted-checkout link for a document.
  link: (inspectionDocumentId: number, provider: 'payme' | 'click', returnUrl?: string) =>
    http
      .post(`/inspection-documents/${inspectionDocumentId}/payment-link`, { provider, return_url: returnUrl })
      .then((r) => r.data.data as OnlinePaymentLink),
  // Simulate a successful payment (test mode only) — completes the flow locally.
  simulate: (inspectionDocumentId: number, provider: 'payme' | 'click') =>
    http
      .post(`/inspection-documents/${inspectionDocumentId}/simulate-payment`, { provider })
      .then((r) => r.data.data as OnlinePaymentResult),
};
