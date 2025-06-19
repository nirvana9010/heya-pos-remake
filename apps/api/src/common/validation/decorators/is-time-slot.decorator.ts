import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ async: false })
export class IsTimeSlotConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments): boolean {
    if (!value || typeof value !== 'object') return false;
    
    const { startTime, endTime } = value;
    
    if (!startTime || !endTime) return false;
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;
    
    // End time must be after start time
    if (end.getTime() <= start.getTime()) return false;
    
    // Maximum duration check (if specified)
    const maxDurationMinutes = args.constraints[0];
    if (maxDurationMinutes) {
      const durationMs = end.getTime() - start.getTime();
      const durationMinutes = durationMs / 60000;
      if (durationMinutes > maxDurationMinutes) return false;
    }
    
    return true;
  }

  defaultMessage(args: ValidationArguments): string {
    const maxDuration = args.constraints[0];
    if (maxDuration) {
      return `Time slot must have valid start and end times with maximum duration of ${maxDuration} minutes`;
    }
    return 'Time slot must have valid start and end times with end time after start time';
  }
}

export function IsTimeSlot(maxDurationMinutes?: number, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [maxDurationMinutes],
      validator: IsTimeSlotConstraint,
    });
  };
}