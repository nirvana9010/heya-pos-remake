import { Injectable } from '@nestjs/common';
import { NotificationContext, NotificationType } from '../interfaces/notification.interface';
import { format } from 'date-fns';

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

@Injectable()
export class EmailTemplateService {
  async renderEmailTemplate(
    type: NotificationType,
    context: NotificationContext,
  ): Promise<EmailTemplate> {
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
      case NotificationType.BOOKING_NEW_STAFF:
        return this.renderStaffNewBooking(context);
      case NotificationType.BOOKING_CANCELLED_STAFF:
        return this.renderStaffCancellation(context);
      default:
        throw new Error(`Template not found for type: ${type}`);
    }
  }

  private renderBookingConfirmation(context: NotificationContext): EmailTemplate {
    const { booking, merchant, customer } = context;
    const formattedDate = format(booking.date, 'EEEE, MMMM d, yyyy');
    
    const subject = `Booking Confirmation - ${merchant.name}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #333; margin: 0;">${merchant.name}</h1>
        </div>
        
        <div style="padding: 30px;">
          <h2 style="color: #333;">Booking Confirmed!</h2>
          <p>Hi ${customer.firstName || 'there'},</p>
          <p>Your booking has been confirmed. Here are the details:</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <table style="width: 100%;">
              <tr>
                <td style="padding: 5px 0;"><strong>Service:</strong></td>
                <td>${booking.serviceName}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0;"><strong>Date:</strong></td>
                <td>${formattedDate}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0;"><strong>Time:</strong></td>
                <td>${booking.time}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0;"><strong>Duration:</strong></td>
                <td>${booking.duration} minutes</td>
              </tr>
              <tr>
                <td style="padding: 5px 0;"><strong>Staff:</strong></td>
                <td>${booking.staffName}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0;"><strong>Price:</strong></td>
                <td>$${booking.price.toFixed(2)}</td>
              </tr>
            </table>
          </div>
          
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Location:</strong><br>
            ${booking.locationName}<br>
            ${booking.locationAddress || ''}<br>
            ${booking.locationPhone ? `Phone: ${booking.locationPhone}` : ''}</p>
          </div>
          
          <p>If you need to reschedule or cancel, please contact us at least 24 hours in advance.</p>
          
          <p>We look forward to seeing you!</p>
          
          <p>Best regards,<br>${merchant.name}</p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;">
          <p>Booking Reference: ${booking.bookingNumber}</p>
          ${merchant.phone ? `<p>Questions? Call us at ${merchant.phone}</p>` : ''}
        </div>
      </div>
    `;
    
    const text = `
Booking Confirmation - ${merchant.name}

Hi ${customer.firstName || 'there'},

Your booking has been confirmed. Here are the details:

Service: ${booking.serviceName}
Date: ${formattedDate}
Time: ${booking.time}
Duration: ${booking.duration} minutes
Staff: ${booking.staffName}
Price: $${booking.price.toFixed(2)}

Location:
${booking.locationName}
${booking.locationAddress || ''}
${booking.locationPhone ? `Phone: ${booking.locationPhone}` : ''}

If you need to reschedule or cancel, please contact us at least 24 hours in advance.

We look forward to seeing you!

Best regards,
${merchant.name}

Booking Reference: ${booking.bookingNumber}
${merchant.phone ? `Questions? Call us at ${merchant.phone}` : ''}
    `.trim();
    
    return { subject, html, text };
  }

  private renderBookingReminder24h(context: NotificationContext): EmailTemplate {
    const { booking, merchant, customer } = context;
    const formattedDate = format(booking.date, 'EEEE, MMMM d, yyyy');
    
    const subject = `Reminder: Your appointment tomorrow - ${merchant.name}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #333; margin: 0;">${merchant.name}</h1>
        </div>
        
        <div style="padding: 30px;">
          <h2 style="color: #333;">Appointment Reminder</h2>
          <p>Hi ${customer.firstName || 'there'},</p>
          <p>This is a friendly reminder about your appointment tomorrow:</p>
          
          <div style="background-color: #d4edda; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0;">📅 ${formattedDate}</h3>
            <p style="font-size: 18px; margin: 5px 0;">⏰ ${booking.time}</p>
            <p style="margin: 5px 0;">Service: ${booking.serviceName} with ${booking.staffName}</p>
          </div>
          
          <p>Please arrive 5-10 minutes early to complete any necessary forms.</p>
          
          <p>Need to reschedule? Please let us know as soon as possible.</p>
          
          <p>See you tomorrow!</p>
          
          <p>Best regards,<br>${merchant.name}</p>
        </div>
      </div>
    `;
    
    const text = `
Reminder: Your appointment tomorrow - ${merchant.name}

Hi ${customer.firstName || 'there'},

This is a friendly reminder about your appointment tomorrow:

Date: ${formattedDate}
Time: ${booking.time}
Service: ${booking.serviceName} with ${booking.staffName}

Please arrive 5-10 minutes early to complete any necessary forms.

Need to reschedule? Please let us know as soon as possible.

See you tomorrow!

Best regards,
${merchant.name}
    `.trim();
    
    return { subject, html, text };
  }

  private renderBookingReminder2h(context: NotificationContext): EmailTemplate {
    const { booking, merchant, customer } = context;
    const formattedDate = format(booking.date, 'EEEE, MMMM d, yyyy');
    
    const subject = `Reminder: Your appointment today at ${booking.time} - ${merchant.name}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #333; margin: 0;">${merchant.name}</h1>
        </div>
        
        <div style="padding: 30px;">
          <h2 style="color: #333;">⏰ Appointment in 2 Hours!</h2>
          <p>Hi ${customer.firstName || 'there'},</p>
          <p>Just a quick reminder that your appointment is coming up soon:</p>
          
          <div style="background-color: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0; border: 2px solid #ffeaa7;">
            <h3 style="margin-top: 0; color: #856404;">📍 Today at ${booking.time}</h3>
            <p style="margin: 5px 0;"><strong>Service:</strong> ${booking.serviceName}</p>
            <p style="margin: 5px 0;"><strong>With:</strong> ${booking.staffName}</p>
            <p style="margin: 5px 0;"><strong>Duration:</strong> ${booking.duration} minutes</p>
          </div>
          
          <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;"><strong>📍 Location:</strong><br>
            ${booking.locationName}<br>
            ${booking.locationAddress || ''}<br>
            ${booking.locationPhone ? `Phone: ${booking.locationPhone}` : ''}</p>
          </div>
          
          <p><strong>Please remember:</strong></p>
          <ul>
            <li>Arrive 5-10 minutes early</li>
            <li>Bring any necessary documents or forms</li>
            <li>Call us if you're running late</li>
          </ul>
          
          <p>Looking forward to seeing you soon!</p>
          
          <p>Best regards,<br>${merchant.name}</p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;">
          <p>Booking Reference: ${booking.bookingNumber}</p>
          ${merchant.phone ? `<p>Need to reschedule? Call us at ${merchant.phone}</p>` : ''}
        </div>
      </div>
    `;
    
    const text = `
Reminder: Your appointment today at ${booking.time} - ${merchant.name}

Hi ${customer.firstName || 'there'},

Just a quick reminder that your appointment is coming up soon:

TODAY at ${booking.time}
Service: ${booking.serviceName}
With: ${booking.staffName}
Duration: ${booking.duration} minutes

Location:
${booking.locationName}
${booking.locationAddress || ''}
${booking.locationPhone ? `Phone: ${booking.locationPhone}` : ''}

Please remember:
- Arrive 5-10 minutes early
- Bring any necessary documents or forms
- Call us if you're running late

Looking forward to seeing you soon!

Best regards,
${merchant.name}

Booking Reference: ${booking.bookingNumber}
${merchant.phone ? `Need to reschedule? Call us at ${merchant.phone}` : ''}
    `.trim();
    
    return { subject, html, text };
  }

  private renderBookingCancelled(context: NotificationContext): EmailTemplate {
    const { booking, merchant, customer } = context;
    const formattedDate = format(booking.date, 'EEEE, MMMM d, yyyy');
    
    const subject = `Booking Cancelled - ${merchant.name}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #333; margin: 0;">${merchant.name}</h1>
        </div>
        
        <div style="padding: 30px;">
          <h2 style="color: #333;">Booking Cancelled</h2>
          <p>Hi ${customer.firstName || 'there'},</p>
          <p>Your booking has been cancelled:</p>
          
          <div style="background-color: #f8d7da; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Service:</strong> ${booking.serviceName}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${formattedDate}</p>
            <p style="margin: 5px 0;"><strong>Time:</strong> ${booking.time}</p>
            <p style="margin: 5px 0;"><strong>Reference:</strong> ${booking.bookingNumber}</p>
          </div>
          
          <p>If you'd like to reschedule, please contact us or book online.</p>
          
          <p>We hope to see you again soon!</p>
          
          <p>Best regards,<br>${merchant.name}</p>
        </div>
      </div>
    `;
    
    const text = `
Booking Cancelled - ${merchant.name}

Hi ${customer.firstName || 'there'},

Your booking has been cancelled:

Service: ${booking.serviceName}
Date: ${formattedDate}
Time: ${booking.time}
Reference: ${booking.bookingNumber}

If you'd like to reschedule, please contact us or book online.

We hope to see you again soon!

Best regards,
${merchant.name}
    `.trim();
    
    return { subject, html, text };
  }

  private renderBookingRescheduled(context: NotificationContext): EmailTemplate {
    const { booking, merchant, customer } = context;
    const formattedDate = format(booking.date, 'EEEE, MMMM d, yyyy');
    
    const subject = `Booking Rescheduled - ${merchant.name}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #333; margin: 0;">${merchant.name}</h1>
        </div>
        
        <div style="padding: 30px;">
          <h2 style="color: #333;">Booking Rescheduled</h2>
          <p>Hi ${customer.firstName || 'there'},</p>
          <p>Your booking has been rescheduled. Here are your new appointment details:</p>
          
          <div style="background-color: #d1ecf1; padding: 20px; border-radius: 5px; margin: 20px 0; border: 2px solid #bee5eb;">
            <h3 style="margin-top: 0; color: #0c5460;">📅 New Appointment Details</h3>
            <table style="width: 100%;">
              <tr>
                <td style="padding: 5px 0;"><strong>Service:</strong></td>
                <td>${booking.serviceName}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0;"><strong>New Date:</strong></td>
                <td>${formattedDate}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0;"><strong>New Time:</strong></td>
                <td>${booking.time}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0;"><strong>Staff:</strong></td>
                <td>${booking.staffName}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0;"><strong>Duration:</strong></td>
                <td>${booking.duration} minutes</td>
              </tr>
            </table>
          </div>
          
          <p>Please update your calendar with the new date and time.</p>
          
          <p>If this new time doesn't work for you, please contact us as soon as possible.</p>
          
          <p>We apologize for any inconvenience and look forward to seeing you at your rescheduled appointment!</p>
          
          <p>Best regards,<br>${merchant.name}</p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;">
          <p>Booking Reference: ${booking.bookingNumber}</p>
          ${merchant.phone ? `<p>Questions? Call us at ${merchant.phone}</p>` : ''}
        </div>
      </div>
    `;
    
    const text = `
Booking Rescheduled - ${merchant.name}

Hi ${customer.firstName || 'there'},

Your booking has been rescheduled. Here are your new appointment details:

Service: ${booking.serviceName}
New Date: ${formattedDate}
New Time: ${booking.time}
Staff: ${booking.staffName}
Duration: ${booking.duration} minutes

Please update your calendar with the new date and time.

If this new time doesn't work for you, please contact us as soon as possible.

We apologize for any inconvenience and look forward to seeing you at your rescheduled appointment!

Best regards,
${merchant.name}

Booking Reference: ${booking.bookingNumber}
${merchant.phone ? `Questions? Call us at ${merchant.phone}` : ''}
    `.trim();
    
    return { subject, html, text };
  }

  private renderStaffNewBooking(context: NotificationContext): EmailTemplate {
    const { booking, merchant } = context;
    const formattedDate = format(booking.date, 'EEEE, MMMM d, yyyy');
    
    const subject = `New Booking Alert - ${booking.serviceName}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #10b981; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">New Booking Alert</h1>
        </div>
        
        <div style="padding: 30px;">
          <h2 style="color: #333;">You have a new booking!</h2>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #10b981; margin: 0 0 15px 0;">Booking Details</h3>
            <p style="margin: 5px 0;"><strong>Service:</strong> ${booking.serviceName}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${formattedDate}</p>
            <p style="margin: 5px 0;"><strong>Time:</strong> ${booking.time}</p>
            <p style="margin: 5px 0;"><strong>Staff:</strong> ${booking.staffName}</p>
            <p style="margin: 5px 0;"><strong>Duration:</strong> ${booking.duration} minutes</p>
            <p style="margin: 5px 0;"><strong>Booking #:</strong> ${booking.bookingNumber}</p>
          </div>
          
          <div style="margin-top: 30px; padding: 20px; background-color: #e0f2fe; border-radius: 5px;">
            <p style="margin: 0; text-align: center;">
              <a href="${merchant.website || '#'}/calendar" style="display: inline-block; padding: 12px 30px; background-color: #0ea5e9; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">View in Calendar</a>
            </p>
          </div>
        </div>
      </div>
    `;
    
    const text = `
New Booking Alert

You have a new booking!

Service: ${booking.serviceName}
Date: ${formattedDate}
Time: ${booking.time}
Staff: ${booking.staffName}
Duration: ${booking.duration} minutes
Booking #: ${booking.bookingNumber}

View this booking in your calendar to see more details.
    `.trim();
    
    return { subject, html, text };
  }

  private renderStaffCancellation(context: NotificationContext): EmailTemplate {
    const { booking, merchant } = context;
    const formattedDate = format(booking.date, 'EEEE, MMMM d, yyyy');
    
    const subject = `Booking Cancelled - ${booking.serviceName}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #ef4444; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Booking Cancelled</h1>
        </div>
        
        <div style="padding: 30px;">
          <h2 style="color: #333;">A booking has been cancelled</h2>
          
          <div style="background-color: #fef2f2; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ef4444;">
            <h3 style="color: #ef4444; margin: 0 0 15px 0;">Cancelled Booking Details</h3>
            <p style="margin: 5px 0;"><strong>Service:</strong> ${booking.serviceName}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${formattedDate}</p>
            <p style="margin: 5px 0;"><strong>Time:</strong> ${booking.time}</p>
            <p style="margin: 5px 0;"><strong>Staff:</strong> ${booking.staffName}</p>
            <p style="margin: 5px 0;"><strong>Duration:</strong> ${booking.duration} minutes</p>
            <p style="margin: 5px 0;"><strong>Booking #:</strong> ${booking.bookingNumber}</p>
          </div>
          
          <div style="margin-top: 30px; padding: 20px; background-color: #f3f4f6; border-radius: 5px;">
            <p style="margin: 0; text-align: center;">
              This time slot is now available for other bookings.
            </p>
          </div>
        </div>
      </div>
    `;
    
    const text = `
Booking Cancelled

A booking has been cancelled:

Service: ${booking.serviceName}
Date: ${formattedDate}
Time: ${booking.time}
Staff: ${booking.staffName}
Duration: ${booking.duration} minutes
Booking #: ${booking.bookingNumber}

This time slot is now available for other bookings.
    `.trim();
    
    return { subject, html, text };
  }
}