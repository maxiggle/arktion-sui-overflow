import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

interface ErrorBody {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  timestamp: string;
}

/**
 * Catches every exception thrown anywhere in the app and converts it to a
 * uniform JSON response. Three categories:
 *
 *   1. HttpException and subclasses — NestJS's standard pathway. We forward
 *      the status code and message.
 *   2. Prisma's known errors — translated to appropriate HTTP statuses
 *      (P2002 unique violation → 409 Conflict, etc.).
 *   3. Everything else — logged with stack trace, returned as 500.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const body = this.buildErrorBody(exception, request.url);

    if (body.statusCode >= 500) {
      this.logger.error(
        `Unhandled error on ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : exception,
      );
    } else {
      const errorMessage = Array.isArray(body.message)
        ? body.message.join(', ')
        : body.message;
      this.logger.warn(
        `${body.statusCode} on ${request.method} ${request.url}: ${errorMessage}`,
      );
    }

    response.status(body.statusCode).json(body);
  }

  private buildErrorBody(exception: unknown, path: string): ErrorBody {
    const timestamp = new Date().toISOString();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const responseBody = exception.getResponse();
      const message =
        typeof responseBody === 'string'
          ? responseBody
          : (((responseBody as Record<string, unknown>).message as
              | string
              | string[]) ?? exception.message);
      return {
        statusCode: status,
        error: HttpStatus[status] ?? 'Error',
        message,
        path,
        timestamp,
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.handlePrismaError(exception, path, timestamp);
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: 'Invalid database query',
        path,
        timestamp,
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
      path,
      timestamp,
    };
  }

  private handlePrismaError(
    err: Prisma.PrismaClientKnownRequestError,
    path: string,
    timestamp: string,
  ): ErrorBody {
    switch (err.code) {
      case 'P2002':
        return {
          statusCode: HttpStatus.CONFLICT,
          error: 'Conflict',
          message: 'A record with this value already exists',
          path,
          timestamp,
        };
      case 'P2025':
        return {
          statusCode: HttpStatus.NOT_FOUND,
          error: 'Not Found',
          message: 'Record not found',
          path,
          timestamp,
        };
      case 'P2003':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          error: 'Bad Request',
          message: 'Foreign key constraint failed',
          path,
          timestamp,
        };
      default:
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Internal Server Error',
          message: `Database error (${err.code})`,
          path,
          timestamp,
        };
    }
  }
}
