import { Injectable } from "@nestjs/common";
import {
  NotificationContext,
  NotificationType,
} from "../interfaces/notification.interface";
import { format } from "date-fns";

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

@Injectable()
export class EmailTemplateService {
  private renderEmailFooter(merchant: any, booking?: any): string {
    const footerLines = [];

    if (booking?.bookingNumber) {
      footerLines.push(`<p>Booking Reference: ${booking.bookingNumber}</p>`);
    }

    if (merchant.address) {
      footerLines.push(`<p>${merchant.address}</p>`);
    }

    if (merchant.phone) {
      footerLines.push(`<p>Phone: ${merchant.phone}</p>`);
    }

    if (merchant.email) {
      footerLines.push(`<p>Email: ${merchant.email}</p>`);
    }

    if (merchant.website) {
      footerLines.push(`<p>Website: ${merchant.website}</p>`);
    }

    // Add reply instruction
    const replyNote = merchant.email
      ? `<p style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd;"><strong>To reply, please contact ${merchant.name} directly at <a href="mailto:${merchant.email}">${merchant.email}</a></strong></p>
         <p style="color: #999; font-size: 11px;">This is an automated message from HeyaPOS. Please do not reply to this email.</p>`
      : `<p style="margin-top: 15px; color: #999; font-size: 11px;">This is an automated message. Please do not reply to this email.</p>`;

    return `
      <div style="background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666;">
        ${footerLines.join("\n")}
        ${replyNote}
      </div>
    `;
  }

  private formatPrice(value?: number): string {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return "$0.00";
    }
    return `$${value.toFixed(2)}`;
  }

  private renderTextFooter(merchant: any): string {
    const lines = [
      "",
      "Best regards,",
      merchant.name,
      "",
    ];

    if (merchant.phone) {
      lines.push(`Phone: ${merchant.phone}`);
    }
    if (merchant.email) {
      lines.push(`Email: ${merchant.email}`);
    }
    if (merchant.website) {
      lines.push(`Website: ${merchant.website}`);
    }

    // Add reply instruction
    lines.push("");
    lines.push("---");
    if (merchant.email) {
      lines.push(`To reply, please contact ${merchant.name} directly at ${merchant.email}`);
    }
    lines.push("This is an automated message from HeyaPOS. Please do not reply to this email.");

    return lines.join("\n");
  }

  private renderServiceListHtml(
    booking?: NotificationContext["booking"],
    options: {
      includeDuration?: boolean;
      includeStaff?: boolean;
      includePrice?: boolean;
    } = {},
  ): string {
    if (!booking) {
      return "";
    }

    const includeDuration = options.includeDuration ?? true;
    const includeStaff = options.includeStaff ?? true;
    const includePrice = options.includePrice ?? false;

    const services =
      booking.services && booking.services.length > 0
        ? booking.services
        : booking.serviceName
          ? [
              {
                name: booking.serviceName,
                duration: booking.duration,
                price: booking.price,
                staffName: booking.staffName,
              },
            ]
          : [];

    if (services.length === 0) {
      return "";
    }

    const items = services
      .map(service => {
        const details: string[] = [];

        if (
          includeDuration &&
          typeof service?.duration === "number" &&
          service.duration > 0
        ) {
          details.push(`${service.duration} min`);
        }

        if (includeStaff && service?.staffName) {
          details.push(`with ${service.staffName}`);
        }

        if (
          includePrice &&
          typeof service?.price === "number" &&
          !Number.isNaN(service.price)
        ) {
          details.push(this.formatPrice(service.price));
        }

        const detailText = details.length
          ? `<span style="color: #555;"> (${details.join(" • ")})</span>`
          : "";

        return `<li style="margin-bottom: 6px; line-height: 1.4;"><strong>${service.name}</strong>${detailText}</li>`;
      })
      .join("");

    return `
      <ul style="margin: 8px 0; padding-left: 20px; color: #333;">
        ${items}
      </ul>
    `;
  }

  private renderServiceListText(
    booking?: NotificationContext["booking"],
    options: {
      includeDuration?: boolean;
      includeStaff?: boolean;
      includePrice?: boolean;
    } = {},
  ): string {
    if (!booking) {
      return "";
    }

    const includeDuration = options.includeDuration ?? true;
    const includeStaff = options.includeStaff ?? true;
    const includePrice = options.includePrice ?? false;

    const services =
      booking.services && booking.services.length > 0
        ? booking.services
        : booking.serviceName
          ? [
              {
                name: booking.serviceName,
                duration: booking.duration,
                price: booking.price,
                staffName: booking.staffName,
              },
            ]
          : [];

    if (services.length === 0) {
      return "";
    }

    return services
      .map(service => {
        const details: string[] = [];

        if (
          includeDuration &&
          typeof service?.duration === "number" &&
          service.duration > 0
        ) {
          details.push(`${service.duration} min`);
        }

        if (includeStaff && service?.staffName) {
          details.push(`with ${service.staffName}`);
        }

        if (
          includePrice &&
          typeof service?.price === "number" &&
          !Number.isNaN(service.price)
        ) {
          details.push(this.formatPrice(service.price));
        }

        const suffix = details.length ? ` (${details.join(" • ")})` : "";
        return `- ${service.name}${suffix}`;
      })
      .join("\n");
  }

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
      case NotificationType.LOYALTY_TOUCHPOINT_1:
      case NotificationType.LOYALTY_TOUCHPOINT_2:
      case NotificationType.LOYALTY_TOUCHPOINT_3:
        return this.renderLoyaltyReminder(context);
      default:
        throw new Error(`Template not found for type: ${type}`);
    }
  }

  private renderLoyaltyReminder(context: NotificationContext): EmailTemplate {
    const { merchant, customer, loyaltyReminder } = context;

    if (!loyaltyReminder) {
      throw new Error("Loyalty reminder context missing");
    }

    const subject =
      loyaltyReminder.emailSubject ??
      `Thanks for your loyalty at ${merchant.name}!`;

    const defaultMessage =
      loyaltyReminder.programType === "VISITS"
        ? `Hi ${customer.firstName || "there"}, you've reached ${loyaltyReminder.currentValue} visit${
            loyaltyReminder.currentValue === 1 ? "" : "s"
          }! Stop by soon to enjoy your reward.`
        : `Hi ${customer.firstName || "there"}, you now have ${
            loyaltyReminder.currentValue
          } point${loyaltyReminder.currentValue === 1 ? "" : "s"} with ${
            merchant.name
          }. Redeem them on your next visit!`;

    const body = loyaltyReminder.emailBody ?? defaultMessage;

    const htmlContent = body.includes("<")
      ? body
      : `<p style="font-size: 16px;">${body}</p>`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #333; margin: 0;">${merchant.name}</h1>
        </div>

        <div style="padding: 30px;">
          ${htmlContent}
        </div>

${this.renderEmailFooter(merchant)}
      </div>
    `;

    const textBody = this.toPlainText(body);

    return {
      subject,
      html,
      text: textBody,
    };
  }

  private renderBookingConfirmation(
    context: NotificationContext,
  ): EmailTemplate {
    const { booking, merchant, customer } = context;
    const formattedDate = format(booking.date, "EEEE, MMMM d, yyyy");

    const subject = `Booking Confirmation - ${merchant.name}`;

    const primaryDetailsHtml = `
          <div style="background-color: #fff7cc; border: 1px solid #f0da9a; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <h3 style="margin: 0 0 12px 0; color: #7a5a00;">Appointment Overview</h3>
            <div>
              <p style="margin: 0 0 6px 0; font-weight: bold; color: #333;">Services Selected</p>
              ${this.renderServiceListHtml(booking, {
                includeDuration: false,
                includeStaff: true,
              }) || `<p style="margin: 0; color: #555;">No services recorded.</p>`}
            </div>
            <div style="margin-top: 16px;">
              <p style="margin: 0; font-weight: bold; color: #333;">Date</p>
              <p style="margin: 4px 0 0 0; color: #2f2f2f;">${formattedDate}</p>
            </div>
            <div style="margin-top: 12px;">
              <p style="margin: 0; font-weight: bold; color: #333;">Time</p>
              <p style="margin: 4px 0 0 0; color: #2f2f2f;">${booking.time}</p>
            </div>
          </div>
    `;

    const secondaryDetailsHtml = `
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tbody>
                <tr>
                  <td style="padding: 6px 0; color: #555;"><strong>Customer</strong></td>
                  <td style="padding: 6px 0; color: #333;">
                    ${booking.customerName || `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || "Not provided"}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #555;"><strong>Contact</strong></td>
                  <td style="padding: 6px 0; color: #333;">
                    ${booking.customerPhone || customer.phone || customer.email || "Not provided"}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #555;"><strong>Total Duration</strong></td>
                  <td style="padding: 6px 0; color: #333;">${booking.duration ? `${booking.duration} minutes` : "Not specified"}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #555;"><strong>Estimated Value</strong></td>
                  <td style="padding: 6px 0; color: #333;">${this.formatPrice(booking.price)}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #555;"><strong>Staff</strong></td>
                  <td style="padding: 6px 0; color: #333;">${booking.staffName || "Not assigned"}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #555;"><strong>Booking Number</strong></td>
                  <td style="padding: 6px 0; color: #333;">${booking.bookingNumber || "Not provided"}</td>
                </tr>
              </tbody>
            </table>
          </div>
    `;

    const locationCalloutHtml = `
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Location:</strong><br>
            ${booking.locationName}<br>
            ${booking.locationAddress || ""}<br>
            ${booking.locationPhone ? `Phone: ${booking.locationPhone}` : ""}</p>
          </div>
    `;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #333; margin: 0;">${merchant.name}</h1>
        </div>
        
        <div style="padding: 30px;">
          <h2 style="color: #333;">Booking Confirmed!</h2>
          <p>Hi ${customer.firstName || "there"},</p>
          <p>Your booking has been confirmed. Here are the details:</p>
          
${primaryDetailsHtml}
${secondaryDetailsHtml}
${locationCalloutHtml}
          
          <p>If you need to reschedule or cancel, please contact us at least 24 hours in advance.</p>
          
          <p>We look forward to seeing you!</p>
          
          <p>Best regards,<br>${merchant.name}</p>
        </div>
        
${this.renderEmailFooter(merchant, booking)}
      </div>
    `;

    const text = `
Booking Confirmation - ${merchant.name}

Hi ${customer.firstName || "there"},

Your booking has been confirmed. Here are the details:

Appointment Overview
Services:
${this.renderServiceListText(booking, {
  includeDuration: false,
  includeStaff: true,
})}
Date: ${formattedDate}
Time: ${booking.time}

Additional Details
Customer: ${
  booking.customerName ||
  `${customer.firstName || ""} ${customer.lastName || ""}`.trim() ||
  "Not provided"
}
Contact: ${booking.customerPhone || customer.phone || customer.email || "Not provided"}
Total Duration: ${booking.duration ? `${booking.duration} minutes` : "Not specified"}
Estimated Value: ${this.formatPrice(booking.price)}
Staff: ${booking.staffName || "Not assigned"}
Booking Number: ${booking.bookingNumber || "Not provided"}

Location:
${booking.locationName}
${booking.locationAddress || ""}
${booking.locationPhone ? `Phone: ${booking.locationPhone}` : ""}

If you need to reschedule or cancel, please contact us at least 24 hours in advance.

We look forward to seeing you!
${this.renderTextFooter(merchant)}
    `.trim();

    return { subject, html, text };
  }

  private renderBookingReminder24h(
    context: NotificationContext,
  ): EmailTemplate {
    const { booking, merchant, customer } = context;
    const formattedDate = format(booking.date, "EEEE, MMMM d, yyyy");

    const subject = `Reminder: Your appointment tomorrow - ${merchant.name}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #333; margin: 0;">${merchant.name}</h1>
        </div>
        
        <div style="padding: 30px;">
          <h2 style="color: #333;">Appointment Reminder</h2>
          <p>Hi ${customer.firstName || "there"},</p>
          <p>This is a friendly reminder about your appointment tomorrow:</p>
          
          <div style="background-color: #d4edda; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0;">📅 ${formattedDate}</h3>
            <p style="font-size: 18px; margin: 5px 0;">⏰ ${booking.time}</p>
            <div style="margin-top: 10px;">
              <p style="margin: 0 0 6px 0;"><strong>Services:</strong></p>
              ${this.renderServiceListHtml(booking, {
                includeDuration: true,
                includeStaff: true,
              })}
            </div>
          </div>
          
          <p>Please arrive 5-10 minutes early to complete any necessary forms.</p>
          
          <p>Need to reschedule? Please let us know as soon as possible.</p>
          
          <p>See you tomorrow!</p>
          
          <p>Best regards,<br>${merchant.name}</p>
        </div>
        
${this.renderEmailFooter(merchant, booking)}
      </div>
    `;

    const text = `
Reminder: Your appointment tomorrow - ${merchant.name}

Hi ${customer.firstName || "there"},

This is a friendly reminder about your appointment tomorrow:

Date: ${formattedDate}
Time: ${booking.time}
Services:
${this.renderServiceListText(booking, {
  includeDuration: true,
  includeStaff: true,
})}

Please arrive 5-10 minutes early to complete any necessary forms.

Need to reschedule? Please let us know as soon as possible.

See you tomorrow!
${this.renderTextFooter(merchant)}
    `.trim();

    return { subject, html, text };
  }

  private renderBookingReminder2h(context: NotificationContext): EmailTemplate {
    const { booking, merchant, customer } = context;
    const formattedDate = format(booking.date, "EEEE, MMMM d, yyyy");

    const subject = `Reminder: Your appointment today at ${booking.time} - ${merchant.name}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #333; margin: 0;">${merchant.name}</h1>
        </div>
        
        <div style="padding: 30px;">
          <h2 style="color: #333;">⏰ Appointment in 2 Hours!</h2>
          <p>Hi ${customer.firstName || "there"},</p>
          <p>Just a quick reminder that your appointment is coming up soon:</p>
          
          <div style="background-color: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0; border: 2px solid #ffeaa7;">
            <h3 style="margin-top: 0; color: #856404;">📍 Today at ${booking.time}</h3>
            <div style="margin-top: 10px;">
              <p style="margin: 0 0 6px 0;"><strong>Services:</strong></p>
              ${this.renderServiceListHtml(booking, {
                includeDuration: true,
                includeStaff: true,
              })}
            </div>
            <p style="margin: 8px 0 0 0;"><strong>Total Duration:</strong> ${booking.duration} minutes</p>
          </div>
          
          <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;"><strong>📍 Location:</strong><br>
            ${booking.locationName}<br>
            ${booking.locationAddress || ""}<br>
            ${booking.locationPhone ? `Phone: ${booking.locationPhone}` : ""}</p>
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
        
${this.renderEmailFooter(merchant, booking)}
      </div>
    `;

    const text = `
Reminder: Your appointment today at ${booking.time} - ${merchant.name}

Hi ${customer.firstName || "there"},

Just a quick reminder that your appointment is coming up soon:

TODAY at ${booking.time}
Services:
${this.renderServiceListText(booking, {
  includeDuration: true,
  includeStaff: true,
})}
Total Duration: ${booking.duration} minutes

Location:
${booking.locationName}
${booking.locationAddress || ""}
${booking.locationPhone ? `Phone: ${booking.locationPhone}` : ""}

Please remember:
- Arrive 5-10 minutes early
- Bring any necessary documents or forms
- Call us if you're running late

Looking forward to seeing you soon!
${this.renderTextFooter(merchant)}
    `.trim();

    return { subject, html, text };
  }

  private renderBookingCancelled(context: NotificationContext): EmailTemplate {
    const { booking, merchant, customer } = context;
    const formattedDate = format(booking.date, "EEEE, MMMM d, yyyy");

    const subject = `Booking Cancelled - ${merchant.name}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #333; margin: 0;">${merchant.name}</h1>
        </div>
        
        <div style="padding: 30px;">
          <h2 style="color: #333;">Booking Cancelled</h2>
          <p>Hi ${customer.firstName || "there"},</p>
          <p>Your booking has been cancelled:</p>
          
          <div style="background-color: #f8d7da; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <div style="margin: 5px 0;">
              <p style="margin: 0 0 6px 0;"><strong>Services:</strong></p>
              ${this.renderServiceListHtml(booking, {
                includeDuration: true,
                includeStaff: true,
              })}
            </div>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${formattedDate}</p>
            <p style="margin: 5px 0;"><strong>Time:</strong> ${booking.time}</p>
            <p style="margin: 5px 0;"><strong>Total Duration:</strong> ${booking.duration} minutes</p>
            <p style="margin: 5px 0;"><strong>Staff:</strong> ${booking.staffName}</p>
            <p style="margin: 5px 0;"><strong>Reference:</strong> ${booking.bookingNumber}</p>
          </div>
          
          <p>If you'd like to reschedule, please contact us or book online.</p>
          
          <p>We hope to see you again soon!</p>
          
          <p>Best regards,<br>${merchant.name}</p>
        </div>
        
${this.renderEmailFooter(merchant, booking)}
      </div>
    `;

    const text = `
Booking Cancelled - ${merchant.name}

Hi ${customer.firstName || "there"},

Your booking has been cancelled:

Services:
${this.renderServiceListText(booking, {
  includeDuration: true,
  includeStaff: true,
})}
Date: ${formattedDate}
Time: ${booking.time}
Total Duration: ${booking.duration} minutes
Staff: ${booking.staffName}
Reference: ${booking.bookingNumber}

If you'd like to reschedule, please contact us or book online.

We hope to see you again soon!
${this.renderTextFooter(merchant)}
    `.trim();

    return { subject, html, text };
  }

  private renderBookingRescheduled(
    context: NotificationContext,
  ): EmailTemplate {
    const { booking, merchant, customer } = context;
    const formattedDate = format(booking.date, "EEEE, MMMM d, yyyy");

    const subject = `Booking Rescheduled - ${merchant.name}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #333; margin: 0;">${merchant.name}</h1>
        </div>
        
        <div style="padding: 30px;">
          <h2 style="color: #333;">Booking Rescheduled</h2>
          <p>Hi ${customer.firstName || "there"},</p>
          <p>Your booking has been rescheduled. Here are your new appointment details:</p>
          
          <div style="background-color: #d1ecf1; padding: 20px; border-radius: 5px; margin: 20px 0; border: 2px solid #bee5eb;">
            <h3 style="margin-top: 0; color: #0c5460;">📅 New Appointment Details</h3>
            <table style="width: 100%;">
              <tr>
                <td style="padding: 5px 0; vertical-align: top;"><strong>Services:</strong></td>
                <td>${this.renderServiceListHtml(booking, {
                  includeDuration: true,
                  includeStaff: true,
                })}</td>
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
                <td style="padding: 5px 0;"><strong>Total Duration:</strong></td>
                <td>${booking.duration} minutes</td>
              </tr>
            </table>
          </div>
          
          <p>Please update your calendar with the new date and time.</p>
          
          <p>If this new time doesn't work for you, please contact us as soon as possible.</p>
          
          <p>We apologize for any inconvenience and look forward to seeing you at your rescheduled appointment!</p>
          
          <p>Best regards,<br>${merchant.name}</p>
        </div>
        
${this.renderEmailFooter(merchant, booking)}
      </div>
    `;

    const text = `
Booking Rescheduled - ${merchant.name}

Hi ${customer.firstName || "there"},

Your booking has been rescheduled. Here are your new appointment details:

Services:
${this.renderServiceListText(booking, {
  includeDuration: true,
  includeStaff: true,
})}
New Date: ${formattedDate}
New Time: ${booking.time}
Staff: ${booking.staffName}
Total Duration: ${booking.duration} minutes

Please update your calendar with the new date and time.

If this new time doesn't work for you, please contact us as soon as possible.

We apologize for any inconvenience and look forward to seeing you at your rescheduled appointment!
${this.renderTextFooter(merchant)}
    `.trim();

    return { subject, html, text };
  }

  private renderStaffNewBooking(context: NotificationContext): EmailTemplate {
    const { booking, merchant } = context;
    const formattedDate = format(booking.date, "EEEE, MMMM d, yyyy");
    const customerName = booking.customerName || "Not provided";
    const customerContact = booking.customerPhone || "Not provided";
    const teamName = booking.staffName || "Not assigned";

    const subject = `New Booking Alert - ${booking.serviceName}`;

    const primaryDetailsHtml = `
          <div style="background-color: #fff7cc; border: 1px solid #f0da9a; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <h3 style="margin: 0 0 12px 0; color: #7a5a00;">Appointment Overview</h3>
            <div>
              <p style="margin: 0 0 6px 0; font-weight: bold; color: #333;">Services Selected</p>
              ${this.renderServiceListHtml(booking, {
                includeDuration: true,
                includeStaff: true,
                includePrice: true,
              }) || `<p style="margin: 0; color: #555;">No services recorded.</p>`}
            </div>
            <div style="margin-top: 16px;">
              <p style="margin: 0; font-weight: bold; color: #333;">Date</p>
              <p style="margin: 4px 0 0 0; color: #2f2f2f;">${formattedDate}</p>
            </div>
            <div style="margin-top: 12px;">
              <p style="margin: 0; font-weight: bold; color: #333;">Time</p>
              <p style="margin: 4px 0 0 0; color: #2f2f2f;">${booking.time}</p>
            </div>
          </div>
    `;

    const secondaryDetailsHtml = `
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tbody>
                <tr>
                  <td style="padding: 6px 0; color: #555;"><strong>Customer</strong></td>
                  <td style="padding: 6px 0; color: #333;">${customerName}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #555;"><strong>Contact Number</strong></td>
                  <td style="padding: 6px 0; color: #333;">${customerContact}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #555;"><strong>Team</strong></td>
                  <td style="padding: 6px 0; color: #333;">${teamName}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #555;"><strong>Total Duration</strong></td>
                  <td style="padding: 6px 0; color: #333;">${booking.duration ? `${booking.duration} minutes` : "Not specified"}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #555;"><strong>Estimated Value</strong></td>
                  <td style="padding: 6px 0; color: #333;">${this.formatPrice(booking.price)}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #555;"><strong>Booking #</strong></td>
                  <td style="padding: 6px 0; color: #333;">${booking.bookingNumber || "Not provided"}</td>
                </tr>
              </tbody>
            </table>
          </div>
    `;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #10b981; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">New Booking Alert</h1>
        </div>
        
        <div style="padding: 30px;">
          <h2 style="color: #333;">You have a new booking!</h2>
          <p style="margin: 12px 0 0 0; color: #555;">Here are the key details at a glance:</p>
          
${primaryDetailsHtml}
${secondaryDetailsHtml}
          
          <div style="margin-top: 30px; padding: 20px; background-color: #e0f2fe; border-radius: 5px;">
            <p style="margin: 0; text-align: center;">
              <a href="${merchant.website || "#"}/calendar" style="display: inline-block; padding: 12px 30px; background-color: #0ea5e9; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">View in Calendar</a>
            </p>
          </div>
        </div>
      </div>
    `;

    const text = `
New Booking Alert

You have a new booking!

Appointment Overview
Services:
${this.renderServiceListText(booking, {
  includeDuration: true,
  includeStaff: true,
  includePrice: true,
})}
Date: ${formattedDate}
Time: ${booking.time}

Additional Details
Customer: ${customerName}
Contact Number: ${customerContact}
Team: ${teamName}
Total Duration: ${booking.duration ? `${booking.duration} minutes` : "Not specified"}
Estimated Value: ${this.formatPrice(booking.price)}
Booking #: ${booking.bookingNumber || "Not provided"}

View this booking in your calendar to see more details.
    `.trim();

    return { subject, html, text };
  }

  private renderStaffCancellation(context: NotificationContext): EmailTemplate {
    const { booking, merchant } = context;
    const formattedDate = format(booking.date, "EEEE, MMMM d, yyyy");
    const customerName = booking.customerName || "Not provided";
    const customerContact = booking.customerPhone || "Not provided";

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
            <div style="margin: 5px 0;">
              <p style="margin: 0 0 6px 0;"><strong>Services:</strong></p>
              ${this.renderServiceListHtml(booking, {
                includeDuration: true,
                includeStaff: true,
                includePrice: true,
              })}
            </div>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${formattedDate}</p>
            <p style="margin: 5px 0;"><strong>Time:</strong> ${booking.time}</p>
            <p style="margin: 5px 0;"><strong>Team:</strong> ${booking.staffName}</p>
            <p style="margin: 5px 0;"><strong>Total Duration:</strong> ${booking.duration} minutes</p>
            <p style="margin: 5px 0;"><strong>Estimated Value:</strong> ${this.formatPrice(booking.price)}</p>
            <p style="margin: 5px 0;"><strong>Booking #:</strong> ${booking.bookingNumber}</p>
            <p style="margin: 5px 0;"><strong>Customer:</strong> ${customerName}</p>
            <p style="margin: 5px 0;"><strong>Contact Number:</strong> ${customerContact}</p>
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

Services:
${this.renderServiceListText(booking, {
  includeDuration: true,
  includeStaff: true,
  includePrice: true,
})}
Date: ${formattedDate}
Time: ${booking.time}
Team: ${booking.staffName}
Total Duration: ${booking.duration} minutes
Estimated Value: ${this.formatPrice(booking.price)}
Booking #: ${booking.bookingNumber}
Customer: ${customerName}
Contact Number: ${customerContact}

This time slot is now available for other bookings.
    `.trim();

    return { subject, html, text };
  }

  private toPlainText(content: string): string {
    return content
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
}
