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
import { CreditCard, DollarSign, Percent, Plus, Minus } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@heya-pos/ui';

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

  // Calculate amounts
  const balanceDue = order?.balanceDue || 0;
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

  const totalWithTip = balanceDue + tipAmount;
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
        const paymentData = {
          orderId: order.id,
          amount: balanceDue,
          method: paymentMethod,
          tipAmount: enableTips ? tipAmount : 0,
          metadata: paymentMethod === PaymentMethod.CASH ? {
            cashReceived: parseFloat(cashReceived) || balanceDue,
          } : undefined,
        };

        if (paymentMethod === PaymentMethod.CARD_TYRO) {
          // For card payments, we'd integrate with Tyro terminal here
          // For now, simulate with a reference
          paymentData.reference = `TYRO_${Date.now()}`;
        }

        result = await apiClient.processPayment(paymentData);
      }

      toast({
        title: 'Payment successful',
        description: changeAmount > 0 ? `Change: $${changeAmount.toFixed(2)}` : undefined,
      });

      // Refresh order data
      const updatedOrder = await apiClient.getOrder(order.id);
      onPaymentComplete?.(updatedOrder);
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
                <TabsTrigger value={PaymentMethod.CARD_TYRO}>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Card
                </TabsTrigger>
              </TabsList>

              <TabsContent value={PaymentMethod.CASH} className="space-y-4">
                <div>
                  <Label htmlFor="cash-received">Cash Received</Label>
                  <Input
                    id="cash-received"
                    type="number"
                    step="0.01"
                    placeholder={totalWithTip.toFixed(2)}
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    onFocus={(e) => e.target.select()}
                  />
                </div>
                {changeAmount > 0 && (
                  <div className="bg-green-50 p-3 rounded">
                    <span className="text-green-700 font-medium">
                      Change: ${changeAmount.toFixed(2)}
                    </span>
                  </div>
                )}
              </TabsContent>

              <TabsContent value={PaymentMethod.CARD_TYRO} className="space-y-4">
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
                          <SelectItem value={PaymentMethod.CARD_TYRO}>Card</SelectItem>
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