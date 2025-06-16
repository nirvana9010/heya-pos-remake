import { GetBookingByIdHandler } from './get-booking-by-id.handler';
import { GetBookingsListHandler } from './get-bookings-list.handler';
import { GetCalendarViewHandler } from './get-calendar-view.handler';

export const QueryHandlers = [
  GetBookingByIdHandler,
  GetBookingsListHandler,
  GetCalendarViewHandler,
];