export type BookingSourceCategory = 'online' | 'manual' | 'walk-in' | 'unknown';

export interface BookingSourceInfo {
  raw: string | null;
  category: BookingSourceCategory;
  label: 'Online' | 'Manual' | 'Walk-in' | 'Unknown';
}

const SOURCE_CATEGORY_MAP: Record<string, BookingSourceCategory> = {
  ONLINE: 'online',
  WEB: 'online',
  PORTAL: 'online',
  API: 'online',
  CHECK_IN: 'walk-in',
  CHECKIN: 'walk-in',
  WALK_IN: 'walk-in',
  WALKIN: 'walk-in',
  WALKIN_ONSITE: 'walk-in',
  IN_PERSON: 'manual',
  INPERSON: 'manual',
  POS: 'manual',
  ADMIN: 'manual',
  PHONE: 'manual',
  MANUAL: 'manual',
};

const CATEGORY_LABELS: Record<BookingSourceCategory, BookingSourceInfo['label']> = {
  online: 'Online',
  'walk-in': 'Walk-in',
  manual: 'Manual',
  unknown: 'Unknown',
};

export function mapBookingSource(rawSource?: string | null, customerSource?: string | null): BookingSourceInfo {
  const normalizedRaw = (rawSource || customerSource || '')
    .trim()
    .replace(/[\s-]+/g, '_')
    .toUpperCase() || null;
  const category = normalizedRaw ? SOURCE_CATEGORY_MAP[normalizedRaw] ?? 'unknown' : 'unknown';

  return {
    raw: normalizedRaw,
    category,
    label: CATEGORY_LABELS[category],
  };
}
