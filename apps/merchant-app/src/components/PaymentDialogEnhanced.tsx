'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PaymentDialog } from './PaymentDialog';
import { apiClient } from '@/lib/api-client';
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
  isWalkIn = false,
  itemAdjustments = {},
  orderAdjustment = { amount: 0, reason: '' },
  loyaltyDiscount: initialLoyaltyDiscount = { amount: 0, description: '' },
}: PaymentDialogEnhancedProps) {
  const [order, setOrder] = useState(existingOrder);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loyaltyDiscount, setLoyaltyDiscount] = useState(initialLoyaltyDiscount);

  // Callback to refresh order
  const handleOrderUpdate = useCallback((updatedOrder: any) => {
    setOrder(updatedOrder);
  }, []);

  const handleLoyaltyUpdate = useCallback((discount: { amount: number; description: string }) => {
    setLoyaltyDiscount(discount);
  }, []);

  // Update order when existingOrder prop changes or dialog opens
  useEffect(() => {
    if (open && existingOrder) {
      setOrder(existingOrder);
    }
  }, [existingOrder, open]);

  const createOrderFromServices = useCallback(async () => {
    setIsCreatingOrder(true);
    setError(null);

    try {
      // Prepare items with adjustments
      const items = (selectedServices || []).map((service, index) => {
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

      // Always include customer information
      requestData.isWalkIn = isWalkIn;
      if (!isWalkIn && customerId) {
        requestData.customerId = customerId;
      }

      // Add order modifier if needed (prefer loyalty discount over manual adjustment)
      if (loyaltyDiscount && loyaltyDiscount.amount > 0) {
        requestData.orderModifier = {
          type: 'DISCOUNT',
          amount: loyaltyDiscount.amount,
          description: loyaltyDiscount.description || 'Loyalty Reward'
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
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to prepare order');
    } finally {
      setIsCreatingOrder(false);
    }
  }, [selectedServices, isWalkIn, customerId, itemAdjustments, orderAdjustment, loyaltyDiscount]);

  // Clear order state when modal closes
  useEffect(() => {
    if (!open) {
      // Modal closed - clear everything to force fresh data on next open
      setOrder(null);
      setError(null);
      setIsCreatingOrder(false);
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

  // Don't render if dialog is not open
  if (!open) {
    return null;
  }

  // Show loading state while creating order
  if (isCreatingOrder && !order) {
    return (
      <PaymentDialog
        open={open}
        onOpenChange={onOpenChange}
        order={{
          isLoading: true,
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

  // Render payment dialog with order data
  return (
    <PaymentDialog
      open={open}
      onOpenChange={onOpenChange}
      order={order}
      onPaymentComplete={onPaymentComplete}
      enableTips={enableTips}
      defaultTipPercentages={defaultTipPercentages}
      customer={customer || order?.customer || existingOrder?.customer}
      onLoyaltyUpdate={handleLoyaltyUpdate}
      onOrderUpdate={handleOrderUpdate}
    />
  );
}