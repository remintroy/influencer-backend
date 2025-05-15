import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Cache store interface
 */
interface CacheStore {
    delete(key: string): unknown;
    get(key: string): any;
    set(key: string, value: any): void;
}

/**
 * Global cache interceptor
 * This interceptor caches GET requests
 */
@Injectable()
export class CacheInterceptor implements NestInterceptor {
    private readonly store: CacheStore = new Map();
    private readonly ttl = 60000; // 1 minute cache TTL

    /**
     * Intercept the request and cache the response
     * @param context - The execution context
     * @param next - The call handler
     * @returns The response observable
     */
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();

        // Only cache GET requests
        if (request.method !== 'GET') {
            return next.handle();
        }

        const key = this.generateKey(request);
        const cachedResponse = this.store.get(key);

        if (cachedResponse) {
            return of(cachedResponse);
        }

        return next.handle().pipe(
            tap((response) => {
                this.store.set(key, response);
                // Clear cache after TTL
                setTimeout(() => {
                    this.store.delete(key);
                }, this.ttl);
            }),
        );
    }

    /**
     * Generate a cache key from the request
     * @param request - The HTTP request
     * @returns The cache key
     */
    private generateKey(request: any): string {
        const { url, method, query, params } = request;
        return `${method}:${url}:${JSON.stringify(query)}:${JSON.stringify(params)}`;
    }
} 