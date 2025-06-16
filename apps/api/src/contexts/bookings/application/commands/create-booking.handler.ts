import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateBookingCommand } from './create-booking.command';
import { Booking } from '../../domain/entities/booking.entity';
import { BookingCreatedEvent } from '../../domain/events/booking-created.event';
import { BookingCreationService } from '../services/booking-creation.service';

@Injectable()
export class CreateBookingHandler {
  constructor(
    private readonly bookingCreationService: BookingCreationService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: CreateBookingCommand): Promise<Booking> {
    const { data } = command;

    // Use the transactional script service to create the booking
    const booking = await this.bookingCreationService.createBooking(data);

    // Emit domain event
    const event = new BookingCreatedEvent(
      booking.id,
      booking.customerId,
      booking.merchantId,
      booking.staffId,
      booking.serviceId,
      booking.totalAmount,
      booking.timeSlot.start,
      booking.timeSlot.end,
    );

    // For now, emit in-process event
    // TODO: In Phase 2, this will write to outbox table
    this.eventEmitter.emit('booking.created', event);

    return booking;
  }
}