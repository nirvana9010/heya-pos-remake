"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Plus, Search, MoreVertical, Edit, Trash2, DollarSign, Clock, AlertCircle, 
  Sparkles, Scissors, Hand, Palette, Copy, ChevronDown, ChevronRight, 
  TrendingUp, Package, DollarSign as Dollar, Users, Calendar, FileText,
  Percent, Grid3X3, Zap, CheckCircle, XCircle, Heart, Star, Crown, Flower, Sun, Moon,
  Check, ArrowRight, Info, X
} from "lucide-react";
import { Button } from "@heya-pos/ui";
import { Input } from "@heya-pos/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@heya-pos/ui";
import { Badge } from "@heya-pos/ui";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@heya-pos/ui";
import { Label } from "@heya-pos/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@heya-pos/ui";
import { Textarea } from "@heya-pos/ui";
import { cn } from "@heya-pos/ui";
import { Alert, AlertDescription, AlertTitle } from "@heya-pos/ui";
import { Switch } from "@heya-pos/ui";
import { Checkbox } from "@heya-pos/ui";
// Removed unused Collapsible imports
import { type Service, type ServiceCategory } from "@heya-pos/shared";
import { apiClient } from '@/lib/api-client';
import { useToast } from "@heya-pos/ui";
import { SlideOutPanel } from '@/components/SlideOutPanel';
import { format } from 'date-fns';
import CategoryDialog from '@/components/CategoryDialog';

// Mock staff data
const mockStaff = [
  { id: "1", name: "Emma Wilson", services: ["1", "3", "5"] },
  { id: "2", name: "James Brown", services: ["2", "4", "6"] },
  { id: "3", name: "Sophie Chen", services: ["1", "2", "3", "4"] },
  { id: "4", name: "Michael Davis", services: ["5", "6"] },
];

export default function ServicesPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingServiceId, setDeletingServiceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<'price' | 'status'>('price');
  const [priceAdjustment, setPriceAdjustment] = useState({ type: 'percentage', value: 10 });
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);
  const [newCategoryId, setNewCategoryId] = useState<string | null>(null);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [savingService, setSavingService] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    categoryId: '',
    duration: 30,
    price: 0,
    isActive: true,
    staffNotes: '',
    dependencies: [] as string[]
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Expand all categories by default
    if (categories.length > 0) {
      setExpandedCategories(['All', ...categories.map(c => c.name)]);
    }
  }, [categories]);

  useEffect(() => {
    // Auto-hide success banner after 5 seconds
    if (showSuccessBanner) {
      const timer = setTimeout(() => {
        setShowSuccessBanner(false);
        setNewCategoryId(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessBanner]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [servicesData, categoriesData] = await Promise.all([
        apiClient.getServices(),
        apiClient.getCategories()
      ]);
      setServices(servicesData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast({
        title: "Error",
        description: "Failed to load services",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Group services by category
  const servicesByCategory = useMemo(() => {
    const grouped: Record<string, Service[]> = { 'Uncategorized': [] };
    
    categories.forEach(category => {
      grouped[category.name] = [];
    });
    
    services.forEach(service => {
      const categoryName = service.categoryName || 'Uncategorized';
      if (!grouped[categoryName]) {
        grouped[categoryName] = [];
      }
      grouped[categoryName].push(service);
    });
    
    // Remove empty categories
    Object.keys(grouped).forEach(key => {
      if (grouped[key].length === 0 && key !== 'Uncategorized') {
        delete grouped[key];
      }
    });
    
    return grouped;
  }, [services, categories]);

  // Calculate stats
  const stats = useMemo(() => {
    const activeServices = services.filter(s => s.isActive);
    const totalPrice = activeServices.reduce((sum, s) => sum + s.price, 0);
    const avgPrice = activeServices.length > 0 ? totalPrice / activeServices.length : 0;
    
    return {
      totalServices: services.length,
      activeServices: activeServices.length,
      totalCategories: Object.keys(servicesByCategory).length,
      averagePrice: avgPrice
    };
  }, [services, servicesByCategory]);

  // Filter services
  const filteredServicesByCategory = useMemo(() => {
    if (!searchQuery) return servicesByCategory;
    
    const filtered: Record<string, Service[]> = {};
    
    Object.entries(servicesByCategory).forEach(([category, categoryServices]) => {
      const filteredServices = categoryServices.filter(service =>
        service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (service.description?.toLowerCase().includes(searchQuery.toLowerCase()) || false)
      );
      
      if (filteredServices.length > 0) {
        filtered[category] = filteredServices;
      }
    });
    
    return filtered;
  }, [servicesByCategory, searchQuery]);

  // Helper function to get category icon
  const getCategoryIcon = (categoryName: string) => {
    const category = categories.find(c => c.name === categoryName);
    if (category?.icon) {
      const iconMap: Record<string, any> = {
        'Scissors': Scissors,
        'Palette': Palette,
        'Sparkles': Sparkles,
        'Heart': Heart,
        'Star': Star,
        'Crown': Crown,
        'Flower': Flower,
        'Sun': Sun,
        'Moon': Moon,
        'Zap': Zap,
        'Hand': Hand
      };
      const IconComponent = iconMap[category.icon];
      if (IconComponent) {
        return <IconComponent className="h-4 w-4" />;
      }
    }
    
    // Fallback icons
    switch (categoryName?.toLowerCase()) {
      case 'facials': return <Sparkles className="h-4 w-4" />;
      case 'massages': return <Hand className="h-4 w-4" />;
      case 'nails': return <Palette className="h-4 w-4" />;
      case 'hair': return <Scissors className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  // Helper function to get category colors
  const getCategoryColors = (categoryName: string) => {
    const category = categories.find(c => c.name === categoryName);
    if (category?.color) {
      // Convert hex color to Tailwind-like classes
      const colorMap: Record<string, { bg: string; text: string; light: string; border: string }> = {
        '#8B5CF6': { bg: 'bg-purple-500', text: 'text-white', light: 'bg-purple-50', border: 'border-purple-200' },
        '#EC4899': { bg: 'bg-pink-500', text: 'text-white', light: 'bg-pink-50', border: 'border-pink-200' },
        '#EF4444': { bg: 'bg-red-500', text: 'text-white', light: 'bg-red-50', border: 'border-red-200' },
        '#F59E0B': { bg: 'bg-amber-500', text: 'text-white', light: 'bg-amber-50', border: 'border-amber-200' },
        '#10B981': { bg: 'bg-emerald-500', text: 'text-white', light: 'bg-emerald-50', border: 'border-emerald-200' },
        '#3B82F6': { bg: 'bg-blue-500', text: 'text-white', light: 'bg-blue-50', border: 'border-blue-200' },
        '#6366F1': { bg: 'bg-indigo-500', text: 'text-white', light: 'bg-indigo-50', border: 'border-indigo-200' },
        '#84CC16': { bg: 'bg-lime-500', text: 'text-white', light: 'bg-lime-50', border: 'border-lime-200' },
        '#06B6D4': { bg: 'bg-cyan-500', text: 'text-white', light: 'bg-cyan-50', border: 'border-cyan-200' },
        '#F97316': { bg: 'bg-orange-500', text: 'text-white', light: 'bg-orange-50', border: 'border-orange-200' }
      };
      
      const colors = colorMap[category.color];
      if (colors) return colors;
    }
    
    // Fallback colors
    switch (categoryName?.toLowerCase()) {
      case 'facials': return { bg: 'bg-purple-500', text: 'text-white', light: 'bg-purple-50', border: 'border-purple-200' };
      case 'massages': return { bg: 'bg-teal-500', text: 'text-white', light: 'bg-teal-50', border: 'border-teal-200' };
      case 'nails': return { bg: 'bg-amber-500', text: 'text-white', light: 'bg-amber-50', border: 'border-amber-200' };
      case 'hair': return { bg: 'bg-rose-500', text: 'text-white', light: 'bg-rose-50', border: 'border-rose-200' };
      default: return { bg: 'bg-gray-500', text: 'text-white', light: 'bg-gray-50', border: 'border-gray-200' };
    }
  };

  // Get category initial
  const getCategoryInitial = (categoryName: string) => {
    return categoryName ? categoryName.charAt(0).toUpperCase() : 'U';
  };

  // Get staff count for a service
  const getStaffCount = (serviceId: string) => {
    return mockStaff.filter(staff => staff.services.includes(serviceId)).length;
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const toggleServiceSelection = (serviceId: string) => {
    setSelectedServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const selectAllInCategory = (categoryServices: Service[]) => {
    const categoryServiceIds = categoryServices.map(s => s.id);
    const allSelected = categoryServiceIds.every(id => selectedServices.includes(id));
    
    if (allSelected) {
      setSelectedServices(prev => prev.filter(id => !categoryServiceIds.includes(id)));
    } else {
      setSelectedServices(prev => [...new Set([...prev, ...categoryServiceIds])]);
    }
  };

  const handleBulkPriceUpdate = async () => {
    if (selectedServices.length === 0) return;
    
    try {
      const updates = selectedServices.map(async (serviceId) => {
        const service = services.find(s => s.id === serviceId);
        if (!service) return;
        
        let newPrice = service.price;
        if (priceAdjustment.type === 'percentage') {
          newPrice = service.price * (1 + priceAdjustment.value / 100);
        } else {
          newPrice = service.price + priceAdjustment.value;
        }
        
        return apiClient.updateService(serviceId, { price: Math.round(newPrice * 100) / 100 });
      });
      
      await Promise.all(updates);
      
      toast({
        title: "Success",
        description: `Updated prices for ${selectedServices.length} services`,
      });
      
      await loadData();
      setSelectedServices([]);
      setIsBulkEditOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update prices",
        variant: "destructive",
      });
    }
  };

  const handleDuplicateService = async (service: Service) => {
    try {
      const duplicatedService = {
        name: `${service.name} (Copy)`,
        description: service.description,
        categoryId: service.categoryId,
        duration: service.duration,
        price: service.price,
        isActive: false // Set as inactive by default
      };
      
      await apiClient.createService(duplicatedService);
      
      toast({
        title: "Success",
        description: "Service duplicated successfully",
      });
      
      await loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to duplicate service",
        variant: "destructive",
      });
    }
  };

  const handleDeleteService = async () => {
    if (!deletingServiceId) return;
    
    try {
      await apiClient.deleteService(deletingServiceId);
      toast({
        title: "Success",
        description: "Service deleted successfully",
      });
      await loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete service",
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setDeletingServiceId(null);
    }
  };

  const handleSaveService = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Service name is required",
        variant: "destructive",
      });
      return;
    }

    setSavingService(true);
    try {
      const serviceData = {
        name: formData.name,
        description: formData.description,
        categoryId: formData.categoryId || undefined,
        duration: formData.duration,
        price: formData.price,
        isActive: formData.isActive
      };

      if (editingService) {
        await apiClient.updateService(editingService.id, serviceData);
        toast({
          title: "Success",
          description: "Service updated successfully",
        });
      } else {
        await apiClient.createService(serviceData);
        toast({
          title: "Success",
          description: "Service created successfully",
        });
      }
      await loadData();
      setIsAddDialogOpen(false);
      setEditingService(null);
      resetForm();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save service",
        variant: "destructive",
      });
    } finally {
      setSavingService(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      categoryId: '',
      duration: 30,
      price: 0,
      isActive: true,
      staffNotes: '',
      dependencies: []
    });
  };

  const openEditDialog = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      categoryId: service.categoryId || '',
      duration: service.duration,
      price: service.price,
      isActive: service.isActive,
      staffNotes: '',
      dependencies: []
    });
    setIsAddDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="container max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-3">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground">Loading services...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container max-w-7xl mx-auto p-6 space-y-6">
        {/* Enhanced Header Section */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Services</h1>
              <p className="text-lg text-gray-600 mt-1">Your service menu and pricing</p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => setIsCategoryDialogOpen(true)} 
                variant="outline"
                size="lg"
              >
                <Plus className="mr-2 h-5 w-5" />
                Add Category
              </Button>
              <Button 
                onClick={() => {
                  resetForm();
                  setIsAddDialogOpen(true);
                }} 
                className="bg-purple-600 hover:bg-purple-700 text-white shadow-md"
                size="lg"
              >
                <Plus className="mr-2 h-5 w-5" />
                Add Service
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Services</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalServices}</p>
                  </div>
                  <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Package className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Categories</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalCategories}</p>
                  </div>
                  <div className="h-12 w-12 bg-teal-100 rounded-lg flex items-center justify-center">
                    <Grid3X3 className="h-6 w-6 text-teal-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Average Price</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">${stats.averagePrice.toFixed(2)}</p>
                  </div>
                  <div className="h-12 w-12 bg-amber-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Services</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stats.activeServices}</p>
                  </div>
                  <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Success Banner */}
        {showSuccessBanner && (
          <div className={`transform transition-all duration-500 ${showSuccessBanner ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
            <div className="bg-green-50 border border-green-200 rounded-lg shadow-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Check className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-medium text-green-900">
                    {successMessage}
                  </h3>
                  <div className="mt-2 flex items-center gap-4">
                    <Button
                      size="sm"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, categoryId: newCategoryId || '' }));
                        setIsAddDialogOpen(true);
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Service to Category
                    </Button>
                    <button
                      onClick={() => setShowSuccessBanner(false)}
                      className="text-sm text-green-600 hover:text-green-700 font-medium"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search and Bulk Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                placeholder="Search services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {selectedServices.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {selectedServices.length} selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setBulkAction('price');
                    setIsBulkEditOpen(true);
                  }}
                >
                  <Percent className="h-4 w-4 mr-2" />
                  Bulk Price Update
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedServices([])}
                >
                  Clear Selection
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Services by Category */}
        <div className="space-y-4">
          {Object.entries(filteredServicesByCategory).map(([categoryName, categoryServices]) => {
            const colors = getCategoryColors(categoryName);
            const isExpanded = expandedCategories.includes(categoryName);
            const categoryStats = {
              total: categoryServices.length,
              active: categoryServices.filter(s => s.isActive).length,
              totalPrice: categoryServices.reduce((sum, s) => sum + s.price, 0),
              avgPrice: categoryServices.length > 0 
                ? categoryServices.reduce((sum, s) => sum + s.price, 0) / categoryServices.length 
                : 0
            };
            
            const category = categories.find(c => c.name === categoryName);
            const isNewCategory = category && newCategoryId === category.id;
            
            return (
              <div key={categoryName} className={cn(
                "bg-white rounded-lg shadow-sm border transition-all duration-500",
                isNewCategory ? "border-green-400 ring-2 ring-green-100 animate-pulse-once" : "border-gray-200"
              )}>
                {/* Category Header */}
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleCategory(categoryName)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", colors.bg, colors.text)}>
                        {getCategoryIcon(categoryName)}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                          {categoryName}
                          <Badge variant="secondary" className="text-xs">
                            {categoryStats.total}
                          </Badge>
                        </h3>
                        <p className="text-sm text-gray-600">
                          {categoryStats.active} active • Avg ${categoryStats.avgPrice.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {categoryName !== 'Uncategorized' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => {
                              const category = categories.find(c => c.name === categoryName);
                              if (category) {
                                setEditingCategory(category);
                                setIsCategoryDialogOpen(true);
                              }
                            }}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Category
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={async () => {
                                const category = categories.find(c => c.name === categoryName);
                                if (category && window.confirm('Are you sure you want to delete this category?')) {
                                  try {
                                    await apiClient.deleteCategory(category.id);
                                    toast({
                                      title: "Success",
                                      description: "Category deleted successfully",
                                    });
                                    await loadData();
                                  } catch (error) {
                                    toast({
                                      title: "Error",
                                      description: "Failed to delete category",
                                      variant: "destructive",
                                    });
                                  }
                                }
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Category
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                      <Checkbox
                        checked={categoryServices.every(s => selectedServices.includes(s.id))}
                        onCheckedChange={() => selectAllInCategory(categoryServices)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Category Services */}
                {isExpanded && (
                  <div className="border-t border-gray-200">
                    {categoryServices.length === 0 ? (
                      <div className="p-8 text-center">
                        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                          <Info className="h-8 w-8 text-gray-400" />
                        </div>
                        <h4 className="text-lg font-medium text-gray-900 mb-2">No services in this category yet</h4>
                        <p className="text-sm text-gray-600 mb-4">
                          Start by adding services to organize your service menu.
                        </p>
                        <Button 
                          onClick={() => {
                            setFormData(prev => ({ ...prev, categoryId: category?.id || '' }));
                            setIsAddDialogOpen(true);
                          }}
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add First Service
                        </Button>
                      </div>
                    ) : (
                      <div className="grid gap-0 divide-y divide-gray-200">
                        {categoryServices.map((service) => {
                        const staffCount = getStaffCount(service.id);
                        const isSelected = selectedServices.includes(service.id);
                        
                        return (
                          <div
                            key={service.id}
                            className={cn(
                              "p-4 hover:bg-gray-50 transition-colors",
                              isSelected && "bg-purple-50",
                              !service.isActive && "opacity-60"
                            )}
                          >
                            <div className="flex items-start gap-4">
                              {/* Selection Checkbox */}
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleServiceSelection(service.id)}
                                className="mt-1"
                              />
                              
                              {/* Category Initial */}
                              <div className={cn("h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0 text-lg font-bold", colors.light, colors.border, "border")}>
                                {getCategoryInitial(categoryName)}
                              </div>
                              
                              {/* Service Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1">
                                    <h4 className="text-base font-semibold text-gray-900">
                                      {service.name}
                                    </h4>
                                    {service.description && (
                                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                        {service.description}
                                      </p>
                                    )}
                                    <div className="flex items-center gap-4 mt-2 text-sm">
                                      <span className="flex items-center gap-1 text-gray-600">
                                        <Clock className="h-4 w-4" />
                                        {service.duration} min
                                      </span>
                                      <span className="flex items-center gap-1 text-gray-600">
                                        <Users className="h-4 w-4" />
                                        {staffCount} staff
                                      </span>
                                      {!service.isActive && (
                                        <Badge variant="secondary" className="bg-red-100 text-red-700">
                                          Inactive
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Price and Actions */}
                                  <div className="flex items-start gap-3">
                                    <div className="text-right">
                                      <p className="text-2xl font-bold text-gray-900">
                                        ${service.price}
                                      </p>
                                    </div>
                                    
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                          <MoreVertical className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-48">
                                        <DropdownMenuItem onClick={() => openEditDialog(service)}>
                                          <Edit className="mr-2 h-4 w-4" />
                                          Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleDuplicateService(service)}>
                                          <Copy className="mr-2 h-4 w-4" />
                                          Duplicate
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem 
                                          onClick={() => {
                                            setDeletingServiceId(service.id);
                                            setIsDeleteDialogOpen(true);
                                          }}
                                          className="text-red-600"
                                        >
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          Delete
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {Object.keys(filteredServicesByCategory).length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Scissors className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No services found</h3>
            <p className="text-gray-600 mb-6">
              {searchQuery ? "Try adjusting your search terms" : "Get started by adding your first service"}
            </p>
            <Button 
              onClick={() => setIsAddDialogOpen(true)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Service
            </Button>
          </div>
        )}
      </div>
      
      {/* Premium Service Slide-Out Panel */}
      <SlideOutPanel
        isOpen={isAddDialogOpen}
        onClose={() => {
          setIsAddDialogOpen(false);
          setEditingService(null);
          resetForm();
        }}
        width="medium"
        preserveState={false}
        className="bg-gray-50"
      >
        {/* Premium Form Design */}
        <div className="relative h-full flex flex-col">
          {/* Sticky Header */}
          <div className="sticky top-0 z-20 bg-white border-b px-8 py-6 -mx-8 -mt-8">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">
                  {editingService ? 'Edit Service' : 'Create New Service'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {editingService 
                    ? 'Update the service details below'
                    : 'Add a new service to your menu'
                  }
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Switch
                  id="active"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="active" className="text-sm font-medium text-gray-700">
                  Active
                </Label>
                <button
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    setEditingService(null);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600 p-2 -mr-2"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Form Content with Sections */}
          <div className="flex-1 overflow-y-auto px-8 py-6 -mx-8">
            <div className="space-y-8 pb-20">
              {/* Basic Information Section */}
              <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
                <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wider">Basic Information</h3>
                
                <div>
                  <Label htmlFor="name" className="text-sm font-medium text-gray-700 mb-1.5 block">
                    Service Name <span className="text-red-500">*</span>
                  </Label>
                  <Input 
                    id="name" 
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Deep Tissue Massage"
                    className="w-full px-4 py-2.5 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    autoFocus
                  />
                </div>

                <div>
                  <Label htmlFor="category" className="text-sm font-medium text-gray-700 mb-1.5 block">
                    Category
                  </Label>
                  <Select 
                    value={formData.categoryId || "none"}
                    onValueChange={(value) => setFormData({ ...formData, categoryId: value === "none" ? "" : value })}
                  >
                    <SelectTrigger className="w-full px-4 py-2.5 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="bg-white shadow-lg border border-gray-200 rounded-lg">
                      <SelectItem value="none">No Category</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="description" className="text-sm font-medium text-gray-700 mb-1.5 block">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the service"
                    rows={3}
                    className="w-full px-4 py-2.5 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  />
                </div>
              </div>

              {/* Pricing & Duration Section */}
              <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
                <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wider">Pricing & Duration</h3>
                
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="duration" className="text-sm font-medium text-gray-700 mb-1.5 block">
                      Duration <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        value={formData.duration}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0;
                          setFormData({ ...formData, duration: Math.max(0, Math.min(240, value)) });
                        }}
                        min="0"
                        max="240"
                        step="5"
                        className="flex-1 px-4 py-2.5 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                      <Select value="minutes" disabled>
                        <SelectTrigger className="w-24 px-3 py-2.5 border-gray-300 rounded-lg bg-gray-50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="minutes">mins</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Use arrow keys or type (5-240 mins)</p>
                  </div>

                  <div>
                    <Label htmlFor="price" className="text-sm font-medium text-gray-700 mb-1.5 block">
                      Price <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
                      <Input
                        id="price"
                        type="text"
                        value={formData.price === 0 ? '' : formData.price}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
                            setFormData({ ...formData, price: value === '' ? 0 : parseFloat(value) || 0 });
                          }
                        }}
                        placeholder="0.00"
                        className="w-full pl-8 pr-4 py-2.5 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Settings Section */}
              <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
                <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wider">Additional Settings</h3>
                
                <div>
                  <Label htmlFor="staffNotes" className="text-sm font-medium text-gray-700 mb-1.5 block">
                    Staff Instructions
                  </Label>
                  <Textarea
                    id="staffNotes"
                    value={formData.staffNotes}
                    onChange={(e) => setFormData({ ...formData, staffNotes: e.target.value })}
                    placeholder="Special instructions or notes for staff performing this service"
                    rows={3}
                    className="w-full px-4 py-2.5 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">These notes will be visible to staff when viewing this service</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Footer */}
          <div className="sticky bottom-0 bg-white border-t px-8 py-4 -mx-8 -mb-8">
            <div className="flex items-center justify-between">
              <div>
                {editingService && (
                  <button
                    type="button"
                    onClick={() => {
                      setDeletingServiceId(editingService.id);
                      setIsDeleteDialogOpen(true);
                      setIsAddDialogOpen(false);
                    }}
                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    Delete Service
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost"
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    setEditingService(null);
                    resetForm();
                  }}
                  className="px-6"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveService}
                  disabled={!formData.name.trim() || formData.price <= 0 || savingService}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-2.5 font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {savingService ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {editingService ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    editingService ? 'Update Service' : 'Create Service'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </SlideOutPanel>
      
      {/* Bulk Edit Panel */}
      <SlideOutPanel
        isOpen={isBulkEditOpen}
        onClose={() => {
          setIsBulkEditOpen(false);
          setPriceAdjustment({ type: 'percentage', value: 10 });
        }}
        title="Bulk Price Update"
        subtitle={`Update prices for ${selectedServices.length} selected services`}
        width="narrow"
        preserveState={false}
        footer={
          <div className="flex justify-end space-x-3">
            <Button 
              variant="outline" 
              onClick={() => setIsBulkEditOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleBulkPriceUpdate}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Update Prices
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <Label>Adjustment Type</Label>
            <Select 
              value={priceAdjustment.type}
              onValueChange={(value: 'percentage' | 'amount') => 
                setPriceAdjustment({ ...priceAdjustment, type: value })
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Percentage</SelectItem>
                <SelectItem value="amount">Fixed Amount</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="adjustmentValue">
              {priceAdjustment.type === 'percentage' ? 'Percentage (%)' : 'Amount ($)'}
            </Label>
            <Input
              id="adjustmentValue"
              type="number"
              value={priceAdjustment.value}
              onChange={(e) => setPriceAdjustment({ 
                ...priceAdjustment, 
                value: parseFloat(e.target.value) || 0 
              })}
              min={priceAdjustment.type === 'percentage' ? -100 : undefined}
              step={priceAdjustment.type === 'percentage' ? 1 : 0.01}
              className="mt-1"
            />
          </div>
          
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This will {priceAdjustment.value >= 0 ? 'increase' : 'decrease'} the selected service prices by{' '}
              {priceAdjustment.type === 'percentage' 
                ? `${Math.abs(priceAdjustment.value)}%`
                : `$${Math.abs(priceAdjustment.value).toFixed(2)}`
              }
            </AlertDescription>
          </Alert>
        </div>
      </SlideOutPanel>
      
      {/* Delete Confirmation Panel */}
      <SlideOutPanel
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setDeletingServiceId(null);
        }}
        title="Delete Service"
        subtitle="Are you sure you want to delete this service?"
        width="narrow"
        preserveState={false}
        footer={
          <div className="flex justify-end space-x-3">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setDeletingServiceId(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteService}>
              Delete Service
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Alert className="border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertTitle className="text-orange-800">Warning</AlertTitle>
            <AlertDescription className="text-orange-700">
              This action cannot be undone. Any future bookings with this service will need to be updated.
            </AlertDescription>
          </Alert>
          
          {deletingServiceId && services.find(s => s.id === deletingServiceId) && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-sm text-gray-900 mb-2">Service to be deleted:</h4>
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-900">
                  {services.find(s => s.id === deletingServiceId)?.name}
                </p>
                <p className="text-sm text-gray-600">
                  {services.find(s => s.id === deletingServiceId)?.categoryName}
                </p>
                <p className="text-sm text-gray-600">
                  ${services.find(s => s.id === deletingServiceId)?.price} • {services.find(s => s.id === deletingServiceId)?.duration} min
                </p>
              </div>
            </div>
          )}
        </div>
      </SlideOutPanel>
      
      {/* Category Dialog */}
      <CategoryDialog
        isOpen={isCategoryDialogOpen}
        onClose={() => {
          setIsCategoryDialogOpen(false);
          setEditingCategory(null);
        }}
        category={editingCategory}
        onSuccess={async (categoryData) => {
          await loadData();
          setEditingCategory(null);
          if (!editingCategory) {
            // New category was created
            setNewCategoryId(categoryData.id);
            setSuccessMessage(`Category "${categoryData.name}" created successfully! You can now assign services to this category.`);
            setShowSuccessBanner(true);
            // Ensure the new category is expanded
            setExpandedCategories(prev => [...prev, categoryData.name]);
          } else {
            // Category was updated
            setSuccessMessage(`Category "${categoryData.name}" updated successfully!`);
            setShowSuccessBanner(true);
          }
        }}
      />
    </div>
  );
}