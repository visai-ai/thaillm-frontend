import { z } from "zod";

import { GENDER_LIST } from "@/constant/common";
import { isPasswordValid } from "@/utils/validation";

export const registerSchema = z.object({
  email: z.string().nonempty("กรุณากรอกอีเมล").email("รูปแบบอีเมลไม่ถูกต้อง"),
  password: z
    .string()
    .nonempty("กรุณากรอกรหัสผ่าน")
    .refine((val) => isPasswordValid(val), {
      message: "รหัสผ่านไม่ตรงตามเงื่อนไข",
    }),
  acceptTermsCondition: z.literal<boolean>(true, {
    errorMap: () => ({
      message: "คุณต้องยอมรับข้อกำหนดการใช้งาน",
    }),
  }),
});
export type RegisterFormValues = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().nonempty("กรุณากรอกอีเมล").email("รูปแบบอีเมลไม่ถูกต้อง"),
  password: z.string().nonempty("กรุณากรอกรหัสผ่าน"),
  rememberMe: z.boolean().optional(),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

export const emailSchema = z.object({
  email: z.string().nonempty("กรุณากรอกอีเมล").email("รูปแบบอีเมลไม่ถูกต้อง"),
});
export type EmailFormValues = z.infer<typeof emailSchema>;

export const passwordSchema = z
  .object({
    password: z
      .string()
      .nonempty("กรุณากรอกรหัสผ่าน")
      .refine((val) => isPasswordValid(val), {
        message: "รหัสผ่านไม่ตรงตามเงื่อนไข",
      }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "รหัสผ่านไม่ตรงกัน โปรดลองอีกครั้ง",
    path: ["confirmPassword"],
  });
export type PasswordFormValues = z.infer<typeof passwordSchema>;

export const profileSettingsSchema = z.object({
  firstName: z.string().nonempty("กรุณากรอกชื่อจริง"),
  lastName: z.string().nonempty("กรุณากรอกนามสกุล"),
  phone: z.string().nonempty("กรุณากรอกเบอร์โทรศัพท์"),
  gender: z.enum(GENDER_LIST),
  dob: z.string().nonempty("กรุณาเลือกวันเกิด"),
});
export type ProfileSettingsFormValues = z.infer<typeof profileSettingsSchema>;
