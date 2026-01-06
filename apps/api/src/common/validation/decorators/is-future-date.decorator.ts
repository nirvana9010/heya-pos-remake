import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from "class-validator";

@ValidatorConstraint({ async: false })
export class IsFutureDateConstraint implements ValidatorConstraintInterface {
  validate(date: any, args: ValidationArguments): boolean {
    if (!date) return false;

    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return false;

    const minMinutesInFuture = args.constraints[0] || 0;
    const now = new Date();
    const minTime = new Date(now.getTime() + minMinutesInFuture * 60000);

    return dateObj.getTime() > minTime.getTime();
  }

  defaultMessage(args: ValidationArguments): string {
    const minMinutes = args.constraints[0] || 0;
    if (minMinutes > 0) {
      return `Date must be at least ${minMinutes} minutes in the future`;
    }
    return "Date must be in the future";
  }
}

export function IsFutureDate(
  minMinutesInFuture?: number,
  validationOptions?: ValidationOptions,
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [minMinutesInFuture],
      validator: IsFutureDateConstraint,
    });
  };
}
