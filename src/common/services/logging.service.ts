import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Log levels
 */
export enum LogLevel {
    ERROR = 'error',
    WARN = 'warn',
    INFO = 'info',
    DEBUG = 'debug',
}

/**
 * Global logging service
 * This service provides centralized logging functionality
 */
@Injectable()
export class LoggingService {
    private readonly logger = new Logger(LoggingService.name);
    private readonly isProduction: boolean;

    constructor(private readonly configService: ConfigService) {
        this.isProduction = this.configService.get('NODE_ENV') === 'production';
    }

    /**
     * Log an error
     * @param message - The error message
     * @param context - The context where the error occurred
     * @param error - The error object
     */
    error(message: string, context: string, error?: any): void {
        this.log(LogLevel.ERROR, message, context, error);
    }

    /**
     * Log a warning
     * @param message - The warning message
     * @param context - The context where the warning occurred
     * @param data - Additional data
     */
    warn(message: string, context: string, data?: any): void {
        this.log(LogLevel.WARN, message, context, data);
    }

    /**
     * Log an info message
     * @param message - The info message
     * @param context - The context where the info occurred
     * @param data - Additional data
     */
    info(message: string, context: string, data?: any): void {
        this.log(LogLevel.INFO, message, context, data);
    }

    /**
     * Log a debug message
     * @param message - The debug message
     * @param context - The context where the debug occurred
     * @param data - Additional data
     */
    debug(message: string, context: string, data?: any): void {
        if (!this.isProduction) {
            this.log(LogLevel.DEBUG, message, context, data);
        }
    }

    /**
     * Log a message
     * @param level - The log level
     * @param message - The message to log
     * @param context - The context where the log occurred
     * @param data - Additional data
     */
    private log(level: LogLevel, message: string, context: string, data?: any): void {
        const logMessage = {
            timestamp: new Date().toISOString(),
            level,
            message,
            context,
            ...(data && { data }),
        };

        switch (level) {
            case LogLevel.ERROR:
                this.logger.error(JSON.stringify(logMessage));
                break;
            case LogLevel.WARN:
                this.logger.warn(JSON.stringify(logMessage));
                break;
            case LogLevel.INFO:
                this.logger.log(JSON.stringify(logMessage));
                break;
            case LogLevel.DEBUG:
                this.logger.debug(JSON.stringify(logMessage));
                break;
        }

        // In production, you might want to:
        // 1. Send logs to a logging service
        // 2. Store logs in a database
        // 3. Forward logs to a monitoring system
        if (this.isProduction) {
            this.handleProductionLog(logMessage);
        }
    }

    /**
     * Handle a log in production
     * @param logMessage - The log message
     */
    private handleProductionLog(logMessage: any): void {
        // TODO: Implement production logging
        // This could include:
        // - Sending to ELK stack
        // - Sending to CloudWatch
        // - Sending to Datadog
        // - Storing in a database
    }
} 