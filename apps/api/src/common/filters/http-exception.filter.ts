import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import { BusinessException } from "../exceptions/business-exception";
import { ErrorCodes } from "../exceptions/error-codes";
import { Prisma } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Generate request ID for tracking
    const requestId = uuidv4();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode: string = ErrorCodes.INTERNAL_SERVER_ERROR;
    let message = "Internal server error";
    let details: any = undefined;

    // Handle different exception types
    if (exception instanceof BusinessException) {
      status = exception.getStatus();
      errorCode = exception.errorCode;
      message = exception.message;
      details = exception.details;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === "string") {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === "object" &&
        exceptionResponse !== null
      ) {
        const response = exceptionResponse as any;
        message = response.message || message;
        errorCode = response.error || errorCode;
        details = response.details || response.errors;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle Prisma errors
      const prismaError = this.handlePrismaError(exception);
      status = prismaError.status;
      errorCode = prismaError.errorCode;
      message = prismaError.message;
      details = prismaError.details;
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      errorCode = ErrorCodes.VALIDATION_ERROR;
      message = "Database validation error";
      details = { error: exception.message };
    } else if (exception instanceof Error) {
      message = exception.message;

      // Log unexpected errors
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
        {
          requestId,
          url: request.url,
          method: request.method,
          body: request.body,
          params: request.params,
          query: request.query,
          headers: request.headers,
        },
      );
    }

    const errorResponse = {
      statusCode: status,
      errorCode,
      message,
      details,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      requestId,
    };

    // In development, include additional debugging info
    if (process.env.NODE_ENV === "development") {
      if (exception instanceof Error) {
        (errorResponse as any).stack = exception.stack;
      }
      (errorResponse as any).debug = {
        body: request.body,
        query: request.query,
        params: request.params,
      };
    }

    // Set response headers
    response.setHeader("X-Request-Id", requestId);
    response.status(status).json(errorResponse);
  }

  private handlePrismaError(error: Prisma.PrismaClientKnownRequestError): {
    status: HttpStatus;
    errorCode: string;
    message: string;
    details?: any;
  } {
    switch (error.code) {
      case "P2002":
        // Unique constraint violation
        const field = (error.meta?.target as string[])?.[0] || "field";
        return {
          status: HttpStatus.CONFLICT,
          errorCode: ErrorCodes.DUPLICATE_RESOURCE,
          message: `A record with this ${field} already exists`,
          details: { field, constraint: error.meta?.target },
        };

      case "P2003":
        // Foreign key constraint violation
        return {
          status: HttpStatus.BAD_REQUEST,
          errorCode: ErrorCodes.INVALID_INPUT,
          message: "Invalid reference to related record",
          details: { field: error.meta?.field_name },
        };

      case "P2025":
        // Record not found
        return {
          status: HttpStatus.NOT_FOUND,
          errorCode: ErrorCodes.RESOURCE_NOT_FOUND,
          message: "Record not found",
          details: { cause: error.meta?.cause },
        };

      case "P2014":
        // Relation violation
        return {
          status: HttpStatus.BAD_REQUEST,
          errorCode: ErrorCodes.INVALID_INPUT,
          message: "Invalid relation in query",
          details: { relation: error.meta?.relation_name },
        };

      case "P2016":
        // Query interpretation error
        return {
          status: HttpStatus.BAD_REQUEST,
          errorCode: ErrorCodes.INVALID_INPUT,
          message: "Invalid query parameters",
          details: error.meta,
        };

      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          errorCode: ErrorCodes.DATABASE_ERROR,
          message: "Database operation failed",
          details: { code: error.code, meta: error.meta },
        };
    }
  }
}
