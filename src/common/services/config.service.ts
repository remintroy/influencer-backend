import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Global configuration service
 * This service provides centralized configuration functionality
 */
@Injectable()
export class AppConfigService {
    constructor(private readonly configService: ConfigService) { }

    /**
     * Get the node environment
     * @returns The node environment
     */
    get nodeEnv(): string {
        return this.configService.get<string>('NODE_ENV') || "dev";
    }

    /**
     * Get the port
     * @returns The port
     */
    get port(): number | undefined {
        return this.configService.get<number>('PORT');
    }

    /**
     * Get the API prefix
     * @returns The API prefix
     */
    get apiPrefix(): string | undefined {
        return this.configService.get<string>('API_PREFIX');
    }

    /**
     * Get the MongoDB URI
     * @returns The MongoDB URI
     */
    get mongoUri(): string | undefined {
        return this.configService.get<string>('MONGODB_URI');
    }

    /**
     * Get the JWT secret
     * @returns The JWT secret
     */
    get jwtSecret(): string | undefined {
        return this.configService.get<string>('JWT_SECRET');
    }

    /**
     * Get the JWT expiration
     * @returns The JWT expiration
     */
    get jwtExpiration(): string | undefined {
        return this.configService.get<string>('JWT_EXPIRATION');
    }

    /**
     * Get the refresh token secret
     * @returns The refresh token secret
     */
    get refreshTokenSecret(): string | undefined {
        return this.configService.get<string>('REFRESH_TOKEN_SECRET');
    }

    /**
     * Get the refresh token expiration
     * @returns The refresh token expiration
     */
    get refreshTokenExpiration(): string | undefined {
        return this.configService.get<string>('REFRESH_TOKEN_EXPIRATION');
    }

    /**
     * Get the AWS access key ID
     * @returns The AWS access key ID
     */
    get awsAccessKeyId(): string | undefined {
        return this.configService.get<string>('AWS_ACCESS_KEY_ID');
    }

    /**
     * Get the AWS secret access key
     * @returns The AWS secret access key
     */
    get awsSecretAccessKey(): string | undefined {
        return this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
    }

    /**
     * Get the AWS region
     * @returns The AWS region
     */
    get awsRegion(): string | undefined {
        return this.configService.get<string>('AWS_REGION');
    }

    /**
     * Get the AWS S3 bucket
     * @returns The AWS S3 bucket
     */
    get awsS3Bucket(): string | undefined {
        return this.configService.get<string>('AWS_S3_BUCKET');
    }

    /**
     * Get the Google client ID
     * @returns The Google client ID
     */
    get googleClientId(): string | undefined {
        return this.configService.get<string>('GOOGLE_CLIENT_ID');
    }

    /**
     * Get the Google client secret
     * @returns The Google client secret
     */
    get googleClientSecret(): string | undefined {
        return this.configService.get<string>('GOOGLE_CLIENT_SECRET');
    }

    /**
     * Get the Google callback URL
     * @returns The Google callback URL
     */
    get googleCallbackUrl(): string | undefined {
        return this.configService.get<string>('GOOGLE_CALLBACK_URL');
    }

    /**
     * Get the SMTP host
     * @returns The SMTP host
     */
    get smtpHost(): string | undefined {
        return this.configService.get<string>('SMTP_HOST');
    }

    /**
     * Get the SMTP port
     * @returns The SMTP port
     */
    get smtpPort(): number | undefined {
        return this.configService.get<number>('SMTP_PORT');
    }

    /**
     * Get the SMTP user
     * @returns The SMTP user
     */
    get smtpUser(): string | undefined {
        return this.configService.get<string>('SMTP_USER');
    }

    /**
     * Get the SMTP password
     * @returns The SMTP password
     */
    get smtpPassword(): string | undefined {
        return this.configService.get<string>('SMTP_PASSWORD');
    }

    /**
     * Get the SMTP from
     * @returns The SMTP from
     */
    get smtpFrom(): string | undefined {
        return this.configService.get<string>('SMTP_FROM');
    }

    /**
     * Get the Redis host
     * @returns The Redis host
     */
    get redisHost(): string | undefined {
        return this.configService.get<string>('REDIS_HOST');
    }

    /**
     * Get the Redis port
     * @returns The Redis port
     */
    get redisPort(): number | undefined {
        return this.configService.get<number>('REDIS_PORT');
    }

    /**
     * Get the Redis password
     * @returns The Redis password
     */
    get redisPassword(): string | undefined {
        return this.configService.get<string>('REDIS_PASSWORD');
    }

    /**
     * Get the Redis database
     * @returns The Redis database
     */
    get redisDatabase(): number | undefined {
        return this.configService.get<number>('REDIS_DATABASE');
    }

    /**
     * Get the Redis prefix
     * @returns The Redis prefix
     */
    get redisPrefix(): string | undefined {
        return this.configService.get<string>('REDIS_PREFIX');
    }

    /**
     * Get the Redis TTL
     * @returns The Redis TTL
     */
    get redisTtl(): number | undefined {
        return this.configService.get<number>('REDIS_TTL');
    }

    /**
     * Get the Redis max
     * @returns The Redis max
     */
    get redisMax(): number | undefined {
        return this.configService.get<number>('REDIS_MAX');
    }

    /**
     * Get the Redis min
     * @returns The Redis min
     */
    get redisMin(): number | undefined {
        return this.configService.get<number>('REDIS_MIN');
    }

    /**
     * Get the Redis idle
     * @returns The Redis idle
     */
    get redisIdle(): number | undefined {
        return this.configService.get<number>('REDIS_IDLE');
    }

    /**
     * Get the Redis acquire
     * @returns The Redis acquire
     */
    get redisAcquire(): number | undefined {
        return this.configService.get<number>('REDIS_ACQUIRE');
    }

    /**
     * Get the Redis evict
     * @returns The Redis evict
     */
    get redisEvict(): number | undefined {
        return this.configService.get<number>('REDIS_EVICT');
    }

    /**
     * Get the Redis connectTimeout
     * @returns The Redis connectTimeout
     */
    get redisConnectTimeout(): number | undefined {
        return this.configService.get<number>('REDIS_CONNECT_TIMEOUT');
    }

    /**
     * Get the Redis enableReadyCheck
     * @returns The Redis enableReadyCheck
     */
    get redisEnableReadyCheck(): boolean | undefined {
        return this.configService.get<boolean>('REDIS_ENABLE_READY_CHECK');
    }

    /**
     * Get the Redis maxRetriesPerRequest
     * @returns The Redis maxRetriesPerRequest
     */
    get redisMaxRetriesPerRequest(): number | undefined {
        return this.configService.get<number>('REDIS_MAX_RETRIES_PER_REQUEST');
    }

    /**
     * Get the Redis enableOfflineQueue
     * @returns The Redis enableOfflineQueue
     */
    get redisEnableOfflineQueue(): boolean | undefined {
        return this.configService.get<boolean>('REDIS_ENABLE_OFFLINE_QUEUE');
    }

    /**
     * Get the Redis enableTLS
     * @returns The Redis enableTLS
     */
    get redisEnableTls(): boolean | undefined {
        return this.configService.get<boolean>('REDIS_ENABLE_TLS');
    }

    /**
     * Get the Redis tls
     * @returns The Redis tls
     */
    get redisTls(): any {
        return this.configService.get<any>('REDIS_TLS');
    }

    /**
     * Get the Redis tlsCa
     * @returns The Redis tlsCa
     */
    get redisTlsCa(): string | undefined {
        return this.configService.get<string>('REDIS_TLS_CA');
    }

    /**
     * Get the Redis tlsCert
     * @returns The Redis tlsCert
     */
    get redisTlsCert(): string | undefined {
        return this.configService.get<string>('REDIS_TLS_CERT');
    }

    /**
     * Get the Redis tlsKey
     * @returns The Redis tlsKey
     */
    get redisTlsKey(): string | undefined {
        return this.configService.get<string>('REDIS_TLS_KEY');
    }

    /**
     * Get the Redis tlsPassphrase
     * @returns The Redis tlsPassphrase
     */
    get redisTlsPassphrase(): string | undefined {
        return this.configService.get<string>('REDIS_TLS_PASSPHRASE');
    }

    /**
     * Get the Redis tlsRejectUnauthorized
     * @returns The Redis tlsRejectUnauthorized
     */
    get redisTlsRejectUnauthorized(): boolean | undefined {
        return this.configService.get<boolean>('REDIS_TLS_REJECT_UNAUTHORIZED');
    }

    /**
     * Get the Redis tlsServername
     * @returns The Redis tlsServername
     */
    get redisTlsServername(): string | undefined {
        return this.configService.get<string>('REDIS_TLS_SERVERNAME');
    }

    /**
     * Get the Redis tlsCheckServerIdentity
     * @returns The Redis tlsCheckServerIdentity
     */
    get redisTlsCheckServerIdentity(): boolean | undefined {
        return this.configService.get<boolean>('REDIS_TLS_CHECK_SERVER_IDENTITY');
    }

    /**
     * Get the Redis tlsSecureOptions
     * @returns The Redis tlsSecureOptions
     */
    get redisTlsSecureOptions(): any {
        return this.configService.get<any>('REDIS_TLS_SECURE_OPTIONS');
    }

    /**
     * Get the Redis tlsCiphers
     * @returns The Redis tlsCiphers
     */
    get redisTlsCiphers(): string | undefined {
        return this.configService.get<string>('REDIS_TLS_CIPHERS');
    }

    /**
     * Get the Redis tlsMinVersion
     * @returns The Redis tlsMinVersion
     */
    get redisTlsMinVersion(): string | undefined {
        return this.configService.get<string>('REDIS_TLS_MIN_VERSION');
    }

    /**
     * Get the Redis tlsMaxVersion
     * @returns The Redis tlsMaxVersion
     */
    get redisTlsMaxVersion(): string | undefined {
        return this.configService.get<string>('REDIS_TLS_MAX_VERSION');
    }

    /**
     * Get the Redis tlsHonorCipherOrder
     * @returns The Redis tlsHonorCipherOrder
     */
    get redisTlsHonorCipherOrder(): boolean | undefined {
        return this.configService.get<boolean>('REDIS_TLS_HONOR_CIPHER_ORDER');
    }

    /**
     * Get the Redis tlsEcdhCurve
     * @returns The Redis tlsEcdhCurve
     */
    get redisTlsEcdhCurve(): string | undefined {
        return this.configService.get<string>('REDIS_TLS_ECDH_CURVE');
    }

    /**
     * Get the Redis tlsSessionTimeout
     * @returns The Redis tlsSessionTimeout
     */
    get redisTlsSessionTimeout(): number | undefined {
        return this.configService.get<number>('REDIS_TLS_SESSION_TIMEOUT');
    }

    /**
     * Get the Redis tlsSessionIdContext
     * @returns The Redis tlsSessionIdContext
     */
    get redisTlsSessionIdContext(): string | undefined {
        return this.configService.get<string>('REDIS_TLS_SESSION_ID_CONTEXT');
    }

    /**
     * Get the Redis tlsSessionCache
     * @returns The Redis tlsSessionCache
     */
    get redisTlsSessionCache(): any {
        return this.configService.get<any>('REDIS_TLS_SESSION_CACHE');
    }

    /**
     * Get the Redis tlsSessionCacheSize
     * @returns The Redis tlsSessionCacheSize
     */
    get redisTlsSessionCacheSize(): number | undefined {
        return this.configService.get<number>('REDIS_TLS_SESSION_CACHE_SIZE');
    }

    /**
     * Get the Redis tlsSessionCacheTimeout
     * @returns The Redis tlsSessionCacheTimeout
     */
    get redisTlsSessionCacheTimeout(): number | undefined {
        return this.configService.get<number>('REDIS_TLS_SESSION_CACHE_TIMEOUT');
    }

    /**
     * Get the Redis tlsSessionCacheCheckPeriod
     * @returns The Redis tlsSessionCacheCheckPeriod
     */
    get redisTlsSessionCacheCheckPeriod(): number | undefined {
        return this.configService.get<number>('REDIS_TLS_SESSION_CACHE_CHECK_PERIOD');
    }

    /**
     * Get the Redis tlsSessionCacheMaxAge
     * @returns The Redis tlsSessionCacheMaxAge
     */
    get redisTlsSessionCacheMaxAge(): number | undefined {
        return this.configService.get<number>('REDIS_TLS_SESSION_CACHE_MAX_AGE');
    }

    /**
     * Get the Redis tlsSessionCacheMinAge
     * @returns The Redis tlsSessionCacheMinAge
     */
    get redisTlsSessionCacheMinAge(): number | undefined {
        return this.configService.get<number>('REDIS_TLS_SESSION_CACHE_MIN_AGE');
    }

    /**
     * Get the Redis tlsSessionCacheMaxSize
     * @returns The Redis tlsSessionCacheMaxSize
     */
    get redisTlsSessionCacheMaxSize(): number | undefined {
        return this.configService.get<number>('REDIS_TLS_SESSION_CACHE_MAX_SIZE');
    }

    /**
     * Get the Redis tlsSessionCacheMinSize
     * @returns The Redis tlsSessionCacheMinSize
     */
    get redisTlsSessionCacheMinSize(): number | undefined {
        return this.configService.get<number>('REDIS_TLS_SESSION_CACHE_MIN_SIZE');
    }

    /**
     * Get the Redis tlsSessionCacheMaxEntries
     * @returns The Redis tlsSessionCacheMaxEntries
     */
    get redisTlsSessionCacheMaxEntries(): number | undefined {
        return this.configService.get<number>('REDIS_TLS_SESSION_CACHE_MAX_ENTRIES');
    }

    /**
     * Get the Redis tlsSessionCacheMinEntries
     * @returns The Redis tlsSessionCacheMinEntries
     */
    get redisTlsSessionCacheMinEntries(): number | undefined {
        return this.configService.get<number>('REDIS_TLS_SESSION_CACHE_MIN_ENTRIES');
    }
} 