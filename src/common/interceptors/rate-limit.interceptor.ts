import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * Rate limit store interface
 */
interface RateLimitStore {
    get(key: string): { count: number; resetTime: number };
    set(key: string, value: { count: number; resetTime: number }): void;
}

/**
 * Global rate limit interceptor
 * This interceptor limits the number of requests per IP address
 */
@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
    private readonly store: RateLimitStore = new Map();
    private readonly limit = 100; // Maximum requests per window
    private readonly window = 60000; // 1 minute window

    /**
     * Intercept the request and check rate limit
     * @param context - The execution context
     * @param next - The call handler
     * @returns The response observable
     * @throws HttpException if rate limit is exceeded
     */
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const ip = request.ip;
        const key = `rate-limit:${ip}`;
        const now = Date.now();

        const record = this.store.get(key) || { count: 0, resetTime: now + this.window };

        // Reset counter if window has passed
        if (now > record.resetTime) {
            record.count = 0;
            record.resetTime = now + this.window;
        }

        // Increment counter
        record.count++;

        // Check if limit is exceeded
        if (record.count > this.limit) {
            throw new HttpException(
                {
                    message: 'Rate limit exceeded',
                    retryAfter: Math.ceil((record.resetTime - now) / 1000),
                },
                HttpStatus.TOO_MANY_REQUESTS,
            );
        }

        // Update store
        this.store.set(key, record);

        return next.handle();
    }
} 