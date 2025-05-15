import {
    PipeTransform,
    Injectable,
    ArgumentMetadata,
    BadRequestException,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

/**
 * Global validation pipe
 * This pipe validates incoming request data against DTOs
 */
@Injectable()
export class ValidationPipe implements PipeTransform<any> {
    /**
     * Transform and validate the incoming data
     * @param value - The value to transform
     * @param metadata - The argument metadata
     * @returns The transformed value
     * @throws BadRequestException if validation fails
     */
    async transform(value: any, { metatype }: ArgumentMetadata) {
        if (!metatype || !this.toValidate(metatype)) {
            return value;
        }

        const object = plainToClass(metatype, value);
        const errors = await validate(object);

        if (errors.length > 0) {
            const messages = errors.map(error => {
                return {
                    property: error.property,
                    constraints: error.constraints,
                };
            });

            throw new BadRequestException({
                message: 'Validation failed',
                errors: messages,
            });
        }

        return object;
    }

    /**
     * Check if the type is a class
     * @param metatype - The type to check
     * @returns True if the type is a class
     */
    private toValidate(metatype: Function): boolean {
        const types: Function[] = [String, Boolean, Number, Array, Object];
        return !types.includes(metatype);
    }
} 