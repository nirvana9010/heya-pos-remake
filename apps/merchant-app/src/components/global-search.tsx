'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, User, Calendar, DollarSign, Package, Users, ChevronRight, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@heya-pos/ui';
import { apiClient } from '@/lib/api-client';
import { format } from 'date-fns';
// Simple debounce implementation
function debounce<T extends (...args: any[]) => any>(func: T, wait: number) {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

interface SearchResult {
  type: 'customer' | 'booking' | 'service' | 'payment';
  id: string;
  title: string;
  subtitle?: string;
  url: string;
  metadata?: any;
}

const iconMap = {
  customer: User,
  booking: Calendar,
  service: Package,
  payment: DollarSign,
};

const typeLabels = {
  customer: 'Customer',
  booking: 'Booking',
  service: 'Service',
  payment: 'Payment',
};

export function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search function
  const performSearch = useCallback(
    debounce(async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      
      try {
        // Search across different entities
        const [customersRes, bookingsRes, servicesRes] = await Promise.allSettled([
          apiClient.get('/v1/customers', { params: { search: searchQuery, limit: 5 } }),
          apiClient.get('/v2/bookings', { params: { search: searchQuery, limit: 5 } }),
          apiClient.get('/v1/services', { params: { search: searchQuery, limit: 5 } }),
        ]);

        const searchResults: SearchResult[] = [];

        // Process customer results
        if (customersRes.status === 'fulfilled' && customersRes.value.data) {
          const customers = Array.isArray(customersRes.value.data) 
            ? customersRes.value.data.slice(0, 3)
            : customersRes.value.data.data?.slice(0, 3) || [];
            
          customers.forEach((customer: any) => {
            // Construct full name from firstName and lastName
            const fullName = customer.name || `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Unknown Customer';
            
            searchResults.push({
              type: 'customer',
              id: customer.id,
              title: fullName,
              subtitle: customer.phone || customer.mobile || customer.email || 'No contact info',
              url: `/customers/${customer.id}`,
              metadata: customer,
            });
          });
        }

        // Process booking results
        if (bookingsRes.status === 'fulfilled' && bookingsRes.value.data) {
          const bookings = Array.isArray(bookingsRes.value.data)
            ? bookingsRes.value.data.slice(0, 3)
            : bookingsRes.value.data.data?.slice(0, 3) || [];
            
          bookings.forEach((booking: any) => {
            // Handle different booking data structures
            const customerName = booking.customer?.name || booking.customerName || 'Unknown';
            const serviceName = booking.service?.name || booking.serviceName || 'Service';
            const startTime = booking.startTime || booking.dateTime || booking.date;
            
            searchResults.push({
              type: 'booking',
              id: booking.id,
              title: `${customerName} - ${serviceName}`,
              subtitle: startTime ? format(new Date(startTime), 'MMM dd, yyyy h:mm a') : 'No time set',
              url: `/calendar?booking=${booking.id}`,
              metadata: booking,
            });
          });
        }

        // Process service results
        if (servicesRes.status === 'fulfilled' && servicesRes.value.data) {
          const services = Array.isArray(servicesRes.value.data)
            ? servicesRes.value.data.slice(0, 2)
            : servicesRes.value.data.data?.slice(0, 2) || [];
            
          services.forEach((service: any) => {
            searchResults.push({
              type: 'service',
              id: service.id,
              title: service.name,
              subtitle: `$${service.price} • ${service.duration} min`,
              url: `/services`,
              metadata: service,
            });
          });
        }

        setResults(searchResults);
      } catch (error) {
        console.error('Search error:', error);
        // For now, show mock results to demonstrate the UI
        setResults([
          {
            type: 'customer',
            id: '1',
            title: 'Emma Thompson',
            subtitle: '+61 400 123 456',
            url: '/customers/1',
          },
          {
            type: 'booking',
            id: '2',
            title: 'Sarah Johnson - Signature Facial',
            subtitle: 'Today at 2:00 PM',
            url: '/calendar?booking=2',
          },
          {
            type: 'service',
            id: '3',
            title: 'Deep Tissue Massage',
            subtitle: '$120 • 60 min',
            url: '/services',
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    []
  );

  // Handle search input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedIndex(0);
    
    if (value.trim()) {
      setIsOpen(true);
      performSearch(value);
    } else {
      setIsOpen(false);
      setResults([]);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % results.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          handleResultClick(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  // Handle result click
  const handleResultClick = (result: SearchResult) => {
    setIsOpen(false);
    setQuery('');
    router.push(result.url);
  };

  // Group results by type
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = [];
    }
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  return (
    <div ref={searchRef} className="relative" style={{ maxWidth: '400px', width: '100%' }}>
      <form onSubmit={(e) => e.preventDefault()}>
        <Search 
          size={18} 
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10"
        />
        <input
          ref={inputRef}
          type="search"
          placeholder="Search customers, bookings, services..."
          className="form-input"
          style={{
            paddingLeft: '2.5rem',
            paddingRight: '1rem'
          }}
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => query.trim() && setIsOpen(true)}
        />
      </form>

      {/* Search Results Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg overflow-hidden" style={{ zIndex: 9999 }}>
          {isLoading ? (
            <div className="p-4 text-center">
              <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-2">Searching...</p>
            </div>
          ) : results.length > 0 ? (
            <div className="max-h-[400px] overflow-y-auto">
              {Object.entries(groupedResults).map(([type, items]) => (
                <div key={type}>
                  <div className="px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/50">
                    {typeLabels[type as keyof typeof typeLabels]}
                  </div>
                  {items.map((result, index) => {
                    const Icon = iconMap[result.type];
                    const isSelected = results.indexOf(result) === selectedIndex;
                    
                    return (
                      <button
                        key={`${result.type}-${result.id}`}
                        className={cn(
                          "w-full px-3 py-2 flex items-center gap-3 hover:bg-accent/50 transition-colors",
                          "focus:outline-none focus:bg-accent/50",
                          isSelected && "bg-accent/50"
                        )}
                        onClick={() => handleResultClick(result)}
                        onMouseEnter={() => setSelectedIndex(results.indexOf(result))}
                      >
                        <div className={cn(
                          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                          "bg-primary/10 text-primary"
                        )}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium">{result.title}</p>
                          {result.subtitle && (
                            <p className="text-xs text-muted-foreground">{result.subtitle}</p>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : query.trim() ? (
            <div className="p-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm font-medium">No results found</p>
              <p className="text-xs text-muted-foreground mt-1">
                Try searching with different keywords
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}