import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    RequestTimeoutException,
} from '@nestjs/common';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

/**
 * Global timeout interceptor
 * This interceptor adds a timeout to all requests
 */
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
    /**
     * Intercept the request and add a timeout
     * @param context - The execution context
     * @param next - The call handler
     * @returns The response observable
     * @throws RequestTimeoutException if the request times out
     */
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        return next.handle().pipe(
            timeout(30000), // 30 seconds timeout
            catchError((err) => {
                if (err instanceof TimeoutError) {
                    return throwError(() => new RequestTimeoutException());
                }
                return throwError(() => err);
            }),
        );
    }
} 