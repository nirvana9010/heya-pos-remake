import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";

@ValidatorConstraint({ async: false })
export class IsValidPhoneConstraint implements ValidatorConstraintInterface {
  validate(phoneNumber: any): boolean {
    // Allow empty values (null, undefined, empty string) for optional fields
    if (!phoneNumber || phoneNumber === "") return true;

    if (typeof phoneNumber !== "string") return false;

    // Remove all non-numeric characters except + at the beginning
    const cleaned = phoneNumber.replace(/[^\d+]/g, "");

    // Check if it's a valid phone format
    // Supports international format (+XX) and local formats
    const phoneRegex = /^(\+\d{1,3}[- ]?)?\d{10}$/;
    return phoneRegex.test(cleaned);
  }

  defaultMessage(): string {
    return "Phone number must be a valid format";
  }
}

export function IsValidPhone(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidPhoneConstraint,
    });
  };
}
