// Shared API entity types (mirror the Laravel API resources).

export type Role = 'admin' | 'moderator' | 'cashier' | 'manager';

export interface Branch {
  id: number;
  name: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Region {
  id: number;
  name_uz: string;
  name_ru: string;
  name_en: string;
  name_cyrl: string;
  soato: number;
  districts?: District[];
}

export interface District {
  id: number;
  region_id: number;
  region?: Region;
  name_uz: string;
  name_ru: string;
  name_en: string;
  name_cyrl: string;
  soato: number;
}

export interface FuelType {
  id: number;
  name: string;
}

export type VehicleType = 'Yengil' | 'Yuk' | 'Tirkama' | 'Mototsikl' | 'Avtobus' | 'Mikroavtobus';

/**
 * How a document type's price is resolved:
 * - fixed: a single flat `price`.
 * - by_vehicle_type: `price_tiers[vehicle_type]`, falling back to `price` (e.g. TEXOSMOTR).
 * - by_cylinder_count: `price` per gas cylinder × count (e.g. GAZ).
 */
export type DocumentPriceType = 'fixed' | 'by_vehicle_type' | 'by_cylinder_count';

export interface DocumentType {
  id: number;
  code?: string;
  name: string;
  category?: string | null;
  price: string | number;
  price_type?: DocumentPriceType;
  price_tiers?: Record<string, number> | null;
  has_basis_document?: boolean;
  basis_document_name?: string | null;
  basis_document_mime?: string | null;
  is_printable?: boolean;
  is_active?: boolean;
}

export interface PaymentMethod {
  id: number;
  code: string;
  name: string;
  type: 'cash' | 'card' | 'bank' | 'online' | 'refund' | string;
  is_fiscal: boolean;
  is_active: boolean;
}

export interface VehicleModel {
  id: number;
  name: string;
}

export interface User {
  id: number;
  branch_id: number | null;
  branch?: Branch;
  name: string;
  phone: string;
  role: Role;
  created_at?: string;
  updated_at?: string;
}

export interface Counterparty {
  id: number;
  full_name: string;
  phone: string;
  region_id: number;
  region?: Region;
  district_id: number;
  district?: District;
  address: string;
  basis_type: string;
}

export interface Vehicle {
  id: number;
  counterparty_id: number;
  counterparty?: Counterparty;
  vehicle_model_id: number;
  vehicle_model?: VehicleModel;
  license_plate: string;
  vehicle_type: VehicleType;
  manufacture_year: number;
  body_number: string | null;
  chassis_number: string | null;
  engine_number: string | null;
  current_fuel_type_id: number;
  current_fuel_type?: FuelType;
}

export interface GasCylinder {
  id: number;
  inspection_document_id: number;
  type: 'metan' | 'propan';
  manufacturer_country: string;
  cylinder_number: string;
  volume_liters: string | number;
  weight_kg: string | number;
  manufacture_year: number;
  working_pressure: string | number;
  test_pressure: string | number;
  created_at?: string;
  updated_at?: string;
}

export interface InspectionDocument {
  id: number;
  doc_number: string;
  act_number: string;
  date: string;
  branch_id: number;
  branch?: Branch;
  vehicle_id: number;
  vehicle?: Vehicle;
  counterparty_id: number;
  counterparty?: Counterparty;
  fuel_type_id: number;
  fuel_type?: FuelType;
  document_type_id: number;
  document_type?: DocumentType;
  employee_id: number;
  employee?: User;
  status: 'pending' | 'completed';
  gas_cylinder?: GasCylinder | null;
  payment_status?: 'unpaid' | 'partial' | 'paid' | 'refunded';
  total_amount?: string;
  generated_documents?: GeneratedDocument[];
}

export interface GeneratedDocument {
  id: number;
  inspection_document_id: number;
  inspection_document?: InspectionDocument;
  document_type_id: number;
  document_type?: DocumentType;
  document_number: string;
  status: 'draft' | 'generated' | 'printed' | 'cancelled' | string;
  payload?: Record<string, unknown> | null;
  created_by?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface Payment {
  id: number;
  inspection_document_id: number | null;
  inspection_document?: InspectionDocument;
  branch_id: number;
  branch?: Branch;
  cashbox_id?: number | null;
  counterparty_id: number;
  counterparty?: Counterparty;
  employee_id?: number | null;
  employee?: User;
  date: string;
  paid_at?: string | null;
  payment_type?: 'regular' | 'debt_payment' | 'advance' | 'refund' | 'adjustment' | string;
  status?: 'draft' | 'posted' | 'cancelled' | 'reversed' | string;
  total_amount: string | number;
  cash_amount: string | number;
  plastic_amount: string | number;
  receipt_type: 'INV' | 'FTK' | null;
  z_report_id: string | null;
  description?: string | null;
  posted_at?: string | null;
  cancelled_at?: string | null;
  lines?: PaymentLine[];
  allocations?: PaymentAllocation[];
}

export interface PaymentLine {
  id?: number;
  payment_id?: number;
  payment_method_id: number;
  payment_method?: PaymentMethod;
  amount: string | number;
  card_terminal_reference?: string | null;
  external_transaction_id?: string | null;
  notes?: string | null;
}

export interface PaymentAllocation {
  id?: number;
  payment_id?: number;
  inspection_document_id: number;
  inspection_document?: InspectionDocument;
  amount: string | number;
  allocation_type?: 'payment' | 'refund' | 'adjustment' | string;
}

export interface Expense {
  id: number;
  branch_id: number;
  branch?: Branch;
  employee_id: number | null;
  employee?: User;
  date: string;
  basis: string;
  payment_method: string;
  amount: string | number;
  description: string | null;
}

export interface CashBalance {
  branch_id: number;
  employee_id: number | null;
  date: string;
  cash_income: string;
  terminal_income: string;
  other_income: string;
  income_total: string;
  expense_total: string;
  safe_deposit_total: string;
  refund_total: string;
  balance: string;
  safe_balance: string;
}
