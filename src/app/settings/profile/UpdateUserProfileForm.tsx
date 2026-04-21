"use client";

import { Input } from "@/components/common/CustomInput";
import Content from "@/components/sections/settings/Content";
import { Button } from "@/components/ui/button";
import { MailIcon } from "lucide-react";
import {
  Control,
  FieldErrors,
  UseFormRegister,
  UseFormHandleSubmit,
} from "react-hook-form";
import { ProfileSchema } from "@/lib/schema/profileSchema";

import { useEffect, useState } from "react";
import { Modal } from "@/components/common/CustomModal";
import * as z from "zod";
import api from "@/lib/api";
import { useFormContext, useForm } from "react-hook-form";
import { useAuthStore } from "@/stores/useAuthStore";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const updateUserProfileSchema = z.object({
  firstname: z
    .string()
    .min(1, "กรุณากรอกชื่อ")
    .max(50, "ชื่อไม่ควรเกิน 50 ตัวอักษร"),
  lastname: z
    .string()
    .min(1, "กรุณากรอกนามสกุล")
    .max(50, "นามสกุลไม่ควรเกิน 50 ตัวอักษร"),
  email: z
    .string()
    .email("กรุณากรอกอีเมลที่ถูกต้อง")
    .nonempty("อีเมลไม่ควรเว้นว่าง"),
});

export type UpdateUserProfileSchema = z.infer<typeof updateUserProfileSchema>;

interface UpdateUserProfileFormProps {
  register: UseFormRegister<ProfileSchema>;
  errors: FieldErrors<ProfileSchema>;
  control: Control<ProfileSchema>;
  handleSubmit: UseFormHandleSubmit<ProfileSchema>;
  onSubmit: (data: ProfileSchema) => void;
  handleCancel: () => void;
  isSubmitting: boolean;
  isSaving: boolean;
  isFormSubmitting: boolean;
  isDirty: boolean;
}

export function UpdateUserProfileForm({
  register,
  errors,
  control,
  handleSubmit,
  onSubmit,
  handleCancel,
  isSubmitting,
  isSaving,
  isFormSubmitting,
  isDirty,
}: UpdateUserProfileFormProps) {
  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="grid grid-cols-[1fr] lg:grid-cols-[minmax(170px,280px)_minmax(400px,1280px)] gap-8 mx-auto w-full"
    >
      <Content title="ข้อมูลส่วนตัว" description="อัปเดตข้อมูลส่วนตัว">
        <div className="grid-cols-2 gap-3 md:gap-6 grid max-w-[720px]">
          <Input
            label={"ชื่อ"}
            type="text"
            placeholder="กรอกชื่อ"
            variant={errors.firstname ? "error" : "default"}
            hint={errors.firstname?.message}
            {...register("firstname")}
          />
          <Input
            label={"นามสกุล"}
            type="text"
            placeholder="กรอกนามสกุล"
            variant={errors.lastname ? "error" : "default"}
            hint={errors.lastname?.message}
            {...register("lastname")}
          />
          <Input
            prefixElement={
              <div className="flex items-center justify-center pl-3">
                <MailIcon className="w-5 text-gray-500" />
              </div>
            }
            label={"อีเมล"}
            type="email"
            placeholder="กรอกอีเมล"
            containerClassName="col-span-2"
            disabled={true}
            variant={errors.email ? "error" : "default"}
            hint={errors.email?.message}
            {...register("email")}
          />
        </div>
      </Content>
      <div className="col-span-2">
        <hr className="" />
        <div className="flex gap-2 justify-end py-4">
          <Button
            type="button"
            variant="outline"
            className="w-fit text-sm"
            onClick={handleCancel}
          >
            ยกเลิก
          </Button>
          <Button
            type="submit"
            variant="default"
            className="w-fit text-sm"
            disabled={isSubmitting || isSaving || isFormSubmitting || !isDirty}
          >
            {isSubmitting || isSaving || isFormSubmitting
              ? "กำลังบันทึก..."
              : "บันทึกการเปลี่ยนแปลง"}
          </Button>
        </div>
      </div>
    </form>
  );
}

export function UpdateUserProfileModal({
  isOpen,
  onClose,
  onProfileSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onProfileSuccess?: () => void;
}) {
  const user = useAuthStore((state) => state.user);
  const { setUser } = useAuthStore();
  const {
    register,
    getValues,
    setValue,
    formState: { errors },
  } = useFormContext<UpdateUserProfileSchema>();
  const [isLoading, setIsLoading] = useState(false);
  const { addNotification } = useNotificationStore();

  useEffect(() => {
    if (user) {
      setValue("firstname", user.firstName || "");
      setValue("lastname", user.lastName || "");
      setValue("email", user.email || "");
    }
  }, [user?.firstName, user?.lastName, user?.email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const formData = {
        firstName: getValues("firstname"),
        lastName: getValues("lastname"),
        dob: null, // Add logic to handle DOB if required
        gender: null, // Add logic to handle gender if required
        phone: null, // Add logic to handle phone if required
      };

      const response = await api.user.updateUser({
        id: user?.id || "", // Ensure user ID is always a string
        requestBody: formData,
      });

      setUser({
        ...user!,
        firstName: getValues("firstname"),
        lastName: getValues("lastname"),
      });

      if (response.ok) {
        if (onProfileSuccess && hasMedicalSirirajInPath()) {
          onProfileSuccess();
        } else {
          addNotification({
            state: "success",
            title: "บันทึกข้อมูล",
            description: "บันทึกข้อมูลสำเร็จ",
          });
        }
        onClose();
      } else {
        addNotification({
          state: "error",
          title: "บันทึกข้อมูล",
          description: "เกิดข้อผิดพลาดในการบันทึกข้อมูล",
        });
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      addNotification({
        state: "error",
        title: "บันทึกข้อมูล",
        description: "เกิดข้อผิดพลาดในการบันทึกข้อมูล",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      showCloseButton={false}
      title="กรุณากรอกข้อมูลส่วนตัว"
      body={
        <form onSubmit={handleSubmit}>
          <div className="grid-cols-2 gap-3 md:gap-6 grid max-w-[720px]">
            <Input
              label={"ชื่อ"}
              type="text"
              placeholder="กรอกชื่อ"
              variant={errors.firstname ? "error" : "default"}
              hint={errors.firstname?.message}
              {...register("firstname")}
            />
            <Input
              label={"นามสกุล"}
              type="text"
              placeholder="กรอกนามสกุล"
              variant={errors.lastname ? "error" : "default"}
              hint={errors.lastname?.message}
              {...register("lastname")}
            />
            <Input
              prefixElement={
                <div className="flex items-center justify-center pl-3">
                  <MailIcon className="w-5 text-gray-500" />
                </div>
              }
              label={"อีเมล"}
              type="email"
              placeholder="กรอกอีเมล"
              containerClassName="col-span-2"
              disabled={true}
              variant={errors.email ? "error" : "default"}
              hint={errors.email?.message}
              {...register("email")}
            />
          </div>
          <div className="flex justify-end mt-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? "กำลังบันทึก..."
                : hasMedicalSirirajInPath()
                  ? "ถัดไป"
                  : "บันทึกการเปลี่ยนแปลง"}
            </Button>
          </div>
        </form>
      }
    />
  );
}

/** Check if the base URL path contains "medical-siriraj" (e.g. base is /dev-medical-siriraj) */
export function hasMedicalSirirajInPath(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.pathname.toLowerCase().includes("medical-siriraj");
}

const sirirajPersonalInfoSchema = z.object({
  age: z.coerce
    .number()
    .refine(
      (n) => !Number.isNaN(n) && Number.isInteger(n) && n >= 1 && n <= 150,
      "กรุณากรอกอายุที่ถูกต้อง",
    ),
  addressLine: z.string().trim().min(1, "กรุณากรอกบ้านเลขที่"),
  street: z.string().trim().min(1, "กรุณากรอกถนน"),
  subdistrict: z.string().trim().min(1, "กรุณากรอกแขวง"),
  district: z.string().trim().min(1, "กรุณากรอกเขต"),
  province: z.string().trim().min(1, "กรุณากรอกจังหวัด"),
  postalCode: z.string().trim().min(1, "กรุณากรอกรหัสไปรษณีย์"),
  phone: z.string().trim().min(1, "กรุณากรอกเบอร์โทรศัพท์"),
});

export type SirirajPersonalInfoSchema = z.infer<
  typeof sirirajPersonalInfoSchema
>;

export function SirirajPersonalInfoModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const user = useAuthStore((state) => state.user);
  const { setUser } = useAuthStore();
  const { addNotification } = useNotificationStore();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SirirajPersonalInfoSchema>({
    resolver: zodResolver(sirirajPersonalInfoSchema),
    mode: "onSubmit",
    defaultValues: {
      age: undefined as unknown as number,
      addressLine: "",
      street: "",
      subdistrict: "",
      district: "",
      province: "",
      postalCode: "",
      phone: "",
    },
  });

  useEffect(() => {
    if (!isOpen) return;
    const personalInfo = user?.personalInfo;
    reset({
      age:
        typeof personalInfo?.age === "number"
          ? personalInfo.age
          : (undefined as unknown as number),
      addressLine: personalInfo?.addressLine ?? "",
      street: personalInfo?.street ?? "",
      subdistrict: personalInfo?.subdistrict ?? "",
      district: personalInfo?.district ?? "",
      province: personalInfo?.province ?? "",
      postalCode: personalInfo?.postalCode ?? "",
      phone: personalInfo?.phone ?? "",
    });
  }, [isOpen, reset, user?.personalInfo]);

  const onSubmit = async (data: SirirajPersonalInfoSchema) => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const response = await api.user.updateUser({
        id: user.id,
        requestBody: {
          firstName: user.firstName,
          lastName: user.lastName,
          dob: null,
          gender: null,
          phone: null,
          personalInfo: {
            age: data.age,
            addressLine: data.addressLine,
            street: data.street,
            subdistrict: data.subdistrict,
            district: data.district,
            province: data.province,
            postalCode: data.postalCode,
            phone: data.phone,
          },
        } as Parameters<typeof api.user.updateUser>[0]["requestBody"] & {
          personalInfo?: {
            age?: number;
            addressLine?: string;
            street?: string;
            subdistrict?: string;
            district?: string;
            province?: string;
            postalCode?: string;
            phone?: string;
          };
        },
      });
      if (response.ok) {
        setUser({
          ...user!,
          personalInfo: {
            age: data.age,
            addressLine: data.addressLine,
            street: data.street,
            subdistrict: data.subdistrict,
            district: data.district,
            province: data.province,
            postalCode: data.postalCode,
            phone: data.phone,
          },
        });
        addNotification({
          state: "success",
          title: "บันทึกข้อมูล",
          description: "บันทึกข้อมูลส่วนตัวสำเร็จ",
        });
        onSuccess?.();
        onClose();
      } else {
        addNotification({
          state: "error",
          title: "บันทึกข้อมูล",
          description: "เกิดข้อผิดพลาดในการบันทึกข้อมูล",
        });
      }
    } catch (error) {
      console.error("Error updating Siriraj personal info:", error);
      addNotification({
        state: "error",
        title: "บันทึกข้อมูล",
        description: "เกิดข้อผิดพลาดในการบันทึกข้อมูล",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      showCloseButton={false}
      title="กรุณากรอกข้อมูลส่วนตัว"
      className="md:max-w-[720px]!"
      body={
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-6">
            <Input
              label="อายุ"
              type="number"
              placeholder="กรอกอายุ"
              variant={errors.age ? "error" : "default"}
              hint={errors.age?.message}
              max={150}
              min={1}
              maxLength={3}
              minLength={1}
              required
              requiredLabel
              {...register("age", { valueAsNumber: true })}
            />
            <Input
              label="เบอร์โทรศัพท์"
              type="tel"
              placeholder="กรอกเบอร์โทรศัพท์"
              variant={errors.phone ? "error" : "default"}
              hint={errors.phone?.message}
              required
              requiredLabel
              {...register("phone")}
            />
            <Input
              label="บ้านเลขที่"
              type="text"
              placeholder="กรอกบ้านเลขที่"
              containerClassName="sm:col-span-1"
              variant={errors.addressLine ? "error" : "default"}
              hint={errors.addressLine?.message}
              required
              requiredLabel
              {...register("addressLine")}
            />
            <Input
              label="ถนน"
              type="text"
              placeholder="กรอกถนน"
              containerClassName="sm:col-span-1"
              variant={errors.street ? "error" : "default"}
              hint={errors.street?.message}
              required
              requiredLabel
              {...register("street")}
            />
            <Input
              label="แขวง"
              type="text"
              placeholder="กรอกแขวง"
              variant={errors.subdistrict ? "error" : "default"}
              hint={errors.subdistrict?.message}
              required
              requiredLabel
              {...register("subdistrict")}
            />
            <Input
              label="เขต"
              type="text"
              placeholder="กรอกเขต"
              variant={errors.district ? "error" : "default"}
              hint={errors.district?.message}
              required
              requiredLabel
              {...register("district")}
            />
            <Input
              label="จังหวัด"
              type="text"
              placeholder="กรอกจังหวัด"
              variant={errors.province ? "error" : "default"}
              hint={errors.province?.message}
              required
              requiredLabel
              {...register("province")}
            />
            <Input
              label="รหัสไปรษณีย์"
              type="text"
              placeholder="กรอกรหัสไปรษณีย์"
              variant={errors.postalCode ? "error" : "default"}
              hint={errors.postalCode?.message}
              required
              requiredLabel
              {...register("postalCode")}
            />
          </div>
          <div className="flex justify-end mt-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
          </div>
        </form>
      }
    />
  );
}

const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

/** Short format for consent: "20 กุมภาพันธ์ 2569" */
function formatThaiConsentDate(date: Date): string {
  const day = date.getDate();
  const month = THAI_MONTHS[date.getMonth()];
  const buddhistYear = date.getFullYear() + 543;
  return `${day} ${month} ${buddhistYear}`;
}

/** Long format for SirirajConsentModal: "วันที่ X เดือน Y พ.ศ. Z" */
function formatThaiConsentDateLong(date: Date): string {
  const day = date.getDate();
  const month = THAI_MONTHS[date.getMonth()];
  const buddhistYear = date.getFullYear() + 543;
  return `วันที่ ${day} เดือน ${month} พ.ศ. ${buddhistYear}`;
}

export function ParticipantInformationSheetModal({
  isOpen,
  onClose,
  onConsentSuccess,
  onBackToPersonalInfo,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConsentSuccess?: () => void;
  onBackToPersonalInfo?: () => void;
}) {
  const user = useAuthStore((state) => state.user);
  const { setUser } = useAuthStore();
  const { addNotification } = useNotificationStore();
  const [consentChecked, setConsentChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const consentDate = formatThaiConsentDate(new Date());
  const fullName = user
    ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
    : "";
  const dottedUnderlineStyle = {
    lineHeight: "1.2",
    paddingBottom: "2px",
    backgroundImage:
      "repeating-linear-gradient(to right, #475467 0 1px, transparent 1px 2px)",
    backgroundRepeat: "no-repeat",
    backgroundSize: "100% 1px",
    backgroundPosition: "0 1.2em",
  };

  useEffect(() => {
    if (isOpen) {
      setConsentChecked(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentChecked) {
      addNotification({
        state: "error",
        title: "กรุณายืนยัน",
        description: "กรุณาติ๊กเลือกเพื่อยืนยันว่าท่านได้อ่านเอกสารแล้ว",
      });
      return;
    }
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const now = new Date().toISOString();
      const response = await api.user.updateUser({
        id: user.id,
        requestBody: {
          firstName: user.firstName,
          lastName: user.lastName,
          dob: null,
          gender: null,
          phone: null,
          sirirajInfoSheetConsentAt: now,
        } as Parameters<typeof api.user.updateUser>[0]["requestBody"] & {
          sirirajInfoSheetConsentAt?: string;
        },
      });
      if (response.ok && response.data) {
        setUser({
          ...user,
          sirirajInfoSheetConsentAt: now,
        });
        addNotification({
          state: "success",
          title: "บันทึกการยินยอม",
          description: "บันทึกการยืนยันเอกสารแล้ว",
        });
        onConsentSuccess?.();
        onClose();
      } else {
        addNotification({
          state: "error",
          title: "บันทึกการยินยอม",
          description: "เกิดข้อผิดพลาดในการบันทึก",
        });
      }
    } catch (error) {
      console.error("Error saving consent:", error);
      addNotification({
        state: "error",
        title: "บันทึกการยินยอม",
        description: "เกิดข้อผิดพลาดในการบันทึก",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      showCloseButton={false}
      maskClosable={false}
      title={"เอกสารชี้แจงผู้เข้าร่วมการวิจัย/อาสาสมัคร"}
      description={`(Participant Information Sheet)
สำหรับผู้เข้าร่วมวิจัยอายุตั้งแต่ 18 ปีขึ้นไป`}
      titleClassName="text-center"
      descriptionClassName="text-center"
      className="max-w-[1080px]! overflow-hidden bg-white shadow-lg border border-gray-300"
      body={
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div
            className="flex-1 overflow-y-auto -ml-1 pl-1 text-gray-900"
            style={{
              fontFamily: "var(--font-sarabun), sans-serif",
              fontSize: "15px",
              lineHeight: "1.75",
            }}
          >
            <p className="mb-2 indent-8 font-semibold">
              ในเอกสารนี้อาจมีข้อความที่ท่านอ่านแล้วยังไม่เข้าใจ
              โปรดสอบถามหัวหน้าโครงการวิจัยหรือผู้แทนให้ช่วยอธิบายจนกว่าจะเข้าใจดี
              ท่านอาจขอเอกสารนี้กลับไปอ่านที่บ้านเพื่อปรึกษาหารือกับญาติ พี่น้อง
              เพื่อนสนิท แพทย์ประจำตัวของท่าน หรือแพทย์ท่านอื่น
              เพื่อช่วยในการตัดสินใจเข้าร่วมการวิจัย
            </p>

            <div className="mb-4">
              <table className="w-full table-fixed">
                <colgroup>
                  <col style={{ width: "35%" }} />
                  <col style={{ width: "65%" }} />
                </colgroup>
                <tbody className="[&_td]:align-top [&_td]:py-1 [&_td:first-child]:pr-3">
                  <tr>
                    <td>ชื่อโครงการวิจัย</td>
                    <td>
                      <p>
                        สู่การให้เหตุผลทางการแพทย์ในระดับผู้เชี่ยวชาญในแบบจำลองภาษาขนาดใหญ่
                      </p>
                      <p>
                        (Toward Expert-Level Medical Reasoning in Large Language
                        Models)
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td>ชื่อหัวหน้าโครงการวิจัย</td>
                    <td>ศาสตราจารย์ พญ.ธนัญญา บุณยศิรินันท์</td>
                  </tr>
                  <tr>
                    <td>ชื่อผู้ร่วมวิจัย</td>
                    <td className="space-y-1">
                      <p>รองศาสตราจารย์ ดร.สรณะ นุชอนงค์</p>
                      <p>ดร.แคน อุดมเจริญชัยกิจ</p>
                      <p>นพ.ปิยะฤทธิ์ อิทธิชัยวงศ์</p>
                      <p>พญ.กัลยกร วีรกาญจนา</p>
                      <p>นพ.ธีระสูต นุ่มวงษ์</p>
                    </td>
                  </tr>
                  <tr>
                    <td>สถานที่วิจัย</td>
                    <td>
                      <p>
                        หน่วยตรวจโรคทั่วไป โรงพยาบาลศูนย์การแพทย์กาญจนาภิเษก
                        จังหวัดนครปฐม
                      </p>
                      <p>และ สถาบันวิทยสิริเมธี จังหวัดระยอง</p>
                    </td>
                  </tr>
                  <tr>
                    <td>สถานที่ทำงาน</td>
                    <td>
                      <p>
                        เลขที่ 2 คณะแพทยศาสตร์ศิริราชพยาบาล ตึกอัษฎางค์ ชั้น 4
                        ถนนวังหลัง แขวงศิริราช
                      </p>
                      <p>เขตบางกอกน้อย กรุงเทพฯ 10700</p>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      หมายเลขโทรศัพท์ของหัวหน้าโครงการวิจัยที่ติดต่อได้ทั้งในและนอกเวลาราชการ
                    </td>
                    <td>+(66) 2-419-6102</td>
                  </tr>
                  <tr>
                    <td>ผู้สนับสนุนทุนวิจัย</td>
                    <td>สถาบันข้อมูลขนาดใหญ่ (องค์การมหาชน)</td>
                  </tr>
                  <tr>
                    <td>การมีส่วนได้ส่วนเสียกับแหล่งทุน</td>
                    <td>☑ ไม่มี</td>
                  </tr>
                  <tr>
                    <td>ระยะเวลาในการวิจัย</td>
                    <td>2 ปี</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="font-semibold">ที่มาของโครงการวิจัย</p>
            <p className="mb-2 indent-8">
              ในปัจจุบันเทคโนโลยีปัญญาประดิษฐ์ที่เป็นโมเดลภาษาขนาดใหญ่ (Large
              Language Model: LLM) และระบบแชตบอตได้
              ถูกนำมาประยุกต์ใช้ในบริบททางการแพทย์อย่างกว้างขวาง ได้แก่
              การคัดกรองอาการเบื้องต้น การให้คำปรึกษาด้านสุขภาพ รวมถึง
              การสนับสนุนกระบวนการตัดสินใจทางคลินิก อย่างไรก็ตาม LLM
              ส่วนใหญ่ถูกพัฒนาขึ้นจากเทรนบนข้อมูลที่เป็นภาษาต่างประเทศ ยัง
              ไม่ตอบโจทย์ความต้องการในบริบทภาษาไทย โดยเฉพาะในทางการแพทย์
            </p>
            <p className="mb-4 indent-8">
              ทางสถาบันข้อมูลขนาดใหญ่ (องค์การมหาชน) ร่วมกับสถาบันวิทยสิริเมธี
              ได้ร่วมกันออกแบบพัฒนาโมเดลเฉพาะ
              ทางด้านการแพทย์ที่ฝึกฝนมาจากข้อมูลทางการแพทย์ในภาษาไทยโดยตรงผ่านโครงการ
              ThaiLLM ดังนั้นงานวิจัยครั้งนี้ทีมผู้วิจัยจึง
              มุ่งเน้นการศึกษาเชิงประสิทธิภาพของแชตบอตและโมเดลทางภาษาไทยขนาดใหญ่เฉพาะทางด้านการแพทย์
              กับกลุ่มผู้ป่วยคนไทยที่มา
              รับบริการที่โรงพยาบาลศูนย์การแพทย์กาญจนาภิเษก จังหวัดนครปฐม
              เพื่อประเมินความสามารถของระบบแชตบอต และโมเดลทาง
              ภาษาไทยขนาดใหญ่เฉพาะทางด้านการแพทย์ในสถานการณ์จริง
              ทั้งในมิติในการให้บริการแชตบอต ความพึงพอใจของผู้ที่มีส่วน
              เกี่ยวข้องทั้งหมด รวมไปถึงความแม่นยำในการโต้ตอบ
              เพื่อประเมินหาจุดแข็ง จุดอ่อน และโอกาสในการพัฒนา
              เพื่อนำไปต่อยอดการ พัฒนาโมเดลเฉพาะทางภาษาไทยที่ดีขึ้น
            </p>

            <p className="font-semibold mb-1">วัตถุประสงค์ของโครงการวิจัย</p>
            <ul className="list-disc pl-8 mb-4">
              <li>
                เพื่อศึกษาประสิทธิภาพการทำงานของระบบแชตบอต
                และโมเดลทางภาษาไทยขนาดใหญ่เฉพาะทางด้านการแพทย์ของ โครงการ
                ThaiLLM ในบริบทการช่วยให้บริการทางการแพทย์
              </li>
              <li>
                เพื่อสำรวจความพึงพอใจในกลุ่มผู้ใช้งานคนไทย ทั้งผู้ใช้งาน
                และบุคลากรทางการแพทย์ที่เกี่ยวข้อง ต่อระบบแชตบอต และ
                โมเดลทางภาษาไทยขนาดใหญ่เฉพาะทางด้านการแพทย์ของโครงการ ThaiLLM
                ในบริบทการช่วยให้บริการทางการแพทย์
              </li>
            </ul>

            <p className="font-semibold mb-1">
              ท่านได้รับเชิญให้เข้าร่วมการวิจัยนี้เนื่องจาก
            </p>
            <ul className="list-disc pl-8 mb-4">
              <li>
                ท่านอายุมากกว่าหรือเท่ากับ 18 ปี กำลังเข้ารับการตรวจสุขภาพ
                หรืออาการผิดปกติ
              </li>
            </ul>

            <p className="font-semibold mb-1">
              จะมีผู้เข้าร่วมการวิจัย/อาสาสมัครนี้ทั้งสิ้นประมาณ
            </p>
            <ul className="list-disc pl-8 mb-4">
              <li>570 ราย</li>
            </ul>

            <p className="font-semibold mb-1">
              หากท่านตัดสินใจเข้าร่วมการวิจัยแล้ว
              จะมีขั้นตอนการวิจัยดังต่อไปนี้คือ
            </p>
            <ul className="list-disc pl-8 mb-4">
              <li>
                ผู้ประสานงานวิจัยแนะนำวิธีการใช้งานแชตบอตเบื้องต้น
                พร้อมทั้งตอบข้อซักถามและข้อสงสัยของผู้สนใจ ให้เวลาในการ
                พิจารณาโดยไม่มีการบังคับหรือเร่งรัด จากนั้นให้เอกสารใบเชิญชวน
                และ/หรือแผ่นพับข้อมูล พร้อมทั้งแนะนำการเข้าถึงระบบแชตบอตผ่าน QR
                Code หรือ Link เข้าถึงระบบแชตบอตดังกล่าว
              </li>
              <li>
                เมื่ออาสาสมัครผู้ร่วมวิจัยเข้าไประบบแชตบอต
                จะแสดงหน้าต่างนำเสนอเอกสารชี้แจงผู้เข้าร่วมวิจัยดังในเอกสารนี้ทั้งหมด
                บนแอพพลิเคชั่น
                จากนั้นจะมีข้อคำถามที่จะยินยอมให้ทีมผู้วิจัยสามารถนำข้อมูลบทสนทนา
                การคัดกรองโรคในครั้งแรก (แผนกที่ถูกส่งต่อ) การวินิจฉัยโรค
                หรือความพึงพอใจ ไปใช้ประเมิน วิจัย
                และพัฒนาแชตบอตต่อยอดในอนาคตหรือไม่ ซึ่งอาสาสมัครผู้ร่วมวิจัย
                สามารถเลือก Opt-in/Opt-out options หัวข้อต่างๆ ได้ตามสมัครใจ
                จึงเข้าสู่หน้าลงทะเบียนใช้งานแชตบอต
              </li>
              <li>
                ในหน้าลงทะเบียนใช้งาน
                อาจจะมีการขอข้อมูลส่วนบุคคลของอาสาสมัครผู้ร่วมวิจัย ได้แก่
                ชื่อ-นามสกุล อีเมล
              </li>
              <li>
                อาสาสมัครผู้ร่วมวิจัยสามารถนำแชตบอตไปทดลองใช้งาน
                โดยภายในแชตบอตมีทั้งหมด 4 ฟังก์ชันหลัก ได้แก่ 1. ฟังก์ชัน
                ระบบคัดกรองผู้ป่วยเบื้องต้น 2.
                ฟังก์ชันตอบปัญหา/คำถามสุขภาพทั่วไป 3.
                ฟังก์ชันแจ้งเตือนการรับประทานยา และ 4. ฟังก์ชัน
                ระบบเตือนการนัดหมายแพทย์
              </li>
              <li>
                แต่ละฟังก์ชันมีการเก็บข้อมูลบทสนทนาระหว่างแชตบอต
                กับอาสาสมัครผู้ร่วมวิจัย การคัดกรองโรคในครั้งแรก (แผนกที่
                ถูกส่งต่อ) การวินิจฉัยโรค และมีการเก็บข้อมูลความพึงพอใจ
                เฉพาะในกรณีที่อาสาสมัครผู้ร่วมวิจัยอนุญาตให้เก็บและใช้ข้อมูลก่อนหน้านี้
                เพื่อนำไปวิเคราะห์ผลประสิทธิภาพ ความพึงพอใจต่อแชตบอต
                และโมเดลทางภาษาไทยขนาดใหญ่โดยเฉพาะทางการแพทย์ ต่อไป
                และท่านสามารถถอนตัวออกจากการวิจัยได้ทุกเมื่อ
              </li>
              <li>
                กรณีที่ผู้ใช้งานไม่ประสงค์ให้แอพพลิเคชั่นเก็บข้อมูลส่วนใดต่อไป
                ก็สามารถเข้าไปคลิกยกเลิกการเก็บข้อมูลส่วนนั้นในหน้า
                ตั้งค่าของแอพพลิเคชั่น
                ข้อมูลที่ถูกยกเลิกจะไม่มีการเก็บภายหลังจากที่คลิกยกเลิกออกไป
                และกรณีต้องการยกเลิกการเก็บข้อมูล ทั้งหมด หรือสอบถามข้อมูลต่าง ๆ
                เพิ่มเติม สามารถติดต่อผ่านช่องทาง Customer support
                ภายในแอพพลิเคชั่นได้ตลอดเวลา
              </li>
            </ul>

            <p className="font-semibold mb-1">
              ความเสี่ยงที่อาจจะเกิดขึ้นเมื่อเข้าร่วมการวิจัย
            </p>
            <ul className="list-disc pl-8 mb-4">
              <li>
                เสียเวลาในการทดลองใช้งานแชตบอต และข้อมูลความเป็นส่วนตัวบางส่วน
                ตามที่อาสาสมัครผู้ร่วมวิจัยอนุญาตให้ทางทีม วิจัยเก็บ
                อย่างไรก็ตามท่านสามารถใช้งานแชตบอตขณะรอพบแพทย์เพื่อไม่รบกวนเวลาของท่าน
              </li>
            </ul>

            <p className="font-semibold mb-1">
              ประโยชน์ที่คาดว่าจะได้รับจากการวิจัย
            </p>
            <ul className="list-disc pl-8 mb-4">
              <li>
                การซักประวัติโดยแชตบอตก่อนพบแพทย์
                อาจทำให้ผู้ใช้งานสื่อสารอาการต่างๆ ครบถ้วนมากขึ้น
              </li>
              <li>
                ผู้ใช้งานสามารถสอบถามข้อสงสัยสุขภาพทั่วไป
                ช่วยเพิ่มความรู้และความมั่นใจในการดูแลตนเองในเรื่องพื้นฐาน
              </li>
              <li>
                ผู้ใช้งานสามารถใช้ฟังก์ชันเตือนการทานยา
                ช่วยส่งเสริมความสม่ำเสมอในการใช้ยา ลดความเสี่ยงจากการลืมทานยาได้
              </li>
            </ul>

            <p className="font-semibold mb-1">
              ค่าตอบแทนที่ผู้ร่วมวิจัย/อาสาสมัครจะได้รับ
            </p>
            <ul className="list-disc pl-8 mb-4">
              <li>(ไม่มี)</li>
            </ul>

            <p className="font-semibold mb-1">
              ค่าใช้จ่ายที่ผู้ร่วมวิจัย/อาสาสมัครจะต้องรับผิดชอบเอง
            </p>
            <ul className="list-disc pl-8 mb-4">
              <li>(ไม่มี)</li>
            </ul>

            <p className="mb-2 indent-8">
              หากมีข้อมูลเพิ่มเติมทั้งด้านประโยชน์และโทษที่เกี่ยวข้องกับการวิจัยนี้
              ผู้วิจัยจะแจ้งให้ทราบโดยรวดเร็วและไม่ปิดบัง
            </p>
            <p className="mb-2 indent-8 font-semibold">
              ข้อมูลส่วนตัวของผู้ร่วมวิจัย/อาสาสมัคร
              จะถูกเก็บรักษาไว้เป็นความลับและจะไม่เปิดเผยต่อสาธารณะเป็นรายบุคคล
              ส่วนข้อมูลของผู้ร่วมวิจัย/อาสาสมัครเป็นรายบุคคลอาจมีคณะบุคคลบางกลุ่มเข้ามาตรวจสอบได้
              เช่น ผู้ให้ทุนวิจัย ผู้กำกับดูแลการวิจัย
              สถาบันหรือองค์กรของรัฐที่มีหน้าที่ตรวจสอบ
              รวมถึงคณะกรรมการจริยธรรมการวิจัยในคน เป็นต้น โดยไม่ละเมิดสิทธิ
              ของผู้ร่วมวิจัย/อาสาสมัครในการรักษาความลับเกินขอบเขตที่กฎหมายอนุญาตไว้
            </p>
            <p className="mb-4 indent-8 font-semibold">
              ผู้ร่วมวิจัย/อาสาสมัครมีสิทธิ์ถอนตัวออกจากโครงการวิจัยเมื่อใดก็ได้
              โดยไม่ต้องแจ้งให้ทราบล่วงหน้า
              และการไม่เข้าร่วมการวิจัยหรือถอนตัวออกจากโครงการวิจัยนี้
              จะไม่มีผลกระทบต่อการบริการและการรักษาที่สมควรจะได้รับตามมาตรฐานแต่ประการใด
              หากท่านได้รับการปฏิบัติที่ไม่ตรงตามที่ได้ระบุไว้ในเอกสารชี้แจงนี้
              ท่านสามารถร้องเรียนไปยังประธานคณะกรรมการจริยธรรมการวิจัยในคนได้ที่
              สำนักงานคณะกรรมการจริยธรรมการวิจัยในคน อาคารเฉลิมพระเกียรติ ๘๐
              พรรษา ๕ ธันวาคม ๒๕๕๐ ชั้น 2 โทร.0 2419 2667-72 โทรสาร 0 2411 0162
            </p>

            <div className="space-y-2 mb-2 ml-auto w-fit">
              <p className="flex flex-wrap items-baseline gap-1">
                <span>ลงชื่อ</span>
                <span
                  className="px-1 min-w-[235px]"
                  style={dottedUnderlineStyle}
                >
                  {fullName || " "}
                </span>
                <span>ผู้เข้าร่วมวิจัย/อาสาสมัคร</span>
              </p>
              <p className="flex flex-wrap items-baseline gap-1">
                <span>วันที่</span>
                <span className="w-[240px] px-1" style={dottedUnderlineStyle}>
                  {consentDate}
                </span>
              </p>
            </div>

            <div className="flex items-start gap-2 mt-4">
              <Checkbox
                id="participant-information-sheet-consent-check"
                checked={consentChecked}
                onCheckedChange={(v) => setConsentChecked(v === true)}
                aria-describedby="participant-information-sheet-consent-label"
                className="mt-0.5 shrink-0"
              />
              <Label
                id="participant-information-sheet-consent-label"
                htmlFor="participant-information-sheet-consent-check"
                className="cursor-pointer block text-left pl-1 leading-normal!"
              >
                ข้าพเจ้าได้รับทราบรายละเอียดในเอกสารชี้แจงผู้เข้าร่วมการวิจัยแล้ว
              </Label>
            </div>

            <div className="flex justify-end gap-2 pt-3 font-anuphan">
              <Button
                type="button"
                variant="secondary"
                onClick={onBackToPersonalInfo}
                disabled={isLoading}
              >
                กลับไปแก้ไขข้อมูลส่วนตัว
              </Button>
              <Button type="submit" disabled={isLoading || !consentChecked}>
                {isLoading ? "กำลังบันทึก..." : "ยืนยันและบันทึก"}
              </Button>
            </div>
          </div>
        </form>
      }
    />
  );
}

export function SirirajConsentModal({
  isOpen,
  onClose,
  onConsentSuccess,
  onBackToPersonalInfo,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConsentSuccess?: () => void;
  onBackToPersonalInfo?: () => void;
}) {
  const user = useAuthStore((state) => state.user);
  const { setUser } = useAuthStore();
  const { addNotification } = useNotificationStore();
  const [consentChecked, setConsentChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setConsentChecked(false);
    }
  }, [isOpen]);

  const consentDate = formatThaiConsentDateLong(new Date());
  const fullName = user
    ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
    : "";
  const pi = user?.personalInfo;
  const age = pi?.age ?? "";
  const addressLine = pi?.addressLine ?? "";
  const street = pi?.street ?? "";
  const subdistrict = pi?.subdistrict ?? "";
  const district = pi?.district ?? "";
  const province = pi?.province ?? "";
  const postalCode = pi?.postalCode ?? "";
  const phone = pi?.phone ?? "";
  const dottedUnderlineStyle = {
    lineHeight: "1.2",
    paddingBottom: "2px",
    backgroundImage:
      "repeating-linear-gradient(to right, #475467 0 1px, transparent 1px 2px)",
    backgroundRepeat: "no-repeat",
    backgroundSize: "100% 1px",
    backgroundPosition: "0 1.2em",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentChecked) {
      addNotification({
        state: "error",
        title: "กรุณายืนยัน",
        description:
          "กรุณาติ๊กเลือกเพื่อยืนยันว่าท่านได้เข้าใจข้อความในเอกสารชี้แจงและหนังสือแสดงเจตนายินยอม",
      });
      return;
    }
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const now = new Date().toISOString();
      const response = await api.user.updateUser({
        id: user.id,
        requestBody: {
          firstName: user.firstName,
          lastName: user.lastName,
          dob: null,
          gender: null,
          phone: null,
          sirirajConsentAt: now,
        } as Parameters<typeof api.user.updateUser>[0]["requestBody"] & {
          sirirajConsentAt?: string;
        },
      });
      if (response.ok && response.data) {
        setUser({
          ...user,
          sirirajConsentAt: now,
        });
        addNotification({
          state: "success",
          title: "บันทึกการยินยอม",
          description: "บันทึกหนังสือแสดงเจตนายินยอมเรียบร้อยแล้ว",
        });
        onConsentSuccess?.();
        onClose();
      } else {
        addNotification({
          state: "error",
          title: "บันทึกการยินยอม",
          description: "เกิดข้อผิดพลาดในการบันทึก",
        });
      }
    } catch (error) {
      console.error("Error saving Siriraj consent:", error);
      addNotification({
        state: "error",
        title: "บันทึกการยินยอม",
        description: "เกิดข้อผิดพลาดในการบันทึก",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      showCloseButton={false}
      maskClosable={false}
      title={"หนังสือแสดงเจตนายินยอมเข้าร่วมการวิจัย"}
      description={"(Consent Form)"}
      titleClassName="text-center"
      descriptionClassName="text-center"
      className="max-w-[1080px]! overflow-hidden bg-white shadow-lg border border-gray-300"
      body={
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div
            className="flex-1 overflow-y-auto -ml-1 pl-1 text-gray-900"
            style={{
              fontFamily: "var(--font-sarabun), sans-serif",
              fontSize: "15px",
              lineHeight: "1.75",
            }}
          >
            {/* วันที่ top right */}
            <p className="text-right mb-6">{consentDate}</p>

            {/* Personal info: form-style lines (label + underlined value) */}
            <div className="space-y-1 mb-4">
              <div className="flex flex-col sm:flex-row gap-1">
                <p className="flex flex-wrap items-baseline gap-1 pl-8 grow-6">
                  <span>ข้าพเจ้า</span>
                  <span
                    className="flex-1 px-1 grow-6"
                    style={dottedUnderlineStyle}
                  >
                    {fullName || " "}
                  </span>
                </p>
                <p className="flex flex-wrap items-baseline gap-1 grow">
                  <span>อายุ</span>
                  <span
                    className="flex-1 px-1 grow"
                    style={dottedUnderlineStyle}
                  >
                    {age || " "}
                  </span>
                  <span>ปี</span>
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1">
                <p className="flex flex-wrap items-baseline gap-1">
                  <span>อาศัยอยู่บ้านเลขที่</span>
                  <span className="flex-1 px-1" style={dottedUnderlineStyle}>
                    {addressLine || " "}
                  </span>
                </p>
                <p className="flex flex-wrap items-baseline gap-1">
                  <span>ถนน</span>
                  <span className="flex-1 px-1" style={dottedUnderlineStyle}>
                    {street || " "}
                  </span>
                </p>
                <p className="flex flex-wrap items-baseline gap-1">
                  <span>แขวง/ตำบล</span>
                  <p className="flex-1 px-1" style={dottedUnderlineStyle}>
                    {subdistrict || " "}
                  </p>
                </p>
                <p className="flex flex-wrap items-baseline gap-1">
                  <span>เขต/อำเภอ</span>
                  <span className="flex-1 px-1" style={dottedUnderlineStyle}>
                    {district || " "}
                  </span>
                </p>
                <p className="flex flex-wrap items-baseline gap-1">
                  <span>จังหวัด</span>
                  <span className="flex-1 px-1" style={dottedUnderlineStyle}>
                    {province || " "}
                  </span>
                </p>
                <p className="flex flex-wrap items-baseline gap-1">
                  <span>รหัสไปรษณีย์</span>
                  <span className="flex-1 px-1" style={dottedUnderlineStyle}>
                    {postalCode || " "}
                  </span>
                </p>
              </div>
              <p className="flex flex-wrap items-baseline gap-1">
                <span>โทรศัพท์</span>
                <span className="px-1 w-fit" style={dottedUnderlineStyle}>
                  {phone || " "}
                </span>
              </p>
            </div>

            <p className="mb-2 indent-8">
              ขอแสดงเจตนายินยอมเข้าร่วมโครงการวิจัย เรื่อง
              สู่การให้เหตุผลทางการแพทย์ในระดับผู้เชี่ยวชาญใน
              แบบจำลองภาษาขนาดใหญ่
              โดยข้าพเจ้าได้รับทราบรายละเอียดเกี่ยวกับที่มาและจุดมุ่งหมายในการทำวิจัย
              รายละเอียดขั้นตอนต่างๆ ที่จะต้องปฏิบัติหรือได้รับการปฏิบัติ
              ประโยชน์ที่คาดว่าจะได้รับของการวิจัย และความ
              เสี่ยงที่อาจจะเกิดขึ้นจากการเข้าร่วมการวิจัย
              รวมทั้งแนวทางป้องกันและแก้ไขหากเกิดอันตรายขึ้น ค่าใช้จ่ายที่
              ข้าพเจ้าจะต้องรับผิดชอบจ่ายเอง
              โดยได้อ่านข้อความที่มีรายละเอียดอยู่ในเอกสารชี้แจงผู้เข้าร่วมการวิจัยโดย
              ตลอด
              อีกทั้งยังได้รับคำอธิบายและตอบข้อสงสัยจากหัวหน้าโครงการวิจัยเป็นที่เรียบร้อยแล้ว
            </p>
            <p className="mb-2 indent-8">
              ข้าพเจ้าจึงสมัครใจเข้าร่วมในโครงการวิจัยนี้
            </p>
            <p className="mb-2 indent-8">
              หากข้าพเจ้ามีข้อข้องใจเกี่ยวกับขั้นตอนของการวิจัย
              หรือหากเกิดผลข้างเคียงที่ไม่พึงประสงค์จากการ วิจัยขึ้นกับข้าพเจ้า
              ข้าพเจ้าจะสามารถติดต่อกับ นพ. ธีระสูต นุ่มวงษ์ หมายเลขโทรศัพท์
              097-070-0646
            </p>
            <p className="mb-2 indent-8">
              หากข้าพเจ้าได้รับการปฏิบัติไม่ตรงตามที่ระบุไว้ในเอกสารชี้แจงผู้เข้าร่วมการวิจัย
              ต้องการปรึกษาปัญหา ข้อกังวล
              มีคำถามหรือต้องการข้อมูลเพิ่มเติมเกี่ยวกับการวิจัย
              ข้าพเจ้าสามารถติดต่อกับประธานคณะกรรมการ จริยธรรมการวิจัยในคนได้ที่
              สำนักงานคณะกรรมการจริยธรรมการวิจัยในคน อาคารเฉลิมพระเกียรติ ๘๐
              พรรษา ๕ ธันวาคม ๒๕๕๐ ชั้น 2 โทร. 0 2419 2667-72
            </p>
            <p className="mb-2 indent-8">
              ข้าพเจ้าได้ทราบถึงสิทธิ์ที่ข้าพเจ้าจะได้รับข้อมูลเพิ่มเติมทั้งทางด้านประโยชน์และโทษจากการเข้าร่วมการ
              วิจัย
              และสามารถถอนตัวหรืองดเข้าร่วมการวิจัยได้ทุกเมื่อโดยไม่ต้องแจ้งล่วงหน้าหรือระบุเหตุผล
              โดยจะไม่มี
              ผลกระทบต่อการบริการและการรักษาพยาบาลที่ข้าพเจ้าจะได้รับต่อไปในอนาคต
              และยินยอมให้ผู้วิจัยใช้ข้อมูล
              ส่วนตัวของข้าพเจ้าที่ได้รับจากการวิจัย
              แต่จะไม่เผยแพร่ต่อสาธารณะเป็นรายบุคคล โดยจะนำเสนอเป็นข้อมูล
              โดยรวมจากการวิจัยเท่านั้น
            </p>

            {/* Checkbox before final consent sentence; paragraph with first-line indent */}
            <div className="flex items-start gap-2 mt-4">
              <Checkbox
                id="siriraj-consent-check"
                checked={consentChecked}
                onCheckedChange={(v) => setConsentChecked(v === true)}
                aria-describedby="consent-label"
                className="mt-0.5 shrink-0"
              />
              <Label
                id="consent-label"
                htmlFor="siriraj-consent-check"
                className="cursor-pointer block text-left pl-1 leading-normal!"
              >
                <span className="indent-8">
                  ข้าพเจ้าได้เข้าใจข้อความในเอกสารชี้แจงผู้เข้าร่วมการวิจัย
                  และหนังสือแสดงเจตนายินยอมนี้โดยตลอดแล้ว
                </span>
              </Label>
            </div>
            <div className="flex justify-end gap-2 pt-3 font-anuphan">
              <Button
                type="button"
                variant="secondary"
                onClick={onBackToPersonalInfo}
                disabled={isLoading}
              >
                กลับไปแก้ไขข้อมูลส่วนตัว
              </Button>
              <Button type="submit" disabled={isLoading || !consentChecked}>
                {isLoading ? "กำลังบันทึก..." : "ยืนยันและบันทึก"}
              </Button>
            </div>
          </div>
        </form>
      }
    />
  );
}

export { updateUserProfileSchema };
