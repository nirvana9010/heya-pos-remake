"use client";

import React, { useState } from 'react';
import { useTyro } from '../../hooks/useTyro';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@heya-pos/ui';
import { Button } from '@heya-pos/ui';
import { Input } from '@heya-pos/ui';
import { Label } from '@heya-pos/ui';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface TyroPairingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPairSuccess?: () => void;
  defaultMerchantId?: string;
  defaultTerminalId?: string;
}

export const TyroPairingDialog: React.FC<TyroPairingDialogProps> = ({
  open,
  onOpenChange,
  onPairSuccess,
  defaultMerchantId = '',
  defaultTerminalId = '',
}) => {
  const [merchantId, setMerchantId] = useState(defaultMerchantId);
  const [terminalId, setTerminalId] = useState(defaultTerminalId);
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string>('');

  const { pairTerminal, isAvailable } = useTyro();

  const handlePair = () => {
    if (!merchantId.trim() || !terminalId.trim()) {
      setError('Please enter both Merchant ID and Terminal ID');
      return;
    }

    if (!isAvailable()) {
      setError('Tyro SDK is not available. Please ensure the SDK is loaded.');
      return;
    }

    setLoading(true);
    setError('');
    setStatus('Initiating pairing...');
    
    pairTerminal(merchantId.trim(), terminalId.trim(), (response) => {
      setLoading(false);
      setStatus(response.message || '');
      
      if (response.status === 'success') {
        setSuccess(true);
        setError('');
        setTimeout(() => {
          onPairSuccess?.();
          onOpenChange(false);
          // Reset state
          setSuccess(false);
          setStatus('');
        }, 2000);
      } else if (response.status === 'error' || response.status === 'failure') {
        setError(response.message || 'Pairing failed');
        setSuccess(false);
      }
    });
  };

  const handleClose = () => {
    if (!loading) {
      onOpenChange(false);
      // Reset state when closing
      setStatus('');
      setError('');
      setSuccess(false);
    }
  };

  const StatusIcon = success ? CheckCircle : error ? AlertCircle : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Pair Tyro Terminal</DialogTitle>
          <DialogDescription>
            Connect your Tyro EFTPOS terminal to enable card payments.
            You'll need to confirm the pairing on your physical terminal.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="merchant-id">Merchant ID</Label>
            <Input
              id="merchant-id"
              placeholder="Enter your Tyro Merchant ID"
              value={merchantId}
              onChange={(e) => setMerchantId(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="terminal-id">Terminal ID</Label>
            <Input
              id="terminal-id"
              placeholder="Enter your Terminal ID"
              value={terminalId}
              onChange={(e) => setTerminalId(e.target.value)}
              disabled={loading}
            />
          </div>

          {(status || error) && (
            <div className={`flex items-center gap-2 p-3 rounded-md ${
              success 
                ? 'bg-green-50 border border-green-200 text-green-800' 
                : error
                ? 'bg-red-50 border border-red-200 text-red-800'
                : 'bg-blue-50 border border-blue-200 text-blue-800'
            }`}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {StatusIcon && <StatusIcon className="h-4 w-4" />}
              <span className="text-sm">{error || status}</span>
            </div>
          )}

          {!isAvailable() && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-yellow-800">
                  Tyro SDK not detected. Please ensure the Tyro SDK is properly loaded.
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handlePair} 
            disabled={loading || !isAvailable()}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Pairing...
              </>
            ) : (
              'Pair Terminal'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};