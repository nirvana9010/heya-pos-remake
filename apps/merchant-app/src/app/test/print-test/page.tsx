'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@heya-pos/ui';
import { Button } from '@heya-pos/ui';
import { Textarea } from '@heya-pos/ui';
import { useToast } from '@heya-pos/ui';
import { Printer, DollarSign, Receipt, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

const PRINT_SERVER_URL = 'http://127.0.0.1:9100';

// Helper to create a print line
function line(text: string, align: 'left' | 'center' | 'right' = 'left', bold = false) {
  return { text, align, bold };
}

// Helper to create a separator line
function separator() {
  return line('--------------------------------', 'center');
}

// Sample receipt payload for thermal printer
function createSampleReceipt() {
  const now = new Date();
  const date = now.toLocaleDateString('en-AU');
  const time = now.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
  const txnId = `TXN${Date.now().toString().slice(-8)}`;

  return {
    lines: [
      line('HEYA BEAUTY SALON', 'center', true),
      line('123 Main Street', 'center'),
      line('Sydney NSW 2000', 'center'),
      line('(02) 9876 5432', 'center'),
      separator(),
      line(`Date: ${date}  Time: ${time}`, 'left'),
      line(`Transaction: ${txnId}`, 'left'),
      line('Customer: Jane Smith', 'left'),
      separator(),
      line('Hair Cut & Style', 'left'),
      line('  1 x $85.00', 'right'),
      line('Hair Colour - Full', 'left'),
      line('  1 x $150.00', 'right'),
      line('Deep Conditioning', 'left'),
      line('  1 x $45.00', 'right'),
      separator(),
      line('Subtotal:          $280.00', 'right'),
      line('GST (10%):          $28.00', 'right'),
      separator(),
      line('TOTAL:             $280.00', 'right', true),
      line('Paid by Card:      $280.00', 'right'),
      separator(),
      line('Thank you for visiting!', 'center'),
      line('book.heyapos.com/heya-beauty', 'center'),
      line('', 'left'),
    ],
    cut: true,
  };
}

// Simple receipt for quick testing
function createMinimalReceipt() {
  return {
    lines: [
      line('TEST PRINT', 'center', true),
      separator(),
      line(new Date().toLocaleString('en-AU'), 'center'),
      separator(),
      line('Printer connected!', 'center'),
      line('', 'left'),
    ],
    cut: true,
  };
}

async function printReceipt(receipt: object) {
  const res = await fetch(`${PRINT_SERVER_URL}/print`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(receipt),
  });

  const text = await res.text();
  console.log('Print response:', res.status, text);
  if (!res.ok) throw new Error(text);

  // Check if response indicates failure
  try {
    const json = JSON.parse(text);
    if (json.ok === false) {
      throw new Error(json.error || json.message || 'Print failed');
    }
  } catch (e) {
    // If not JSON, just return the text
    if (e instanceof SyntaxError) {
      return text;
    }
    throw e;
  }
  return text;
}

async function openCashDrawer() {
  const res = await fetch(`${PRINT_SERVER_URL}/drawer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  const text = await res.text();
  if (!res.ok) throw new Error(text);
  return text;
}

async function checkPrinterStatus() {
  const res = await fetch(`${PRINT_SERVER_URL}/status`, {
    method: 'GET',
  });

  const text = await res.text();
  if (!res.ok) throw new Error(text);
  return text;
}

export default function PrintTestPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<string>('');
  const [customPayload, setCustomPayload] = useState(
    JSON.stringify(createSampleReceipt(), null, 2)
  );
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');

  const handleAction = async (
    action: () => Promise<string>,
    actionName: string
  ) => {
    setLoading(actionName);
    try {
      const response = await action();
      setLastResponse(response);
      setConnectionStatus('connected');
      toast({
        title: 'Success',
        description: `${actionName} completed successfully`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setLastResponse(`Error: ${message}`);
      setConnectionStatus('disconnected');
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-full bg-blue-100 text-blue-600">
            <Printer className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Printer Test</h1>
            <p className="text-muted-foreground">
              Test thermal printer and cash drawer connection via Android print server
            </p>
          </div>
        </div>

        {/* Connection Status */}
        <div className="flex items-center gap-2 mt-4">
          <span className="text-sm text-muted-foreground">Print Server:</span>
          <code className="text-sm bg-muted px-2 py-1 rounded">{PRINT_SERVER_URL}</code>
          {connectionStatus === 'connected' && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" /> Connected
            </span>
          )}
          {connectionStatus === 'disconnected' && (
            <span className="flex items-center gap-1 text-sm text-red-600">
              <XCircle className="h-4 w-4" /> Disconnected
            </span>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Quick Test Print
            </CardTitle>
            <CardDescription>
              Print a minimal test receipt to verify connection
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() =>
                handleAction(
                  () => printReceipt(createMinimalReceipt()),
                  'Test Print'
                )
              }
              disabled={loading !== null}
            >
              {loading === 'Test Print' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Printer className="h-4 w-4 mr-2" />
              )}
              Test Print
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Sample Receipt
            </CardTitle>
            <CardDescription>
              Print a full sample receipt with items
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              variant="secondary"
              onClick={() =>
                handleAction(
                  () => printReceipt(createSampleReceipt()),
                  'Sample Receipt'
                )
              }
              disabled={loading !== null}
            >
              {loading === 'Sample Receipt' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Receipt className="h-4 w-4 mr-2" />
              )}
              Print Sample
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Cash Drawer
            </CardTitle>
            <CardDescription>
              Open the cash drawer connected to printer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => handleAction(openCashDrawer, 'Open Drawer')}
              disabled={loading !== null}
            >
              {loading === 'Open Drawer' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <DollarSign className="h-4 w-4 mr-2" />
              )}
              Open Drawer
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Custom Payload Editor */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Custom Receipt Payload</CardTitle>
          <CardDescription>
            Edit the JSON payload to test different receipt formats
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={customPayload}
            onChange={(e) => setCustomPayload(e.target.value)}
            className="font-mono text-sm min-h-[300px]"
            placeholder="Enter JSON payload..."
          />
          <div className="flex gap-2">
            <Button
              onClick={() => {
                try {
                  const payload = JSON.parse(customPayload);
                  handleAction(() => printReceipt(payload), 'Custom Print');
                } catch {
                  toast({
                    title: 'Invalid JSON',
                    description: 'Please check your JSON syntax',
                    variant: 'destructive',
                  });
                }
              }}
              disabled={loading !== null}
            >
              {loading === 'Custom Print' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Printer className="h-4 w-4 mr-2" />
              )}
              Print Custom
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                setCustomPayload(JSON.stringify(createSampleReceipt(), null, 2))
              }
            >
              Reset to Sample
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                setCustomPayload(JSON.stringify(createMinimalReceipt(), null, 2))
              }
            >
              Reset to Minimal
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Response Log */}
      {lastResponse && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Last Response</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
              {lastResponse}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <div className="mt-8 p-6 bg-muted/30 rounded-lg">
        <h3 className="font-semibold mb-3">Setup Instructions</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
          <li>Install the Heya Print Server app on your Android device</li>
          <li>Connect thermal printer via USB or Bluetooth</li>
          <li>Start the print server - it will listen on port 9100</li>
          <li>Ensure Android device is on the same network as this browser</li>
          <li>
            If testing locally, use{' '}
            <code className="bg-muted px-1 py-0.5 rounded">adb reverse tcp:9100 tcp:9100</code>
          </li>
        </ol>

        <h4 className="font-semibold mt-4 mb-2">API Endpoints</h4>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          <li><code className="bg-muted px-1 py-0.5 rounded">POST /print</code> - Print receipt (JSON body)</li>
          <li><code className="bg-muted px-1 py-0.5 rounded">POST /drawer</code> - Open cash drawer</li>
          <li><code className="bg-muted px-1 py-0.5 rounded">GET /status</code> - Check printer status</li>
        </ul>
      </div>
    </div>
  );
}
