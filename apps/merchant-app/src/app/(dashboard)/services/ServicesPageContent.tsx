"use client";

import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { 
  Plus, Search, MoreVertical, Edit, Trash2, DollarSign, Clock, 
  ChevronDown, ChevronRight, Users, Copy, Check, X,
  Scissors, Package, AlertCircle, Menu, ChevronLeft
} from "lucide-react";
import { Button } from "@heya-pos/ui";
import { Input } from "@heya-pos/ui";
import { Badge } from "@heya-pos/ui";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@heya-pos/ui";
import { Label } from "@heya-pos/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@heya-pos/ui";
import { Textarea } from "@heya-pos/ui";
import { cn } from "@heya-pos/ui";
import { Alert, AlertDescription } from "@heya-pos/ui";
import { Switch } from "@heya-pos/ui";
import { Checkbox } from "@heya-pos/ui";
import { DataTable, createSelectColumn } from "@heya-pos/ui";
import { Skeleton, TableSkeleton } from "@heya-pos/ui";
import { Spinner, SuccessCheck, ErrorShake, FadeIn } from "@heya-pos/ui";
import { type Service, type ServiceCategory } from "@heya-pos/shared";
import { useToast } from "@heya-pos/ui";
import { SlideOutPanel } from '@/components/SlideOutPanel';
import CategoryDialog from '@/components/CategoryDialog';
import { ColumnDef } from "@tanstack/react-table";
import { debounce } from "lodash";
import { 
  useServicesData, 
  useCreateService, 
  useUpdateService, 
  useDeleteService,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory 
} from '@/hooks/use-services';

interface ServiceRow extends Service {
  staffCount: number;
  categoryColor?: string;
}

export default function ServicesPageContent() {
  const { toast } = useToast();
  
  // State declarations - must come before hooks that use them
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  const [isSearching, setIsSearching] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingServiceId, setDeletingServiceId] = useState<string | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);
  const [savingService, setSavingService] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [editingCell, setEditingCell] = useState<{ id: string; field: 'price' | 'duration' } | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [savingInline, setSavingInline] = useState(false);
  const [inlineSuccess, setInlineSuccess] = useState<string | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
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

  // Data fetching hooks - now all state is declared
  const queryParams = { 
    page: currentPage, 
    limit: pageSize,
    searchTerm: debouncedSearchQuery || undefined,
    categoryId: selectedCategoryFilter === "all" ? undefined : selectedCategoryFilter
  };
  
  const { services, categories, serviceCounts, totalServices, meta, isLoading, refetch } = useServicesData(queryParams);
  
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();
  const deleteServiceBulk = useDeleteService({ suppressToast: true });
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  
  // Set expanded categories after categories are loaded
  useEffect(() => {
    if (categories && categories.length > 0 && expandedCategories.length === 0) {
      setExpandedCategories(categories.map(c => c.id));
    }
  }, [categories, expandedCategories.length]);

  // Debounced search
  const debouncedSearch = useMemo(
    () => debounce((value: string) => {
      setDebouncedSearchQuery(value);
      setIsSearching(false);
    }, 500),
    []
  );

  useEffect(() => {
    if (searchQuery) {
      setIsSearching(true);
    }
    debouncedSearch(searchQuery);
  }, [searchQuery, debouncedSearch]);

  // Update expanded categories when categories change
  useEffect(() => {
    if (categories.length > 0 && expandedCategories.length === 0) {
      setExpandedCategories(categories.map(c => c.id));
    }
  }, [categories, expandedCategories.length]);
  
  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategoryFilter, debouncedSearchQuery]);

  // Get staff count for a service - TODO: Replace with real staff assignments from API
  const getStaffCount = (serviceId: string) => {
    // Placeholder - in production this should come from the API
    return 0;
  };

  // Transform services for the table
  const tableData = useMemo(() => {
    // No client-side filtering needed - server handles it
    return services.map(service => ({
      ...service,
      staffCount: getStaffCount(service.id),
      categoryColor: categories.find(c => c.id === service.categoryId)?.color
    }));
  }, [services, categories]);

  // Handle row selection changes
  const handleRowSelectionChange = useCallback((newRowSelection: Record<string, boolean>) => {
    // Update the row selection state
    setRowSelection(newRowSelection);
    
    // Convert row selection object to array of selected service IDs
    const selectedIds = Object.keys(newRowSelection)
      .filter(key => newRowSelection[key])
      .map(index => tableData[parseInt(index)]?.id)
      .filter(Boolean);
    setSelectedServices(selectedIds);
  }, [tableData]);

  // Format duration display
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${mins}m`;
  };

  // Handle inline edit save
  const handleInlineEditSave = async () => {
    if (!editingCell || savingInline) return;

    try {
      setSavingInline(true);
      setInlineError(null);
      
      const service = services.find(s => s.id === editingCell.id);
      if (!service) return;

      const updateData: any = {};
      
      if (editingCell.field === 'price') {
        const price = parseFloat(editValue);
        if (isNaN(price) || price < 0) {
          setInlineError(editingCell.id);
          toast({
            title: "Invalid price",
            description: "Please enter a valid price",
            variant: "destructive",
          });
          return;
        }
        updateData.price = price;
      } else if (editingCell.field === 'duration') {
        const duration = parseInt(editValue);
        if (isNaN(duration) || duration < 5 || duration > 240) {
          setInlineError(editingCell.id);
          toast({
            title: "Invalid duration",
            description: "Duration must be between 5 and 240 minutes",
            variant: "destructive",
          });
          return;
        }
        updateData.duration = duration;
      }

      await updateService.mutateAsync({ id: editingCell.id, data: updateData });
      
      // Show success state
      setInlineSuccess(editingCell.id);
      setEditingCell(null);
      setEditValue("");
      
      // Remove success indicator after delay
      setTimeout(() => setInlineSuccess(null), 2000);
    } catch (error) {
      setInlineError(editingCell.id);
      toast({
        title: "Error",
        description: `Failed to update ${editingCell.field}`,
        variant: "destructive",
      });
      setTimeout(() => setInlineError(null), 2000);
    } finally {
      setSavingInline(false);
    }
  };

  // Handle inline edit cancel
  const handleInlineEditCancel = () => {
    setEditingCell(null);
    setEditValue("");
  };

  // Define table columns
  const columns: ColumnDef<ServiceRow>[] = [
    createSelectColumn<ServiceRow>(),
    {
      accessorKey: "name",
      header: "Service Name",
      cell: ({ row }) => {
        const service = row.original;
        const category = categories.find(c => c.id === service.categoryId);
        const categoryColor = category?.color || '#6B7280';
        
        return (
          <div className="flex items-center gap-3">
            <div 
              className="h-8 w-8 rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0"
              style={{ backgroundColor: categoryColor }}
            >
              {service.categoryName?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-gray-900 truncate">{service.name}</p>
              {service.description && (
                <p className="text-sm text-gray-500 truncate">{service.description}</p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "categoryName",
      header: "Category",
      cell: ({ row }) => {
        const service = row.original;
        return (
          <Badge variant="secondary" className="font-normal">
            {service.categoryName || 'Uncategorized'}
          </Badge>
        );
      },
    },
    {
      accessorKey: "duration",
      header: "Duration",
      cell: ({ row }) => {
        const service = row.original;
        const isEditing = editingCell?.id === service.id && editingCell.field === 'duration';
        
        if (isEditing) {
          return (
            <ErrorShake error={inlineError === service.id}>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleInlineEditSave();
                    if (e.key === 'Escape') handleInlineEditCancel();
                  }}
                  className={cn(
                    "h-7 w-20 text-sm",
                    inlineError === service.id && "border-red-500"
                  )}
                  min="5"
                  max="240"
                  autoFocus
                  disabled={savingInline}
                />
                {savingInline ? (
                  <Spinner className="h-4 w-4 mx-2" />
                ) : (
                  <>
                    <button
                      onClick={handleInlineEditSave}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <Check className="h-3 w-3 text-green-600" />
                    </button>
                    <button
                      onClick={handleInlineEditCancel}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <X className="h-3 w-3 text-red-600" />
                    </button>
                  </>
                )}
              </div>
            </ErrorShake>
          );
        }
        
        return (
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setEditingCell({ id: service.id, field: 'duration' });
                setEditValue(service.duration.toString());
              }}
              className="flex items-center gap-1 text-gray-700 hover:text-gray-900 hover:bg-gray-50 px-2 py-1 rounded transition-colors border-b border-dashed border-gray-300"
            >
              <Clock className="h-4 w-4 text-gray-400" />
              {formatDuration(service.duration)}
            </button>
            {inlineSuccess === service.id && (
              <FadeIn>
                <SuccessCheck className="h-4 w-4" />
              </FadeIn>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "price",
      header: ({ column }) => (
        <div className="text-right">Price</div>
      ),
      cell: ({ row }) => {
        const service = row.original;
        const isEditing = editingCell?.id === service.id && editingCell.field === 'price';
        
        if (isEditing) {
          return (
            <div className="flex items-center gap-1 justify-end">
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                <Input
                  type="text"
                  value={editValue}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
                      setEditValue(value);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleInlineEditSave();
                    if (e.key === 'Escape') handleInlineEditCancel();
                  }}
                  className="h-7 w-24 text-sm pl-6"
                  autoFocus
                />
              </div>
              <button
                onClick={handleInlineEditSave}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <Check className="h-3 w-3 text-green-600" />
              </button>
              <button
                onClick={handleInlineEditCancel}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-3 w-3 text-red-600" />
              </button>
            </div>
          );
        }
        
        return (
          <button
            onClick={() => {
              setEditingCell({ id: service.id, field: 'price' });
              setEditValue(service.price.toString());
            }}
            className="block w-full text-right font-medium text-gray-900 hover:text-gray-700 hover:bg-gray-50 px-2 py-1 rounded transition-colors border-b border-dashed border-gray-300"
          >
            ${service.price.toFixed(2)}
          </button>
        );
      },
    },
    {
      accessorKey: "staffCount",
      header: "Staff",
      cell: ({ row }) => {
        const count = row.original.staffCount;
        return (
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4 text-gray-400" />
            <span className="text-gray-700">{count}</span>
          </div>
        );
      },
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const service = row.original;
        return (
          <Badge 
            variant={service.isActive ? "default" : "secondary"}
            className={cn(
              "font-normal",
              service.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
            )}
          >
            {service.isActive ? "Active" : "Inactive"}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const service = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEditDialog(service)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDuplicateService(service)}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => {
                  // Close any other dialogs first
                  setIsAddDialogOpen(false);
                  setEditingService(null);
                  
                  setDeletingServiceId(service.id);
                  setIsDeleteDialogOpen(true);
                }}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const openEditDialog = (service: Service) => {
    // Close ALL other dialogs first
    setIsDeleteDialogOpen(false);
    setDeletingServiceId(null);
    setIsCategoryDialogOpen(false);
    
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

  const handleDuplicateService = async (service: Service) => {
    try {
      const duplicatedService = {
        name: `${service.name} (Copy)`,
        description: service.description,
        categoryId: service.categoryId,
        duration: service.duration,
        price: service.price,
        isActive: false
      };
      
      await apiClient.createService(duplicatedService);
      
      toast({
        title: "Success",
        description: "Service duplicated successfully",
      });
      
      await refetch();
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
      await deleteService.mutateAsync(deletingServiceId);
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
        await updateService.mutateAsync({ id: editingService.id, data: serviceData });
      } else {
        await createService.mutateAsync(serviceData);
      }
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

  const handleDeleteCategory = async (categoryId: string, visibleServiceCount: number) => {
    // Note: visibleServiceCount only shows services on current page/filter
    // The backend will check ALL services in the database
    
    const confirmDelete = window.confirm(
      'Are you sure you want to delete this category? This action cannot be undone.'
    );
    
    if (!confirmDelete) return;
    
    try {
      await deleteCategory.mutateAsync(categoryId);
      
      // If we're viewing the deleted category, switch to all
      if (selectedCategoryFilter === categoryId) {
        setSelectedCategoryFilter("all");
      }
    } catch (error: any) {
      console.error('Delete category error:', error);
      // The hook will show the appropriate error message from the backend
      // which will indicate if there are services in this category
    }
  };

  const handleBulkDelete = async () => {
    if (selectedServices.length === 0) return;
    
    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${selectedServices.length} service${selectedServices.length > 1 ? 's' : ''}? This action cannot be undone.`
    );
    
    if (!confirmDelete) return;
    
    try {
      const deletePromises = selectedServices.map(serviceId => 
        deleteServiceBulk.mutateAsync(serviceId)
      );
      
      await Promise.all(deletePromises);
      
      toast({
        title: "Success",
        description: `Deleted ${selectedServices.length} service${selectedServices.length > 1 ? 's' : ''}`,
      });
      
      // Clear both selections
      setSelectedServices([]);
      setRowSelection({});
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete some services",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 animate-in fade-in-0 duration-300">
        {/* Header skeleton */}
        <div className="sticky top-0 z-10 bg-white border-b">
          <div className="container max-w-7xl mx-auto px-6 py-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex-1 max-w-lg">
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-10 w-32" />
              </div>
            </div>
          </div>
        </div>

        {/* Table skeleton */}
        <div className="container max-w-7xl mx-auto p-6">
          <div className="bg-white rounded-lg shadow-sm border">
            <TableSkeleton rows={8} columns={7} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Category Sidebar */}
      <div className={cn(
        "bg-white border-r transition-all duration-300 flex-shrink-0",
        isSidebarOpen ? "w-64" : "w-0 overflow-hidden"
      )}>
        <div className="h-full flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Categories</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSidebarOpen(false)}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Category List */}
          <div className="flex-1 overflow-y-auto p-3">
            {/* All Services */}
            <button
              onClick={() => setSelectedCategoryFilter("all")}
              className={cn(
                "w-full text-left p-3 rounded-lg mb-1 transition-colors flex items-center justify-between group",
                selectedCategoryFilter === "all" 
                  ? "bg-teal-50 text-teal-700" 
                  : "hover:bg-gray-50"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-gray-400" />
                <span className="font-medium">All Services</span>
              </div>
              <Badge variant="secondary" className="bg-gray-100">
                {totalServices}
              </Badge>
            </button>
            
            {/* Categories */}
            {categories.map((category) => {
              const categoryServiceCount = serviceCounts[category.id] || 0;
              return (
                <div
                  key={category.id}
                  onMouseEnter={() => setHoveredCategory(category.id)}
                  onMouseLeave={() => setHoveredCategory(null)}
                  className={cn(
                    "relative rounded-lg mb-1 transition-colors flex items-center group",
                    selectedCategoryFilter === category.id 
                      ? "bg-teal-50" 
                      : "hover:bg-gray-50"
                  )}
                >
                  <button
                    onClick={() => setSelectedCategoryFilter(category.id)}
                    className="flex-1 text-left p-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: category.color || '#6B7280' }}
                      />
                      <span className={cn(
                        "font-medium",
                        selectedCategoryFilter === category.id && "text-teal-700",
                        categoryServiceCount === 0 && "text-gray-400"
                      )}>
                        {category.name}
                      </span>
                    </div>
                    <Badge variant="secondary" className={cn(
                      "bg-gray-100",
                      categoryServiceCount === 0 && "opacity-50"
                    )}>
                      {categoryServiceCount}
                    </Badge>
                  </button>
                  {hoveredCategory === category.id && (
                    <div className="flex items-center gap-1 pr-3 animate-in slide-in-from-right-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingCategory(category);
                          setIsCategoryDialogOpen(true);
                        }}
                        className="h-6 w-6 p-0"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCategory(category.id, categoryServiceCount);
                        }}
                        className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Add Category Button */}
          <div className="p-3 border-t">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setEditingCategory(null);
                setIsCategoryDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-white border-b">
          <div className="px-6 py-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3 flex-1">
                {!isSidebarOpen && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsSidebarOpen(true)}
                    className="h-10 w-10 p-0"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                )}
                <div className="flex-1 max-w-lg">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <Input
                      placeholder="Search services by name or category..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-10 h-10 w-full"
                    />
                    {isSearching && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <Spinner className="h-4 w-4 text-gray-400" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <Button 
                onClick={() => {
                  resetForm();
                  setIsAddDialogOpen(true);
                }} 
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Service
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="container max-w-7xl mx-auto p-6">
        {tableData.length === 0 && !searchQuery ? (
          // Empty state
          <div className="bg-white rounded-lg shadow-sm border p-12">
            <div className="text-center max-w-md mx-auto">
              <div className="mx-auto w-24 h-24 bg-teal-100 rounded-full flex items-center justify-center mb-6">
                <Scissors className="h-12 w-12 text-teal-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {selectedCategoryFilter === "all" ? "No services yet" : "No services in this category"}
              </h3>
              <p className="text-gray-600 mb-6">
                {selectedCategoryFilter === "all" 
                  ? "Get started by adding your first service to build your service menu."
                  : `Add services to the ${categories.find(c => c.id === selectedCategoryFilter)?.name} category.`}
              </p>
              <div className="flex gap-3 justify-center">
                <Button 
                  onClick={() => {
                    resetForm();
                    if (selectedCategoryFilter !== "all") {
                      setFormData(prev => ({ ...prev, categoryId: selectedCategoryFilter }));
                    }
                    setIsAddDialogOpen(true);
                  }}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {selectedCategoryFilter === "all" ? "Add Your First Service" : "Add Service Here"}
                </Button>
                {selectedCategoryFilter !== "all" && (
                  <Button 
                    variant="outline"
                    onClick={() => setSelectedCategoryFilter("all")}
                  >
                    View All Services
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : tableData.length === 0 && searchQuery ? (
          // No search results
          <div className="bg-white rounded-lg shadow-sm border p-12">
            <div className="text-center max-w-md mx-auto">
              <div className="mx-auto w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Search className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No services found
              </h3>
              <p className="text-gray-600 mb-4">
                No services match "{searchQuery}"
                {selectedCategoryFilter !== "all" && ` in ${categories.find(c => c.id === selectedCategoryFilter)?.name}`}
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => setSearchQuery("")}
                >
                  Clear Search
                </Button>
                {selectedCategoryFilter !== "all" && (
                  <Button
                    variant="outline"
                    onClick={() => setSelectedCategoryFilter("all")}
                  >
                    Search All Categories
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          // Data table
          <div className="bg-white rounded-lg shadow-sm border">
            <DataTable
              columns={columns}
              data={tableData}
              showRowSelection={true}
              rowSelection={rowSelection}
              onRowSelectionChange={handleRowSelectionChange}
              showPagination={false} // Disable DataTable's internal pagination - we're using server-side pagination
              pageSize={9999} // Set a high page size to show all data passed to it
              headerActions={
                selectedServices.length > 0 ? (
                  <>
                    <span className="flex items-center text-sm text-gray-600">
                      {selectedServices.length} selected
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBulkDelete}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Bulk Delete
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedServices([]);
                        setRowSelection({});
                      }}
                    >
                      Clear
                    </Button>
                  </>
                ) : null
              }
            />
            
            {/* Pagination Controls */}
            {meta && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-700">
                    {meta.total === 0 
                      ? "No services found" 
                      : `Showing ${((currentPage - 1) * pageSize) + 1} to ${Math.min(currentPage * pageSize, meta.total)} of ${meta.total} services`
                    }
                  </span>
                  <Select
                    value={pageSize.toString()}
                    onValueChange={(value) => {
                      setPageSize(Number(value));
                      setCurrentPage(1); // Reset to first page when changing page size
                    }}
                  >
                    <SelectTrigger className="h-8 w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 / page</SelectItem>
                      <SelectItem value="20">20 / page</SelectItem>
                      <SelectItem value="50">50 / page</SelectItem>
                      <SelectItem value="100">100 / page</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    First
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Page</span>
                    <Input
                      type="number"
                      min="1"
                      max={meta.totalPages}
                      value={currentPage}
                      onChange={(e) => {
                        const page = parseInt(e.target.value) || 1;
                        setCurrentPage(Math.min(Math.max(1, page), meta.totalPages));
                      }}
                      className="h-8 w-16 text-center"
                    />
                    <span className="text-sm">of {meta.totalPages}</span>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      console.log('[Pagination] Next clicked, currentPage:', currentPage, 'totalPages:', meta.totalPages);
                      setCurrentPage(prev => Math.min(meta.totalPages, prev + 1));
                    }}
                    disabled={currentPage === meta.totalPages}
                  >
                    Next
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(meta.totalPages)}
                    disabled={currentPage === meta.totalPages}
                  >
                    Last
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
          </div>
        </div>
      </div>

      {/* Add/Edit Service Panel */}
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
        <div className="relative h-full flex flex-col">
          {/* Panel content remains the same as original */}
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

          <div className="flex-1 overflow-y-auto px-8 py-6 -mx-8">
            <div className="space-y-8 pb-20">
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
                    className="w-full"
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
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
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
                  />
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
                <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wider">Pricing & Duration</h3>
                
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="duration" className="text-sm font-medium text-gray-700 mb-1.5 block">
                      Duration (minutes) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      value={formData.duration}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 0;
                        setFormData({ ...formData, duration: Math.max(0, Math.min(240, value)) });
                      }}
                      min="0"
                      max="240"
                      step="15"
                    />
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
                        className="pl-8"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

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
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveService}
                  disabled={!formData.name.trim() || formData.price <= 0 || savingService}
                  className="bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingService ? (
                    <>
                      <Spinner className="h-4 w-4 mr-2" />
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
      >
        <div className="space-y-4">
          <Alert className="border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
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

          <div className="flex justify-end gap-3 pt-4">
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
        onSuccess={() => {
          refetch();
          setIsCategoryDialogOpen(false);
          setEditingCategory(null);
          toast({
            title: "Success",
            description: editingCategory ? "Category updated successfully" : "Category created successfully",
          });
        }}
      />
    </div>
  );
}