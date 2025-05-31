import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { Error as MongooseError } from 'mongoose';

@Catch(MongooseError)
export class MongoExceptionFilter implements ExceptionFilter {
  catch(exception: MongooseError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof MongooseError.ValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = Object.values(exception.errors)
        .map((err: any) => err.message)
        .join(', ');
    } else if (exception instanceof MongooseError.CastError) {
      status = HttpStatus.BAD_REQUEST;
      message = `Invalid ${exception.path}: ${exception.value}`;
    } else if (exception.name === 'MongoServerError') {
      // Handle duplicate key errors from Mongoose
      if ((exception as any).code === 11000) {
        status = HttpStatus.CONFLICT;
        message = 'Duplicate entry found';
      }
    }

    response.status(status).json({
      statusCode: status,
      message,
      error: exception.name,
      timestamp: new Date().toISOString(),
    });
  }
} 