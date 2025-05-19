import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Response interface
 */
export interface Response<T> {
  data: T;
  meta?: {
    timestamp: string;
    path: string;
  };
}

/**
 * Global transform interceptor
 * This interceptor transforms all responses into a consistent format
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  /**
   * Intercept the response and transform it
   * @param context - The execution context
   * @param next - The call handler
   * @returns The transformed response observable
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    const request = context.switchToHttp().getRequest();

    return next.handle().pipe(
      map((data) => ({
        status: true,
        error: null,
        data,
        meta: {
          timestamp: new Date().toISOString(),
          path: request.url,
        },
      })),
    );
  }
}
