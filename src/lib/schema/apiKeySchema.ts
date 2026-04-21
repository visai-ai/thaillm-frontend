import { z } from "zod";

export const RATE_LIMIT_UNITS = ["ต่อวัน", "ต่อเดือน"] as const;
export type RateLimitType = (typeof RATE_LIMIT_UNITS)[number];
export const apiKeySchema = z
  .object({
    name: z.string().nonempty("กรุณากรอกชื่อ API Key"),
    isActive: z.boolean(),
    isRateLimitEnabled: z.boolean(),
    rateLimitUnit: z.enum(RATE_LIMIT_UNITS).optional(),
    rateLimit: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.isRateLimitEnabled === true) {
        const rateLimit = Number(data.rateLimit?.trim()?.replaceAll(",", ""));
        return (
          data.rateLimit &&
          data.rateLimitUnit &&
          !isNaN(rateLimit) &&
          rateLimit >= 0
        );
      }
      return true;
    },
    {
      message: "กรุณาระบุเป็นตัวเลข",
      path: ["rateLimit"],
    },
  );

export type APIKeySchemaValues = z.infer<typeof apiKeySchema>;
