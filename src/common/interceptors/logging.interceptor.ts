import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Global logging interceptor
 * This interceptor logs all incoming requests and their responses
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger(LoggingInterceptor.name);

    /**
     * Intercept the request and log it
     * @param context - The execution context
     * @param next - The call handler
     * @returns The response observable
     */
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const { method, url, body, query, params } = request;
        const now = Date.now();

        // Log the request
        this.logger.log(
            `Request: ${method} ${url} - Body: ${JSON.stringify(body)} - Query: ${JSON.stringify(query)} - Params: ${JSON.stringify(params)}`,
        );

        return next.handle().pipe(
            tap({
                next: (data) => {
                    // Log the response
                    this.logger.log(
                        `Response: ${method} ${url} - Status: 200 - Time: ${Date.now() - now}ms`,
                    );
                },
                error: (error) => {
                    // Log the error
                    this.logger.error(
                        `Error: ${method} ${url} - Status: ${error.status} - Time: ${Date.now() - now}ms - Message: ${error.message}`,
                        error.stack,
                    );
                },
            }),
        );
    }
} 