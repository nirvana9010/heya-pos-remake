import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api-client';
import type { Customer, CreateCustomerRequest, UpdateCustomerRequest } from '../../clients/customers-client';

// Query keys for customers
export const customerKeys = {
  all: ['customers'] as const,
  lists: () => [...customerKeys.all, 'list'] as const,
  list: (params?: any) => [...customerKeys.lists(), { params }] as const,
  details: () => [...customerKeys.all, 'detail'] as const,
  detail: (id: string) => [...customerKeys.details(), id] as const,
};

/**
 * Hook to fetch all customers
 */
export function useCustomers() {
  return useQuery({
    queryKey: customerKeys.list(),
    queryFn: () => apiClient.customers.getCustomers(),
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

      // Optimistically update the customers list
      queryClient.setQueryData(
        customerKeys.list(),
        (oldCustomers: Customer[] | undefined) => {
          return oldCustomers ? [...oldCustomers, newCustomer] : [newCustomer];
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
      
      // Update the customer in the list
      queryClient.setQueryData(
        customerKeys.list(),
        (oldCustomers: Customer[] | undefined) => {
          return oldCustomers?.map(customer => 
            customer.id === id ? updatedCustomer : customer
          ) || [updatedCustomer];
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
      
      // Remove from the list
      queryClient.setQueryData(
        customerKeys.list(),
        (oldCustomers: Customer[] | undefined) => {
          return oldCustomers?.filter(customer => customer.id !== id) || [];
        }
      );
    },
    onError: (error) => {
      console.error('Failed to delete customer:', error);
    },
  });
}