import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class CustomValidationPipe implements PipeTransform<any> {
  private readonly logger = new Logger(CustomValidationPipe.name);

  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    const object = plainToInstance(metatype, value);
    const errors = await validate(object, {
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      validationError: {
        target: false,
        value: false,
      },
    });

    if (errors.length > 0) {
      const formattedErrors = this.formatErrors(errors);
      this.logger.warn(`Validation failed: ${JSON.stringify(formattedErrors)}`);
      
      throw new BadRequestException({
        statusCode: 400,
        message: 'Validation failed',
        errors: formattedErrors,
      });
    }

    return object;
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  private formatErrors(errors: any[]): Record<string, string[]> {
    const formatted: Record<string, string[]> = {};

    errors.forEach((error) => {
      const property = error.property;
      const constraints = error.constraints || {};
      
      if (!formatted[property]) {
        formatted[property] = [];
      }

      formatted[property].push(...Object.values(constraints) as string[]);

      // Handle nested validation errors
      if (error.children && error.children.length > 0) {
        const childErrors = this.formatErrors(error.children);
        Object.entries(childErrors).forEach(([childProp, childMessages]) => {
          const nestedProperty = `${property}.${childProp}`;
          if (!formatted[nestedProperty]) {
            formatted[nestedProperty] = [];
          }
          formatted[nestedProperty].push(...childMessages);
        });
      }
    });

    return formatted;
  }
}