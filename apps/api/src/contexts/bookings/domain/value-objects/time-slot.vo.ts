import { BadRequestException } from '@nestjs/common';

/**
 * TimeSlot Value Object
 * Represents an immutable time period with start and end times
 */
export class TimeSlot {
  private readonly _start: Date;
  private readonly _end: Date;

  constructor(start: Date, end: Date) {
    this.validateTimeSlot(start, end);
    this._start = new Date(start);
    this._end = new Date(end);
  }

  private validateTimeSlot(start: Date, end: Date): void {
    if (!start || !end) {
      throw new BadRequestException('Start and end times are required');
    }

    if (start >= end) {
      throw new BadRequestException('Start time must be before end time');
    }

    const duration = this.calculateDuration(start, end);
    if (duration < 15) {
      throw new BadRequestException('Time slot must be at least 15 minutes');
    }

    if (duration > 480) { // 8 hours
      throw new BadRequestException('Time slot cannot exceed 8 hours');
    }
  }

  private calculateDuration(start: Date, end: Date): number {
    return (end.getTime() - start.getTime()) / (1000 * 60); // minutes
  }

  get start(): Date {
    return new Date(this._start);
  }

  get end(): Date {
    return new Date(this._end);
  }

  get duration(): number {
    return this.calculateDuration(this._start, this._end);
  }

  overlaps(other: TimeSlot): boolean {
    return this._start < other._end && this._end > other._start;
  }

  contains(time: Date): boolean {
    return time >= this._start && time <= this._end;
  }

  equals(other: TimeSlot): boolean {
    return this._start.getTime() === other._start.getTime() &&
           this._end.getTime() === other._end.getTime();
  }

  toString(): string {
    return `${this._start.toISOString()} - ${this._end.toISOString()}`;
  }
}