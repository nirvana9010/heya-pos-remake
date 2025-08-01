import React, { useState, useEffect } from 'react';
import { X, Search, UserPlus, User, Phone, Mail, Check, ChevronLeft, Plus, Gift, Star } from 'lucide-react';
import { Button, Input, Label } from '@heya-pos/ui';
import { apiClient } from '../lib/api-client';
import { WALK_IN_CUSTOMER } from '../lib/constants/customer';
import type { Customer } from './customers';
import { cn } from '@heya-pos/ui';

interface CustomerSelectionSlideoutProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCustomer: (customer: Customer | null, isWalkIn: boolean) => void;
  currentCustomer?: Customer | null;
  isCurrentWalkIn?: boolean;
}

export const CustomerSelectionSlideout: React.FC<CustomerSelectionSlideoutProps> = ({
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
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [loyaltyStatus, setLoyaltyStatus] = useState<Record<string, any>>({});
  
  // New customer form state
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');

  // Reset form when closing
  useEffect(() => {
    if (!isOpen) {
      setShowCreateForm(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
      setNewCustomerEmail('');
      setSearchQuery('');
    }
  }, [isOpen]);

  // Search customers with debounce
  useEffect(() => {
    if (!isOpen || showCreateForm) return;

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
        const customerData = response.data || [];
        setCustomers(customerData);
        
        // Check loyalty status for each customer
        const loyaltyPromises = customerData.map(async (customer: Customer) => {
          try {
            const loyalty = await apiClient.loyalty.check(customer.id);
            return { customerId: customer.id, loyalty };
          } catch (error) {
            console.error(`Failed to check loyalty for customer ${customer.id}:`, error);
            return { customerId: customer.id, loyalty: null };
          }
        });
        
        const loyaltyResults = await Promise.all(loyaltyPromises);
        const newLoyaltyStatus: Record<string, any> = {};
        loyaltyResults.forEach(result => {
          if (result.loyalty) {
            newLoyaltyStatus[result.customerId] = result.loyalty;
          }
        });
        setLoyaltyStatus(newLoyaltyStatus);
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

  const handleCreateCustomer = async () => {
    if (!newCustomerName.trim()) {
      return;
    }

    setCreatingCustomer(true);
    try {
      // Build customer data object, only including non-empty fields
      const customerData: any = {
        firstName: newCustomerName.split(' ')[0] || newCustomerName,
      };
      
      // Only add lastName if there's actually a last name
      const lastName = newCustomerName.split(' ').slice(1).join(' ');
      if (lastName) {
        customerData.lastName = lastName;
      }
      
      // Only add phone if it's not empty
      if (newCustomerPhone.trim()) {
        customerData.phone = newCustomerPhone.trim();
      }
      
      // Only add email if it's not empty
      if (newCustomerEmail.trim()) {
        customerData.email = newCustomerEmail.trim();
      }
      
      const newCustomer = await apiClient.customers.createCustomer(customerData);
      
      // Select the newly created customer
      onSelectCustomer(newCustomer, false);
    } catch (error: any) {
      console.error('Failed to create customer:', error);
      
      // Show more specific error message if available
      let errorMessage = 'Failed to create customer.';
      if (error.message && Array.isArray(error.message)) {
        errorMessage += ' ' + error.message.join(', ');
      } else if (error.message) {
        errorMessage += ' ' + error.message;
      }
      
      alert(errorMessage);
    } finally {
      setCreatingCustomer(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 bg-gray-900 transition-opacity z-50",
          isOpen ? "bg-opacity-50" : "bg-opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />
      
      {/* Slideout */}
      <div className={cn(
        "fixed inset-y-0 right-0 flex max-w-full transform transition-transform duration-300 ease-in-out z-[60]",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="relative w-screen max-w-md">
          <div className="flex h-full flex-col bg-white shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={showCreateForm ? () => setShowCreateForm(false) : onClose}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {showCreateForm ? 'New Customer' : 'Select Customer'}
                  </h2>
                </div>
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
              {!showCreateForm && (
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
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {showCreateForm ? (
                // Create Customer Form
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="customerName">Name *</Label>
                    <Input
                      id="customerName"
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                      placeholder="John Doe"
                      className="mt-1"
                      autoFocus
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="customerPhone">Phone</Label>
                    <Input
                      id="customerPhone"
                      value={newCustomerPhone}
                      onChange={(e) => setNewCustomerPhone(e.target.value)}
                      placeholder="0400 123 456"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="customerEmail">Email</Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      value={newCustomerEmail}
                      onChange={(e) => setNewCustomerEmail(e.target.value)}
                      placeholder="john@example.com"
                      className="mt-1"
                    />
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={handleCreateCustomer}
                      disabled={!newCustomerName.trim() || creatingCustomer}
                      className="flex-1"
                    >
                      {creatingCustomer ? 'Creating...' : 'Create Customer'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowCreateForm(false)}
                      disabled={creatingCustomer}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                // Customer List
                <>
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
                  <p className="text-sm text-gray-400 mt-1">or</p>
                  <Button
                    onClick={() => setShowCreateForm(true)}
                    variant="outline"
                    className="mt-4"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Customer
                  </Button>
                </div>
              )}

              {/* No Results */}
              {!loading && searchQuery.length >= 2 && customers.length === 0 && (
                <div className="text-center py-8">
                  <User className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500">No customers found</p>
                  <p className="text-sm text-gray-400 mt-1">Try a different search term</p>
                  <Button
                    onClick={() => setShowCreateForm(true)}
                    variant="outline"
                    className="mt-4"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Customer
                  </Button>
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
                    const loyalty = loyaltyStatus[customer.id];
                    const hasReward = loyalty?.rewardAvailable;
                    const loyaltyType = loyalty?.type;

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
                              {/* Loyalty Badge */}
                              {hasReward && (
                                <div className="flex items-center gap-1 mt-1">
                                  <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                                    {loyaltyType === 'VISITS' ? (
                                      <>
                                        <Gift className="h-3 w-3" />
                                        <span>Reward Available!</span>
                                      </>
                                    ) : (
                                      <>
                                        <Star className="h-3 w-3" />
                                        <span>${loyalty.dollarValue?.toFixed(2)} available</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {hasReward && (
                              <Gift className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                            )}
                            {isSelected && (
                              <Check className="h-5 w-5 text-teal-600 flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};