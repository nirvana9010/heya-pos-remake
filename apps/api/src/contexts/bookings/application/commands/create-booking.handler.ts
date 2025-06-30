import { Injectable } from '@nestjs/common';
import { CreateBookingCommand } from './create-booking.command';
import { Booking } from '../../domain/entities/booking.entity';
import { BookingCreationService } from '../services/booking-creation.service';

@Injectable()
export class CreateBookingHandler {
  constructor(
    private readonly bookingCreationService: BookingCreationService,
  ) {}

  async execute(command: CreateBookingCommand): Promise<Booking> {
    const { data } = command;

    // Use the transactional script service to create the booking
    const booking = await this.bookingCreationService.createBooking(data);

    // Domain events will be handled differently in future phases

    return booking;
  }
}