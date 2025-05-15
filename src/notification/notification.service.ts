import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, NotificationPriority, NotificationType } from './schemas/notification.schema';
import { EmailService } from '../common/services/email.service';



/**
 * Notification options interface
 */
interface NotificationOptions {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  priority?: NotificationPriority;
  read?: boolean;
  expiresAt?: Date;
}

/**
 * Global notification service
 * This service provides centralized notification functionality
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    @InjectModel(Notification.name) private readonly notificationModel: Model<Notification>,
  ) { }

  /**
   * Create a notification
   * @param options - The notification options
   * @returns The created notification
   */
  async createNotification(
    options: NotificationOptions,
  ): Promise<Notification> {
    try {
      const notification = new this.notificationModel({
        userId: options.userId,
        type: options.type,
        title: options.title,
        message: options.message,
        data: options.data,
        priority: options.priority || NotificationPriority.MEDIUM,
        read: options.read || false,
        expiresAt: options.expiresAt,
      });

      await notification.save();

      // Send the notification based on its type
      await this.sendNotification(notification);

      return notification;
    } catch (error) {
      this.logger.error(
        `Failed to create notification: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Send a notification
   * @param notification - The notification to send
   */
  private async sendNotification(notification: Notification): Promise<void> {
    try {
      switch (notification.type) {
        case NotificationType.EMAIL:
          await this.emailService.sendNotificationEmail(
            notification.userId,
            notification.title,
            notification.message,
          );
          break;
        case NotificationType.PUSH:
          // TODO: Implement push notification
          break;
        case NotificationType.SMS:
          // TODO: Implement SMS notification
          break;
        case NotificationType.IN_APP:
          // In-app notifications are stored in the database
          break;
        default:
          this.logger.warn(`Unknown notification type: ${notification.type}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to send notification: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get notifications for a user
   * @param userId - The user ID
   * @param options - The query options
   * @returns The notifications
   */
  async getUserNotifications(
    userId: string,
    options: {
      type?: NotificationType;
      priority?: NotificationPriority;
      read?: boolean;
      limit?: number;
      skip?: number;
    } = {},
  ): Promise<Notification[]> {
    try {
      const query: any = { userId };

      if (options.type) {
        query.type = options.type;
      }

      if (options.priority) {
        query.priority = options.priority;
      }

      if (typeof options.read === 'boolean') {
        query.read = options.read;
      }

      return this.notificationModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(options.skip || 0)
        .limit(options.limit || 10)
        .exec();
    } catch (error) {
      this.logger.error(
        `Failed to get user notifications: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Mark a notification as read
   * @param notificationId - The notification ID
   * @param userId - The user ID
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      await this.notificationModel
        .updateOne(
          { _id: notificationId, userId },
          { $set: { read: true } },
        )
        .exec();
    } catch (error) {
      this.logger.error(
        `Failed to mark notification as read: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   * @param userId - The user ID
   */
  async markAllAsRead(userId: string): Promise<void> {
    try {
      await this.notificationModel
        .updateMany(
          { userId, read: false },
          { $set: { read: true } },
        )
        .exec();
    } catch (error) {
      this.logger.error(
        `Failed to mark all notifications as read: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Delete a notification
   * @param notificationId - The notification ID
   * @param userId - The user ID
   */
  async deleteNotification(
    notificationId: string,
    userId: string,
  ): Promise<void> {
    try {
      await this.notificationModel
        .deleteOne({ _id: notificationId, userId })
        .exec();
    } catch (error) {
      this.logger.error(
        `Failed to delete notification: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Delete all notifications
   * @param userId - The user ID
   */
  async deleteAllNotifications(userId: string): Promise<void> {
    try {
      await this.notificationModel.deleteMany({ userId }).exec();
    } catch (error) {
      this.logger.error(
        `Failed to delete all notifications: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get unread notification count
   * @param userId - The user ID
   * @returns The unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      return this.notificationModel
        .countDocuments({ userId, read: false })
        .exec();
    } catch (error) {
      this.logger.error(
        `Failed to get unread notification count: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get notification count by type
   * @param userId - The user ID
   * @returns The notification count by type
   */
  async getCountByType(userId: string): Promise<{ [key: string]: number }> {
    try {
      const result = await this.notificationModel
        .aggregate([
          { $match: { userId } },
          {
            $group: {
              _id: '$type',
              count: { $sum: 1 },
            },
          },
        ])
        .exec();

      return result.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {});
    } catch (error) {
      this.logger.error(
        `Failed to get notification count by type: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get notification count by priority
   * @param userId - The user ID
   * @returns The notification count by priority
   */
  async getCountByPriority(userId: string): Promise<{ [key: string]: number }> {
    try {
      const result = await this.notificationModel
        .aggregate([
          { $match: { userId } },
          {
            $group: {
              _id: '$priority',
              count: { $sum: 1 },
            },
          },
        ])
        .exec();

      return result.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {});
    } catch (error) {
      this.logger.error(
        `Failed to get notification count by priority: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get notification count by read status
   * @param userId - The user ID
   * @returns The notification count by read status
   */
  async getCountByReadStatus(userId: string): Promise<{ [key: string]: number }> {
    try {
      const result = await this.notificationModel
        .aggregate([
          { $match: { userId } },
          {
            $group: {
              _id: '$read',
              count: { $sum: 1 },
            },
          },
        ])
        .exec();

      return result.reduce((acc, curr) => {
        acc[curr._id ? 'read' : 'unread'] = curr.count;
        return acc;
      }, {});
    } catch (error) {
      this.logger.error(
        `Failed to get notification count by read status: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
} 