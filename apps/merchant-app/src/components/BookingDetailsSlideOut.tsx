"use client";

import { useState, useEffect } from "react";
import { useNotifications } from '@/contexts/notifications-context';
import { 
  X,
  Clock, 
  Phone,
  Mail,
  DollarSign,
  Calendar,
  User,
  Scissors,
  MapPin,
  FileText,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  PlayCircle,
  PauseCircle,
  Loader2
} from "lucide-react";
import { Button } from "@heya-pos/ui";
import { Input } from "@heya-pos/ui";
import { Label } from "@heya-pos/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@heya-pos/ui";
import { Textarea } from "@heya-pos/ui";
import { Badge } from "@heya-pos/ui";
import { Separator } from "@heya-pos/ui";
import { cn } from "@heya-pos/ui";
import { useToast } from "@heya-pos/ui";
import { format } from "date-fns";
import { SlideOutPanel } from "./SlideOutPanel";
import { BookingActions } from "./BookingActions";
import { displayFormats } from "../lib/date-utils";
import { apiClient } from "@/lib/api-client";

interface BookingService {
  id: string;
  name: string;
  duration: number;
  price: number;
}

interface BookingDetailsSlideOutProps {
  isOpen: boolean;
  onClose: () => void;
  booking: {
    id: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    serviceName: string; // Deprecated - kept for backward compatibility
    services?: BookingService[]; // Array for multi-service bookings
    staffName: string;
    staffId: string;
    startTime: Date;
    endTime: Date;
    status: "confirmed" | "in-progress" | "completed" | "cancelled" | "no-show";
    isPaid: boolean;
    totalPrice: number;
    notes?: string;
  };
  staff: Array<{ id: string; name: string; color: string }>;
  onSave: (booking: any) => void;
  onDelete: (bookingId: string) => void;
  onStatusChange: (bookingId: string, status: string) => void;
  onPaymentStatusChange: (bookingId: string, isPaid: boolean) => void;
}

export function BookingDetailsSlideOut({
  isOpen,
  onClose,
  booking,
  staff,
  onSave,
  onDelete,
  onStatusChange,
  onPaymentStatusChange
}: BookingDetailsSlideOutProps) {
  const { toast } = useToast();
  const { refreshNotifications } = useNotifications();
  const [isEditing, setIsEditing] = useState(false);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);
  // Initialize form data with separate date and time objects
  const initializeFormData = (booking: any) => {
    // Create separate Date objects to avoid shared reference issues
    const startDate = new Date(booking.startTime);
    const startTime = new Date(booking.startTime);
    
    return {
      staffId: booking.staffId,
      date: startDate,
      time: startTime,
      notes: booking.notes || ""
    };
  };
  
  const [formData, setFormData] = useState(() => initializeFormData(booking));

  useEffect(() => {
    // Only reset form data if we're not currently editing
    // This prevents the form from resetting while the user is making changes
    if (!isEditing) {
      setFormData(initializeFormData(booking));
    }
  }, [booking, isEditing]);

  const duration = Math.round((booking.endTime.getTime() - booking.startTime.getTime()) / (1000 * 60));
  const selectedStaff = staff.find(s => s.id === formData.staffId);
  
  // Calculate progress for in-progress bookings
  const getBookingProgress = () => {
    if (booking.status !== "in-progress") return 0;
    
    const now = new Date();
    const start = new Date(booking.startTime);
    const end = new Date(booking.endTime);
    
    if (now < start) return 0;
    if (now > end) return 100;
    
    const totalDuration = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    
    return Math.round((elapsed / totalDuration) * 100);
  };
  
  const progress = getBookingProgress();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "confirmed": return <CheckCircle className="h-4 w-4" />;
      case "in-progress": return <PlayCircle className="h-4 w-4" />;
      case "completed": return <CheckCircle className="h-4 w-4" />;
      case "cancelled": return <XCircle className="h-4 w-4" />;
      case "no-show": return <AlertCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-teal-100 text-teal-800";
      case "in-progress": return "bg-teal-100 text-teal-800";
      case "completed": return "bg-green-100 text-green-800";
      case "cancelled": return "bg-red-100 text-red-800";
      case "no-show": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const handleSave = () => {
    // Exit edit mode immediately for better UX
    setIsEditing(false);
    
    const { status, ...bookingWithoutStatus } = booking;
    const startTimeISO = formData.time instanceof Date ? formData.time.toISOString() : formData.time;
    const endTimeISO = new Date(formData.time.getTime() + duration * 60000).toISOString();
    
    // Fire and forget - don't await
    onSave({
      ...bookingWithoutStatus,
      staffId: formData.staffId,
      startTime: startTimeISO,
      endTime: endTimeISO,
      notes: formData.notes
    }).then(() => {
      // Show success toast
      toast({
        title: "Booking updated",
        description: `${booking.customerName}'s appointment has been updated successfully.`,
        variant: "default",
        className: "bg-green-50 border-green-200",
        duration: 5000,
      });
      
      // Trigger notification refresh after a delay to ensure backend processing
      setTimeout(() => {
        refreshNotifications();
      }, 2000);
    }).catch(error => {
      // If save fails, re-enter edit mode
      console.error('Failed to save booking:', error);
      setIsEditing(true);
    });
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this booking?")) {
      onDelete(booking.id);
    }
  };

  const handleStatusChange = async (bookingId: string, newStatus: string) => {
    setIsStatusUpdating(true);
    try {
      await onStatusChange(bookingId, newStatus);
      
      // Refresh notifications after a delay to allow backend processing
      // Increased to 2 seconds to ensure outbox events are processed
      setTimeout(() => {
        refreshNotifications();
      }, 2000);
    } finally {
      setIsStatusUpdating(false);
    }
  };

  const handlePaymentToggle = async () => {
    setIsPaymentProcessing(true);
    try {
      const isPaid = booking.paymentStatus === 'paid';
      await onPaymentStatusChange(booking.id, !isPaid);
    } finally {
      setIsPaymentProcessing(false);
    }
  };

  return (
    <SlideOutPanel isOpen={isOpen} onClose={onClose} title="Booking Details">
      <div className="flex flex-col h-full relative">
        {/* Progress bar for in-progress bookings */}
        {booking.status === "in-progress" && (
          <div className="absolute inset-x-0 top-0 h-1 z-10">
            <div className="h-1 bg-gray-200">
              <div 
                className="h-full bg-teal-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
        
        {/* Header */}
        <div className="px-6 py-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">{booking.customerName}</h2>
              <p className="text-sm text-gray-600">
                {booking.services?.length > 0
                  ? booking.services.map(s => s.name).join(' + ')
                  : booking.serviceName}
              </p>
            </div>
            <Badge className={cn("flex items-center gap-1", getStatusColor(booking.status))}>
              {booking.status === "in-progress" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  In Progress
                </>
              ) : (
                <>
                  {getStatusIcon(booking.status)}
                  {booking.status.charAt(0).toUpperCase() + booking.status.slice(1).replace('-', ' ')}
                </>
              )}
            </Badge>
          </div>

          {/* Quick Actions */}
          <BookingActions
            booking={{
              ...booking,
              isPaid: booking.paymentStatus === 'PAID' || booking.paymentStatus === 'paid',
              totalPrice: booking.totalPrice,
              customerPhone: booking.customerPhone,
              customerEmail: booking.customerEmail
            }}
            size="sm"
            variant="inline"
            showEdit={false}
            showDelete={false}
            isPaymentProcessing={isPaymentProcessing}
            isStatusUpdating={isStatusUpdating}
            onStatusChange={handleStatusChange}
            onPaymentToggle={handlePaymentToggle}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isEditing ? (
            // Edit Mode
            <div className="space-y-4">
              <div>
                <Label>Staff Member</Label>
                <Select
                  value={formData.staffId}
                  onValueChange={(value) => setFormData({ ...formData, staffId: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
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
                  value={format(formData.date, "yyyy-MM-dd")}
                  onChange={(e) => {
                    const newDate = new Date(e.target.value);
                    // Create a new time object with the new date but keeping the same time
                    const updatedTime = new Date(formData.time);
                    updatedTime.setFullYear(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
                    setFormData({ 
                      ...formData, 
                      date: newDate, 
                      time: updatedTime 
                    });
                  }}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Time</Label>
                <Input
                  type="time"
                  value={format(formData.time, "HH:mm")}
                  onChange={(e) => {
                    const [hours, minutes] = e.target.value.split(':');
                    // Create a NEW Date object based on the current date
                    const newTime = new Date(formData.date.getTime()); // Clone the date
                    newTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                    setFormData({ ...formData, time: newTime });
                  }}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="mt-1"
                />
              </div>
            </div>
          ) : (
            // View Mode
            <div className="space-y-6">
              {/* Date & Time */}
              <div>
                <h3 className="font-medium text-sm text-gray-700 mb-2">Date & Time</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>{displayFormats.date(booking.startTime)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span>{displayFormats.time(booking.startTime)} - {displayFormats.time(booking.endTime)}</span>
                    <Badge variant="secondary" className="text-xs">{duration} min</Badge>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Customer Info */}
              <div>
                <h3 className="font-medium text-sm text-gray-700 mb-2">Customer</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-gray-400" />
                    <span>{booking.customerName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <a href={`tel:${booking.customerPhone}`} className="text-blue-600 hover:underline">
                      {booking.customerPhone}
                    </a>
                  </div>
                  {booking.customerEmail && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <a href={`mailto:${booking.customerEmail}`} className="text-blue-600 hover:underline">
                        {booking.customerEmail}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Service & Staff */}
              <div>
                <h3 className="font-medium text-sm text-gray-700 mb-2">Service Details</h3>
                <div className="space-y-2">
                  {booking.services?.length > 0 ? (
                    <>
                      {booking.services.map((service) => (
                        <div key={service.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Scissors className="h-4 w-4 text-gray-400" />
                            <span>{service.name}</span>
                            <span className="text-gray-500">({service.duration}min)</span>
                          </div>
                          <span className="font-medium">${service.price.toFixed(2)}</span>
                        </div>
                      ))}
                      {booking.services.length > 1 && (
                        <div className="pt-2 border-t">
                          <div className="flex items-center justify-between text-sm font-semibold">
                            <span>Total</span>
                            <span>${booking.totalPrice.toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-sm">
                      <Scissors className="h-4 w-4 text-gray-400" />
                      <span>{booking.serviceName}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm mt-3">
                    <User className="h-4 w-4 text-gray-400" />
                    <span>with {booking.staffName}</span>
                    {selectedStaff && (
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: selectedStaff.color }}
                      />
                    )}
                  </div>
                  {booking.paymentStatus === 'paid' && (
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      <Badge variant="success" className="text-xs">Paid</Badge>
                    </div>
                  )}
                </div>
              </div>

              {booking.notes && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-medium text-sm text-gray-700 mb-2">Notes</h3>
                    <p className="text-sm text-gray-600">{booking.notes}</p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50">
          {isEditing ? (
            <div className="flex gap-2">
              <Button onClick={handleSave} className="flex-1">
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsEditing(true)}
                className="flex-1"
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button 
                variant="outline" 
                onClick={handleDelete}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </SlideOutPanel>
  );
}