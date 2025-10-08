import type {
  Service as ApiService,
  ServiceCategory as ApiServiceCategory,
} from '@/lib/clients/services-client';
import type { Service as SharedService, ServiceCategory as SharedServiceCategory } from '@heya-pos/shared';

type NumericLike = number | string | { toNumber?: () => number } | null | undefined;

type MaybeArray<T> = T[] | { data?: T[] | null | undefined } | null | undefined;

const toNumber = (value: NumericLike, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  if (value && typeof value === 'object' && typeof value.toNumber === 'function') {
    const result = value.toNumber();
    return Number.isFinite(result) ? result : fallback;
  }

  return fallback;
};

const toPositiveInt = (value: NumericLike, fallback = 0): number => {
  const numeric = toNumber(value, fallback);
  return Number.isFinite(numeric) ? Math.max(0, Math.round(numeric)) : fallback;
};

const ensureOptionalString = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }
  return undefined;
};

const ensureStringArray = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const items = value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0);
  return items.length > 0 ? items : undefined;
};

const unwrapCollection = <T>(input: MaybeArray<T>): T[] => {
  if (Array.isArray(input)) {
    return input;
  }

  if (input && typeof input === 'object' && Array.isArray((input as any).data)) {
    return (input as { data: T[] }).data;
  }

  return [];
};

export interface ServiceRecord extends SharedService {
  createdAt?: string;
  updatedAt?: string;
  categoryColor?: string;
  taxRate?: number;
  costPrice?: number;
  sku?: string;
  metadata?: Record<string, unknown>;
}

export interface ServiceCategoryRecord extends SharedServiceCategory {
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  sortOrder?: number;
}

const deriveCategoryId = (service: ApiService): string => {
  const fromService = service.categoryId;
  if (typeof fromService === 'string' && fromService.length > 0) {
    return fromService;
  }

  const fromRelationship = service.category?.id;
  if (typeof fromRelationship === 'string' && fromRelationship.length > 0) {
    return fromRelationship;
  }

  return 'uncategorized';
};

const deriveCategoryName = (service: ApiService): string => {
  const embeddedName = (service as any).categoryName;
  if (typeof embeddedName === 'string' && embeddedName.trim().length > 0) {
    return embeddedName;
  }

  const relationshipName = service.category?.name;
  if (typeof relationshipName === 'string' && relationshipName.trim().length > 0) {
    return relationshipName;
  }

  return 'Uncategorized';
};

const deriveCategoryColor = (service: ApiService): string | undefined => {
  const fromRelationship = service.category && (service.category as any).color;
  if (typeof fromRelationship === 'string' && fromRelationship.length > 0) {
    return fromRelationship;
  }

  const embedded = (service as any).categoryColor;
  return typeof embedded === 'string' && embedded.length > 0 ? embedded : undefined;
};

const deriveMetadata = (service: ApiService): Record<string, unknown> | undefined => {
  const metadataCandidate = (service as any).metadata;
  return metadataCandidate && typeof metadataCandidate === 'object' ? { ...metadataCandidate } : undefined;
};

const isServiceRecord = (service: ApiService | ServiceRecord): service is ServiceRecord =>
  'categoryColor' in service || 'metadata' in service;

const isServiceCategoryRecord = (
  category: ApiServiceCategory | ServiceCategoryRecord,
): category is ServiceCategoryRecord => 'order' in category;

export const mapApiServiceToRecord = (service: ApiService | ServiceRecord): ServiceRecord => {
  if (isServiceRecord(service)) {
    return service;
  }

  const price = toNumber(service.price, 0);
  const duration = toPositiveInt(service.duration, 0);
  const categoryId = deriveCategoryId(service);
  const categoryName = deriveCategoryName(service);
  const staffIds = ensureStringArray((service as any).staffIds);
  const image = ensureOptionalString((service as any).image);

  return {
    id: service.id,
    name: service.name,
    description: service.description ?? undefined,
    duration,
    price,
    categoryId,
    categoryName,
    isActive: Boolean(service.isActive),
    image,
    staffIds,
    categoryColor: deriveCategoryColor(service),
    createdAt: service.createdAt,
    updatedAt: service.updatedAt,
    taxRate: typeof (service as any).taxRate === 'number' ? (service as any).taxRate : undefined,
    costPrice: typeof (service as any).costPrice === 'number' ? (service as any).costPrice : undefined,
    sku: ensureOptionalString((service as any).sku),
    metadata: deriveMetadata(service),
  };
};

export const mapApiServicesToRecords = (
  services: MaybeArray<ApiService | ServiceRecord>,
): ServiceRecord[] => unwrapCollection(services).map(mapApiServiceToRecord);

const deriveCategoryOrder = (category: ApiServiceCategory | ServiceCategoryRecord): number => {
  const sortOrder = (category as any).sortOrder;
  if (typeof sortOrder === 'number' && Number.isFinite(sortOrder)) {
    return sortOrder;
  }

  const order = (category as any).order;
  if (typeof order === 'number' && Number.isFinite(order)) {
    return order;
  }

  return 0;
};

export const mapApiCategoryToRecord = (
  category: ApiServiceCategory | ServiceCategoryRecord,
): ServiceCategoryRecord => {
  if (isServiceCategoryRecord(category)) {
    return category;
  }

  const order = deriveCategoryOrder(category);

  return {
    id: category.id,
    name: category.name,
    description: category.description ?? undefined,
    color: category.color ?? (category as any).color ?? undefined,
    icon: (category as any).icon ?? undefined,
    order,
    sortOrder: order,
    isActive: category.isActive ?? true,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
};

export const mapApiCategoriesToRecords = (
  categories: MaybeArray<ApiServiceCategory | ServiceCategoryRecord>,
): ServiceCategoryRecord[] => unwrapCollection(categories).map(mapApiCategoryToRecord);

export const mapServicesResponseToRecords = (response: unknown): ServiceRecord[] =>
  mapApiServicesToRecords(response as MaybeArray<ApiService | ServiceRecord>);

export const mapCategoriesResponseToRecords = (response: unknown): ServiceCategoryRecord[] =>
  mapApiCategoriesToRecords(response as MaybeArray<ApiServiceCategory | ServiceCategoryRecord>);
