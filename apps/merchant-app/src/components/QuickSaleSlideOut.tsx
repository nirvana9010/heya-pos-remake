import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  X, Plus, Trash2, Search, Clock, DollarSign, 
  UserPlus, ChevronDown, ChevronUp, Users, CreditCard 
} from 'lucide-react';
import { apiClient } from '../lib/api-client';
import { CustomerSearchInput } from './customers';
import type { Customer } from './customers';
import { Button, Input, Badge, Label, Spinner } from '@heya-pos/ui';
import { cn } from '@heya-pos/ui';
import { debounce } from 'lodash';
import { useAuth } from '@/lib/auth/auth-provider';
import { PaymentDialog } from './PaymentDialog';

interface QuickSaleSlideOutProps {
  isOpen: boolean;
  onClose: () => void;
  services: any[];
  staff: any[];
  onSaleComplete: () => void;
}

export const QuickSaleSlideOut: React.FC<QuickSaleSlideOutProps> = ({
  isOpen,
  onClose,
  services,
  staff,
  onSaleComplete,
}) => {
  const { merchant } = useAuth();
  const [selectedServices, setSelectedServices] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isWalkIn, setIsWalkIn] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  // Stable empty array for CustomerSearchInput fallback
  const fallbackCustomers = useMemo(() => [], []);

  // Extract unique categories from services
  const categories = useMemo(() => {
    const uniqueCategories = new Map();
    services.forEach(service => {
      if (service.categoryId && service.categoryName) {
        uniqueCategories.set(service.categoryId, service.categoryName);
      }
    });
    return Array.from(uniqueCategories, ([id, name]) => ({ id, name }));
  }, [services]);

  // Filter services based on search and category
  const filteredServices = useMemo(() => {
    return services.filter(service => {
      const matchesSearch = searchQuery === '' || 
        service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (service.description && service.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'all' || 
        service.categoryId === selectedCategory;
      
      return matchesSearch && matchesCategory && service.isActive;
    });
  }, [services, searchQuery, selectedCategory]);

  // Reset when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setSelectedServices([]);
      setSelectedCustomer(null);
      setOrder(null);
      setSearchQuery('');
      setSelectedCategory('all');
      setIsWalkIn(false);
      setPaymentDialogOpen(false);
    }
  }, [isOpen]);

  const handleAddService = (service: any) => {
    setSelectedServices([...selectedServices, {
      ...service,
      quantity: 1,
      staffId: staff[0]?.id // Default to first staff
    }]);
  };

  const handleRemoveService = (index: number) => {
    setSelectedServices(selectedServices.filter((_, i) => i !== index));
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    const updated = [...selectedServices];
    updated[index].quantity = Math.max(1, quantity);
    setSelectedServices(updated);
  };

  const handleStaffChange = (index: number, staffId: string) => {
    const updated = [...selectedServices];
    updated[index].staffId = staffId;
    setSelectedServices(updated);
  };

  const calculateTotal = () => {
    return selectedServices.reduce((sum, service) => 
      sum + (service.price * service.quantity), 0
    );
  };

  const handleCreateOrder = async () => {
    if (!selectedServices.length) return;
    
    setLoading(true);
    try {
      // Handle customer selection
      let customerId: string | undefined;
      
      if (isWalkIn && !selectedCustomer) {
        // Need to create a new walk-in customer
        console.log('Creating new walk-in customer...');
        try {
          const walkInCustomer = await apiClient.createCustomer({
            firstName: 'Walk-in',
            lastName: 'Customer', // BookingSlideOut uses this
            source: 'WALK_IN'
            // Don't send phone or email for walk-in
          });
          customerId = walkInCustomer.id;
          console.log('Created new walk-in customer:', customerId);
        } catch (error: any) {
          console.error('Error creating walk-in customer:', error);
          console.error('Error response:', error?.response?.data);
          const errorMessage = error?.response?.data?.message?.[0] || error?.message || 'Failed to create walk-in customer';
          throw new Error(errorMessage);
        }
      } else if (selectedCustomer) {
        // Use the selected customer (either regular or existing walk-in)
        customerId = selectedCustomer.id;
        console.log('Using selected customer:', customerId);
      } else {
        throw new Error('Please select a customer');
      }
      
      // Step 1: Create order
      console.log('Creating order with customerId:', customerId);
      const orderData = await apiClient.createOrder({
        customerId: customerId
      });
      console.log('Order created:', orderData);

      // Step 2: Add services as order items
      const items = selectedServices.map(service => ({
        itemType: 'SERVICE',
        itemId: service.id,
        description: service.name,
        unitPrice: typeof service.price === 'object' && service.price.toNumber 
          ? service.price.toNumber() 
          : Number(service.price || 0),
        quantity: service.quantity,
        staffId: service.staffId,
        discount: 0,
        taxRate: 0
      }));
      console.log('Adding order items:', items);

      const updatedOrder = await apiClient.addOrderItems(orderData.id, items);
      console.log('Order items added:', updatedOrder);
      
      // Step 3: Lock the order for payment
      console.log('Locking order for payment...');
      await apiClient.updateOrderState(orderData.id, 'LOCKED');
      
      setOrder(updatedOrder);
      setPaymentDialogOpen(true); // Open payment dialog instead of moving to step 3
    } catch (error: any) {
      console.error('Failed to create order:', error);
      console.error('Error details:', {
        message: error?.message,
        response: error?.response,
        data: error?.response?.data,
        status: error?.response?.status
      });
      
      // Show more detailed error message
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to create order';
      alert(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentComplete = async (updatedOrder: any) => {
    // Payment completed successfully
    setPaymentDialogOpen(false);
    onSaleComplete();
    onClose();
    
    // Reset state
    setSelectedServices([]);
    setSelectedCustomer(null);
    setOrder(null);
    setCurrentStep(1);
    setIsWalkIn(false);
  };

  const renderServiceSelection = () => (
    <div className="space-y-4">
      {/* Search and filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {/* Category filter badges */}
        <div className="flex gap-2 flex-wrap">
          <Badge
            variant={selectedCategory === 'all' ? 'default' : 'secondary'}
            className={cn(
              "cursor-pointer",
              selectedCategory === 'all' 
                ? 'bg-teal-600 text-white hover:bg-teal-700' 
                : 'hover:bg-gray-200'
            )}
            onClick={() => setSelectedCategory('all')}
          >
            All Services ({services.length})
          </Badge>
          {categories.map(cat => (
            <Badge
              key={cat.id}
              variant={selectedCategory === cat.id ? 'default' : 'secondary'}
              className={cn(
                "cursor-pointer",
                selectedCategory === cat.id 
                  ? 'bg-teal-600 text-white hover:bg-teal-700' 
                  : 'hover:bg-gray-200'
              )}
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.name}
            </Badge>
          ))}
        </div>
      </div>

      {/* Selected services summary */}
      {selectedServices.length > 0 && (
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-teal-700">Selected Services</h4>
            <Badge className="bg-teal-600 text-white">
              {selectedServices.length} item{selectedServices.length > 1 ? 's' : ''}
            </Badge>
          </div>
          <div className="space-y-2">
            {selectedServices.map((service, index) => (
              <div key={index} className="flex items-center gap-2 bg-white p-2 rounded border border-teal-200">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{service.name}</div>
                  <div className="text-xs text-gray-600">
                    ${service.price} × {service.quantity} = ${(service.price * service.quantity).toFixed(2)}
                  </div>
                </div>
                
                <select
                  value={service.staffId}
                  onChange={(e) => handleStaffChange(index, e.target.value)}
                  className="text-sm px-2 py-1 border rounded"
                >
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleQuantityChange(index, Math.max(1, service.quantity - 1))}
                    className="h-6 w-6 p-0"
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                  <span className="w-8 text-center text-sm">{service.quantity}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleQuantityChange(index, service.quantity + 1)}
                    className="h-6 w-6 p-0"
                  >
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                </div>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRemoveService(index)}
                  className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-teal-200 flex justify-between items-center">
            <span className="font-semibold text-teal-700">Total</span>
            <span className="text-xl font-bold text-teal-700">${calculateTotal().toFixed(2)}</span>
          </div>
        </div>
      )}
      
      {/* Service list */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredServices.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Search className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>No services found</p>
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="mt-2"
              >
                Clear search
              </Button>
            )}
          </div>
        ) : (
          filteredServices.map((service) => (
            <button
              key={service.id}
              onClick={() => handleAddService(service)}
              className="w-full p-4 text-left bg-white border border-gray-200 rounded-lg hover:border-teal-300 hover:bg-teal-50 transition-colors group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900 group-hover:text-teal-700">
                      {service.name}
                    </h4>
                    {service.categoryName && (
                      <Badge variant="secondary" className="text-xs">
                        {service.categoryName}
                      </Badge>
                    )}
                  </div>
                  {service.description && (
                    <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="flex items-center gap-1 text-gray-700">
                      <DollarSign className="h-3 w-3" />
                      {service.price.toFixed(2)}
                    </span>
                    {service.duration && (
                      <span className="flex items-center gap-1 text-gray-600">
                        <Clock className="h-3 w-3" />
                        {service.duration} min
                      </span>
                    )}
                  </div>
                </div>
                <Plus className="h-5 w-5 text-gray-400 group-hover:text-teal-600 flex-shrink-0 ml-4" />
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );

  const handleWalkIn = async () => {
    try {
      // Search for existing walk-in customer
      const searchResponse = await apiClient.searchCustomers('Walk-in');
      const customers = searchResponse?.data || [];
      const existingWalkInCustomer = customers.find((customer: any) => 
        customer.firstName === 'Walk-in' && 
        (!customer.lastName || customer.lastName === '') &&
        customer.source === 'WALK_IN'
      );
      
      if (existingWalkInCustomer) {
        // Use existing walk-in customer
        setSelectedCustomer(existingWalkInCustomer);
        setIsWalkIn(true);
      } else {
        // No existing walk-in customer found, mark as walk-in but don't create yet
        setSelectedCustomer(null);
        setIsWalkIn(true);
      }
    } catch (error) {
      console.error('Failed to search for existing walk-in customer:', error);
      // Fallback to marking as walk-in
      setSelectedCustomer(null);
      setIsWalkIn(true);
    }
  };

  const handleCustomerSelect = useCallback((customer: Customer | null) => {
    setSelectedCustomer((prevCustomer) => {
      // Prevent updates if nothing changed
      if (customer === prevCustomer) return prevCustomer;
      
      // Only set isWalkIn to false if we're selecting a real customer
      if (customer && customer.id !== 'walk-in') {
        setIsWalkIn(false);
      }
      
      return customer;
    });
  }, []); // No dependencies, stable reference

  const renderCustomerSelection = () => (
    <div className="space-y-4">
        {/* Walk-in button */}
        <div className="space-y-3">
          <Button
            onClick={handleWalkIn}
            className={cn(
              "w-full bg-teal-50 hover:bg-teal-100 text-teal-700 border-2 border-teal-200",
              isWalkIn && "bg-teal-100 border-teal-300"
            )}
            size="lg"
          >
            <UserPlus className="mr-2 h-5 w-5" />
            Walk-in Customer
          </Button>
          
          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-4 text-gray-500">Or select existing customer</span>
            </div>
          </div>
          
          {/* Customer search */}
          <CustomerSearchInput
            value={selectedCustomer}
            onSelect={handleCustomerSelect}
            placeholder="Search for customer by name or phone"
            disabled={isWalkIn}
            fallbackCustomers={fallbackCustomers}
          />
        </div>

      {/* Selected customer display */}
      {(selectedCustomer || isWalkIn) && (
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-teal-700">Customer</h4>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSelectedCustomer(null);
                setIsWalkIn(false);
              }}
            >
              Change
            </Button>
          </div>
          <div className="space-y-1">
            {isWalkIn ? (
              <p className="font-medium">Walk-in Customer</p>
            ) : selectedCustomer && (
              <>
                <p className="font-medium">
                  {selectedCustomer.name || `${selectedCustomer.firstName || ''} ${selectedCustomer.lastName || ''}`.trim()}
                </p>
                {selectedCustomer.phone && (
                  <p className="text-sm text-gray-600">{selectedCustomer.phone}</p>
                )}
                {selectedCustomer.email && (
                  <p className="text-sm text-gray-600">{selectedCustomer.email}</p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );


  return (
    <>
      {/* Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-40",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )} 
        onClick={onClose} 
      />
      
      {/* Slideout */}
      <div className={cn(
        "fixed inset-y-0 right-0 flex max-w-full pl-10 transform transition-transform z-50",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="pointer-events-auto relative w-screen max-w-lg">
          <div className="flex h-full flex-col bg-white shadow-xl">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-white border-b px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-gray-900">
                  Quick Sale
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
              
              {/* Progress indicator */}
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                    currentStep >= 1 ? "bg-teal-600 text-white" : "bg-gray-200 text-gray-500"
                  )}>
                    1
                  </div>
                  <span className={cn(
                    "text-sm font-medium",
                    currentStep >= 1 ? "text-gray-900" : "text-gray-500"
                  )}>
                    Services
                  </span>
                </div>
                <div className="flex-1 h-0.5 bg-gray-200 mx-4" />
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                    currentStep >= 2 ? "bg-teal-600 text-white" : "bg-gray-200 text-gray-500"
                  )}>
                    2
                  </div>
                  <span className={cn(
                    "text-sm font-medium",
                    currentStep >= 2 ? "text-gray-900" : "text-gray-500"
                  )}>
                    Customer & Payment
                  </span>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {currentStep === 1 && renderServiceSelection()}
              {currentStep === 2 && renderCustomerSelection()}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t px-6 py-4">
              <div className="flex gap-3 justify-between">
                <div>
                  {currentStep === 2 && (
                    <Button
                      variant="outline"
                      onClick={() => setCurrentStep(currentStep - 1)}
                    >
                      Back
                    </Button>
                  )}
                </div>
                
                <div className="flex gap-3">
                  {currentStep === 1 && (
                    <Button
                      onClick={() => setCurrentStep(2)}
                      disabled={selectedServices.length === 0}
                      className="bg-teal-600 hover:bg-teal-700"
                    >
                      Next
                    </Button>
                  )}
                  
                  {currentStep === 2 && (
                    <Button
                      onClick={handleCreateOrder}
                      disabled={loading || (!selectedCustomer && !isWalkIn)}
                      className="bg-teal-600 hover:bg-teal-700"
                    >
                      {loading ? (
                        <>
                          <Spinner className="h-4 w-4 mr-2" />
                          Creating...
                        </>
                      ) : (
                        'Create Order & Pay'
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Dialog */}
      {order && (
        <PaymentDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          order={order}
          onPaymentComplete={handlePaymentComplete}
          enableTips={merchant?.settings?.enableTips || false}
        />
      )}
    </>
  );
};