import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api-client';
import type { Customer, CreateCustomerRequest, UpdateCustomerRequest } from '../../clients/customers-client';

// Type for paginated response
interface PaginatedCustomersResponse {
  data: Customer[];
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Query keys for customers
export const customerKeys = {
  all: ['customers'] as const,
  lists: () => [...customerKeys.all, 'list'] as const,
  list: (params?: any) => [...customerKeys.lists(), { params }] as const,
  details: () => [...customerKeys.all, 'detail'] as const,
  detail: (id: string) => [...customerKeys.details(), id] as const,
};

/**
 * Hook to fetch all customers (returns paginated response)
 */
export function useCustomers(params?: { limit?: number; page?: number; search?: string }) {
  return useQuery({
    queryKey: customerKeys.list(params),
    queryFn: () => apiClient.customers.getCustomers(params),
    staleTime: 10 * 60 * 1000, // 10 minutes (customers don't change as frequently)
    refetchOnWindowFocus: false, // Don't auto-refetch on focus for customers
  });
}

/**
 * Hook to fetch a single customer by ID
 */
export function useCustomer(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: () => apiClient.customers.getCustomer(id),
    enabled: enabled && !!id,
    staleTime: 15 * 60 * 1000, // 15 minutes for individual customers
  });
}

/**
 * Mutation hook to create a new customer
 */
export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCustomerRequest) => apiClient.customers.createCustomer(data),
    onSuccess: (newCustomer) => {
      // Invalidate and refetch customers list
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
      
      // Add the new customer to the cache
      queryClient.setQueryData(
        customerKeys.detail(newCustomer.id),
        newCustomer
      );

      // Optimistically update the customers list (handle paginated response)
      queryClient.setQueriesData(
        { queryKey: customerKeys.lists() },
        (oldData: PaginatedCustomersResponse | undefined) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            data: [...oldData.data, newCustomer],
            meta: oldData.meta ? { ...oldData.meta, total: oldData.meta.total + 1 } : undefined
          };
        }
      );
    },
    onError: (error) => {
      console.error('Failed to create customer:', error);
    },
  });
}

/**
 * Mutation hook to update a customer
 */
export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCustomerRequest }) => 
      apiClient.customers.updateCustomer(id, data),
    onSuccess: (updatedCustomer, { id }) => {
      // Update the specific customer in cache
      queryClient.setQueryData(
        customerKeys.detail(id),
        updatedCustomer
      );
      
      // Update the customer in the list (handle paginated response)
      queryClient.setQueriesData(
        { queryKey: customerKeys.lists() },
        (oldData: PaginatedCustomersResponse | undefined) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            data: oldData.data.map(customer => 
              customer.id === id ? updatedCustomer : customer
            )
          };
        }
      );
    },
    onError: (error) => {
      console.error('Failed to update customer:', error);
    },
  });
}

/**
 * Mutation hook to delete a customer
 */
export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.customers.deleteCustomer(id),
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: customerKeys.detail(id) });
      
      // Remove from the list (handle paginated response)
      queryClient.setQueriesData(
        { queryKey: customerKeys.lists() },
        (oldData: PaginatedCustomersResponse | undefined) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            data: oldData.data.filter(customer => customer.id !== id),
            meta: oldData.meta ? { ...oldData.meta, total: Math.max(0, oldData.meta.total - 1) } : undefined
          };
        }
      );
    },
    onError: (error) => {
      console.error('Failed to delete customer:', error);
    },
  });
}