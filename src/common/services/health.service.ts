import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

/**
 * Health check status
 */
export interface HealthStatus {
    status: 'ok' | 'error';
    timestamp: string;
    uptime: number;
    memory: {
        heapUsed: number;
        heapTotal: number;
        external: number;
        rss: number;
    };
    database: {
        status: 'ok' | 'error';
        message?: string;
    };
    environment: string;
}

/**
 * Global health check service
 * This service provides health check functionality
 */
@Injectable()
export class HealthService {
    private readonly logger = new Logger(HealthService.name);
    private readonly startTime: number;

    constructor(
        private readonly configService: ConfigService,
        @InjectConnection() private readonly connection: Connection,
    ) {
        this.startTime = Date.now();
    }

    /**
     * Get the health status
     * @returns The health status
     */
    async getHealthStatus(): Promise<HealthStatus> {
        const memoryUsage = process.memoryUsage();
        const databaseStatus = await this.checkDatabase();

        return {
            status: databaseStatus.status === 'ok' ? 'ok' : 'error',
            timestamp: new Date().toISOString(),
            uptime: Math.floor((Date.now() - this.startTime) / 1000),
            memory: {
                heapUsed: memoryUsage.heapUsed,
                heapTotal: memoryUsage.heapTotal,
                external: memoryUsage.external,
                rss: memoryUsage.rss,
            },
            database: databaseStatus,
            environment: this.configService.get('NODE_ENV') || "dev",
        };
    }

    /**
     * Check the database connection
     * @returns The database status
     */
    private async checkDatabase(): Promise<{ status: 'ok' | 'error'; message?: string }> {
        try {
            const state = this.connection.readyState;
            if (state === 1) {
                return { status: 'ok' };
            }
            return {
                status: 'error',
                message: `Database connection state: ${state}`,
            };
        } catch (error) {
            this.logger.error('Database health check failed', error.stack);
            return {
                status: 'error',
                message: error.message,
            };
        }
    }

    /**
     * Get detailed health information
     * @returns Detailed health information
     */
    async getDetailedHealth(): Promise<any> {
        const healthStatus = await this.getHealthStatus();
        const processInfo = {
            pid: process.pid,
            version: process.version,
            platform: process.platform,
            arch: process.arch,
            cwd: process.cwd(),
            env: {
                NODE_ENV: this.configService.get('NODE_ENV'),
                PORT: this.configService.get('PORT'),
                API_PREFIX: this.configService.get('API_PREFIX'),
            },
        };

        return {
            ...healthStatus,
            process: processInfo,
        };
    }
} 