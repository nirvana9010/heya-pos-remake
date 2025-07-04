/**
 * BookingStatus Value Object
 * Represents the possible states of a booking
 */
export enum BookingStatusValue {
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW'
}

export class BookingStatus {
  private readonly _value: BookingStatusValue;

  constructor(value: BookingStatusValue) {
    this._value = value;
  }

  static CONFIRMED = new BookingStatus(BookingStatusValue.CONFIRMED);
  static IN_PROGRESS = new BookingStatus(BookingStatusValue.IN_PROGRESS);
  static COMPLETED = new BookingStatus(BookingStatusValue.COMPLETED);
  static CANCELLED = new BookingStatus(BookingStatusValue.CANCELLED);
  static NO_SHOW = new BookingStatus(BookingStatusValue.NO_SHOW);

  get value(): BookingStatusValue {
    return this._value;
  }

  canTransitionTo(newStatus: BookingStatus): boolean {
    const transitions: Record<BookingStatusValue, BookingStatusValue[]> = {
      [BookingStatusValue.CONFIRMED]: [
        BookingStatusValue.IN_PROGRESS,
        BookingStatusValue.CANCELLED,
        BookingStatusValue.NO_SHOW
      ],
      [BookingStatusValue.IN_PROGRESS]: [
        BookingStatusValue.COMPLETED,
        BookingStatusValue.CANCELLED
      ],
      [BookingStatusValue.COMPLETED]: [], // Terminal state
      [BookingStatusValue.CANCELLED]: [], // Terminal state
      [BookingStatusValue.NO_SHOW]: [], // Terminal state
    };

    return transitions[this._value].includes(newStatus.value);
  }

  isTerminal(): boolean {
    return [
      BookingStatusValue.COMPLETED,
      BookingStatusValue.CANCELLED,
      BookingStatusValue.NO_SHOW
    ].includes(this._value);
  }

  equals(other: BookingStatus): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}