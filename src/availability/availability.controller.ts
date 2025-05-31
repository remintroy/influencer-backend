import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { AvailabilityService } from './availability.service';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { Roles } from '../common/decorators/role.decorator';
import { UserRole } from '../user/schemas/user.schema';
import { CheckAvailabilityDto } from './dto/check-availability.dto';
import { GetScheduleDto } from './dto/get-schedule.dto';

@ApiTags('Availability')
@ApiBearerAuth('access-token')
@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Post()
  @ApiOperation({
    summary: 'Create availability for a date',
    description: 'Create availability slots for a specific date',
  })
  @Roles(UserRole.INFLUENCER)
  async createAvailability(@Body() createAvailabilityDto: CreateAvailabilityDto, @Req() req: Request) {
    const influencerId = req?.user?.userId as string;
    return this.availabilityService.createAvailability(createAvailabilityDto, influencerId);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update availability',
    description: 'Update availability slots for a specific date',
  })
  @ApiParam({ name: 'id', description: 'Availability ID' })
  @Roles(UserRole.INFLUENCER)
  async updateAvailability(@Param('id') id: string, @Body() updateAvailabilityDto: UpdateAvailabilityDto, @Req() req: Request) {
    const influencerId = req?.user?.userId as string;
    return this.availabilityService.updateAvailability(id, updateAvailabilityDto, influencerId);
  }

  @Get(':influencerId/date/:date')
  @ApiOperation({
    summary: 'Get availability by date',
    description: 'Get availability slots for a specific date',
  })
  @ApiParam({ name: 'influencerId', description: 'ID of the influencer' })
  @ApiParam({ name: 'date', description: 'Date in ISO format' })
  @Roles(UserRole.INFLUENCER, UserRole.USER, UserRole.ADMIN)
  async getAvailabilityByDate(@Param('influencerId') influencerId: string, @Param('date') date: string) {
    return this.availabilityService.getAvailabilityByDate(new Date(date), influencerId);
  }

  @Post(':influencerId/:id/book')
  @ApiOperation({
    summary: 'Book a time slot',
    description: 'Book a specific time slot',
  })
  @ApiParam({ name: 'influencerId', description: 'ID of the influencer' })
  @ApiParam({ name: 'id', description: 'Availability ID' })
  @Roles(UserRole.USER)
  async bookTimeSlot(
    @Param('influencerId') influencerId: string,
    @Param('id') id: string,
    @Body() bookingData: { startTime: string; endTime: string; bookingId: string },
  ) {
    return this.availabilityService.bookTimeSlot(
      id,
      bookingData.startTime,
      bookingData.endTime,
      bookingData.bookingId,
      influencerId,
    );
  }

  @Post(':id/approve')
  @ApiOperation({
    summary: 'Approve a booking',
    description: 'Approve a booked time slot',
  })
  @ApiParam({ name: 'id', description: 'Availability ID' })
  @Roles(UserRole.INFLUENCER)
  async approveBooking(
    @Param('id') id: string,
    @Body() bookingData: { startTime: string; endTime: string },
    @Req() req: Request,
  ) {
    const influencerId = req?.user?.userId as string;
    return this.availabilityService.approveBooking(id, bookingData.startTime, bookingData.endTime, influencerId);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete availability',
    description: 'Delete availability for a specific date',
  })
  @ApiParam({ name: 'id', description: 'Availability ID' })
  @Roles(UserRole.INFLUENCER)
  async deleteAvailability(@Param('id') id: string, @Req() req: Request) {
    const influencerId = req?.user?.userId as string;
    return this.availabilityService.deleteAvailability(id, influencerId);
  }

  @Get('check/:influencerId')
  @ApiOperation({ summary: 'Check influencer availability for a specific time slot' })
  @ApiParam({ name: 'influencerId', description: 'ID of the influencer' })
  @ApiResponse({ status: 200, description: 'Returns availability status and available slots' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Influencer not found' })
  async checkAvailability(@Param('influencerId') influencerId: string, @Query() checkAvailabilityDto: CheckAvailabilityDto) {
    return this.availabilityService.checkInfluencerAvailability(
      influencerId,
      new Date(checkAvailabilityDto.date),
      checkAvailabilityDto.startTime,
      checkAvailabilityDto.endTime,
    );
  }

  @Get('schedule/:influencerId')
  @ApiOperation({
    summary: 'Get influencer schedule for a date range',
    description: 'Returns detailed schedule information including statistics and time slot details',
  })
  @ApiParam({ name: 'influencerId', description: 'ID of the influencer' })
  @ApiResponse({
    status: 200,
    description: 'Returns schedule with time slots, statistics, and booking details',
    schema: {
      type: 'object',
      properties: {
        schedule: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              date: { type: 'string', format: 'date' },
              timeSlots: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    startTime: { type: 'string' },
                    endTime: { type: 'string' },
                    status: { type: 'string', enum: ['AVAILABLE', 'BOOKED', 'UNAVAILABLE'] },
                    bookingId: { type: 'string', nullable: true },
                  },
                },
              },
              totalAvailable: { type: 'number' },
              totalBooked: { type: 'number' },
              totalUnavailable: { type: 'number' },
              availableTimeRanges: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    startTime: { type: 'string' },
                    endTime: { type: 'string' },
                  },
                },
              },
              bookedTimeRanges: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    startTime: { type: 'string' },
                    endTime: { type: 'string' },
                    bookingId: { type: 'string' },
                  },
                },
              },
            },
          },
        },
        summary: {
          type: 'object',
          properties: {
            totalDays: { type: 'number' },
            totalAvailableSlots: { type: 'number' },
            totalBookedSlots: { type: 'number' },
            totalUnavailableSlots: { type: 'number' },
            averageAvailabilityPerDay: { type: 'number' },
            bookingRate: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Influencer not found' })
  async getSchedule(@Param('influencerId') influencerId: string, @Query() getScheduleDto: GetScheduleDto) {
    return this.availabilityService.getInfluencerSchedule(
      influencerId,
      new Date(getScheduleDto.startDate),
      new Date(getScheduleDto.endDate),
    );
  }

  @Get('next-available/:influencerId')
  @ApiOperation({ summary: 'Get influencer next available time slot' })
  @ApiParam({ name: 'influencerId', description: 'ID of the influencer' })
  @ApiQuery({ name: 'fromDate', description: 'Start date to search from', required: false })
  @ApiResponse({ status: 200, description: 'Returns next available slot or null if none found' })
  @ApiResponse({ status: 404, description: 'Influencer not found' })
  async getNextAvailableSlot(@Param('influencerId') influencerId: string, @Query('fromDate') fromDate?: string) {
    return this.availabilityService.getInfluencerNextAvailableSlot(influencerId, fromDate ? new Date(fromDate) : new Date());
  }
}
