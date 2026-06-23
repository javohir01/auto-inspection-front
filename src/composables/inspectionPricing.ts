import type { DocumentType } from '@/types';

const GAS_CYLINDER_PRICE = 120000;
const INSURANCE_PRICE = 0;
const TINTING_PRICE = 0;

const TECH_INSPECTION_PRICES: Record<string, number> = {
  Yengil: 120000,
  Yuk: 250000,
  Tirkama: 120000,
  Mototsikl: 120000,
};

export interface InspectionPricingInput {
  documentType?: Pick<DocumentType, 'code' | 'name'> | null;
  documentTypes?: Array<Pick<DocumentType, 'code' | 'name'>> | null;
  vehicleType?: string | null;
  gasCylinderCount?: number | null;
}

export interface InspectionPricingResult {
  amount: number;
  hasTechInspection: boolean;
  hasGasInspection: boolean;
  gasCylinderCount: number;
}

export function inspectionDocumentKind(documentType?: Pick<DocumentType, 'code' | 'name'> | null): string {
  return `${documentType?.code ?? ''} ${documentType?.name ?? ''}`.toUpperCase();
}

export function hasGasInspection(documentType?: Pick<DocumentType, 'code' | 'name'> | null): boolean {
  return inspectionDocumentKind(documentType).includes('GAZ');
}

export function hasTechInspection(documentType?: Pick<DocumentType, 'code' | 'name'> | null): boolean {
  return inspectionDocumentKind(documentType).includes('TEXOSMOTR');
}

export function hasInsurance(documentType?: Pick<DocumentType, 'code' | 'name'> | null): boolean {
  const kind = inspectionDocumentKind(documentType);
  return kind.includes('SUGURTA') || kind.includes('SUG‘URTA') || kind.includes("SUG'URTA") || kind.includes('INSURANCE');
}

export function hasTinting(documentType?: Pick<DocumentType, 'code' | 'name'> | null): boolean {
  const kind = inspectionDocumentKind(documentType);
  return kind.includes('TONIROVKA') || kind.includes('TINT');
}

export function calculateInspectionPaymentAmount(input: InspectionPricingInput): InspectionPricingResult {
  const documentTypes = input.documentTypes?.length ? input.documentTypes : input.documentType ? [input.documentType] : [];
  const tech = documentTypes.some(hasTechInspection);
  const gas = documentTypes.some(hasGasInspection);
  const gasCylinderCount = gas ? Math.max(1, Math.trunc(Number(input.gasCylinderCount || 1))) : 0;
  const vehicleType = input.vehicleType ?? '';
  const insurance = documentTypes.some(hasInsurance);
  const tinting = documentTypes.some(hasTinting);

  return {
    amount:
      (tech ? TECH_INSPECTION_PRICES[vehicleType] ?? 0 : 0)
      + (gasCylinderCount * GAS_CYLINDER_PRICE)
      + (insurance ? INSURANCE_PRICE : 0)
      + (tinting ? TINTING_PRICE : 0),
    hasTechInspection: tech,
    hasGasInspection: gas,
    gasCylinderCount,
  };
}
