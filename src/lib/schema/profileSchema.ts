import { z } from "zod";

export const profileSchema = z.object({
  firstname: z
    .string()
    .nonempty("กรุณากรอกชื่อ")
    .max(50, "ชื่อไม่ควรเกิน 50 ตัวอักษร"),
  lastname: z
    .string()
    .nonempty("กรุณากรอกนามสกุล")
    .max(50, "นามสกุลไม่ควรเกิน 50 ตัวอักษร"),
  email: z.string().nonempty("กรุณากรอกอีเมล").email("รูปแบบอีเมลไม่ถูกต้อง"),
  cookieRequire: z.boolean(),
  cookieAnalytic: z.boolean(),
  cookieMarketing: z.boolean(),
});
export type ProfileSchema = z.infer<typeof profileSchema>;
