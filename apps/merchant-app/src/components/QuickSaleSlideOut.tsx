import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  X, Plus, Trash2, Search, Clock, DollarSign, 
  UserPlus, ChevronDown, ChevronUp, Users, CreditCard,
  Minus, Percent, User, Gift
} from 'lucide-react';
import { apiClient } from '../lib/api-client';
import type { Customer } from './customers';
import { Button, Input, Badge, Label, Spinner } from '@heya-pos/ui';
import { cn } from '@heya-pos/ui';
import { debounce } from 'lodash';
import { useAuth } from '../lib/auth/auth-provider';
import { PaymentDialogPortal } from './PaymentDialogPortal';
import { WALK_IN_CUSTOMER_ID, WALK_IN_CUSTOMER, isWalkInCustomer } from '../lib/constants/customer';
import { ServiceSelectionSlideout } from './ServiceSelectionSlideout';
import { CustomerSelectionSlideout } from './CustomerSelectionSlideout';
import { LoyaltyRedemption } from './LoyaltyRedemption';

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
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [isWalkIn, setIsWalkIn] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [draftOrderId, setDraftOrderId] = useState<string | null>(null);
  const [draftOrderTimeout, setDraftOrderTimeout] = useState<NodeJS.Timeout | null>(null);
  const [itemAdjustments, setItemAdjustments] = useState<Record<number, number>>({});
  const [orderAdjustment, setOrderAdjustment] = useState({ amount: 0, reason: '' });
  const [showOrderAdjustment, setShowOrderAdjustment] = useState(false);
  const [loyaltyDiscount, setLoyaltyDiscount] = useState({ amount: 0, description: '' });
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  // Helper function to clean up draft order
  const cleanupDraftOrder = useCallback(async () => {
    if (draftOrderTimeout) {
      clearTimeout(draftOrderTimeout);
      setDraftOrderTimeout(null);
    }
    
    if (draftOrderId) {
      try {
        // Delete the draft order
        await apiClient.updateOrderState(draftOrderId, 'CANCELLED');
      } catch (error) {
      }
      setDraftOrderId(null);
    }
  }, [draftOrderId, draftOrderTimeout]);

  // Create draft order when slideout opens
  const createDraftOrder = useCallback(async () => {
    try {
      const orderData = await apiClient.createOrder({
        customerId: WALK_IN_CUSTOMER_ID // Temporary, will be updated when customer selected
      });
      setDraftOrderId(orderData.id);
      
      // Set 5-minute timeout
      const timeout = setTimeout(() => {
        cleanupDraftOrder();
      }, 5 * 60 * 1000); // 5 minutes
      
      setDraftOrderTimeout(timeout);
    } catch (error) {
      // Continue without pre-created order
    }
  }, [cleanupDraftOrder]);

  // Reset when opening
  useEffect(() => {
    if (isOpen) {
      setSelectedServices([]);
      setSelectedCustomer(null);
      setOrder(null);
      setIsWalkIn(false);
      setPaymentDialogOpen(false);
      setItemAdjustments({});
      setOrderAdjustment({ amount: 0, reason: '' });
      setShowOrderAdjustment(false);
      setLoyaltyDiscount({ amount: 0, description: '' });
      
      // Clear any stale localStorage data
      localStorage.removeItem('quickSale');
      
      // Create draft order immediately
      createDraftOrder();
    } else {
      // Cleanup when closing
      cleanupDraftOrder();
      localStorage.removeItem('quickSale');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); // Only depend on isOpen to avoid infinite loops

  const handleAddService = (service: any) => {
    setSelectedServices([...selectedServices, {
      ...service,
      quantity: 1,
      staffId: staff[0]?.id // Default to first staff
    }]);
    setShowServiceModal(false);
  };

  const handleSelectCustomer = (customer: Customer | null, walkIn: boolean) => {
    setSelectedCustomer(customer);
    setIsWalkIn(walkIn);
    setShowCustomerModal(false);
    // Reset loyalty discount when customer changes
    setLoyaltyDiscount({ amount: 0, description: '' });
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

  const total = useMemo(() => {
    let subtotal = 0;
    selectedServices.forEach((service, index) => {
      // Convert price from Decimal object if needed
      const price = typeof service.price === 'object' && service.price.toNumber 
        ? service.price.toNumber() 
        : Number(service.price || 0);
      const originalPrice = price * service.quantity;
      const adjustedPrice = itemAdjustments[index] ?? originalPrice;
      subtotal += adjustedPrice;
    });
    
    // Add order-level adjustment if any
    if (showOrderAdjustment && orderAdjustment.amount !== 0) {
      subtotal += orderAdjustment.amount;
    }
    
    let total = subtotal;
    
    // Apply loyalty discount
    if (loyaltyDiscount.amount > 0) {
      // Check if it's a percentage discount based on the description (more reliable than amount)
      if (loyaltyDiscount.description.includes('%')) {
        // It's a percentage discount
        const discountAmount = subtotal * (loyaltyDiscount.amount / 100);
        total = subtotal - discountAmount;
      } else {
        // It's a dollar amount discount
        total = Math.max(0, subtotal - loyaltyDiscount.amount);
      }
    }
    
    return total;
  }, [selectedServices, itemAdjustments, showOrderAdjustment, orderAdjustment, loyaltyDiscount]);


  // Update localStorage whenever data changes
  const updateLocalStorage = useCallback(() => {
    const quickSaleData = {
      services: selectedServices.map((service, index) => {
        const originalPrice = service.price * service.quantity;
        const adjustedPrice = itemAdjustments[index] ?? originalPrice;
        
        return {
          id: service.id,
          name: service.name,
          price: typeof service.price === 'object' && service.price.toNumber 
            ? service.price.toNumber() 
            : Number(service.price || 0),
          quantity: service.quantity,
          staffId: service.staffId,
          categoryName: service.categoryName,
          originalTotal: originalPrice,
          adjustedTotal: adjustedPrice,
          adjustment: adjustedPrice - originalPrice
        };
      }),
      customer: isWalkIn ? WALK_IN_CUSTOMER : (selectedCustomer || null),
      totals: {
        subtotal: total,
        tax: 0, // Can be calculated based on merchant settings
        total: total
      },
      itemAdjustments: itemAdjustments,
      orderAdjustment: orderAdjustment,
      draftOrderId: draftOrderId,
      isWalkIn: isWalkIn,
      timestamp: Date.now()
    };
    
    localStorage.setItem('quickSale', JSON.stringify(quickSaleData));
  }, [selectedServices, selectedCustomer, draftOrderId, isWalkIn, itemAdjustments, orderAdjustment, total]);

  // Update localStorage whenever relevant data changes
  useEffect(() => {
    if (isOpen && selectedServices.length > 0) {
      updateLocalStorage();
    }
  }, [selectedServices, selectedCustomer, draftOrderId, isWalkIn, isOpen, updateLocalStorage]);

  const handleCreateOrder = async () => {
    if (!selectedServices.length) return;
    
    // Open payment dialog immediately - it will handle order creation
    setPaymentDialogOpen(true);
  };

  const handlePaymentComplete = async (updatedOrder: any) => {
    // Payment completed successfully
    setPaymentDialogOpen(false);
    
    // Clear the draft order since it's been used
    setDraftOrderId(null);
    if (draftOrderTimeout) {
      clearTimeout(draftOrderTimeout);
      setDraftOrderTimeout(null);
    }
    
    // Clear localStorage after successful payment
    localStorage.removeItem('quickSale');
    
    onSaleComplete();
    onClose();
    
    // Reset state
    setSelectedServices([]);
    setSelectedCustomer(null);
    setOrder(null);
    setIsWalkIn(false);
    setItemAdjustments({});
    setOrderAdjustment({ amount: 0, reason: '' });
    setShowOrderAdjustment(false);
    setLoyaltyDiscount({ amount: 0, description: '' });
  };

  const renderMainView = () => (
    <div className="space-y-6">
      {/* Customer Section */}
      <div>
        <Label className="text-sm font-medium text-gray-700 mb-2 block">Customer</Label>
        {selectedCustomer || isWalkIn ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center">
                {isWalkIn ? (
                  <UserPlus className="h-5 w-5 text-white" />
                ) : (
                  <User className="h-5 w-5 text-white" />
                )}
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {isWalkIn ? 'Walk-in Customer' : (
                    selectedCustomer?.name || 
                    `${selectedCustomer?.firstName || ''} ${selectedCustomer?.lastName || ''}`.trim()
                  )}
                </p>
                {!isWalkIn && selectedCustomer?.phone && (
                  <p className="text-sm text-gray-600">{selectedCustomer.phone}</p>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCustomerModal(true)}
            >
              Change
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => setShowCustomerModal(true)}
            variant="outline"
            className="w-full justify-start"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Select Customer
          </Button>
        )}
      </div>

      {/* Services Section */}
      <div>
        <Label className="text-sm font-medium text-gray-700 mb-2 block">
          Services {selectedServices.length > 0 && `(${selectedServices.length})`}
        </Label>
        
        {/* Selected services list */}
        {selectedServices.length === 0 ? (
          <Button
            onClick={() => setShowServiceModal(true)}
            className="w-full h-24 border-2 border-dashed border-gray-300 hover:border-teal-300 bg-gray-50 hover:bg-teal-50 text-gray-600 hover:text-teal-700"
            variant="ghost"
          >
            <Plus className="mr-2 h-5 w-5" />
            Add Service
          </Button>
        ) : (
          <div className="space-y-3">
          <div className="space-y-2">
            {selectedServices.map((service, index) => {
              const price = typeof service.price === 'object' && service.price.toNumber 
                ? service.price.toNumber() 
                : Number(service.price || 0);
              const originalPrice = price * service.quantity;
              const adjustedPrice = itemAdjustments[index] ?? originalPrice;
              const difference = adjustedPrice - originalPrice;
              
              return (
                <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                  {/* Service Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{service.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        ${price.toFixed(2)} × {service.quantity} = ${originalPrice.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="text-lg font-semibold text-gray-900">
                          ${adjustedPrice.toFixed(2)}
                        </div>
                        {difference !== 0 && (
                          <div className={cn(
                            "text-xs",
                            difference < 0 ? "text-green-600" : "text-red-600"
                          )}>
                            {difference < 0 ? '-' : '+'}${Math.abs(difference).toFixed(2)}
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveService(index)}
                        className="h-8 w-8 p-0 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Controls Row */}
                  <div className="flex items-center gap-2 pt-2 border-t">
                    {/* Quantity Controls */}
                    <div className="flex items-center gap-1 bg-gray-100 rounded-md p-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleQuantityChange(index, Math.max(1, service.quantity - 1))}
                        className="h-7 w-7 p-0"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm font-medium">{service.quantity}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleQuantityChange(index, service.quantity + 1)}
                        className="h-7 w-7 p-0"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    {/* Staff Selector */}
                    <select
                      value={service.staffId}
                      onChange={(e) => handleStaffChange(index, e.target.value)}
                      className="text-sm px-2 py-1.5 border rounded-md bg-white"
                    >
                      {staff.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    
                    {/* Price Adjustments */}
                    <div className="flex items-center gap-1 ml-auto">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setItemAdjustments(prev => ({
                            ...prev,
                            [index]: Math.max(0, (prev[index] || originalPrice) - 5)
                          }));
                        }}
                        className="h-7 px-2 text-xs"
                      >
                        -$5
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setItemAdjustments(prev => ({
                            ...prev,
                            [index]: Math.max(0, (prev[index] || originalPrice) - 1)
                          }));
                        }}
                        className="h-7 px-2 text-xs"
                      >
                        -$1
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setItemAdjustments(prev => ({
                            ...prev,
                            [index]: (prev[index] || originalPrice) + 1
                          }));
                        }}
                        className="h-7 px-2 text-xs"
                      >
                        +$1
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setItemAdjustments(prev => ({
                            ...prev,
                            [index]: (prev[index] || originalPrice) + 5
                          }));
                        }}
                        className="h-7 px-2 text-xs"
                      >
                        +$5
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Add More Services Button */}
          <Button
            onClick={() => setShowServiceModal(true)}
            variant="outline"
            className="w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Service
          </Button>
          </div>
        )}
      </div>

      {/* Loyalty Redemption */}
      {selectedCustomer && !isWalkIn && (
        <div className="space-y-3">
          <LoyaltyRedemption
            customer={selectedCustomer}
            onRedemption={(amount, description) => {
              setLoyaltyDiscount({ amount, description });
            }}
            currentDiscount={loyaltyDiscount.amount}
          />
          
          {/* Show applied discount with undo option */}
          {loyaltyDiscount.amount > 0 && (() => {
            const subtotal = selectedServices.reduce((total, service, index) => {
              const price = typeof service.price === 'object' && service.price.toNumber 
                ? service.price.toNumber() 
                : Number(service.price || 0);
              const originalPrice = price * service.quantity;
              const adjustedPrice = itemAdjustments[index] ?? originalPrice;
              return total + adjustedPrice;
            }, 0) + (showOrderAdjustment && orderAdjustment.amount !== 0 ? orderAdjustment.amount : 0);
            
            const discountAmount = loyaltyDiscount.description.includes('%') 
              ? subtotal * (loyaltyDiscount.amount / 100)
              : loyaltyDiscount.amount;
            
            return (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-900">
                      Loyalty Discount Applied
                    </p>
                    <p className="text-xs text-green-700">
                      {loyaltyDiscount.description} - 
                      {loyaltyDiscount.description.includes('%') 
                        ? ` Saving $${discountAmount.toFixed(2)}` 
                        : ` $${loyaltyDiscount.amount.toFixed(2)} off`}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setLoyaltyDiscount({ amount: 0, description: '' })}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Remove
                </Button>
              </div>
            );
          })()}
        </div>
      )}

      {/* Order Adjustments */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm font-medium text-gray-700">Order Adjustment</Label>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowOrderAdjustment(!showOrderAdjustment)}
            className="h-8 px-2"
          >
            {showOrderAdjustment ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>
        
        {showOrderAdjustment && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="order-adjustment-amount" className="text-sm text-gray-600 w-16">
                Amount:
              </Label>
              <div className="flex items-center gap-1 flex-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setOrderAdjustment(prev => ({ ...prev, amount: prev.amount - 5 }))}
                  className="h-7 px-2 text-xs"
                >
                  -$5
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setOrderAdjustment(prev => ({ ...prev, amount: prev.amount - 1 }))}
                  className="h-7 px-2 text-xs"
                >
                  -$1
                </Button>
                <div className="flex-1 flex items-center">
                  <span className="text-sm mr-1">$</span>
                  <Input
                    id="order-adjustment-amount"
                    type="number"
                    step="0.01"
                    value={orderAdjustment.amount || ''}
                    onChange={(e) => {
                      const amount = parseFloat(e.target.value) || 0;
                      setOrderAdjustment(prev => ({ ...prev, amount }));
                    }}
                    placeholder="0.00"
                    className="h-8 text-sm"
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setOrderAdjustment(prev => ({ ...prev, amount: prev.amount + 1 }))}
                  className="h-7 px-2 text-xs"
                >
                  +$1
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setOrderAdjustment(prev => ({ ...prev, amount: prev.amount + 5 }))}
                  className="h-7 px-2 text-xs"
                >
                  +$5
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="order-adjustment-reason" className="text-sm text-gray-600 w-16">
                Reason:
              </Label>
              <Input
                id="order-adjustment-reason"
                type="text"
                value={orderAdjustment.reason}
                onChange={(e) => setOrderAdjustment(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="e.g., Loyalty discount, First-time customer..."
                className="h-8 text-sm flex-1"
              />
            </div>
            {orderAdjustment.amount !== 0 && (
              <div className={cn(
                "text-sm text-center",
                orderAdjustment.amount < 0 ? "text-green-600" : "text-red-600"
              )}>
                {orderAdjustment.amount < 0 ? 'Discount' : 'Surcharge'}: ${Math.abs(orderAdjustment.amount).toFixed(2)}
              </div>
            )}
          </div>
        )}
      </div>
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
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {renderMainView()}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t px-6 py-4">
              <div className="space-y-3">
                {/* Subtotal if discount applied */}
                {loyaltyDiscount.amount > 0 && (() => {
                  const subtotal = selectedServices.reduce((total, service, index) => {
                    const price = typeof service.price === 'object' && service.price.toNumber 
                      ? service.price.toNumber() 
                      : Number(service.price || 0);
                    const originalPrice = price * service.quantity;
                    const adjustedPrice = itemAdjustments[index] ?? originalPrice;
                    return total + adjustedPrice;
                  }, 0) + (showOrderAdjustment && orderAdjustment.amount !== 0 ? orderAdjustment.amount : 0);
                  
                  const discountAmount = loyaltyDiscount.description.includes('%') 
                    ? subtotal * (loyaltyDiscount.amount / 100)
                    : loyaltyDiscount.amount;
                  
                  return (
                    <>
                      <div className="flex justify-between items-center text-sm text-gray-600">
                        <span>Subtotal</span>
                        <span>${subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm text-green-600">
                        <span className="flex items-center gap-1">
                          <Gift className="h-3 w-3" />
                          Loyalty Discount
                        </span>
                        <span>
                          -{loyaltyDiscount.description.includes('%') 
                            ? `$${discountAmount.toFixed(2)} (${loyaltyDiscount.amount}%)` 
                            : `$${loyaltyDiscount.amount.toFixed(2)}`}
                        </span>
                      </div>
                      <div className="border-t pt-2" />
                    </>
                  );
                })()}
                
                {/* Total */}
                <div className="flex justify-between items-center text-lg" key={`total-${loyaltyDiscount.amount}`}>
                  <span className="font-semibold">Total</span>
                  <span className="font-bold">${total.toFixed(2)}</span>
                </div>
                
                {/* Action Button */}
                <Button
                  onClick={handleCreateOrder}
                  disabled={loading || selectedServices.length === 0 || (!selectedCustomer && !isWalkIn)}
                  className="w-full bg-teal-600 hover:bg-teal-700"
                  size="lg"
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
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Dialog - Using Portal to prevent parent re-renders */}
      <PaymentDialogPortal
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        order={order}
        selectedServices={selectedServices}
        customerId={selectedCustomer?.id}
        draftOrderId={draftOrderId}
        isWalkIn={isWalkIn}
        onPaymentComplete={handlePaymentComplete}
        enableTips={merchant?.settings?.enableTips || false}
        itemAdjustments={itemAdjustments}
        orderAdjustment={orderAdjustment}
        loyaltyDiscount={loyaltyDiscount}
      />

      {/* Service Selection Slideout */}
      <ServiceSelectionSlideout
        isOpen={showServiceModal}
        onClose={() => setShowServiceModal(false)}
        services={services}
        onSelectService={handleAddService}
      />

      {/* Customer Selection Slideout */}
      <CustomerSelectionSlideout
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        onSelectCustomer={handleSelectCustomer}
        currentCustomer={selectedCustomer}
        isCurrentWalkIn={isWalkIn}
      />
    </>
  );
};