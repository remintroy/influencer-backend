import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsMongoId, IsNotEmpty, IsNumber, IsString, Min, ValidateIf, registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';
import { Type } from 'class-transformer';

function IsDeliveryDateValid(property: string, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isDeliveryDateValid',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [property],
      validator: {
        async validate(value: any, args: ValidationArguments) {
          const obj = args.object as any;
          if (!obj.service) return true; // skip if service not loaded
          const minDays = obj.service.minimumDaysForCompletion || 1;
          const today = new Date();
          today.setHours(0,0,0,0);
          const minDate = new Date(today);
          minDate.setDate(today.getDate() + minDays);
          return value >= minDate;
        },
        defaultMessage(args: ValidationArguments) {
          const obj = args.object as any;
          const minDays = obj.service?.minimumDaysForCompletion || 1;
          return `Delivery date must be at least ${minDays} days from today.`;
        },
      },
    });
  };
}

export class AddToCartDto {
  @ApiProperty({ description: 'ID of the service to add to cart' })
  @IsMongoId()
  @IsNotEmpty()
  serviceId: string;

  @ApiProperty({ description: 'Delivery date for the service', example: '2024-03-20' })
  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  @IsDeliveryDateValid('service')
  deliveryDate: Date;

  @ApiProperty({ description: 'Location for the service (required if locationRequired is true)', required: false })
  @ValidateIf((o) => o.locationRequired)
  @IsString()
  @IsNotEmpty({ message: 'Location is required when locationRequired is true' })
  location?: string;

  // This will be set in the service, not by the client
  // locationRequired?: boolean;
  // service?: any;
}
