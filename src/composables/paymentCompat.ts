import type { Payment, PaymentMethod, PaymentLine } from '@/types';

const CASH_METHOD_CODES = new Set(['CASH']);
const CARD_METHOD_CODES = new Set(['UZCARD', 'HUMO']);

function amount(value: string | number | null | undefined): number {
  return Number(value ?? 0);
}

function isCashLine(line: PaymentLine): boolean {
  return CASH_METHOD_CODES.has(line.payment_method?.code ?? '');
}

function isCardLine(line: PaymentLine): boolean {
  return CARD_METHOD_CODES.has(line.payment_method?.code ?? '')
    || line.payment_method?.type === 'card';
}

export function getPaymentBreakdown(payment: Payment): {
  cashAmount: number;
  plasticAmount: number;
  totalAmount: number;
} {
  if (payment.lines?.length) {
    const cashAmount = payment.lines
      .filter(isCashLine)
      .reduce((sum, line) => sum + amount(line.amount), 0);
    const plasticAmount = payment.lines
      .filter(isCardLine)
      .reduce((sum, line) => sum + amount(line.amount), 0);

    return {
      cashAmount,
      plasticAmount,
      totalAmount: amount(payment.total_amount) || cashAmount + plasticAmount,
    };
  }

  const cashAmount = amount(payment.cash_amount);
  const plasticAmount = amount(payment.plastic_amount);

  return {
    cashAmount,
    plasticAmount,
    totalAmount: amount(payment.total_amount) || cashAmount + plasticAmount,
  };
}

export function getPrimaryInspectionDocumentId(payment: Payment): number | null {
  return payment.inspection_document_id ?? payment.allocations?.[0]?.inspection_document_id ?? null;
}

export function buildPaymentPayload(input: {
  branchId: number;
  counterpartyId: number;
  date: string;
  cashAmount: number;
  plasticAmount: number;
  inspectionDocumentId?: number | null;
  receiptType?: 'INV' | 'FTK' | null;
  zReportId?: string | null;
  paymentMethods: PaymentMethod[];
}): Record<string, unknown> {
  const totalAmount = input.cashAmount + input.plasticAmount;
  const cashMethod = input.paymentMethods.find((method) => method.code === 'CASH');
  const cardMethod = input.paymentMethods.find((method) => method.code === 'UZCARD')
    ?? input.paymentMethods.find((method) => method.type === 'card');

  const lines = [
    input.cashAmount > 0 && cashMethod
      ? { payment_method_id: cashMethod.id, amount: input.cashAmount }
      : null,
    input.plasticAmount > 0 && cardMethod
      ? { payment_method_id: cardMethod.id, amount: input.plasticAmount }
      : null,
  ].filter(Boolean);

  const allocations = input.inspectionDocumentId
    ? [{
        inspection_document_id: input.inspectionDocumentId,
        amount: totalAmount,
        allocation_type: 'payment',
      }]
    : [];

  return {
    branch_id: input.branchId,
    counterparty_id: input.counterpartyId,
    date: input.date,
    payment_type: 'regular',
    status: 'draft',
    total_amount: totalAmount,
    cash_amount: input.cashAmount,
    plastic_amount: input.plasticAmount,
    receipt_type: input.receiptType ?? 'FTK',
    z_report_id: input.zReportId || null,
    inspection_document_id: input.inspectionDocumentId ?? null,
    lines: lines.length ? lines : undefined,
    allocations: allocations.length ? allocations : undefined,
  };
}
