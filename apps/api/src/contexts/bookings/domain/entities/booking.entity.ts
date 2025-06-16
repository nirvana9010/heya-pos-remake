import { BadRequestException } from '@nestjs/common';
import { TimeSlot } from '../value-objects/time-slot.vo';
import { BookingStatus, BookingStatusValue } from '../value-objects/booking-status.vo';

export interface BookingProps {
  id: string;
  bookingNumber: string;
  status: BookingStatusValue;
  timeSlot: TimeSlot;
  customerId: string;
  staffId: string;
  serviceId: string;
  locationId: string;
  merchantId: string;
  notes?: string;
  totalAmount: number;
  depositAmount: number;
  isOverride?: boolean;
  overrideReason?: string;
  source: string;
  createdById: string;
  createdAt?: Date;
  updatedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
}

/**
 * Booking Entity
 * The core domain entity representing a booking in the system
 */
export class Booking {
  private _id: string;
  private _bookingNumber: string;
  private _status: BookingStatus;
  private _timeSlot: TimeSlot;
  private _customerId: string;
  private _staffId: string;
  private _serviceId: string;
  private _locationId: string;
  private _merchantId: string;
  private _notes?: string;
  private _totalAmount: number;
  private _depositAmount: number;
  private _isOverride: boolean;
  private _overrideReason?: string;
  private _source: string;
  private _createdById: string;
  private _createdAt: Date;
  private _updatedAt: Date;
  private _cancelledAt?: Date;
  private _cancellationReason?: string;

  // Domain events that occurred
  private _domainEvents: any[] = [];

  constructor(props: BookingProps) {
    this.validateProps(props);
    
    this._id = props.id;
    this._bookingNumber = props.bookingNumber;
    this._status = new BookingStatus(props.status);
    this._timeSlot = props.timeSlot;
    this._customerId = props.customerId;
    this._staffId = props.staffId;
    this._serviceId = props.serviceId;
    this._locationId = props.locationId;
    this._merchantId = props.merchantId;
    this._notes = props.notes;
    this._totalAmount = props.totalAmount;
    this._depositAmount = props.depositAmount;
    this._isOverride = props.isOverride || false;
    this._overrideReason = props.overrideReason;
    this._source = props.source;
    this._createdById = props.createdById;
    this._createdAt = props.createdAt || new Date();
    this._updatedAt = props.updatedAt || new Date();
    this._cancelledAt = props.cancelledAt;
    this._cancellationReason = props.cancellationReason;
  }

  private validateProps(props: BookingProps): void {
    if (!props.id || !props.bookingNumber) {
      throw new BadRequestException('Booking ID and number are required');
    }

    if (!props.customerId || !props.staffId || !props.serviceId) {
      throw new BadRequestException('Customer, staff, and service are required');
    }

    if (props.totalAmount < 0) {
      throw new BadRequestException('Total amount cannot be negative');
    }

    if (props.depositAmount < 0 || props.depositAmount > props.totalAmount) {
      throw new BadRequestException('Invalid deposit amount');
    }
  }

  // Domain behaviors
  start(): void {
    if (!this._status.canTransitionTo(BookingStatus.IN_PROGRESS)) {
      throw new BadRequestException(
        `Cannot start booking in ${this._status.toString()} status`
      );
    }

    this._status = BookingStatus.IN_PROGRESS;
    this._updatedAt = new Date();
    
    this.addDomainEvent({
      type: 'BookingStarted',
      bookingId: this._id,
      occurredAt: new Date(),
    });
  }

  complete(): void {
    if (!this._status.canTransitionTo(BookingStatus.COMPLETED)) {
      throw new BadRequestException(
        `Cannot complete booking in ${this._status.toString()} status`
      );
    }

    this._status = BookingStatus.COMPLETED;
    this._updatedAt = new Date();
    
    this.addDomainEvent({
      type: 'BookingCompleted',
      bookingId: this._id,
      occurredAt: new Date(),
    });
  }

  cancel(reason: string, cancelledBy: string): void {
    if (!this._status.canTransitionTo(BookingStatus.CANCELLED)) {
      throw new BadRequestException(
        `Cannot cancel booking in ${this._status.toString()} status`
      );
    }

    this._status = BookingStatus.CANCELLED;
    this._cancellationReason = reason;
    this._cancelledAt = new Date();
    this._updatedAt = new Date();
    
    this.addDomainEvent({
      type: 'BookingCancelled',
      bookingId: this._id,
      reason,
      cancelledBy,
      occurredAt: new Date(),
    });
  }

  markAsNoShow(): void {
    if (!this._status.canTransitionTo(BookingStatus.NO_SHOW)) {
      throw new BadRequestException(
        `Cannot mark booking as no-show in ${this._status.toString()} status`
      );
    }

    this._status = BookingStatus.NO_SHOW;
    this._updatedAt = new Date();
    
    this.addDomainEvent({
      type: 'BookingMarkedAsNoShow',
      bookingId: this._id,
      occurredAt: new Date(),
    });
  }

  reschedule(newTimeSlot: TimeSlot): void {
    if (this._status.isTerminal()) {
      throw new BadRequestException(
        `Cannot reschedule booking in ${this._status.toString()} status`
      );
    }

    const oldTimeSlot = this._timeSlot;
    this._timeSlot = newTimeSlot;
    this._updatedAt = new Date();
    
    this.addDomainEvent({
      type: 'BookingRescheduled',
      bookingId: this._id,
      oldTimeSlot: {
        start: oldTimeSlot.start.toISOString(),
        end: oldTimeSlot.end.toISOString(),
      },
      newTimeSlot: {
        start: newTimeSlot.start.toISOString(),
        end: newTimeSlot.end.toISOString(),
      },
      occurredAt: new Date(),
    });
  }

  private addDomainEvent(event: any): void {
    this._domainEvents.push(event);
  }

  clearEvents(): void {
    this._domainEvents = [];
  }

  // Getters
  get id(): string { return this._id; }
  get bookingNumber(): string { return this._bookingNumber; }
  get status(): BookingStatus { return this._status; }
  get timeSlot(): TimeSlot { return this._timeSlot; }
  get customerId(): string { return this._customerId; }
  get staffId(): string { return this._staffId; }
  get serviceId(): string { return this._serviceId; }
  get locationId(): string { return this._locationId; }
  get merchantId(): string { return this._merchantId; }
  get notes(): string | undefined { return this._notes; }
  get totalAmount(): number { return this._totalAmount; }
  get depositAmount(): number { return this._depositAmount; }
  get isOverride(): boolean { return this._isOverride; }
  get overrideReason(): string | undefined { return this._overrideReason; }
  get source(): string { return this._source; }
  get createdById(): string { return this._createdById; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }
  get cancelledAt(): Date | undefined { return this._cancelledAt; }
  get cancellationReason(): string | undefined { return this._cancellationReason; }
  get domainEvents(): any[] { return [...this._domainEvents]; }
}