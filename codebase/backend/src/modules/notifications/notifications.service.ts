import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument } from './schemas/notification.schema';
import { getTenantId, runWithTenant } from '../../common/tenant/tenant.context';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  async createNotification(
    recipientId: string,
    title: string,
    body: string,
    type: string,
    data: any = {},
    tenantId?: string,
  ): Promise<NotificationDocument> {
    const orgId = tenantId || getTenantId();
    if (!orgId) {
      throw new Error('Organization context is required to create a notification');
    }

    // Generate in-app database record
    let createdNotification: NotificationDocument | null = null;
    await new Promise<void>((resolve, reject) => {
      runWithTenant(orgId, async () => {
        try {
          createdNotification = await this.notificationModel.create({
            recipient: new Types.ObjectId(recipientId),
            title,
            body,
            type,
            data,
            organization: new Types.ObjectId(orgId),
          });
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });

    // Simulate multi-channel notifications via logs
    console.log(`[IN-APP NOTIFICATION] Sent to user ${recipientId} | Type: ${type} | Title: ${title}`);
    console.log(`[EMAIL NOTIFICATION] To: user_${recipientId}@provenpeak.com | Subject: ${title} | Body: ${body}`);
    console.log(`[WHATSAPP NOTIFICATION] To: +15550199 | Text: ${body}`);

    return createdNotification!;
  }

  async getUserNotifications(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const query = { recipient: new Types.ObjectId(userId) };

    const total = await this.notificationModel.countDocuments(query).exec();
    const data = await this.notificationModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.notificationModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), recipient: new Types.ObjectId(userId) },
      { isRead: true },
      { new: true },
    ).exec();

    if (!notification) {
      throw new NotFoundException('Notification not found or access denied');
    }
    return notification;
  }

  async markAllAsRead(userId: string) {
    return this.notificationModel.updateMany(
      { recipient: new Types.ObjectId(userId), isRead: false },
      { isRead: true },
    ).exec();
  }
}
