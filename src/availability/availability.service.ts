import { BadRequestException, Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Availability, TimeSlot, TimeSlotStatus } from './schemas/availability.schema';
import { CreateAvailabilityDto, TimeSlotDto } from './dto/create-availability.dto';
import { UpdateAvailabilityDto, UpdateTimeSlotDto } from './dto/update-availability.dto';
import { InfluencerServiceService } from '../influencer-service/influencer-service.service';
import { ServiceType } from '../influencer-service/schemas/influencer-service.schema';
import { isValidObjectId } from 'mongoose';

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectModel(Availability.name) private readonly availabilityModel: Model<Availability>,
    private readonly influencerServiceService: InfluencerServiceService,
  ) {}

  private validateTimeFormat(time: string): boolean {
    const [hours, minutes] = time.split(':').map(Number);
    return hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60 && minutes % 30 === 0;
  }

  private validateTimeSlot(startTime: string, endTime: string): boolean {
    if (!this.validateTimeFormat(startTime) || !this.validateTimeFormat(endTime)) {
      return false;
    }

    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    return endMinutes - startMinutes === 30;
  }

  private mergeTimeSlots(existingSlots: TimeSlot[], newSlots: (TimeSlot | UpdateTimeSlotDto)[]): TimeSlot[] {
    // Create a map of existing slots for easy lookup
    const slotMap = new Map<string, TimeSlot>();
    existingSlots.forEach((slot) => {
      slotMap.set(slot.startTime.toISOString(), slot);
    });

    // Update or add new slots
    newSlots.forEach((slot) => {
      slotMap.set(slot.startTime?.toISOString() as string, {
        ...slot,
        startTime: new Date(slot?.startTime as unknown as string),
        endTime: new Date(slot?.endTime as unknown as string),
        status: slot.status as TimeSlotStatus,
        bookingId: slot.bookingId ? new Types.ObjectId(slot.bookingId) : undefined,
      });
    });

    // Convert map back to array and sort by start time
    return Array.from(slotMap.values()).sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }

  async createAvailability(createAvailabilityDto: CreateAvailabilityDto, influencerId: string): Promise<Availability> {
    const { timeSlots, isActive = true } = createAvailabilityDto;

    // Convert DTO to TimeSlot array and validate basic format
    const slots: TimeSlot[] = await this.validateAndConvertTimeSlots(timeSlots, influencerId);

    // Get existing availability for the influencer
    const existingAvailability = await this.availabilityModel.find({
      userId: new Types.ObjectId(influencerId),
      isActive: true,
    }).exec();

    // Check for overlaps with existing availability
    for (const availability of existingAvailability) {
      for (const existingSlot of availability.timeSlots) {
        for (const newSlot of slots) {
          if (
            (newSlot.startTime <= existingSlot.startTime && newSlot.endTime > existingSlot.startTime) ||
            (existingSlot.startTime <= newSlot.startTime && existingSlot.endTime > newSlot.startTime)
          ) {
            throw new BadRequestException(
              `Time slot ${newSlot.startTime.toISOString()} - ${newSlot.endTime.toISOString()} overlaps with existing availability`,
            );
          }
        }
      }
    }

    // Create new availability
    const availability = new this.availabilityModel({
      userId: new Types.ObjectId(influencerId),
      timeSlots: slots,
      isActive,
    });

    return availability.save();
  }

  async updateAvailability(
    id: string,
    updateAvailabilityDto: UpdateAvailabilityDto,
    influencerId: string,
  ): Promise<Availability> {
    const { timeSlots, isActive } = updateAvailabilityDto;

    if (timeSlots) {
      // Convert UpdateTimeSlotDto[] to TimeSlotDto[] for validation
      const timeSlotDtos: TimeSlotDto[] = timeSlots.map((slot) => ({
        startTime: slot.startTime!,
        endTime: slot.endTime!,
        status: slot.status,
        bookingId: slot.bookingId,
      }));

      // Convert DTO to TimeSlot array and validate
      const slots: TimeSlot[] = await this.validateAndConvertTimeSlots(timeSlotDtos, influencerId);

      const availability = await this.availabilityModel
        .findByIdAndUpdate(id, { $set: { timeSlots: slots, isActive } }, { new: true })
        .exec();

      if (!availability) {
        throw new NotFoundException('Availability not found');
      }

      return availability;
    }

    const availability = await this.availabilityModel.findByIdAndUpdate(id, { $set: { isActive } }, { new: true }).exec();

    if (!availability) {
      throw new NotFoundException('Availability not found');
    }

    return availability;
  }

  async getAvailabilityByDate(date: Date, influencerId: string): Promise<Availability[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.availabilityModel
      .find({
        userId: new Types.ObjectId(influencerId),
        'timeSlots.startTime': { $gte: startOfDay },
        'timeSlots.endTime': { $lte: endOfDay },
      })
      .exec();
  }

  async bookTimeSlot(
    id: string,
    startTime: Date | string,
    endTime: Date | string,
    bookingId: string,
    influencerId: string,
  ): Promise<Availability> {
    const availability = await this.availabilityModel.findById(id).exec();
    if (!availability) {
      throw new NotFoundException('Availability not found');
    }

    if (availability.userId.toString() !== influencerId) {
      throw new BadRequestException('You can only book slots in your own availability');
    }

    startTime = new Date(startTime);
    endTime = new Date(endTime);

    // Find and update the matching time slot
    const timeSlots = availability.timeSlots.map((slot) => {
      if (
        slot.startTime.getTime() === startTime.getTime() &&
        slot.endTime.getTime() === endTime.getTime() &&
        slot.status === TimeSlotStatus.AVAILABLE
      ) {
        return {
          ...slot,
          status: TimeSlotStatus.BOOKED,
          bookingId: new Types.ObjectId(bookingId),
        };
      }
      return slot;
    });

    availability.timeSlots = timeSlots;
    return availability.save();
  }

  async approveBooking(
    id: string,
    startTime: Date | string,
    endTime: Date | string,
    influencerId: string,
  ): Promise<Availability> {
    const availability = await this.availabilityModel.findById(id).exec();
    if (!availability) {
      throw new NotFoundException('Availability not found');
    }

    if (availability.userId.toString() !== influencerId) {
      throw new BadRequestException('You can only approve bookings in your own availability');
    }

    startTime = new Date(startTime);
    endTime = new Date(endTime);

    // Find and update the matching time slot
    const timeSlots = availability.timeSlots.map((slot) => {
      if (
        slot.startTime.getTime() === startTime.getTime() &&
        slot.endTime.getTime() === endTime.getTime() &&
        slot.status === TimeSlotStatus.BOOKED
      ) {
        return {
          ...slot,
          status: TimeSlotStatus.UNAVAILABLE,
        };
      }
      return slot;
    });

    availability.timeSlots = timeSlots;
    return availability.save();
  }

  async deleteAvailability(id: string, influencerId: string): Promise<void> {
    const availability = await this.availabilityModel.findById(id).exec();
    if (!availability) {
      throw new NotFoundException('Availability not found');
    }

    if (availability.userId.toString() !== influencerId) {
      throw new BadRequestException('You can only delete your own availability');
    }

    const result = await this.availabilityModel.deleteOne({ _id: id }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException('Availability not found');
    }
  }

  async checkInfluencerAvailability(influencerId: string, date: Date, startTime: string, endTime: string): Promise<boolean> {
    const start = new Date(`${date.toISOString().split('T')[0]}T${startTime}`);
    const end = new Date(`${date.toISOString().split('T')[0]}T${endTime}`);

    // Get all active availabilities for the user
    const availabilities = await this.availabilityModel
      .find({
        userId: new Types.ObjectId(influencerId),
        isActive: true,
      })
      .exec();

    if (!availabilities.length) {
      return false;
    }

    // Check if the requested time slot overlaps with any existing availability
    for (const availability of availabilities) {
      for (const slot of availability.timeSlots) {
        if (slot.status === TimeSlotStatus.AVAILABLE && slot.startTime <= start && slot.endTime >= end) {
          return true;
        }
      }
    }

    return false;
  }

  async getInfluencerSchedule(
    influencerId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    schedule: {
      date: Date;
      timeSlots: TimeSlot[];
      totalAvailable: number;
      totalBooked: number;
      totalUnavailable: number;
      availableTimeRanges: { startTime: string; endTime: string }[];
      bookedTimeRanges: { startTime: string; endTime: string; bookingId: string }[];
    }[];
    summary: {
      totalDays: number;
      totalAvailableSlots: number;
      totalBookedSlots: number;
      totalUnavailableSlots: number;
      averageAvailabilityPerDay: number;
      bookingRate: number;
    };
  }> {
    const availabilities = await this.availabilityModel
      .find({
        userId: new Types.ObjectId(influencerId),
        isActive: true,
        'timeSlots.startTime': { $gte: startDate },
        'timeSlots.endTime': { $lte: endDate },
      })
      .exec();

    const schedule = availabilities.map((availability) => {
      const timeSlots = availability.timeSlots;
      const totalAvailable = timeSlots.filter((slot) => slot.status === TimeSlotStatus.AVAILABLE).length;
      const totalBooked = timeSlots.filter((slot) => slot.status === TimeSlotStatus.BOOKED).length;
      const totalUnavailable = timeSlots.filter((slot) => slot.status === TimeSlotStatus.UNAVAILABLE).length;

      const availableTimeRanges = timeSlots
        .filter((slot) => slot.status === TimeSlotStatus.AVAILABLE)
        .map((slot) => ({
          startTime: slot.startTime.toISOString(),
          endTime: slot.endTime.toISOString(),
        }));

      const bookedTimeRanges = timeSlots
        .filter((slot) => slot.status === TimeSlotStatus.BOOKED)
        .map((slot) => ({
          startTime: slot.startTime.toISOString(),
          endTime: slot.endTime.toISOString(),
          bookingId: slot.bookingId?.toString() || '',
        }));

      // Use the earliest slot's startTime as the date for this schedule entry
      const sortedSlots = [...timeSlots].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
      const date = sortedSlots.length > 0 ? sortedSlots[0].startTime : new Date();

      return {
        date,
        timeSlots,
        totalAvailable,
        totalBooked,
        totalUnavailable,
        availableTimeRanges,
        bookedTimeRanges,
      };
    });

    const summary = {
      totalDays: schedule.length,
      totalAvailableSlots: schedule.reduce((sum, day) => sum + day.totalAvailable, 0),
      totalBookedSlots: schedule.reduce((sum, day) => sum + day.totalBooked, 0),
      totalUnavailableSlots: schedule.reduce((sum, day) => sum + day.totalUnavailable, 0),
      averageAvailabilityPerDay:
        schedule.length > 0 ? schedule.reduce((sum, day) => sum + day.totalAvailable, 0) / schedule.length : 0,
      bookingRate:
        schedule.length > 0
          ? schedule.reduce((sum, day) => sum + day.totalBooked, 0) /
            schedule.reduce((sum, day) => sum + day.totalAvailable + day.totalBooked, 0)
          : 0,
    };

    return { schedule, summary };
  }

  private async validateAndConvertTimeSlots(timeSlots: TimeSlotDto[], influencerId: string): Promise<TimeSlot[]> {
    if (!timeSlots || !Array.isArray(timeSlots) || timeSlots.length === 0) {
      throw new BadRequestException('Time slots must be a non-empty array');
    }

    // Convert DTO to TimeSlot array
    const slots: TimeSlot[] = timeSlots.map((slot) => ({
      startTime: slot.startTime,
      endTime: slot.endTime,
      status: slot.status || TimeSlotStatus.AVAILABLE,
      bookingId: slot.bookingId ? new Types.ObjectId(slot.bookingId) : undefined,
    }));

    // Validate each time slot
    for (const slot of slots) {
      if (!slot.startTime || !slot.endTime) {
        throw new BadRequestException('Each time slot must have start and end times');
      }

      if (slot.startTime >= slot.endTime) {
        throw new BadRequestException('Start time must be before end time');
      }

      // Check if the time slot duration is valid (30 minutes minimum)
      const slotDuration = (slot.endTime.getTime() - slot.startTime.getTime()) / (1000 * 60); // in minutes
      if (slotDuration < 30) {
        throw new BadRequestException('Time slot duration must be at least 30 minutes');
      }

      // Check if the time slot duration is in 30-minute increments
      if (slotDuration % 30 !== 0) {
        throw new BadRequestException('Time slot duration must be in 30-minute increments');
      }

      // Validate that slots are not in the past
      const now = new Date();
      if (slot.startTime < now) {
        throw new BadRequestException('Cannot create time slots in the past');
      }
    }

    // Check for overlapping slots within the new slots
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const slot1 = slots[i];
        const slot2 = slots[j];

        if (
          (slot1.startTime <= slot2.startTime && slot1.endTime > slot2.startTime) ||
          (slot2.startTime <= slot1.startTime && slot2.endTime > slot1.startTime)
        ) {
          throw new BadRequestException('Time slots cannot overlap');
        }
      }
    }

    return slots;
  }

  async getAvailabilityByUserId(userId: string) {
    if (!isValidObjectId(userId)) throw new BadRequestException('Invalid userId');
    return await this.availabilityModel.findOne({ userId: new Types.ObjectId(userId) });
  }

  async checkUserAvailability(userId: string, startTime: Date, endTime: Date): Promise<boolean> {
    if (!isValidObjectId(userId)) throw new BadRequestException('Invalid userId');

    const availability = await this.availabilityModel.findOne({
      userId: new Types.ObjectId(userId),
      'timeSlots.startTime': { $lte: endTime },
      'timeSlots.endTime': { $gte: startTime },
    });

    if (!availability) return false;

    // Check if the requested time slot overlaps with any existing time slots
    const hasOverlap = availability.timeSlots.some((slot) => {
      const slotStart = new Date(slot.startTime);
      const slotEnd = new Date(slot.endTime);
      return (
        (startTime >= slotStart && startTime < slotEnd) ||
        (endTime > slotStart && endTime <= slotEnd) ||
        (startTime <= slotStart && endTime >= slotEnd)
      );
    });

    return !hasOverlap;
  }

  async checkAvailabilityForService(serviceId: string, startTime: Date, endTime: Date): Promise<boolean> {
    const service = await this.influencerServiceService.getInfluencerServiceByServiceId(serviceId);
    if (!service) {
      throw new NotFoundException('Service not found');
    }

    // If it's a collaboration service, check all users' availability
    if (service.type === ServiceType.COLLABORATION && service.users) {
      // Check availability for all users in the service
      for (const userId of service.users) {
        const isAvailable = await this.checkUserAvailability(userId.toString(), startTime, endTime);
        if (!isAvailable) return false;
      }
      return true;
    }

    // For individual services, check only the creator's availability
    if (!service.createdBy) {
      throw new NotFoundException('Service creator not found');
    }
    return this.checkUserAvailability(service.createdBy.toString(), startTime, endTime);
  }

  async getAvailabilityRange(startDate: Date, endDate: Date, influencerId: string): Promise<Availability[]> {
    return this.availabilityModel.find({
      influencerId: new Types.ObjectId(influencerId),
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    });
  }

  async getInfluencerNextAvailableSlot(influencerId: string, fromDate: Date): Promise<{ date: Date; timeSlot: TimeSlot } | null> {
    try {
      const availability = await this.availabilityModel
        .findOne({
          influencerId: new Types.ObjectId(influencerId),
          date: { $gte: new Date(fromDate) },
          'timeSlots.status': TimeSlotStatus.AVAILABLE,
        })
        .sort({ date: 1 })
        .lean();

      if (!availability) {
        return null;
      }

      const availableSlot = availability.timeSlots.find((slot) => slot.status === TimeSlotStatus.AVAILABLE);

      if (!availableSlot) {
        return null;
      }

      return {
        date: availability.date,
        timeSlot: availableSlot,
      };
    } catch (error) {
      throw new InternalServerErrorException('Error finding next available slot');
    }
  }
}
