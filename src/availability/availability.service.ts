import { BadRequestException, Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { Availability, AvailabilityDocument, TimeSlot, TimeSlotStatus } from './schemas/availability.schema';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { GetAvailabilityQueryDto, PaginatedAvailabilityResponseDto } from './dto/get-availability.dto';

export interface DeleteTimeSlotRequest {
  startTime: string;
  endTime: string;
}

export interface DeleteResult {
  success: boolean;
  message: string;
  deletedCount: number;
  modifiedCount: number;
  availabilityRemoved: boolean;
}

@Injectable()
export class AvailabilityService {
  // TODO: Merge time consecutive time slots with available status for better simplicity.
  constructor(@InjectModel(Availability.name) private availabilityModel: Model<AvailabilityDocument>) {}

  /**
   * Validates individual time slots for correct format and duration
   */
  private validateTimeSlots(timeSlots: (TimeSlot | any)[]): void {
    for (const slot of timeSlots) {
      if (!slot.startTime || !slot.endTime) {
        throw new BadRequestException('Each time slot must have startTime and endTime');
      }

      // Validate time format (HH:mm)
      if (!this.isValidTimeFormat(slot.startTime) || !this.isValidTimeFormat(slot.endTime)) {
        throw new BadRequestException(`Invalid time format for slot ${slot.startTime}-${slot.endTime}. Use HH:mm format`);
      }

      // Validate start time is before end time
      if (this.timeToMinutes(slot.startTime) >= this.timeToMinutes(slot.endTime)) {
        throw new BadRequestException(
          `Invalid time range: ${slot.startTime}-${slot.endTime}. Start time must be before end time`,
        );
      }
    }
  }

  /**
   * Validates time format and 30-minute intervals
   */
  isValidTimeFormat(time: string): boolean {
    if (!/^\d{2}:\d{2}$/.test(time)) {
      return false;
    }

    const [hours, minutes] = time.split(':').map(Number);

    return hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60;
  }

  /**
   * Calculates duration between two times in minutes
   */
  calculateSlotDuration(startTime: string, endTime: string): number {
    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);
    return endMinutes - startMinutes;
  }

  /**
   * Converts time string to total minutes since midnight
   */
  timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Converts minutes to time string
   */
  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  /**
   * Validates that new time slots don't overlap with each other
   */
  validateNoOverlappingSlots(timeSlots: (TimeSlot | any)[]): void {
    const sortedSlots = [...timeSlots].sort((a, b) => this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime));

    for (let i = 0; i < sortedSlots.length - 1; i++) {
      const currentSlot = sortedSlots[i];
      const nextSlot = sortedSlots[i + 1];

      if (this.slotsOverlap(currentSlot, nextSlot)) {
        throw new BadRequestException(
          `Overlapping time slots detected: ${currentSlot.startTime}-${currentSlot.endTime} and ${nextSlot.startTime}-${nextSlot.endTime}`,
        );
      }
    }
  }

  /**
   * Validates that new slots don't overlap with existing slots
   */
  validateNoOverlapWithExisting(newSlots: (TimeSlot | any)[], existingSlots: TimeSlot[]): void {
    for (const newSlot of newSlots) {
      for (const existingSlot of existingSlots) {
        if (this.slotsOverlap(newSlot, existingSlot)) {
          throw new BadRequestException(
            `New time slot ${newSlot.startTime}-${newSlot.endTime} overlaps with existing slot ${existingSlot.startTime}-${existingSlot.endTime}`,
          );
        }
      }
    }
  }

  /**
   * Checks if two time slots overlap
   */
  slotsOverlap(slot1: any, slot2: any): boolean {
    const slot1Start = this.timeToMinutes(slot1.startTime);
    const slot1End = this.timeToMinutes(slot1.endTime);
    const slot2Start = this.timeToMinutes(slot2.startTime);
    const slot2End = this.timeToMinutes(slot2.endTime);

    // Slots overlap if one starts before the other ends and vice versa
    return slot1Start < slot2End && slot1End > slot2Start;
  }

  /**
   * Merges new slots with existing slots and sorts them
   */
  mergeAndSortTimeSlots(existingSlots: TimeSlot[], newSlots: (TimeSlot | any)[]): TimeSlot[] {
    const processedNewSlots: TimeSlot[] = newSlots.map((slot) => ({
      startTime: slot.startTime,
      endTime: slot.endTime,
      status: slot.status || TimeSlotStatus.AVAILABLE,
      bookingId: slot.bookingId ? new Types.ObjectId(slot.bookingId) : undefined,
    }));

    const allSlots = [...existingSlots, ...processedNewSlots];
    return this.sortTimeSlots(allSlots);
  }

  /**
   * Sorts time slots by start time
   */
  sortTimeSlots(timeSlots: TimeSlot[]): TimeSlot[] {
    return timeSlots.sort((a, b) => this.timeToMinutes(a.startTime) - this.timeToMinutes(b.startTime));
  }

  async checkInfluencerAvailability(
    influencerId: string,
    date: Date,
    startTime: string,
    endTime: string,
  ): Promise<{ isAvailable: boolean; availableSlots: TimeSlot[] }> {
    try {
      // Validate time format
      if (!this.isValidTimeFormat(startTime) || !this.isValidTimeFormat(endTime)) {
        throw new BadRequestException('Invalid time format. Use HH:mm format with 30-minute intervals.');
      }

      // Find availability for the given date
      const availability = await this.availabilityModel.findOne({
        influencerId: new Types.ObjectId(influencerId),
        date: new Date(date),
      });

      if (!availability) {
        return { isAvailable: false, availableSlots: [] };
      }

      // Find all available slots within the requested time range
      const availableSlots = availability.timeSlots.filter((slot) => {
        const slotStart = slot.startTime;
        const slotEnd = slot.endTime;
        return slot.status === TimeSlotStatus.AVAILABLE && slotStart >= startTime && slotEnd <= endTime;
      });

      return {
        isAvailable: availableSlots.length > 0,
        availableSlots,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Error checking availability');
    }
  }

  async createOptimizedAvailability(createAvailabilityDto: CreateAvailabilityDto, influencerId: string): Promise<Availability> {
    try {
      const { date, timeSlots } = createAvailabilityDto;

      // Validate input parameters
      if (!date || !influencerId) {
        throw new BadRequestException('Date and influencer ID are required');
      }

      if (!timeSlots || timeSlots.length === 0) {
        throw new BadRequestException('At least one time slot is required');
      }

      // Step 1: Validate each time slot format and duration
      this.validateTimeSlots(timeSlots);

      // Step 2: Check for overlapping time slots within the new slots
      this.validateNoOverlappingSlots(timeSlots);

      // Step 3: Check if availability already exists for this date
      const targetDate = new Date(date);

      if (targetDate < new Date()) throw new BadRequestException('You cannot create time slot in past');

      const existingAvailability = await this.availabilityModel.findOne({
        influencerId: new Types.ObjectId(influencerId),
        date: targetDate,
      });

      if (existingAvailability) {
        // Step 4: Validate new slots don't overlap with existing slots
        this.validateNoOverlapWithExisting(timeSlots, existingAvailability.timeSlots);

        // Merge and sort time slots
        const mergedSlots = this.mergeAndSortTimeSlots(existingAvailability.timeSlots, timeSlots);
        existingAvailability.timeSlots = mergedSlots;

        return await existingAvailability.save();
      }

      // Step 5: Create new availability document
      const newAvailability = new this.availabilityModel({
        influencerId: new Types.ObjectId(influencerId),
        date: targetDate,
        timeSlots: this.sortTimeSlots(timeSlots),
        isActive: true,
      });

      return await newAvailability.save();
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }

      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map((err: any) => err.message);
        throw new BadRequestException(`Validation failed: ${validationErrors.join(', ')}`);
      }

      if (error.name === 'CastError') {
        throw new BadRequestException(`Invalid data format: ${error.path} - ${error.value}`);
      }

      throw new InternalServerErrorException('Failed to create availability schedule');
    }
  }

  /**
   * Updates a portion of an existing time slot (splits the slot if needed)
   */
  async updateTimeSlotPortion(
    influencerId: string,
    date: Date,
    targetStartTime: string,
    targetEndTime: string,
    updates: {
      status?: TimeSlotStatus;
      bookingId?: string;
    },
  ): Promise<Availability> {
    try {
      // Validate input parameters
      if (!influencerId || !date) {
        throw new BadRequestException('Influencer ID and date are required');
      }

      // Find existing availability for the date
      const targetDate = new Date(date);
      const existingAvailability = await this.availabilityModel.findOne({
        influencerId: new Types.ObjectId(influencerId),
        date: targetDate,
      });

      if (!existingAvailability) {
        throw new NotFoundException(`No availability found for date ${targetDate.toISOString().split('T')[0]}`);
      }

      // Find the slot that contains the target time range
      const containingSlotIndex = existingAvailability.timeSlots.findIndex((slot) => {
        return slot.startTime <= targetStartTime && slot.endTime >= targetEndTime;
      });

      if (containingSlotIndex === -1) {
        throw new BadRequestException(`No time slot found that contains ${targetStartTime}-${targetEndTime}`);
      }

      const containingSlot = existingAvailability.timeSlots[containingSlotIndex];

      // Check if the containing slot is already booked (and we're trying to book part of it)
      if (containingSlot.status === TimeSlotStatus.BOOKED && updates.status === TimeSlotStatus.BOOKED) {
        throw new BadRequestException(`Time slot ${targetStartTime}-${targetEndTime} is already booked`);
      }

      // Remove the original slot
      existingAvailability.timeSlots.splice(containingSlotIndex, 1);

      const newSlots: any = [];

      // Add slot before target (if exists)
      if (containingSlot.startTime < targetStartTime) {
        newSlots.push({
          startTime: containingSlot.startTime,
          endTime: targetStartTime,
          status: containingSlot.status,
          bookingId: containingSlot.bookingId,
        });
      }

      // Add the target slot with updates
      newSlots.push({
        startTime: targetStartTime,
        endTime: targetEndTime,
        status: updates.status !== undefined ? updates.status : containingSlot.status,
        bookingId:
          updates.bookingId !== undefined
            ? updates.bookingId
              ? new Types.ObjectId(updates.bookingId)
              : undefined
            : containingSlot.bookingId,
      });

      // Add slot after target (if exists)
      if (containingSlot.endTime > targetEndTime) {
        newSlots.push({
          startTime: targetEndTime,
          endTime: containingSlot.endTime,
          status: containingSlot.status,
          bookingId: containingSlot.bookingId,
        });
      }

      // Add new slots to the availability
      existingAvailability.timeSlots.push(...newSlots);

      // Sort slots
      existingAvailability.timeSlots = this.sortTimeSlots(existingAvailability.timeSlots);

      return await existingAvailability.save();
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }

      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map((err: any) => err.message);
        throw new BadRequestException(`Validation failed: ${validationErrors.join(', ')}`);
      }

      throw new InternalServerErrorException('Failed to update time slot portion');
    }
  }

  /**
   * Main delete method handling all deletion scenarios
   */
  async deleteTimeSlots(
    influencerId: string,
    date: Date,
    slotsToDelete: DeleteTimeSlotRequest[] = [],
    deleteAll: boolean = false,
    allowPartial: boolean = true,
    removeEmpty: boolean = false,
  ): Promise<DeleteResult> {
    try {
      // Validate inputs
      if (!influencerId || !date) {
        throw new BadRequestException('Influencer ID and date are required');
      }

      // Find existing availability
      const targetDate = new Date(date);
      const availability = await this.availabilityModel.findOne({
        influencerId: new Types.ObjectId(influencerId),
        date: targetDate,
      });

      if (!availability) {
        throw new NotFoundException(`No availability found for date ${targetDate.toISOString().split('T')[0]}`);
      }

      let deletedCount = 0;
      let modifiedCount = 0;

      // Handle delete all
      if (deleteAll) {
        const bookedSlots = availability.timeSlots.filter((slot) => slot.status === TimeSlotStatus.BOOKED);
        if (bookedSlots.length > 0) {
          throw new BadRequestException(
            `Cannot delete all slots. Found booked slots: ${bookedSlots.map((s) => `${s.startTime}-${s.endTime}`).join(', ')}`,
          );
        }
        deletedCount = availability.timeSlots.length;
        availability.timeSlots = [];
      } else {
        // Process specific slots
        if (!slotsToDelete.length) {
          throw new BadRequestException('At least one slot to delete is required');
        }

        this.validateTimeSlots(slotsToDelete);

        for (const slotToDelete of slotsToDelete) {
          const result = this.processSlotDeletion(availability, slotToDelete, allowPartial);
          deletedCount += result.deleted;
          modifiedCount += result.modified;
        }
      }

      // Handle cleanup
      if (removeEmpty && availability.timeSlots.length === 0) {
        await this.availabilityModel.deleteOne({ _id: availability._id });
        return {
          success: true,
          message: 'All slots deleted and availability removed',
          deletedCount,
          modifiedCount,
          availabilityRemoved: true,
        };
      }

      // Sort and save
      availability.timeSlots = this.sortTimeSlots(availability.timeSlots);
      await availability.save();

      return {
        success: true,
        message: this.buildDeletedMessage(deletedCount, modifiedCount),
        deletedCount,
        modifiedCount,
        availabilityRemoved: false,
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to delete time slots');
    }
  }

  /**
   * Processes single slot deletion with flexible matching
   */
  private processSlotDeletion(
    availability: any,
    slotToDelete: DeleteTimeSlotRequest,
    allowPartial: boolean,
  ): { deleted: number; modified: number } {
    const { startTime, endTime } = slotToDelete;

    // Try exact match first
    const exactIndex = availability.timeSlots.findIndex((slot) => slot.startTime === startTime && slot.endTime === endTime);

    if (exactIndex !== -1) {
      const slot = availability.timeSlots[exactIndex];
      if (slot.status === TimeSlotStatus.BOOKED) {
        throw new BadRequestException(`Cannot delete booked slot ${startTime}-${endTime}`);
      }
      availability.timeSlots.splice(exactIndex, 1);
      return { deleted: 1, modified: 0 };
    }

    if (!allowPartial) {
      throw new BadRequestException(`Slot ${startTime}-${endTime} not found`);
    }

    // Handle partial/spanning deletion
    return this.handlePartialDeletion(availability, startTime, endTime);
  }

  /**
   * Handles partial deletion across multiple slots
   */
  private handlePartialDeletion(availability: any, startTime: string, endTime: string): { deleted: number; modified: number } {
    const deleteStart = this.timeToMinutes(startTime);
    const deleteEnd = this.timeToMinutes(endTime);

    const overlappingSlots = availability.timeSlots.filter((slot) => {
      const slotStart = this.timeToMinutes(slot.startTime);
      const slotEnd = this.timeToMinutes(slot.endTime);
      return slotStart < deleteEnd && slotEnd > deleteStart;
    });

    if (!overlappingSlots.length) {
      throw new BadRequestException(`No overlapping slots found for ${startTime}-${endTime}`);
    }

    // Check for booked slots
    const bookedSlots = overlappingSlots.filter((slot) => slot.status === TimeSlotStatus.BOOKED);
    if (bookedSlots.length) {
      throw new BadRequestException(
        `Cannot delete range ${startTime}-${endTime}. Contains booked slots: ${bookedSlots
          .map((s) => `${s.startTime}-${s.endTime}`)
          .join(', ')}`,
      );
    }

    let deletedCount = 0;
    let modifiedCount = 0;

    // Process each overlapping slot
    overlappingSlots.forEach((slot) => {
      const slotStart = this.timeToMinutes(slot.startTime);
      const slotEnd = this.timeToMinutes(slot.endTime);

      // Remove original slot
      const index = availability.timeSlots.findIndex((s) => s === slot);
      availability.timeSlots.splice(index, 1);
      deletedCount++;

      // Create remaining pieces
      const remainingSlots: any = [];

      // Before deletion range
      if (slotStart < deleteStart) {
        remainingSlots.push({
          startTime: this.minutesToTime(slotStart),
          endTime: this.minutesToTime(deleteStart),
          status: slot.status,
          bookingId: slot.bookingId,
        });
      }

      // After deletion range
      if (slotEnd > deleteEnd) {
        remainingSlots.push({
          startTime: this.minutesToTime(deleteEnd),
          endTime: this.minutesToTime(slotEnd),
          status: slot.status,
          bookingId: slot.bookingId,
        });
      }

      if (remainingSlots.length) {
        availability.timeSlots.push(...remainingSlots);
        modifiedCount += remainingSlots.length;
      }
    });

    return { deleted: deletedCount, modified: modifiedCount };
  }

  /**
   * Builds result message
   */
  private buildDeletedMessage(deleted: number, modified: number): string {
    if (deleted && modified) return `Deleted ${deleted} slot(s), modified ${modified} slot(s)`;
    if (deleted) return `Deleted ${deleted} slot(s)`;
    if (modified) return `Modified ${modified} slot(s)`;
    return 'No changes made';
  }

  /**
   * Get availability for a specific influencer
   */
  async getInfluencerAvailability(
    influencerId: string,
    query: GetAvailabilityQueryDto,
  ): Promise<PaginatedAvailabilityResponseDto> {
    if (!isValidObjectId(influencerId)) {
      throw new BadRequestException('Invalid influencer ID');
    }

    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 10));

    // Build match query
    const matchQuery: any = {
      influencerId: new Types.ObjectId(influencerId),
      isActive: query.includeInactive ? { $in: [true, false] } : true,
    };

    query.startDate = query.startDate || new Date().toISOString();

    // Add date range filters
    if (query.startDate || query.endDate) {
      matchQuery.date = {};
      if (query.startDate) {
        matchQuery.date.$gte = new Date(query.startDate);
      }
      if (query.endDate) {
        matchQuery.date.$lte = new Date(query.endDate);
      }
    }

    const pipeline: any[] = [
      { $match: matchQuery },
      { $sort: { date: 1 } },
      {
        $facet: {
          metadata: [{ $count: 'totalDocs' }],
          data: [{ $skip: (page - 1) * limit }, { $limit: limit }],
        },
      },
    ];

    // Add status filter if specified
    if (query.status) {
      pipeline.splice(1, 0, {
        $match: {
          'timeSlots.status': query.status,
        },
      });
    }

    const result = await this.availabilityModel.aggregate(pipeline);
    let { metadata, data } = result[0];
    const totalDocs = metadata[0]?.totalDocs || 0;
    const totalPages = Math.ceil(totalDocs / limit);

    if (query.status) {
      data = data?.map((e: any) => ({ ...e, timeSlots: e?.timeSlots?.filter((s: any) => s.status === query.status) }));
    }

    return {
      docs: data,
      totalDocs,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }

  // ----------------------------------------------------------------------------------------------------------------------------------
  // ----------------------------------------------------------------------------------------------------------------------------------
  // ----------------------------------------------------------------------------------------------------------------------------------
  // ----------------------------------------------------------------------------------------------------------------------------------
  // ----------------------------------------------------------------------------------------------------------------------------------

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
    try {
      const availabilities = await this.availabilityModel
        .find({
          influencerId: new Types.ObjectId(influencerId),
          date: {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
          },
        })
        .sort({ date: 1 });

      let totalAvailableSlots = 0;
      let totalBookedSlots = 0;
      let totalUnavailableSlots = 0;

      const schedule = availabilities.map((availability) => {
        const timeSlots = availability.timeSlots;
        const availableSlots = timeSlots.filter((slot) => slot.status === TimeSlotStatus.AVAILABLE);
        const bookedSlots = timeSlots.filter((slot) => slot.status === TimeSlotStatus.BOOKED);
        const unavailableSlots = timeSlots.filter((slot) => slot.status === TimeSlotStatus.UNAVAILABLE);

        // Update totals
        totalAvailableSlots += availableSlots.length;
        totalBookedSlots += bookedSlots.length;
        totalUnavailableSlots += unavailableSlots.length;

        // Group consecutive available slots into ranges
        const availableTimeRanges = this.groupConsecutiveSlots(availableSlots);

        // Group booked slots with their booking IDs
        const bookedTimeRanges = bookedSlots.map((slot) => ({
          startTime: slot.startTime,
          endTime: slot.endTime,
          bookingId: slot.bookingId?.toString() || '',
        }));

        return {
          date: availability.date,
          timeSlots,
          totalAvailable: availableSlots.length,
          totalBooked: bookedSlots.length,
          totalUnavailable: unavailableSlots.length,
          availableTimeRanges,
          bookedTimeRanges,
        };
      });

      const totalDays = schedule.length;
      const summary = {
        totalDays,
        totalAvailableSlots,
        totalBookedSlots,
        totalUnavailableSlots,
        averageAvailabilityPerDay: totalDays > 0 ? totalAvailableSlots / totalDays : 0,
        bookingRate:
          totalAvailableSlots + totalBookedSlots > 0 ? (totalBookedSlots / (totalAvailableSlots + totalBookedSlots)) * 100 : 0,
      };

      return { schedule, summary };
    } catch (error) {
      throw new InternalServerErrorException('Error fetching schedule');
    }
  }

  private groupConsecutiveSlots(slots: TimeSlot[]): { startTime: string; endTime: string }[] {
    if (!slots.length) return [];

    const sortedSlots = [...slots].sort((a, b) => a.startTime.localeCompare(b.startTime));
    const ranges: { startTime: string; endTime: string }[] = [];
    let currentRange = { startTime: sortedSlots[0].startTime, endTime: sortedSlots[0].endTime };

    for (let i = 1; i < sortedSlots.length; i++) {
      const currentSlot = sortedSlots[i];
      const [currentEndHour, currentEndMin] = currentRange.endTime.split(':').map(Number);
      const [nextStartHour, nextStartMin] = currentSlot.startTime.split(':').map(Number);

      const currentEndMinutes = currentEndHour * 60 + currentEndMin;
      const nextStartMinutes = nextStartHour * 60 + nextStartMin;

      if (nextStartMinutes === currentEndMinutes) {
        // Slots are consecutive, extend the current range
        currentRange.endTime = currentSlot.endTime;
      } else {
        // Gap found, save current range and start a new one
        ranges.push({ ...currentRange });
        currentRange = { startTime: currentSlot.startTime, endTime: currentSlot.endTime };
      }
    }

    // Add the last range
    ranges.push(currentRange);
    return ranges;
  }
}
