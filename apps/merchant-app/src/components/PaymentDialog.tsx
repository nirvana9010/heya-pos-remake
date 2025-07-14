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
} from '@heya-pos/ui';
import {
  PaymentMethod,
  OrderState,
  OrderModifierType,
  OrderModifierCalculation,
} from '@heya-pos/types';
import { CreditCard, DollarSign, Percent, Plus, Minus, X, ChevronUp, ChevronDown } from 'lucide-react';
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
  const [itemAdjustments, setItemAdjustments] = useState<Record<string, number>>({});
  const [orderAdjustment, setOrderAdjustment] = useState({ amount: 0, reason: '' });
  const [showOrderAdjustment, setShowOrderAdjustment] = useState(false);

  // Calculate amounts including adjustments
  const calculateAdjustedTotal = useMemo(() => {
    if (!order) return { subtotal: 0, adjustments: 0, total: 0 };
    
    let itemAdjustmentsTotal = 0;
    for (const [itemId, newPrice] of Object.entries(itemAdjustments)) {
      const item = order.items?.find((i: any) => i.id === itemId);
      if (item) {
        const originalPrice = item.unitPrice * item.quantity;
        itemAdjustmentsTotal += newPrice - originalPrice;
      }
    }
    
    const orderLevelAdjustment = showOrderAdjustment ? orderAdjustment.amount : 0;
    const totalAdjustments = itemAdjustmentsTotal + orderLevelAdjustment;
    const adjustedTotal = (order.totalAmount || 0) + totalAdjustments;
    
    return {
      subtotal: order.subtotal || 0,
      adjustments: totalAdjustments,
      total: adjustedTotal
    };
  }, [order, itemAdjustments, orderAdjustment, showOrderAdjustment]);

  const balanceDue = calculateAdjustedTotal.total - (order?.paidAmount || 0);
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
      // Apply item adjustments as modifiers
      for (const [itemId, newPrice] of Object.entries(itemAdjustments)) {
        const item = order.items.find((i: any) => i.id === itemId);
        if (!item) continue;

        const originalPrice = item.unitPrice * item.quantity;
        const difference = newPrice - originalPrice;
        
        if (difference !== 0) {
          await apiClient.addOrderModifier(order.id, {
            type: difference < 0 ? OrderModifierType.DISCOUNT : OrderModifierType.SURCHARGE,
            calculation: OrderModifierCalculation.FIXED_AMOUNT,
            value: Math.abs(difference),
            description: `Adjustment: ${item.description || item.name}`,
            appliesTo: [itemId]
          });
        }
      }

      // Apply order-level adjustment if provided
      if (showOrderAdjustment && orderAdjustment.amount !== 0) {
        await apiClient.addOrderModifier(order.id, {
          type: orderAdjustment.amount < 0 ? OrderModifierType.DISCOUNT : OrderModifierType.SURCHARGE,
          calculation: OrderModifierCalculation.FIXED_AMOUNT,
          value: Math.abs(orderAdjustment.amount),
          description: orderAdjustment.reason || `Order ${orderAdjustment.amount < 0 ? 'Discount' : 'Surcharge'}`
        });
      }

      // Refresh order to get updated totals
      const updatedOrder = await apiClient.getOrder(order.id);
      
      // Update the balanceDue with the new total
      const updatedBalanceDue = updatedOrder.balanceDue || 0;
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
          amount: updatedBalanceDue,
          method: paymentMethod,
          tipAmount: enableTips ? tipAmount : 0,
          metadata: paymentMethod === PaymentMethod.CASH ? {
            cashReceived: parseFloat(cashReceived) || updatedBalanceDue,
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
      
      // Clear adjustments
      setItemAdjustments({});
      setOrderAdjustment({ amount: 0, reason: '' });
      setShowOrderAdjustment(false);
      
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

  const splitTotal = splitPayments.reduce((sum, sp) => sum + (parseFloat(sp.amount) || 0), 0);
  const splitRemaining = totalWithTip - splitTotal;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Process Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Order Items */}
          {order?.items && order.items.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium text-sm text-gray-700">Order Items</h3>
              <div className="space-y-2">
                {order.items.map((item: any) => {
                  const originalPrice = item.unitPrice * item.quantity;
                  const adjustedPrice = itemAdjustments[item.id] ?? originalPrice;
                  const difference = adjustedPrice - originalPrice;

                  return (
                    <div key={item.id} className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <span className="text-sm font-medium">{item.description || item.name}</span>
                          <span className="text-sm text-gray-500 ml-2">x{item.quantity}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            ${adjustedPrice.toFixed(2)}
                          </div>
                          <div className={cn(
                            "text-xs h-4",
                            difference !== 0 ? (difference < 0 ? "text-green-600" : "text-red-600") : "text-gray-400"
                          )}>
                            {difference !== 0 ? `${difference < 0 ? '-' : '+'}$${Math.abs(difference).toFixed(2)}` : 'No adjustment'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setItemAdjustments(prev => ({
                              ...prev,
                              [item.id]: Math.max(0, (prev[item.id] || originalPrice) - 5)
                            }));
                          }}
                          className="h-7 px-2 text-xs hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                        >
                          -$5
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setItemAdjustments(prev => ({
                              ...prev,
                              [item.id]: Math.max(0, (prev[item.id] || originalPrice) - 1)
                            }));
                          }}
                          className="h-7 px-2 text-xs hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                        >
                          -$1
                        </Button>
                        <div className="flex-1 text-center">
                          <Input
                            type="number"
                            step="0.01"
                            value={adjustedPrice.toFixed(2)}
                            onChange={(e) => {
                              const newPrice = parseFloat(e.target.value) || 0;
                              setItemAdjustments(prev => ({
                                ...prev,
                                [item.id]: Math.max(0, newPrice)
                              }));
                            }}
                            className="h-7 text-sm text-center"
                          />
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setItemAdjustments(prev => ({
                              ...prev,
                              [item.id]: (prev[item.id] || originalPrice) + 1
                            }));
                          }}
                          className="h-7 px-2 text-xs hover:bg-green-50 hover:text-green-700 hover:border-green-300"
                        >
                          +$1
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setItemAdjustments(prev => ({
                              ...prev,
                              [item.id]: (prev[item.id] || originalPrice) + 5
                            }));
                          }}
                          className="h-7 px-2 text-xs hover:bg-green-50 hover:text-green-700 hover:border-green-300"
                        >
                          +$5
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setItemAdjustments(prev => {
                              const next = { ...prev };
                              delete next[item.id];
                              return next;
                            });
                          }}
                          className={cn(
                            "h-7 px-2 text-xs hover:bg-gray-200",
                            difference === 0 && "opacity-0 pointer-events-none"
                          )}
                        >
                          Reset
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Order-level Adjustment */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm text-gray-700">Discount and Surcharge</h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowOrderAdjustment(!showOrderAdjustment)}
              >
                {showOrderAdjustment ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
            
            {showOrderAdjustment && (
              <div className="p-3 bg-gray-50 rounded space-y-3">
                <div>
                  <Label htmlFor="adjustment-amount" className="text-sm">
                    Amount (negative for discount)
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm">$</span>
                    <div className="flex items-center">
                      <Input
                        id="adjustment-amount"
                        type="number"
                        step="1"
                        value={orderAdjustment.amount || ''}
                        onChange={(e) => {
                          const amount = parseFloat(e.target.value) || 0;
                          setOrderAdjustment(prev => ({ ...prev, amount }));
                        }}
                        placeholder="0.00"
                        className="rounded-r-none"
                      />
                      <div className="flex flex-col">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setOrderAdjustment(prev => ({ ...prev, amount: prev.amount + 1 }));
                          }}
                          className="h-5 w-8 p-0 rounded-none rounded-tr border-l-0"
                        >
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setOrderAdjustment(prev => ({ ...prev, amount: prev.amount - 1 }));
                          }}
                          className="h-5 w-8 p-0 rounded-none rounded-br border-l-0 border-t-0"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <Label htmlFor="adjustment-reason" className="text-sm">
                    Reason <span className="text-gray-400">(optional)</span>
                  </Label>
                  <Input
                    id="adjustment-reason"
                    type="text"
                    value={orderAdjustment.reason}
                    onChange={(e) => {
                      setOrderAdjustment(prev => ({ ...prev, reason: e.target.value }));
                    }}
                    placeholder="e.g., Loyalty discount, Service issue, etc."
                    className="mt-1"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
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
              {calculateAdjustedTotal.adjustments !== 0 && (
                <div className="flex justify-between text-sm">
                  <span>Pending Adjustments:</span>
                  <span className={calculateAdjustedTotal.adjustments < 0 ? 'text-green-600' : 'text-red-600'}>
                    {calculateAdjustedTotal.adjustments < 0 ? '-' : '+'}
                    ${Math.abs(calculateAdjustedTotal.adjustments).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>Total:</span>
                <span>${calculateAdjustedTotal.total.toFixed(2)}</span>
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
                    Please process the payment on the Tyro terminal
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
              
              {splitRemaining !== 0 && (
                <div className={`text-center font-medium ${splitRemaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {splitRemaining > 0 ? 'Remaining' : 'Overpayment'}: ${Math.abs(splitRemaining).toFixed(2)}
                </div>
              )}
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
            disabled={processing || (isSplitPayment && splitRemaining !== 0)}
          >
            {processing ? 'Processing...' : `Process Payment${totalWithTip > 0 ? ` $${totalWithTip.toFixed(2)}` : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}