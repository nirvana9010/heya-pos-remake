import React, { useState, useMemo, useEffect } from "react";
import { X, Search, Clock, DollarSign, Plus, ChevronLeft } from "lucide-react";
import { Button, Input, Badge } from "@heya-pos/ui";
import { cn } from "@heya-pos/ui";
import { useCompactViewport } from "@/hooks/use-compact-viewport";

interface ServiceSelectionSlideoutProps {
  isOpen: boolean;
  onClose: () => void;
  services: any[];
  onSelectService: (service: any) => void;
}

export const ServiceSelectionSlideout: React.FC<
  ServiceSelectionSlideoutProps
> = ({ isOpen, onClose, services, onSelectService }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const { isCompact, isKeyboardOpen } = useCompactViewport();

  // Full-screen only on inherently compact viewports — never toggle
  // layout mode when keyboard opens mid-interaction.
  const fullScreen = isCompact;

  // Handle opening/closing animations
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // Small delay to ensure DOM is ready for animation
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 300); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Extract unique categories from services
  const categories = useMemo(() => {
    const uniqueCategories = new Map();
    services.forEach((service) => {
      if (service.categoryId && service.categoryName) {
        uniqueCategories.set(service.categoryId, service.categoryName);
      }
    });
    return Array.from(uniqueCategories, ([id, name]) => ({ id, name }));
  }, [services]);

  // Filter services based on search and category
  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      const matchesSearch =
        searchQuery === "" ||
        service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (service.description &&
          service.description
            .toLowerCase()
            .includes(searchQuery.toLowerCase()));

      const matchesCategory =
        selectedCategory === "all" || service.categoryId === selectedCategory;

      return matchesSearch && matchesCategory && service.isActive !== false;
    });
  }, [services, searchQuery, selectedCategory]);

  const handleSelectService = (service: any) => {
    onSelectService(service);
    // Reset search after selection for better UX
    setSearchQuery("");
  };

  if (!shouldRender) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-gray-900 transition-opacity z-50",
          isVisible ? "bg-opacity-50" : "bg-opacity-0 pointer-events-none",
        )}
        onClick={onClose}
      />

      {/* Slideout — full-screen on compact viewports */}
      <div
        className={cn(
          "fixed z-[60]",
          fullScreen
            ? cn(
                "inset-0 transition-opacity duration-200",
                isVisible ? "opacity-100" : "opacity-0 pointer-events-none",
              )
            : cn(
                "top-0 right-0 flex max-w-full transform transition-transform duration-300 ease-in-out",
                isVisible ? "translate-x-0" : "translate-x-full",
              ),
        )}
        style={
          fullScreen
            ? { height: "var(--visual-viewport-height, 100dvh)" }
            : { height: "var(--visual-viewport-height, 100dvh)" }
        }
      >
        <div
          className={cn(
            "relative",
            fullScreen ? "w-full h-full" : "w-screen max-w-md",
          )}
        >
          <div className="flex h-full flex-col bg-white shadow-2xl">
            {/* Header — compact when keyboard is open */}
            <div
              className={cn(
                "shrink-0 bg-white border-b z-10",
                isKeyboardOpen ? "px-4 py-2" : "px-6 py-4",
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-between",
                  isKeyboardOpen ? "mb-2" : "mb-3",
                )}
              >
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <h2
                    className={cn(
                      "font-semibold text-gray-900",
                      isKeyboardOpen ? "text-base" : "text-xl",
                    )}
                  >
                    Select Service
                  </h2>
                </div>
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
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search services..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn("pl-10", isKeyboardOpen && "h-9 text-sm")}
                  autoFocus
                />
              </div>

              {/* Category filters — hidden when keyboard is open to save space */}
              {!isKeyboardOpen && (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-2 -mx-6 px-6">
                  <Badge
                    variant={
                      selectedCategory === "all" ? "default" : "secondary"
                    }
                    className={cn(
                      "cursor-pointer whitespace-nowrap",
                      selectedCategory === "all"
                        ? "bg-teal-600 text-white hover:bg-teal-700"
                        : "hover:bg-gray-200",
                    )}
                    onClick={() => setSelectedCategory("all")}
                  >
                    All Services (
                    {services.filter((s) => s.isActive !== false).length})
                  </Badge>
                  {categories.map((cat) => (
                    <Badge
                      key={cat.id}
                      variant={
                        selectedCategory === cat.id ? "default" : "secondary"
                      }
                      className={cn(
                        "cursor-pointer whitespace-nowrap",
                        selectedCategory === cat.id
                          ? "bg-teal-600 text-white hover:bg-teal-700"
                          : "hover:bg-gray-200",
                      )}
                      onClick={() => setSelectedCategory(cat.id)}
                    >
                      {cat.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Service List */}
            <div
              className={cn(
                "flex-1 overflow-y-auto",
                isKeyboardOpen ? "px-4 py-2" : "px-6 py-4",
              )}
            >
              {filteredServices.length === 0 ? (
                <div className="text-center py-12">
                  <Search className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500">No services found</p>
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSearchQuery("")}
                      className="mt-2"
                    >
                      Clear search
                    </Button>
                  )}
                </div>
              ) : (
                <div className={cn(isKeyboardOpen ? "space-y-1" : "space-y-2")}>
                  {filteredServices.map((service) => (
                    <button
                      key={service.id}
                      onClick={() => handleSelectService(service)}
                      className={cn(
                        "w-full text-left bg-white border border-gray-200 rounded-lg hover:border-teal-300 hover:bg-teal-50 transition-all group",
                        isKeyboardOpen ? "p-3" : "p-4",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-gray-900 group-hover:text-teal-700 truncate">
                              {service.name}
                            </h4>
                            {!isKeyboardOpen && service.categoryName && (
                              <Badge variant="secondary" className="text-xs">
                                {service.categoryName}
                              </Badge>
                            )}
                          </div>
                          {!isKeyboardOpen && service.description && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {service.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-1 text-sm">
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
                          <div
                            className={cn(
                              "rounded-full bg-teal-100 group-hover:bg-teal-600 flex items-center justify-center transition-colors",
                              isKeyboardOpen ? "w-8 h-8" : "w-10 h-10",
                            )}
                          >
                            <Plus
                              className={cn(
                                "text-teal-600 group-hover:text-white",
                                isKeyboardOpen ? "h-4 w-4" : "h-5 w-5",
                              )}
                            />
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
      </div>
    </>
  );
};
