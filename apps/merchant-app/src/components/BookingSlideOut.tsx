"use client";

import { useState, useEffect } from "react";
import { 
  ChevronRight, 
  User, 
  Clock, 
  Scissors, 
  Calendar,
  DollarSign,
  Phone,
  Mail,
  AlertCircle,
  CheckCircle,
  Users
} from "lucide-react";
import { Button } from "@heya-pos/ui";
import { Input } from "@heya-pos/ui";
import { Label } from "@heya-pos/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@heya-pos/ui";
import { Textarea } from "@heya-pos/ui";
import { Badge } from "@heya-pos/ui";
import { Separator } from "@heya-pos/ui";
import { cn } from "@heya-pos/ui";
import { format } from "date-fns";
import { SlideOutPanel } from "./SlideOutPanel";

interface BookingSlideOutProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: Date;
  initialTime?: Date;
  initialStaffId?: string;
  staff: Array<{ id: string; name: string; color: string }>;
  services: Array<{ id: string; name: string; price: number; duration: number; categoryName?: string }>;
  customers?: Array<{ id: string; name: string; phone: string; mobile?: string; email?: string }>;
  onSave: (booking: any) => void;
}

type Step = "datetime" | "service" | "customer" | "confirm";

export function BookingSlideOut({
  isOpen,
  onClose,
  initialDate = new Date(),
  initialTime,
  initialStaffId,
  staff,
  services,
  customers = [],
  onSave
}: BookingSlideOutProps) {
  const [currentStep, setCurrentStep] = useState<Step>("datetime");
  const [formData, setFormData] = useState({
    customerId: "",
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    isNewCustomer: true,
    serviceId: "",
    staffId: initialStaffId || "",
    date: initialDate,
    time: initialTime || new Date(),
    notes: "",
    sendReminder: true
  });

  const [searchQuery, setSearchQuery] = useState("");

  // Reset to first step and update initial values when dialog opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep("datetime");
      // Update date/time/staff from props when dialog opens
      setFormData(prev => ({
        ...prev,
        date: initialDate,
        time: initialTime || new Date(),
        staffId: initialStaffId || prev.staffId
      }));
    }
  }, [isOpen, initialDate, initialTime, initialStaffId]);

  const steps: Array<{ id: Step; label: string; icon: React.ReactNode }> = [
    { id: "datetime", label: "Date & Time", icon: <Calendar className="h-4 w-4" /> },
    { id: "service", label: "Service", icon: <Scissors className="h-4 w-4" /> },
    { id: "customer", label: "Customer", icon: <User className="h-4 w-4" /> },
    { id: "confirm", label: "Confirm", icon: <CheckCircle className="h-4 w-4" /> }
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);
  const selectedService = services.find(s => s.id === formData.serviceId);
  const selectedStaff = staff.find(s => s.id === formData.staffId);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.mobile || c.phone || '').includes(searchQuery)
  );

  const handleNext = () => {
    const stepIndex = steps.findIndex(s => s.id === currentStep);
    if (stepIndex < steps.length - 1) {
      setCurrentStep(steps[stepIndex + 1].id);
    }
  };

  const handleBack = () => {
    const stepIndex = steps.findIndex(s => s.id === currentStep);
    if (stepIndex > 0) {
      setCurrentStep(steps[stepIndex - 1].id);
    }
  };

  const handleSubmit = () => {
    if (!formData.time) {
      console.error('Cannot submit booking without time');
      return;
    }
    
    onSave({
      ...formData,
      startTime: formData.time,
      endTime: new Date(formData.time.getTime() + (selectedService?.duration || 60) * 60000)
    });
    onClose();
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case "customer":
        return (
          <div className="space-y-4">
            <div>
              <Label>Find or Create Customer</Label>
              <Input
                placeholder="Search by name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mt-1"
              />
            </div>

            {searchQuery && filteredCustomers.length > 0 && (
              <div className="border rounded-lg divide-y">
                {filteredCustomers.map((customer) => (
                  <button
                    key={customer.id}
                    className="w-full p-3 hover:bg-gray-50 text-left transition-colors"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        customerId: customer.id,
                        customerName: customer.name,
                        customerPhone: customer.mobile || customer.phone,
                        customerEmail: customer.email || "",
                        isNewCustomer: false
                      });
                      handleNext();
                    }}
                  >
                    <div className="font-medium">{customer.name}</div>
                    <div className="text-sm text-gray-600">{customer.mobile || customer.phone}</div>
                  </button>
                ))}
              </div>
            )}

            <div className="pt-4 border-t">
              <h4 className="font-medium mb-3">Create New Customer</h4>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="customerName">Name *</Label>
                  <Input
                    id="customerName"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    placeholder="John Doe"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="customerPhone">Phone *</Label>
                  <Input
                    id="customerPhone"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="customerEmail">Email</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={formData.customerEmail}
                    onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                    placeholder="john@example.com"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case "service":
        return (
          <div className="space-y-4">
            <div className="grid gap-3">
              {services.map((service) => (
                <button
                  key={service.id}
                  className={cn(
                    "p-4 rounded-lg border-2 text-left transition-all",
                    formData.serviceId === service.id
                      ? "border-teal-500 bg-teal-50"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                  onClick={() => setFormData({ ...formData, serviceId: service.id })}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{service.name}</h4>
                      {service.categoryName && (
                        <Badge variant="secondary" className="mt-1">
                          {service.categoryName}
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">${service.price}</div>
                      <div className="text-sm text-gray-600">{service.duration} min</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case "datetime":
        return (
          <div className="space-y-4">
            <div>
              <Label>Staff Member</Label>
              <Select
                value={formData.staffId || 'next-available'}
                onValueChange={(value) => setFormData({ ...formData, staffId: value === 'next-available' ? undefined : value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="next-available">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-600" />
                      <span>Next Available</span>
                    </div>
                  </SelectItem>
                  <Separator className="my-1" />
                  {staff.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: member.color }}
                        />
                        {member.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={formData.date ? format(formData.date, "yyyy-MM-dd") : ""}
                onChange={(e) => setFormData({ ...formData, date: new Date(e.target.value) })}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Time</Label>
              <Input
                type="time"
                value={formData.time ? format(formData.time, "HH:mm") : ""}
                onChange={(e) => {
                  const [hours, minutes] = e.target.value.split(':');
                  const newTime = new Date(formData.date || new Date());
                  newTime.setHours(parseInt(hours), parseInt(minutes));
                  setFormData({ ...formData, time: newTime });
                }}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add any special requests or notes..."
                rows={3}
                className="mt-1"
              />
            </div>
          </div>
        );

      case "confirm":
        return (
          <div className="space-y-4">
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
              <h4 className="font-medium text-teal-900 mb-3">Booking Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Customer:</span>
                  <span className="font-medium">{formData.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Phone:</span>
                  <span className="font-medium">{formData.customerPhone}</span>
                </div>
                {selectedService && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Service:</span>
                      <span className="font-medium">{selectedService.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Duration:</span>
                      <span className="font-medium">{selectedService.duration} minutes</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Price:</span>
                      <span className="font-medium">${selectedService.price}</span>
                    </div>
                  </>
                )}
                {selectedStaff && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Staff:</span>
                    <span className="font-medium">{selectedStaff.name}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Date & Time:</span>
                  <span className="font-medium">
                    {formData.date && formData.time ? 
                      `${format(formData.date, "MMM d, yyyy")} at ${format(formData.time, "h:mm a")}` : 
                      "Not selected"}
                  </span>
                </div>
              </div>
            </div>

            {formData.notes && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-1">Notes</h4>
                <p className="text-sm text-gray-600">{formData.notes}</p>
              </div>
            )}

            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-800">
                A confirmation will be sent to the customer
              </span>
            </div>
          </div>
        );
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case "datetime":
        return formData.staffId && formData.date && formData.time;
      case "service":
        return formData.serviceId;
      case "customer":
        return formData.customerName && formData.customerPhone;
      default:
        return true;
    }
  };

  return (
    <SlideOutPanel
      isOpen={isOpen}
      onClose={onClose}
      title="New Booking"
      width="wide"
      preserveState={false}
      footer={
        <div className="flex justify-between">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStepIndex === 0}
          >
            Back
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {currentStep !== "confirm" ? (
              <Button 
                onClick={handleNext}
                disabled={!canProceed()}
                className="bg-teal-600 hover:bg-teal-700"
              >
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit}
                className="bg-teal-600 hover:bg-teal-700"
              >
                Confirm Booking
              </Button>
            )}
          </div>
        </div>
      }
    >
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={cn(
                "flex items-center",
                index < steps.length - 1 && "flex-1"
              )}
            >
              <button
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors",
                  currentStep === step.id
                    ? "bg-teal-100 text-teal-700"
                    : index < currentStepIndex
                    ? "text-green-600"
                    : "text-gray-400"
                )}
                onClick={() => index <= currentStepIndex && setCurrentStep(step.id)}
                disabled={index > currentStepIndex}
              >
                {step.icon}
                <span className="font-medium">{step.label}</span>
              </button>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-2",
                    index < currentStepIndex ? "bg-green-500" : "bg-gray-200"
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      {renderStepContent()}
    </SlideOutPanel>
  );
}