import { Injectable, Logger } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

/**
 * Global validation service
 * This service provides centralized validation functionality
 */
@Injectable()
export class ValidationService {
    private readonly logger = new Logger(ValidationService.name);

    /**
     * Validate an object against a class
     * @param object - The object to validate
     * @param dto - The DTO class to validate against
     * @returns The validation errors
     */
    async validateObject<T extends object>(object: T, dto: new () => T): Promise<string[]> {
        const dtoObject = plainToClass(dto, object);
        const errors = await validate(dtoObject);

        if (errors.length === 0) {
            return [];
        }

        const validationErrors: string[] = [];
        errors.forEach((error) => {
            if (error.constraints) {
                Object.values(error.constraints).forEach((constraint) => {
                    validationErrors.push(constraint);
                });
            }
        });

        return validationErrors;
    }

    /**
     * Validate an email address
     * @param email - The email to validate
     * @returns True if the email is valid
     */
    validateEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Validate a password
     * @param password - The password to validate
     * @returns True if the password is valid
     */
    validatePassword(password: string): boolean {
        // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        return passwordRegex.test(password);
    }

    /**
     * Validate a phone number
     * @param phone - The phone number to validate
     * @returns True if the phone number is valid
     */
    validatePhone(phone: string): boolean {
        // Basic phone number validation
        const phoneRegex = /^\+?[\d\s-]{10,}$/;
        return phoneRegex.test(phone);
    }

    /**
     * Validate a URL
     * @param url - The URL to validate
     * @returns True if the URL is valid
     */
    validateUrl(url: string): boolean {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Validate a date
     * @param date - The date to validate
     * @returns True if the date is valid
     */
    validateDate(date: string): boolean {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
            return false;
        }

        const d = new Date(date);
        return d instanceof Date && !isNaN(d.getTime());
    }

    /**
     * Validate a time
     * @param time - The time to validate
     * @returns True if the time is valid
     */
    validateTime(time: string): boolean {
        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
        return timeRegex.test(time);
    }

    /**
     * Validate a datetime
     * @param datetime - The datetime to validate
     * @returns True if the datetime is valid
     */
    validateDateTime(datetime: string): boolean {
        const datetimeRegex = /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):([0-5]\d):([0-5]\d)Z$/;
        if (!datetimeRegex.test(datetime)) {
            return false;
        }

        const d = new Date(datetime);
        return d instanceof Date && !isNaN(d.getTime());
    }

    /**
     * Validate a number
     * @param number - The number to validate
     * @returns True if the number is valid
     */
    validateNumber(number: string): boolean {
        return !isNaN(Number(number));
    }

    /**
     * Validate an integer
     * @param integer - The integer to validate
     * @returns True if the integer is valid
     */
    validateInteger(integer: string): boolean {
        return Number.isInteger(Number(integer));
    }

    /**
     * Validate a boolean
     * @param boolean - The boolean to validate
     * @returns True if the boolean is valid
     */
    validateBoolean(boolean: string): boolean {
        return boolean === 'true' || boolean === 'false';
    }

    /**
     * Validate a JSON string
     * @param json - The JSON string to validate
     * @returns True if the JSON string is valid
     */
    validateJson(json: string): boolean {
        try {
            JSON.parse(json);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Validate a base64 string
     * @param base64 - The base64 string to validate
     * @returns True if the base64 string is valid
     */
    validateBase64(base64: string): boolean {
        const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
        return base64Regex.test(base64);
    }

    /**
     * Validate a hex string
     * @param hex - The hex string to validate
     * @returns True if the hex string is valid
     */
    validateHex(hex: string): boolean {
        const hexRegex = /^[0-9A-Fa-f]+$/;
        return hexRegex.test(hex);
    }

    /**
     * Validate a UUID
     * @param uuid - The UUID to validate
     * @returns True if the UUID is valid
     */
    validateUuid(uuid: string): boolean {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
    }

    /**
     * Validate an IP address
     * @param ip - The IP address to validate
     * @returns True if the IP address is valid
     */
    validateIp(ip: string): boolean {
        const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
        if (!ipRegex.test(ip)) {
            return false;
        }

        const parts = ip.split('.');
        return parts.every((part) => {
            const num = parseInt(part, 10);
            return num >= 0 && num <= 255;
        });
    }

    /**
     * Validate a MAC address
     * @param mac - The MAC address to validate
     * @returns True if the MAC address is valid
     */
    validateMac(mac: string): boolean {
        const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
        return macRegex.test(mac);
    }

    /**
     * Validate a credit card number
     * @param card - The credit card number to validate
     * @returns True if the credit card number is valid
     */
    validateCreditCard(card: string): boolean {
        // Remove spaces and dashes
        card = card.replace(/[\s-]/g, '');

        // Check if the card number is valid
        if (!/^\d{13,19}$/.test(card)) {
            return false;
        }

        // Luhn algorithm
        let sum = 0;
        let isEven = false;

        for (let i = card.length - 1; i >= 0; i--) {
            let digit = parseInt(card.charAt(i), 10);

            if (isEven) {
                digit *= 2;
                if (digit > 9) {
                    digit -= 9;
                }
            }

            sum += digit;
            isEven = !isEven;
        }

        return sum % 10 === 0;
    }
} 