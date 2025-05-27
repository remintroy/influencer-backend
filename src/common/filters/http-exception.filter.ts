import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Global HTTP exception filter
 * This filter handles all HTTP exceptions and provides a consistent error response format
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  /**
   * Handle HTTP exceptions
   * @param exception - The HTTP exception to handle
   * @param host - The arguments host
   */
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    // Get the error response
    const errorResponse = exception.getResponse();
    const message = typeof errorResponse === 'string' ? errorResponse : (errorResponse as any).message || 'Internal server error';
    const error = typeof errorResponse === 'string' ? errorResponse : (errorResponse as any).error || message;

    // Log the error
    this.logger.error(`${request.method} ${request.url} - ${status} - ${message}`, exception.stack);

    // Send the error response
    response.status(status).json({
      statusCode: status,
      status: false,
      message: message,
      data: null,
      meta: {
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
      },
      error: {
        code: status,
        details: status === HttpStatus.INTERNAL_SERVER_ERROR ? 'Internal server error' : error || message,
      },
    });
  }
}
