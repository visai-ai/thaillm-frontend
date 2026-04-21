import { z } from "zod";

export const APPOINTMENT_REMINDER_UNIT = ["วัน", "ชั่วโมง", "นาที"] as const;
export const appointmentDetailSchema = z.object({
  hospitalName: z.string().nonempty("กรุณาเลือกโรงพยาบาล"),
  hospitalEmail: z.string().optional(),
  department: z.string().nonempty("กรุณาเลือกแผนก"),
  appointmentDate: z.date().refine(
    (date) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date >= today;
    },
    { message: "ไม่สามารถเลือกวันที่ผ่านมาแล้วได้" },
  ),
  appointmentTime: z.object({
    hour: z.string().nonempty("กรุณาระบุเวลา"),
    minute: z.string().nonempty("กรุณาระบุเวลา"),
  }),
  alternativeDates: z
    .array(
      z.object({
        date: z.date(),
        time: z.object({
          hour: z.string().nonempty("กรุณาระบุเวลา"),
          minute: z.string().nonempty("กรุณาระบุเวลา"),
        }),
      }),
    )
    .optional(),
  selectedChatId: z.string().optional(),
  reason: z.string().optional(),
  reasonDetail: z.string().optional(),
  note: z.string().optional(),
  // Contact info for email to hospital (step 2, prefilled from user)
  contactFirstName: z.string().optional(),
  contactLastName: z.string().optional(),
  contactAge: z.string().optional(),
  contactEmail: z.string().optional(),
  contactPhone: z.string().optional(),
});

/** Step 1: validate only appointment logistics (hospital, dept, date/time) */
export const appointmentDetailsOnlySchema = appointmentDetailSchema.omit({
  reason: true,
  reasonDetail: true,
  note: true,
  contactFirstName: true,
  contactLastName: true,
  contactAge: true,
  contactEmail: true,
  contactPhone: true,
});

/** Step 2: validate symptoms/reason fields */
export const appointmentSymptomsSchema = appointmentDetailSchema
  .extend({
    reason: z.string().nonempty("กรุณาระบุอาการที่พบในปัจจุบัน"),
  })
  .omit({
    contactFirstName: true,
    contactLastName: true,
    contactAge: true,
    contactEmail: true,
    contactPhone: true,
  });

/** Step 3: contact fields + reason required for email to hospital */
export const appointmentConfirmSchema = appointmentDetailSchema.extend({
  reason: z.string().nonempty("กรุณาระบุอาการที่พบในปัจจุบัน"),
  contactFirstName: z.string().nonempty("กรุณากรอกชื่อ"),
  contactLastName: z.string().nonempty("กรุณากรอกนามสกุล"),
  contactAge: z.string().nonempty("กรุณากรอกอายุ"),
  contactEmail: z
    .string()
    .nonempty("กรุณากรอกอีเมล")
    .email("รูปแบบอีเมลไม่ถูกต้อง"),
  contactPhone: z.string().nonempty("กรุณากรอกเบอร์โทรติดต่อกลับ"),
});

export type AppointmentDetailSchemaValues = z.infer<
  typeof appointmentDetailSchema
>;
