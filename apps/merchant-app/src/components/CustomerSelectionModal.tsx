import React, { useState, useEffect } from 'react';
import { X, Search, UserPlus, User, Phone, Mail, Check } from 'lucide-react';
import { Button, Input } from '@heya-pos/ui';
import { apiClient } from '../lib/api-client';
import { WALK_IN_CUSTOMER } from '../lib/constants/customer';
import type { Customer } from './customers';
import { cn } from '@heya-pos/ui';

interface CustomerSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCustomer: (customer: Customer | null, isWalkIn: boolean) => void;
  currentCustomer?: Customer | null;
  isCurrentWalkIn?: boolean;
}

export const CustomerSelectionModal: React.FC<CustomerSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectCustomer,
  currentCustomer,
  isCurrentWalkIn,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // Search customers with debounce
  useEffect(() => {
    if (!isOpen) return;

    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Don't search if query is too short
    if (searchQuery.length < 2) {
      setCustomers([]);
      return;
    }

    // Set new timeout for debounced search
    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await apiClient.searchCustomers(searchQuery);
        setCustomers(response.data || []);
      } catch (error) {
        console.error('Failed to search customers:', error);
        setCustomers([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    setSearchTimeout(timeout);

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [searchQuery, isOpen]);

  const handleSelectWalkIn = () => {
    onSelectCustomer(null, true);
  };

  const handleSelectCustomer = (customer: Customer) => {
    onSelectCustomer(customer, false);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-gray-900 bg-opacity-50 z-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="bg-white w-full sm:max-w-lg h-full sm:h-[70vh] sm:rounded-lg shadow-xl flex flex-col animate-slide-up sm:animate-fade-in">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b px-4 py-3 sm:px-6 sm:py-4 z-10">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                Select Customer
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            {/* Search */}
            <div className="mt-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  autoFocus
                />
              </div>
            </div>
          </div>

          {/* Customer List */}
          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            {/* Walk-in Option */}
            <button
              onClick={handleSelectWalkIn}
              className={cn(
                "w-full p-4 text-left border rounded-lg transition-all mb-4",
                isCurrentWalkIn
                  ? "bg-teal-50 border-teal-300"
                  : "bg-gray-50 border-gray-200 hover:border-teal-300 hover:bg-teal-50"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    isCurrentWalkIn ? "bg-teal-600" : "bg-gray-300"
                  )}>
                    <UserPlus className={cn(
                      "h-5 w-5",
                      isCurrentWalkIn ? "text-white" : "text-gray-600"
                    )} />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Walk-in Customer</h4>
                    <p className="text-sm text-gray-600">No customer information required</p>
                  </div>
                </div>
                {isCurrentWalkIn && (
                  <Check className="h-5 w-5 text-teal-600" />
                )}
              </div>
            </button>

            {/* Loading State */}
            {loading && (
              <div className="text-center py-8">
                <div className="inline-flex items-center gap-2 text-gray-500">
                  <div className="h-4 w-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                  Searching...
                </div>
              </div>
            )}

            {/* No Search Query */}
            {!loading && searchQuery.length < 2 && (
              <div className="text-center py-8 text-gray-500">
                <User className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Enter at least 2 characters to search</p>
              </div>
            )}

            {/* No Results */}
            {!loading && searchQuery.length >= 2 && customers.length === 0 && (
              <div className="text-center py-8">
                <User className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">No customers found</p>
                <p className="text-sm text-gray-400 mt-1">Try a different search term</p>
              </div>
            )}

            {/* Customer Results */}
            {!loading && customers.length > 0 && (
              <div className="space-y-2">
                {customers.map((customer) => {
                  const isSelected = currentCustomer?.id === customer.id && !isCurrentWalkIn;
                  const displayName = customer.name || 
                    `${customer.firstName || ''} ${customer.lastName || ''}`.trim() ||
                    'Unnamed Customer';

                  return (
                    <button
                      key={customer.id}
                      onClick={() => handleSelectCustomer(customer)}
                      className={cn(
                        "w-full p-4 text-left border rounded-lg transition-all",
                        isSelected
                          ? "bg-teal-50 border-teal-300"
                          : "bg-white border-gray-200 hover:border-teal-300 hover:bg-teal-50"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                            isSelected ? "bg-teal-600" : "bg-gray-200"
                          )}>
                            <User className={cn(
                              "h-5 w-5",
                              isSelected ? "text-white" : "text-gray-600"
                            )} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-medium text-gray-900 truncate">
                              {displayName}
                            </h4>
                            <div className="flex flex-col gap-1 mt-1">
                              {customer.email && (
                                <div className="flex items-center gap-1 text-sm text-gray-600">
                                  <Mail className="h-3 w-3" />
                                  <span className="truncate">{customer.email}</span>
                                </div>
                              )}
                              {customer.phone && (
                                <div className="flex items-center gap-1 text-sm text-gray-600">
                                  <Phone className="h-3 w-3" />
                                  <span>{customer.phone}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        {isSelected && (
                          <Check className="h-5 w-5 text-teal-600 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};