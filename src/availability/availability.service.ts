import { BadRequestException, Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Availability, AvailabilityDocument, TimeSlot, TimeSlotStatus } from './schemas/availability.schema';
import { CreateAvailabilityDto, TimeSlotDto } from './dto/create-availability.dto';
import { UpdateAvailabilityDto, UpdateTimeSlotDto } from './dto/update-availability.dto';

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

    return hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60 && minutes % 30 === 0;
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

  // ----------------------------------------------------------------------------------------------------------------------------------
  // ----------------------------------------------------------------------------------------------------------------------------------

  /**
   * Updates all time slots for a specific day
   */
  async updateDayTimeSlots(
    influencerId: string,
    date: Date,
    timeSlots: (TimeSlot | any)[],
    replaceAll: boolean = false,
  ): Promise<Availability> {
    try {
      // Validate input parameters
      if (!influencerId || !date) {
        throw new BadRequestException('Influencer ID and date are required');
      }

      if (!timeSlots || timeSlots.length === 0) {
        throw new BadRequestException('At least one time slot is required');
      }

      // Validate all new time slots
      this.validateTimeSlots(timeSlots);

      // Check for overlaps within new slots
      this.validateNoOverlappingSlots(timeSlots);

      // Find existing availability for the date
      const targetDate = new Date(date);
      const existingAvailability = await this.availabilityModel.findOne({
        influencerId: new Types.ObjectId(influencerId),
        date: targetDate,
      });

      if (!existingAvailability) {
        throw new NotFoundException(`No availability found for date ${targetDate.toISOString().split('T')[0]}`);
      }

      if (replaceAll) {
        // Replace all time slots for the day
        existingAvailability.timeSlots = this.sortTimeSlots(
          timeSlots.map((slot) => ({
            startTime: slot.startTime,
            endTime: slot.endTime,
            status: slot.status || TimeSlotStatus.AVAILABLE,
            bookingId: slot.bookingId ? new Types.ObjectId(slot.bookingId) : undefined,
          })),
        );
      } else {
        // Merge with existing slots (validate no overlaps with existing)
        this.validateNoOverlapWithExisting(timeSlots, existingAvailability.timeSlots);
        existingAvailability.timeSlots = this.mergeAndSortTimeSlots(existingAvailability.timeSlots, timeSlots);
      }

      return await existingAvailability.save();
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }

      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map((err: any) => err.message);
        throw new BadRequestException(`Validation failed: ${validationErrors.join(', ')}`);
      }

      throw new InternalServerErrorException('Failed to update day time slots');
    }
  }

  /**
   * Updates individual time slots within a specific day
   */
  async updateIndividualTimeSlots(
    influencerId: string,
    date: Date,
    updates: {
      originalSlot: { startTime: string; endTime: string };
      updatedSlot: {
        startTime?: string;
        endTime?: string;
        status?: TimeSlotStatus;
        bookingId?: string;
      };
    }[],
  ): Promise<Availability> {
    try {
      // Validate input parameters
      if (!influencerId || !date) {
        throw new BadRequestException('Influencer ID and date are required');
      }

      if (!updates || updates.length === 0) {
        throw new BadRequestException('At least one update is required');
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

      // Process each update
      for (const update of updates) {
        const { originalSlot, updatedSlot } = update;

        // Find the slot to update
        const slotIndex = existingAvailability.timeSlots.findIndex(
          (slot) => slot.startTime === originalSlot.startTime && slot.endTime === originalSlot.endTime,
        );

        if (slotIndex === -1) {
          throw new BadRequestException(`Time slot ${originalSlot.startTime}-${originalSlot.endTime} not found`);
        }

        const currentSlot = existingAvailability.timeSlots[slotIndex];

        // Check if slot is booked and trying to change times
        if (currentSlot.status === TimeSlotStatus.BOOKED && (updatedSlot.startTime || updatedSlot.endTime)) {
          throw new BadRequestException(`Cannot modify time for booked slot ${originalSlot.startTime}-${originalSlot.endTime}`);
        }

        // Create updated slot with current values as defaults
        const newSlot = {
          startTime: updatedSlot.startTime || currentSlot.startTime,
          endTime: updatedSlot.endTime || currentSlot.endTime,
          status: updatedSlot.status !== undefined ? updatedSlot.status : currentSlot.status,
          bookingId:
            updatedSlot.bookingId !== undefined
              ? updatedSlot.bookingId
                ? new Types.ObjectId(updatedSlot.bookingId)
                : undefined
              : currentSlot.bookingId,
        };

        // Validate new slot if time has changed
        if (updatedSlot.startTime || updatedSlot.endTime) {
          this.validateTimeSlots([newSlot]);

          // Check for overlaps with other slots (excluding the current slot being updated)
          const otherSlots = existingAvailability.timeSlots.filter((_, index) => index !== slotIndex);
          this.validateNoOverlapWithExisting([newSlot], otherSlots);
        }

        // Update the slot
        existingAvailability.timeSlots[slotIndex] = newSlot;
      }

      // Sort slots after all updates
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

      throw new InternalServerErrorException('Failed to update individual time slots');
    }
  }

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

  private mergeTimeSlots(existingSlots: TimeSlot[], newSlots: (TimeSlot | UpdateTimeSlotDto)[]): TimeSlot[] {
    // Create a map of existing slots for easy lookup
    const slotMap = new Map<string, TimeSlot>();
    existingSlots.forEach((slot) => {
      slotMap.set(slot.startTime, slot);
    });

    // Update or add new slots
    newSlots.forEach((slot) => {
      slotMap.set(slot.startTime, {
        ...slot,
        bookingId: slot.bookingId ? new Types.ObjectId(slot.bookingId) : undefined,
      });
    });

    // Convert map back to array and sort by start time
    return Array.from(slotMap.values()).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  async createAvailability(createAvailabilityDto: CreateAvailabilityDto, influencerId: string): Promise<Availability> {
    try {
      const { date, timeSlots } = createAvailabilityDto;

      // Check if availability already exists for this date
      const existingAvailability = await this.availabilityModel.findOne({
        influencerId: new Types.ObjectId(influencerId),
        date: new Date(date),
      });

      if (existingAvailability) {
        // If availability exists, merge the new slots with existing ones
        const mergedSlots = this.mergeTimeSlots(existingAvailability.timeSlots, timeSlots);
        existingAvailability.timeSlots = mergedSlots;
        return existingAvailability.save();
      }

      // Validate time slots if provided
      if (timeSlots) {
        for (const slot of timeSlots) {
          if (!this.validateTimeSlot(slot.startTime, slot.endTime)) {
            throw new BadRequestException(
              `Invalid time slot: ${slot.startTime} - ${slot.endTime}. Slots must be exactly 30 minutes long.`,
            );
          }
        }
      }

      // Create new availability with provided time slots
      const availability = new this.availabilityModel({
        influencerId: new Types.ObjectId(influencerId),
        date: new Date(date),
        timeSlots: timeSlots || [],
      });

      return await availability.save();
    } catch (error) {
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map((err: any) => err.message);
        throw new BadRequestException(validationErrors.join(', '));
      }
      if (error.name === 'CastError') {
        throw new BadRequestException(`Invalid ${error.path}: ${error.value}`);
      }
      throw new InternalServerErrorException('An error occurred while creating availability');
    }
  }

  async updateAvailability(
    id: string,
    updateAvailabilityDto: UpdateAvailabilityDto,
    influencerId: string,
  ): Promise<Availability> {
    try {
      const availability = await this.availabilityModel.findOne({
        _id: new Types.ObjectId(id),
        influencerId: new Types.ObjectId(influencerId),
      });

      if (!availability) {
        throw new NotFoundException('Availability not found');
      }

      if (updateAvailabilityDto.timeSlots) {
        // Validate all time slots before updating
        for (const slot of updateAvailabilityDto.timeSlots) {
          if (!this.validateTimeSlot(slot.startTime, slot.endTime)) {
            throw new BadRequestException(
              `Invalid time slot: ${slot.startTime} - ${slot.endTime}. Slots must be exactly 30 minutes long.`,
            );
          }
        }

        // Merge the updated slots with existing ones
        availability.timeSlots = this.mergeTimeSlots(availability.timeSlots, updateAvailabilityDto.timeSlots);
      }

      if (updateAvailabilityDto.isActive !== undefined) {
        availability.isActive = updateAvailabilityDto.isActive;
      }

      return await availability.save();
    } catch (error) {
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map((err: any) => err.message);
        throw new BadRequestException(validationErrors.join(', '));
      }
      if (error.name === 'CastError') {
        throw new BadRequestException(`Invalid ${error.path}: ${error.value}`);
      }
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('An error occurred while updating availability');
    }
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
