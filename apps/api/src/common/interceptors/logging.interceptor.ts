import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP");

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Generate or get request ID
    const requestId = request.headers["x-request-id"] || uuidv4();
    request.requestId = requestId;
    response.setHeader("X-Request-Id", requestId);

    const { method, url, body, query, params } = request;
    const userAgent = request.get("user-agent") || "";
    const ip = request.ip || request.connection.remoteAddress;
    const user = request.user;

    const now = Date.now();

    // Log request
    this.logger.log({
      message: `Incoming Request`,
      requestId,
      method,
      url,
      userAgent,
      ip,
      userId: user?.id,
      merchantId: user?.merchantId,
      body: this.sanitizeBody(body),
      query,
      params,
    });

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - now;

          // Log response
          this.logger.log({
            message: `Outgoing Response`,
            requestId,
            method,
            url,
            statusCode: response.statusCode,
            duration: `${duration}ms`,
            userId: user?.id,
            merchantId: user?.merchantId,
          });

          // Log slow requests
          if (duration > 1000) {
            this.logger.warn({
              message: `Slow Request Detected`,
              requestId,
              method,
              url,
              duration: `${duration}ms`,
              threshold: "1000ms",
            });
          }
        },
        error: (error) => {
          const duration = Date.now() - now;

          // Log error response
          this.logger.error({
            message: `Error Response`,
            requestId,
            method,
            url,
            statusCode: error.status || 500,
            errorMessage: error.message,
            errorCode: error.errorCode,
            duration: `${duration}ms`,
            userId: user?.id,
            merchantId: user?.merchantId,
          });
        },
      }),
    );
  }

  private sanitizeBody(body: any): any {
    if (!body) return body;

    const sensitiveFields = [
      "password",
      "passwordHash",
      "pin",
      "token",
      "refreshToken",
      "creditCard",
      "cvv",
      "ssn",
      "apiKey",
      "secret",
    ];

    const sanitized = { ...body };

    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = "[REDACTED]";
      }
    });

    return sanitized;
  }
}
