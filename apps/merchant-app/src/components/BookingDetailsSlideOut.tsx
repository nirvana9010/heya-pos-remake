"use client";

import { useState, useEffect } from "react";
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
  PauseCircle
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

interface BookingDetailsSlideOutProps {
  isOpen: boolean;
  onClose: () => void;
  booking: {
    id: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    serviceName: string;
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
  onSave?: (booking: any) => void;
  onDelete?: (bookingId: string) => void;
  onStatusChange?: (bookingId: string, status: string) => void;
  onPaymentStatusChange?: (bookingId: string, isPaid: boolean) => void;
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
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    staffId: booking.staffId,
    date: booking.startTime,
    time: booking.startTime,
    notes: booking.notes || ""
  });

  useEffect(() => {
    if (booking) {
      setFormData({
        staffId: booking.staffId,
        date: booking.startTime,
        time: booking.startTime,
        notes: booking.notes || ""
      });
    }
  }, [booking]);

  const duration = Math.round((booking.endTime.getTime() - booking.startTime.getTime()) / (1000 * 60));
  const selectedStaff = staff.find(s => s.id === formData.staffId);

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
      case "confirmed": return "bg-purple-100 text-purple-800";
      case "in-progress": return "bg-teal-100 text-teal-800";
      case "completed": return "bg-green-100 text-green-800";
      case "cancelled": return "bg-red-100 text-red-800";
      case "no-show": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const handleSave = () => {
    if (onSave) {
      onSave({
        ...booking,
        staffId: formData.staffId,
        startTime: formData.time,
        endTime: new Date(formData.time.getTime() + duration * 60000),
        notes: formData.notes
      });
    }
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (onDelete && window.confirm("Are you sure you want to delete this booking?")) {
      onDelete(booking.id);
    }
  };

  const handleStatusChange = (newStatus: string) => {
    if (onStatusChange) {
      onStatusChange(booking.id, newStatus);
    }
  };

  const handlePaymentToggle = () => {
    if (onPaymentStatusChange) {
      onPaymentStatusChange(booking.id, !booking.isPaid);
    }
  };

  return (
    <SlideOutPanel isOpen={isOpen} onClose={onClose} title="Booking Details">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-6 py-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">{booking.customerName}</h2>
              <p className="text-sm text-gray-600">{booking.serviceName}</p>
            </div>
            <Badge className={cn("flex items-center gap-1", getStatusColor(booking.status))}>
              {getStatusIcon(booking.status)}
              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1).replace('-', ' ')}
            </Badge>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            {booking.status === "confirmed" && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleStatusChange("in-progress")}
                className="flex items-center gap-1"
              >
                <PlayCircle className="h-4 w-4" />
                Start
              </Button>
            )}
            {booking.status === "in-progress" && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleStatusChange("completed")}
                className="flex items-center gap-1"
              >
                <CheckCircle className="h-4 w-4" />
                Complete
              </Button>
            )}
            {(booking.status === "confirmed" || booking.status === "in-progress") && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleStatusChange("cancelled")}
                className="flex items-center gap-1 text-red-600 hover:text-red-700"
              >
                <XCircle className="h-4 w-4" />
                Cancel
              </Button>
            )}
            <Button
              size="sm"
              variant={booking.isPaid ? "default" : "outline"}
              onClick={handlePaymentToggle}
              className={cn(
                "flex items-center gap-1",
                booking.isPaid && "bg-green-600 hover:bg-green-700"
              )}
            >
              <DollarSign className="h-4 w-4" />
              {booking.isPaid ? "Paid" : "Mark as Paid"}
            </Button>
          </div>
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
                    const updatedTime = new Date(formData.time);
                    updatedTime.setFullYear(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
                    setFormData({ ...formData, date: newDate, time: updatedTime });
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
                    const newTime = new Date(formData.date);
                    newTime.setHours(parseInt(hours), parseInt(minutes));
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
                    <span>{format(booking.startTime, "EEEE, MMMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span>{format(booking.startTime, "h:mm a")} - {format(booking.endTime, "h:mm a")}</span>
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
                  <div className="flex items-center gap-2 text-sm">
                    <Scissors className="h-4 w-4 text-gray-400" />
                    <span>{booking.serviceName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-gray-400" />
                    <span>with {booking.staffName}</span>
                    {selectedStaff && (
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: selectedStaff.color }}
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                    <span className="font-semibold">${Number(booking.totalPrice).toFixed(2)}</span>
                    {booking.isPaid && (
                      <Badge variant="success" className="text-xs">Paid</Badge>
                    )}
                  </div>
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