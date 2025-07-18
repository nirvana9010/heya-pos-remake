'use client';

import React, { useState, useMemo, useCallback } from 'react';
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
import { CreditCard, DollarSign, Percent, Plus, Minus, X, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useToast, cn } from '@heya-pos/ui';

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any; // Order with items, modifiers, and payments
  onPaymentComplete?: (order: any) => void;
  enableTips?: boolean;
  defaultTipPercentages?: number[];
}

export function PaymentDialog({
  open,
  onOpenChange,
  order,
  onPaymentComplete,
  enableTips = false,
  defaultTipPercentages = [10, 15, 20],
}: PaymentDialogProps) {
  const { toast } = useToast();
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

  const balanceDue = (order?.totalAmount || 0) - (order?.paidAmount || 0);
  const tipAmount = useMemo(() => {
    if (!enableTips) return 0;
    
    if (customTipAmount) {
      return parseFloat(customTipAmount) || 0;
    }
    
    if (selectedTipPercentage) {
      return (order.totalAmount * selectedTipPercentage) / 100;
    }
    
    return 0;
  }, [enableTips, customTipAmount, selectedTipPercentage, order?.totalAmount]);

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

    try {
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
        const paymentData: any = {
          orderId: order.id,
          amount: balanceDue,
          method: paymentMethod,
          tipAmount: enableTips ? tipAmount : 0,
          metadata: paymentMethod === PaymentMethod.CASH ? {
            cashReceived: parseFloat(cashReceived) || balanceDue,
          } : undefined,
        };

        if (paymentMethod === PaymentMethod.CARD) {
          // For card payments, we'd integrate with payment terminal here
          // For now, simulate with a reference
          paymentData.reference = `CARD_${Date.now()}`;
        }

        result = await apiClient.processPayment(paymentData);
      }

      toast({
        title: 'Payment successful',
        description: changeAmount > 0 ? `Change: $${changeAmount.toFixed(2)}` : undefined,
      });

      // Refresh order data
      const finalOrder = await apiClient.getOrder(order.id);
      
      onPaymentComplete?.(finalOrder);
      onOpenChange(false);

    } catch (error: any) {
      toast({
        title: 'Payment failed',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
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
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${order?.subtotal?.toFixed(2) || '0.00'}</span>
                </div>
              {order?.modifiers?.map((modifier: any) => (
                <div key={modifier.id} className="flex justify-between text-sm">
                  <span>{modifier.description}:</span>
                  <span className={modifier.type === OrderModifierType.DISCOUNT ? 'text-green-600' : ''}>
                    {modifier.type === OrderModifierType.DISCOUNT ? '-' : '+'}
                    ${Math.abs(modifier.amount).toFixed(2)}
                  </span>
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>Total:</span>
                <span>${order?.totalAmount?.toFixed(2) || '0.00'}</span>
              </div>
              {order?.paidAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Paid:</span>
                  <span>-${order.paidAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg">
                <span>Balance Due:</span>
                <span>${balanceDue.toFixed(2)}</span>
              </div>
            </div>
            )}
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
                    Please process payment on the card reader
                  </p>
                  <p className="text-lg font-semibold mt-2">
                    Amount: ${totalWithTip.toFixed(2)}
                  </p>
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