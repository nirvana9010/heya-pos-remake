'use client';

import { useState, useEffect } from 'react';
import { Button } from '@heya-pos/ui';
import { CreditCard, Lock, AlertCircle, Zap, WifiOff } from 'lucide-react';

interface MockPaymentFormProps {
  amount: number;
  currency?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function MockPaymentForm({ 
  amount, 
  currency = 'AUD',
  onSuccess, 
  onCancel 
}: MockPaymentFormProps) {
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [isOffline, setIsOffline] = useState(false);
  const [cardType, setCardType] = useState<'visa' | 'mastercard' | 'amex' | 'discover' | ''>('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Network connectivity detection
  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOffline(!navigator.onLine);
    };
    
    updateOnlineStatus();
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  // Detect card type from number
  const detectCardType = (number: string) => {
    const cleaned = number.replace(/\s/g, '');
    if (cleaned.startsWith('4')) return 'visa';
    if (cleaned.startsWith('5')) return 'mastercard';
    if (cleaned.startsWith('3')) return 'amex';
    if (cleaned.startsWith('6')) return 'discover';
    return '';
  };

  // Validate card number using Luhn algorithm
  const validateCardNumber = (number: string): boolean => {
    const cleaned = number.replace(/\s/g, '');
    if (cleaned.length < 13 || cleaned.length > 19) return false;
    
    let sum = 0;
    let isEven = false;
    
    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned[i]);
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  };

  const formatCardNumber = (value: string) => {
    // Remove all non-digits
    const cleaned = value.replace(/\D/g, '');
    
    // Detect card type
    const type = detectCardType(cleaned);
    setCardType(type);
    
    // Add spaces every 4 digits
    const formatted = cleaned.replace(/(.{4})/g, '$1 ').trim();
    return formatted.substring(0, 19); // 16 digits + 3 spaces
  };

  const formatExpiryDate = (value: string) => {
    // Remove all non-digits
    const cleaned = value.replace(/\D/g, '');
    // Add slash after 2 digits
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4);
    }
    return cleaned;
  };

  // Test card details
  const VALID_TEST_CARD = {
    cardNumber: '4242 4242 4242 4242',
    expiryDate: '12/25',
    cvv: '123',
    cardholderName: 'Test User'
  };

  const fillTestCard = () => {
    setCardNumber(VALID_TEST_CARD.cardNumber);
    setExpiryDate(VALID_TEST_CARD.expiryDate);
    setCvv(VALID_TEST_CARD.cvv);
    setCardholderName(VALID_TEST_CARD.cardholderName);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Prevent double submission
    if (hasSubmitted || isProcessing) {
      return;
    }
    
    // Check for offline status
    if (isOffline) {
      setError('No internet connection. Please check your connection and try again.');
      return;
    }
    
    // Basic validation
    if (!cardNumber || !expiryDate || !cvv || !cardholderName) {
      setError('Please fill in all fields');
      return;
    }
    
    // Validate expiry date format
    const [month, year] = expiryDate.split('/');
    if (!month || !year || parseInt(month) > 12 || parseInt(month) < 1) {
      setError('Invalid expiry date format');
      return;
    }

    setIsProcessing(true);
    setHasSubmitted(true);
    
    try {
      // Simulate payment processing with timeout
      const paymentPromise = new Promise((resolve, reject) => {
        setTimeout(() => {
          // Check if card details match the valid test card
          const isValidCard = 
            cardNumber === VALID_TEST_CARD.cardNumber &&
            expiryDate === VALID_TEST_CARD.expiryDate &&
            cvv === VALID_TEST_CARD.cvv;
          
          if (!isValidCard) {
            reject(new Error('invalid_card'));
          } else {
            resolve(true);
          }
        }, 2000);
      });
      
      // Add timeout detection (10 seconds)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('timeout')), 10000);
      });
      
      await Promise.race([paymentPromise, timeoutPromise]);
      
      // Success
      setIsProcessing(false);
      onSuccess();
      
    } catch (error: any) {
      setIsProcessing(false);
      setHasSubmitted(false);
      
      if (error.message === 'timeout') {
        setError('Payment processing timed out. Please check with your bank or try again.');
      } else if (error.message === 'invalid_card') {
        // Simulate different error scenarios based on card details
        if (cardNumber !== VALID_TEST_CARD.cardNumber) {
          const cleanNumber = cardNumber.replace(/\s/g, '');
          if (cleanNumber.startsWith('4000')) {
            setError('Your payment was declined due to insufficient funds.');
          } else if (cleanNumber.startsWith('4111')) {
            setError('Your card has been declined. Please contact your bank.');
          } else if (cleanNumber.startsWith('5555')) {
            setError('Transaction limit exceeded. Please try a smaller amount or contact your bank.');
          } else {
            setError('Your payment could not be processed. Please check your card details and try again.');
          }
        } else if (cvv !== VALID_TEST_CARD.cvv) {
          setError('Invalid security code. Please check the 3-digit code on the back of your card.');
        } else if (expiryDate !== VALID_TEST_CARD.expiryDate) {
          setError('Your card has expired. Please use a different payment method.');
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Details</h2>
        <p className="text-gray-600">
          Deposit amount: <span className="font-semibold">${amount.toFixed(2)} {currency}</span>
        </p>
      </div>

      {/* Offline Warning */}
      {isOffline && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-4 flex items-center gap-2 mb-4">
          <WifiOff className="h-5 w-5 text-amber-600" />
          <p className="text-sm text-amber-800">
            You appear to be offline. Please check your internet connection.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700 mb-1">
            Card Number
          </label>
          <div className="relative">
            <input
              type="text"
              id="cardNumber"
              value={cardNumber}
              onChange={(e) => {
                const formatted = formatCardNumber(e.target.value);
                setCardNumber(formatted);
                
                // Real-time validation
                if (formatted.replace(/\s/g, '').length === 16) {
                  if (!validateCardNumber(formatted)) {
                    setFieldErrors(prev => ({ ...prev, cardNumber: 'Invalid card number' }));
                  } else {
                    setFieldErrors(prev => ({ ...prev, cardNumber: '' }));
                  }
                } else {
                  setFieldErrors(prev => ({ ...prev, cardNumber: '' }));
                }
              }}
              placeholder="1234 5678 9012 3456"
              className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-16 ${
                fieldErrors.cardNumber ? 'border-red-500' : 'border-gray-300'
              }`}
              maxLength={19}
              disabled={isProcessing || isOffline}
            />
            <div className="absolute right-3 top-2.5 flex items-center gap-2">
              {cardType && (
                <span className="text-xs font-medium text-gray-600 uppercase">
                  {cardType}
                </span>
              )}
              <CreditCard className="h-5 w-5 text-gray-400" />
            </div>
          </div>
          {fieldErrors.cardNumber && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.cardNumber}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="expiryDate" className="block text-sm font-medium text-gray-700 mb-1">
              Expiry Date
            </label>
            <input
              type="text"
              id="expiryDate"
              value={expiryDate}
              onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
              placeholder="MM/YY"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              maxLength={5}
              disabled={isProcessing || isOffline}
            />
          </div>

          <div>
            <label htmlFor="cvv" className="block text-sm font-medium text-gray-700 mb-1">
              CVV
            </label>
            <input
              type="text"
              id="cvv"
              value={cvv}
              onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').substring(0, 4))}
              placeholder="123"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              maxLength={4}
              disabled={isProcessing || isOffline}
            />
          </div>
        </div>

        <div>
          <label htmlFor="cardholderName" className="block text-sm font-medium text-gray-700 mb-1">
            Cardholder Name
          </label>
          <input
            type="text"
            id="cardholderName"
            value={cardholderName}
            onChange={(e) => setCardholderName(e.target.value)}
            placeholder="John Doe"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isProcessing || isOffline}
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        )}

        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-yellow-800">
                <strong>Test Mode:</strong> This is a mock payment form. No real transactions will be processed.
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                Valid test card: 4242 4242 4242 4242, Exp: 12/25, CVV: 123
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={fillTestCard}
              className="ml-3 flex items-center gap-1"
              disabled={isProcessing || isOffline}
            >
              <Zap className="h-3 w-3" />
              Fill Test Card
            </Button>
          </div>
          
          {/* Dev Mode Test Scenarios */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 pt-4 border-t border-yellow-300">
              <p className="text-xs font-semibold text-yellow-900 mb-2">Test Card Scenarios:</p>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-yellow-800">Success:</span>
                  <code className="bg-yellow-100 px-2 py-0.5 rounded font-mono">4242 4242 4242 4242</code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-yellow-800">Insufficient Funds:</span>
                  <code className="bg-yellow-100 px-2 py-0.5 rounded font-mono">4000 0000 0000 0000</code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-yellow-800">Card Declined:</span>
                  <code className="bg-yellow-100 px-2 py-0.5 rounded font-mono">4111 1111 1111 1111</code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-yellow-800">Transaction Limit:</span>
                  <code className="bg-yellow-100 px-2 py-0.5 rounded font-mono">5555 5555 5555 5555</code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-yellow-800">Expired Card:</span>
                  <code className="bg-yellow-100 px-2 py-0.5 rounded font-mono">Any card with wrong expiry</code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-yellow-800">Invalid CVV:</span>
                  <code className="bg-yellow-100 px-2 py-0.5 rounded font-mono">Any card with wrong CVV</code>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 py-2">
          <Lock className="h-4 w-4" />
          <span>Your payment information is secure</span>
        </div>

        <div className="flex space-x-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isProcessing}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isProcessing || isOffline || hasSubmitted}
            className="flex-1"
          >
            {isProcessing ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Processing...
              </span>
            ) : isOffline ? (
              'No Connection'
            ) : (
              `Pay $${amount.toFixed(2)}`
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}