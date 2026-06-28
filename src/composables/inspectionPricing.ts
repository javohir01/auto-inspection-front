import type { DocumentPriceType, DocumentType } from '@/types';

const DEFAULT_DOCUMENT_PRICE = 120000;

type PricingDocumentType = Pick<DocumentType, 'code' | 'name' | 'price' | 'price_type' | 'price_tiers'>;

export interface InspectionPricingInput {
  documentType?: PricingDocumentType | null;
  documentTypes?: PricingDocumentType[] | null;
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

function toAmount(value: unknown): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : DEFAULT_DOCUMENT_PRICE;
}

/**
 * Resolve the price for a single document type given the vehicle type and gas
 * cylinder count. Mirrors the backend's DocumentType::priceFor():
 * - by_vehicle_type: price_tiers[vehicleType] ?? price.
 * - by_cylinder_count: price per cylinder × count (minimum 1).
 * - fixed (default): the flat price.
 */
export function resolveDocumentTypePrice(
  documentType: PricingDocumentType,
  vehicleType?: string | null,
  gasCylinderCount?: number | null,
): number {
  const priceType: DocumentPriceType = documentType.price_type ?? 'fixed';
  const basePrice = toAmount(documentType.price ?? DEFAULT_DOCUMENT_PRICE);

  if (priceType === 'by_vehicle_type') {
    const tier = vehicleType ? documentType.price_tiers?.[vehicleType] : undefined;
    return tier != null ? toAmount(tier) : basePrice;
  }

  if (priceType === 'by_cylinder_count') {
    return basePrice * Math.max(1, Math.trunc(Number(gasCylinderCount || 1)));
  }

  return basePrice;
}

export function calculateInspectionPaymentAmount(input: InspectionPricingInput): InspectionPricingResult {
  const documentTypes = input.documentTypes?.length ? input.documentTypes : input.documentType ? [input.documentType] : [];
  const tech = documentTypes.some(hasTechInspection);
  const gas = documentTypes.some(hasGasInspection);
  const gasCylinderCount = gas ? Math.max(1, Math.trunc(Number(input.gasCylinderCount || 1))) : 0;
  const amount = documentTypes.reduce(
    (sum, documentType) => sum + resolveDocumentTypePrice(documentType, input.vehicleType, gasCylinderCount),
    0,
  );

  return {
    amount,
    hasTechInspection: tech,
    hasGasInspection: gas,
    gasCylinderCount,
  };
}
