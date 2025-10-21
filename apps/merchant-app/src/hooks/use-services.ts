'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@heya-pos/ui';
import { prefetchManager } from '@/lib/prefetch';
import type {
  CreateServiceRequest,
  UpdateServiceRequest,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from '@/lib/clients/services-client';
import {
  mapApiServicesToRecords,
  mapApiCategoriesToRecords,
} from '@/lib/normalizers/service';
import type { ServiceRecord, ServiceCategoryRecord } from '@/lib/normalizers/service';

// Query keys
export const servicesKeys = {
  all: ['services'] as const,
  services: () => [...servicesKeys.all, 'list'] as const,
  service: (id: string) => [...servicesKeys.all, 'detail', id] as const,
  categories: () => [...servicesKeys.all, 'categories'] as const,
  counts: () => [...servicesKeys.all, 'counts'] as const,
};

interface ServicesMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ServicesDataResult {
  services: ServiceRecord[];
  categories: ServiceCategoryRecord[];
  serviceCounts: Record<string, number>;
  totalServices: number;
  meta?: ServicesMeta;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
}

// Hook to fetch all services with pagination and filtering
export function useServices(params?: {
  page?: number;
  limit?: number;
  searchTerm?: string;
  categoryId?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  const queryKey = [...servicesKeys.services(), params];

  return useQuery<{ data: ServiceRecord[]; meta?: ServicesMeta }>({
    queryKey,
    queryFn: async () => {
      const response = await apiClient.getServices(params);
      return {
        data: mapApiServicesToRecords(response?.data),
        meta: response.meta,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Hook to fetch all categories
export function useCategories() {
  return useQuery<ServiceCategoryRecord[]>({
    queryKey: servicesKeys.categories(),
    queryFn: async () => {
      // Check prefetch cache first
      const cached = prefetchManager.getCached('services');
      if (cached?.categories) {
        // Return cached data immediately, React Query will refetch in background
        return cached.categories as ServiceCategoryRecord[];
      }
      const categories = await apiClient.getCategories();
      return mapApiCategoriesToRecords(categories);
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - categories change less often
    gcTime: 15 * 60 * 1000, // 15 minutes
  });
}

// Hook to get service counts per category
export function useServiceCounts() {
  return useQuery({
    queryKey: servicesKeys.counts(),
    queryFn: async () => {
      const response = await apiClient.getServices({ limit: 1000 });
      const services = mapApiServicesToRecords(response?.data);
      
      // Calculate counts per category
      const counts: Record<string, number> = {};
      services.forEach(service => {
        if (service.categoryId) {
          counts[service.categoryId] = (counts[service.categoryId] || 0) + 1;
        }
      });
      
      return {
        counts,
        total: services.length
      };
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 60 * 1000, // 1 minute
  });
}

// Combined hook for both services and categories
export function useServicesData(params?: { 
  page?: number; 
  limit?: number;
  searchTerm?: string;
  categoryId?: string;
  isActive?: boolean;
}) {
  const servicesQuery = useServices(params);
  const categoriesQuery = useCategories();
  const countsQuery = useServiceCounts();

  const services = servicesQuery.data?.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const meta = servicesQuery.data?.meta;

  const result: ServicesDataResult = {
    services,
    categories,
    serviceCounts: countsQuery.data?.counts ?? {},
    totalServices: countsQuery.data?.total ?? services.length,
    meta,
    isLoading: servicesQuery.isLoading || categoriesQuery.isLoading || countsQuery.isLoading,
    isError: servicesQuery.isError || categoriesQuery.isError || countsQuery.isError,
    error: servicesQuery.error || categoriesQuery.error || countsQuery.error,
    refetch: () => {
      servicesQuery.refetch();
      categoriesQuery.refetch();
      countsQuery.refetch();
    },
  };

  return result;
}

// Hook to create a service
export function useCreateService() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateServiceRequest) =>
      apiClient.createService(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: servicesKeys.services() });
      queryClient.invalidateQueries({ queryKey: servicesKeys.counts() }); // Invalidate counts
      toast({
        title: 'Success',
        description: 'Service created successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create service',
        variant: 'destructive',
      });
    },
  });
}

// Hook to update a service
export function useUpdateService() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateServiceRequest }) => {
      const payload: UpdateServiceRequest = { ...data };
      if (
        !payload.idempotencyKey &&
        typeof crypto !== 'undefined' &&
        typeof crypto.randomUUID === 'function'
      ) {
        payload.idempotencyKey = crypto.randomUUID();
      }
      return apiClient.updateService(id, payload);
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: servicesKeys.services() });
      queryClient.invalidateQueries({ queryKey: servicesKeys.service(id) });
      queryClient.invalidateQueries({ queryKey: servicesKeys.counts() }); // Invalidate counts
      toast({
        title: 'Success',
        description: 'Service updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update service',
        variant: 'destructive',
      });
    },
  });
}

// Hook to delete a service
export function useDeleteService(options?: { suppressToast?: boolean }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => apiClient.deleteService(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: servicesKeys.services() });
      queryClient.invalidateQueries({ queryKey: servicesKeys.counts() }); // Invalidate counts
      if (!options?.suppressToast) {
        toast({
          title: 'Success',
          description: 'Service deleted successfully',
        });
      }
    },
    onError: (error: any) => {
      if (!options?.suppressToast) {
        toast({
          title: 'Error',
          description: error.response?.data?.message || 'Failed to delete service',
          variant: 'destructive',
        });
      }
    },
  });
}

// Hook to create a category
export function useCreateCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateCategoryRequest) =>
      apiClient.createCategory(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: servicesKeys.categories() });
      queryClient.refetchQueries({ queryKey: servicesKeys.categories() });
      toast({
        title: 'Success',
        description: 'Category created successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create category',
        variant: 'destructive',
      });
    },
  });
}

// Hook to update a category
export function useUpdateCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCategoryRequest }) =>
      apiClient.updateCategory(id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: servicesKeys.categories() });
      queryClient.refetchQueries({ queryKey: servicesKeys.categories() });
      toast({
        title: 'Success',
        description: 'Category updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update category',
        variant: 'destructive',
      });
    },
  });
}

// Hook to delete a category
export function useDeleteCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => apiClient.deleteCategory(id),
    onSuccess: async () => {
      // Invalidate and refetch to ensure immediate update
      await queryClient.invalidateQueries({ queryKey: servicesKeys.categories() });
      await queryClient.invalidateQueries({ queryKey: servicesKeys.services() });
      await queryClient.invalidateQueries({ queryKey: servicesKeys.counts() }); // Invalidate counts
      
      // Force refetch categories to ensure immediate UI update
      queryClient.refetchQueries({ queryKey: servicesKeys.categories() });
      
      toast({
        title: 'Success',
        description: 'Category deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete category',
        variant: 'destructive',
      });
    },
  });
}
