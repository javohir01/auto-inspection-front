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
  name: string;
  districts?: District[];
}

export interface District {
  id: number;
  region_id: number;
  region?: Region;
  name: string;
}

export interface FuelType {
  id: number;
  name: string;
}

export interface DocumentType {
  id: number;
  name: string;
}

export interface PaymentMethod {
  id: number;
  code: string;
  name: string;
  type: 'cash' | 'card' | 'bank' | 'refund' | string;
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
  manufacture_year: number;
  body_number: string | null;
  chassis_number: string | null;
  engine_number: string | null;
  current_fuel_type_id: number;
  current_fuel_type?: FuelType;
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
