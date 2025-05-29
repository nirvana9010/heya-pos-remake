"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Search, MoreVertical, Edit, Trash2, DollarSign, Clock, AlertCircle, Sparkles, Scissors, Hand, Palette } from "lucide-react";
import { Button } from "@heya-pos/ui";
import { Input } from "@heya-pos/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@heya-pos/ui";
import { Badge } from "@heya-pos/ui";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@heya-pos/ui";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@heya-pos/ui";
import { Label } from "@heya-pos/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@heya-pos/ui";
import { Textarea } from "@heya-pos/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@heya-pos/ui";
import { cn } from "@heya-pos/ui";
import { Alert, AlertDescription, AlertTitle } from "@heya-pos/ui";
import { Switch } from "@heya-pos/ui";
import { type Service, type ServiceCategory } from "@heya-pos/shared";
import { apiClient } from '@/lib/api-client';
import { useToast } from "@heya-pos/ui";
import { ServiceDialog } from '@/components/ServiceDialog';
import { SlideOutPanel } from '@/components/SlideOutPanel';


export default function ServicesPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingServiceId, setDeletingServiceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    categoryId: '',
    duration: 30,
    price: 0,
    isActive: true
  });


  useEffect(() => {
    loadData();
  }, []);

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

  const filteredServices = useMemo(() => {
    return services.filter(service => {
      const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (service.description?.toLowerCase().includes(searchQuery.toLowerCase()) || false);
      const matchesCategory = selectedCategory === "All" || service.categoryName === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [services, searchQuery, selectedCategory]);

  // Helper function to get category icon
  const getCategoryIcon = (categoryName: string) => {
    switch (categoryName?.toLowerCase()) {
      case 'facials': return <Sparkles className="h-4 w-4" />;
      case 'massages': return <Hand className="h-4 w-4" />;
      case 'nails': return <Palette className="h-4 w-4" />;
      default: return <Scissors className="h-4 w-4" />;
    }
  };

  // Helper function to get category colors
  const getCategoryColors = (categoryName: string) => {
    switch (categoryName?.toLowerCase()) {
      case 'facials': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'massages': return 'bg-teal-100 text-teal-700 border-teal-200';
      case 'nails': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
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
      console.error('Failed to delete service:', error);
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
    // Basic validation
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Service name is required",
        variant: "destructive",
      });
      return;
    }

    if (formData.duration <= 0) {
      toast({
        title: "Validation Error", 
        description: "Duration must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    if (formData.price < 0) {
      toast({
        title: "Validation Error",
        description: "Price cannot be negative",
        variant: "destructive",
      });
      return;
    }

    try {
      // Prepare data for API call, exclude empty categoryId
      const serviceData = {
        ...formData,
        // Don't send categoryId if it's empty, let backend handle category by name if needed
        categoryId: formData.categoryId || undefined,
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
      console.error('Failed to save service:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to save service",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      categoryId: '',
      duration: 30,
      price: 0,
      isActive: true
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
      isActive: service.isActive
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <div className="container max-w-7xl mx-auto p-6 space-y-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-teal-600 bg-clip-text text-transparent">
              Services
            </h1>
            <p className="text-gray-600 text-lg">Manage your service offerings and pricing</p>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                {filteredServices.length} Services
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                {categories.length} Categories
              </span>
            </div>
          </div>
          <Button 
            onClick={() => setIsAddDialogOpen(true)} 
            className="bg-gradient-to-r from-purple-600 to-teal-600 hover:from-purple-700 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-3 rounded-xl font-semibold whitespace-nowrap flex items-center"
            size="lg"
          >
            <Plus className="mr-2 h-5 w-5 flex-shrink-0" />
            Add Service
          </Button>
        </div>

        {/* Search and Filter Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                placeholder="Search services by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 bg-gray-50 border-gray-200 focus:bg-white focus:border-purple-300 transition-all"
              />
            </div>
            <Tabs value={selectedCategory} onValueChange={(value) => {
              setFilterLoading(true);
              setSelectedCategory(value);
              // Small delay to show loading state
              setTimeout(() => setFilterLoading(false), 150);
            }} className="w-full lg:w-auto">
              <TabsList className="grid grid-cols-2 lg:grid-cols-4 w-full lg:w-auto bg-gray-100 p-1 rounded-xl">
                <TabsTrigger 
                  value="All" 
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg font-medium transition-all"
                >
                  All
                </TabsTrigger>
                {categories.map((category) => (
                  <TabsTrigger 
                    key={category.id} 
                    value={category.name}
                    className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg font-medium transition-all flex items-center gap-2"
                  >
                    {getCategoryIcon(category.name)}
                    <span>{category.name}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Services Grid */}
        <div className="relative">
          {filterLoading && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-purple-500 border-t-transparent"></div>
                <span className="text-sm text-gray-600">Filtering services...</span>
              </div>
            </div>
          )}
          <div className={`grid gap-6 md:grid-cols-2 lg:grid-cols-3 transition-opacity duration-200 ${filterLoading ? 'opacity-50' : 'opacity-100'}`}>
            {filteredServices.map((service) => (
            <Card 
              key={service.id} 
              className={cn(
                "hover:shadow-lg transition-shadow duration-200 border border-gray-200 bg-white",
                !service.isActive && "opacity-60"
              )}
            >
              {/* Card Header with Gradient Background */}
              <div className="bg-gray-50 p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={cn(
                      "p-2 rounded-lg border flex-shrink-0",
                      getCategoryColors(service.categoryName || '')
                    )}>
                      {getCategoryIcon(service.categoryName || '')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="relative">
                        <CardTitle className="text-lg font-bold text-gray-900 leading-tight truncate">
                          {service.name}
                        </CardTitle>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {service.categoryName && (
                          <Badge 
                            variant="outline" 
                            className={cn("text-xs border", getCategoryColors(service.categoryName))}
                          >
                            {service.categoryName}
                          </Badge>
                        )}
                        {!service.isActive && (
                          <Badge variant="secondary" className="bg-red-100 text-red-700 border-red-200 text-xs">
                            Inactive
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-9 w-9 p-0 hover:bg-white/70 text-gray-500 hover:text-gray-700 rounded-lg transition-colors flex-shrink-0"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-xl border-gray-200 shadow-lg">
                      <DropdownMenuItem 
                        onClick={() => openEditDialog(service)} 
                        className="cursor-pointer rounded-lg mx-1 my-1 focus:bg-purple-50 focus:text-purple-700"
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Service
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => {
                          setDeletingServiceId(service.id);
                          setIsDeleteDialogOpen(true);
                        }}
                        className="text-red-600 cursor-pointer focus:text-red-700 focus:bg-red-50 rounded-lg mx-1 my-1"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Service
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Card Content */}
              <CardContent className="p-6 space-y-4">
                <CardDescription className="text-gray-600 leading-relaxed min-h-[2.5rem]">
                  {service.description || "No description provided"}
                </CardDescription>
                
                {/* Duration and Price Row */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="h-4 w-4 text-purple-500" />
                    <span className="font-medium">{service.duration} min</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-5 w-5 text-teal-600" />
                    <span className="text-2xl font-bold text-gray-900">{service.price}</span>
                  </div>
                </div>
              </CardContent>

            </Card>
          ))}
          </div>
        </div>

        {/* Empty State */}
        {filteredServices.length === 0 && (
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Scissors className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No services found</h3>
            <p className="text-gray-600 mb-6">
              {searchQuery ? "Try adjusting your search terms" : "Get started by adding your first service"}
            </p>
            <Button 
              onClick={() => setIsAddDialogOpen(true)}
              className="bg-gradient-to-r from-purple-600 to-teal-600 hover:from-purple-700 hover:to-teal-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Service
            </Button>
          </div>
        )}
      </div>
      
      {/* Service Dialog Component */}
      {/* ServiceDialog component - temporarily disabled while we use the inline Dialog */}
      {false && (
      <ServiceDialog
        open={isAddDialogOpen}
        onOpenChange={(open) => {
          console.log('Dialog onOpenChange:', open);
          setIsAddDialogOpen(open);
          if (!open) {
            setEditingService(null);
            resetForm();
          }
        }}
        service={editingService}
        categories={categories}
        onSave={handleSaveService}
      />
      )}
      
      {/* Service Slide-Out Panel */}
      <SlideOutPanel
        isOpen={isAddDialogOpen}
        onClose={() => {
          setIsAddDialogOpen(false);
          setEditingService(null);
          resetForm();
        }}
        title={editingService ? "Edit Service" : "Add New Service"}
        subtitle={editingService ? "Update the service details below." : "Fill in the details for the new service."}
        width="medium"
        footer={
          <div className="flex justify-end space-x-3">
            <Button 
              variant="outline" 
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
              className="bg-gradient-to-r from-purple-600 to-teal-600 hover:from-purple-700 hover:to-teal-700 text-white px-6"
            >
              {editingService ? "Update Service" : "Add Service"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Service Name</Label>
            <Input 
              id="name" 
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Haircut & Style" 
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="category">Category</Label>
            <Select 
              value={formData.categoryId || "none"}
              onValueChange={(value) => setFormData({ ...formData, categoryId: value === "none" ? "" : value })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select category (optional)" />
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
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the service"
              rows={3}
              className="mt-1"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 30 })}
                min="15"
                step="15"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="price">Price ($)</Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                min="0"
                step="0.01"
                className="mt-1"
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="active">Active</Label>
            <Switch
              id="active"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
            />
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
    </div>
  );
}