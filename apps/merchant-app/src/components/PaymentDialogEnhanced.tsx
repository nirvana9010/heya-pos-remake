'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PaymentDialog } from './PaymentDialog';
import { apiClient } from '@/lib/api-client';
import { Skeleton } from '@heya-pos/ui';
import { WALK_IN_CUSTOMER_ID } from '@/lib/constants/customer';

interface PaymentDialogEnhancedProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order?: any;
  onPaymentComplete?: (order: any) => void;
  enableTips?: boolean;
  defaultTipPercentages?: number[];
  // For Quick Sale - create order on the fly
  selectedServices?: any[];
  customerId?: string;
  customer?: any; // Customer object for loyalty redemption
  draftOrderId?: string | null;
  isWalkIn?: boolean;
  itemAdjustments?: Record<number, number>;
  orderAdjustment?: { amount: number; reason: string };
  loyaltyDiscount?: { amount: number; description: string };
}

export function PaymentDialogEnhanced({
  open,
  onOpenChange,
  order: existingOrder,
  onPaymentComplete,
  enableTips = false,
  defaultTipPercentages = [10, 15, 20],
  selectedServices,
  customerId,
  customer,
  draftOrderId,
  isWalkIn = false,
  itemAdjustments = {},
  orderAdjustment = { amount: 0, reason: '' },
  loyaltyDiscount: initialLoyaltyDiscount = { amount: 0, description: '' },
}: PaymentDialogEnhancedProps) {
  const [order, setOrder] = useState(existingOrder);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cachedData, setCachedData] = useState<any>(null);
  const [usedDraftOrderId, setUsedDraftOrderId] = useState<string | null>(null);
  const [loyaltyDiscount, setLoyaltyDiscount] = useState(initialLoyaltyDiscount);

  const handleLoyaltyUpdate = useCallback((discount: { amount: number; description: string }) => {
    setLoyaltyDiscount(discount);
  }, []);

  // Update order when existingOrder prop changes
  useEffect(() => {
    if (existingOrder) {
      setOrder(existingOrder);
    }
  }, [existingOrder]);

  // Read from localStorage on mount
  useEffect(() => {
    if (open && !existingOrder) {
      const storedData = localStorage.getItem('quickSale');
      if (storedData) {
        try {
          const parsed = JSON.parse(storedData);
          // Check if data is not stale (5 minutes)
          if (parsed.timestamp && Date.now() - parsed.timestamp < 5 * 60 * 1000) {
            setCachedData(parsed);
          }
        } catch (e) {
          // Silently ignore parse errors
        }
      }
    }
  }, [open, existingOrder]);

  const createOrderFromServices = useCallback(async () => {
    setIsCreatingOrder(true);
    setError(null);

    try {
      // Prepare items with adjustments
      const items = selectedServices.map((service, index) => {
        const originalPrice = typeof service.price === 'object' && service.price.toNumber 
          ? service.price.toNumber() 
          : Number(service.price || 0);
        
        const originalTotal = originalPrice * service.quantity;
        const adjustedTotal = itemAdjustments[index] || originalTotal;
        const discount = originalTotal - adjustedTotal; // This can be positive (discount) or negative (surcharge)
        
        
        const baseItem: any = {
          itemType: 'SERVICE',
          itemId: service.id,
          description: service.name,
          unitPrice: originalPrice,
          quantity: service.quantity || 1,
          discount: discount,
          taxRate: 0
        };
        
        // Only include staffId if it's a valid UUID (not mock data)
        if (service.staffId && service.staffId.includes('-')) {
          baseItem.staffId = service.staffId;
        }

        return baseItem;
      });

      // Build request data
      const requestData: any = {
        items,
      };

      // If we have a draft order that hasn't been used yet, include it
      if (draftOrderId && draftOrderId !== usedDraftOrderId) {
        requestData.orderId = draftOrderId;
        setUsedDraftOrderId(draftOrderId); // Mark this draft order as used
      }
      
      // Always include customer information (for both draft and new orders)
      requestData.isWalkIn = isWalkIn;
      if (!isWalkIn && customerId) {
        requestData.customerId = customerId;
      }

      // Add order modifier if needed (prefer loyalty discount over manual adjustment)
      if (loyaltyDiscount && loyaltyDiscount.amount > 0) {
        requestData.orderModifier = {
          type: 'DISCOUNT',
          amount: loyaltyDiscount.amount,
          description: loyaltyDiscount.description || 'Loyalty Reward',
          subtype: 'LOYALTY'
        };
      } else if (orderAdjustment && orderAdjustment.amount !== 0) {
        requestData.orderModifier = {
          type: orderAdjustment.amount < 0 ? 'DISCOUNT' : 'SURCHARGE',
          amount: Math.abs(orderAdjustment.amount),
          description: orderAdjustment.reason || 
            `Order ${orderAdjustment.amount < 0 ? 'Discount' : 'Surcharge'}`
        };
      }

      // Single API call to prepare everything
      const paymentData = await apiClient.prepareOrderForPayment(requestData);
      
      setOrder({
        ...paymentData.order,
        items: paymentData.order?.items?.map((item: any) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice
        })),
        totalAmount: paymentData.order?.totalAmount,
        state: paymentData.order?.state
      });
      
      // Lock the order for payment if needed
      if (paymentData.order.state === 'DRAFT') {
        await apiClient.updateOrderState(paymentData.order.id, 'LOCKED');
        paymentData.order.state = 'LOCKED';
      }
      
      setOrder(paymentData.order);
      // Clear cached data since we now have real order
      setCachedData(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to prepare order');
    } finally {
      setIsCreatingOrder(false);
    }
  }, [selectedServices, draftOrderId, isWalkIn, customerId, itemAdjustments, orderAdjustment, loyaltyDiscount]);

  // Clear order state when modal closes or when services/adjustments change
  useEffect(() => {
    if (!open) {
      // Modal closed - clear everything to force fresh data on next open
      setOrder(null);
      setError(null);
      setCachedData(null);
      setIsCreatingOrder(false);
      setUsedDraftOrderId(null); // Reset so draft order can be reused if still valid
    }
  }, [open]);

  // Clear order when services or adjustments change (user made changes)
  useEffect(() => {
    // Only clear if we're in quick sale mode (have selectedServices)
    // Don't clear for existing orders from bookings
    if (order && open && selectedServices && !existingOrder) {
      // Services or adjustments changed while modal is open - clear order to force re-creation
      setOrder(null);
      setError(null);
    }
  }, [selectedServices, itemAdjustments, orderAdjustment, loyaltyDiscount, open, existingOrder]);

  // If we have selectedServices but no order, create order when dialog opens
  useEffect(() => {
    // Only create order from services if we don't have an existing order
    if (open && selectedServices && !order && !isCreatingOrder && !existingOrder) {
      createOrderFromServices();
    }
  }, [open, selectedServices, order, isCreatingOrder, createOrderFromServices, existingOrder]);

  // Show cached data immediately while creating order in background
  // But only if we don't have an existing order (from booking)
  if (open && (cachedData || isCreatingOrder) && !order && !existingOrder) {
    const displayData = cachedData || {
      services: selectedServices || [],
      totals: {
        total: selectedServices?.reduce((sum, s) => sum + (s.price * s.quantity), 0) || 0
      }
    };
    
    return (
      <PaymentDialog
        open={open}
        onOpenChange={onOpenChange}
        order={{
          isLoading: isCreatingOrder,
          isCached: true,
          totalAmount: displayData.totals?.total || displayData.totals?.subtotal || 0,
          items: displayData.services.map((s: any, index: number) => {
            // Use adjusted price if available
            const unitPrice = s.adjustedTotal && s.quantity ? 
              s.adjustedTotal / s.quantity : 
              s.price;
              
            return {
              id: s.id || `cached-${index}`,
              description: s.name,
              unitPrice: unitPrice,
              quantity: s.quantity,
              originalPrice: s.price,
              adjustedTotal: s.adjustedTotal,
              adjustment: s.adjustment
            };
          }),
          customer: displayData.customer,
          hasAdjustments: true // Flag to prevent further adjustments
        }}
        onPaymentComplete={onPaymentComplete}
        enableTips={enableTips}
        defaultTipPercentages={defaultTipPercentages}
        customer={customer}
        onLoyaltyUpdate={handleLoyaltyUpdate}
      />
    );
  }

  // Show error state
  if (open && error) {
    return (
      <PaymentDialog
        open={open}
        onOpenChange={onOpenChange}
        order={{
          error: error,
          totalAmount: 0,
          items: []
        }}
        onPaymentComplete={onPaymentComplete}
        enableTips={enableTips}
        defaultTipPercentages={defaultTipPercentages}
        customer={customer}
        onLoyaltyUpdate={handleLoyaltyUpdate}
      />
    );
  }

  // Show normal payment dialog once order is ready
  // If we started with cached data, the dialog is already open
  // This will update it with the real order data
  // IMPORTANT: Always render the dialog when open=true to prevent unmounting issues
  if (!open) {
    return null;
  }

  // Always render the dialog when open is true, even if order isn't ready yet
  // This prevents the race condition where the dialog unmounts/remounts
  
  return (
    <PaymentDialog
      open={open}
      onOpenChange={onOpenChange}
      order={order || (cachedData ? {
        isCached: true,
        totalAmount: cachedData?.totals?.total || cachedData?.totals?.subtotal || 0,
        items: cachedData?.services?.map((s: any, index: number) => {
          // Use adjusted price if available
          const unitPrice = s.adjustedTotal && s.quantity ? 
            s.adjustedTotal / s.quantity : 
            s.price;
            
          return {
            id: s.id || `cached-${index}`,
            description: s.name,
            unitPrice: unitPrice,
            quantity: s.quantity,
            originalPrice: s.price,
            adjustedTotal: s.adjustedTotal,
            adjustment: s.adjustment
          };
        }) || [],
        customer: cachedData?.customer,
        hasAdjustments: true // Flag to prevent further adjustments
      } : {
        // Show loading state while waiting for order
        isLoading: true,
        totalAmount: 0,
        items: []
      })}
      onPaymentComplete={onPaymentComplete}
      enableTips={enableTips}
      defaultTipPercentages={defaultTipPercentages}
      customer={customer}
      onLoyaltyUpdate={handleLoyaltyUpdate}
    />
  );
}