import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NotificationDocument = Notification & Document;

/**
 * Notification type enum
 */
export enum NotificationType {
    EMAIL = 'email',
    PUSH = 'push',
    SMS = 'sms',
    IN_APP = 'in_app',
}

/**
 * Notification priority enum
 */
export enum NotificationPriority {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    URGENT = 'urgent',
}

@Schema({ timestamps: true })
export class Notification {
    @Prop({ required: true })
    userId: string;

    @Prop({
        required: true,
        enum: Object.values(NotificationType),
        default: NotificationType.IN_APP,
    })
    type: NotificationType;

    @Prop({ required: true })
    title: string;

    @Prop({ required: true })
    message: string;

    @Prop({ type: Object })
    data?: any;

    @Prop({
        enum: Object.values(NotificationPriority),
        default: NotificationPriority.MEDIUM,
    })
    priority: NotificationPriority;

    @Prop({ default: false })
    read: boolean;

    @Prop()
    expiresAt?: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Add indexes for better query performance
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, read: 1 });
NotificationSchema.index({ userId: 1, type: 1 });
NotificationSchema.index({ userId: 1, priority: 1 });
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); 