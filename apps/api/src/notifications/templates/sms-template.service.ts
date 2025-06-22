import { Injectable } from '@nestjs/common';
import { NotificationContext, NotificationType } from '../interfaces/notification.interface';
import { format } from 'date-fns';

@Injectable()
export class SmsTemplateService {
  async renderSmsTemplate(
    type: NotificationType,
    context: NotificationContext,
  ): Promise<string> {
    switch (type) {
      case NotificationType.BOOKING_CONFIRMATION:
        return this.renderBookingConfirmation(context);
      case NotificationType.BOOKING_REMINDER_24H:
        return this.renderBookingReminder24h(context);
      case NotificationType.BOOKING_REMINDER_2H:
        return this.renderBookingReminder2h(context);
      case NotificationType.BOOKING_CANCELLED:
        return this.renderBookingCancelled(context);
      case NotificationType.BOOKING_RESCHEDULED:
        return this.renderBookingRescheduled(context);
      default:
        throw new Error(`SMS template not found for type: ${type}`);
    }
  }

  private renderBookingConfirmation(context: NotificationContext): string {
    const { booking, merchant } = context;
    const date = format(booking.date, 'EEE d/M');
    
    // Keep under 160 characters
    return `${merchant.name}: Booking confirmed for ${date} at ${booking.time}. ` +
           `Service: ${booking.serviceName} with ${booking.staffName}. ` +
           `Ref: ${booking.bookingNumber}`;
  }

  private renderBookingReminder24h(context: NotificationContext): string {
    const { booking, merchant } = context;
    const date = format(booking.date, 'EEE d/M');
    
    return `${merchant.name}: Reminder - Your appointment is tomorrow ${date} at ${booking.time}. ` +
           `${booking.serviceName} with ${booking.staffName}. See you soon!`;
  }

  private renderBookingReminder2h(context: NotificationContext): string {
    const { booking, merchant } = context;
    
    return `${merchant.name}: Your appointment is in 2 hours at ${booking.time}. ` +
           `${booking.serviceName} with ${booking.staffName}. See you soon!`;
  }

  private renderBookingCancelled(context: NotificationContext): string {
    const { booking, merchant } = context;
    const date = format(booking.date, 'EEE d/M');
    
    return `${merchant.name}: Your booking on ${date} at ${booking.time} has been cancelled. ` +
           `Ref: ${booking.bookingNumber}. Call us to rebook.`;
  }

  private renderBookingRescheduled(context: NotificationContext): string {
    const { booking, merchant, originalDate, originalTime } = context as any;
    const newDate = format(booking.date, 'EEE d/M');
    
    return `${merchant.name}: Your booking has been rescheduled to ${newDate} at ${booking.time}. ` +
           `Ref: ${booking.bookingNumber}`;
  }
}