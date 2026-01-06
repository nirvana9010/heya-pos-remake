export enum PaymentStatusEnum {
  UNPAID = "UNPAID",
  PARTIAL = "PARTIAL",
  PAID = "PAID",
  REFUNDED = "REFUNDED",
}

export class PaymentStatus {
  private readonly _value: PaymentStatusEnum;

  constructor(value: string) {
    if (!this.isValidStatus(value)) {
      throw new Error(`Invalid payment status: ${value}`);
    }
    this._value = value as PaymentStatusEnum;
  }

  static fromString(value: string): PaymentStatus {
    return new PaymentStatus(value);
  }

  static unpaid(): PaymentStatus {
    return new PaymentStatus(PaymentStatusEnum.UNPAID);
  }

  static partial(): PaymentStatus {
    return new PaymentStatus(PaymentStatusEnum.PARTIAL);
  }

  static paid(): PaymentStatus {
    return new PaymentStatus(PaymentStatusEnum.PAID);
  }

  static refunded(): PaymentStatus {
    return new PaymentStatus(PaymentStatusEnum.REFUNDED);
  }

  get value(): PaymentStatusEnum {
    return this._value;
  }

  toString(): string {
    return this._value;
  }

  equals(other: PaymentStatus): boolean {
    return this._value === other._value;
  }

  isUnpaid(): boolean {
    return this._value === PaymentStatusEnum.UNPAID;
  }

  isPartiallyPaid(): boolean {
    return this._value === PaymentStatusEnum.PARTIAL;
  }

  isPaid(): boolean {
    return this._value === PaymentStatusEnum.PAID;
  }

  isRefunded(): boolean {
    return this._value === PaymentStatusEnum.REFUNDED;
  }

  canBePaid(): boolean {
    return (
      this._value === PaymentStatusEnum.UNPAID ||
      this._value === PaymentStatusEnum.PARTIAL
    );
  }

  canBeRefunded(): boolean {
    return (
      this._value === PaymentStatusEnum.PAID ||
      this._value === PaymentStatusEnum.PARTIAL
    );
  }

  private isValidStatus(value: string): boolean {
    return Object.values(PaymentStatusEnum).includes(
      value as PaymentStatusEnum,
    );
  }
}
