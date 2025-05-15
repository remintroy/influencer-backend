import { plainToClass, Transform } from 'class-transformer';
import { IsEnum, IsString, validateSync, IsNumber, IsOptional, IsBoolean } from 'class-validator';

/**
 * Environment configuration class
 * This class defines the structure and validation rules for environment variables
 */
class EnvironmentVariables {
    @IsEnum(['dev', 'production', 'test'])
    NODE_ENV: string;

    @IsNumber()
    PORT: number;

    @IsString()
    @IsOptional()
    API_PREFIX: string;

    @IsString()
    MONGODB_URI: string;

    @IsString()
    ACCESS_TOKEN_SECRET: string;

    @IsString()
    REFRESH_TOKEN_SECRET: string;

    @IsString()
    ACCESS_TOKEN_EXPIRES_IN: string;

    @IsString()
    AWS_ACCESS_KEY_ID: string;

    @IsString()
    AWS_SECRET_KEY: string;

    @IsString()
    AWS_REGION: string;

    @IsString()
    AWS_BUCKET_NAME: string;

    @IsString()
    @IsOptional()
    GOOGLE_CLIENT_ID: string;

    @IsString()
    @IsOptional()
    GOOGLE_CLIENT_SECRET: string;

    @IsString()
    @IsOptional()
    CORS_ORIGIN?: string;

    @IsBoolean()
    @IsOptional()
    @Transform(({ value }) => {
        if (value === undefined || value === null) return false;
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
            return value.toLowerCase() === 'true';
        }
        return false;
    })
    ENABLE_SWAGGER?: string;
}

/**
 * Validate environment variables
 * This function validates that all required environment variables are present and valid
 * @param config - The configuration object to validate
 * @returns The validated configuration object
 * @throws Error if validation fails
 */
export function validate(config: Record<string, unknown>) {
    const validatedConfig = plainToClass(EnvironmentVariables, config, {
        enableImplicitConversion: true,
    });

    const errors = validateSync(validatedConfig, {
        skipMissingProperties: false,
    });

    if (errors.length > 0) {
        throw new Error(errors.toString());
    }

    return validatedConfig;
} 