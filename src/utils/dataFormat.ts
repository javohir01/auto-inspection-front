/** Format a calendar date without converting it to UTC. */
export function toApiDate(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? null;
}

/** Parse an API Y-m-d value as a local date so DatePicker does not shift days. */
export function fromApiDate(value: unknown): Date | null {
  const date = toApiDate(value);
  if (!date) return null;
  const [year, month, day] = date.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function normalizePhone(value: unknown): string {
  const raw = String(value ?? '').trim();
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 9) return `+998${digits}`;
  if (digits.length === 12 && digits.startsWith('998')) return `+${digits}`;
  return raw.startsWith('+') && digits ? `+${digits}` : digits;
}

export function normalizeLicensePlate(value: unknown): string {
  return String(value ?? '').trim().toUpperCase().replace(/[\s-]+/g, '');
}
