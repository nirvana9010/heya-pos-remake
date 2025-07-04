'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@heya-pos/ui';
import { prefetchManager } from '@/lib/prefetch';
import type { Service, ServiceCategory } from '@heya-pos/shared';

// Query keys
export const servicesKeys = {
  all: ['services'] as const,
  services: () => [...servicesKeys.all, 'list'] as const,
  service: (id: string) => [...servicesKeys.all, 'detail', id] as const,
  categories: () => [...servicesKeys.all, 'categories'] as const,
};

// Hook to fetch all services with pagination and filtering
export function useServices(params?: { 
  page?: number; 
  limit?: number;
  searchTerm?: string;
  categoryId?: string;
  isActive?: boolean;
}) {
  const queryKey = [...servicesKeys.services(), params];
  
  return useQuery({
    queryKey,
    queryFn: async () => {
      // Always fetch from API for paginated data
      const response = await apiClient.getServices(params);
      return response;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Hook to fetch all categories
export function useCategories() {
  return useQuery({
    queryKey: servicesKeys.categories(),
    queryFn: async () => {
      // Check prefetch cache first
      const cached = prefetchManager.getCached('services');
      if (cached?.categories) {
        // Return cached data immediately, React Query will refetch in background
        return cached.categories;
      }
      return apiClient.getCategories();
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - categories change less often
    gcTime: 15 * 60 * 1000, // 15 minutes
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

  return {
    services: servicesQuery.data?.data || [],
    categories: categoriesQuery.data || [],
    meta: servicesQuery.data?.meta,
    isLoading: servicesQuery.isLoading || categoriesQuery.isLoading,
    isError: servicesQuery.isError || categoriesQuery.isError,
    error: servicesQuery.error || categoriesQuery.error,
    refetch: () => {
      servicesQuery.refetch();
      categoriesQuery.refetch();
    }
  };
}

// Hook to create a service
export function useCreateService() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: Omit<Service, 'id' | 'createdAt' | 'updatedAt'>) => 
      apiClient.createService(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: servicesKeys.services() });
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
    mutationFn: ({ id, data }: { id: string; data: Partial<Service> }) => 
      apiClient.updateService(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: servicesKeys.services() });
      queryClient.invalidateQueries({ queryKey: servicesKeys.service(id) });
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
export function useDeleteService() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => apiClient.deleteService(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: servicesKeys.services() });
      toast({
        title: 'Success',
        description: 'Service deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete service',
        variant: 'destructive',
      });
    },
  });
}

// Hook to create a category
export function useCreateCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: Omit<ServiceCategory, 'id' | 'createdAt' | 'updatedAt'>) => 
      apiClient.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: servicesKeys.categories() });
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
    mutationFn: ({ id, data }: { id: string; data: Partial<ServiceCategory> }) => 
      apiClient.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: servicesKeys.categories() });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: servicesKeys.categories() });
      queryClient.invalidateQueries({ queryKey: servicesKeys.services() });
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