import { z } from "zod";

export const notificationSettingsSchema = z.object({
  enablePushNotifications: z.boolean(),
  enableEmailNotifications: z.boolean(),
});

export type NotificationSettingsSchema = z.infer<
  typeof notificationSettingsSchema
>;
