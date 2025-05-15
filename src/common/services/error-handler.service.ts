import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Global error handling service
 * This service handles and logs errors
 */
@Injectable()
export class ErrorHandlerService {
    private readonly logger = new Logger(ErrorHandlerService.name);

    constructor(private readonly configService: ConfigService) { }

    /**
     * Handle an error
     * @param error - The error to handle
     * @param context - The context where the error occurred
     */
    handleError(error: any, context: string): void {
        // Log the error
        this.logger.error(
            `Error in ${context}: ${error.message}`,
            error.stack,
        );

        // In production, you might want to:
        // 1. Send the error to a monitoring service
        // 2. Notify the development team
        // 3. Store the error in a database
        if (this.configService.get('NODE_ENV') === 'production') {
            this.handleProductionError(error, context);
        }
    }

    /**
     * Handle an error in production
     * @param error - The error to handle
     * @param context - The context where the error occurred
     */
    private handleProductionError(error: any, context: string): void {
        // TODO: Implement production error handling
        // This could include:
        // - Sending to Sentry, New Relic, or similar
        // - Sending email notifications
        // - Storing in a database for analysis
        // - Triggering alerts
    }

    /**
     * Format an error for the client
     * @param error - The error to format
     * @returns The formatted error
     */
    formatError(error: any): any {
        const isProduction = this.configService.get('NODE_ENV') === 'production';

        return {
            message: isProduction ? 'An error occurred' : error.message,
            code: error.code || 'UNKNOWN_ERROR',
            status: error.status || 500,
            ...(isProduction ? {} : { stack: error.stack }),
        };
    }
} 