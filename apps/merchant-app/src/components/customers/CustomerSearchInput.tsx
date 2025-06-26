"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, Loader2, User, Phone, Mail, Plus } from 'lucide-react';
import { Input } from '@heya-pos/ui';
import { cn } from '@heya-pos/ui';
import { apiClient } from '@/lib/api-client';

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  name?: string;
  phone: string;
  mobile?: string;
  email?: string;
  visitCount?: number;
  totalSpent?: number;
}

interface CustomerSearchInputProps {
  value?: Customer | null;
  onSelect: (customer: Customer | null) => void;
  onCreateNew?: () => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  // Optional: Pass in pre-loaded customers for offline fallback
  fallbackCustomers?: Customer[];
}

export function CustomerSearchInput({
  value,
  onSelect,
  onCreateNew,
  placeholder = "Search customers by name, phone, or email...",
  className,
  disabled = false,
  autoFocus = false,
  fallbackCustomers = []
}: CustomerSearchInputProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [hasMoreResults, setHasMoreResults] = useState(false);

  // Search customers using the dedicated search endpoint
  const searchCustomers = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      setHasMoreResults(false);
      return;
    }

    setIsSearching(true);
    // Clear any existing results before starting new search
    setSearchResults([]);
    try {
      console.log('🔍 CustomerSearchInput: Starting search for:', query);
      console.log('🔍 CustomerSearchInput: apiClient available?', !!apiClient);
      console.log('🔍 CustomerSearchInput: apiClient.searchCustomers available?', !!apiClient?.searchCustomers);
      
      // Use the dedicated search endpoint for better performance
      const response = await apiClient.searchCustomers(query);
      
      console.log('✅ CustomerSearchInput: API call succeeded, response:', response);
      
      const results = response?.data || [];
      
      // Normalize customer names if needed
      const normalizedResults = results.map((customer: any) => ({
        ...customer,
        name: customer.name || `${customer.firstName || ''} ${customer.lastName || ''}`.trim()
      }));
      
      setSearchResults(normalizedResults);
      setHasMoreResults(response?.hasMore || false);
    } catch (error: any) {
      console.error('❌ CustomerSearchInput: Customer search failed:', error);
      console.error('❌ CustomerSearchInput: Error details:', {
        message: error?.message,
        stack: error?.stack,
        response: error?.response,
        config: error?.config
      });
      // Fall back to filtering provided customers
      console.log('⚠️ CustomerSearchInput: Falling back to filtering', fallbackCustomers.length, 'pre-loaded customers');
      const filtered = fallbackCustomers.filter(c => {
        const name = c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim();
        return name.toLowerCase().includes(query.toLowerCase()) ||
               (c.mobile || c.phone || '').includes(query) ||
               (c.email || '').toLowerCase().includes(query.toLowerCase());
      });
      setSearchResults(filtered);
      setHasMoreResults(false);
    } finally {
      setIsSearching(false);
    }
  }, [fallbackCustomers]);

  // Debounced search
  useEffect(() => {
    console.log('🔄 CustomerSearchInput useEffect triggered:', { searchQuery, value: !!value });
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery && !value) {
      console.log('🟢 Setting up search for:', searchQuery);
      setShowDropdown(true);
      // Clear previous results immediately when query changes
      setSearchResults([]);
      searchTimeoutRef.current = setTimeout(() => {
        console.log('⏰ Timeout fired, searching for:', searchQuery);
        searchCustomers(searchQuery);
      }, 300);
    } else if (!searchQuery) {
      console.log('🔴 Clearing search');
      setSearchResults([]);
      setShowDropdown(false);
    } else {
      console.log('🟡 Skipping search (value is set)');
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, value, searchCustomers]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || searchResults.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < searchResults.length) {
          handleSelect(searchResults[highlightedIndex]);
        } else if (highlightedIndex === -1 && onCreateNew && searchQuery.length >= 2) {
          onCreateNew();
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleSelect = (customer: Customer) => {
    onSelect(customer);
    setSearchQuery('');
    setSearchResults([]); // Clear search results after selection
    setShowDropdown(false);
    setHighlightedIndex(-1);
  };

  const handleClear = () => {
    onSelect(null);
    setSearchQuery('');
    setSearchResults([]);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const formatCustomerDisplay = (customer: Customer) => {
    const name = customer.name || `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
    const phone = customer.mobile || customer.phone;
    return `${name} - ${phone}`;
  };

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          ref={inputRef}
          type="text"
          value={value ? formatCustomerDisplay(value) : searchQuery}
          onChange={(e) => {
            if (value) {
              handleClear();
            }
            setSearchQuery(e.target.value);
          }}
          onFocus={() => {
            if (!value && searchQuery.length >= 2) {
              setShowDropdown(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          className={cn(
            "pl-9 pr-9",
            value && "bg-teal-50"
          )}
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
        )}
        {value && !isSearching && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showDropdown && (
        <div 
          key={searchQuery}
          className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-80 overflow-y-auto">
          {searchQuery.length < 2 ? (
            <div className="px-4 py-3 text-sm text-gray-500">
              Type at least 2 characters to search...
            </div>
          ) : isSearching ? (
            <div className="px-4 py-3 text-sm text-gray-500 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching for "{searchQuery}"...
            </div>
          ) : searchResults.length === 0 ? (
            <div className="px-4 py-3">
              <div className="text-sm text-gray-500">No customers found</div>
              {onCreateNew && (
                <button
                  type="button"
                  onClick={onCreateNew}
                  className={cn(
                    "mt-2 w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md",
                    "bg-teal-50 text-teal-700 hover:bg-teal-100",
                    highlightedIndex === -1 && "ring-2 ring-teal-500"
                  )}
                >
                  <Plus className="h-4 w-4" />
                  Create new customer "{searchQuery}"
                </button>
              )}
            </div>
          ) : (
            <>
              {onCreateNew && (
                <button
                  type="button"
                  onClick={onCreateNew}
                  className={cn(
                    "w-full flex items-center gap-2 px-4 py-3 text-sm border-b",
                    "hover:bg-gray-50",
                    highlightedIndex === -1 && "bg-gray-100"
                  )}
                >
                  <Plus className="h-4 w-4 text-teal-600" />
                  <span className="text-teal-700">Create new customer "{searchQuery}"</span>
                </button>
              )}
              {searchResults.slice().map((customer, index) => {
                const name = customer.name || `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
                const phone = customer.mobile || customer.phone;
                const isHighlighted = index === highlightedIndex;
                
                return (
                  <button
                    key={`${searchQuery}-${customer.id}`}
                    type="button"
                    onClick={() => handleSelect(customer)}
                    className={cn(
                      "w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left",
                      isHighlighted && "bg-gray-100"
                    )}
                  >
                    <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900">{name}</div>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        {phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {phone}
                          </span>
                        )}
                        {customer.email && (
                          <span className="flex items-center gap-1 truncate">
                            <Mail className="h-3 w-3" />
                            {customer.email}
                          </span>
                        )}
                      </div>
                      {customer.visitCount !== undefined && (
                        <div className="text-xs text-gray-400 mt-1">
                          {customer.visitCount} visits • ${customer.totalSpent || 0} spent
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
              <div className="px-4 py-2 text-xs text-gray-400 border-t">
                Found {searchResults.length} customers
                {hasMoreResults && (
                  <span className="text-amber-600 ml-1">
                    (showing most relevant - refine search for more)
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}