import { BadRequestException, Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Availability, AvailabilityDocument, TimeSlot, TimeSlotStatus } from './schemas/availability.schema';
import { CreateAvailabilityDto, TimeSlotDto } from './dto/create-availability.dto';

@Injectable()
export class AvailabilityService {
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

  // ----------------------------------------------------------------------------------------------------------------------------------
  // ----------------------------------------------------------------------------------------------------------------------------------

  /**
   * Deletes specific time slots from a day
   */
  async deleteTimeSlots(
    influencerId: string,
    date: Date,
    slotsToDelete: { startTime: string; endTime: string }[],
  ): Promise<Availability> {
    try {
      // Validate input parameters
      if (!influencerId || !date) {
        throw new BadRequestException('Influencer ID and date are required');
      }

      if (!slotsToDelete || slotsToDelete.length === 0) {
        throw new BadRequestException('At least one slot to delete is required');
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

      // Check if any slots to delete are booked
      for (const slotToDelete of slotsToDelete) {
        const slot = existingAvailability.timeSlots.find(
          (s) => s.startTime === slotToDelete.startTime && s.endTime === slotToDelete.endTime,
        );

        if (!slot) {
          throw new BadRequestException(`Time slot ${slotToDelete.startTime}-${slotToDelete.endTime} not found`);
        }

        if (slot.status === TimeSlotStatus.BOOKED) {
          throw new BadRequestException(`Cannot delete booked slot ${slotToDelete.startTime}-${slotToDelete.endTime}`);
        }
      }

      // Remove the specified slots
      existingAvailability.timeSlots = existingAvailability.timeSlots.filter((slot) => {
        return !slotsToDelete.some((toDelete) => slot.startTime === toDelete.startTime && slot.endTime === toDelete.endTime);
      });

      return await existingAvailability.save();
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to delete time slots');
    }
  }

  //TODO:

  // ----------------------------------------------------------------------------------------------------------------------------------
  // ----------------------------------------------------------------------------------------------------------------------------------
  // ----------------------------------------------------------------------------------------------------------------------------------
  // ----------------------------------------------------------------------------------------------------------------------------------
  // ----------------------------------------------------------------------------------------------------------------------------------

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

  async getAvailabilityByDate(date: Date, influencerId: string): Promise<Availability> {
    const availability = await this.availabilityModel.findOne({
      influencerId: new Types.ObjectId(influencerId),
      date: new Date(date),
    });

    if (!availability) {
      throw new NotFoundException('Availability not found for this date');
    }

    return availability;
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

  async bookTimeSlot(
    availabilityId: string,
    startTime: string,
    endTime: string,
    bookingId: string,
    influencerId: string,
  ): Promise<Availability> {
    try {
      const availability = await this.availabilityModel.findOne({
        _id: new Types.ObjectId(availabilityId),
        influencerId: new Types.ObjectId(influencerId),
      });

      if (!availability) {
        throw new NotFoundException('Availability not found');
      }

      const slotIndex = availability.timeSlots.findIndex((slot) => slot.startTime === startTime && slot.endTime === endTime);

      if (slotIndex === -1) {
        throw new BadRequestException('Time slot not found');
      }

      if (availability.timeSlots[slotIndex].status !== TimeSlotStatus.AVAILABLE) {
        throw new BadRequestException('Time slot is not available');
      }

      availability.timeSlots[slotIndex].status = TimeSlotStatus.BOOKED;
      availability.timeSlots[slotIndex].bookingId = new Types.ObjectId(bookingId);

      return await availability.save();
    } catch (error) {
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map((err: any) => err.message);
        throw new BadRequestException(validationErrors.join(', '));
      }
      if (error.name === 'CastError') {
        throw new BadRequestException(`Invalid ${error.path}: ${error.value}`);
      }
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('An error occurred while booking time slot');
    }
  }

  async approveBooking(availabilityId: string, startTime: string, endTime: string, influencerId: string): Promise<Availability> {
    const availability = await this.availabilityModel.findOne({
      _id: new Types.ObjectId(availabilityId),
      influencerId: new Types.ObjectId(influencerId),
    });

    if (!availability) {
      throw new NotFoundException('Availability not found');
    }

    const slotIndex = availability.timeSlots.findIndex((slot) => slot.startTime === startTime && slot.endTime === endTime);

    if (slotIndex === -1) {
      throw new BadRequestException('Time slot not found');
    }

    if (availability.timeSlots[slotIndex].status !== TimeSlotStatus.BOOKED) {
      throw new BadRequestException('Time slot is not booked');
    }

    // Keep the slot as booked but mark it as approved
    availability.timeSlots[slotIndex].status = TimeSlotStatus.BOOKED;

    return availability.save();
  }

  async deleteAvailability(id: string, influencerId: string): Promise<void> {
    const result = await this.availabilityModel.deleteOne({
      _id: new Types.ObjectId(id),
      influencerId: new Types.ObjectId(influencerId),
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException('Availability not found');
    }
  }

  // Get all availability slots for an influencer
  async getInfluencerAvailability(influencerId: string, query?: { startDate?: Date; endDate?: Date; status?: string }) {
    const match: any = {
      influencerId: new Types.ObjectId(influencerId),
      isDeleted: false,
    };

    if (query?.startDate && query?.endDate) {
      match.startTime = { $gte: new Date(query.startDate) };
      match.endTime = { $lte: new Date(query.endDate) };
    }

    if (query?.status) {
      match.status = query.status;
    }

    return await this.availabilityModel.find(match).sort({ startTime: 1 });
  }

  // // Check if a time slot is available for booking
  // async checkAvailabilityForBooking(
  //   influencerId: string,
  //   startTime: Date,
  //   endTime: Date,
  //   collaborationId?: string,
  // ): Promise<boolean> {
  //   // If it's a collaboration, check all influencers' availability
  //   if (collaborationId) {
  //     const collaboration = await this.collaborationService.getCollaborationById(collaborationId);
  //     if (!collaboration) {
  //       throw new NotFoundException('Collaboration not found');
  //     }

  //     if (!collaboration?.users) return false;

  //     // Check availability for all influencers in the collaboration
  //     for (const userId of collaboration.users) {
  //       const hasConflict = await this.checkTimeConflict(userId.toString(), startTime, endTime);
  //       if (hasConflict) {
  //         return false;
  //       }
  //     }

  //     return true;
  //   }

  //   // For single influencer, check their availability
  //   return !(await this.checkTimeConflict(influencerId, startTime, endTime));
  // }

  // Helper method to check for time conflicts
  private async checkTimeConflict(influencerId: string, startTime: Date, endTime: Date, excludeId?: string): Promise<boolean> {
    const query: any = {
      influencerId: new Types.ObjectId(influencerId),
      isDeleted: false,
      $or: [
        // Check if new slot overlaps with existing slots
        {
          startTime: { $lt: new Date(endTime) },
          endTime: { $gt: new Date(startTime) },
        },
      ],
    };

    if (excludeId) {
      query._id = { $ne: new Types.ObjectId(excludeId) };
    }

    const conflict = await this.availabilityModel.findOne(query);
    return !!conflict;
  }

  async checkInfluencerAvailability(
    influencerId: string,
    date: Date,
    startTime: string,
    endTime: string,
  ): Promise<{ isAvailable: boolean; availableSlots: TimeSlot[] }> {
    try {
      // Validate time format
      if (!this.validateTimeFormat(startTime) || !this.validateTimeFormat(endTime)) {
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

  async getInfluencerNextAvailableSlot(influencerId: string, fromDate: Date): Promise<{ date: Date; timeSlot: TimeSlot } | null> {
    try {
      const availability = await this.availabilityModel
        .findOne({
          influencerId: new Types.ObjectId(influencerId),
          date: { $gte: new Date(fromDate) },
          'timeSlots.status': TimeSlotStatus.AVAILABLE,
        })
        .sort({ date: 1 });

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
