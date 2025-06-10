import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Put, Query, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiResponse,
  ApiBody,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AvailabilityService } from './availability.service';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { UpdateTimeSlotPortionDto } from './dto/update-portion-availability.dto';
import { Roles } from '../common/decorators/role.decorator';
import { UserRole } from '../user/schemas/user.schema';
import { DeleteTimeSlotsDto, DeleteTimeSlotsResponseDto } from './dto/delete-availability.dto';
import { GetAvailabilityQueryDto, PaginatedAvailabilityResponseDto } from './dto/get-availability.dto';

@ApiTags('Availability (Beta)')
@ApiBearerAuth('access-token')
@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Post()
  @ApiOperation({
    summary: 'Create availability for a date',
    description: 'Create availability slots for a specific date',
  })
  @ApiBody({ type: CreateAvailabilityDto })
  @Roles(UserRole.INFLUENCER)
  async createAvailability(@Body() createAvailabilityDto: CreateAvailabilityDto, @Req() req: Request) {
    const influencerId = req?.user?.userId as string;
    return this.availabilityService.createOptimizedAvailability(createAvailabilityDto, influencerId);
  }

  @Put('/date/:date/split-slot')
  @ApiOperation({
    summary: 'Update portion of a time slot',
    description:
      'Update a specific portion of an existing time slot (splits the slot if needed). Useful for booking part of a larger available slot.',
  })
  @ApiParam({
    name: 'date',
    description: 'Date in YYYY-MM-DD format',
    example: '2024-12-25',
  })
  @ApiResponse({
    status: 200,
    description: 'Time slot portion updated successfully',
    schema: {
      example: {
        _id: '507f1f77bcf86cd799439011',
        influencerId: '507f1f77bcf86cd799439012',
        date: '2024-12-25T00:00:00.000Z',
        timeSlots: [
          {
            startTime: '10:00',
            endTime: '11:00',
            status: 'available',
            bookingId: null,
          },
          {
            startTime: '11:00',
            endTime: '12:00',
            status: 'booked',
            bookingId: '507f1f77bcf86cd799439013',
          },
          {
            startTime: '12:00',
            endTime: '13:00',
            status: 'available',
            bookingId: null,
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input or validation errors',
    schema: {
      example: {
        statusCode: 400,
        message: 'No time slot found that contains 11:00-12:00',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Availability not found for the date',
    schema: {
      example: {
        statusCode: 404,
        message: 'No availability found for date 2024-12-25',
        error: 'Not Found',
      },
    },
  })
  @Roles(UserRole.INFLUENCER)
  async updateTimeSlotPortion(
    @Param('date') date: string,
    @Body() updateTimeSlotPortionDto: UpdateTimeSlotPortionDto,
    @Req() req: Request,
  ) {
    // Validate that the requesting user can update this influencer's availability
    const requestingUserId = req?.user?.userId as string;

    // Parse and validate date
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      throw new BadRequestException('Invalid date format. Use YYYY-MM-DD');
    }

    return this.availabilityService.updateTimeSlotPortion(
      requestingUserId,
      parsedDate,
      updateTimeSlotPortionDto.targetStartTime,
      updateTimeSlotPortionDto.targetEndTime,
      {
        status: updateTimeSlotPortionDto.status,
        bookingId: updateTimeSlotPortionDto.bookingId,
      },
    );
  }

  @Delete('/date/:date/slots')
  @ApiOperation({
    summary: 'Delete time slots',
    description: 'Delete specific slots, partial slots, or all slots with flexible options',
  })
  @ApiResponse({ status: 200, type: DeleteTimeSlotsResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid input or booked slots' })
  @ApiNotFoundResponse({ description: 'Availability not found' })
  @Roles(UserRole.INFLUENCER)
  async deleteTimeSlots(
    @Param('date') dateParam: string,
    @Body() body: DeleteTimeSlotsDto,
    @Req() req: Request,
  ): Promise<DeleteTimeSlotsResponseDto> {
    const influencerId = req?.user?.userId!;

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      throw new BadRequestException('Date must be in YYYY-MM-DD format');
    }

    const date = new Date(dateParam);
    if (isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date provided');
    }

    return await this.availabilityService.deleteTimeSlots(
      influencerId,
      date,
      body.timeSlots || [],
      body.deleteAll,
      body.allowPartial,
      body.removeEmpty,
    );
  }

  @Get('influencer/:influencerId')
  @ApiOperation({
    summary: 'Get availability for an influencer',
    description: 'Retrieve paginated availability records for a specific influencer with optional filtering',
  })
  @ApiParam({
    name: 'influencerId',
    description: 'Influencer ID',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Influencer availability retrieved successfully',
    type: PaginatedAvailabilityResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request parameters' })
  async getInfluencerAvailability(
    @Param('influencerId') influencerId: string,
    @Query() query: GetAvailabilityQueryDto,
  ): Promise<PaginatedAvailabilityResponseDto> {
    return this.availabilityService.getInfluencerAvailability(influencerId, query);
  }
}
