/**
 * Detailed read model for single booking view
 * Contains all information needed for booking details page
 */
export interface BookingDetail {
  id: string;
  bookingNumber: string;
  status: string;
  
  // Customer info
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
    loyaltyPoints?: number;
  };
  
  // Staff info
  staff: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  
  // Service info
  service: {
    id: string;
    name: string;
    category: string;
    duration: number;
    price: number;
  };
  
  // Location info
  location: {
    id: string;
    name: string;
    address: string;
    phone: string;
  };
  
  // Booking details
  startTime: Date;
  endTime: Date;
  totalAmount: number;
  depositAmount: number;
  notes?: string;
  
  // Override info
  isOverride: boolean;
  overrideReason?: string;
  
  // Metadata
  source: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  
  // Cancellation info
  cancelledAt?: Date;
  cancellationReason?: string;
  cancelledBy?: string;
}