import * as React from "react";
import { cn } from "../lib/utils";
import { Button } from "./button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./card";
import { Input } from "./input";
import { Label } from "./label";
import { RadioGroup, RadioGroupItem } from "./radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
import { CreditCard, DollarSign, Smartphone, Calculator } from "lucide-react";

interface PaymentFormProps {
  amount: number;
  currency?: string;
  onPaymentComplete: (method: PaymentMethod, details: PaymentDetails) => void;
  onCancel?: () => void;
  allowedMethods?: PaymentMethod[];
  className?: string;
}

export type PaymentMethod = 'card' | 'cash' | 'bank-transfer' | 'digital-wallet';

export interface PaymentDetails {
  method: PaymentMethod;
  amount: number;
  reference?: string;
  cashReceived?: number;
  change?: number;
}

const defaultMethods: PaymentMethod[] = ['card', 'cash', 'bank-transfer', 'digital-wallet'];

const quickCashAmounts = [5, 10, 20, 50, 100];

export function PaymentForm({
  amount,
  currency = 'AUD',
  onPaymentComplete,
  onCancel,
  allowedMethods = defaultMethods,
  className
}: PaymentFormProps) {
  const [selectedMethod, setSelectedMethod] = React.useState<PaymentMethod>(allowedMethods[0]);
  const [cashReceived, setCashReceived] = React.useState<string>(amount.toString());
  const [reference, setReference] = React.useState("");
  const [processing, setProcessing] = React.useState(false);

  const change = React.useMemo(() => {
    const received = parseFloat(cashReceived) || 0;
    return Math.max(0, received - amount);
  }, [cashReceived, amount]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency,
    }).format(value);
  };

  const handleSubmit = async () => {
    setProcessing(true);
    
    const details: PaymentDetails = {
      method: selectedMethod,
      amount,
      ...(selectedMethod === 'cash' && {
        cashReceived: parseFloat(cashReceived),
        change,
      }),
      ...(reference && { reference }),
    };

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    onPaymentComplete(selectedMethod, details);
    setProcessing(false);
  };

  const isValid = () => {
    switch (selectedMethod) {
      case 'cash':
        return parseFloat(cashReceived) >= amount;
      case 'bank-transfer':
      case 'digital-wallet':
        return reference.trim().length > 0;
      case 'card':
        return true; // Card validation handled by Stripe
      default:
        return false;
    }
  };

  return (
    <Card className={cn("w-full max-w-md", className)}>
      <CardHeader>
        <CardTitle>Payment</CardTitle>
        <CardDescription>
          Total amount due: {formatCurrency(amount)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedMethod} onValueChange={(v) => setSelectedMethod(v as PaymentMethod)}>
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${allowedMethods.length}, 1fr)` }}>
            {allowedMethods.includes('card') && (
              <TabsTrigger value="card" className="flex items-center gap-1">
                <CreditCard className="h-4 w-4" />
                Card
              </TabsTrigger>
            )}
            {allowedMethods.includes('cash') && (
              <TabsTrigger value="cash" className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                Cash
              </TabsTrigger>
            )}
            {allowedMethods.includes('bank-transfer') && (
              <TabsTrigger value="bank-transfer" className="flex items-center gap-1">
                <Calculator className="h-4 w-4" />
                Bank
              </TabsTrigger>
            )}
            {allowedMethods.includes('digital-wallet') && (
              <TabsTrigger value="digital-wallet" className="flex items-center gap-1">
                <Smartphone className="h-4 w-4" />
                Digital
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="card" className="space-y-4">
            <div className="rounded-lg border p-4 bg-gray-50">
              <p className="text-sm text-muted-foreground">
                Card payment will be processed through Stripe
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Click "Process Payment" to open secure payment form
              </p>
            </div>
          </TabsContent>

          <TabsContent value="cash" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cash-received">Amount Received</Label>
              <Input
                id="cash-received"
                type="number"
                step="0.01"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                className="text-xl text-center"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              {quickCashAmounts.map((quickAmount) => (
                <Button
                  key={quickAmount}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCashReceived(quickAmount.toString())}
                >
                  ${quickAmount}
                </Button>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCashReceived(amount.toString())}
              >
                Exact
              </Button>
            </div>

            {parseFloat(cashReceived) >= amount && (
              <div className="rounded-lg border p-4 bg-green-50">
                <p className="text-lg font-semibold text-green-800">
                  Change: {formatCurrency(change)}
                </p>
              </div>
            )}

            {parseFloat(cashReceived) < amount && parseFloat(cashReceived) > 0 && (
              <div className="rounded-lg border p-4 bg-red-50">
                <p className="text-sm text-red-800">
                  Insufficient amount. Need {formatCurrency(amount - parseFloat(cashReceived))} more.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="bank-transfer" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bank-reference">Reference Number</Label>
              <Input
                id="bank-reference"
                type="text"
                placeholder="Enter transfer reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>
            <div className="rounded-lg border p-4 bg-blue-50">
              <p className="text-sm font-medium">Bank Details:</p>
              <p className="text-xs text-muted-foreground mt-1">
                BSB: 123-456<br />
                Account: 12345678<br />
                Name: Business Name
              </p>
            </div>
          </TabsContent>

          <TabsContent value="digital-wallet" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wallet-reference">Transaction ID</Label>
              <Input
                id="wallet-reference"
                type="text"
                placeholder="Enter transaction ID"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>
            <RadioGroup defaultValue="paypal">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="paypal" id="paypal" />
                <Label htmlFor="paypal">PayPal</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="apple-pay" id="apple-pay" />
                <Label htmlFor="apple-pay">Apple Pay</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="google-pay" id="google-pay" />
                <Label htmlFor="google-pay">Google Pay</Label>
              </div>
            </RadioGroup>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={processing}
          >
            Cancel
          </Button>
        )}
        <Button
          onClick={handleSubmit}
          disabled={!isValid() || processing}
          className="ml-auto"
        >
          {processing ? 'Processing...' : 'Process Payment'}
        </Button>
      </CardFooter>
    </Card>
  );
}