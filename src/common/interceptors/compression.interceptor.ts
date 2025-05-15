import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import * as zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);

/**
 * Global compression interceptor
 * This interceptor compresses response data
 */
@Injectable()
export class CompressionInterceptor implements NestInterceptor {
    /**
     * Intercept the response and compress it
     * @param context - The execution context
     * @param next - The call handler
     * @returns The compressed response observable
     */
    async intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Promise<Observable<any>> {
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();

        // Check if client accepts gzip encoding
        const acceptEncoding = request.headers['accept-encoding'];
        if (!acceptEncoding || !acceptEncoding.includes('gzip')) {
            return next.handle();
        }

        // Set response headers
        response.setHeader('Content-Encoding', 'gzip');
        response.setHeader('Vary', 'Accept-Encoding');

        return next.handle().pipe(
            map(async (data) => {
                const jsonString = JSON.stringify(data);
                const compressed = await gzip(jsonString);
                return compressed;
            }),
        );
    }
} 