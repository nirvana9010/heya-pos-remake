'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@heya-pos/ui';
import {
  Button,
  Label,
  Input,
  RadioGroup,
  RadioGroupItem,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Switch,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from '@heya-pos/ui';
import {
  PaymentMethod,
  OrderState,
  OrderModifierType,
  OrderModifierCalculation,
} from '@heya-pos/types';
import { CreditCard, DollarSign, Percent, Plus, Minus, X, ChevronUp, ChevronDown, Loader2, Edit3 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useToast, cn } from '@heya-pos/ui';
import { LoyaltyRedemption } from './LoyaltyRedemption';
import { useAuth } from '@/lib/auth/auth-provider';
import { isWalkInCustomer } from '@/lib/constants/customer';
import { useTyro } from '@/hooks/useTyro';
import { TyroTransactionResult } from '@/types/tyro';

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any; // Order with items, modifiers, and payments
  onPaymentComplete?: (order: any) => void;
  enableTips?: boolean;
  defaultTipPercentages?: number[];
  customer?: any; // Customer data for loyalty redemption
  onLoyaltyUpdate?: (discount: { amount: number; description: string }) => void;
  onOrderUpdate?: (order: any) => void; // Callback for order updates
}

export function PaymentDialog({
  open,
  onOpenChange,
  order,
  onPaymentComplete,
  enableTips = false,
  defaultTipPercentages = [10, 15, 20],
  customer,
  onLoyaltyUpdate,
  onOrderUpdate,
}: PaymentDialogProps) {
  const { toast } = useToast();
  const { merchant } = useAuth();
  const { purchase, isAvailable, isPaired } = useTyro();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [cashReceived, setCashReceived] = useState('');
  const [processing, setProcessing] = useState(false);
  const [selectedTipPercentage, setSelectedTipPercentage] = useState<number | null>(null);
  const [customTipAmount, setCustomTipAmount] = useState('');
  const [splitPayments, setSplitPayments] = useState<Array<{
    method: PaymentMethod;
    amount: string;
    tipAmount?: string;
  }>>([]);
  const [isSplitPayment, setIsSplitPayment] = useState(false);
  const [loyaltyDiscount, setLoyaltyDiscount] = useState({ amount: 0, description: '' });
  const [showOrderAdjustment, setShowOrderAdjustment] = useState(false);
  const [orderAdjustment, setOrderAdjustment] = useState({ amount: 0, reason: '', isPercentage: false });
  
  // Check if Tyro is enabled
  const isTyroEnabled = merchant?.settings?.tyroEnabled === true;
  
  // Reset adjustment state when dialog opens
  useEffect(() => {
    if (open) {
      setOrderAdjustment({ amount: 0, reason: '', isPercentage: false });
      setShowOrderAdjustment(false);
      console.log('[PaymentDialog] Dialog opened, order state:', {
        id: order?.id,
        state: order?.state,
        totalAmount: order?.totalAmount,
        modifiers: order?.modifiers?.length || 0,
        paidAmount: order?.paidAmount
      });
    }
  }, [open]);

  const handleLoyaltyRedemption = useCallback((amount: number, description: string) => {
    setLoyaltyDiscount({ amount, description });
    onLoyaltyUpdate?.({ amount, description });
  }, [onLoyaltyUpdate]);

  const handleRemoveLoyaltyDiscount = useCallback(() => {
    setLoyaltyDiscount({ amount: 0, description: '' });
    onLoyaltyUpdate?.({ amount: 0, description: '' });
  }, [onLoyaltyUpdate]);

  // Calculate the adjustment dollar amount
  const calculateAdjustmentAmount = () => {
    if (orderAdjustment.amount === 0) return 0;
    
    const subtotal = order?.subtotal || order?.totalAmount || 0;
    return orderAdjustment.isPercentage 
      ? (subtotal * orderAdjustment.amount) / 100
      : orderAdjustment.amount;
  };


  // Calculate balance due including loyalty discount and manual adjustments
  const calculateBalanceDue = () => {
    // The order's totalAmount already includes any applied modifiers
    const baseTotal = order?.totalAmount || 0;
    const paidAmount = order?.paidAmount || 0;
    
    // Apply manual adjustment
    const adjustmentAmount = calculateAdjustmentAmount();
    const totalWithAdjustment = baseTotal + adjustmentAmount;
    
    // If we have a loyalty discount that hasn't been applied to the order yet, subtract it
    const totalWithLoyalty = loyaltyDiscount.amount > 0 ? totalWithAdjustment - loyaltyDiscount.amount : totalWithAdjustment;
    
    return totalWithLoyalty - paidAmount;
  };
  
  const balanceDue = calculateBalanceDue();
  const tipAmount = useMemo(() => {
    if (!enableTips) return 0;
    
    if (customTipAmount) {
      return parseFloat(customTipAmount) || 0;
    }
    
    if (selectedTipPercentage) {
      // Calculate tip based on balance due (after loyalty discount)
      return (balanceDue * selectedTipPercentage) / 100;
    }
    
    return 0;
  }, [enableTips, customTipAmount, selectedTipPercentage, balanceDue]);

  const totalWithTip = enableTips ? balanceDue + tipAmount : balanceDue;
  const changeAmount = cashReceived ? parseFloat(cashReceived) - totalWithTip : 0;

  const handlePayment = async () => {
    // Don't process payment if we're still loading the real order
    if (order?.isCached && !order?.id) {
      toast({
        title: 'Please wait',
        description: 'Order is still being created. Please try again in a moment.',
      });
      return;
    }

    if (balanceDue <= 0) {
      toast({
        title: 'No payment needed',
        description: 'This order is already paid in full.',
        variant: 'destructive',
      });
      return;
    }

    setProcessing(true);

    // Handle Tyro card payments
    if (paymentMethod === PaymentMethod.CARD && isTyroEnabled && merchant?.settings?.tyroTerminalId) {
      // Check if Tyro is available
      if (!isAvailable()) {
        toast({
          title: 'Tyro not available',
          description: 'Tyro SDK is not loaded. Please refresh the page and try again.',
          variant: 'destructive',
        });
        setProcessing(false);
        return;
      }

      if (!isPaired()) {
        toast({
          title: 'Terminal not paired',
          description: 'Please pair your terminal in Settings first.',
          variant: 'destructive',
        });
        setProcessing(false);
        return;
      }

      // Close dialog to avoid z-index conflicts with Tyro UI
      onOpenChange(false);
      
      // Process Tyro payment
      try {
        purchase(totalWithTip, {
          transactionCompleteCallback: async (response) => {
            if (response.result === TyroTransactionResult.APPROVED) {
              // Payment was successful
              toast({
                title: 'Payment successful',
                description: 'Card payment processed',
              });

              // Update order optimistically
              const optimisticOrder = {
                ...order,
                paidAmount: (order?.paidAmount || 0) + totalWithTip,
                totalAmount: (order?.totalAmount || 0) + tipAmount,
                balanceDue: 0,
              };
              
              onPaymentComplete?.(optimisticOrder);
              // Dialog already closed before Tyro payment

              // Record payment in background
              try {
                const paymentData = {
                  orderId: order.id,
                  amount: balanceDue,
                  method: PaymentMethod.CARD,
                  tipAmount: enableTips ? tipAmount : 0,
                  reference: response.transactionReference,
                  metadata: {
                    tyroTransactionId: response.transactionReference,
                    tyroAuthorisationCode: response.authorisationCode,
                    tyroTerminalId: merchant?.settings?.tyroTerminalId,
                  }
                };
                
                await apiClient.processPayment(paymentData);
                
                // Handle loyalty redemption
                if (loyaltyDiscount.amount > 0 && customer && !isWalkInCustomer(customer.id)) {
                  try {
                    const isPercentage = loyaltyDiscount.description.includes('%');
                    
                    if (isPercentage || loyaltyDiscount.description.includes('Free Service')) {
                      await apiClient.loyalty.redeemVisit(customer.id, order.id);
                    } else {
                      const pointsMatch = loyaltyDiscount.description.match(/\((\d+) points\)/);
                      if (pointsMatch) {
                        const points = parseInt(pointsMatch[1]);
                        await apiClient.loyalty.redeemPoints(customer.id, points, order.id);
                      }
                    }
                  } catch (error) {
                    console.error('Failed to redeem loyalty after Tyro payment:', error);
                  }
                }
                
                // Refresh order
                const finalOrder = await apiClient.getOrder(order.id);
                onPaymentComplete?.(finalOrder);
              } catch (error) {
                console.error('[Tyro] Failed to record payment:', error);
              }
            } else {
              // Payment failed or cancelled
              if (response.result === TyroTransactionResult.CANCELLED) {
                // User cancelled - reopen the dialog
                onOpenChange(true);
                toast({
                  title: 'Payment cancelled',
                  description: 'Transaction was cancelled',
                });
              } else {
                // Actual payment failure - reopen dialog
                onOpenChange(true);
                const errorMessage = response.result === TyroTransactionResult.DECLINED 
                  ? 'Payment was declined'
                  : 'Payment failed';
                  
                toast({
                  title: 'Payment failed',
                  description: errorMessage,
                  variant: 'destructive',
                });
              }
            }
            
            setProcessing(false);
          },
          receiptCallback: (receipt) => {
            // Tyro receipt received
          }
        });
        
        return; // Exit early for Tyro payments
      } catch (error) {
        // Failed to initiate Tyro payment
        // Reopen dialog on error
        onOpenChange(true);
        toast({
          title: 'Payment failed',
          description: 'Failed to communicate with payment terminal',
          variant: 'destructive',
        });
        setProcessing(false);
        return;
      }
    }

    // For cash payments (or when Tyro is disabled), we'll still validate with the API
    const isOptimisticPayment = paymentMethod === PaymentMethod.CASH || 
                               (paymentMethod === PaymentMethod.CARD && !isTyroEnabled);

    try {
      // Ensure order is locked before processing payment
      if (order?.state === 'DRAFT' && !orderAdjustment.amount) {
        console.log('[PaymentDialog] Locking order before payment (no adjustments)');
        order = await apiClient.updateOrderState(order.id, 'LOCKED');
        onOrderUpdate?.(order);
      }
      
      // Apply order adjustment if needed (only if not already applied)
      const adjustmentAmount = calculateAdjustmentAmount();
      const hasAdjustmentAlreadyApplied = order?.modifiers?.some((mod: any) => 
        mod.description === orderAdjustment.reason || 
        mod.description?.includes(`${Math.abs(orderAdjustment.amount)}%`)
      );
      
      if (adjustmentAmount !== 0 && order?.id && !hasAdjustmentAlreadyApplied) {
        try {
          console.log('[PaymentDialog] Applying order adjustment:', {
            orderId: order.id,
            orderState: order.state,
            adjustmentAmount,
            isPercentage: orderAdjustment.isPercentage,
            reason: orderAdjustment.reason,
            currentModifiers: order.modifiers
          });
          
          // Check if order is in a state that allows modifications
          if (order.state !== 'DRAFT' && order.state !== 'LOCKED') {
            console.warn('[PaymentDialog] Order is in state', order.state, '- may not accept modifiers');
          }
          
          const modifier = {
            type: adjustmentAmount < 0 ? 'DISCOUNT' : 'SURCHARGE',
            calculation: 'FIXED_AMOUNT' as const,  // The API expects this field
            value: Math.abs(adjustmentAmount),     // Changed from 'amount' to 'value'
            description: orderAdjustment.reason || 
              (orderAdjustment.isPercentage 
                ? `${Math.abs(orderAdjustment.amount)}% ${adjustmentAmount < 0 ? 'Discount' : 'Surcharge'}`
                : `Order ${adjustmentAmount < 0 ? 'Discount' : 'Surcharge'}`)
          };
          
          console.log('[PaymentDialog] Sending modifier to API:', modifier);
          
          // Apply the modifier to the order
          const updatedOrder = await apiClient.addOrderModifier(order.id, modifier);
          console.log('[PaymentDialog] Order modifier applied successfully:', {
            orderId: updatedOrder.id,
            originalTotal: order.totalAmount,
            newTotal: updatedOrder.totalAmount,
            modifiers: updatedOrder.modifiers,
            items: updatedOrder.items?.map((item: any) => ({
              description: item.description,
              unitPrice: item.unitPrice,
              discount: item.discount
            }))
          });
          
          // Update the local order state with the modified order
          order = updatedOrder;
          
          // Clear the manual adjustment since it's now been applied as a modifier
          setOrderAdjustment({ amount: 0, isPercentage: false, reason: '' });
          
          // Also update the order state in the parent component if callback exists
          onOrderUpdate?.(updatedOrder);
          
          // Now lock the order after modifier is applied
          if (updatedOrder.state === 'DRAFT') {
            console.log('[PaymentDialog] Locking order after applying modifier');
            const lockedOrder = await apiClient.updateOrderState(updatedOrder.id, 'LOCKED');
            order = lockedOrder;
            onOrderUpdate?.(lockedOrder);
          }
        } catch (modifierError: any) {
          // Log the actual error details
          const errorDetails = {
            message: modifierError?.message || modifierError?.response?.data?.message || 'Unknown error',
            status: modifierError?.status || modifierError?.response?.status,
            code: modifierError?.code || modifierError?.response?.data?.code,
            response: modifierError?.response?.data,
            stack: modifierError?.stack,
            modifier: modifier,
            orderId: order.id,
            orderState: order.state
          };
          
          console.error('[PaymentDialog] Failed to apply order modifier:', errorDetails);
          
          // Show user-friendly error
          toast({
            title: "Unable to apply adjustment",
            description: modifierError?.message || "The discount/surcharge could not be applied. Please try again.",
            variant: "destructive",
          });
          
          // Don't continue with payment if modifier fails
          setProcessing(false);
          return;
        }
      }
      
      let result;

      if (isSplitPayment) {
        // Process split payments
        const payments = splitPayments.map(sp => ({
          method: sp.method,
          amount: parseFloat(sp.amount) || 0,
          tipAmount: parseFloat(sp.tipAmount || '0'),
        }));

        result = await apiClient.processSplitPayment({
          orderId: order.id,
          payments,
        });
      } else {
        // Process single payment
        // Use the original balance due from the order, not the client-side adjusted one
        const serverBalanceDue = (order?.totalAmount || 0) - (order?.paidAmount || 0);
        const paymentData: any = {
          orderId: order.id,
          amount: serverBalanceDue, // Use server's balance, not client-adjusted
          method: paymentMethod,
          tipAmount: enableTips ? tipAmount : 0,
          metadata: paymentMethod === PaymentMethod.CASH ? {
            cashReceived: parseFloat(cashReceived) || totalWithTip,
            clientAdjustment: calculateAdjustmentAmount(), // Track adjustment for logging
          } : undefined,
        };
        
        // Log payment details for debugging
        console.log('Processing payment with:', {
          orderId: order.id,
          serverAmount: serverBalanceDue,
          clientAmount: balanceDue,
          adjustmentAmount: calculateAdjustmentAmount(),
          loyaltyDiscount: loyaltyDiscount,
          customer: customer,
          orderTotal: order?.totalAmount,
          paidAmount: order?.paidAmount
        });

        if (paymentMethod === PaymentMethod.CARD) {
          // For non-Tyro card payments (when Tyro is disabled)
          // This would integrate with other payment terminals
          paymentData.reference = `CARD_${Date.now()}`;
        }

        result = await apiClient.processPayment(paymentData);
      }

      // Payment was successful - now we can update the UI
      // The order already has the adjustment applied if there was one
      const successOrder = {
        ...order,
        bookingId: order?.bookingId, // Ensure bookingId is preserved
        paidAmount: (order?.totalAmount || 0) + tipAmount, // Full payment of order total
        totalAmount: (order?.totalAmount || 0) + tipAmount, // Order total already includes adjustment
        balanceDue: 0,
      };

      console.log('[PaymentDialog] Payment successful, calling onPaymentComplete:', {
        id: successOrder.id,
        totalAmount: successOrder.totalAmount,
        paidAmount: successOrder.paidAmount,
        adjustmentAmount: calculateAdjustmentAmount(),
        originalTotal: order?.totalAmount
      });

      // Show success toast
      toast({
        title: 'Payment successful',
        description: changeAmount > 0 ? `Change: $${changeAmount.toFixed(2)}` : undefined,
      });

      // Call onPaymentComplete with the successful order BEFORE closing
      onPaymentComplete?.(successOrder);

      // Close dialog with a small delay to ensure state updates propagate
      setTimeout(() => {
        onOpenChange(false);
      }, 100);

      // Refresh order data in the background
      const finalOrder = await apiClient.getOrder(order.id);
      
      // Handle loyalty redemption after successful payment
      if (loyaltyDiscount.amount > 0) {
        if (!customer || !customer.id) {
          console.error('Loyalty redemption failed: Customer data is missing', {
            customer,
            loyaltyDiscount,
            orderId: order.id
          });
          toast({
            title: 'Loyalty redemption failed',
            description: 'Customer information is missing. Payment was successful but loyalty discount was not applied.',
            variant: 'warning',
          });
        } else if (isWalkInCustomer(customer.id) || customer.source === 'WALK_IN') {
          console.error('Loyalty redemption failed: Walk-in customers cannot use loyalty', {
            customer,
            loyaltyDiscount,
            orderId: order.id
          });
          toast({
            title: 'Loyalty not available',
            description: 'Walk-in customers cannot use loyalty rewards.',
            variant: 'warning',
          });
        } else {
          try {
            const isPercentage = loyaltyDiscount.description.includes('%');
            
            if (isPercentage || loyaltyDiscount.description.includes('Free Service')) {
              // Visit-based redemption
              await apiClient.loyalty.redeemVisit(customer.id, order.id);
            } else {
              // Points-based redemption - extract points from description
              const pointsMatch = loyaltyDiscount.description.match(/\((\d+) points\)/);
              if (pointsMatch) {
                const points = parseInt(pointsMatch[1]);
                await apiClient.loyalty.redeemPoints(customer.id, points, order.id);
              }
            }
          } catch (error: any) {
            console.error('Failed to redeem loyalty after payment:', {
              message: error?.message || 'Unknown error',
              status: error?.status,
              code: error?.code,
              details: error?.data,
              fullError: error
            });
            
            // Show user-friendly error message
            const errorMessage = error?.message || 'Failed to redeem loyalty reward';
            toast({
              title: 'Loyalty Redemption Failed',
              description: `Payment was successful, but the loyalty reward could not be applied: ${errorMessage}. The customer keeps their loyalty benefit for next time.`,
              variant: 'destructive',
            });
            
            // Payment already succeeded, so we don't fail the whole operation
            // The customer keeps their loyalty benefit for next time
          }
        }
      }
      
      // Only update if not already closed by optimistic update
      if (!isOptimisticPayment) {
        onPaymentComplete?.(finalOrder);
        onOpenChange(false);
      }

    } catch (error: any) {
      console.error('Payment processing error:', error);
      
      // Check if this is a state transition error
      const errorMessage = error.response?.data?.message || error.message;
      const isStateError = errorMessage.includes('not ready for payment') || 
                          errorMessage.includes('Invalid state transition');
      
      // If optimistic update failed, show error and revert
      if (isOptimisticPayment) {
        // Dialog is already closed, show error toast
        toast({
          title: isStateError ? 'Order state error' : 'Payment failed',
          description: isStateError 
            ? 'The order state has changed. Please refresh and try again.'
            : errorMessage,
          variant: 'destructive',
        });
        
        // Reload the order to get the correct state
        if (isStateError && order?.id) {
          try {
            const refreshedOrder = await apiClient.getOrder(order.id);
            onPaymentComplete?.(refreshedOrder);
          } catch (refreshError) {
            console.error('Failed to refresh order:', refreshError);
          }
        }
      } else {
        toast({
          title: isStateError ? 'Order state error' : 'Payment failed',
          description: isStateError 
            ? 'The order state has changed. Please refresh and try again.'
            : errorMessage,
          variant: 'destructive',
        });
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleAddSplitPayment = () => {
    setSplitPayments([...splitPayments, {
      method: PaymentMethod.CASH,
      amount: '',
    }]);
  };

  const handleRemoveSplitPayment = (index: number) => {
    setSplitPayments(splitPayments.filter((_, i) => i !== index));
  };

  const updateSplitPayment = (index: number, field: string, value: any) => {
    const updated = [...splitPayments];
    updated[index] = { ...updated[index], [field]: value };
    setSplitPayments(updated);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Process Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Error State */}
          {order?.error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{order.error}</p>
            </div>
          ) : null}
          
          {/* Order Items */}
          {!order || (order.isLoading && !order.isCached) ? (
            <div className="space-y-2">
              <h3 className="font-medium text-sm text-gray-700">Order Items</h3>
              <div className="space-y-2">
                {/* Show skeleton for 2 items */}
                {[1, 2].map((i) => (
                  <div key={i} className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <Skeleton className="h-4 w-32 mb-1" />
                        <Skeleton className="h-3 w-12" />
                      </div>
                      <div className="text-right">
                        <Skeleton className="h-4 w-16" />
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((j) => (
                        <Skeleton key={j} className="h-7 w-10" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : order?.items && order.items.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm text-gray-700">Order Items</h3>
                {order.isCached && order.isLoading && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Creating order...
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {order.items.map((item: any, index: number) => {
                  const basePrice = item.unitPrice * item.quantity;
                  const adjustment = item.discount || 0;
                  const finalPrice = item.total || (basePrice - adjustment);
                  const hasAdjustment = adjustment !== 0;
                  const isDiscount = adjustment > 0;
                  const isSurcharge = adjustment < 0;

                  return (
                    <div key={item.id || `item-${index}`} className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <span className="text-sm font-medium">{item.description || item.name}</span>
                          <span className="text-sm text-gray-500 ml-2">x{item.quantity}</span>
                          <div className="text-xs text-gray-500 mt-1">
                            ${item.unitPrice.toFixed(2)} each
                            {hasAdjustment && (
                              <span className={`ml-2 ${isDiscount ? 'text-green-600' : 'text-red-600'}`}>
                                ({isDiscount ? '-' : '+'}${Math.abs(adjustment).toFixed(2)} {isDiscount ? 'discount' : 'surcharge'})
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          {hasAdjustment ? (
                            <div>
                              <div className="text-xs text-gray-400 line-through">
                                ${basePrice.toFixed(2)}
                              </div>
                              <div className={`text-sm font-medium ${isDiscount ? 'text-green-600' : 'text-red-600'}`}>
                                ${finalPrice.toFixed(2)}
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm font-medium">
                              ${finalPrice.toFixed(2)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Loyalty Redemption */}
          {customer && order && !order.isLoading && (
            <LoyaltyRedemption
              customer={customer}
              totalPrice={order?.subtotal || order?.totalAmount || 0}
              onRedemption={handleLoyaltyRedemption}
              onRemoveDiscount={loyaltyDiscount.amount > 0 ? handleRemoveLoyaltyDiscount : undefined}
              currentDiscount={loyaltyDiscount.amount}
            />
          )}

          {/* Order Adjustments */}
          {order && !order.isLoading && !order.error && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-gray-700">Order Adjustment</Label>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowOrderAdjustment(!showOrderAdjustment)}
                  className="h-8 px-2"
                >
                  {showOrderAdjustment ? <Minus className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
                </Button>
              </div>
              
              {showOrderAdjustment && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                  {/* Type Toggle */}
                  <div className="flex items-center gap-2 mb-3">
                    <Label className="text-sm text-gray-600">Type:</Label>
                    <div className="flex bg-gray-100 rounded-md p-1">
                      <Button
                        size="sm"
                        variant={orderAdjustment.isPercentage ? "ghost" : "default"}
                        onClick={() => setOrderAdjustment(prev => ({ ...prev, isPercentage: false }))}
                        className={cn(
                          "h-7 px-3 text-xs transition-colors",
                          !orderAdjustment.isPercentage 
                            ? "bg-white shadow-sm text-gray-900" 
                            : "text-gray-600 hover:text-gray-900"
                        )}
                      >
                        $ Dollar
                      </Button>
                      <Button
                        size="sm"
                        variant={orderAdjustment.isPercentage ? "default" : "ghost"}
                        onClick={() => setOrderAdjustment(prev => ({ ...prev, isPercentage: true }))}
                        className={cn(
                          "h-7 px-3 text-xs transition-colors",
                          orderAdjustment.isPercentage 
                            ? "bg-white shadow-sm text-gray-900" 
                            : "text-gray-600 hover:text-gray-900"
                        )}
                      >
                        % Percent
                      </Button>
                    </div>
                  </div>
                  
                  {/* Amount Input */}
                  <div className="flex items-center gap-2">
                    <Label htmlFor="order-adjustment-amount" className="text-sm text-gray-600 w-16">
                      Amount:
                    </Label>
                    <div className="flex items-center gap-1 flex-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setOrderAdjustment(prev => ({ 
                          ...prev, 
                          amount: prev.amount - (prev.isPercentage ? 10 : 5) 
                        }))}
                        className="h-7 px-2 text-xs hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                      >
                        -{orderAdjustment.isPercentage ? '10%' : '$5'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setOrderAdjustment(prev => ({ 
                          ...prev, 
                          amount: prev.amount - (prev.isPercentage ? 5 : 1) 
                        }))}
                        className="h-7 px-2 text-xs hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                      >
                        -{orderAdjustment.isPercentage ? '5%' : '$1'}
                      </Button>
                      <div className="flex-1 flex items-center gap-1">
                        <Input
                          id="order-adjustment-amount"
                          type="number"
                          step={orderAdjustment.isPercentage ? "1" : "1"}
                          value={orderAdjustment.amount || ''}
                          onChange={(e) => {
                            const amount = parseFloat(e.target.value) || 0;
                            setOrderAdjustment(prev => ({ ...prev, amount }));
                          }}
                          placeholder="Enter amount"
                          className="h-8 text-sm"
                          />
                        <span className="text-sm text-gray-600 font-medium ml-1">
                          {orderAdjustment.isPercentage ? '%' : '$'}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setOrderAdjustment(prev => ({ 
                          ...prev, 
                          amount: prev.amount + (prev.isPercentage ? 5 : 1) 
                        }))}
                        className="h-7 px-2 text-xs hover:bg-green-50 hover:text-green-600 hover:border-green-300"
                      >
                        +{orderAdjustment.isPercentage ? '5%' : '$1'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setOrderAdjustment(prev => ({ 
                          ...prev, 
                          amount: prev.amount + (prev.isPercentage ? 10 : 5) 
                        }))}
                        className="h-7 px-2 text-xs hover:bg-green-50 hover:text-green-600 hover:border-green-300"
                      >
                        +{orderAdjustment.isPercentage ? '10%' : '$5'}
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
                </div>
              )}
            </div>
          )}

          {/* Order Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            {!order || (order.isLoading && !order.isCached) ? (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <div className="border-t pt-2 flex justify-between">
                  <Skeleton className="h-5 w-12" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </div>
            ) : (() => {
              // Calculate totals with loyalty discount
              const subtotal = order?.subtotal || order?.totalAmount || 0;
              const existingModifiers = order?.modifiers || [];
              
              // Calculate total after existing modifiers but before loyalty discount
              const totalAfterModifiers = existingModifiers.reduce((total, modifier) => {
                if (modifier.type === OrderModifierType.DISCOUNT) {
                  return total - Math.abs(modifier.amount);
                } else {
                  return total + Math.abs(modifier.amount);
                }
              }, subtotal);
              
              // Apply manual adjustment
              const adjustmentAmount = calculateAdjustmentAmount();
              const totalWithAdjustment = totalAfterModifiers + adjustmentAmount;
              
              // Apply loyalty discount
              const totalWithLoyalty = loyaltyDiscount.amount > 0 
                ? totalWithAdjustment - loyaltyDiscount.amount 
                : totalWithAdjustment;
              
              return (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  {existingModifiers.map((modifier: any) => (
                    <div key={modifier.id} className="flex justify-between text-sm">
                      <span>{modifier.description}:</span>
                      <span className={modifier.type === OrderModifierType.DISCOUNT ? 'text-green-600' : ''}>
                        {modifier.type === OrderModifierType.DISCOUNT ? '-' : '+'}
                        ${Math.abs(modifier.amount).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  {(() => {
                    const adjustmentAmount = calculateAdjustmentAmount();
                    if (adjustmentAmount !== 0) {
                      return (
                        <div className="flex justify-between text-sm">
                          <span>
                            {orderAdjustment.reason || 'Adjustment'}
                            {orderAdjustment.isPercentage && (
                              <span className="text-xs text-gray-500">
                                {' '}({Math.abs(orderAdjustment.amount)}%)
                              </span>
                            )}:
                          </span>
                          <span className={adjustmentAmount < 0 ? 'text-green-600' : 'text-red-600'}>
                            {adjustmentAmount < 0 ? '-' : '+'}
                            ${Math.abs(adjustmentAmount).toFixed(2)}
                          </span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  {loyaltyDiscount.amount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>{loyaltyDiscount.description}:</span>
                      <span className="text-green-600">
                        -${loyaltyDiscount.amount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between font-semibold">
                    <span>Total:</span>
                    <span>${totalWithLoyalty.toFixed(2)}</span>
                  </div>
                  {order?.paidAmount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Paid:</span>
                      <span>-${order.paidAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg">
                    <span>Balance Due:</span>
                    <span>${Math.max(0, totalWithLoyalty - (order?.paidAmount || 0)).toFixed(2)}</span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Split Payment Toggle */}
          <div className="flex items-center space-x-2">
            <Switch
              id="split-payment"
              checked={isSplitPayment}
              onCheckedChange={setIsSplitPayment}
            />
            <Label htmlFor="split-payment">Split Payment</Label>
          </div>

          {/* Payment Method Selection */}
          {!isSplitPayment ? (
            <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value={PaymentMethod.CASH}>
                  <DollarSign className="mr-2 h-4 w-4" />
                  Cash
                </TabsTrigger>
                <TabsTrigger value={PaymentMethod.CARD}>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Card
                </TabsTrigger>
              </TabsList>

              <TabsContent value={PaymentMethod.CASH} className="space-y-4">
                <div>
                  <Label htmlFor="cash-received">Cash Received</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm">$</span>
                    <div className="flex items-center">
                      <Input
                        id="cash-received"
                        type="number"
                        step="1"
                        placeholder={totalWithTip.toFixed(2)}
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                        onFocus={(e) => e.target.select()}
                        className="rounded-r-none"
                      />
                      <div className="flex flex-col">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const current = parseFloat(cashReceived) || totalWithTip;
                            setCashReceived((current + 1).toFixed(2));
                          }}
                          className="h-5 w-8 p-0 rounded-none rounded-tr border-l-0"
                        >
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const current = parseFloat(cashReceived) || totalWithTip;
                            if (current > 1) setCashReceived((current - 1).toFixed(2));
                          }}
                          className="h-5 w-8 p-0 rounded-none rounded-br border-l-0 border-t-0"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                {changeAmount > 0 && (
                  <div className="bg-green-50 p-3 rounded">
                    <span className="text-green-700 font-medium">
                      Change: ${changeAmount.toFixed(2)}
                    </span>
                  </div>
                )}
              </TabsContent>

              <TabsContent value={PaymentMethod.CARD} className="space-y-4">
                <div className="text-center p-8 bg-gray-50 rounded">
                  <CreditCard className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">
                    {isTyroEnabled && merchant?.settings?.tyroTerminalId 
                      ? 'Click "Process Payment" to charge the card'
                      : !isTyroEnabled 
                        ? 'Card payments not configured' 
                        : 'Please configure terminal in Settings'}
                  </p>
                  {isTyroEnabled && merchant?.settings?.tyroTerminalId ? (
                    <p className="text-lg font-semibold mt-2">
                      Amount: ${totalWithTip.toFixed(2)}
                    </p>
                  ) : (
                    !isTyroEnabled && (
                      <p className="text-xs text-gray-500 mt-2">
                        Enable Tyro in Settings to accept card payments
                      </p>
                    )
                  )}
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            /* Split Payment Section */
            <div className="space-y-4">
              {splitPayments.map((sp, index) => (
                <div key={index} className="border p-3 rounded space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Payment {index + 1}</h4>
                    {splitPayments.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveSplitPayment(index)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Method</Label>
                      <Select
                        value={sp.method}
                        onValueChange={(v) => updateSplitPayment(index, 'method', v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={PaymentMethod.CASH}>Cash</SelectItem>
                          <SelectItem value={PaymentMethod.CARD}>Card</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Amount</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={sp.amount}
                        onChange={(e) => updateSplitPayment(index, 'amount', e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              <Button
                variant="outline"
                onClick={handleAddSplitPayment}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Payment Method
              </Button>
              
              {(() => {
                const splitTotal = splitPayments.reduce((sum, sp) => sum + (parseFloat(sp.amount) || 0), 0);
                const splitRemaining = totalWithTip - splitTotal;
                return splitRemaining !== 0 && (
                  <div className={`text-center font-medium ${splitRemaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {splitRemaining > 0 ? 'Remaining' : 'Overpayment'}: ${Math.abs(splitRemaining).toFixed(2)}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Tips Section (if enabled) */}
          {enableTips && !isSplitPayment && (
            <div className="border-t pt-4 space-y-3">
              <Label>Add Tip</Label>
              <RadioGroup value={selectedTipPercentage?.toString() || 'custom'}>
                <div className="grid grid-cols-4 gap-2">
                  {defaultTipPercentages.map((percentage) => (
                    <div key={percentage} className="flex items-center">
                      <RadioGroupItem
                        value={percentage.toString()}
                        id={`tip-${percentage}`}
                        onClick={() => {
                          setSelectedTipPercentage(percentage);
                          setCustomTipAmount('');
                        }}
                      />
                      <Label htmlFor={`tip-${percentage}`} className="ml-2 cursor-pointer">
                        {percentage}%
                      </Label>
                    </div>
                  ))}
                  <div className="flex items-center">
                    <RadioGroupItem
                      value="custom"
                      id="tip-custom"
                      onClick={() => setSelectedTipPercentage(null)}
                    />
                    <Label htmlFor="tip-custom" className="ml-2 cursor-pointer">
                      Custom
                    </Label>
                  </div>
                </div>
              </RadioGroup>
              
              {!selectedTipPercentage && (
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Enter tip amount"
                  value={customTipAmount}
                  onChange={(e) => setCustomTipAmount(e.target.value)}
                />
              )}
              
              {tipAmount > 0 && (
                <div className="text-sm text-gray-600">
                  Tip: ${tipAmount.toFixed(2)} | Total with tip: ${totalWithTip.toFixed(2)}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={processing}>
            Cancel
          </Button>
          <Button
            onClick={handlePayment}
            disabled={!order || (!order.id && !order.isCached) || processing || (isSplitPayment && (() => {
              const splitTotal = splitPayments.reduce((sum, sp) => sum + (parseFloat(sp.amount) || 0), 0);
              const splitRemaining = totalWithTip - splitTotal;
              return splitRemaining !== 0;
            })())}
          >
            {!order || (order.isLoading && !order.isCached) ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading order...
              </>
            ) : processing ? (
              'Processing...'
            ) : (
              `Process Payment${totalWithTip > 0 ? ` $${totalWithTip.toFixed(2)}` : ''}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}