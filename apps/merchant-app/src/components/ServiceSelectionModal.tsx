import React, { useState, useMemo } from 'react';
import { X, Search, Clock, DollarSign, Plus } from 'lucide-react';
import { Button, Input, Badge } from '@heya-pos/ui';
import { cn } from '@heya-pos/ui';

interface ServiceSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  services: any[];
  onSelectService: (service: any) => void;
}

export const ServiceSelectionModal: React.FC<ServiceSelectionModalProps> = ({
  isOpen,
  onClose,
  services,
  onSelectService,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Extract unique categories from services
  const categories = useMemo(() => {
    const uniqueCategories = new Map();
    services.forEach(service => {
      if (service.categoryId && service.categoryName) {
        uniqueCategories.set(service.categoryId, service.categoryName);
      }
    });
    return Array.from(uniqueCategories, ([id, name]) => ({ id, name }));
  }, [services]);

  // Filter services based on search and category
  const filteredServices = useMemo(() => {
    return services.filter(service => {
      const matchesSearch = searchQuery === '' || 
        service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (service.description && service.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'all' || 
        service.categoryId === selectedCategory;
      
      return matchesSearch && matchesCategory && service.isActive;
    });
  }, [services, searchQuery, selectedCategory]);

  const handleSelectService = (service: any) => {
    onSelectService(service);
    // Reset search after selection for better UX
    setSearchQuery('');
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-gray-900 bg-opacity-50 z-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="bg-white w-full sm:max-w-2xl h-full sm:h-[80vh] sm:rounded-lg shadow-xl flex flex-col animate-slide-up sm:animate-fade-in">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b px-4 py-3 sm:px-6 sm:py-4 z-10">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                Select Service
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            {/* Search */}
            <div className="mt-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search services..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  autoFocus
                />
              </div>
            </div>
            
            {/* Category filters */}
            <div className="mt-3 flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
              <Badge
                variant={selectedCategory === 'all' ? 'default' : 'secondary'}
                className={cn(
                  "cursor-pointer whitespace-nowrap",
                  selectedCategory === 'all' 
                    ? 'bg-teal-600 text-white hover:bg-teal-700' 
                    : 'hover:bg-gray-200'
                )}
                onClick={() => setSelectedCategory('all')}
              >
                All Services ({services.filter(s => s.isActive).length})
              </Badge>
              {categories.map(cat => (
                <Badge
                  key={cat.id}
                  variant={selectedCategory === cat.id ? 'default' : 'secondary'}
                  className={cn(
                    "cursor-pointer whitespace-nowrap",
                    selectedCategory === cat.id 
                      ? 'bg-teal-600 text-white hover:bg-teal-700' 
                      : 'hover:bg-gray-200'
                  )}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  {cat.name}
                </Badge>
              ))}
            </div>
          </div>

          {/* Service List */}
          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            {filteredServices.length === 0 ? (
              <div className="text-center py-12">
                <Search className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">No services found</p>
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchQuery('')}
                    className="mt-2"
                  >
                    Clear search
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredServices.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => handleSelectService(service)}
                    className="w-full p-4 text-left bg-white border border-gray-200 rounded-lg hover:border-teal-300 hover:bg-teal-50 transition-all group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900 group-hover:text-teal-700 truncate">
                            {service.name}
                          </h4>
                          {service.categoryName && (
                            <Badge variant="secondary" className="text-xs">
                              {service.categoryName}
                            </Badge>
                          )}
                        </div>
                        {service.description && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{service.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="flex items-center gap-1 text-gray-700 font-medium">
                            <DollarSign className="h-3 w-3" />
                            {service.price.toFixed(2)}
                          </span>
                          {service.duration && (
                            <span className="flex items-center gap-1 text-gray-600">
                              <Clock className="h-3 w-3" />
                              {service.duration} min
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-teal-100 group-hover:bg-teal-600 flex items-center justify-center transition-colors">
                          <Plus className="h-5 w-5 text-teal-600 group-hover:text-white" />
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};