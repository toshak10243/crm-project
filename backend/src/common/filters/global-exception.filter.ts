import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

// Saari errors yahan aati hain — clean format mein response bhejta hai
// Koi bhi unhandled error directly user ko nahi dikhti
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const res = exceptionResponse as any;
        // Validation errors array hoti hai — join karke ek string banao
        message = Array.isArray(res.message)
          ? res.message.join(', ')
          : res.message || message;
        error = res.error || error;
      }
    } else if (exception instanceof Error) {
      message = exception.message;

      // PostgreSQL duplicate error handle karo
      if ((exception as any).code === '23505') {
        statusCode = HttpStatus.CONFLICT;
        message = 'Record already exists';
        error = 'DUPLICATE_ERROR';
      }

      // PostgreSQL foreign key error
      if ((exception as any).code === '23503') {
        statusCode = HttpStatus.BAD_REQUEST;
        message = 'Referenced record not found';
        error = 'FOREIGN_KEY_ERROR';
      }
    }

    // Production mein internal errors log karo but user ko mat batao details
    if (statusCode === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(statusCode).json({
      success: false,
      error,
      message,
      statusCode,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}