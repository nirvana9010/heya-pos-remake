"use client";

import { Button, Badge } from "@heya-pos/ui";
import { cn } from "@heya-pos/ui";
import {
  PlayCircle,
  CheckCircle,
  XCircle,
  DollarSign,
  Calendar,
  Edit2,
  Trash2,
  MessageSquare,
  Mail,
  CreditCard,
  Clock,
  AlertCircle,
  Loader2
} from "lucide-react";

export interface BookingActionsProps {
  booking: {
    id: string;
    status: string;
    isPaid?: boolean;
    paidAmount?: number;
    totalAmount?: number;
    totalPrice?: number;
    customerPhone?: string;
    customerEmail?: string;
    startTime?: Date | string;
  };
  size?: "sm" | "default" | "lg";
  variant?: "inline" | "stacked";
  showEdit?: boolean;
  showDelete?: boolean;
  showPayment?: boolean;
  isPaymentProcessing?: boolean;
  isStatusUpdating?: boolean;
  isProcessingPayment?: boolean;
  onStatusChange?: (bookingId: string, status: string) => void | Promise<void>;
  onPaymentToggle?: (bookingId: string, isPaid: boolean) => void;
  onProcessPayment?: (bookingId: string) => void;
  onEdit?: (bookingId: string) => void;
  onDelete?: (bookingId: string) => void;
  onReschedule?: (bookingId: string) => void;
}

export function BookingActions({
  booking,
  size = "sm",
  variant = "inline",
  showEdit = true,
  showDelete = true,
  showPayment = true,
  isPaymentProcessing = false,
  isStatusUpdating = false,
  isProcessingPayment = false,
  onStatusChange,
  onPaymentToggle,
  onProcessPayment,
  onEdit,
  onDelete,
  onReschedule
}: BookingActionsProps) {
  const status = booking.status?.toLowerCase();
  const isPaid = booking.isPaid || (booking.paidAmount && booking.paidAmount > 0);
  const amount = booking.totalAmount || booking.totalPrice || 0;
  
  // Check if booking is upcoming
  const isUpcoming = booking.startTime && new Date(booking.startTime) > new Date();
  const isStartingSoon = isUpcoming && 
    new Date(booking.startTime).getTime() - new Date().getTime() < 3600000; // Within 1 hour

  const handleDelete = () => {
    if (onDelete && window.confirm("Are you sure you want to delete this booking?")) {
      onDelete(booking.id);
    }
  };

  const containerClass = variant === "stacked" ? "flex flex-col gap-2" : "flex flex-wrap gap-2";

  return (
    <div className={containerClass}>
      {/* Status Actions */}
      {status === "pending" && onStatusChange && (
        <Button
          size={size}
          variant="default"
          onClick={() => onStatusChange(booking.id, "CONFIRMED")}
          className="flex items-center gap-1"
        >
          <CheckCircle className="h-4 w-4" />
          Confirm
        </Button>
      )}
      
      {status === "confirmed" && onStatusChange && (
        <>
          <Button
            size={size}
            variant="outline"
            onClick={() => onStatusChange(booking.id, "IN_PROGRESS")}
            disabled={isStatusUpdating}
            className="flex items-center gap-1"
          >
            {isStatusUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PlayCircle className="h-4 w-4" />
            )}
            Start
          </Button>
          <Button
            size={size}
            variant="outline"
            onClick={() => onStatusChange(booking.id, "CANCELLED")}
            disabled={isStatusUpdating}
            className="flex items-center gap-1 text-red-600 hover:text-red-700"
          >
            {isStatusUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            Cancel
          </Button>
        </>
      )}
      
      {status === "in-progress" && onStatusChange && (
        <>
          <Button
            size={size}
            variant="outline"
            onClick={() => onStatusChange(booking.id, "COMPLETED")}
            disabled={isStatusUpdating}
            className="flex items-center gap-1"
          >
            {isStatusUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            Complete
          </Button>
          <Button
            size={size}
            variant="outline"
            onClick={() => onStatusChange(booking.id, "CANCELLED")}
            disabled={isStatusUpdating}
            className="flex items-center gap-1 text-red-600 hover:text-red-700"
          >
            {isStatusUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            Cancel
          </Button>
        </>
      )}

      {/* Payment Actions */}
      {showPayment && status !== "cancelled" && status !== "no_show" && (
        <>
          {!isPaid && onProcessPayment && (
            <Button
              size={size}
              variant="outline"
              onClick={() => onProcessPayment(booking.id)}
              disabled={isProcessingPayment}
              className="flex items-center gap-1"
            >
              {isProcessingPayment ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4" />
              )}
              {isProcessingPayment ? "Processing..." : "Process Payment"}
            </Button>
          )}
          {!isPaid && onPaymentToggle && (
            <Button
              size={size}
              variant="outline"
              onClick={() => onPaymentToggle(booking.id, !isPaid)}
              disabled={isPaymentProcessing}
              className="flex items-center gap-1"
            >
              {isPaymentProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <DollarSign className="h-4 w-4" />
              )}
              {isPaymentProcessing ? "Processing..." : "Mark as Paid"}
            </Button>
          )}
          {isPaid && (
            <Badge variant="success" className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Paid
            </Badge>
          )}
        </>
      )}

      {/* Edit Actions */}
      {showEdit && onReschedule && status !== "completed" && status !== "cancelled" && (
        <Button
          size={size}
          variant="outline"
          onClick={() => onReschedule(booking.id)}
          className="flex items-center gap-1"
        >
          <Calendar className="h-4 w-4" />
          Reschedule
        </Button>
      )}
      
      {showEdit && onEdit && (
        <Button
          size={size}
          variant="outline"
          onClick={() => onEdit(booking.id)}
          className="flex items-center gap-1"
        >
          <Edit2 className="h-4 w-4" />
          Edit
        </Button>
      )}

      {/* Delete Action */}
      {showDelete && onDelete && status !== "completed" && (
        <Button
          size={size}
          variant="outline"
          onClick={handleDelete}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}