import { BadRequestException } from "@nestjs/common";
import { TimeSlot } from "../value-objects/time-slot.vo";
import {
  BookingStatus,
  BookingStatusValue,
} from "../value-objects/booking-status.vo";
import {
  PaymentStatus,
  PaymentStatusEnum,
} from "../value-objects/payment-status.vo";

export interface BookingProps {
  id: string;
  bookingNumber: string;
  status: BookingStatusValue;
  timeSlot: TimeSlot;
  customerId: string;
  staffId?: string;
  serviceId?: string; // Optional for blank bookings
  locationId?: string;
  merchantId: string;
  notes?: string;
  totalAmount: number;
  depositAmount: number;
  isOverride?: boolean;
  overrideReason?: string;
  source: string;
  createdById: string;
  customerRequestedStaff?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  completedAt?: Date;
  // Payment fields
  paymentStatus?: PaymentStatusEnum;
  paidAmount?: number;
  paymentMethod?: string;
  paymentReference?: string;
  paidAt?: Date;
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
  private _staffId?: string;
  private _serviceId?: string;
  private _locationId?: string;
  private _merchantId: string;
  private _notes?: string;
  private _totalAmount: number;
  private _depositAmount: number;
  private _isOverride: boolean;
  private _overrideReason?: string;
  private _source: string;
  private _createdById: string;
  private _customerRequestedStaff: boolean;
  private _createdAt: Date;
  private _updatedAt: Date;
  private _cancelledAt?: Date;
  private _cancellationReason?: string;
  private _completedAt?: Date;
  // Payment properties
  private _paymentStatus: PaymentStatus;
  private _paidAmount: number;
  private _paymentMethod?: string;
  private _paymentReference?: string;
  private _paidAt?: Date;

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
    this._customerRequestedStaff = props.customerRequestedStaff ?? false;
    this._createdAt = props.createdAt || new Date();
    this._updatedAt = props.updatedAt || new Date();
    this._cancelledAt = props.cancelledAt;
    this._cancellationReason = props.cancellationReason;
    this._completedAt = props.completedAt;
    // Payment properties
    this._paymentStatus = props.paymentStatus
      ? new PaymentStatus(props.paymentStatus)
      : PaymentStatus.unpaid();
    this._paidAmount = props.paidAmount || 0;
    this._paymentMethod = props.paymentMethod;
    this._paymentReference = props.paymentReference;
    this._paidAt = props.paidAt;
  }

  private validateProps(props: BookingProps): void {
    if (!props.id || !props.bookingNumber) {
      throw new BadRequestException("Booking ID and number are required");
    }

    if (!props.customerId) {
      throw new BadRequestException("Customer is required");
    }

    if (props.totalAmount < 0) {
      throw new BadRequestException("Total amount cannot be negative");
    }

    if (props.depositAmount < 0 || props.depositAmount > props.totalAmount) {
      throw new BadRequestException("Invalid deposit amount");
    }
  }

  // Domain behaviors
  start(): void {
    if (!this._status.canTransitionTo(BookingStatus.IN_PROGRESS)) {
      throw new BadRequestException(
        `Cannot start booking in ${this._status.toString()} status`,
      );
    }

    this._status = BookingStatus.IN_PROGRESS;
    this._updatedAt = new Date();

    this.addDomainEvent({
      type: "BookingStarted",
      bookingId: this._id,
      occurredAt: new Date(),
    });
  }

  complete(): void {
    if (!this._status.canTransitionTo(BookingStatus.COMPLETED)) {
      throw new BadRequestException(
        `Cannot complete booking in ${this._status.toString()} status`,
      );
    }

    this._status = BookingStatus.COMPLETED;
    this._completedAt = new Date();
    this._updatedAt = new Date();

    this.addDomainEvent({
      type: "BookingCompleted",
      bookingId: this._id,
      occurredAt: new Date(),
    });
  }

  cancel(reason: string, cancelledBy: string): void {
    if (!this._status.canTransitionTo(BookingStatus.CANCELLED)) {
      throw new BadRequestException(
        `Cannot cancel booking in ${this._status.toString()} status`,
      );
    }

    this._status = BookingStatus.CANCELLED;
    this._cancellationReason = reason;
    this._cancelledAt = new Date();
    this._updatedAt = new Date();

    this.addDomainEvent({
      type: "BookingCancelled",
      bookingId: this._id,
      reason,
      cancelledBy,
      occurredAt: new Date(),
    });
  }

  markAsNoShow(): void {
    if (!this._status.canTransitionTo(BookingStatus.NO_SHOW)) {
      throw new BadRequestException(
        `Cannot mark booking as no-show in ${this._status.toString()} status`,
      );
    }

    this._status = BookingStatus.NO_SHOW;
    this._updatedAt = new Date();

    this.addDomainEvent({
      type: "BookingMarkedAsNoShow",
      bookingId: this._id,
      occurredAt: new Date(),
    });
  }

  reschedule(newTimeSlot: TimeSlot): void {
    if (this._status.isTerminal()) {
      throw new BadRequestException(
        `Cannot reschedule booking in ${this._status.toString()} status`,
      );
    }

    const oldTimeSlot = this._timeSlot;
    this._timeSlot = newTimeSlot;
    this._updatedAt = new Date();

    this.addDomainEvent({
      type: "BookingRescheduled",
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

  changeCustomer(newCustomerId: string): void {
    if (!newCustomerId) {
      throw new BadRequestException("Customer is required");
    }

    if (this._status.isTerminal()) {
      throw new BadRequestException(
        `Cannot change customer for booking in ${this._status.toString()} status`,
      );
    }

    if (!this._paymentStatus.isUnpaid()) {
      throw new BadRequestException(
        `Cannot change customer once payment has been recorded (status: ${this._paymentStatus.toString()})`,
      );
    }

    if (this._customerId === newCustomerId) {
      return;
    }

    const previousCustomerId = this._customerId;
    this._customerId = newCustomerId;
    this._updatedAt = new Date();

    this.addDomainEvent({
      type: "BookingCustomerChanged",
      bookingId: this._id,
      previousCustomerId,
      newCustomerId,
      occurredAt: new Date(),
    });
  }

  // Payment methods
  markAsPaid(amount: number, method: string, reference?: string): void {
    if (!this._paymentStatus.canBePaid()) {
      throw new BadRequestException(
        `Cannot mark booking as paid in ${this._paymentStatus.toString()} status`,
      );
    }

    if (amount <= 0) {
      throw new BadRequestException("Payment amount must be greater than zero");
    }

    if (amount >= this._totalAmount) {
      this._paymentStatus = PaymentStatus.paid();
      this._paidAmount = this._totalAmount;
    } else {
      this._paymentStatus = PaymentStatus.partial();
      this._paidAmount = amount;
    }

    this._paymentMethod = method;
    this._paymentReference = reference;
    this._paidAt = new Date();
    this._updatedAt = new Date();

    this.addDomainEvent({
      type: "BookingPaymentRecorded",
      bookingId: this._id,
      amount,
      method,
      reference,
      paymentStatus: this._paymentStatus.toString(),
      occurredAt: new Date(),
    });
  }

  recordPartialPayment(
    amount: number,
    method: string,
    reference?: string,
  ): void {
    if (!this._paymentStatus.canBePaid()) {
      throw new BadRequestException(
        `Cannot record payment for booking in ${this._paymentStatus.toString()} status`,
      );
    }

    if (amount <= 0) {
      throw new BadRequestException("Payment amount must be greater than zero");
    }

    const newPaidAmount = this._paidAmount + amount;

    if (newPaidAmount >= this._totalAmount) {
      this._paymentStatus = PaymentStatus.paid();
      this._paidAmount = this._totalAmount;
    } else {
      this._paymentStatus = PaymentStatus.partial();
      this._paidAmount = newPaidAmount;
    }

    this._paymentMethod = method;
    this._paymentReference = reference;
    this._paidAt = new Date();
    this._updatedAt = new Date();

    this.addDomainEvent({
      type: "BookingPartialPaymentRecorded",
      bookingId: this._id,
      amount,
      totalPaid: this._paidAmount,
      method,
      reference,
      paymentStatus: this._paymentStatus.toString(),
      occurredAt: new Date(),
    });
  }

  refundPayment(amount: number, reason: string): void {
    if (!this._paymentStatus.canBeRefunded()) {
      throw new BadRequestException(
        `Cannot refund booking in ${this._paymentStatus.toString()} status`,
      );
    }

    if (amount <= 0 || amount > this._paidAmount) {
      throw new BadRequestException("Invalid refund amount");
    }

    const remainingAmount = this._paidAmount - amount;

    if (remainingAmount === 0) {
      this._paymentStatus = PaymentStatus.refunded();
      this._paidAmount = 0;
    } else {
      this._paymentStatus = PaymentStatus.partial();
      this._paidAmount = remainingAmount;
    }

    this._updatedAt = new Date();

    this.addDomainEvent({
      type: "BookingPaymentRefunded",
      bookingId: this._id,
      refundAmount: amount,
      remainingPaid: this._paidAmount,
      reason,
      paymentStatus: this._paymentStatus.toString(),
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
  get id(): string {
    return this._id;
  }
  get bookingNumber(): string {
    return this._bookingNumber;
  }
  get status(): BookingStatus {
    return this._status;
  }
  get timeSlot(): TimeSlot {
    return this._timeSlot;
  }
  get customerId(): string {
    return this._customerId;
  }
  get staffId(): string | undefined {
    return this._staffId;
  }
  get serviceId(): string | undefined {
    return this._serviceId;
  }
  get locationId(): string | undefined {
    return this._locationId;
  }
  get merchantId(): string {
    return this._merchantId;
  }
  get notes(): string | undefined {
    return this._notes;
  }
  get totalAmount(): number {
    return this._totalAmount;
  }
  get depositAmount(): number {
    return this._depositAmount;
  }
  get isOverride(): boolean {
    return this._isOverride;
  }
  get overrideReason(): string | undefined {
    return this._overrideReason;
  }
  get source(): string {
    return this._source;
  }
  get customerRequestedStaff(): boolean {
    return this._customerRequestedStaff;
  }
  get createdById(): string {
    return this._createdById;
  }
  get createdAt(): Date {
    return this._createdAt;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }
  get cancelledAt(): Date | undefined {
    return this._cancelledAt;
  }
  get completedAt(): Date | undefined {
    return this._completedAt;
  }
  get cancellationReason(): string | undefined {
    return this._cancellationReason;
  }
  get domainEvents(): any[] {
    return [...this._domainEvents];
  }
  // Payment getters
  get paymentStatus(): PaymentStatus {
    return this._paymentStatus;
  }
  get paidAmount(): number {
    return this._paidAmount;
  }
  get paymentMethod(): string | undefined {
    return this._paymentMethod;
  }
  get paymentReference(): string | undefined {
    return this._paymentReference;
  }
  get paidAt(): Date | undefined {
    return this._paidAt;
  }
  get balanceDue(): number {
    return this._totalAmount - this._paidAmount;
  }
}
