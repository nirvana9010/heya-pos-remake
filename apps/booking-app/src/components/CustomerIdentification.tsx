'use client';

import { useState, useEffect } from 'react';
import { Button } from '@heya-pos/ui';
import { Search, Mail, Phone } from 'lucide-react';
import { bookingApi } from '../lib/booking-api';

interface CustomerIdentificationProps {
  onCustomerFound: (customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  }) => void;
  onNewCustomer: () => void;
}

export function CustomerIdentification({
  onCustomerFound,
  onNewCustomer,
}: CustomerIdentificationProps) {
  const [identificationMethod, setIdentificationMethod] = useState<'email' | 'phone'>('email');
  const [identifier, setIdentifier] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  const [showSavedCustomer, setShowSavedCustomer] = useState(false);

  // Check for saved customer email on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedEmail = localStorage.getItem('bookingCustomerEmail');
      if (savedEmail) {
        setIdentifier(savedEmail);
        setShowSavedCustomer(true);
      }
    }
  }, []);

  const handleSearch = async () => {
    if (!identifier.trim()) {
      setError('Please enter your email or phone number');
      return;
    }

    setIsSearching(true);
    setError('');

    try {
      const data = await bookingApi.lookupCustomer({
        [identificationMethod]: identifier.trim(),
      });

      if (data.found && data.customer) {
        // Store in localStorage for future visits (with consent)
        if (typeof window !== 'undefined') {
          localStorage.setItem('bookingCustomerId', data.customer.id);
          localStorage.setItem('bookingCustomerEmail', data.customer.email);
        }
        onCustomerFound(data.customer);
      } else {
        setError('No booking found with this information. Please check and try again or book as a new customer.');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="max-w-md mx-auto">

      <div className="space-y-6">
        {/* Show saved customer prompt if available */}
        {showSavedCustomer && identifier && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-green-800">
              Welcome back! Is this you? <strong>{identifier}</strong>
            </p>
            <button
              onClick={() => {
                setShowSavedCustomer(false);
                setIdentifier('');
              }}
              className="text-sm text-green-600 hover:text-green-800 underline mt-1"
            >
              Not me, use different details
            </button>
          </div>
        )}

        {/* Identification Method Toggle */}
        <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
          <button
            type="button"
            onClick={() => {
              setIdentificationMethod('email');
              if (!showSavedCustomer) setIdentifier('');
              setError('');
            }}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md transition-colors ${
              identificationMethod === 'email'
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Mail className="h-4 w-4" />
            Email
          </button>
          <button
            type="button"
            onClick={() => {
              setIdentificationMethod('phone');
              setIdentifier('');
              setError('');
              setShowSavedCustomer(false);
            }}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md transition-colors ${
              identificationMethod === 'phone'
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Phone className="h-4 w-4" />
            Phone
          </button>
        </div>

        {/* Input Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {identificationMethod === 'email' ? 'Email Address' : 'Phone Number'}
          </label>
          <input
            type={identificationMethod === 'email' ? 'email' : 'tel'}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={identificationMethod === 'email' ? 'your@email.com' : '0400 000 000'}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
            autoFocus
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={handleSearch}
            disabled={isSearching}
            className="w-full"
          >
            {isSearching ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Searching...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Search className="h-4 w-4" />
                Find My Details
              </span>
            )}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>

          <Button
            onClick={onNewCustomer}
            variant="outline"
            className="w-full"
          >
            I'm a New Customer
          </Button>
        </div>

        {/* Privacy Note */}
        <p className="text-xs text-gray-500 text-center">
          We use your information only to find your booking history and provide a better experience.
          Your data is secure and never shared.
        </p>
      </div>
    </div>
  );
}