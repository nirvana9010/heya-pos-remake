import { HttpException, HttpStatus } from '@nestjs/common';

export interface BusinessErrorDetails {
  code: string;
  message: string;
  field?: string;
  details?: any;
}

export class BusinessException extends HttpException {
  constructor(
    public readonly errorCode: string,
    message: string,
    httpStatus: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly details?: any,
  ) {
    super(
      {
        statusCode: httpStatus,
        error: errorCode,
        message,
        details,
        timestamp: new Date().toISOString(),
      },
      httpStatus,
    );
  }
}

export class ValidationException extends BusinessException {
  constructor(errors: Record<string, string[]>) {
    super(
      'VALIDATION_ERROR',
      'Validation failed',
      HttpStatus.BAD_REQUEST,
      errors,
    );
  }
}

export class ResourceNotFoundException extends BusinessException {
  constructor(resource: string, id?: string) {
    const message = id
      ? `${resource} with id ${id} not found`
      : `${resource} not found`;
    super('RESOURCE_NOT_FOUND', message, HttpStatus.NOT_FOUND, { resource, id });
  }
}

export class DuplicateResourceException extends BusinessException {
  constructor(resource: string, field: string, value: string) {
    super(
      'DUPLICATE_RESOURCE',
      `${resource} with ${field} '${value}' already exists`,
      HttpStatus.CONFLICT,
      { resource, field, value },
    );
  }
}

export class BusinessRuleViolationException extends BusinessException {
  constructor(rule: string, message: string, details?: any) {
    super(
      'BUSINESS_RULE_VIOLATION',
      message,
      HttpStatus.UNPROCESSABLE_ENTITY,
      { rule, ...details },
    );
  }
}

export class InsufficientPermissionsException extends BusinessException {
  constructor(action: string, resource: string) {
    super(
      'INSUFFICIENT_PERMISSIONS',
      `You don't have permission to ${action} ${resource}`,
      HttpStatus.FORBIDDEN,
      { action, resource },
    );
  }
}

export class PaymentException extends BusinessException {
  constructor(message: string, details?: any) {
    super('PAYMENT_ERROR', message, HttpStatus.PAYMENT_REQUIRED, details);
  }
}

export class ExternalServiceException extends BusinessException {
  constructor(service: string, message: string, details?: any) {
    super(
      'EXTERNAL_SERVICE_ERROR',
      `External service error: ${message}`,
      HttpStatus.SERVICE_UNAVAILABLE,
      { service, ...details },
    );
  }
}